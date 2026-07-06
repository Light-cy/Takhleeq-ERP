import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query, logAudit, mapUser } from '../db.ts';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth.ts';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Microsoft SSO Authentication Endpoint
router.post('/auth/microsoft', async (req, res) => {
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
      return res.status(403).json({ 
        error: `Domain Verification Failure: The domain '${emailDomain}' is not authorized to register or access Takhleeq ERP.` 
      });
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
      { expiresIn: '24h' }
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
});

// Simulated Identity Authentication Endpoint (Dev/Test Bypass)
router.post('/auth/simulated', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    
    // Query user and their roles/permissions from DB
    const userRes = await query(
      `SELECT u.id, u.email, u.full_name, u.is_active, r.name as role_name, r.permissions
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE LOWER(u.email) = $1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      // Auto-register simulated user in database so testing works seamlessly
      let name = cleanEmail.split('@')[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);
      
      let roleName = 'UCP Member';
      if (cleanEmail.includes('director')) roleName = 'Administrator';
      else if (cleanEmail.includes('manager') || cleanEmail.includes('maheen')) roleName = 'Booking Manager';
      else if (cleanEmail.includes('coordinator') || cleanEmail.includes('faisal')) roleName = 'Facility Coordinator';

      const insertRes = await query(
        `INSERT INTO users (email, full_name, is_active)
         VALUES ($1, $2, TRUE)
         RETURNING id`,
        [cleanEmail, name]
      );
      const userId = insertRes.rows[0].id;

      // Find role ID and assign
      const roleRes = await query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
      const roleId = roleRes.rows[0]?.id;
      if (roleId) {
        await query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userId, roleId]);
      }

      // Re-query user
      const userResRetry = await query(
        `SELECT u.id, u.email, u.full_name, u.is_active, r.name as role_name, r.permissions
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.id = $1`,
        [userId]
      );
      const userRow = userResRetry.rows[0];
      const token = jwt.sign({ id: userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '24h' });
      let perms: string[] = [];
      if (userRow.permissions) {
        perms = Array.isArray(userRow.permissions) ? userRow.permissions : JSON.parse(userRow.permissions);
      }
      return res.json({
        token,
        user: {
          email: userRow.email,
          name: userRow.full_name,
          role: userRow.role_name || 'UCP Member',
          status: userRow.is_active ? 'Active' : 'Inactive',
          permissions: perms
        }
      });
    }

    const userRow = userRes.rows[0];
    const userId = userRow.id;
    const token = jwt.sign({ id: userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '24h' });
    let perms: string[] = [];
    if (userRow.permissions) {
      perms = Array.isArray(userRow.permissions) ? userRow.permissions : JSON.parse(userRow.permissions);
    }

    res.json({
      token,
      user: {
        email: userRow.email,
        name: userRow.full_name,
        role: userRow.role_name || 'UCP Member',
        status: userRow.is_active ? 'Active' : 'Inactive',
        permissions: perms
      }
    });

  } catch (err) {
    console.error('Simulated login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Current Auth Session Details
router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.currentUser });
});

// Get User Registry
router.get('/users', requireAuth, requirePermission('MANAGE_USERS'), async (req: AuthenticatedRequest, res: Response) => {
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
});

// Assign User Role (MANAGE_ROLES or MANAGE_USERS permission)
router.post('/users/assign-role', requireAuth, requirePermission('MANAGE_ROLES'), async (req: AuthenticatedRequest, res: Response) => {
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

    // Get old role name for audit
    const oldRoleRes = await query(
      `SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [user.id]
    );
    const oldRole = oldRoleRes.rows[0]?.name || 'UCP Member';

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
});

// Admin adds a simulated/pre-registered user account
router.post('/users', requireAuth, requirePermission('MANAGE_USERS'), async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { email, name, role } = req.body;

  if (!email || !name || !role) {
    return res.status(400).json({ error: 'Missing required parameters: email, name, role' });
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
});

export default router;
