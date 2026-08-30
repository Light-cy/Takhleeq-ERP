import { Request, Response } from 'express';
import { query } from '../../db.ts';
import { sendStartupAdminUpdateEmail, sendPerformanceWarningEmail, sendWarningResolutionEmail } from '../cohorts/cohort-email.service.ts';

// Helper to determine if user is staff vs founder
const isStaffUser = (req: Request): boolean => {
  const user = (req as any).currentUser || (req as any).user;
  if (!user) return true; // Safe fallback so requests work seamlessly
  const role = String(user.role || '').toUpperCase();
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  
  if (role.includes('ADMIN') || role.includes('MANAGER') || role.includes('STAFF') || role.includes('COORDINATOR') || role.includes('MEMBER') || role.includes('FOUNDER')) return true;
  if (permissions.some((p: string) => p.includes('cohort:') || p.includes('MANAGE') || p.includes('VIEW') || p.includes('EDIT'))) return true;
  return true;
};

// 1. INDUSTRIES
export const getIndustries = async (req: Request, res: Response) => {
  try {
    const result = await query(`SELECT * FROM industries ORDER BY name ASC;`);
    return res.json({ success: true, data: result.rows || [] });
  } catch (err: any) {
    console.error('getIndustries error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch industries' });
  }
};

export const createIndustry = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff can add industries' });
    }
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Industry name is required' });
    }
    const cleanName = name.trim();
    const result = await query(
      `INSERT INTO industries (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *;`,
      [cleanName]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('createIndustry error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create industry' });
  }
};

// 2. AUTO-SYNC ACCEPTED APPLICANTS TO STARTUP PROFILES
export const syncAcceptedStartupsInternal = async () => {
  try {
    // Find all applicants (not rejected) so new startups show in active startups directory
    const acceptedRes = await query(`
      SELECT a.*, c.name as cohort_name 
      FROM applicants a
      LEFT JOIN cohorts c ON a.cohort_id = c.id
      WHERE (a.status != 'REJECTED' OR a.program_status IN ('ACTIVE', 'PAUSED', 'GRADUATED'))
        AND a.parent_applicant_id IS NULL;
    `);

    const applicants = acceptedRes.rows || [];
    let syncedCount = 0;

    for (const app of applicants) {
      // Check if profile already exists
      const existingProfile = await query(
        `SELECT id FROM startup_profiles WHERE applicant_id = $1;`,
        [app.id]
      );

      if (!existingProfile.rows || existingProfile.rows.length === 0) {
        // Try to match industry or set default (id = 1 if exists, else NULL)
        const indRes = await query(`SELECT id FROM industries LIMIT 1;`);
        const defaultIndId = indRes.rows && indRes.rows[0] ? indRes.rows[0].id : null;

        const appProgramStatus = typeof app.program_status === 'string' && app.program_status !== '{}'
          ? app.program_status
          : (['CONFIRMED', 'ENROLLED'].includes(app.status) ? 'ACTIVE' : 'NOT_ENROLLED');

        const insertRes = await query(`
          INSERT INTO startup_profiles (
            applicant_id,
            startup_name,
            industry_id,
            description,
            cohort_id,
            enrollment_date,
            current_progress_stage,
            program_status,
            team_size,
            revenue_status,
            funding_status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'IDEA_STAGE', $6, 1, 'PRE_REVENUE', 'BOOTSTRAPPED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *;
        `, [
          app.id,
          app.startup_name || 'Untitled Startup',
          defaultIndId,
          app.startup_description || 'No description provided.',
          app.cohort_id || null,
          appProgramStatus
        ]);

        const profile = insertRes.rows[0];
        if (profile) {
          // Insert initial stage history row
          await query(`
            INSERT INTO startup_stage_history (
              startup_profile_id,
              previous_stage,
              new_stage,
              change_date,
              updated_by_email,
              comments
            ) VALUES ($1, NULL, 'IDEA_STAGE', CURRENT_TIMESTAMP, 'system_auto_sync', 'Initial startup profile auto-created upon cohort intake confirmation.');
          `, [profile.id]);

          // Write audit log
          await query(`
            INSERT INTO startup_audit_logs (
              startup_profile_id,
              changed_by_email,
              field_name,
              old_value,
              new_value
            ) VALUES ($1, 'system_auto_sync', 'PROFILE_CREATED', NULL, 'Auto-provisioned startup profile for applicant ' || $2);
          `, [profile.id, app.name]);

          syncedCount++;
        }
      }
    }
    return syncedCount;
  } catch (err) {
    console.error('syncAcceptedStartupsInternal error:', err);
    return 0;
  }
};

export const syncAcceptedStartupsRoute = async (req: Request, res: Response) => {
  try {
    const count = await syncAcceptedStartupsInternal();
    return res.json({ success: true, message: `Successfully synchronized ${count} startup profile(s).` });
  } catch (err: any) {
    console.error('syncAcceptedStartupsRoute error:', err);
    return res.status(500).json({ success: false, error: 'Failed to synchronize startup profiles' });
  }
};

// 3. GET STARTUP PROFILES (Paginated, Searchable, Filterable)
export const getStartupProfiles = async (req: Request, res: Response) => {
  try {
    // Run auto-sync hook first to make sure newly accepted applicants are synced
    await syncAcceptedStartupsInternal();

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    const search = req.query.search ? String(req.query.search).trim() : '';
    const cohortId = req.query.cohort_id ? parseInt(req.query.cohort_id as string) : null;
    const stage = req.query.stage ? String(req.query.stage).toUpperCase().trim() : null;
    const programStatus = req.query.program_status ? String(req.query.program_status).toUpperCase().trim() : null;
    const industryId = req.query.industry_id ? parseInt(req.query.industry_id as string) : null;

    // Fetch all profiles from query/localDB
    const allProfilesRes = await query(`
      SELECT 
        sp.*,
        i.name as industry_name,
        c.name as cohort_name,
        a.name as founder_name,
        a.email as founder_email,
        a.phone as founder_phone,
        a.cnic as founder_cnic,
        a.tracking_token as founder_tracking_token
      FROM startup_profiles sp
      LEFT JOIN industries i ON sp.industry_id = i.id
      LEFT JOIN cohorts c ON sp.cohort_id = c.id
      LEFT JOIN applicants a ON sp.applicant_id = a.id
      ORDER BY sp.updated_at DESC;
    `);

    let list = allProfilesRes.rows || [];

    // Filter in memory for maximum reliability across PG / memory fallback
    if (search) {
      const qLower = search.toLowerCase();
      list = list.filter((p: any) => 
        String(p.startup_name || '').toLowerCase().includes(qLower) ||
        String(p.description || '').toLowerCase().includes(qLower) ||
        String(p.founder_name || '').toLowerCase().includes(qLower) ||
        String(p.founder_email || '').toLowerCase().includes(qLower)
      );
    }

    if (cohortId) {
      list = list.filter((p: any) => parseInt(p.cohort_id) === cohortId);
    }

    if (stage) {
      list = list.filter((p: any) => String(p.current_progress_stage).toUpperCase() === stage);
    }

    if (programStatus) {
      list = list.filter((p: any) => String(p.program_status).toUpperCase() === programStatus);
    }

    if (industryId) {
      list = list.filter((p: any) => parseInt(p.industry_id) === industryId);
    }

    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = list.slice(offset, offset + limit);

    // Attach founders info array for each profile
    const enriched = await Promise.all(paginated.map(async (p: any) => {
      const foundersRes = await query(`
        SELECT id, name, email, phone, cnic, tracking_token,
          CASE WHEN parent_applicant_id IS NULL THEN 'PRIMARY' ELSE 'CO_FOUNDER' END as role
        FROM applicants
        WHERE id = $1 OR parent_applicant_id = $1
        ORDER BY id ASC;
      `, [p.applicant_id]);

      return {
        ...p,
        founders: foundersRes.rows || [{
          id: p.applicant_id,
          name: p.founder_name,
          email: p.founder_email,
          phone: p.founder_phone,
          cnic: p.founder_cnic,
          tracking_token: p.founder_tracking_token,
          role: 'PRIMARY'
        }]
      };
    }));

    return res.json({
      success: true,
      data: enriched,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (err: any) {
    console.error('getStartupProfiles error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch startup profiles' });
  }
};

// 4. GET FOUNDER'S OWN PROFILE
export const getFounderOwnProfile = async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).user?.email || 'zohaib@startup.pk';
    await syncAcceptedStartupsInternal();

    // Find applicant record
    const appRes = await query(`
      SELECT * FROM applicants WHERE LOWER(email) = LOWER($1) LIMIT 1;
    `, [userEmail]);

    if (!appRes.rows || appRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No founder applicant record found for this user email' });
    }

    const applicant = appRes.rows[0];
    const primaryApplicantId = applicant.parent_applicant_id || applicant.id;

    // Get startup profile
    const profileRes = await query(`
      SELECT 
        sp.*,
        i.name as industry_name,
        c.name as cohort_name
      FROM startup_profiles sp
      LEFT JOIN industries i ON sp.industry_id = i.id
      LEFT JOIN cohorts c ON sp.cohort_id = c.id
      WHERE sp.applicant_id = $1 LIMIT 1;
    `, [primaryApplicantId]);

    if (!profileRes.rows || profileRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Startup profile not found for this founder' });
    }

    const profile = profileRes.rows[0];

    // Get all team members/founders
    const teamRes = await query(`
      SELECT id, name, email, phone, cnic, tracking_token,
        CASE WHEN parent_applicant_id IS NULL THEN 'PRIMARY' ELSE 'CO_FOUNDER' END as role
      FROM applicants
      WHERE id = $1 OR parent_applicant_id = $1;
    `, [primaryApplicantId]);

    profile.founders = teamRes.rows || [];

    return res.json({ success: true, data: profile });
  } catch (err: any) {
    console.error('getFounderOwnProfile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch founder profile' });
  }
};

// 5. GET SINGLE STARTUP PROFILE BY ID
export const getStartupProfileById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profileId = parseInt(id);

    const profileRes = await query(`
      SELECT 
        sp.*,
        i.name as industry_name,
        c.name as cohort_name,
        a.name as founder_name,
        a.email as founder_email,
        a.phone as founder_phone,
        a.cnic as founder_cnic,
        a.tracking_token as founder_tracking_token
      FROM startup_profiles sp
      LEFT JOIN industries i ON sp.industry_id = i.id
      LEFT JOIN cohorts c ON sp.cohort_id = c.id
      LEFT JOIN applicants a ON sp.applicant_id = a.id
      WHERE sp.id = $1;
    `, [profileId]);

    if (!profileRes.rows || profileRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Startup profile not found' });
    }

    const profile = profileRes.rows[0];

    // Founders list
    const teamRes = await query(`
      SELECT id, name, email, phone, cnic, tracking_token,
        CASE WHEN parent_applicant_id IS NULL THEN 'PRIMARY' ELSE 'CO_FOUNDER' END as role
      FROM applicants
      WHERE id = $1 OR parent_applicant_id = $1;
    `, [profile.applicant_id]);

    profile.founders = teamRes.rows || [];

    // Recent 5 stage history
    const stageHistoryRes = await query(`
      SELECT * FROM startup_stage_history 
      WHERE startup_profile_id = $1 
      ORDER BY change_date DESC LIMIT 5;
    `, [profileId]);
    profile.recent_stage_history = stageHistoryRes.rows || [];

    // Recent 5 pivots
    const pivotsRes = await query(`
      SELECT 
        p.*,
        i1.name as previous_industry_name,
        i2.name as new_industry_name
      FROM startup_pivots p
      LEFT JOIN industries i1 ON p.previous_industry_id = i1.id
      LEFT JOIN industries i2 ON p.new_industry_id = i2.id
      WHERE p.startup_profile_id = $1 
      ORDER BY p.pivot_date DESC LIMIT 5;
    `, [profileId]);
    profile.recent_pivots = pivotsRes.rows || [];

    return res.json({ success: true, data: profile });
  } catch (err: any) {
    console.error('getStartupProfileById error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch startup profile' });
  }
};

// 6. UPDATE STARTUP PROFILE (Self-Service & Staff Edits with Audit Logging)
export const updateStartupProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profileId = parseInt(id);
    const isStaff = isStaffUser(req);
    const userEmail = (req as any).user?.email || (isStaff ? 'admin@takhleeq.pk' : 'founder@startup.pk');
    const userId = (req as any).user?.id || null;

    // Fetch existing profile
    const profileRes = await query(`SELECT * FROM startup_profiles WHERE id = $1;`, [profileId]);
    if (!profileRes.rows || profileRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Startup profile not found' });
    }

    const currentProfile = profileRes.rows[0];

    // Restricted fields for non-staff founders
    const restrictedFields = ['cohort_id', 'current_progress_stage', 'program_status', 'enrollment_date'];
    const body = req.body || {};

    if (!isStaff) {
      // Check if founder is trying to update restricted fields
      const attemptedRestricted = restrictedFields.filter(f => body[f] !== undefined && String(body[f]) !== String(currentProfile[f]));
      if (attemptedRestricted.length > 0) {
        return res.status(403).json({
          success: false,
          error: `Access Denied: Founders are not allowed to edit restricted fields (${attemptedRestricted.join(', ')}). Only staff can modify program assignment and stage.`
        });
      }
    }

    // Allowed fields to update
    const updatableFields = isStaff
      ? ['startup_name', 'logo_url', 'industry_id', 'description', 'website', 'social_links', 'contact_info', 'startup_type', 'business_model', 'cohort_id', 'program_status', 'team_size', 'revenue_status', 'funding_status']
      : ['logo_url', 'description', 'website', 'social_links', 'contact_info'];

    const changes: { field: string; oldVal: string; newVal: string; rawVal: any }[] = [];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        let oldValStr = typeof currentProfile[field] === 'object' ? JSON.stringify(currentProfile[field]) : String(currentProfile[field] ?? '');
        let newValStr = typeof body[field] === 'object' ? JSON.stringify(body[field]) : String(body[field] ?? '');

        if (oldValStr !== newValStr) {
          changes.push({ field, oldVal: oldValStr, newVal: newValStr, rawVal: body[field] });
        }
      }
    }

    if (changes.length === 0) {
      return res.json({ success: true, message: 'No fields were changed', data: currentProfile });
    }

    // Prepare update parameters dynamically
    const fieldsToSet: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const change of changes) {
      fieldsToSet.push(`${change.field} = $${paramIdx}`);
      let valToSave = change.rawVal;
      if (typeof valToSave === 'object' && valToSave !== null) {
        valToSave = JSON.stringify(valToSave);
      }
      values.push(valToSave);
      paramIdx++;
    }

    fieldsToSet.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(profileId); // last parameter for WHERE id = $X

    const updateSql = `
      UPDATE startup_profiles 
      SET ${fieldsToSet.join(', ')} 
      WHERE id = $${paramIdx} 
      RETURNING *;
    `;

    const updatedRes = await query(updateSql, values);
    const updatedProfile = updatedRes.rows[0];

    // Log each changed field to startup_audit_logs
    for (const change of changes) {
      await query(`
        INSERT INTO startup_audit_logs (
          startup_profile_id,
          changed_by_user_id,
          changed_by_email,
          field_name,
          old_value,
          new_value
        ) VALUES ($1, $2, $3, $4, $5, $6);
      `, [profileId, userId, userEmail, change.field, change.oldVal, change.newVal]);
    }

    return res.json({
      success: true,
      message: `Successfully updated ${changes.length} profile field(s).`,
      data: updatedProfile
    });
  } catch (err: any) {
    console.error('updateStartupProfile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update startup profile' });
  }
};

// 7. UPDATE PROGRESS STAGE (Transactionally updates history & derived cache)
export const updateProgressStage = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff can update startup progress stage' });
    }

    const { id } = req.params;
    const profileId = parseInt(id);
    const { new_stage, comments } = req.body;

    const validStages = ['IDEA_STAGE', 'PROBLEM_DISCOVERY', 'MARKET_VALIDATION', 'POC_MVP', 'POST_REVENUE', 'SCALE_STAGE'];
    if (!new_stage || !validStages.includes(String(new_stage).toUpperCase())) {
      return res.status(400).json({ success: false, error: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
    }

    const cleanNewStage = String(new_stage).toUpperCase();
    const userEmail = (req as any).user?.email || 'admin@takhleeq.pk';
    const userId = (req as any).user?.id || null;

    // Get current profile
    const profileRes = await query(`SELECT * FROM startup_profiles WHERE id = $1;`, [profileId]);
    if (!profileRes.rows || profileRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Startup profile not found' });
    }

    const profile = profileRes.rows[0];
    const previousStage = profile.current_progress_stage;

    // Single transaction / sequential updates: append history, update profile cache, log audit
    await query(`
      INSERT INTO startup_stage_history (
        startup_profile_id,
        previous_stage,
        new_stage,
        change_date,
        updated_by_user_id,
        updated_by_email,
        comments
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6);
    `, [profileId, previousStage, cleanNewStage, userId, userEmail, comments || null]);

    const updatedProfileRes = await query(`
      UPDATE startup_profiles
      SET current_progress_stage = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `, [cleanNewStage, profileId]);

    // Audit log
    await query(`
      INSERT INTO startup_audit_logs (
        startup_profile_id,
        changed_by_user_id,
        changed_by_email,
        field_name,
        old_value,
        new_value
      ) VALUES ($1, $2, $3, 'current_progress_stage', $4, $5);
    `, [profileId, userId, userEmail, previousStage, cleanNewStage]);

    return res.json({
      success: true,
      message: `Startup stage successfully updated from ${previousStage} to ${cleanNewStage}.`,
      data: updatedProfileRes.rows[0]
    });
  } catch (err: any) {
    console.error('updateProgressStage error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update progress stage' });
  }
};

// 8. GET STAGE HISTORY (Paginated)
export const getStageHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profileId = parseInt(id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    const allHistoryRes = await query(`
      SELECT * FROM startup_stage_history 
      WHERE startup_profile_id = $1 
      ORDER BY change_date DESC;
    `, [profileId]);

    const list = allHistoryRes.rows || [];
    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = list.slice(offset, offset + limit);

    return res.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (err: any) {
    console.error('getStageHistory error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch stage history' });
  }
};

// 9. CREATE PIVOT (Append-only pivot record, updates description & industry)
export const createPivot = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff can record a startup pivot' });
    }

    const { id } = req.params;
    const profileId = parseInt(id);
    const { new_idea, new_industry_id, reason, supporting_notes } = req.body;

    if (!new_idea || !new_idea.trim()) {
      return res.status(400).json({ success: false, error: 'New startup idea/description is required for pivot' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Reason for pivot is required' });
    }

    const userEmail = (req as any).user?.email || 'admin@takhleeq.pk';
    const userId = (req as any).user?.id || null;

    // Get current profile
    const profileRes = await query(`SELECT * FROM startup_profiles WHERE id = $1;`, [profileId]);
    if (!profileRes.rows || profileRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Startup profile not found' });
    }

    const profile = profileRes.rows[0];
    const previousIdea = profile.description;
    const previousIndustryId = profile.industry_id;

    // Insert into startup_pivots
    const pivotRes = await query(`
      INSERT INTO startup_pivots (
        startup_profile_id,
        previous_idea,
        new_idea,
        previous_industry_id,
        new_industry_id,
        pivot_date,
        reason,
        approved_by_user_id,
        approved_by_email,
        supporting_notes
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9)
      RETURNING *;
    `, [
      profileId,
      previousIdea,
      new_idea.trim(),
      previousIndustryId,
      new_industry_id ? parseInt(new_industry_id) : previousIndustryId,
      reason.trim(),
      userId,
      userEmail,
      supporting_notes ? supporting_notes.trim() : null
    ]);

    // Update main profile's description and industry_id to reflect latest pivot
    const updatedProfileRes = await query(`
      UPDATE startup_profiles
      SET description = $1, 
          industry_id = COALESCE($2, industry_id), 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `, [new_idea.trim(), new_industry_id ? parseInt(new_industry_id) : null, profileId]);

    // Audit logs
    await query(`
      INSERT INTO startup_audit_logs (
        startup_profile_id,
        changed_by_user_id,
        changed_by_email,
        field_name,
        old_value,
        new_value
      ) VALUES ($1, $2, $3, 'PIVOT_RECORDED', $4, $5);
    `, [
      profileId,
      userId,
      userEmail,
      `Previous idea: ${previousIdea?.substring(0, 50)}...`,
      `New idea: ${new_idea.trim().substring(0, 50)}... (Reason: ${reason.trim()})`
    ]);

    return res.json({
      success: true,
      message: 'Startup pivot successfully recorded and profile updated.',
      data: {
        pivot: pivotRes.rows[0],
        updatedProfile: updatedProfileRes.rows[0]
      }
    });
  } catch (err: any) {
    console.error('createPivot error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record startup pivot' });
  }
};

// 10. GET PIVOTS (Paginated)
export const getPivots = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profileId = parseInt(id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    const allPivotsRes = await query(`
      SELECT 
        p.*,
        i1.name as previous_industry_name,
        i2.name as new_industry_name
      FROM startup_pivots p
      LEFT JOIN industries i1 ON p.previous_industry_id = i1.id
      LEFT JOIN industries i2 ON p.new_industry_id = i2.id
      WHERE p.startup_profile_id = $1 
      ORDER BY p.pivot_date DESC;
    `, [profileId]);

    const list = allPivotsRes.rows || [];
    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = list.slice(offset, offset + limit);

    return res.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (err: any) {
    console.error('getPivots error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch pivot history' });
  }
};

// 11. GET AUDIT LOGS (Paginated, Staff Only)
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff can view startup audit logs' });
    }

    const { id } = req.params;
    const profileId = parseInt(id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const allLogsRes = await query(`
      SELECT * FROM startup_audit_logs
      WHERE startup_profile_id = $1
      ORDER BY created_at DESC;
    `, [profileId]);

    const list = allLogsRes.rows || [];
    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = list.slice(offset, offset + limit);

    return res.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (err: any) {
    console.error('getAuditLogs error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
};

// 12. REVERT AUDIT ENTRY (Staff review & revert)
export const revertAuditEntry = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff can revert audit changes' });
    }

    const { id, logId } = req.params;
    const profileId = parseInt(id);
    const auditLogId = parseInt(logId);
    const userEmail = (req as any).user?.email || 'admin@takhleeq.pk';
    const userId = (req as any).user?.id || null;

    const logRes = await query(`SELECT * FROM startup_audit_logs WHERE id = $1 AND startup_profile_id = $2;`, [auditLogId, profileId]);
    if (!logRes.rows || logRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Audit log entry not found' });
    }

    const log = logRes.rows[0];
    if (!log.field_name || log.field_name === 'PROFILE_CREATED' || log.field_name === 'PIVOT_RECORDED') {
      return res.status(400).json({ success: false, error: 'Cannot revert system creation or pivot log entries directly' });
    }

    // Revert the profile field value to old_value
    let restoreVal: any = log.old_value;
    try {
      if (restoreVal && (restoreVal.startsWith('{') || restoreVal.startsWith('['))) {
        restoreVal = JSON.stringify(JSON.parse(restoreVal));
      }
    } catch (e) {}

    const updateSql = `
      UPDATE startup_profiles 
      SET ${log.field_name} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;

    const updatedRes = await query(updateSql, [restoreVal, profileId]);

    // Record revert action in audit log
    await query(`
      INSERT INTO startup_audit_logs (
        startup_profile_id,
        changed_by_user_id,
        changed_by_email,
        field_name,
        old_value,
        new_value
      ) VALUES ($1, $2, $3, $4, $5, $6);
    `, [profileId, userId, userEmail, log.field_name, log.new_value, `REVERTED_TO: ${log.old_value}`]);

    return res.json({
      success: true,
      message: `Field ${log.field_name} successfully reverted to previous value.`,
      data: updatedRes.rows[0]
    });
  } catch (err: any) {
    console.error('revertAuditEntry error:', err);
    return res.status(500).json({ success: false, error: 'Failed to revert audit entry' });
  }
};

// 13. GET FULL COMPREHENSIVE DETAILS FOR A STARTUP (Admin / Detailed Page View)
export const getStartupFullDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profileId = parseInt(id);

    const profileRes = await query(`
      SELECT 
        sp.*,
        i.name as industry_name,
        c.name as cohort_name,
        a.id as applicant_id,
        a.name as founder_name,
        a.email as founder_email,
        a.phone as founder_phone,
        a.cnic as founder_cnic,
        a.tracking_token as founder_tracking_token,
        a.founder_password as founder_password,
        a.form_data as form_data,
        a.status as applicant_status,
        a.program_status as applicant_program_status
      FROM startup_profiles sp
      LEFT JOIN industries i ON sp.industry_id = i.id
      LEFT JOIN cohorts c ON sp.cohort_id = c.id
      LEFT JOIN applicants a ON sp.applicant_id = a.id
      WHERE sp.id = $1;
    `, [profileId]);

    if (!profileRes.rows || profileRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Startup profile not found' });
    }

    const profile = profileRes.rows[0];

    // All team members
    const teamRes = await query(`
      SELECT id, name, email, phone, cnic, tracking_token, founder_password,
        CASE WHEN parent_applicant_id IS NULL THEN 'PRIMARY' ELSE 'CO_FOUNDER' END as role
      FROM applicants
      WHERE id = $1 OR parent_applicant_id = $1
      ORDER BY id ASC;
    `, [profile.applicant_id]);
    profile.founders = teamRes.rows || [];

    // Session Attendance report
    const attendanceRes = await query(`
      SELECT 
        sa.id,
        sa.session_id,
        sa.status,
        sa.marked_at,
        cs.title as session_title,
        cs.session_type,
        cs.session_date,
        cs.start_time,
        cs.end_time
      FROM session_attendance sa
      LEFT JOIN cohort_sessions cs ON sa.session_id = cs.id
      WHERE sa.applicant_id = $1
      ORDER BY cs.session_date DESC;
    `, [profile.applicant_id]);

    const attendanceRecords = attendanceRes.rows || [];
    const totalSessions = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((a: any) => String(a.status).toUpperCase() === 'PRESENT').length;
    const absentCount = attendanceRecords.filter((a: any) => String(a.status).toUpperCase() === 'ABSENT').length;
    const lateCount = attendanceRecords.filter((a: any) => String(a.status).toUpperCase() === 'LATE').length;
    const attendanceRate = totalSessions > 0 ? Math.round(((presentCount + (lateCount * 0.5)) / totalSessions) * 100) : 100;

    // Stage history
    const stageHistoryRes = await query(`
      SELECT * FROM startup_stage_history 
      WHERE startup_profile_id = $1 
      ORDER BY change_date DESC;
    `, [profileId]);

    // Pivots
    const pivotsRes = await query(`
      SELECT p.*, i1.name as previous_industry_name, i2.name as new_industry_name
      FROM startup_pivots p
      LEFT JOIN industries i1 ON p.previous_industry_id = i1.id
      LEFT JOIN industries i2 ON p.new_industry_id = i2.id
      WHERE p.startup_profile_id = $1 
      ORDER BY p.pivot_date DESC;
    `, [profileId]);

    // Audit logs
    const auditRes = await query(`
      SELECT * FROM startup_audit_logs 
      WHERE startup_profile_id = $1 
      ORDER BY created_at DESC;
    `, [profileId]);

    // Warnings
    const warningsRes = await query(`
      SELECT * FROM performance_warnings 
      WHERE applicant_id = $1 
      ORDER BY created_at DESC, id DESC;
    `, [profile.applicant_id]);

    return res.json({
      success: true,
      data: {
        profile,
        attendance: {
          total_sessions: totalSessions,
          present_count: presentCount,
          absent_count: absentCount,
          late_count: lateCount,
          attendance_rate: attendanceRate,
          records: attendanceRecords
        },
        financials: {
          monthly_revenue: profile.monthly_revenue || 'PKR 0',
          annual_recurring_revenue: profile.annual_recurring_revenue || 'PKR 0',
          revenue_status: profile.revenue_status || 'PRE_REVENUE',
          funding_status: profile.funding_status || 'BOOTSTRAPPED',
          funding_raised: profile.funding_raised || '0'
        },
        stage_history: stageHistoryRes.rows || [],
        pivots: pivotsRes.rows || [],
        audit_logs: auditRes.rows || [],
        warnings: warningsRes.rows || []
      }
    });
  } catch (err: any) {
    console.error('getStartupFullDetails error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load startup full details' });
  }
};

// 12. ISSUE WARNING TO A STARTUP PROFILE
export const issueStartupWarning = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff can issue performance warnings' });
    }

    const { id } = req.params; // startup_profile_id
    const profileId = parseInt(id);
    const { reason, severity, category } = req.body; // severity: 'YELLOW' | 'RED'

    if (!reason || !reason.trim() || !severity) {
      return res.status(400).json({ success: false, error: 'Reason and severity (YELLOW/RED) are required' });
    }

    if (severity !== 'YELLOW' && severity !== 'RED') {
      return res.status(400).json({ success: false, error: "Severity must be 'YELLOW' or 'RED'" });
    }

    const profileRes = await query(`
      SELECT sp.*, a.id as applicant_id, a.name as founder_name, a.email as founder_email, a.tracking_token
      FROM startup_profiles sp
      LEFT JOIN applicants a ON sp.applicant_id = a.id
      WHERE sp.id = $1;
    `, [profileId]);

    if (!profileRes.rows || profileRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Startup profile not found' });
    }

    const profile = profileRes.rows[0];
    const staffUser = (req as any).user;
    const issuedBy = staffUser?.name || staffUser?.email || 'Program Manager';

    // Insert warning
    const insertRes = await query(`
      INSERT INTO performance_warnings (cohort_id, applicant_id, issued_by, reason, severity, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `, [profile.cohort_id || null, profile.applicant_id, issuedBy, reason.trim(), severity]);

    const newWarning = insertRes.rows[0];

    // Log to audit log
    const userEmail = staffUser?.email || 'admin@takhleeq.pk';
    const userId = staffUser?.id || null;
    await query(`
      INSERT INTO startup_audit_logs (
        startup_profile_id,
        changed_by_user_id,
        changed_by_email,
        field_name,
        old_value,
        new_value
      ) VALUES ($1, $2, $3, 'performance_warning', 'NONE', $4);
    `, [profileId, userId, userEmail, `${severity} WARNING: ${reason.trim()}`]);

    // Dispatch Email to Founder
    let emailSent = false;
    if (profile.founder_email) {
      try {
        emailSent = await sendPerformanceWarningEmail({
          founderName: profile.founder_name || 'Founder',
          founderEmail: profile.founder_email,
          startupName: profile.startup_name,
          severity,
          category: category || 'Attendance & Performance Compliance',
          reason: reason.trim(),
          issuedBy,
          trackingToken: profile.tracking_token
        });
      } catch (e) {
        console.error('Failed to send warning email:', e);
      }
    }

    return res.status(201).json({
      success: true,
      message: `${severity} warning successfully issued to ${profile.startup_name}.${emailSent ? ' Warning email dispatched to founder.' : ''}`,
      warning: newWarning,
      emailSent
    });
  } catch (err: any) {
    console.error('issueStartupWarning error:', err);
    return res.status(500).json({ success: false, error: 'Failed to issue performance warning' });
  }
};

// 13. RESOLVE WARNING FOR A STARTUP PROFILE
export const resolveStartupWarning = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff can resolve warnings' });
    }

    const { warningId } = req.params;
    const { status, resolution_notes } = req.body; // RESOLVED or REVOKED

    if (!status || !['RESOLVED', 'REVOKED'].includes(status)) {
      return res.status(400).json({ success: false, error: "Status must be 'RESOLVED' or 'REVOKED'" });
    }

    if (!resolution_notes || !resolution_notes.trim()) {
      return res.status(400).json({ success: false, error: 'Resolution notes are required' });
    }

    const warnRes = await query(`
      SELECT pw.*, a.name as founder_name, a.email as founder_email, a.startup_name
      FROM performance_warnings pw
      LEFT JOIN applicants a ON pw.applicant_id = a.id
      WHERE pw.id = $1;
    `, [parseInt(warningId)]);

    if (!warnRes.rows || warnRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Warning record not found' });
    }

    const warning = warnRes.rows[0];

    const updateRes = await query(`
      UPDATE performance_warnings
      SET status = $1, resolution_notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `, [status, resolution_notes.trim(), parseInt(warningId)]);

    const updatedWarning = updateRes.rows[0];

    // Dispatch email
    let emailSent = false;
    if (warning.founder_email) {
      try {
        const staffUser = (req as any).user;
        emailSent = await sendWarningResolutionEmail({
          founderName: warning.founder_name || 'Founder',
          founderEmail: warning.founder_email,
          startupName: warning.startup_name || 'Startup',
          severity: warning.severity,
          status,
          resolutionNotes: resolution_notes.trim(),
          resolvedBy: staffUser?.name || staffUser?.email || 'Takhleeq Management'
        });
      } catch (e) {
        console.error('Failed to send warning resolution email:', e);
      }
    }

    return res.json({
      success: true,
      message: `Warning #${warningId} marked as ${status}.${emailSent ? ' Notification email sent to founder.' : ''}`,
      warning: updatedWarning,
      emailSent
    });
  } catch (err: any) {
    console.error('resolveStartupWarning error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update warning status' });
  }
};

// 14. ADMIN COMPREHENSIVE UPDATE (Password, Status Kick/Pause/Active, Stage, Details + Email Notification)
export const adminUpdateStartupProfile = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff/admin can modify startup details.' });
    }

    const { id } = req.params;
    const profileId = parseInt(id);
    const adminEmail = (req as any).currentUser?.email || (req as any).user?.email || 'admin@takhleeq.pk';
    const adminUserId = (req as any).currentUser?.id || (req as any).user?.id || null;

    const profileRes = await query(`
      SELECT sp.*, a.email as founder_email, a.name as founder_name, a.tracking_token
      FROM startup_profiles sp
      LEFT JOIN applicants a ON sp.applicant_id = a.id
      WHERE sp.id = $1;
    `, [profileId]);

    if (!profileRes.rows || profileRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Startup profile not found' });
    }

    const profile = profileRes.rows[0];
    const body = req.body || {};

    let passwordChanged = false;
    let programStatusChanged = false;
    let stageChanged = false;
    const otherChanges: string[] = [];

    // 1. Password Update
    if (body.founder_password && String(body.founder_password).trim().length > 0) {
      const newPass = String(body.founder_password).trim();
      if (profile.applicant_id) {
        await query(`UPDATE applicants SET founder_password = $1 WHERE id = $2;`, [newPass, profile.applicant_id]);
      }
      passwordChanged = true;
      await query(`
        INSERT INTO startup_audit_logs (startup_profile_id, changed_by_user_id, changed_by_email, field_name, old_value, new_value)
        VALUES ($1, $2, $3, 'founder_password', '***', '***');
      `, [profileId, adminUserId, adminEmail]);
    }

    // 2. Program Status Update (ACTIVE, PAUSED / Temporarily Blocked, KICKED_OUT / Terminated)
    const oldProgramStatus = profile.program_status || 'ACTIVE';
    if (body.program_status && String(body.program_status).toUpperCase() !== String(oldProgramStatus).toUpperCase()) {
      const newStatus = String(body.program_status).toUpperCase();
      await query(`UPDATE startup_profiles SET program_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`, [newStatus, profileId]);
      if (profile.applicant_id) {
        await query(`UPDATE applicants SET program_status = $1 WHERE id = $2;`, [newStatus, profile.applicant_id]);
      }
      programStatusChanged = true;
      profile.program_status = newStatus;
      await query(`
        INSERT INTO startup_audit_logs (startup_profile_id, changed_by_user_id, changed_by_email, field_name, old_value, new_value)
        VALUES ($1, $2, $3, 'program_status', $4, $5);
      `, [profileId, adminUserId, adminEmail, oldProgramStatus, newStatus]);
    }

    // 3. Stage Progression Update
    const oldStage = profile.current_progress_stage || 'IDEA_STAGE';
    if (body.current_progress_stage && String(body.current_progress_stage).toUpperCase() !== String(oldStage).toUpperCase()) {
      const newStage = String(body.current_progress_stage).toUpperCase();
      await query(`UPDATE startup_profiles SET current_progress_stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`, [newStage, profileId]);
      if (profile.applicant_id) {
        await query(`UPDATE applicants SET stage = $1 WHERE id = $2;`, [newStage, profile.applicant_id]);
      }
      await query(`
        INSERT INTO startup_stage_history (startup_profile_id, previous_stage, new_stage, change_date, updated_by_user_id, updated_by_email, comments)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6);
      `, [profileId, oldStage, newStage, adminUserId, adminEmail, body.admin_notes || 'Admin stage progression']);
      stageChanged = true;
      profile.current_progress_stage = newStage;
      await query(`
        INSERT INTO startup_audit_logs (startup_profile_id, changed_by_user_id, changed_by_email, field_name, old_value, new_value)
        VALUES ($1, $2, $3, 'current_progress_stage', $4, $5);
      `, [profileId, adminUserId, adminEmail, oldStage, newStage]);
    }

    // 4. Other Profile Fields Updates
    const profileFields = ['startup_name', 'description', 'industry_id', 'website', 'team_size', 'revenue_status', 'monthly_revenue', 'annual_recurring_revenue', 'funding_status', 'funding_raised', 'pitch_deck_url'];
    for (const f of profileFields) {
      if (body[f] !== undefined && String(body[f]) !== String(profile[f] ?? '')) {
        otherChanges.push(`${f.replace(/_/g, ' ')}: changed from "${profile[f] || 'N/A'}" to "${body[f]}"`);
        await query(`UPDATE startup_profiles SET ${f} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`, [body[f], profileId]);
        await query(`
          INSERT INTO startup_audit_logs (startup_profile_id, changed_by_user_id, changed_by_email, field_name, old_value, new_value)
          VALUES ($1, $2, $3, $4, $5, $6);
        `, [profileId, adminUserId, adminEmail, f, String(profile[f] ?? ''), String(body[f])]);
      }
    }

    // Dispatch Email Notification to Founder
    if (passwordChanged || programStatusChanged || stageChanged || otherChanges.length > 0 || body.admin_notes) {
      try {
        await sendStartupAdminUpdateEmail({
          founderName: profile.founder_name || 'Founder',
          founderEmail: profile.founder_email,
          startupName: profile.startup_name,
          trackingToken: profile.tracking_token,
          updatedBy: adminEmail,
          passwordChanged,
          newPassword: body.founder_password,
          programStatusChanged,
          oldStatus: oldProgramStatus,
          newStatus: profile.program_status,
          stageChanged,
          oldStage,
          newStage: profile.current_progress_stage,
          otherChanges,
          adminNotes: body.admin_notes
        });
      } catch (emailErr) {
        console.error('Failed to send startup update notification email:', emailErr);
      }
    }

    return res.json({
      success: true,
      message: 'Startup details updated successfully and notification email dispatched to founder.',
      data: profile
    });
  } catch (err: any) {
    console.error('adminUpdateStartupProfile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to save admin startup updates' });
  }
};
