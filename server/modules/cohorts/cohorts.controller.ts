import { Response } from 'express';
import { query, logAudit } from '../../db.ts';
import { AuthenticatedRequest } from '../../shared/types/index.ts';
import { sendApplicantStatusEmail, sendPerformanceWarningEmail, sendWarningResolutionEmail } from './cohort-email.service.ts';
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

  try {
    // Check if form is currently active
    const settingsRes = await query('SELECT is_active FROM cohort_form_settings LIMIT 1');
    const isActive = settingsRes.rows.length > 0 ? settingsRes.rows[0].is_active : true;
    if (!isActive) {
      return res.status(403).json({ error: 'Application Closed: The admission intake window for Takhleeq Cohort is currently offline.' });
    }

    // Check for previous application by same email or CNIC to set parent link
    const prevAppRes = await query(
      `SELECT id, tracking_token FROM applicants WHERE LOWER(email) = LOWER($1) OR REPLACE(cnic, '-', '') = REPLACE($2, '-', '') ORDER BY id DESC LIMIT 1`,
      [email.trim(), cnic.trim()]
    );
    
    let parent_applicant_id: number | null = null;
    if (prevAppRes.rows.length > 0) {
      parent_applicant_id = prevAppRes.rows[0].id;
    }

    const token = generateTrackingToken();
    const cleanFormData = form_data ? (typeof form_data === 'string' ? form_data : JSON.stringify(form_data)) : '{}';

    const insertRes = await query(
      `INSERT INTO applicants (tracking_token, name, email, phone, cnic, startup_name, startup_description, status, program_status, panel_scores, parent_applicant_id, form_data, orientation_conducted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUBMITTED', 'NOT_ENROLLED', NULL, $8, $9, FALSE)
       RETURNING *`,
      [token, name.trim(), email.toLowerCase().trim(), phone.trim(), cnic.trim(), startup_name.trim(), startup_description.trim(), parent_applicant_id, cleanFormData]
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
    let newProgramStatus = program_status || prev.program_status || 'NOT_ENROLLED';

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

    if (newStatus === 'CONFIRMED' && (!program_status || program_status === 'NOT_ENROLLED')) {
      newProgramStatus = 'ACTIVE';
    }

    const result = await query(
      `UPDATE applicants SET status = $1, program_status = $2, cohort_id = $3 WHERE id = $4 RETURNING *`,
      [newStatus, newProgramStatus, assignedCohortId, parseInt(id)]
    );

    const updated = result.rows[0];

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
    const result = await query(
      `INSERT INTO cohorts (name, status) VALUES ($1, $2) RETURNING *`,
      [name.trim(), status || 'DRAFT']
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

      // We retrieve all confirmed founders
      const founders = await query(
        `SELECT id FROM applicants WHERE cohort_id = $1 AND status = 'CONFIRMED'`,
        [parseInt(id)]
      );

      const toGraduate = founders.rows.filter(f => !blockedIds.includes(f.id));

      for (const f of toGraduate) {
        await query(
          `UPDATE applicants SET status = 'CONFIRMED' WHERE id = $1`, // wait, status can remain CONFIRMED but cohort graduates, or we set status to 'ACCEPTED'/'COMPLETED'. But wait, in our enum, 'CONFIRMED' means active seat. Let's keep status as 'CONFIRMED' but can mark cohort as completed.
          // Or wait, let's keep status 'CONFIRMED' (or we can mark them 'CONFIRMED' but associate with a completed cohort. In UI we display them as "Graduated").
          [f.id]
        );
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

      return {
        ...sess,
        attendance_summary,
        assignments_summary
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

    // Automatically create attendance records for every active/confirmed startup in this cohort
    try {
      let startupsRes = await query(
        `SELECT id FROM applicants WHERE cohort_id = $1 AND (program_status = 'ACTIVE' OR status = 'CONFIRMED')`,
        [parseInt(id)]
      );
      if (startupsRes.rows.length === 0) {
        startupsRes = await query(`SELECT id FROM applicants WHERE cohort_id = $1`, [parseInt(id)]);
      }
      if (startupsRes.rows.length === 0) {
        startupsRes = await query(`SELECT id FROM applicants LIMIT 10`);
      }

      for (const st of startupsRes.rows) {
        await query(
          `INSERT INTO session_attendance (session_id, applicant_id, status)
           VALUES ($1, $2, 'not_marked')`,
          [session.id, st.id]
        );
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

    // Delete attendance records & assignments first
    await query('DELETE FROM session_attendance WHERE session_id = $1', [parseInt(id)]);
    await query('DELETE FROM assignments WHERE session_id = $1', [parseInt(id)]);
    
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

    let applicantsRes = await query('SELECT id, name, startup_name, email FROM applicants WHERE cohort_id = $1 OR status = \'CONFIRMED\'', [sess.cohort_id]);
    if (applicantsRes.rows.length === 0) {
      applicantsRes = await query('SELECT id, name, startup_name, email FROM applicants ORDER BY id ASC');
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
      attendance_sheet_photo_url: sess.attendance_sheet_photo_url || null
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
    const sessRes = await query('SELECT title, cohort_id FROM cohort_sessions WHERE id = $1', [parseInt(id)]);
    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const sess = sessRes.rows[0];

    if (attendance_sheet_photo_url !== undefined) {
      await query('UPDATE cohort_sessions SET attendance_sheet_photo_url = $1 WHERE id = $2', [
        attendance_sheet_photo_url ? attendance_sheet_photo_url.trim() : null,
        parseInt(id)
      ]);
    }

    const saved = [];
    for (const record of attendance) {
      const insRes = await query(
        `INSERT INTO session_attendance (session_id, applicant_id, status)
         VALUES ($1, $2, $3)`,
        [parseInt(id), parseInt(record.applicant_id), record.status || 'not_marked']
      );
      saved.push(insRes.rows[0]);
    }

    await logAudit(
      `Marked attendance list for session '${sess.title}': ${attendance.filter(a => a.status === 'present' || a.status === 'PRESENT').length} present, ${attendance.filter(a => a.status === 'absent' || a.status === 'ABSENT').length} absent.`,
      'session_attendance',
      String(id),
      admin?.email || 'Admin',
      null,
      { presentCount: attendance.filter(a => a.status === 'present' || a.status === 'PRESENT').length, totalCount: attendance.length }
    );

    res.json({ success: true, attendance: saved, attendance_sheet_photo_url: attendance_sheet_photo_url || null });
  } catch (err: any) {
    console.error('Failed to save session attendance:', err);
    res.status(500).json({ error: 'Internal Server Error while saving attendance.' });
  }
};

// --- ASSIGNMENTS & SUBMISSIONS ---
export const createCohortAssignment = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params; // cohort_id
  const { title, description, due_date, attachment_url, cohort_id } = req.body;

  if (!title || !due_date) {
    return res.status(400).json({ error: 'Title and due date are required for an assignment.' });
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

export const getCohortAssignments = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // cohort_id
  try {
    const cohortId = (id && !isNaN(parseInt(id))) ? parseInt(id) : null;
    const result = await query(
      `SELECT a.*, cs.title as session_title 
       FROM assignments a 
       LEFT JOIN cohort_sessions cs ON a.session_id = cs.id
       WHERE a.session_id IS NULL 
         AND ($1::integer IS NULL OR a.cohort_id = $1)
       ORDER BY a.created_at DESC`,
      [cohortId]
    );

    const assignmentsWithStats = await Promise.all(
      result.rows.map(async (asg: any) => {
        const countRes = await query(
          `SELECT COUNT(*) as count FROM assignment_submissions WHERE assignment_id = $1`,
          [asg.id]
        );
        return {
          ...asg,
          submissions_count: parseInt(countRes.rows[0]?.count || '0')
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
    await query('DELETE FROM assignment_submissions WHERE assignment_id = $1', [parseInt(id)]);
    await query('DELETE FROM assignments WHERE id = $1', [parseInt(id)]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete assignment:', err);
    res.status(500).json({ error: 'Failed to delete assignment.' });
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

    let applicantsRes = await query('SELECT id, name, startup_name, email FROM applicants WHERE cohort_id = $1 OR status = \'CONFIRMED\'', [cohortId]);
    if (applicantsRes.rows.length === 0) {
      applicantsRes = await query('SELECT id, name, startup_name, email FROM applicants ORDER BY id ASC');
    }

    const submissionsRes = await query('SELECT * FROM assignment_submissions WHERE assignment_id = $1', [parseInt(id)]);

    const subMap = new Map();
    (submissionsRes.rows || []).forEach((s: any) => subMap.set(s.applicant_id, s));

    const submissions = (applicantsRes.rows || []).map((app: any) => {
      const sub = subMap.get(app.id);
      return {
        applicant_id: app.id,
        startup_name: app.startup_name || 'Startup Team',
        founder_name: app.name || 'Founder',
        is_submitted: !!sub,
        file_url: sub?.file_url || null,
        submitted_at: sub?.submitted_at || null,
        updated_at: sub?.updated_at || null
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

    const subRes = await query(
      `INSERT INTO assignment_submissions (assignment_id, applicant_id, file_url)
       VALUES ($1, $2, $3)`,
      [parseInt(id), targetApplicantId, file_url.trim()]
    );

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
       WHERE a.session_id IS NULL AND a.cohort_id = $1 
       ORDER BY a.created_at DESC`,
      [cohortId]
    );

    for (const asg of allAsgsRes.rows) {
      const subRes = await query(
        `SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND applicant_id = $2`,
        [asg.id, applicant.id]
      );
      assignmentsList.push({
        ...asg,
        sessionTitle: asg.session_title,
        submission: subRes.rows[0] || null
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
  const { phone, website, social_links, logo_description, description, logo_url, contact_info, pivot_history } = req.body;

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

    const updatedApplicant = result.rows[0];
    updatedApplicant.panel_scores = updatedApplicant.panel_scores && typeof updatedApplicant.panel_scores === 'string' ? JSON.parse(updatedApplicant.panel_scores) : updatedApplicant.panel_scores;
    updatedApplicant.form_data = updatedApplicant.form_data && typeof updatedApplicant.form_data === 'string' ? JSON.parse(updatedApplicant.form_data) : updatedApplicant.form_data;

    res.json({ success: true, applicant: updatedApplicant });
  } catch (err: any) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ error: 'Failed to save self-service profile edits.' });
  }
};


