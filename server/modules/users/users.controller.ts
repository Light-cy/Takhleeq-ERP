import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { query, logAudit } from '../../db.ts';
import { AuthenticatedRequest } from '../../shared/types/index.ts';
import { ensureFounderCredentials } from '../cohorts/cohorts.controller.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export const handleMicrosoftAuth = async (req: AuthenticatedRequest, res: Response) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: 'Microsoft SSO Authentication requires an accessToken in the request body.' });
  }

  try {
    // 1. Verify access token with Microsoft Graph API
    const msResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!msResponse.ok) {
      const errText = await msResponse.text();
      console.error('Microsoft Graph API token verification failed:', errText);
      return res.status(401).json({ error: 'Microsoft SSO token verification failed with Graph API.' });
    }

    const msUser = await msResponse.json() as { id: string; mail?: string; userPrincipalName: string; displayName: string };
    const email = (msUser.mail || msUser.userPrincipalName).toLowerCase();
    const name = msUser.displayName;
    const microsoftId = msUser.id;

    // 2. Domain check against ALLOWED_EMAIL_DOMAINS
    const allowedDomainsStr = process.env.ALLOWED_EMAIL_DOMAINS || 'ucp.edu.pk,gmail.com';
    const allowedDomains = allowedDomainsStr.split(',').map(d => d.trim().toLowerCase());
    const emailDomain = email.split('@')[1]?.toLowerCase();

    if (!allowedDomains.includes(emailDomain)) {
      return res.status(401).json({ 
        error: `Domain Verification Failure: The domain '${emailDomain}' is not authorized to register or access Takhleeq ERP.` 
      });
    }

    // 2.5 Active Ban check
    if (email.toLowerCase().trim() === 'banned-test@ucp.edu.pk') {
      const checkBan = await query(
        `SELECT * FROM ban_records WHERE LOWER(email) = $1 AND is_active = TRUE`,
        [email.toLowerCase().trim()]
      );
      if (checkBan.rows.length === 0) {
        await query(
          `INSERT INTO ban_records (email, full_name, reason, duration_type, custom_days, expires_at, is_active, issued_by)
           VALUES ($1, $2, $3, 'permanent', NULL, NULL, TRUE, 1)`,
          [email.toLowerCase().trim(), 'Banned Student (Testing)', 'Repeatedly booking rooms without attending and violating facility policies.']
        );
      }
    }

    const activeBanRes = await query(
      `SELECT * FROM ban_records WHERE LOWER(email) = $1 AND is_active = TRUE`,
      [email]
    );

    if (activeBanRes.rows.length > 0) {
      const activeBan = activeBanRes.rows[0];
      if (activeBan.expires_at && new Date(activeBan.expires_at) <= new Date()) {
        await query(
          `UPDATE ban_records SET is_active = FALSE, lifted_at = CURRENT_TIMESTAMP, lifting_reason = 'Ban automatically expired' WHERE id = $1`,
          [activeBan.id]
        );
        await logAudit(
          `Ban automatically expired and lifted for ${email}`,
          'ban',
          String(activeBan.id),
          'System'
        );
      } else {
        const expiryText = activeBan.expires_at 
          ? `until ${new Date(activeBan.expires_at).toLocaleDateString()}` 
          : 'permanently';
        return res.status(401).json({ 
          error: `Access Denied: This account (${email}) has been banned ${expiryText} from accessing Takhleeq ERP. Reason: ${activeBan.reason}` 
        });
      }
    }

    // 3. get_or_create User in PostgreSQL
    let userRes = await query(`SELECT * FROM users WHERE LOWER(email) = $1`, [email]);
    let userId: number;
    let isNewUser = false;

    if (userRes.rows.length === 0) {
      isNewUser = true;
      // Create user
      const insertRes = await query(
        `INSERT INTO users (microsoft_id, email, full_name, is_active, last_login)
         VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
         RETURNING id`,
        [microsoftId, email, name]
      );
      userId = insertRes.rows[0].id;

      // Check or create default role 'UCP Member'
      let roleRes = await query(`SELECT id FROM roles WHERE name = 'UCP Member'`);
      let roleId: number;
      if (roleRes.rows.length === 0) {
        const insRole = await query(
          `INSERT INTO roles (name, description, permissions)
           VALUES ('UCP Member', 'Regular student or staff member with standard public booking access', '[]'::jsonb)
           RETURNING id`
        );
        roleId = insRole.rows[0].id;
      } else {
        roleId = roleRes.rows[0].id;
      }

      // Assign default role
      await query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [userId, roleId]
      );
    } else {
      userId = userRes.rows[0].id;
      // Update last login and microsoft ID
      await query(
        `UPDATE users SET last_login = CURRENT_TIMESTAMP, microsoft_id = COALESCE(microsoft_id, $1) WHERE id = $2`,
        [microsoftId, userId]
      );
    }

    // 4. Fetch updated user details with roles/permissions for the JWT token payload
    const finalUserRes = await query(
      `SELECT u.id, u.email, u.full_name, u.is_active, r.name as role_name, r.permissions
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );
    const userRow = finalUserRes.rows[0];

    // 5. Generate secure JWT token
    const token = jwt.sign(
      { id: userId, email: email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    let perms: string[] = [];
    if (userRow.permissions) {
      perms = Array.isArray(userRow.permissions) ? userRow.permissions : JSON.parse(userRow.permissions);
    }

    const payload = {
      token,
      user: {
        email: userRow.email,
        name: userRow.full_name,
        role: userRow.role_name || 'UCP Member',
        status: userRow.is_active ? 'Active' : 'Inactive',
        permissions: perms
      }
    };

    if (isNewUser) {
      await logAudit(`User registered via Microsoft SSO: ${name} (${email})`, 'user', String(userId), email, null, payload.user);
    } else {
      await logAudit(`User signed in via Microsoft SSO: ${name} (${email})`, 'user', String(userId), email, null, null);
    }

    res.json(payload);
  } catch (err) {
    console.error('Error during Microsoft SSO Auth verification:', err);
    res.status(500).json({ error: 'Internal Server Error during SSO validation.' });
  }
};

export const handleSimulatedAuth = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Authentication failed: Email address is required.' });
  }

  try {
    const cleanEmail = String(email).toLowerCase().trim();
    const providedPassword = password ? String(password).trim() : '';

    // Check if user is currently banned
    const activeBanRes = await query(
      `SELECT * FROM ban_records WHERE LOWER(email) = $1 AND is_active = TRUE`,
      [cleanEmail]
    );

    if (activeBanRes.rows.length > 0) {
      const activeBan = activeBanRes.rows[0];
      if (activeBan.expires_at && new Date(activeBan.expires_at) <= new Date()) {
        await query(
          `UPDATE ban_records SET is_active = FALSE, lifted_at = CURRENT_TIMESTAMP, lifting_reason = 'Ban automatically expired' WHERE id = $1`,
          [activeBan.id]
        );
        await logAudit(
          `Ban automatically expired and lifted for ${cleanEmail}`,
          'ban',
          String(activeBan.id),
          'System'
        );
      } else {
        const expiryText = activeBan.expires_at 
          ? `until ${new Date(activeBan.expires_at).toLocaleDateString()}` 
          : 'permanently';
        return res.status(401).json({ 
          error: `Access Denied: This account (${cleanEmail}) has been banned ${expiryText} from accessing Takhleeq ERP. Reason: ${activeBan.reason}` 
        });
      }
    }

    // Check if an applicant record exists for this email
    const appCheckRes = await query(`SELECT * FROM applicants WHERE LOWER(email) = $1 ORDER BY id DESC LIMIT 1`, [cleanEmail]);
    let applicantRow = appCheckRes.rows[0];

    // If applicant exists but credentials haven't been generated yet, auto-ensure credentials
    if (applicantRow && !applicantRow.founder_password) {
      try {
        await ensureFounderCredentials(applicantRow.id);
        const reFetchApp = await query(`SELECT * FROM applicants WHERE id = $1`, [applicantRow.id]);
        if (reFetchApp.rows.length > 0) {
          applicantRow = reFetchApp.rows[0];
        }
      } catch (cErr) {
        console.error('Auto-credentials generation error in login:', cErr);
      }
    }

    // Query user and their roles/permissions from DB
    let userRes = await query(
      `SELECT u.id, u.email, u.full_name, u.is_active, u.password, r.name as role_name, r.permissions
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE LOWER(u.email) = $1`,
      [cleanEmail]
    );

    // If user doesn't exist yet, but applicant exists OR is a simulated email, create user record
    if (userRes.rows.length === 0) {
      let name = applicantRow?.name || cleanEmail.split('@')[0];
      if (!applicantRow) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }
      
      let roleName = 'UCP Member';
      if (applicantRow || cleanEmail.includes('founder') || cleanEmail === 'zohaib@startup.pk' || cleanEmail.endsWith('@takhleeq.com')) {
        roleName = 'Cohort Founder';
      } else if (cleanEmail.includes('director')) roleName = 'Administrator';
      else if (cleanEmail.includes('manager') || cleanEmail.includes('maheen')) roleName = 'Booking Manager';
      else if (cleanEmail.includes('coordinator') || cleanEmail.includes('faisal')) roleName = 'Facility Coordinator';

      const initialPassword = applicantRow?.founder_password || providedPassword || null;

      const insertRes = await query(
        `INSERT INTO users (email, full_name, is_active, password)
         VALUES ($1, $2, TRUE, $3)
         RETURNING id`,
        [cleanEmail, name, initialPassword]
      );
      const userId = insertRes.rows[0].id;

      // Find role ID and assign
      const roleRes = await query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
      const roleId = roleRes.rows[0]?.id;
      if (roleId) {
        await query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userId, roleId]);
      }

      // Re-query user
      userRes = await query(
        `SELECT u.id, u.email, u.full_name, u.is_active, u.password, r.name as role_name, r.permissions
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.id = $1`,
         [userId]
      );
    }

    const userRow = userRes.rows[0];
    if (!userRow) {
      return res.status(401).json({
        error: `Authentication failed: Account not found for ${cleanEmail}.`
      });
    }

    // Password verification / Developer Bypass
    const validDbPassword = userRow.password;
    const validApplicantPassword = applicantRow?.founder_password;

    let matches = false;

    if (!providedPassword) {
      // Developer Simulator Bypass mode (no password submitted from simulator quick login)
      matches = true;
    } else {
      if (validDbPassword && validDbPassword.trim() === providedPassword) matches = true;
      if (validApplicantPassword && validApplicantPassword.trim() === providedPassword) matches = true;

      // If applicant exists, auto-sync and allow password verification
      if (!matches && applicantRow && providedPassword) {
        matches = true;
        await query('UPDATE applicants SET founder_password = $1 WHERE id = $2', [providedPassword, applicantRow.id]);
        await query('UPDATE users SET password = $1, is_active = TRUE WHERE id = $2', [providedPassword, userRow.id]);
      } else if (matches && applicantRow && providedPassword) {
        // Sync DB records to ensure consistency
        await query('UPDATE applicants SET founder_password = $1 WHERE id = $2', [providedPassword, applicantRow.id]);
        await query('UPDATE users SET password = $1, is_active = TRUE WHERE id = $2', [providedPassword, userRow.id]);
      }
    }

    if (!matches) {
      return res.status(401).json({
        error: 'Authentication failed: Invalid email or password.'
      });
    }

    // Synchronize user password and role if needed
    if (applicantRow && userRow.role_name !== 'Cohort Founder' && userRow.role_name !== 'Administrator') {
      const roleRes = await query(`SELECT id FROM roles WHERE name = 'Cohort Founder'`);
      const roleId = roleRes.rows[0]?.id;
      if (roleId) {
        await query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userRow.id, roleId]);
        userRow.role_name = 'Cohort Founder';
      }
    }

    const userId = userRow.id;
    const token = jwt.sign({ id: userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '7d' });
    let perms: string[] = [];
    if (userRow.permissions) {
      perms = Array.isArray(userRow.permissions) ? userRow.permissions : JSON.parse(userRow.permissions);
    }

    const effectiveRole = (applicantRow || userRow.role_name === 'Cohort Founder') 
      ? 'Cohort Founder' 
      : (userRow.role_name || 'UCP Member');

    res.json({
      token,
      user: {
        email: userRow.email,
        name: userRow.full_name,
        role: effectiveRole,
        status: userRow.is_active ? 'Active' : 'Inactive',
        permissions: perms
      }
    });

  } catch (err) {
    console.error('Simulated login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getCurrentUser = (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.currentUser });
};

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.email, u.full_name, u.is_active, u.last_login, r.name as role_name
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       ORDER BY u.id ASC`
    );
    const users = userRes.rows.map(row => ({
      email: row.email,
      name: row.full_name,
      role: row.role_name || 'UCP Member',
      status: row.is_active ? 'Active' : 'Inactive',
      lastLogin: row.last_login
    }));
    res.json(users);
  } catch (err) {
    console.error('Failed to query users from DB:', err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
};

export const assignUserRole = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ error: 'Missing required fields: email, role' });
  }

  try {
    // Find User
    const userRes = await query(`SELECT id, email, full_name FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: `User with email '${email}' not found.` });
    }
    const user = userRes.rows[0];

    // Find Role
    const roleRes = await query(`SELECT id, name FROM roles WHERE name = $1`, [role]);
    if (roleRes.rows.length === 0) {
      return res.status(404).json({ error: `Role '${role}' does not exist.` });
    }
    const targetRole = roleRes.rows[0];

    // Get old role name for audit/security checks
    const oldRoleRes = await query(
      `SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [user.id]
    );
    const oldRole = oldRoleRes.rows[0]?.name || 'UCP Member';

    // Privilege Restriction: Non-Administrators cannot change or modify Administrator roles
    if (admin!.role !== 'Administrator') {
      if (oldRole === 'Administrator') {
        return res.status(403).json({ error: 'Privilege Restriction: Non-Administrators cannot change the role of an Administrator account.' });
      }
      if (role === 'Administrator') {
        return res.status(403).json({ error: 'Privilege Restriction: Only existing Administrators can assign or elevate another account to the Administrator role.' });
      }
    }

    // Safeguard: Ensure at least one Administrator always exists
    if (user.email.toLowerCase() === admin!.email.toLowerCase() && role !== 'Administrator') {
      const activeAdminsRes = await query(
        `SELECT COUNT(*) FROM users u
         JOIN user_roles ur ON u.id = ur.user_id
         JOIN roles r ON ur.role_id = r.id
         WHERE r.name = 'Administrator' AND u.is_active = TRUE`
      );
      const activeAdmins = parseInt(activeAdminsRes.rows[0].count);
      if (activeAdmins <= 1) {
        return res.status(400).json({ error: 'Conflict Prevention: System prevents demoting the last active Administrator account.' });
      }
    }

    // Assign Role (Delete previous assignments first)
    await query(`DELETE FROM user_roles WHERE user_id = $1`, [user.id]);
    await query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)`,
      [user.id, targetRole.id, admin!.id]
    );

    const updatedUser = { email: user.email, name: user.full_name, role };

    await logAudit(
      `Role assigned to ${user.full_name}: Changed from ${oldRole} to ${role}`,
      'user',
      String(user.id),
      admin!.email,
      { role: oldRole },
      updatedUser
    );

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error('Failed to assign user role:', err);
    res.status(500).json({ error: 'Internal Server Error while assigning role.' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { email, name, role } = req.body;

  if (!email || !name || !role) {
    return res.status(400).json({ error: 'Missing required parameters: email, name, role' });
  }

  // Privilege Restriction: Non-Administrators cannot create accounts with the Administrator role
  if (admin!.role !== 'Administrator' && role === 'Administrator') {
    return res.status(403).json({ error: 'Privilege Restriction: Only existing Administrators can create accounts with the Administrator role.' });
  }

  try {
    // Check existing
    const existing = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Get Role ID
    const roleRes = await query(`SELECT id FROM roles WHERE name = $1`, [role]);
    if (roleRes.rows.length === 0) {
      return res.status(404).json({ error: `Role '${role}' not found.` });
    }
    const targetRole = roleRes.rows[0];

    // Insert User
    const userInsert = await query(
      `INSERT INTO users (email, full_name, is_active)
       VALUES ($1, $2, TRUE)
       RETURNING id`,
      [email.toLowerCase(), name]
    );
    const userId = userInsert.rows[0].id;

    // Assign Role
    await query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)`,
      [userId, targetRole.id, admin!.id]
    );

    const newUser = { email: email.toLowerCase(), name, role, status: 'Active' };

    await logAudit(`Created User Account: ${name} (${email}) with role ${role}`, 'user', String(userId), admin!.email, null, newUser);

    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error('Failed to create user account:', err);
    res.status(500).json({ error: 'Internal Server Error while creating user account.' });
  }
};
