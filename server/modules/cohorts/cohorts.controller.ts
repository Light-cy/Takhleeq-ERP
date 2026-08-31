import { Response } from 'express';
import { query, logAudit } from '../../db.ts';
import { AuthenticatedRequest } from '../../shared/types/index.ts';
import { sendApplicantStatusEmail, sendPerformanceWarningEmail, sendWarningResolutionEmail, sendPivotNotificationEmail } from './cohort-email.service.ts';
import { syncAcceptedStartupsInternal } from '../startups/startups.controller.ts';

// Helper to generate a friendly Pakistani tracking token like TK-STR-5129
function generateTrackingToken(): string {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `TK-STR-${randNum}`;
}

// 1. DYNAMIC APPLICATION FORM SETTINGS
export const getCohortFormSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM cohort_form_settings LIMIT 1');
    if (result.rows.length === 0 || !result.rows[0]) {
      // Return default if empty
      const defaultSettings = {
        is_active: true,
        fields: [
          { id: 'field_startup_name', label: 'Startup Name', type: 'text', required: true, placeholder: 'Enter your startup name' },
          { id: 'field_startup_desc', label: 'Idea Description', type: 'text', required: true, placeholder: 'Explain your business idea in 2-3 sentences' },
          { id: 'field_founder_name', label: 'Team Lead Name', type: 'text', required: true, placeholder: 'Enter full name of the team lead' },
          { id: 'field_founder_email', label: 'Email Address', type: 'email', required: true, placeholder: 'Enter team lead email' },
          { id: 'field_founder_phone', label: 'Phone Number', type: 'phone', required: true, placeholder: 'e.g. 03xx-xxxxxxx' },
          { id: 'field_founder_cnic', label: 'CNIC Number', type: 'cnic', required: true, placeholder: 'e.g. 35201-xxxxxxx-x' }
        ]
      };
      return res.json(defaultSettings);
    }
    const row = result.rows[0];
    const fields = typeof row.fields === 'string' ? JSON.parse(row.fields) : row.fields;
    res.json({
      is_active: row.is_active,
      fields: fields
    });
  } catch (err: any) {
    console.error('Failed to get cohort form settings:', err);
    res.status(500).json({ error: 'Failed to retrieve application form settings.' });
  }
};

export const updateCohortFormSettings = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { is_active, fields } = req.body;

  if (is_active === undefined || !fields || !Array.isArray(fields)) {
    return res.status(400).json({ error: 'Missing required body: is_active and fields (array) are required.' });
  }

  try {
    // Dynamic fields validation
    for (const f of fields) {
      if (!f.id || !f.label || !f.type) {
        return res.status(400).json({ error: 'Validation Failure: Each form field must have an id, label, and type.' });
      }
    }

    const fieldsJson = typeof fields === 'string' ? fields : JSON.stringify(fields);
    
    // Check if settings record exists (it is a single record)
    const checkSettings = await query('SELECT * FROM cohort_form_settings LIMIT 1');
    if (checkSettings.rows.length === 0) {
      await query(
        `INSERT INTO cohort_form_settings (is_active, fields) VALUES ($1, $2)`,
        [is_active, fieldsJson]
      );
    } else {
      await query(
        `UPDATE cohort_form_settings SET is_active = $1, fields = $2`,
        [is_active, fieldsJson]
      );
    }

    await logAudit(
      `Updated dynamic application form settings: form is now ${is_active ? 'ONLINE' : 'OFFLINE'} with ${fields.length} dynamic fields.`,
      'cohort_form',
      'settings',
      admin?.email || 'Admin',
      null,
      { is_active, fieldsCount: fields.length }
    );

    res.json({ success: true, is_active, fields });
  } catch (err: any) {
    console.error('Failed to update cohort form settings:', err);
    res.status(500).json({ error: 'Internal Server Error while saving form configuration.' });
  }
};

// 2. PUBLIC APPLICANT SUBMISSIONS
export const submitApplicant = async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone, cnic, startup_name, startup_description, form_data } = req.body;

  // Baseline validation of core Pakistani identity criteria
  if (!name || !email || !phone || !cnic || !startup_name || !startup_description) {
    return res.status(400).json({ error: 'Baseline criteria error: Name, Email, Phone, CNIC, Startup Name, and Startup Description are strictly required.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  try {
    // Check if form is currently active
    const settingsRes = await query('SELECT is_active FROM cohort_form_settings LIMIT 1');
    const isActive = settingsRes.rows.length > 0 ? settingsRes.rows[0].is_active : true;
    if (!isActive) {
      return res.status(403).json({ error: 'Application Closed: The admission intake window for Takhleeq Cohort is currently offline.' });
    }

    // STRICT UNIQUE EMAIL CHECK: Prevent duplicate submissions with the same email address
    const existingAppByEmail = await query(
      `SELECT id, tracking_token, startup_name, created_at FROM applicants WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [normalizedEmail]
    );

    if (existingAppByEmail.rows && existingAppByEmail.rows.length > 0) {
      const existing = existingAppByEmail.rows[0];
      return res.status(400).json({
        error: `An application with the email '${normalizedEmail}' has already been submitted for startup '${existing.startup_name}'. Each email address can only be used once. Please track your previous submission with your tracking token.`,
        existing_token: existing.tracking_token,
        is_duplicate_email: true
      });
    }

    // Check for previous application by CNIC to set parent link (if re-applying with new verified email)
    const prevAppRes = await query(
      `SELECT id, tracking_token FROM applicants WHERE REPLACE(cnic, '-', '') = REPLACE($1, '-', '') ORDER BY id DESC LIMIT 1`,
      [cnic.trim()]
    );
    
    let parent_applicant_id: number | null = null;
    if (prevAppRes.rows && prevAppRes.rows.length > 0) {
      parent_applicant_id = prevAppRes.rows[0].id;
    }

    const token = generateTrackingToken();
    const cleanFormData = form_data ? (typeof form_data === 'string' ? form_data : JSON.stringify(form_data)) : '{}';

    const insertRes = await query(
      `INSERT INTO applicants (tracking_token, name, email, phone, cnic, startup_name, startup_description, status, program_status, panel_scores, parent_applicant_id, form_data, orientation_conducted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUBMITTED', 'NOT_ENROLLED', NULL, $8, $9, FALSE)
       RETURNING *`,
      [token, name.trim(), normalizedEmail, phone.trim(), cnic.trim(), startup_name.trim(), startup_description.trim(), parent_applicant_id, cleanFormData]
    );

    const newApplicant = insertRes.rows[0];

    // Log initial stage history
    try {
      await query(
        `INSERT INTO applicant_stage_history (applicant_id, previous_stage, new_stage, updated_by_email, comments, include_in_email)
         VALUES ($1, NULL, 'APPLIED', $2, 'Application Form Submitted', TRUE)`,
        [newApplicant.id, email.toLowerCase().trim()]
      );
    } catch (ashErr) {
      console.error('Failed to log initial stage history:', ashErr);
    }

    await logAudit(
      `New startup application submitted: '${startup_name}' by founder ${name}. Token: ${token}`,
      'applicant',
      String(newApplicant.id),
      email.toLowerCase().trim(),
      null,
      { tracking_token: token, startup_name, parent_linked: !!parent_applicant_id }
    );

    // Send confirmation email asynchronously
    sendApplicantStatusEmail({
      id: newApplicant.id,
      name,
      email: email.toLowerCase().trim(),
      startup_name,
      tracking_token: token,
      status: 'APPLIED'
    }).catch(e => console.error('Failed to send application confirmation email:', e));

    res.status(201).json({
      success: true,
      message: 'Your application has been received successfully!',
      tracking_token: token,
      applicant: newApplicant
    });
  } catch (err: any) {
    console.error('Failed to submit application:', err);
    res.status(500).json({ error: 'Internal Server Error while saving your application.' });
  }
};

export const trackApplicant = async (req: AuthenticatedRequest, res: Response) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'Missing tracking token.' });
  }

  try {
    const result = await query(
      `SELECT id, tracking_token, name, email, startup_name, status, program_status, orientation_conducted, created_at 
       FROM applicants 
       WHERE LOWER(tracking_token) = LOWER($1)`,
      [token.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tracking Token Error: No application found matching the provided token.' });
    }

    const applicant = result.rows[0];

    // Fetch applicant's stage history for timeline synchronization
    const historyRes = await query(
      `SELECT * FROM applicant_stage_history WHERE applicant_id = $1 ORDER BY change_date ASC`,
      [applicant.id]
    );

    res.json({
      ...applicant,
      stage_history: historyRes.rows
    });
  } catch (err: any) {
    console.error('Failed to track applicant:', err);
    res.status(500).json({ error: 'Failed to retrieve tracking status.' });
  }
};

// 3. ADMISSIONS & EVALUATION (ADMIN CONTROL)
export const getApplicants = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Select all applicants
    const result = await query('SELECT * FROM applicants ORDER BY id DESC');
    
    // Parse json fields
    const parsed = result.rows.map(row => {
      const panel_scores = row.panel_scores && typeof row.panel_scores === 'string' ? JSON.parse(row.panel_scores) : row.panel_scores;
      const form_data = row.form_data && typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data;
      return {
        ...row,
        panel_scores,
        form_data
      };
    });
    
    res.json(parsed);
  } catch (err: any) {
    console.error('Failed to query applicants:', err);
    res.status(500).json({ error: 'Failed to fetch applicants.' });
  }
};

export const getApplicantById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM applicants WHERE id = $1', [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Applicant not found.' });
    }
    const row = result.rows[0];
    const panel_scores = row.panel_scores && typeof row.panel_scores === 'string' ? JSON.parse(row.panel_scores) : row.panel_scores;
    const form_data = row.form_data && typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data;
    
    // Auto-generate credentials if confirmed or enrolled and not yet present
    let founderPassword = row.founder_password;
    if (!founderPassword) {
      try {
        const c = await ensureFounderCredentials(row.id);
        founderPassword = c.password;
      } catch (e) {
        console.error('Auto-credentials check error in getApplicantById:', e);
      }
    }

    // If has parent, fetch the parent details too
    let parent = null;
    if (row.parent_applicant_id) {
      const parentRes = await query('SELECT id, tracking_token, startup_name, status, created_at FROM applicants WHERE id = $1', [row.parent_applicant_id]);
      if (parentRes.rows.length > 0) {
        parent = parentRes.rows[0];
      }
    }

    res.json({
      ...row,
      founder_password: founderPassword || row.founder_password,
      panel_scores,
      form_data,
      parent
    });
  } catch (err: any) {
    console.error('Failed to fetch applicant by id:', err);
    res.status(500).json({ error: 'Failed to retrieve applicant details.' });
  }
};

export const updateApplicantScores = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params;
  const { viability, team, scalability } = req.body;

  if (viability === undefined || team === undefined || scalability === undefined) {
    return res.status(400).json({ error: 'Missing evaluation criteria: viability, team, and scalability parameters are required.' });
  }

  try {
    const v = parseFloat(viability);
    const t = parseFloat(team);
    const s = parseFloat(scalability);
    const avg = parseFloat(((v + t + s) / 3).toFixed(2));

    const scoresObj = { viability: v, team: t, scalability: s, average: avg };
    const scoresJson = JSON.stringify(scoresObj);

    const result = await query(
      `UPDATE applicants SET panel_scores = $1 WHERE id = $2 RETURNING *`,
      [scoresJson, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Applicant not found.' });
    }

    const applicant = result.rows[0];

    await logAudit(
      `Logged admission panel scores for '${applicant.startup_name}': Avg Score = ${avg}`,
      'applicant_scores',
      String(id),
      admin?.email || 'Admin',
      null,
      scoresObj
    );

    res.json({ success: true, applicant: { ...applicant, panel_scores: scoresObj } });
  } catch (err: any) {
    console.error('Failed to log applicant scores:', err);
    res.status(500).json({ error: 'Failed to update panel scores.' });
  }
};

export const updateApplicantStatus = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params;
  const { status, program_status, cohort_id, comments, remarks, include_in_email } = req.body; 

  if (!status && !program_status) {
    return res.status(400).json({ error: 'Missing status or program_status field.' });
  }

  try {
    // Retrieve previous status
    const prevRes = await query('SELECT status, program_status, startup_name, cohort_id FROM applicants WHERE id = $1', [parseInt(id)]);
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ error: 'Applicant not found.' });
    }
    const prev = prevRes.rows[0];
    const newStatus = status || prev.status;
    let newProgramStatus = program_status;
    if (!newProgramStatus) {
      if (['CONFIRMED', 'ENROLLED'].includes(newStatus)) {
        newProgramStatus = 'ACTIVE';
      } else if (['REJECTED', 'APPLIED', 'SUBMITTED', 'UNDER_REVIEW', 'IN_REVIEW', 'SHORTLISTED_FOR_PRESENTATION', 'PRESENTATION_CONDUCTED', 'BACKUP_CANDIDATE', 'WAITLISTED'].includes(newStatus)) {
        newProgramStatus = 'NOT_ENROLLED';
      } else {
        newProgramStatus = prev.program_status || 'NOT_ENROLLED';
      }
    }

    // Enforce role and permission constraints:
    if (!admin) {
      // Unauthenticated (Public / Applicant) flow
      if (newStatus !== 'CONFIRMED' || prev.status !== 'ACCEPTED') {
        return res.status(401).json({ error: 'Unauthorized: Only an accepted applicant can confirm seat acceptance, or you must be logged in as staff.' });
      }
    } else {
      // Authenticated (Admin/Staff) flow
      const hasPerm = admin.role === 'Administrator' || (admin.permissions && admin.permissions.includes('cohort:applicant_review'));
      if (!hasPerm) {
        return res.status(403).json({ error: "Access Denied: Missing permission 'cohort:applicant_review' to change status." });
      }
    }

    // If changing to CONFIRMED, ensure we have an active cohort or associate with the specified cohort_id
    let assignedCohortId = cohort_id ? parseInt(cohort_id) : prev.cohort_id;
    if (newStatus === 'CONFIRMED' && !assignedCohortId) {
      // Find the first active cohort if none specified
      const activeCohorts = await query("SELECT id FROM cohorts WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 1");
      if (activeCohorts.rows.length > 0) {
        assignedCohortId = activeCohorts.rows[0].id;
      } else {
        return res.status(400).json({ error: 'Admissions Conflict: Cannot confirm seats. No active incubation cohort exists to associate this startup with.' });
      }
    }

    const result = await query(
      `UPDATE applicants SET status = $1, program_status = $2, cohort_id = $3 WHERE id = $4 RETURNING *`,
      [newStatus, newProgramStatus, assignedCohortId, parseInt(id)]
    );

    const updated = result.rows[0];

    // Synchronize startup_profiles if exists
    try {
      await query(
        `UPDATE startup_profiles SET program_status = $1, cohort_id = $2, updated_at = CURRENT_TIMESTAMP WHERE applicant_id = $3 OR LOWER(startup_name) = LOWER($4)`,
        [newProgramStatus, assignedCohortId, parseInt(id), prev.startup_name]
      );
    } catch (spErr) {
      console.error('Failed to sync startup_profile on status update:', spErr);
    }

    // Log to applicant_stage_history table
    const remarksText = comments || remarks || null;
    const includeInEmailBool = include_in_email !== undefined ? Boolean(include_in_email) : true;
    try {
      await query(
        `INSERT INTO applicant_stage_history (applicant_id, previous_stage, new_stage, updated_by_email, comments, include_in_email)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [parseInt(id), prev.status, newStatus, admin?.email || 'Staff/System', remarksText, includeInEmailBool]
      );
    } catch (hErr) {
      console.error('Failed to insert applicant_stage_history record:', hErr);
    }

    await logAudit(
      `Status updated for startup '${prev.startup_name}': Changed status from '${prev.status}' to '${newStatus}' (program_status: '${newProgramStatus}').`,
      'applicant_status',
      String(id),
      admin?.email || 'Admin',
      { previousStatus: prev.status, previousProgramStatus: prev.program_status, previousCohort: prev.cohort_id },
      { newStatus, newProgramStatus, cohort_id: assignedCohortId, remarks: remarksText, include_in_email: includeInEmailBool }
    );

    // Auto-ensure founder credentials for login portal if status is CONFIRMED, ENROLLED, ACCEPTED, CONDITIONAL_ACCEPTED, etc.
    let creds: any = null;
    if (['CONFIRMED', 'ENROLLED', 'ACCEPTED', 'CONDITIONAL_ACCEPTED', 'SHORTLISTED', 'RECOMMENDED_FOR_INCUBATION', 'ORIENTATION_CONDUCTED', 'CONTRACT_SIGNED', 'GRADUATED'].includes(newStatus)) {
      try {
        creds = await ensureFounderCredentials(updated.id);
      } catch (cErr) {
        console.error('Failed to ensure founder credentials on status update:', cErr);
      }
    }

    // Send milestone email notification asynchronously with login credentials attached
    sendApplicantStatusEmail({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      startup_name: updated.startup_name,
      tracking_token: updated.tracking_token,
      status: newStatus,
      notes: remarksText,
      include_in_email: includeInEmailBool,
      login_email: creds?.email || updated.email,
      login_password: creds?.password || updated.founder_password
    }).catch(e => console.error('Failed to send status update notification email:', e));

    // Auto sync accepted startups to startup_profiles
    syncAcceptedStartupsInternal().catch(err => console.error('Auto sync error on status change:', err));

    res.json({ success: true, applicant: { ...updated, founder_password: creds?.password || updated.founder_password } });
  } catch (err: any) {
    console.error('Failed to update applicant status:', err);
    res.status(500).json({ error: 'Failed to update applicant status.' });
  }
};

export async function ensureFounderCredentials(applicantId: number, customPassword?: string) {
  const appRes = await query('SELECT * FROM applicants WHERE id = $1', [applicantId]);
  if (appRes.rows.length === 0) {
    throw new Error('Applicant not found');
  }
  const app = appRes.rows[0];

  let pwd = customPassword ? customPassword.trim() : (app.founder_password || '');
  if (!pwd) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    pwd = `Tk#${randomDigits}`;
  }

  // Update applicants table
  await query('UPDATE applicants SET founder_password = $1 WHERE id = $2', [pwd, applicantId]);
  app.founder_password = pwd;

  // Ensure user exists in users table with role Cohort Founder
  const cleanEmail = app.email.toLowerCase().trim();
  const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

  let userId: number;
  if (userRes.rows.length === 0) {
    const insRes = await query(
      `INSERT INTO users (email, full_name, is_active, password)
       VALUES ($1, $2, TRUE, $3)
       RETURNING id`,
      [cleanEmail, app.name, pwd]
    );
    userId = insRes.rows[0].id;
  } else {
    userId = userRes.rows[0].id;
    await query('UPDATE users SET password = $1, is_active = TRUE WHERE id = $2', [pwd, userId]);
  }

  // Ensure user has Cohort Founder role
  const roleRes = await query(`SELECT id FROM roles WHERE name = 'Cohort Founder'`);
  const roleId = roleRes.rows[0]?.id;
  if (roleId) {
    const userRoleRes = await query(
      `SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2`,
      [userId, roleId]
    );
    if (userRoleRes.rows.length === 0) {
      await query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userId, roleId]);
    }
  }

  return {
    applicant_id: applicantId,
    email: cleanEmail,
    password: pwd,
    name: app.name,
    startup_name: app.startup_name,
    tracking_token: app.tracking_token
  };
}

export const getApplicantCredentials = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const creds = await ensureFounderCredentials(parseInt(id));
    res.json({ success: true, credentials: creds });
  } catch (err: any) {
    console.error('Failed to get applicant credentials:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve credentials.' });
  }
};

export const manageApplicantCredentials = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { password, resendEmail } = req.body;
  const admin = req.currentUser;

  try {
    const creds = await ensureFounderCredentials(parseInt(id), password);
    let emailSent = false;

    if (resendEmail !== false) {
      emailSent = await sendApplicantStatusEmail({
        id: creds.applicant_id,
        name: creds.name,
        email: creds.email,
        startup_name: creds.startup_name,
        tracking_token: creds.tracking_token,
        status: 'CREDENTIALS',
        login_email: creds.email,
        login_password: creds.password,
        include_in_email: true
      });
    }

    await logAudit(
      `Founder credentials updated/sent for startup '${creds.startup_name}' (${creds.email}).`,
      'applicant_credentials',
      String(id),
      admin?.email || 'Admin'
    );

    res.json({
      success: true,
      credentials: creds,
      emailSent
    });
  } catch (err: any) {
    console.error('Failed to manage applicant credentials:', err);
    res.status(500).json({ error: err.message || 'Failed to manage credentials.' });
  }
};

export const getApplicantStageHistory = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT * FROM applicant_stage_history WHERE applicant_id = $1 ORDER BY change_date DESC`,
      [parseInt(id)]
    );
    res.json(result.rows || []);
  } catch (err: any) {
    console.error('Failed to fetch applicant stage history:', err);
    res.status(500).json({ error: 'Failed to fetch applicant stage history.' });
  }
};

export const updateApplicantProgramStatus = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params;
  const { program_status } = req.body; // 'NOT_ENROLLED' | 'ACTIVE' | 'PAUSED' | 'GRADUATED' | 'KICKED_OUT'

  if (!program_status) {
    return res.status(400).json({ error: 'Missing program_status field.' });
  }

  try {
    const prevRes = await query('SELECT program_status, startup_name FROM applicants WHERE id = $1', [parseInt(id)]);
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ error: 'Applicant not found.' });
    }
    const prev = prevRes.rows[0];

    const result = await query(
      `UPDATE applicants SET program_status = $1 WHERE id = $2 RETURNING *`,
      [program_status, parseInt(id)]
    );

    const updated = result.rows[0];

    // Synchronize linked startup_profiles
    try {
      await query(
        `UPDATE startup_profiles SET program_status = $1, updated_at = CURRENT_TIMESTAMP WHERE applicant_id = $2 OR LOWER(startup_name) = LOWER($3)`,
        [program_status, parseInt(id), prev.startup_name]
      );
    } catch (spErr) {
      console.error('Failed to sync startup_profile in updateApplicantProgramStatus:', spErr);
    }

    await logAudit(
      `Program status updated for startup '${prev.startup_name}': Changed program_status from '${prev.program_status}' to '${program_status}'.`,
      'program_status',
      String(id),
      admin?.email || 'Admin',
      { previousProgramStatus: prev.program_status },
      { newProgramStatus: program_status }
    );

    res.json({ success: true, applicant: updated });
  } catch (err: any) {
    console.error('Failed to update applicant program status:', err);
    res.status(500).json({ error: 'Internal Server Error while changing program status.' });
  }
};

export const updateApplicantOrientation = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params;
  const { orientation_conducted } = req.body;

  if (orientation_conducted === undefined) {
    return res.status(400).json({ error: 'Missing orientation_conducted boolean parameter.' });
  }

  try {
    const result = await query(
      `UPDATE applicants SET orientation_conducted = $1 WHERE id = $2 RETURNING *`,
      [orientation_conducted === true || orientation_conducted === 'true', parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Applicant not found.' });
    }

    const applicant = result.rows[0];

    await logAudit(
      `Orientation attendance updated for '${applicant.startup_name}': Marked as ${orientation_conducted ? 'CONDUCTED' : 'NOT CONDUCTED'}.`,
      'applicant_orientation',
      String(id),
      admin?.email || 'Admin',
      null,
      { orientation_conducted }
    );

    res.json({ success: true, applicant });
  } catch (err: any) {
    console.error('Failed to update orientation:', err);
    res.status(500).json({ error: 'Failed to update orientation attendance.' });
  }
};

// 4. COHORTS LIST & CREATION
export const getCohorts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM cohorts ORDER BY id ASC');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Failed to fetch cohorts:', err);
    res.status(500).json({ error: 'Failed to retrieve incubation cohorts.' });
  }
};

export const createCohort = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { name, status } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Cohort name is required.' });
  }

  try {
    // Enforce business rule: A new cohort cannot be created until all existing cohorts are COMPLETED (Bulk Graduated)
    const existingCohortsRes = await query(`SELECT * FROM cohorts ORDER BY id DESC`);
    const existingCohorts = existingCohortsRes.rows || [];
    const uncompletedCohort = existingCohorts.find((c: any) => c.status !== 'COMPLETED');

    if (uncompletedCohort) {
      return res.status(400).json({
        error: `Cannot create a new cohort. Previous cohort '${uncompletedCohort.name}' is currently '${uncompletedCohort.status}'. Please bulk graduate and complete the previous cohort first.`
      });
    }

    const result = await query(
      `INSERT INTO cohorts (name, status) VALUES ($1, $2) RETURNING *`,
      [name.trim(), status || 'ACTIVE']
    );

    const cohort = result.rows[0];

    await logAudit(
      `Created new incubation cohort: '${name}' with status '${cohort.status}'`,
      'cohort',
      String(cohort.id),
      admin?.email || 'Admin',
      null,
      cohort
    );

    res.status(201).json({ success: true, cohort });
  } catch (err: any) {
    console.error('Failed to create cohort:', err);
    res.status(500).json({ error: 'Internal Server Error while creating cohort.' });
  }
};

export const updateCohortStatus = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params;
  const { status, auto_graduate_founders } = req.body; // status: 'DRAFT' | 'ACTIVE' | 'COMPLETED'

  if (!status) {
    return res.status(400).json({ error: 'Missing status parameter.' });
  }

  try {
    const prevRes = await query('SELECT name, status FROM cohorts WHERE id = $1', [parseInt(id)]);
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cohort not found.' });
    }
    const prev = prevRes.rows[0];

    await query('UPDATE cohorts SET status = $1 WHERE id = $2', [status, parseInt(id)]);

    let bulkGraduatedCount = 0;
    // Bulk action auto-graduation prompt handling
    if (status === 'COMPLETED' && auto_graduate_founders) {
      // Fetch all confirmed founders of this cohort that do NOT have active warnings
      const activeWarnings = await query(
        `SELECT DISTINCT applicant_id FROM performance_warnings WHERE cohort_id = $1 AND status = 'ACTIVE'`,
        [parseInt(id)]
      );
      const blockedIds = activeWarnings.rows.map(w => w.applicant_id);

      // We retrieve all enrolled/active founders
      const founders = await query(
        `SELECT id, startup_name FROM applicants WHERE cohort_id = $1 AND (status = 'CONFIRMED' OR status = 'ENROLLED' OR program_status = 'ACTIVE')`,
        [parseInt(id)]
      );

      const toGraduate = founders.rows.filter(f => !blockedIds.includes(f.id));

      for (const f of toGraduate) {
        await query(
          `UPDATE applicants SET program_status = 'GRADUATED' WHERE id = $1`,
          [f.id]
        );
        try {
          await query(
            `UPDATE startup_profiles SET program_status = 'GRADUATED', updated_at = CURRENT_TIMESTAMP WHERE applicant_id = $1 OR LOWER(startup_name) = LOWER($2)`,
            [f.id, f.startup_name]
          );
        } catch (e) {
          // ignore
        }
        bulkGraduatedCount++;
      }
    }

    await logAudit(
      `Incubation cohort '${prev.name}' status updated to '${status}'. Bulk-graduated founders count: ${bulkGraduatedCount}`,
      'cohort_status',
      String(id),
      admin?.email || 'Admin',
      { previousStatus: prev.status },
      { newStatus: status, bulkGraduatedCount }
    );

    res.json({ success: true, status, bulkGraduatedCount });
  } catch (err: any) {
    console.error('Failed to update cohort status:', err);
    res.status(500).json({ error: 'Internal Server Error while updating cohort status.' });
  }
};

// 5. SESSION SCHEDULING & ATTENDANCE
export const getCohortSessions = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // cohort_id
  try {
    const result = await query(
      `SELECT * FROM cohort_sessions WHERE cohort_id = $1 ORDER BY date ASC, start_time ASC`,
      [parseInt(id)]
    );
    const sessions = result.rows;

    const applicantsRes = await query(
      `SELECT COUNT(*) FROM applicants WHERE cohort_id = $1 OR status = 'CONFIRMED'`,
      [parseInt(id)]
    );
    const totalStartups = parseInt(applicantsRes.rows[0]?.count || '0', 10);

    const enriched = await Promise.all(sessions.map(async (sess: any) => {
      const attRes = await query(
        `SELECT COUNT(*) as total_marked, COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present_count FROM session_attendance WHERE session_id = $1`,
        [sess.id]
      );
      const totalMarked = parseInt(attRes.rows[0]?.total_marked || '0', 10);
      const presentCount = parseInt(attRes.rows[0]?.present_count || '0', 10);

      let attendance_summary = "Attendance not marked yet";
      if (totalMarked > 0) {
        const totalTarget = totalStartups > 0 ? totalStartups : totalMarked;
        attendance_summary = `${presentCount} of ${totalTarget} marked present`;
      }

      const asgRes = await query(
        `SELECT a.id, (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.assignment_id = a.id) as sub_count FROM assignments a WHERE a.session_id = $1`,
        [sess.id]
      );
      const asgCount = asgRes.rows.length;
      let subCount = 0;
      asgRes.rows.forEach((r: any) => { subCount += parseInt(r.sub_count || '0', 10); });

      let assignments_summary = "No assignments yet";
      if (asgCount > 0) {
        assignments_summary = `${asgCount} assignment${asgCount > 1 ? 's' : ''} · ${subCount} submission${subCount === 1 ? '' : 's'}`;
      }

      // Session Feedback Statistics & 7-Day Window Status
      const feedRes = await query(
        `SELECT rating FROM cohort_feedback WHERE session_id = $1`,
        [sess.id]
      );
      const feedRows = feedRes.rows || [];
      const feedCount = feedRows.length;
      const avgRating = feedCount > 0 
        ? Number((feedRows.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) / feedCount).toFixed(1))
        : 0;

      const todayStr = getTodayDateStringServer();
      const sessDate = sess.date || '';
      let feedback_status: 'UPCOMING' | 'ACTIVE' | 'EXPIRED' = 'UPCOMING';
      let days_remaining = 0;
      if (sessDate) {
        if (todayStr < sessDate) {
          feedback_status = 'UPCOMING';
          days_remaining = 0;
        } else {
          const dSess = new Date(sessDate);
          const dToday = new Date(todayStr);
          const diffDays = Math.floor((dToday.getTime() - dSess.getTime()) / (1000 * 3600 * 24));
          if (diffDays <= 7) {
            feedback_status = 'ACTIVE';
            days_remaining = Math.max(0, 7 - diffDays);
          } else {
            feedback_status = 'EXPIRED';
            days_remaining = 0;
          }
        }
      }

      let feedback_summary = "No feedback submitted yet";
      if (feedCount > 0) {
        feedback_summary = `★ ${avgRating} (${feedCount} review${feedCount > 1 ? 's' : ''})`;
      } else if (feedback_status === 'ACTIVE') {
        feedback_summary = `Feedback open (${days_remaining}d left)`;
      } else if (feedback_status === 'UPCOMING') {
        feedback_summary = `Opens on session date`;
      } else {
        feedback_summary = `Window closed`;
      }

      return {
        ...sess,
        attendance_summary,
        assignments_summary,
        feedback_count: feedCount,
        average_rating: avgRating,
        feedback_status,
        days_remaining,
        feedback_summary
      };
    }));

    res.json(enriched);
  } catch (err: any) {
    console.error('Failed to query sessions:', err);
    res.status(500).json({ error: 'Failed to retrieve scheduled cohort sessions.' });
  }
};

export const createCohortSession = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params; // cohort_id
  const { title, date, start_time, end_time, mentor_name, topic_category, venue, recording_url } = req.body;

  if (!title || !date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required session parameters: title, date, start_time, and end_time are required.' });
  }

  try {
    // Schedule conflicts prevention (verify if mentor is already booked for another session at this date and overlapping time)
    if (mentor_name && mentor_name.trim().length > 0) {
      const conflicts = await query(
        `SELECT * FROM cohort_sessions 
         WHERE date = $1 AND mentor_name = $2 
         AND ((start_time <= $3 AND end_time > $3) OR (start_time < $4 AND end_time >= $4))`,
        [date, mentor_name.trim(), start_time, end_time]
      );
      if (conflicts.rows.length > 0) {
        return res.status(400).json({ error: `Mentor Conflict Prevention: Mentor '${mentor_name}' is already booked for session '${conflicts.rows[0].title}' on this date during the overlapping hours.` });
      }
    }

    const result = await query(
      `INSERT INTO cohort_sessions (cohort_id, title, date, start_time, end_time, mentor_name, topic_category, venue, recording_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        parseInt(id),
        title.trim(),
        date,
        start_time,
        end_time,
        mentor_name ? mentor_name.trim() : null,
        topic_category ? topic_category.trim() : null,
        venue ? venue.trim() : null,
        recording_url ? recording_url.trim() : null
      ]
    );

    const session = result.rows[0];
    if (!session) {
      return res.status(500).json({ error: 'Failed to create session record.' });
    }

    // Automatically create attendance records for every active/confirmed startup in this cohort
    try {
      let startupsRes = await query(
        `SELECT id FROM applicants WHERE cohort_id = $1 AND (program_status = 'ACTIVE' OR status = 'CONFIRMED')`,
        [parseInt(id)]
      );
      if (!startupsRes.rows || startupsRes.rows.length === 0) {
        startupsRes = await query(`SELECT id FROM applicants WHERE cohort_id = $1`, [parseInt(id)]);
      }
      if (!startupsRes.rows || startupsRes.rows.length === 0) {
        startupsRes = await query(`SELECT id FROM applicants LIMIT 10`);
      }

      if (startupsRes.rows) {
        for (const st of startupsRes.rows) {
          if (st && st.id) {
            await query(
              `INSERT INTO session_attendance (session_id, applicant_id, status)
               VALUES ($1, $2, 'not_marked')`,
              [session.id, st.id]
            );
          }
        }
      }
    } catch (attErr) {
      console.error('Failed to auto-seed session attendance records:', attErr);
    }

    await logAudit(
      `Scheduled new cohort session: '${title}' led by ${mentor_name || 'Internal Staff'} on ${date} (${start_time} - ${end_time})`,
      'session',
      String(session.id),
      admin?.email || 'Admin',
      null,
      session
    );

    res.status(201).json({ success: true, session });
  } catch (err: any) {
    console.error('Failed to schedule session:', err);
    res.status(500).json({ error: 'Internal Server Error while creating session.' });
  }
};

export const deleteCohortSession = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params; // session_id
  try {
    // Retrieve title for log
    const sessRes = await query('SELECT title, cohort_id FROM cohort_sessions WHERE id = $1', [parseInt(id)]);
    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const sess = sessRes.rows[0];

    // Delete attendance records, assignments, and session feedback first
    await query('DELETE FROM session_attendance WHERE session_id = $1', [parseInt(id)]);
    await query('DELETE FROM assignments WHERE session_id = $1', [parseInt(id)]);
    await query('DELETE FROM cohort_feedback WHERE session_id = $1', [parseInt(id)]);
    
    // Delete session
    await query('DELETE FROM cohort_sessions WHERE id = $1', [parseInt(id)]);

    await logAudit(
      `Cancelled/deleted cohort session '${sess.title}'`,
      'session_delete',
      String(id),
      admin?.email || 'Admin',
      null,
      sess
    );

    res.json({ success: true, cohort_id: sess.cohort_id });
  } catch (err: any) {
    console.error('Failed to delete session:', err);
    res.status(500).json({ error: 'Failed to cancel session.' });
  }
};

export const getSessionAttendance = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // session_id
  try {
    const sessRes = await query('SELECT * FROM cohort_sessions WHERE id = $1', [parseInt(id)]);
    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const sess = sessRes.rows[0];

    // Determine lock state based on session date vs today's date
    const todayStr = new Date().toISOString().slice(0, 10);
    const sessionDateStr = sess.date ? String(sess.date).slice(0, 10) : todayStr;
    const isLocked = sessionDateStr > todayStr;

    // Filter out startups who are KICKED_OUT, PAUSED, SUSPENDED, DROPPED, or REJECTED
    let applicantsRes = await query(
      `SELECT id, name, startup_name, email, status, program_status 
       FROM applicants 
       WHERE (cohort_id = $1 OR status = 'CONFIRMED' OR status = 'ENROLLED' OR status = 'ORIENTATION_CONDUCTED' OR status = 'ACCEPTED')
         AND (program_status IS NULL OR program_status NOT IN ('PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED'))
         AND (status NOT IN ('PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED', 'REJECTED'))
       ORDER BY id ASC`,
      [sess.cohort_id]
    );

    if (applicantsRes.rows.length === 0) {
      const fallbackRes = await query('SELECT id, name, startup_name, email, status, program_status FROM applicants ORDER BY id ASC');
      applicantsRes = {
        rows: (fallbackRes.rows || []).filter((a: any) => {
          const ps = String(a.program_status || '').toUpperCase();
          const st = String(a.status || '').toUpperCase();
          return !['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED'].includes(ps) &&
                 !['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED', 'REJECTED'].includes(st);
        })
      };
    } else {
      // Further memory filter just in case of non-standard casing
      applicantsRes.rows = applicantsRes.rows.filter((a: any) => {
        const ps = String(a.program_status || '').toUpperCase();
        const st = String(a.status || '').toUpperCase();
        return !['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED'].includes(ps) &&
               !['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED', 'REJECTED'].includes(st);
      });
    }

    const attendanceRes = await query('SELECT * FROM session_attendance WHERE session_id = $1', [parseInt(id)]);
    
    const attMap = new Map();
    (attendanceRes.rows || []).forEach((a: any) => attMap.set(a.applicant_id, a));

    const records = (applicantsRes.rows || []).map((app: any) => {
      const existing = attMap.get(app.id);
      return {
        id: existing?.id || null,
        session_id: parseInt(id),
        applicant_id: app.id,
        startup_name: app.startup_name || 'Startup Team',
        founder_name: app.name || 'Founder',
        status: existing?.status || 'not_marked',
        marked_at: existing?.marked_at || null
      };
    });

    res.json({
      success: true,
      session: sess,
      attendance: records,
      attendance_sheet_photo_url: sess.attendance_sheet_photo_url || null,
      is_locked: isLocked,
      lock_message: isLocked ? `Attendance is locked until the scheduled session date (${sessionDateStr}).` : null
    });
  } catch (err: any) {
    console.error('Failed to fetch session attendance:', err);
    res.status(500).json({ error: 'Failed to retrieve attendance logs.' });
  }
};

export const saveSessionAttendance = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params; // session_id
  const { attendance, attendance_sheet_photo_url } = req.body;

  if (!attendance || !Array.isArray(attendance)) {
    return res.status(400).json({ error: 'Missing attendance logs array.' });
  }

  try {
    const sessRes = await query('SELECT title, cohort_id, date FROM cohort_sessions WHERE id = $1', [parseInt(id)]);
    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const sess = sessRes.rows[0];

    // Date Lock Verification: Session attendance cannot be marked before the session's scheduled date
    const todayStr = new Date().toISOString().slice(0, 10);
    const sessionDateStr = sess.date ? String(sess.date).slice(0, 10) : todayStr;
    if (sessionDateStr > todayStr) {
      return res.status(400).json({ 
        error: `Attendance Locked: You cannot record attendance before the scheduled session date (${sessionDateStr}). Attendance opens on the session date.` 
      });
    }

    if (attendance_sheet_photo_url !== undefined) {
      await query('UPDATE cohort_sessions SET attendance_sheet_photo_url = $1 WHERE id = $2', [
        attendance_sheet_photo_url ? attendance_sheet_photo_url.trim() : null,
        parseInt(id)
      ]);
    }

    const saved = [];
    for (const record of attendance) {
      // Check if applicant is active (exclude paused, kicked out, suspended or dropped startups)
      const appCheck = await query('SELECT id, status, program_status FROM applicants WHERE id = $1', [parseInt(record.applicant_id)]);
      const app = appCheck.rows[0];
      if (app) {
        const ps = String(app.program_status || '').toUpperCase();
        const st = String(app.status || '').toUpperCase();
        if (['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED'].includes(ps) || ['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED', 'REJECTED'].includes(st)) {
          // Skip inactive / kicked-out / paused startup from session attendance
          continue;
        }
      }

      const insRes = await query(
        `INSERT INTO session_attendance (session_id, applicant_id, status)
         VALUES ($1, $2, $3)`,
        [parseInt(id), parseInt(record.applicant_id), record.status || 'not_marked']
      );
      saved.push(insRes.rows[0]);
    }

    await logAudit(
      `Marked attendance list for session '${sess.title}': ${saved.filter(a => a?.status === 'present' || a?.status === 'PRESENT').length} present, ${saved.filter(a => a?.status === 'absent' || a?.status === 'ABSENT').length} absent.`,
      'session_attendance',
      String(id),
      admin?.email || 'Admin',
      null,
      { presentCount: saved.filter(a => a?.status === 'present' || a?.status === 'PRESENT').length, totalCount: saved.length }
    );

    res.json({ success: true, attendance: saved, attendance_sheet_photo_url: attendance_sheet_photo_url || null });
  } catch (err: any) {
    console.error('Failed to save session attendance:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error while saving attendance.' });
  }
};

// --- ASSIGNMENTS & SUBMISSIONS ---
const getTodayDateStringServer = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createCohortAssignment = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params; // cohort_id
  const { title, description, due_date, attachment_url, cohort_id } = req.body;

  if (!title || !due_date) {
    return res.status(400).json({ error: 'Title and due date are required for an assignment.' });
  }

  const todayStr = getTodayDateStringServer();
  if (due_date && due_date.trim() < todayStr) {
    return res.status(400).json({ error: 'Assignment due date cannot be in the past. Please select today or a future date.' });
  }

  try {
    let targetCohortId: number | null = null;
    if (id && !isNaN(parseInt(id))) {
      targetCohortId = parseInt(id);
    } else if (cohort_id && !isNaN(parseInt(cohort_id))) {
      targetCohortId = parseInt(cohort_id);
    }

    if (!targetCohortId) {
      return res.status(400).json({ error: 'Cohort ID is required for a standalone assignment.' });
    }

    const insRes = await query(
      `INSERT INTO assignments (cohort_id, session_id, title, description, due_date, attachment_url, created_by_user_id)
       VALUES ($1, NULL, $2, $3, $4, $5, $6) RETURNING *`,
      [targetCohortId, title.trim(), description ? description.trim() : null, due_date, attachment_url ? attachment_url.trim() : null, admin?.id || null]
    );

    res.status(201).json({ success: true, assignment: insRes.rows[0] });
  } catch (err: any) {
    console.error('Failed to create independent cohort assignment:', err);
    res.status(500).json({ error: 'Failed to create independent assignment.' });
  }
};

export const syncProfileAssignmentsToDatabase = async () => {
  // Safe helper: only synchronizes submissions for existing assignments, does not resurrect deleted assignments
  try {
    const allAppsRes = await query('SELECT id, cohort_id, form_data FROM applicants');
    const existingAsgsRes = await query('SELECT * FROM assignments');
    const existingSubsRes = await query('SELECT * FROM assignment_submissions');

    for (const app of (allAppsRes.rows || [])) {
      try {
        const formData = typeof app.form_data === 'string' ? JSON.parse(app.form_data) : app.form_data;
        const profileAsgs = formData?.profile?.assignments || [];

        for (const pa of profileAsgs) {
          if (!pa || !pa.title) continue;

          // Search if matching assignment exists in DB
          let dbAsg = (existingAsgsRes.rows || []).find((a: any) => 
            String(a.id) === String(pa.id) || 
            (a.title && pa.title && a.title.toLowerCase().trim() === pa.title.toLowerCase().trim())
          );

          if (dbAsg && (pa.status === 'SUBMITTED' || pa.fileName)) {
            // Check if submission exists
            const dbSub = (existingSubsRes.rows || []).find((s: any) => 
              s.assignment_id === dbAsg.id && s.applicant_id === app.id
            );

            if (!dbSub) {
              const fileUrl = pa.fileName || '/uploads/submission.pdf';
              const submittedAt = pa.uploadedAt || new Date().toISOString();
              const insSubRes = await query(
                `INSERT INTO assignment_submissions (assignment_id, applicant_id, file_url, submitted_at)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [dbAsg.id, app.id, fileUrl, submittedAt]
              );
              if (insSubRes.rows && insSubRes.rows[0]) {
                existingSubsRes.rows.push(insSubRes.rows[0]);
              }
            }
          }
        }
      } catch (appErr) {
        // ignore individual applicant parse error
      }
    }
  } catch (err) {
    console.warn('Sync profile assignments error:', err);
  }
};

export const getCohortAssignments = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // cohort_id
  try {
    const cohortId = (id && !isNaN(parseInt(id))) ? parseInt(id) : null;
    const result = await query(
      `SELECT a.*, cs.title as session_title 
       FROM assignments a 
       LEFT JOIN cohort_sessions cs ON a.session_id = cs.id
       WHERE ($1::integer IS NULL OR a.cohort_id = $1)
       ORDER BY a.created_at DESC`,
      [cohortId]
    );

    const assignmentsWithStats = await Promise.all(
      result.rows.map(async (asg: any) => {
        const countRes = await query(
          `SELECT applicant_id FROM assignment_submissions WHERE assignment_id = $1`,
          [asg.id]
        );
        const submittedApplicantIds = new Set((countRes.rows || []).map((r: any) => r.applicant_id));

        return {
          ...asg,
          submissions_count: submittedApplicantIds.size
        };
      })
    );

    res.json({ success: true, assignments: assignmentsWithStats });
  } catch (err: any) {
    console.error('Failed to fetch cohort assignments:', err);
    res.status(500).json({ error: 'Failed to fetch cohort assignments.' });
  }
};

export const createSessionAssignment = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params; // session_id
  const { title, description, due_date, attachment_url } = req.body;

  if (!title || !due_date) {
    return res.status(400).json({ error: 'Title and due date are required for an assignment.' });
  }

  const todayStr = getTodayDateStringServer();
  if (due_date && due_date.trim() < todayStr) {
    return res.status(400).json({ error: 'Assignment due date cannot be in the past. Please select today or a future date.' });
  }

  try {
    const sessRes = await query('SELECT id, title, cohort_id FROM cohort_sessions WHERE id = $1', [parseInt(id)]);
    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const cohortId = sessRes.rows[0].cohort_id;

    const insRes = await query(
      `INSERT INTO assignments (session_id, cohort_id, title, description, due_date, attachment_url, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [parseInt(id), cohortId, title.trim(), description ? description.trim() : null, due_date, attachment_url ? attachment_url.trim() : null, admin?.id || null]
    );

    res.status(201).json({ success: true, assignment: insRes.rows[0] });
  } catch (err: any) {
    console.error('Failed to create assignment:', err);
    res.status(500).json({ error: 'Failed to create assignment.' });
  }
};

export const getSessionAssignments = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // session_id
  try {
    const result = await query('SELECT * FROM assignments WHERE session_id = $1 ORDER BY created_at DESC', [parseInt(id)]);
    res.json({ success: true, assignments: result.rows });
  } catch (err: any) {
    console.error('Failed to fetch assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments.' });
  }
};

export const deleteSessionAssignment = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // assignment_id
  try {
    const asgId = parseInt(id);
    const asgRes = await query('SELECT title FROM assignments WHERE id = $1', [asgId]);
    const title = asgRes.rows[0]?.title;

    await query('DELETE FROM assignment_submissions WHERE assignment_id = $1', [asgId]);
    await query('DELETE FROM assignments WHERE id = $1', [asgId]);

    // Cleanup from applicants profile JSON
    try {
      const allAppsRes = await query('SELECT id, form_data FROM applicants');
      for (const app of (allAppsRes.rows || [])) {
        if (!app.form_data) continue;
        const formData = typeof app.form_data === 'string' ? JSON.parse(app.form_data) : app.form_data;
        if (formData.profile?.assignments) {
          formData.profile.assignments = formData.profile.assignments.filter((pa: any) => 
            String(pa.id) !== String(asgId) && 
            (!title || !pa.title || pa.title.toLowerCase().trim() !== title.toLowerCase().trim())
          );
          await query('UPDATE applicants SET form_data = $1 WHERE id = $2', [JSON.stringify(formData), app.id]);
        }
      }
    } catch (cleanErr) {
      console.warn('Cleanup profile assignments error:', cleanErr);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete assignment:', err);
    res.status(500).json({ error: 'Failed to delete assignment.' });
  }
};

export const updateAssignment = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, due_date } = req.body;
  try {
    const asgId = parseInt(id);
    const existingRes = await query('SELECT * FROM assignments WHERE id = $1', [asgId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const current = existingRes.rows[0];
    const newTitle = title !== undefined && title !== null ? title.trim() : current.title;
    const newDesc = description !== undefined && description !== null ? description.trim() : current.description;
    const newDueDate = due_date !== undefined && due_date !== null ? due_date.trim() : current.due_date;

    const todayStr = getTodayDateStringServer();
    if (newDueDate && newDueDate < todayStr) {
      return res.status(400).json({ error: 'Assignment due date cannot be in the past. Please select today or a future date.' });
    }

    const result = await query(
      `UPDATE assignments SET title = $1, description = $2, due_date = $3 WHERE id = $4 RETURNING *`,
      [newTitle, newDesc, newDueDate, asgId]
    );

    res.json({ success: true, assignment: result.rows[0] || { id: asgId, title: newTitle, description: newDesc, due_date: newDueDate } });
  } catch (err: any) {
    console.error('Failed to update assignment:', err);
    res.status(500).json({ error: 'Failed to update assignment due date.' });
  }
};

export const getAssignmentSubmissions = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // assignment_id
  try {
    const asgRes = await query('SELECT * FROM assignments WHERE id = $1', [parseInt(id)]);
    if (asgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }
    const assignment = asgRes.rows[0];

    let cohortId = assignment.cohort_id;
    if (!cohortId && assignment.session_id) {
      const sessRes = await query('SELECT cohort_id FROM cohort_sessions WHERE id = $1', [assignment.session_id]);
      cohortId = sessRes.rows[0]?.cohort_id;
    }

    let applicantsRes = await query(
      `SELECT id, name, startup_name, email, form_data 
       FROM applicants 
       WHERE (cohort_id = $1 OR $1::integer IS NULL) 
          OR status IN ('CONFIRMED', 'ENROLLED', 'ACCEPTED', 'SELECTED', 'ACTIVE', 'IN_PROGRAM')
          OR id IN (SELECT applicant_id FROM assignment_submissions WHERE assignment_id = $2)`,
      [cohortId, parseInt(id)]
    );
    if (applicantsRes.rows.length === 0) {
      applicantsRes = await query('SELECT id, name, startup_name, email, form_data FROM applicants ORDER BY id ASC');
    }

    const submissionsRes = await query('SELECT * FROM assignment_submissions WHERE assignment_id = $1', [parseInt(id)]);

    const subMap = new Map();
    (submissionsRes.rows || []).forEach((s: any) => subMap.set(s.applicant_id, s));

    const submissions = (applicantsRes.rows || []).map((app: any) => {
      const sub = subMap.get(app.id);

      let profileSub: any = null;
      try {
        const formData = typeof app.form_data === 'string' ? JSON.parse(app.form_data) : app.form_data;
        const profileAsgs = formData?.profile?.assignments || [];
        profileSub = profileAsgs.find((pa: any) => 
          String(pa.id) === String(id) || 
          (pa.title && assignment.title && pa.title.toLowerCase().trim() === assignment.title.toLowerCase().trim())
        );
      } catch (e) {
        // ignore
      }

      const isSubmitted = !!sub || (profileSub && (profileSub.status === 'SUBMITTED' || profileSub.fileName));
      const fileUrl = sub?.file_url || profileSub?.fileName || null;
      const submittedAt = sub?.submitted_at || profileSub?.uploadedAt || null;

      return {
        applicant_id: app.id,
        startup_name: app.startup_name || 'Startup Team',
        founder_name: app.name || 'Founder',
        is_submitted: !!isSubmitted,
        file_url: fileUrl,
        submitted_at: submittedAt,
        updated_at: sub?.updated_at || submittedAt
      };
    });

    res.json({
      success: true,
      assignment,
      submissions
    });
  } catch (err: any) {
    console.error('Failed to fetch assignment submissions:', err);
    res.status(500).json({ error: 'Failed to retrieve assignment submissions.' });
  }
};

export const submitAssignment = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // assignment_id
  const { file_url, applicant_id } = req.body;
  const user = req.currentUser;

  if (!file_url) {
    return res.status(400).json({ error: 'file_url is required for submission.' });
  }

  try {
    let targetApplicantId = applicant_id ? parseInt(applicant_id) : null;

    if (!targetApplicantId && user?.email) {
      const appRes = await query('SELECT id FROM applicants WHERE LOWER(email) = LOWER($1)', [user.email]);
      if (appRes.rows.length > 0) {
        targetApplicantId = appRes.rows[0].id;
      }
    }

    if (!targetApplicantId) {
      const appRes = await query('SELECT id FROM applicants ORDER BY id ASC LIMIT 1');
      if (appRes.rows.length > 0) {
        targetApplicantId = appRes.rows[0].id;
      }
    }

    if (!targetApplicantId) {
      return res.status(400).json({ error: 'Could not resolve startup applicant identity for submission.' });
    }

    let targetAsgId = isNaN(parseInt(id)) ? 0 : parseInt(id);
    let asgRes = await query('SELECT * FROM assignments WHERE id = $1', [targetAsgId]);
    if (asgRes.rows.length === 0) {
      const insAsg = await query(
        `INSERT INTO assignments (cohort_id, session_id, title, description, due_date)
         VALUES (1, NULL, 'Cohort Deliverable', 'Independent Cohort Deliverable', 'No deadline') RETURNING *`
      );
      if (insAsg.rows && insAsg.rows[0]) {
        targetAsgId = insAsg.rows[0].id;
        asgRes = { rows: [insAsg.rows[0]] };
      }
    }

    const targetAsg = asgRes.rows[0];
    if (targetAsg && targetAsg.due_date && targetAsg.due_date !== 'No deadline') {
      const dueDate = new Date(targetAsg.due_date);
      if (!isNaN(dueDate.getTime())) {
        dueDate.setHours(23, 59, 59, 999);
        if (new Date() > dueDate) {
          return res.status(400).json({
            error: `Submission deadline passed on ${targetAsg.due_date}. Submissions are closed. Please request Admin to extend the due date.`
          });
        }
      }
    }

    await query('DELETE FROM assignment_submissions WHERE assignment_id = $1 AND applicant_id = $2', [targetAsgId, targetApplicantId]);

    const subRes = await query(
      `INSERT INTO assignment_submissions (assignment_id, applicant_id, file_url)
       VALUES ($1, $2, $3) RETURNING *`,
      [targetAsgId, targetApplicantId, file_url.trim()]
    );

    // Sync to profile assignments JSON as backup
    try {
      const appRecordRes = await query(`SELECT form_data FROM applicants WHERE id = $1`, [targetApplicantId]);
      if (appRecordRes.rows.length > 0) {
        const formData = appRecordRes.rows[0].form_data ? (typeof appRecordRes.rows[0].form_data === 'string' ? JSON.parse(appRecordRes.rows[0].form_data) : appRecordRes.rows[0].form_data) : {};
        const profile = formData.profile || {};
        const asgs = profile.assignments || [];
        const existingAsgIdx = asgs.findIndex((a: any) => String(a.id) === String(id) || String(a.id) === String(targetAsgId));

        if (existingAsgIdx >= 0) {
          asgs[existingAsgIdx] = {
            ...asgs[existingAsgIdx],
            status: 'SUBMITTED',
            fileName: file_url.trim(),
            uploadedAt: new Date().toLocaleString()
          };
        } else {
          asgs.push({
            id: String(targetAsgId),
            status: 'SUBMITTED',
            fileName: file_url.trim(),
            uploadedAt: new Date().toLocaleString()
          });
        }

        formData.profile = { ...profile, assignments: asgs };
        await query(`UPDATE applicants SET form_data = $1 WHERE id = $2`, [JSON.stringify(formData), targetApplicantId]);
      }
    } catch (syncErr) {
      console.warn('Profile sync failed during submission:', syncErr);
    }

    res.json({
      success: true,
      submission: subRes.rows[0]
    });
  } catch (err: any) {
    console.error('Failed to submit assignment:', err);
    res.status(500).json({ error: 'Failed to submit assignment.' });
  }
};

// 6. WEEKLY TEAM CHECK-INS
export const getCohortCheckIns = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // cohort_id
  try {
    const result = await query(
      `SELECT * FROM team_checkins WHERE cohort_id = $1 ORDER BY id DESC`,
      [parseInt(id)]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Failed to fetch check-ins:', err);
    res.status(500).json({ error: 'Failed to retrieve team weekly check-ins.' });
  }
};

export const createTeamCheckIn = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params; // cohort_id
  const { applicant_id, blockers, progress_score, mentor_notes } = req.body;

  if (!applicant_id || progress_score === undefined || !blockers) {
    return res.status(400).json({ error: 'Missing required check-in fields: applicant_id, progress_score, and blockers are required.' });
  }

  const pScore = parseInt(progress_score);
  if (pScore < 1 || pScore > 10) {
    return res.status(400).json({ error: 'Weekly Check-in criteria error: Progress score must be an integer between 1 and 10.' });
  }

  try {
    const result = await query(
      `INSERT INTO team_checkins (cohort_id, applicant_id, logged_by, blockers, progress_score, mentor_notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [parseInt(id), parseInt(applicant_id), admin?.name || 'Staff Mentor', blockers.trim(), pScore, mentor_notes ? mentor_notes.trim() : '']
    );

    const checkin = result.rows[0];

    // Fetch applicant name for audit logging
    const appRes = await query('SELECT startup_name FROM applicants WHERE id = $1', [parseInt(applicant_id)]);
    const startupName = appRes.rows[0]?.startup_name || 'Startup';

    await logAudit(
      `Logged weekly team check-in for '${startupName}': Progress Score = ${pScore}/10`,
      'team_checkin',
      String(checkin.id),
      admin?.email || 'Admin',
      null,
      checkin
    );

    res.status(201).json({ success: true, checkin });
  } catch (err: any) {
    console.error('Failed to log check-in:', err);
    res.status(500).json({ error: 'Internal Server Error while saving check-in.' });
  }
};

// 7. PERFORMANCE WARNINGS
export const getCohortWarnings = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // cohort_id
  try {
    const result = await query(
      `SELECT * FROM performance_warnings WHERE cohort_id = $1 ORDER BY id DESC`,
      [parseInt(id)]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Failed to retrieve performance warnings:', err);
    res.status(500).json({ error: 'Failed to retrieve performance warnings.' });
  }
};

export const issuePerformanceWarning = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params; // cohort_id
  const { applicant_id, reason, severity, category } = req.body; // severity: 'YELLOW' | 'RED'

  if (!applicant_id || !reason || !severity) {
    return res.status(400).json({ error: 'Missing performance warning parameters: applicant_id, reason, and severity are required.' });
  }

  if (severity !== 'YELLOW' && severity !== 'RED') {
    return res.status(400).json({ error: "Invalid severity level: must be 'YELLOW' or 'RED'." });
  }

  try {
    const result = await query(
      `INSERT INTO performance_warnings (cohort_id, applicant_id, issued_by, reason, severity, status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE') RETURNING *`,
      [parseInt(id), parseInt(applicant_id), admin?.name || 'Staff Mentor', reason.trim(), severity]
    );

    const warning = result.rows[0];

    const appRes = await query('SELECT name, email, startup_name, tracking_token FROM applicants WHERE id = $1', [parseInt(applicant_id)]);
    const applicant = appRes.rows[0] || {};
    const startupName = applicant.startup_name || 'Startup';

    await logAudit(
      `ISSUED ${severity} PERFORMANCE WARNING to '${startupName}': Reason: ${reason}`,
      'performance_warning',
      String(warning.id),
      admin?.email || 'Admin',
      null,
      warning
    );

    // Send Warning Email Notification
    if (applicant.email) {
      try {
        await sendPerformanceWarningEmail({
          founderName: applicant.name || 'Founder',
          founderEmail: applicant.email,
          startupName,
          severity,
          category: category || 'Attendance & Program Compliance',
          reason: reason.trim(),
          issuedBy: admin?.name || 'Takhleeq Management',
          trackingToken: applicant.tracking_token
        });
      } catch (emailErr) {
        console.error('Failed to dispatch warning email:', emailErr);
      }
    }

    res.status(201).json({ success: true, warning });
  } catch (err: any) {
    console.error('Failed to issue warning:', err);
    res.status(500).json({ error: 'Internal Server Error while issuing warning.' });
  }
};

export const resolvePerformanceWarning = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params; // warning_id
  const { status, resolution_notes } = req.body; // status: 'RESOLVED' | 'REVOKED'

  if (!status || !resolution_notes) {
    return res.status(400).json({ error: 'Missing resolution fields: status (RESOLVED/REVOKED) and resolution_notes are required.' });
  }

  if (status !== 'RESOLVED' && status !== 'REVOKED') {
    return res.status(400).json({ error: "Invalid status: must be 'RESOLVED' or 'REVOKED'." });
  }

  try {
    const prevRes = await query('SELECT applicant_id, severity FROM performance_warnings WHERE id = $1', [parseInt(id)]);
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ error: 'Performance warning record not found.' });
    }
    const prev = prevRes.rows[0];

    const result = await query(
      `UPDATE performance_warnings SET status = $1, resolution_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [status, resolution_notes.trim(), parseInt(id)]
    );

    const updated = result.rows[0];

    const appRes = await query('SELECT name, email, startup_name FROM applicants WHERE id = $1', [prev.applicant_id]);
    const applicant = appRes.rows[0] || {};
    const startupName = applicant.startup_name || 'Startup';

    await logAudit(
      `RESOLVED performance warning for '${startupName}': Status set to ${status}. Notes: ${resolution_notes}`,
      'performance_warning_resolve',
      String(id),
      admin?.email || 'Admin',
      { previousStatus: 'ACTIVE', severity: prev.severity },
      updated
    );

    // Send Warning Resolution Email Notification
    if (applicant.email) {
      try {
        await sendWarningResolutionEmail({
          founderName: applicant.name || 'Founder',
          founderEmail: applicant.email,
          startupName,
          severity: prev.severity,
          status,
          resolutionNotes: resolution_notes.trim(),
          resolvedBy: admin?.name || 'Takhleeq Management'
        });
      } catch (emailErr) {
        console.error('Failed to dispatch warning resolution email:', emailErr);
      }
    }

    res.json({ success: true, warning: updated });
  } catch (err: any) {
    console.error('Failed to resolve warning:', err);
    res.status(500).json({ error: 'Failed to update warning resolution.' });
  }
};

// 7. FOUNDER SELF-SERVICE PORTAL ACCESS
export const getMyStartupDetails = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.currentUser || !req.currentUser.email) {
    return res.status(401).json({ error: 'Session unauthorized or missing email.' });
  }

  try {
    // 1. Fetch applicant record matching logged-in user email
    let applicantRes = await query(
      `SELECT * FROM applicants WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1`,
      [req.currentUser.email.trim()]
    );

    if (applicantRes.rows.length === 0) {
      // Fallback for Admins / Staff or users without explicit startup enrollment
      applicantRes = await query(`SELECT * FROM applicants ORDER BY id ASC LIMIT 1`);
    }

    if (applicantRes.rows.length === 0) {
      return res.json({
        success: true,
        applicant: null,
        cohort: null,
        sessions: [],
        attendance: [],
        checkins: [],
        warnings: []
      });
    }

    const applicant = applicantRes.rows[0];
    
    // Parse JSON arrays
    applicant.panel_scores = applicant.panel_scores && typeof applicant.panel_scores === 'string' ? JSON.parse(applicant.panel_scores) : applicant.panel_scores;
    applicant.form_data = applicant.form_data && typeof applicant.form_data === 'string' ? JSON.parse(applicant.form_data) : applicant.form_data;

    const cohortId = applicant.cohort_id;
    let cohort = null;
    let sessions = [];

    // 2. Fetch Cohort and Sessions if enrolled
    if (cohortId) {
      const cohortRes = await query(`SELECT * FROM cohorts WHERE id = $1`, [cohortId]);
      if (cohortRes.rows.length > 0) {
        cohort = cohortRes.rows[0];
      }

      const sessionsRes = await query(
        `SELECT * FROM cohort_sessions WHERE cohort_id = $1 ORDER BY date ASC, start_time ASC`,
        [cohortId]
      );
      
      sessions = await Promise.all(
        sessionsRes.rows.map(async (sess: any) => {
          const sessAsgsRes = await query(
            `SELECT * FROM assignments WHERE session_id = $1 ORDER BY created_at DESC`,
            [sess.id]
          );
          const sessionAssignments = await Promise.all(
            sessAsgsRes.rows.map(async (asg: any) => {
              const subRes = await query(
                `SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND applicant_id = $2`,
                [asg.id, applicant.id]
              );
              return {
                ...asg,
                submission: subRes.rows[0] || null
              };
            })
          );
          return {
            ...sess,
            assignments: sessionAssignments
          };
        })
      );
    }

    // 3. Fetch Attendance records
    const attendanceRes = await query(
      `SELECT * FROM session_attendance WHERE applicant_id = $1`,
      [applicant.id]
    );

    // 4. Fetch Assignments and founder's submissions
    let assignmentsList: any[] = [];
    const allAsgsRes = await query(
      `SELECT a.*, cs.title as session_title 
       FROM assignments a 
       LEFT JOIN cohort_sessions cs ON a.session_id = cs.id 
       WHERE ($1::integer IS NULL OR a.cohort_id = $1 OR a.cohort_id IS NULL)
       ORDER BY a.created_at DESC`,
      [cohortId]
    );

    for (const asg of allAsgsRes.rows) {
      const subRes = await query(
        `SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND applicant_id = $2`,
        [asg.id, applicant.id]
      );
      let sub = subRes.rows[0] || null;

      if (!sub) {
        try {
          const profileAsgs = applicant.form_data?.profile?.assignments || [];
          const found = profileAsgs.find((pa: any) => 
            String(pa.id) === String(asg.id) || 
            (pa.title && asg.title && pa.title.toLowerCase().trim() === asg.title.toLowerCase().trim())
          );
          if (found && (found.status === 'SUBMITTED' || found.fileName)) {
            sub = {
              id: 0,
              assignment_id: asg.id,
              applicant_id: applicant.id,
              file_url: found.fileName,
              submitted_at: found.uploadedAt || new Date().toISOString(),
              created_at: found.uploadedAt || new Date().toISOString()
            };
          }
        } catch (e) {
          // ignore
        }
      }

      assignmentsList.push({
        ...asg,
        sessionTitle: asg.session_title,
        submission: sub
      });
    }

    // 5. Fetch Weekly Team Check-ins
    const checkinsRes = await query(
      `SELECT * FROM team_checkins WHERE applicant_id = $1 ORDER BY created_at DESC`,
      [applicant.id]
    );

    // 6. Fetch Performance Warnings
    const warningsRes = await query(
      `SELECT * FROM performance_warnings WHERE applicant_id = $1 ORDER BY created_at DESC`,
      [applicant.id]
    );

    // 7. Sync & Merge linked startup_profile data
    const spRes = await query(
      `SELECT * FROM startup_profiles WHERE applicant_id = $1 OR LOWER(founder_email) = LOWER($2) LIMIT 1`,
      [applicant.id, applicant.email]
    );

    if (spRes.rows.length > 0) {
      const sp = spRes.rows[0];
      applicant.startup_profile_id = sp.id;
      if (sp.startup_name) applicant.startup_name = sp.startup_name;
      if (sp.description) applicant.startup_description = sp.description;
      if (sp.program_status) applicant.program_status = sp.program_status;
      if (sp.current_progress_stage) applicant.stage = sp.current_progress_stage;

      applicant.form_data = applicant.form_data || {};
      applicant.form_data.profile = applicant.form_data.profile || {};
      
      applicant.form_data.profile.website = sp.website || applicant.form_data.profile.website || '';
      applicant.form_data.profile.revenue_status = sp.revenue_status || applicant.form_data.profile.revenue_status || 'PRE_REVENUE';
      applicant.form_data.profile.monthly_revenue = sp.monthly_revenue || applicant.form_data.profile.monthly_revenue || '0';
      applicant.form_data.profile.annual_recurring_revenue = sp.annual_recurring_revenue || applicant.form_data.profile.annual_recurring_revenue || '0';
      applicant.form_data.profile.funding_status = sp.funding_status || applicant.form_data.profile.funding_status || 'BOOTSTRAPPED';
      applicant.form_data.profile.funding_raised = sp.funding_raised || applicant.form_data.profile.funding_raised || '0';
      applicant.form_data.profile.burn_rate = sp.burn_rate || applicant.form_data.profile.burn_rate || '0';
      applicant.form_data.profile.team_size = String(sp.team_size || applicant.form_data.profile.team_size || '1');
      applicant.form_data.profile.pitch_deck_url = sp.pitch_deck_url || applicant.form_data.profile.pitch_deck_url || '';
    }

    res.json({
      success: true,
      applicant,
      cohort,
      sessions,
      attendance: attendanceRes.rows,
      assignments: assignmentsList,
      checkins: checkinsRes.rows,
      warnings: warningsRes.rows
    });
  } catch (err: any) {
    console.error('Failed to retrieve founder self-service data:', err);
    res.status(500).json({ error: 'Internal Server Error while compiling self-service data.' });
  }
};

export const updateApplicantProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { 
    phone, website, social_links, logo_description, description, logo_url, contact_info, pivot_history,
    monthly_revenue, annual_recurring_revenue, revenue_status, funding_status, funding_raised, burn_rate, team_size, pitch_deck_url,
    linkedin_url, twitter_url, github_url, instagram_url,
    assignments, team_roster, shared_notes, notifications
  } = req.body;

  try {
    const targetId = parseInt(id) || 1;
    let appRes = await query('SELECT id, email, phone, form_data FROM applicants WHERE id = $1', [targetId]);
    if (appRes.rows.length === 0) {
      // Fallback to first applicant if specific ID is missing
      appRes = await query('SELECT id, email, phone, form_data FROM applicants ORDER BY id ASC LIMIT 1');
    }

    if (appRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Applicant not found.'
      });
    }

    const appRecord = appRes.rows[0];

    if (req.currentUser.role !== 'Administrator' && appRecord.email && appRecord.email.toLowerCase() !== req.currentUser.email.toLowerCase()) {
      return res.status(403).json({ error: 'Access Denied: You cannot modify profiles of other startup teams.' });
    }

    const currentFormData = appRecord.form_data ? (typeof appRecord.form_data === 'string' ? JSON.parse(appRecord.form_data) : appRecord.form_data) : {};
    
    // Merge profile fields into form_data
    const updatedFormData = {
      ...currentFormData,
      profile: {
        ...(currentFormData.profile || {}),
        website: website !== undefined ? website?.trim() : (currentFormData.profile?.website || ''),
        social_links: social_links !== undefined ? social_links?.trim() : (currentFormData.profile?.social_links || ''),
        logo_description: logo_description !== undefined ? logo_description?.trim() : (currentFormData.profile?.logo_description || ''),
        logo_url: logo_url !== undefined ? logo_url?.trim() : (currentFormData.profile?.logo_url || ''),
        contact_info: contact_info !== undefined ? contact_info?.trim() : (currentFormData.profile?.contact_info || ''),
        pivot_history: pivot_history !== undefined ? pivot_history : (currentFormData.profile?.pivot_history || []),
        // Financial & Metrics fields aligned with Admin Panel
        revenue_status: revenue_status !== undefined ? revenue_status : (currentFormData.profile?.revenue_status || 'PRE_REVENUE'),
        monthly_revenue: monthly_revenue !== undefined ? monthly_revenue : (currentFormData.profile?.monthly_revenue || '0'),
        annual_recurring_revenue: annual_recurring_revenue !== undefined ? annual_recurring_revenue : (currentFormData.profile?.annual_recurring_revenue || '0'),
        funding_status: funding_status !== undefined ? funding_status : (currentFormData.profile?.funding_status || 'BOOTSTRAPPED'),
        funding_raised: funding_raised !== undefined ? funding_raised : (currentFormData.profile?.funding_raised || '0'),
        burn_rate: burn_rate !== undefined ? burn_rate : (currentFormData.profile?.burn_rate || '0'),
        team_size: team_size !== undefined ? team_size : (currentFormData.profile?.team_size || '1'),
        pitch_deck_url: pitch_deck_url !== undefined ? pitch_deck_url?.trim() : (currentFormData.profile?.pitch_deck_url || ''),
        // Detailed Social Handles
        linkedin_url: linkedin_url !== undefined ? linkedin_url?.trim() : (currentFormData.profile?.linkedin_url || ''),
        twitter_url: twitter_url !== undefined ? twitter_url?.trim() : (currentFormData.profile?.twitter_url || ''),
        github_url: github_url !== undefined ? github_url?.trim() : (currentFormData.profile?.github_url || ''),
        instagram_url: instagram_url !== undefined ? instagram_url?.trim() : (currentFormData.profile?.instagram_url || ''),
        // Assignments, Roster & Notes
        assignments: assignments !== undefined ? assignments : (currentFormData.profile?.assignments || []),
        team_roster: team_roster !== undefined ? team_roster : (currentFormData.profile?.team_roster || []),
        shared_notes: shared_notes !== undefined ? shared_notes : (currentFormData.profile?.shared_notes || []),
        notifications: notifications !== undefined ? notifications : (currentFormData.profile?.notifications || []),
      }
    };

    const finalPhone = phone !== undefined ? phone.trim() : appRecord.phone;
    const finalDesc = description !== undefined ? description.trim() : null;

    let result;
    if (finalDesc !== null) {
      result = await query(
        `UPDATE applicants SET phone = $1, startup_description = $2, form_data = $3 WHERE id = $4 RETURNING *`,
        [finalPhone, finalDesc, JSON.stringify(updatedFormData), appRecord.id]
      );
    } else {
      result = await query(
        `UPDATE applicants SET phone = $1, form_data = $2 WHERE id = $3 RETURNING *`,
        [finalPhone, JSON.stringify(updatedFormData), appRecord.id]
      );
    }

    // Sync directly with startup_profiles table if linked profile exists
    try {
      await query(`
        UPDATE startup_profiles
        SET
          description = COALESCE($1, description),
          website = COALESCE($2, website),
          revenue_status = COALESCE($3, revenue_status),
          monthly_revenue = COALESCE($4, monthly_revenue),
          annual_recurring_revenue = COALESCE($5, annual_recurring_revenue),
          funding_status = COALESCE($6, funding_status),
          funding_raised = COALESCE($7, funding_raised),
          burn_rate = COALESCE($8, burn_rate),
          team_size = COALESCE($9, team_size),
          pitch_deck_url = COALESCE($10, pitch_deck_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE applicant_id = $11 OR LOWER(founder_email) = LOWER($12)
      `, [
        finalDesc,
        website !== undefined ? website : null,
        revenue_status !== undefined ? revenue_status : null,
        monthly_revenue !== undefined ? monthly_revenue : null,
        annual_recurring_revenue !== undefined ? annual_recurring_revenue : null,
        funding_status !== undefined ? funding_status : null,
        funding_raised !== undefined ? funding_raised : null,
        burn_rate !== undefined ? burn_rate : null,
        team_size !== undefined ? (parseInt(team_size) || 1) : null,
        pitch_deck_url !== undefined ? pitch_deck_url : null,
        appRecord.id,
        appRecord.email
      ]);
    } catch (spSyncErr) {
      console.warn('Non-blocking startup_profiles sync warning:', spSyncErr);
    }

    const updatedApplicant = result.rows[0];
    updatedApplicant.panel_scores = updatedApplicant.panel_scores && typeof updatedApplicant.panel_scores === 'string' ? JSON.parse(updatedApplicant.panel_scores) : updatedApplicant.panel_scores;
    updatedApplicant.form_data = updatedApplicant.form_data && typeof updatedApplicant.form_data === 'string' ? JSON.parse(updatedApplicant.form_data) : updatedApplicant.form_data;

    res.json({ success: true, applicant: updatedApplicant });
  } catch (err: any) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ error: 'Failed to save self-service profile edits.' });
  }
};

// --- COHORT FEEDBACK SYSTEM CONTROLLER ---
export const submitCohortFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      cohort_id,
      session_id,
      feedback_type = 'PROGRAM',
      rating,
      title,
      comment,
      is_anonymous = false
    } = req.body;

    if (!rating || parseInt(rating) < 1 || parseInt(rating) > 5) {
      return res.status(400).json({ error: 'Valid rating between 1 and 5 stars is required.' });
    }

    const userId = req.currentUser?.id || null;
    const founderName = (req.currentUser as any)?.name || (req.currentUser as any)?.full_name || 'Cohort Founder';

    let startupName = 'Cohort Startup';
    let applicantId = null;

    if (req.currentUser?.email) {
      const appRes = await query(
        `SELECT id, startup_name FROM applicants WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1`,
        [req.currentUser.email]
      );
      if (appRes.rows.length > 0) {
        applicantId = appRes.rows[0].id;
        startupName = appRes.rows[0].startup_name || startupName;
      }
    }

    const isAnonBool = is_anonymous === true || is_anonymous === 'true';

    const insertRes = await query(
      `INSERT INTO cohort_feedback 
       (cohort_id, session_id, user_id, applicant_id, founder_name, startup_name, feedback_type, rating, title, comment, is_anonymous, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'SUBMITTED')
       RETURNING *`,
      [
        cohort_id ? parseInt(cohort_id) : null,
        session_id ? parseInt(session_id) : null,
        userId,
        applicantId,
        isAnonBool ? 'Anonymous Founder' : founderName,
        isAnonBool ? 'Anonymous Startup' : startupName,
        feedback_type,
        parseInt(rating),
        title ? title.trim() : null,
        comment ? comment.trim() : null,
        isAnonBool
      ]
    );

    const feedback = insertRes.rows[0];

    const returnedFeedback = isAnonBool ? {
      ...feedback,
      founder_name: 'Anonymous Founder',
      startup_name: 'Anonymous Startup',
      user_id: null,
      applicant_id: null
    } : feedback;

    res.json({
      success: true,
      message: isAnonBool 
        ? 'Anonymous feedback submitted successfully. Your identity is protected.' 
        : 'Feedback submitted successfully.',
      feedback: returnedFeedback
    });
  } catch (err) {
    console.error('Failed to submit cohort feedback:', err);
    res.status(500).json({ error: 'Failed to record feedback.' });
  }
};

export const getCohortFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { cohort_id, session_id, feedback_type } = req.query;

    let sql = `SELECT * FROM cohort_feedback WHERE 1=1`;
    const params: any[] = [];

    if (cohort_id) {
      params.push(parseInt(cohort_id as string));
      sql += ` AND cohort_id = $${params.length}`;
    }

    if (session_id) {
      params.push(parseInt(session_id as string));
      sql += ` AND session_id = $${params.length}`;
    }

    if (feedback_type) {
      params.push(feedback_type);
      sql += ` AND feedback_type = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const feedRes = await query(sql, params);

    const rows = feedRes.rows.map((f: any) => {
      const isAnon = f.is_anonymous === true || f.is_anonymous === 'true';
      if (isAnon) {
        return {
          ...f,
          founder_name: 'Anonymous Founder',
          startup_name: 'Anonymous Startup',
          user_id: null,
          applicant_id: null
        };
      }
      return f;
    });

    res.json(rows);
  } catch (err) {
    console.error('Failed to retrieve cohort feedback:', err);
    res.status(500).json({ error: 'Failed to retrieve feedback logs.' });
  }
};

export const updateCohortFeedbackStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, staff_response } = req.body;

    const targetId = parseInt(id);
    const updateRes = await query(
      `UPDATE cohort_feedback SET status = $1, staff_response = $2 WHERE id = $3 RETURNING *`,
      [status || 'REVIEWED', staff_response || null, targetId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback record not found.' });
    }

    const item = updateRes.rows[0];
    if (item.is_anonymous) {
      item.founder_name = 'Anonymous Founder';
      item.startup_name = 'Anonymous Startup';
      item.user_id = null;
      item.applicant_id = null;
    }

    res.json({
      success: true,
      feedback: item
    });
  } catch (err) {
    console.error('Failed to update feedback status:', err);
    res.status(500).json({ error: 'Failed to update feedback status.' });
  }
};

export const deleteCohortFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id);
    await query(`DELETE FROM cohort_feedback WHERE id = $1`, [targetId]);
    res.json({ success: true, message: 'Feedback deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete feedback:', err);
    res.status(500).json({ error: 'Failed to delete feedback.' });
  }
};

// --- DEDICATED SESSION FEEDBACK & 7-DAY WINDOW MODULE ---

export const getSessionFeedback = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // session_id
  const sessId = parseInt(id);

  try {
    const sessRes = await query('SELECT * FROM cohort_sessions WHERE id = $1', [sessId]);
    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const session = sessRes.rows[0];

    // Total startups count in this cohort
    const appCountRes = await query(
      `SELECT COUNT(*) as total FROM applicants WHERE cohort_id = $1 OR status = 'CONFIRMED'`,
      [session.cohort_id]
    );
    const totalStartups = parseInt(appCountRes.rows[0]?.total || '0', 10);

    // Fetch all feedbacks for this session
    const feedRes = await query(
      'SELECT * FROM cohort_feedback WHERE session_id = $1 ORDER BY created_at DESC',
      [sessId]
    );
    const rawFeedbacks = feedRes.rows || [];

    // Current user's applicant ID
    let currentApplicantId: number | null = null;
    const currentUserId = req.currentUser?.id || null;
    if (req.currentUser?.email) {
      const appRes = await query(
        `SELECT id FROM applicants WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1`,
        [req.currentUser.email.trim()]
      );
      if (appRes.rows.length > 0) {
        currentApplicantId = appRes.rows[0].id;
      }
    }

    // Check if current user/applicant has submitted
    let currentUserSubmitted = false;
    let currentUserFeedback: any = null;
    if (currentApplicantId || currentUserId) {
      const userFeed = rawFeedbacks.find((f: any) => 
        (currentApplicantId && f.applicant_id === currentApplicantId) ||
        (currentUserId && f.user_id === currentUserId)
      );
      if (userFeed) {
        currentUserSubmitted = true;
        currentUserFeedback = userFeed;
      }
    }

    // Calculate ratings
    const totalSubmissions = rawFeedbacks.length;
    let ratingSum = 0;
    const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    const sanitizedFeedbacks = rawFeedbacks.map((f: any) => {
      const r = parseInt(f.rating) || 5;
      ratingSum += r;
      if (ratingBreakdown[r] !== undefined) {
        ratingBreakdown[r]++;
      }
      const isAnon = f.is_anonymous === true || f.is_anonymous === 'true';
      return {
        ...f,
        rating: r,
        founder_name: isAnon ? 'Anonymous Founder' : (f.founder_name || 'Cohort Founder'),
        startup_name: isAnon ? 'Anonymous Startup' : (f.startup_name || 'Cohort Startup'),
        user_id: isAnon ? null : f.user_id,
        applicant_id: isAnon ? null : f.applicant_id
      };
    });

    const averageRating = totalSubmissions > 0 ? Number((ratingSum / totalSubmissions).toFixed(1)) : 0;

    // Calculate timing window (Opens after session date, closes after 7 days)
    const todayStr = getTodayDateStringServer();
    const sessDate = session.date || '';
    let feedbackStatus: 'UPCOMING' | 'ACTIVE' | 'EXPIRED' = 'UPCOMING';
    let daysRemaining = 0;
    let windowOpensDate = sessDate;
    let windowClosesDate = sessDate;

    if (sessDate) {
      const dSess = new Date(sessDate);
      const dCloses = new Date(sessDate);
      dCloses.setDate(dCloses.getDate() + 7);
      windowClosesDate = dCloses.toISOString().split('T')[0];

      if (todayStr < sessDate) {
        feedbackStatus = 'UPCOMING';
        daysRemaining = 0;
      } else {
        const dToday = new Date(todayStr);
        const diffDays = Math.floor((dToday.getTime() - dSess.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 7) {
          feedbackStatus = 'ACTIVE';
          daysRemaining = Math.max(0, 7 - diffDays);
        } else {
          feedbackStatus = 'EXPIRED';
          daysRemaining = 0;
        }
      }
    }

    res.json({
      success: true,
      session_id: session.id,
      session_title: session.title,
      session_date: session.date,
      start_time: session.start_time,
      end_time: session.end_time,
      mentor_name: session.mentor_name,
      cohort_id: session.cohort_id,
      total_startups: totalStartups,
      total_submissions: totalSubmissions,
      average_rating: averageRating,
      rating_breakdown: ratingBreakdown,
      feedback_status: feedbackStatus,
      days_remaining: daysRemaining,
      window_opens_date: windowOpensDate,
      window_closes_date: windowClosesDate,
      current_user_submitted: currentUserSubmitted,
      current_user_feedback: currentUserFeedback,
      feedbacks: sanitizedFeedbacks
    });
  } catch (err: any) {
    console.error('Failed to get session feedback:', err);
    res.status(500).json({ error: 'Failed to retrieve session feedback.' });
  }
};

export const submitSessionFeedback = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // session_id
  const sessId = parseInt(id);
  const { rating, title, comment, is_anonymous } = req.body;

  if (!rating || parseInt(rating) < 1 || parseInt(rating) > 5) {
    return res.status(400).json({ error: 'Valid rating between 1 and 5 stars is required.' });
  }

  try {
    const sessRes = await query('SELECT * FROM cohort_sessions WHERE id = $1', [sessId]);
    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const session = sessRes.rows[0];

    // Validate date window (Opens on/after session date, closes after 7 days)
    const todayStr = getTodayDateStringServer();
    const sessDate = session.date || '';

    if (sessDate && todayStr < sessDate) {
      return res.status(400).json({ 
        error: `Session feedback is not open yet. Feedback will become available once the session is conducted on ${sessDate}.` 
      });
    }

    if (sessDate) {
      const dSess = new Date(sessDate);
      const dToday = new Date(todayStr);
      const diffDays = Math.floor((dToday.getTime() - dSess.getTime()) / (1000 * 3600 * 24));
      if (diffDays > 7) {
        return res.status(400).json({ 
          error: 'The 7-day feedback window for this session has expired. Feedback can only be submitted within 7 days of the session date.' 
        });
      }
    }

    const userId = req.currentUser?.id || null;
    const founderName = (req.currentUser as any)?.name || (req.currentUser as any)?.full_name || 'Cohort Founder';
    let startupName = 'Cohort Startup';
    let applicantId: number | null = null;

    if (req.currentUser?.email) {
      const appRes = await query(
        `SELECT id, startup_name FROM applicants WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1`,
        [req.currentUser.email.trim()]
      );
      if (appRes.rows.length > 0) {
        applicantId = appRes.rows[0].id;
        startupName = appRes.rows[0].startup_name || startupName;
      }
    }

    const isAnonBool = is_anonymous === true || is_anonymous === 'true';

    // Check if feedback already exists for this session & user/applicant to update rather than duplicate
    const existing = await query(
      `SELECT id FROM cohort_feedback WHERE session_id = $1 AND (applicant_id = $2 OR (user_id = $3 AND user_id IS NOT NULL))`,
      [sessId, applicantId || 0, userId || 0]
    );

    let feedbackRecord;
    if (existing.rows && existing.rows.length > 0) {
      const existingId = existing.rows[0].id;
      const updateRes = await query(
        `UPDATE cohort_feedback 
         SET rating = $1, title = $2, comment = $3, is_anonymous = $4, founder_name = $5, startup_name = $6, status = 'SUBMITTED'
         WHERE id = $7
         RETURNING *`,
        [
          parseInt(rating),
          title ? title.trim() : null,
          comment ? comment.trim() : null,
          isAnonBool,
          isAnonBool ? 'Anonymous Founder' : founderName,
          isAnonBool ? 'Anonymous Startup' : startupName,
          existingId
        ]
      );
      feedbackRecord = updateRes.rows[0];
    } else {
      const insertRes = await query(
        `INSERT INTO cohort_feedback 
         (cohort_id, session_id, user_id, applicant_id, founder_name, startup_name, feedback_type, rating, title, comment, is_anonymous, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'SESSION', $7, $8, $9, $10, 'SUBMITTED')
         RETURNING *`,
        [
          session.cohort_id,
          sessId,
          userId,
          applicantId,
          isAnonBool ? 'Anonymous Founder' : founderName,
          isAnonBool ? 'Anonymous Startup' : startupName,
          parseInt(rating),
          title ? title.trim() : null,
          comment ? comment.trim() : null,
          isAnonBool
        ]
      );
      feedbackRecord = insertRes.rows[0];
    }

    res.json({
      success: true,
      message: isAnonBool 
        ? 'Anonymous session feedback recorded securely! Your identity is protected.' 
        : 'Session feedback submitted successfully. Thank you for your feedback!',
      feedback: feedbackRecord
    });
  } catch (err: any) {
    console.error('Failed to submit session feedback:', err);
    res.status(500).json({ error: 'Failed to record session feedback.' });
  }
};

// ==========================================
// 8. GENERALIZED COHORT FEEDBACK FORMS MODULE
// ==========================================

export const createFeedbackForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cohortIdParam = req.params.cohortId || req.body.cohort_id;
    const cohortId = parseInt(cohortIdParam) || 1;
    const { title, description, is_anonymous, expiry_date, session_id, questions } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Form title is required.' });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one feedback question is required.' });
    }

    const createdBy = req.currentUser?.id || null;
    const isAnon = is_anonymous === true || is_anonymous === 'true';
    const sessId = session_id && !isNaN(parseInt(session_id)) ? parseInt(session_id) : null;
    const expiryDateStr = expiry_date && String(expiry_date).trim() ? String(expiry_date).trim() : null;

    // 1. Insert Feedback Form
    const formRes = await query(
      `INSERT INTO feedback_forms (cohort_id, title, description, is_anonymous, created_by, expiry_date, status, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7)
       RETURNING *`,
      [cohortId, title.trim(), description?.trim() || null, isAnon, createdBy, expiryDateStr, sessId]
    );

    const newForm = formRes.rows[0];
    const createdQuestions = [];

    // 2. Insert Questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text || !q.question_text.trim()) continue;
      const qType = ['rating_1_10', 'short_text', 'long_text'].includes(q.question_type) ? q.question_type : 'rating_1_10';
      const qOrder = typeof q.question_order === 'number' ? q.question_order : i + 1;

      const qRes = await query(
        `INSERT INTO feedback_questions (feedback_form_id, question_text, question_type, question_order)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [newForm.id, q.question_text.trim(), qType, qOrder]
      );
      createdQuestions.push(qRes.rows[0]);
    }

    res.status(201).json({
      success: true,
      form: {
        ...newForm,
        questions: createdQuestions
      }
    });
  } catch (err: any) {
    console.error('Failed to create feedback form:', err);
    res.status(500).json({ error: err.message || 'Failed to create feedback form.' });
  }
};

export const getFeedbackForms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cohortIdParam = req.params.cohortId || req.query.cohort_id;
    const cohortId = cohortIdParam && !isNaN(parseInt(cohortIdParam as string)) ? parseInt(cohortIdParam as string) : null;

    let formsSql = `SELECT ff.* FROM feedback_forms ff`;
    const params: any[] = [];
    if (cohortId) {
      params.push(cohortId);
      formsSql += ` WHERE ff.cohort_id = $1`;
    }
    formsSql += ` ORDER BY ff.created_at DESC`;

    const formsRes = await query(formsSql, params);
    const forms = formsRes.rows;

    // Resolve user's applicant ID if founder is requesting
    let currentApplicantId: number | null = null;
    if (req.currentUser?.email) {
      const appRes = await query(
        `SELECT id FROM applicants WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1`,
        [req.currentUser.email.trim()]
      );
      if (appRes.rows.length > 0) {
        currentApplicantId = appRes.rows[0].id;
      }
    }
    if (!currentApplicantId && req.currentUser?.id) {
      const appRes = await query(
        `SELECT id FROM applicants WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
        [req.currentUser.id]
      );
      if (appRes.rows.length > 0) {
        currentApplicantId = appRes.rows[0].id;
      }
    }
    if (!currentApplicantId) {
      const appRes = await query(`SELECT id FROM applicants ORDER BY id ASC LIMIT 1`);
      currentApplicantId = appRes.rows[0]?.id || 1;
    }

    const currentUserId = req.currentUser?.id || 0;

    const detailedForms = await Promise.all(
      forms.map(async (form: any) => {
        // Fetch questions
        const qRes = await query(
          `SELECT * FROM feedback_questions WHERE feedback_form_id = $1 ORDER BY question_order ASC, id ASC`,
          [form.id]
        );

        // Fetch response count (unique startups)
        const respRes = await query(
          `SELECT DISTINCT startup_id FROM feedback_responses WHERE feedback_form_id = $1`,
          [form.id]
        );
        const uniqueSubmissionsCount = respRes.rows.length;

        // Fetch total cohort startups
        const cohortAppRes = await query(
          `SELECT COUNT(*) as total FROM applicants WHERE cohort_id = $1`,
          [form.cohort_id]
        );
        const totalStartups = parseInt(cohortAppRes.rows[0]?.total || '0', 10);
        const completionRate = totalStartups > 0 ? Math.round((uniqueSubmissionsCount / totalStartups) * 100) : 0;

        // Check if current applicant or user submitted
        let hasSubmitted = false;
        if (currentApplicantId) {
          const userSubRes = await query(
            `SELECT id FROM feedback_responses WHERE feedback_form_id = $1 AND (startup_id = $2 OR user_id = $3) LIMIT 1`,
            [form.id, currentApplicantId, currentUserId]
          );
          hasSubmitted = userSubRes.rows.length > 0;
        }

        return {
          ...form,
          questions: qRes.rows,
          response_count: uniqueSubmissionsCount,
          total_startups: totalStartups,
          completion_rate: completionRate,
          has_submitted: hasSubmitted,
          user_submitted: hasSubmitted
        };
      })
    );

    res.json({
      success: true,
      forms: detailedForms
    });
  } catch (err: any) {
    console.error('Failed to get feedback forms:', err);
    res.status(500).json({ error: err.message || 'Failed to get feedback forms.' });
  }
};

export const getPendingFeedbackForms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.currentUser?.email) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // 1. Resolve logged in founder's applicant record
    let applicantRes = await query(
      `SELECT * FROM applicants WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1`,
      [req.currentUser.email.trim()]
    );

    if (applicantRes.rows.length === 0) {
      // Fallback for demo/admin testing
      applicantRes = await query(`SELECT * FROM applicants ORDER BY id ASC LIMIT 1`);
    }

    if (applicantRes.rows.length === 0) {
      return res.json({ success: true, pendingForms: [] });
    }

    const applicant = applicantRes.rows[0];
    const cohortId = applicant.cohort_id || parseInt(req.params.cohortId) || 1;

    // 2. Fetch Active forms for this cohort
    const formsRes = await query(
      `SELECT * FROM feedback_forms WHERE cohort_id = $1 AND status = 'Active' ORDER BY created_at DESC`,
      [cohortId]
    );

    const activeForms = formsRes.rows;
    const pendingForms = [];

    const currentUserId = req.currentUser?.id || 0;

    for (const form of activeForms) {
      // Check if this startup already submitted any response for this form
      const subCheck = await query(
        `SELECT id FROM feedback_responses WHERE feedback_form_id = $1 AND (startup_id = $2 OR user_id = $3) LIMIT 1`,
        [form.id, applicant.id, currentUserId]
      );

      if (subCheck.rows.length === 0) {
        // Not submitted yet! Attach questions
        const qRes = await query(
          `SELECT * FROM feedback_questions WHERE feedback_form_id = $1 ORDER BY question_order ASC, id ASC`,
          [form.id]
        );
        pendingForms.push({
          ...form,
          questions: qRes.rows
        });
      }
    }

    res.json({
      success: true,
      pendingForms,
      startup_name: applicant.startup_name,
      applicant_id: applicant.id
    });
  } catch (err: any) {
    console.error('Failed to get pending feedback forms:', err);
    res.status(500).json({ error: err.message || 'Failed to get pending feedback forms.' });
  }
};

export const submitFeedbackFormResponse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const formId = parseInt(req.params.id);
    const rawResponses = req.body.responses || req.body.answers || (Array.isArray(req.body) ? req.body : []);

    if (!rawResponses || !Array.isArray(rawResponses) || rawResponses.length === 0) {
      return res.status(400).json({ error: 'Responses are required.' });
    }

    const responses = rawResponses;

    // 1. Verify form exists and is active
    const formRes = await query(`SELECT * FROM feedback_forms WHERE id = $1`, [formId]);
    if (formRes.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback form not found.' });
    }
    const form = formRes.rows[0];
    if (form.status === 'Closed') {
      return res.status(400).json({ error: 'This feedback form is currently closed for responses.' });
    }

    // 2. Resolve Startup/Applicant ID
    let applicantId: number | null = null;
    if (req.currentUser?.email) {
      const appRes = await query(
        `SELECT id FROM applicants WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1`,
        [req.currentUser.email.trim()]
      );
      if (appRes.rows.length > 0) {
        applicantId = appRes.rows[0].id;
      }
    }

    if (!applicantId) {
      // Fallback
      const appRes = await query(`SELECT id FROM applicants ORDER BY id ASC LIMIT 1`);
      applicantId = appRes.rows[0]?.id || 1;
    }

    const userId = req.currentUser?.id || null;

    // 3. Prevent duplicate or overwrite responses
    // Delete any previous responses by this startup for this form
    await query(
      `DELETE FROM feedback_responses WHERE feedback_form_id = $1 AND startup_id = $2`,
      [formId, applicantId]
    );

    // 4. Batch insert response answers (startup_id ALWAYS stored in DB for audit trail/abuse prevention)
    for (const r of responses) {
      if (r.question_id && r.answer_value !== undefined && r.answer_value !== null) {
        await query(
          `INSERT INTO feedback_responses (feedback_form_id, question_id, startup_id, user_id, answer_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [formId, parseInt(r.question_id), applicantId, userId, String(r.answer_value)]
        );
      }
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully. Thank you for your feedback!'
    });
  } catch (err: any) {
    console.error('Failed to submit feedback response:', err);
    res.status(500).json({ error: err.message || 'Failed to submit feedback response.' });
  }
};

export const getFeedbackFormResponses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const formId = parseInt(req.params.id);

    // 1. Fetch Form
    const formRes = await query(`SELECT * FROM feedback_forms WHERE id = $1`, [formId]);
    if (formRes.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback form not found.' });
    }
    const form = formRes.rows[0];
    const isAnon = form.is_anonymous === true || form.is_anonymous === 'true';

    // 2. Fetch Questions
    const qRes = await query(
      `SELECT * FROM feedback_questions WHERE feedback_form_id = $1 ORDER BY question_order ASC, id ASC`,
      [formId]
    );
    const questions = qRes.rows;

    // 3. Fetch Responses from database
    const respRes = await query(
      `SELECT * FROM feedback_responses WHERE feedback_form_id = $1 ORDER BY submitted_at ASC`,
      [formId]
    );
    const rawResponses = respRes.rows;

    // 4. Fetch applicants map for non-anonymous resolution
    const applicantsRes = await query(`SELECT id, name, startup_name FROM applicants WHERE cohort_id = $1`, [form.cohort_id]);
    const applicantsMap = new Map<number, { name: string; startup_name: string }>();
    applicantsRes.rows.forEach((a: any) => {
      applicantsMap.set(a.id, { name: a.name, startup_name: a.startup_name });
    });

    // Unique startups count who submitted
    const uniqueStartupIds = new Set<number>();
    rawResponses.forEach((r: any) => uniqueStartupIds.add(r.startup_id));
    const submittedCount = uniqueStartupIds.size;
    const totalStartups = applicantsRes.rows.length;
    const completionRate = totalStartups > 0 ? Math.round((submittedCount / totalStartups) * 100) : 0;

    // 5. Build question-by-question analytics
    // CRITICAL: STRICT ANONYMITY ENFORCEMENT AT API LEVEL
    // If is_anonymous = true, startup_id, user_id, startup_name, and founder_name MUST NOT be in the payload.
    const questionsAnalytics = questions.map((q: any) => {
      const qResponses = rawResponses.filter((r: any) => r.question_id === q.id);

      let averageRating: number | undefined = undefined;
      const ratingDistribution: Record<number, number> = {};

      if (q.question_type === 'rating_1_10') {
        for (let score = 1; score <= 10; score++) {
          ratingDistribution[score] = 0;
        }
        let sum = 0;
        let validCount = 0;
        qResponses.forEach((r: any) => {
          const num = parseInt(r.answer_value, 10);
          if (!isNaN(num) && num >= 1 && num <= 10) {
            sum += num;
            validCount++;
            ratingDistribution[num] = (ratingDistribution[num] || 0) + 1;
          }
        });
        if (validCount > 0) {
          averageRating = parseFloat((sum / validCount).toFixed(1));
        }
      }

      // Format answers based on anonymity flag
      const formattedAnswers = qResponses.map((r: any) => {
        if (isAnon) {
          // STRICT ANONYMITY: Omit ALL identifying keys completely
          return {
            id: r.id,
            answer_value: r.answer_value,
            submitted_at: r.submitted_at
          };
        } else {
          // Non-anonymous: attach founder and startup names
          const app = applicantsMap.get(r.startup_id);
          return {
            id: r.id,
            startup_id: r.startup_id,
            startup_name: app ? app.startup_name : `Startup #${r.startup_id}`,
            founder_name: app ? app.name : 'Founder',
            answer_value: r.answer_value,
            submitted_at: r.submitted_at
          };
        }
      });

      return {
        question: q,
        average_rating: averageRating,
        rating_distribution: q.question_type === 'rating_1_10' ? ratingDistribution : undefined,
        answers: formattedAnswers
      };
    });

    // Strip any identifying metadata from the returned form object if anonymous
    const sanitizedForm = {
      ...form,
      is_anonymous: isAnon,
      response_count: submittedCount,
      total_startups: totalStartups,
      completion_rate: completionRate
    };

    res.json({
      success: true,
      analytics: {
        form: sanitizedForm,
        total_cohort_startups: totalStartups,
        submitted_startups_count: submittedCount,
        completion_rate_percent: completionRate,
        questions_analytics: questionsAnalytics
      }
    });
  } catch (err: any) {
    console.error('Failed to get feedback form responses:', err);
    res.status(500).json({ error: err.message || 'Failed to get feedback form responses.' });
  }
};

export const updateFeedbackFormStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const formId = parseInt(req.params.id);
    const { status, title, description, expiry_date } = req.body;

    const existingRes = await query(`SELECT * FROM feedback_forms WHERE id = $1`, [formId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback form not found.' });
    }

    const current = existingRes.rows[0];
    const newStatus = status || current.status;
    const newTitle = title !== undefined ? title : current.title;
    const newDesc = description !== undefined ? description : current.description;
    const newExpiry = expiry_date !== undefined ? expiry_date : current.expiry_date;

    const updatedRes = await query(
      `UPDATE feedback_forms 
       SET status = $1, title = $2, description = $3, expiry_date = $4 
       WHERE id = $5 
       RETURNING *`,
      [newStatus, newTitle, newDesc, newExpiry, formId]
    );

    res.json({
      success: true,
      form: updatedRes.rows[0]
    });
  } catch (err: any) {
    console.error('Failed to update feedback form:', err);
    res.status(500).json({ error: err.message || 'Failed to update feedback form.' });
  }
};

export const deleteFeedbackForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const formId = parseInt(req.params.id);
    if (isNaN(formId)) {
      return res.status(400).json({ error: 'Invalid feedback form ID' });
    }

    // Delete responses first if any exist
    try {
      await query(`DELETE FROM feedback_responses WHERE feedback_form_id = $1`, [formId]);
    } catch (e) {
      // Table or constraint might not exist
    }

    // Delete questions
    try {
      await query(`DELETE FROM feedback_questions WHERE feedback_form_id = $1`, [formId]);
    } catch (e) {
      // Table or constraint might not exist
    }

    // Delete form
    await query(`DELETE FROM feedback_forms WHERE id = $1`, [formId]);
    res.json({ success: true, message: 'Feedback form and all associated responses deleted successfully.' });
  } catch (err: any) {
    console.error('Failed to delete feedback form:', err);
    res.status(500).json({ error: err.message || 'Failed to delete feedback form.' });
  }
};

// ==========================================
// 27. STRATEGIC PIVOT REQUEST-APPROVAL WORKFLOW
// ==========================================

// Founder submits a new pivot request (creates status=PENDING, doesn't update profile yet)
export const requestStartupPivot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.currentUser;
    const { startup_id, new_idea_description, new_industry, reason } = req.body;

    if (!new_idea_description || !new_idea_description.trim()) {
      return res.status(400).json({ error: 'New business idea / description is required.' });
    }
    if (!new_industry || !new_industry.trim()) {
      return res.status(400).json({ error: 'Target new industry is required.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason for strategic pivot is required.' });
    }

    // Resolve startup ID for founder if not explicitly supplied
    let targetStartupId = startup_id ? parseInt(startup_id) : null;
    if (!targetStartupId && user?.email) {
      const appRes = await query(`SELECT id FROM applicants WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email]);
      if (appRes.rows.length > 0) {
        targetStartupId = appRes.rows[0].id;
      }
    }

    if (!targetStartupId) {
      return res.status(400).json({ error: 'Could not associate request with a valid startup venture.' });
    }

    // Check if there is already a PENDING pivot request for this startup
    const existingPivotsRes = await query(`
      SELECT * FROM startup_pivots 
      WHERE startup_profile_id = $1 OR startup_id = $1
    `, [targetStartupId]);
    
    const pendingRequest = (existingPivotsRes.rows || []).find((p: any) => p.status === 'PENDING');
    if (pendingRequest) {
      return res.status(400).json({ 
        error: 'You already have an active pivot request pending administrative review. You cannot submit another until it is reviewed.',
        pendingRequest 
      });
    }

    // Lookup current startup profile information to snapshot previous values
    const startupRes = await query(`SELECT * FROM startup_profiles WHERE id = $1 OR applicant_id = $1 LIMIT 1`, [targetStartupId]);
    let prevIdea = '';
    let prevIndustry = 'General Tech';
    let prevIndId = null;

    if (startupRes.rows.length > 0) {
      const sp = startupRes.rows[0];
      prevIdea = sp.description || '';
      prevIndId = sp.industry_id || null;
      if (prevIndId) {
        const indRes = await query(`SELECT name FROM industries WHERE id = $1 LIMIT 1`, [prevIndId]);
        if (indRes.rows.length > 0) {
          prevIndustry = indRes.rows[0].name;
        }
      }
    } else {
      // Fallback to applicant row
      const appRowRes = await query(`SELECT * FROM applicants WHERE id = $1 LIMIT 1`, [targetStartupId]);
      if (appRowRes.rows.length > 0) {
        prevIdea = appRowRes.rows[0].description || '';
      }
    }

    // Lookup new industry id if available
    let newIndId = null;
    const newIndLookup = await query(`SELECT id FROM industries WHERE LOWER(name) = LOWER($1) LIMIT 1`, [new_industry.trim()]);
    if (newIndLookup.rows.length > 0) {
      newIndId = newIndLookup.rows[0].id;
    }

    // Insert pending pivot record
    const insertRes = await query(`
      INSERT INTO startup_pivots (
        startup_profile_id,
        previous_idea_description,
        new_idea_description,
        previous_industry,
        new_industry,
        reason,
        status,
        requested_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', CURRENT_TIMESTAMP)
      RETURNING *;
    `, [
      targetStartupId,
      prevIdea,
      new_idea_description.trim(),
      prevIndustry,
      new_industry.trim(),
      reason.trim(),
      'PENDING'
    ]);

    const createdPivot = insertRes.rows[0];

    // Log audit record
    await logAudit(
      user?.email || 'founder',
      'PIVOT_REQUESTED',
      'STARTUP',
      String(targetStartupId),
      `Founder requested strategic pivot to "${new_industry.trim()}". Reason: ${reason.trim()}`
    );

    res.json({
      success: true,
      message: 'Strategic pivot request submitted successfully and is now pending administrative approval.',
      pivot: createdPivot
    });
  } catch (err: any) {
    console.error('Failed to request startup pivot:', err);
    res.status(500).json({ error: err.message || 'Failed to submit pivot request.' });
  }
};

// List all pivot requests (supports filtering by ?status=PENDING/APPROVED/REJECTED or ?startup_id=123)
export const getPivotRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, startup_id } = req.query;

    let q = `SELECT * FROM startup_pivots`;
    const params: any[] = [];

    if (startup_id) {
      params.push(parseInt(startup_id as string));
      q += ` WHERE startup_profile_id = $1`;
    }

    const result = await query(q, params);
    let list = result.rows || [];

    if (status && typeof status === 'string' && status.trim() !== '') {
      list = list.filter((p: any) => (p.status || 'APPROVED').toUpperCase() === status.trim().toUpperCase());
    }

    res.json({
      success: true,
      pivots: list
    });
  } catch (err: any) {
    console.error('Failed to get pivot requests:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve pivot requests.' });
  }
};

// Admin Review Pivot Request (Approve or Reject)
export const reviewStartupPivot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.currentUser;
    const pivotId = parseInt(req.params.id);
    const { action, admin_remarks } = req.body; // action: 'APPROVE' | 'REJECT'

    if (!action || !['APPROVE', 'REJECT'].includes(action.toUpperCase())) {
      return res.status(400).json({ error: "Action must be either 'APPROVE' or 'REJECT'." });
    }

    const isApprove = action.toUpperCase() === 'APPROVE';
    if (!isApprove && (!admin_remarks || !admin_remarks.trim())) {
      return res.status(400).json({ error: "Admin remarks are required when rejecting a pivot request." });
    }

    // Fetch the pending pivot record
    const pivotRes = await query(`SELECT * FROM startup_pivots WHERE id = $1 LIMIT 1`, [pivotId]);
    if (pivotRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pivot record not found.' });
    }

    const pivot = pivotRes.rows[0];
    if (pivot.status !== 'PENDING') {
      return res.status(400).json({ error: `This pivot request has already been reviewed (Status: ${pivot.status}).` });
    }

    const newStatus = isApprove ? 'APPROVED' : 'REJECTED';
    const reviewedAt = new Date().toISOString();
    const reviewerId = admin?.id || 1;
    const reviewerEmail = admin?.email || 'admin@takhleeq.pk';

    // Update pivot record
    const updatedPivotRes = await query(`
      UPDATE startup_pivots
      SET status = $1,
          reviewed_by = $2,
          reviewed_at = $3,
          admin_remarks = $4
      WHERE id = $5
      RETURNING *;
    `, [newStatus, reviewerId, reviewedAt, admin_remarks ? admin_remarks.trim() : null, pivotId]);

    const targetStartupId = pivot.startup_profile_id || pivot.startup_id;

    // If APPROVED, update the startup's actual profile (description and industry)
    let updatedProfile = null;
    if (isApprove && targetStartupId) {
      // Find industry ID if possible
      let targetIndId = pivot.new_industry_id || null;
      if (!targetIndId && pivot.new_industry) {
        const indFind = await query(`SELECT id FROM industries WHERE LOWER(name) = LOWER($1) LIMIT 1`, [pivot.new_industry.trim()]);
        if (indFind.rows.length > 0) {
          targetIndId = indFind.rows[0].id;
        }
      }

      const upRes = await query(`
        UPDATE startup_profiles
        SET description = $1,
            industry_id = COALESCE($2, industry_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 OR applicant_id = $3
        RETURNING *;
      `, [pivot.new_idea_description || pivot.new_idea, targetIndId, targetStartupId]);

      if (upRes.rows.length > 0) {
        updatedProfile = upRes.rows[0];
      }

      // Also update applicants table if applicable
      await query(`
        UPDATE applicants
        SET description = $1
        WHERE id = $2;
      `, [pivot.new_idea_description || pivot.new_idea, targetStartupId]);

      // Record audit log for startup
      await query(`
        INSERT INTO startup_audit_logs (
          startup_profile_id,
          changed_by_user_id,
          changed_by_email,
          field_name,
          old_value,
          new_value
        ) VALUES ($1, $2, $3, 'PIVOT_APPROVED', $4, $5);
      `, [
        targetStartupId,
        reviewerId,
        reviewerEmail,
        `Previous: ${pivot.previous_industry || 'General Tech'} - ${(pivot.previous_idea_description || '').substring(0, 40)}...`,
        `New: ${pivot.new_industry || 'General Tech'} - ${(pivot.new_idea_description || '').substring(0, 40)}...`
      ]);
    }

    // System audit log
    await logAudit(
      reviewerEmail,
      isApprove ? 'PIVOT_APPROVED' : 'PIVOT_REJECTED',
      'STARTUP_PIVOT',
      String(pivotId),
      `Admin ${reviewerEmail} ${isApprove ? 'approved' : 'rejected'} pivot request for startup #${targetStartupId}. Remarks: ${admin_remarks || 'None'}`
    );

    // Send email notification to founder
    try {
      const founderEmail = pivot.founder_email;
      const founderName = pivot.founder_name || 'Founder';
      const startupName = pivot.startup_name || 'Startup';

      if (founderEmail) {
        await sendPivotNotificationEmail({
          founderEmail,
          founderName,
          startupName,
          status: newStatus as 'APPROVED' | 'REJECTED',
          previousIdea: pivot.previous_idea_description || pivot.previous_idea,
          newIdea: pivot.new_idea_description || pivot.new_idea,
          previousIndustry: pivot.previous_industry,
          newIndustry: pivot.new_industry,
          reason: pivot.reason,
          adminRemarks: admin_remarks ? admin_remarks.trim() : undefined
        });
      }
    } catch (emailErr) {
      console.warn('Could not dispatch founder pivot decision notification email:', emailErr);
    }

    res.json({
      success: true,
      message: `Strategic pivot request successfully ${isApprove ? 'approved' : 'rejected'}.`,
      pivot: updatedPivotRes.rows[0],
      updatedProfile
    });
  } catch (err: any) {
    console.error('Failed to review startup pivot:', err);
    res.status(500).json({ error: err.message || 'Failed to review pivot request.' });
  }
};




