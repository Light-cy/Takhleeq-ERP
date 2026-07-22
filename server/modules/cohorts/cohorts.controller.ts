import { Response } from 'express';
import { query, logAudit } from '../../db.ts';
import { AuthenticatedRequest } from '../../shared/types/index.ts';

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
      `INSERT INTO applicants (tracking_token, name, email, phone, cnic, startup_name, startup_description, status, panel_scores, parent_applicant_id, form_data, orientation_conducted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUBMITTED', NULL, $8, $9, FALSE)
       RETURNING *`,
      [token, name.trim(), email.toLowerCase().trim(), phone.trim(), cnic.trim(), startup_name.trim(), startup_description.trim(), parent_applicant_id, cleanFormData]
    );

    const newApplicant = insertRes.rows[0];

    await logAudit(
      `New startup application submitted: '${startup_name}' by founder ${name}. Token: ${token}`,
      'applicant',
      String(newApplicant.id),
      email.toLowerCase().trim(),
      null,
      { tracking_token: token, startup_name, parent_linked: !!parent_applicant_id }
    );

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
      `SELECT id, tracking_token, name, email, startup_name, status, orientation_conducted, created_at 
       FROM applicants 
       WHERE LOWER(tracking_token) = LOWER($1)`,
      [token.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tracking Token Error: No application found matching the provided token.' });
    }

    res.json(result.rows[0]);
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
  const { status, cohort_id } = req.body; // status: 'IN_REVIEW' | 'BACKUP_CANDIDATE' | 'ACCEPTED' | 'CONFIRMED' | 'REJECTED'

  if (!status) {
    return res.status(400).json({ error: 'Missing status field.' });
  }

  try {
    // Retrieve previous status
    const prevRes = await query('SELECT status, startup_name, cohort_id FROM applicants WHERE id = $1', [parseInt(id)]);
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ error: 'Applicant not found.' });
    }
    const prev = prevRes.rows[0];

    // Enforce role and permission constraints:
    if (!admin) {
      // Unauthenticated (Public / Applicant) flow
      if (status !== 'CONFIRMED' || prev.status !== 'ACCEPTED') {
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
    if (status === 'CONFIRMED' && !assignedCohortId) {
      // Find the first active cohort if none specified
      const activeCohorts = await query("SELECT id FROM cohorts WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 1");
      if (activeCohorts.rows.length > 0) {
        assignedCohortId = activeCohorts.rows[0].id;
      } else {
        return res.status(400).json({ error: 'Admissions Conflict: Cannot confirm seats. No active incubation cohort exists to associate this startup with.' });
      }
    }

    const result = await query(
      `UPDATE applicants SET status = $1, cohort_id = $2 WHERE id = $3 RETURNING *`,
      [status, assignedCohortId, parseInt(id)]
    );

    const updated = result.rows[0];

    await logAudit(
      `Status updated for startup '${prev.startup_name}': Changed from '${prev.status}' to '${status}'.`,
      'applicant_status',
      String(id),
      admin?.email || 'Admin',
      { previousStatus: prev.status, previousCohort: prev.cohort_id },
      { newStatus: status, cohort_id: assignedCohortId }
    );

    res.json({ success: true, applicant: updated });
  } catch (err: any) {
    console.error('Failed to update applicant status:', err);
    res.status(500).json({ error: 'Internal Server Error while changing status.' });
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
    res.json(result.rows);
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

    // Delete attendance records first
    await query('DELETE FROM session_attendance WHERE session_id = $1', [parseInt(id)]);
    
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
    const result = await query('SELECT * FROM session_attendance WHERE session_id = $1', [parseInt(id)]);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Failed to fetch session attendance:', err);
    res.status(500).json({ error: 'Failed to retrieve attendance logs.' });
  }
};

export const saveSessionAttendance = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser;
  const { id } = req.params; // session_id
  const { attendance } = req.body; // array of { applicant_id: number, status: 'PRESENT' | 'ABSENT' | 'EXCUSED' }

  if (!attendance || !Array.isArray(attendance)) {
    return res.status(400).json({ error: 'Missing attendance logs array.' });
  }

  try {
    const sessRes = await query('SELECT title, cohort_id FROM cohort_sessions WHERE id = $1', [parseInt(id)]);
    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const sess = sessRes.rows[0];

    // Delete previous attendance log to write cleanly
    await query('DELETE FROM session_attendance WHERE session_id = $1', [parseInt(id)]);

    const saved = [];
    for (const record of attendance) {
      const insRes = await query(
        `INSERT INTO session_attendance (session_id, applicant_id, status)
         VALUES ($1, $2, $3) RETURNING *`,
        [parseInt(id), parseInt(record.applicant_id), record.status]
      );
      saved.push(insRes.rows[0]);
    }

    await logAudit(
      `Marked attendance list for session '${sess.title}': ${attendance.filter(a => a.status === 'PRESENT').length} present, ${attendance.filter(a => a.status === 'ABSENT').length} absent.`,
      'session_attendance',
      String(id),
      admin?.email || 'Admin',
      null,
      { presentCount: attendance.filter(a => a.status === 'PRESENT').length, totalCount: attendance.length }
    );

    res.json({ success: true, attendance: saved });
  } catch (err: any) {
    console.error('Failed to save session attendance:', err);
    res.status(500).json({ error: 'Internal Server Error while saving attendance.' });
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
  const { applicant_id, reason, severity } = req.body; // severity: 'YELLOW' | 'RED'

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

    const appRes = await query('SELECT startup_name FROM applicants WHERE id = $1', [parseInt(applicant_id)]);
    const startupName = appRes.rows[0]?.startup_name || 'Startup';

    await logAudit(
      `ISSUED ${severity} PERFORMANCE WARNING to '${startupName}': Reason: ${reason}`,
      'performance_warning',
      String(warning.id),
      admin?.email || 'Admin',
      null,
      warning
    );

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

    const appRes = await query('SELECT startup_name FROM applicants WHERE id = $1', [prev.applicant_id]);
    const startupName = appRes.rows[0]?.startup_name || 'Startup';

    await logAudit(
      `RESOLVED performance warning for '${startupName}': Status set to ${status}. Notes: ${resolution_notes}`,
      'performance_warning_resolve',
      String(id),
      admin?.email || 'Admin',
      { previousStatus: 'ACTIVE', severity: prev.severity },
      updated
    );

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
    const applicantRes = await query(
      `SELECT * FROM applicants WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1`,
      [req.currentUser.email.trim()]
    );

    if (applicantRes.rows.length === 0) {
      return res.status(404).json({ error: 'No active incubator enrollment found for your authenticated email address.' });
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
      sessions = sessionsRes.rows;
    }

    // 3. Fetch Attendance records
    const attendanceRes = await query(
      `SELECT * FROM session_attendance WHERE applicant_id = $1`,
      [applicant.id]
    );

    // 4. Fetch Weekly Team Check-ins
    const checkinsRes = await query(
      `SELECT * FROM team_checkins WHERE applicant_id = $1 ORDER BY created_at DESC`,
      [applicant.id]
    );

    // 5. Fetch Performance Warnings
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
    const appRes = await query('SELECT email, phone, form_data FROM applicants WHERE id = $1', [parseInt(id)]);
    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Applicant record not found.' });
    }

    if (req.currentUser.role !== 'Administrator' && appRes.rows[0].email.toLowerCase() !== req.currentUser.email.toLowerCase()) {
      return res.status(403).json({ error: 'Access Denied: You cannot modify profiles of other startup teams.' });
    }

    const currentFormData = appRes.rows[0].form_data ? (typeof appRes.rows[0].form_data === 'string' ? JSON.parse(appRes.rows[0].form_data) : appRes.rows[0].form_data) : {};
    
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

    const finalPhone = phone !== undefined ? phone.trim() : appRes.rows[0].phone;
    const finalDesc = description !== undefined ? description.trim() : null;

    let result;
    if (finalDesc !== null) {
      result = await query(
        `UPDATE applicants SET phone = $1, startup_description = $2, form_data = $3 WHERE id = $4 RETURNING *`,
        [finalPhone, finalDesc, JSON.stringify(updatedFormData), parseInt(id)]
      );
    } else {
      result = await query(
        `UPDATE applicants SET phone = $1, form_data = $2 WHERE id = $3 RETURNING *`,
        [finalPhone, JSON.stringify(updatedFormData), parseInt(id)]
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


