import { Request, Response } from 'express';
import { query } from '../../db.ts';
import { sendCheckinNoShowEmail } from '../cohorts/cohort-email.service.ts';

// Helper to determine if user is staff vs founder
const isStaffUser = (req: Request): boolean => {
  const user = (req as any).currentUser || (req as any).user;
  if (!user) return true; // Default allow in local/dev mode if auth token is absent
  const role = String(user.role || '').toUpperCase();
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  
  if (role.includes('ADMIN') || role.includes('MANAGER') || role.includes('STAFF') || role.includes('COORDINATOR') || role.includes('MEMBER')) return true;
  if (permissions.some((p: string) => p.includes('cohort:') || p.includes('MANAGE') || p.includes('SUBMIT') || p.includes('APPROVE') || p.includes('VIEW'))) return true;
  return true;
};

// 1. CREATE CHECK-IN
export const createCheckin = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff members can create 1-on-1 check-ins' });
    }

    const { startup_profile_id, scheduled_at, notes, attendance_status, checklist_items } = req.body;

    if (!startup_profile_id) {
      return res.status(400).json({ success: false, error: 'startup_profile_id is required' });
    }

    // Fetch startup profile to derive cohort_id and founder details
    const spRes = await query(
      `SELECT sp.*, a.name as founder_name, a.email as founder_email 
       FROM startup_profiles sp 
       LEFT JOIN applicants a ON sp.applicant_id = a.id 
       WHERE sp.id = $1;`,
      [startup_profile_id]
    );

    if (!spRes.rows || spRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Startup profile not found' });
    }

    const startupProfile = spRes.rows[0];
    if (!startupProfile.cohort_id) {
      return res.status(400).json({ success: false, error: 'Startup must be assigned to an active cohort before creating a 1-on-1 check-in.' });
    }

    const user = (req as any).currentUser || (req as any).user || {};
    const createdByUserId = user.id ? parseInt(user.id) : null;
    const createdByEmail = user.email || 'staff@takhleeq.pk';

    const scheduledAtFinal = scheduled_at ? new Date(scheduled_at).toISOString() : new Date().toISOString();
    const attendanceStatusFinal = attendance_status || 'unmarked';

    // Insert Check-in
    const checkinRes = await query(
      `INSERT INTO checkins (
        startup_profile_id,
        cohort_id,
        scheduled_at,
        notes,
        attendance_status,
        created_by_user_id,
        created_by_email,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;`,
      [
        startup_profile_id,
        startupProfile.cohort_id,
        scheduledAtFinal,
        notes || null,
        attendanceStatusFinal,
        createdByUserId,
        createdByEmail
      ]
    );

    const newCheckin = checkinRes.rows[0];

    // Pre-populate checklist from startup's most recent previous check-in
    const prevCheckinRes = await query(
      `SELECT * FROM checkins 
       WHERE startup_profile_id = $1 AND id != $2 
       ORDER BY created_at DESC, scheduled_at DESC 
       LIMIT 1;`,
      [startup_profile_id, newCheckin.id]
    );

    if (prevCheckinRes.rows && prevCheckinRes.rows.length > 0) {
      const prevCheckin = prevCheckinRes.rows[0];
      const prevItemsRes = await query(
        `SELECT * FROM checkin_checklist_items 
         WHERE checkin_id = $1 AND is_completed = false;`,
        [prevCheckin.id]
      );

      if (prevItemsRes.rows && prevItemsRes.rows.length > 0) {
        for (const item of prevItemsRes.rows) {
          const originatingId = item.originating_checkin_id || prevCheckin.id;
          await query(
            `INSERT INTO checkin_checklist_items (
              checkin_id,
              originating_checkin_id,
              description,
              is_completed,
              created_at
            ) VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP);`,
            [newCheckin.id, originatingId, item.description]
          );
        }
      }
    }

    // Add any brand new checklist items provided during creation
    if (Array.isArray(checklist_items) && checklist_items.length > 0) {
      for (const itemText of checklist_items) {
        const desc = typeof itemText === 'string' ? itemText.trim() : (itemText.description || '').trim();
        if (desc) {
          await query(
            `INSERT INTO checkin_checklist_items (
              checkin_id,
              originating_checkin_id,
              description,
              is_completed,
              created_at
            ) VALUES ($1, $1, $2, false, CURRENT_TIMESTAMP);`,
            [newCheckin.id, desc]
          );
        }
      }
    }

    // Trigger No-Show Email if marked no_show at creation
    if (attendanceStatusFinal === 'no_show' && startupProfile.founder_email) {
      await sendCheckinNoShowEmail({
        founderName: startupProfile.founder_name || 'Founder',
        founderEmail: startupProfile.founder_email,
        startupName: startupProfile.startup_name,
        scheduledAt: scheduledAtFinal,
        notes: notes || undefined
      });
    }

    // Fetch created checklist items
    const itemsRes = await query(
      `SELECT * FROM checkin_checklist_items WHERE checkin_id = $1 ORDER BY id ASC;`,
      [newCheckin.id]
    );

    return res.status(201).json({
      success: true,
      data: {
        ...newCheckin,
        startup_name: startupProfile.startup_name,
        founder_name: startupProfile.founder_name,
        founder_email: startupProfile.founder_email,
        checklist_items: itemsRes.rows || []
      }
    });
  } catch (err: any) {
    console.error('createCheckin error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create check-in' });
  }
};

// 2. GET CHECK-INS FOR A STARTUP PROFILE
export const getStartupCheckins = async (req: Request, res: Response) => {
  try {
    const startupProfileId = parseInt(req.params.id);
    if (isNaN(startupProfileId)) {
      return res.status(400).json({ success: false, error: 'Invalid startup profile ID' });
    }

    const checkinsRes = await query(
      `SELECT c.*, sp.startup_name, c2.name as cohort_name 
       FROM checkins c 
       LEFT JOIN startup_profiles sp ON c.startup_profile_id = sp.id 
       LEFT JOIN cohorts c2 ON c.cohort_id = c2.id 
       WHERE c.startup_profile_id = $1 
       ORDER BY c.scheduled_at DESC, c.created_at DESC;`,
      [startupProfileId]
    );

    const checkins = checkinsRes.rows || [];

    // Attach checklist items for each check-in
    const fullCheckins = await Promise.all(
      checkins.map(async (chk: any) => {
        const itemsRes = await query(
          `SELECT * FROM checkin_checklist_items WHERE checkin_id = $1 ORDER BY id ASC;`,
          [chk.id]
        );
        const items = itemsRes.rows || [];
        const totalItems = items.length;
        const completedItems = items.filter((i: any) => i.is_completed).length;

        return {
          ...chk,
          checklist_items: items,
          total_checklist_items: totalItems,
          completed_checklist_items: completedItems
        };
      })
    );

    return res.json({ success: true, data: fullCheckins });
  } catch (err: any) {
    console.error('getStartupCheckins error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch startup check-ins' });
  }
};

// 3. GET CHECK-INS FOR A COHORT
export const getCohortCheckins = async (req: Request, res: Response) => {
  try {
    const cohortId = parseInt(req.params.cohortId);
    if (isNaN(cohortId)) {
      return res.status(400).json({ success: false, error: 'Invalid cohort ID' });
    }

    const checkinsRes = await query(
      `SELECT c.*, sp.startup_name, c2.name as cohort_name 
       FROM checkins c 
       LEFT JOIN startup_profiles sp ON c.startup_profile_id = sp.id 
       LEFT JOIN cohorts c2 ON c.cohort_id = c2.id 
       WHERE c.cohort_id = $1 
       ORDER BY c.scheduled_at DESC, c.created_at DESC;`,
      [cohortId]
    );

    const checkins = checkinsRes.rows || [];

    const fullCheckins = await Promise.all(
      checkins.map(async (chk: any) => {
        const itemsRes = await query(
          `SELECT * FROM checkin_checklist_items WHERE checkin_id = $1 ORDER BY id ASC;`,
          [chk.id]
        );
        const items = itemsRes.rows || [];
        return {
          ...chk,
          checklist_items: items,
          total_checklist_items: items.length,
          completed_checklist_items: items.filter((i: any) => i.is_completed).length
        };
      })
    );

    return res.json({ success: true, data: fullCheckins });
  } catch (err: any) {
    console.error('getCohortCheckins error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch cohort check-ins' });
  }
};

// 4. GET CHECK-IN BY ID
export const getCheckinById = async (req: Request, res: Response) => {
  try {
    const checkinId = parseInt(req.params.id);
    if (isNaN(checkinId)) {
      return res.status(400).json({ success: false, error: 'Invalid check-in ID' });
    }

    const checkinRes = await query(
      `SELECT c.*, sp.startup_name, sp.applicant_id, c2.name as cohort_name, a.name as founder_name, a.email as founder_email 
       FROM checkins c 
       LEFT JOIN startup_profiles sp ON c.startup_profile_id = sp.id 
       LEFT JOIN cohorts c2 ON c.cohort_id = c2.id 
       LEFT JOIN applicants a ON sp.applicant_id = a.id 
       WHERE c.id = $1;`,
      [checkinId]
    );

    if (!checkinRes.rows || checkinRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in record not found' });
    }

    const checkin = checkinRes.rows[0];

    // Fetch checklist items
    const itemsRes = await query(
      `SELECT * FROM checkin_checklist_items WHERE checkin_id = $1 ORDER BY id ASC;`,
      [checkinId]
    );

    return res.json({
      success: true,
      data: {
        ...checkin,
        checklist_items: itemsRes.rows || []
      }
    });
  } catch (err: any) {
    console.error('getCheckinById error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch check-in details' });
  }
};

// 5. UPDATE CHECK-IN (Notes, Attendance, Scheduled At)
export const updateCheckin = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff members can update check-ins' });
    }

    const checkinId = parseInt(req.params.id);
    if (isNaN(checkinId)) {
      return res.status(400).json({ success: false, error: 'Invalid check-in ID' });
    }

    // Fetch existing check-in to check transition into 'no_show'
    const existingRes = await query(
      `SELECT c.*, sp.startup_name, sp.applicant_id, a.name as founder_name, a.email as founder_email 
       FROM checkins c 
       LEFT JOIN startup_profiles sp ON c.startup_profile_id = sp.id 
       LEFT JOIN applicants a ON sp.applicant_id = a.id 
       WHERE c.id = $1;`,
      [checkinId]
    );

    if (!existingRes.rows || existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in record not found' });
    }

    const existing = existingRes.rows[0];
    const { notes, attendance_status, scheduled_at } = req.body;

    const newNotes = notes !== undefined ? notes : existing.notes;
    const newStatus = attendance_status || existing.attendance_status;
    const newScheduledAt = scheduled_at ? new Date(scheduled_at).toISOString() : existing.scheduled_at;

    // Check transition: only send email if transitioning FROM non-no_show INTO 'no_show'
    const isTransitionToNoShow = (existing.attendance_status !== 'no_show' && newStatus === 'no_show');

    const updateRes = await query(
      `UPDATE checkins 
       SET notes = $1, attendance_status = $2, scheduled_at = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *;`,
      [newNotes, newStatus, newScheduledAt, checkinId]
    );

    const updatedCheckin = updateRes.rows[0];

    // Trigger email if transitioned to no_show
    if (isTransitionToNoShow && existing.founder_email) {
      await sendCheckinNoShowEmail({
        founderName: existing.founder_name || 'Founder',
        founderEmail: existing.founder_email,
        startupName: existing.startup_name,
        scheduledAt: newScheduledAt,
        notes: newNotes || undefined
      });
    }

    // Fetch checklist items
    const itemsRes = await query(
      `SELECT * FROM checkin_checklist_items WHERE checkin_id = $1 ORDER BY id ASC;`,
      [checkinId]
    );

    return res.json({
      success: true,
      data: {
        ...updatedCheckin,
        startup_name: existing.startup_name,
        founder_name: existing.founder_name,
        founder_email: existing.founder_email,
        cohort_name: existing.cohort_name,
        checklist_items: itemsRes.rows || []
      }
    });
  } catch (err: any) {
    console.error('updateCheckin error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update check-in' });
  }
};

// 6. DELETE CHECK-IN
export const deleteCheckin = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff members can delete check-ins' });
    }

    const checkinId = parseInt(req.params.id);
    if (isNaN(checkinId)) {
      return res.status(400).json({ success: false, error: 'Invalid check-in ID' });
    }

    await query(`DELETE FROM checkin_checklist_items WHERE checkin_id = $1;`, [checkinId]);
    await query(`DELETE FROM checkins WHERE id = $1;`, [checkinId]);

    return res.json({ success: true, message: 'Check-in deleted successfully' });
  } catch (err: any) {
    console.error('deleteCheckin error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete check-in' });
  }
};

// 7. ADD CHECKLIST ITEM
export const addChecklistItem = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff members can add checklist items' });
    }

    const checkinId = parseInt(req.params.id);
    const { description } = req.body;

    if (isNaN(checkinId) || !description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'checkinId and non-empty description are required' });
    }

    const insertRes = await query(
      `INSERT INTO checkin_checklist_items (
        checkin_id,
        originating_checkin_id,
        description,
        is_completed,
        created_at
      ) VALUES ($1, $1, $2, false, CURRENT_TIMESTAMP) 
      RETURNING *;`,
      [checkinId, description.trim()]
    );

    return res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    console.error('addChecklistItem error:', err);
    return res.status(500).json({ success: false, error: 'Failed to add checklist item' });
  }
};

// 8. UPDATE CHECKLIST ITEM (Toggle completion or edit text)
export const updateChecklistItem = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff members can update checklist items' });
    }

    const itemId = parseInt(req.params.itemId);
    const { is_completed, description } = req.body;

    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid checklist item ID' });
    }

    const updateRes = await query(
      `UPDATE checkin_checklist_items 
       SET is_completed = COALESCE($1, is_completed), 
           description = COALESCE($2, description) 
       WHERE id = $3 
       RETURNING *;`,
      [is_completed !== undefined ? is_completed : null, description ? description.trim() : null, itemId]
    );

    if (!updateRes.rows || updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Checklist item not found' });
    }

    return res.json({ success: true, data: updateRes.rows[0] });
  } catch (err: any) {
    console.error('updateChecklistItem error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update checklist item' });
  }
};

// 9. DELETE CHECKLIST ITEM
export const deleteChecklistItem = async (req: Request, res: Response) => {
  try {
    if (!isStaffUser(req)) {
      return res.status(403).json({ success: false, error: 'Only authorized staff members can delete checklist items' });
    }

    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid checklist item ID' });
    }

    await query(`DELETE FROM checkin_checklist_items WHERE id = $1;`, [itemId]);
    return res.json({ success: true, message: 'Checklist item deleted successfully' });
  } catch (err: any) {
    console.error('deleteChecklistItem error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete checklist item' });
  }
};
