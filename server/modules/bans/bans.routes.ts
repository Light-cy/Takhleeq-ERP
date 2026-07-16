import { Router, Response } from 'express';
import { query, logAudit, mapBan, calculateBanExpiry, autoExpireBans } from '../../db.ts';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../../middleware/auth.ts';

const router = Router();

// Retrieve all bans in the system
router.get('/bans', requireAuth, (req: AuthenticatedRequest, res: Response, next) => {
  if (req.currentUser?.role === 'Administrator' || 
      req.currentUser?.permissions.includes('ISSUE_BAN') || 
      req.currentUser?.permissions.includes('LIFT_BAN') ||
      req.currentUser?.permissions.includes('MANAGE_BANS')) {
    return next();
  }
  return res.status(401).json({ error: "Privilege Restriction: Missing permission to view bans." });
}, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Run the automatic clean-up/expiration of bans first
    await autoExpireBans();

    const bansRes = await query(
      `SELECT b.*, u1.full_name as issuer_name, u2.full_name as lifter_name
       FROM ban_records b
       LEFT JOIN users u1 ON b.issued_by = u1.id
       LEFT JOIN users u2 ON b.lifted_by = u2.id
       ORDER BY b.id DESC`
    );
    const bans = bansRes.rows.map(mapBan);
    res.json(bans);
  } catch (err) {
    console.error('Failed to query bans:', err);
    res.status(500).json({ error: 'Failed to retrieve ban records.' });
  }
});

// Issue a new Ban (with Privilege/Ceiling verification)
router.post('/bans', requireAuth, (req: AuthenticatedRequest, res: Response, next) => {
  if (req.currentUser?.role === 'Administrator' || 
      req.currentUser?.permissions.includes('ISSUE_BAN')) {
    return next();
  }
  return res.status(401).json({ error: "Privilege Restriction: Missing permission to issue bans." });
}, async (req: AuthenticatedRequest, res: Response) => {
  const staff = req.currentUser!;
  let { email, name, reason, durationType, customDays, duration } = req.body;

  // Normalize duration to durationType and customDays if durationType is missing
  if (!durationType && duration) {
    const dLower = String(duration).toLowerCase().trim();
    if (dLower === '3 days' || dLower === '3_days') {
      durationType = '3 days';
    } else if (dLower === '7 days' || dLower === '7_days') {
      durationType = '7 days';
    } else if (dLower === '30 days' || dLower === '30_days') {
      durationType = '30 days';
    } else if (dLower === '90 days' || dLower === '90_days') {
      durationType = '90 days';
    } else if (dLower === 'permanent') {
      durationType = 'Permanent';
    } else if (dLower.startsWith('custom') || dLower.includes('days')) {
      durationType = 'custom';
      const match = dLower.match(/\d+/);
      if (match) {
        customDays = parseInt(match[0]);
      }
    } else {
      durationType = duration;
    }
  }

  if (!email || !name || !reason || !durationType) {
    return res.status(400).json({ error: 'Missing required parameters: email, name, reason, durationType/duration' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Validate that the email exists in the system before allowing ban issuance (per FRD)
    const existenceCheck = await query(
      `SELECT 1 FROM bookings WHERE LOWER(requester_email) = $1
       UNION
       SELECT 1 FROM users WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    if (existenceCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: `Validation Error: The email '${cleanEmail}' has no booking history or registered account in the system — cannot issue a ban.` 
      });
    }

    // Admins cannot be banned, and no admin can ban another admin
    const targetAdminCheck = await query(
      `SELECT u.id, u.email, u.full_name, u.is_active, r.name as role_name
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE LOWER(u.email) = $1`,
      [cleanEmail]
    );

    if (targetAdminCheck.rows.length > 0) {
      const targetRoleName = targetAdminCheck.rows[0].role_name || '';
      if (targetRoleName.toLowerCase() === 'administrator') {
        return res.status(400).json({ 
          error: "Validation Error: Administrators cannot be suspended or banned, and no Administrator can ban another Administrator." 
        });
      }
    }

    // 1. Fetch staff role's ban duration ceiling
    const staffCeilingRes = await query(
      `SELECT r.ban_duration_ceiling 
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [staff.id]
    );
    
    // Default ceiling to 0 (cannot ban) if not specified, or allow if Admin
    const rawCeiling = staffCeilingRes.rows[0]?.ban_duration_ceiling; // '7', '30', '90', 'permanent', or NULL
    
    let staffCeilingDays = 0;
    if (staff.role === 'Administrator' || rawCeiling === 'permanent' || !rawCeiling) {
      staffCeilingDays = 999999; // Represents permanent/unlimited capability
    } else {
      staffCeilingDays = parseInt(rawCeiling);
    }

    // 2. Parse requested days
    let reqDays = 0;
    if (durationType === '3_days' || durationType === '3 days') {
      reqDays = 3;
    } else if (durationType === '7_days' || durationType === '7 days') {
      reqDays = 7;
    } else if (durationType === '30_days' || durationType === '30 days') {
      reqDays = 30;
    } else if (durationType === '90_days' || durationType === '90 days') {
      reqDays = 90;
    } else if (durationType === 'permanent' || durationType === 'Permanent') {
      reqDays = 999999;
    } else if (durationType === 'custom') {
      reqDays = parseInt(customDays || '0');
    } else {
      return res.status(400).json({ error: 'Invalid durationType specified.' });
    }

    // 3. Check ceiling limit
    if (reqDays > staffCeilingDays) {
      return res.status(401).json({ 
        error: `Privilege Restriction: Your role's ban ceiling is ${staffCeilingDays === 999999 ? 'Permanent' : staffCeilingDays + ' days'}. You cannot issue a ban of ${reqDays === 999999 ? 'Permanent' : reqDays + ' days'}.` 
      });
    }

    // 4. Calculate expiresAt timestamp
    const expiresAt = calculateBanExpiry(
      durationType === 'custom' ? `Custom ${reqDays} days` : durationType
    );

    // 5. Check if user already has an active ban
    const activeCheck = await query(
      `SELECT id FROM ban_records WHERE LOWER(email) = $1 AND is_active = TRUE`,
      [cleanEmail]
    );
    if (activeCheck.rows.length > 0) {
      return res.status(400).json({ error: `An active ban record already exists for the email '${cleanEmail}'.` });
    }

    // 6. Insert new ban record
    const insertRes = await query(
      `INSERT INTO ban_records (
        email, full_name, reason, duration_type, custom_days, expires_at, is_active, issued_by
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
       RETURNING *`,
      [
        cleanEmail, name.trim(), reason.trim(), durationType, 
        durationType === 'custom' ? reqDays : null, expiresAt, staff.id
      ]
    );

    // Re-fetch complete ban row with relations
    const finalBanRes = await query(
      `SELECT b.*, u.full_name as issuer_name
       FROM ban_records b
       LEFT JOIN users u ON b.issued_by = u.id
       WHERE b.id = $1`,
      [insertRes.rows[0].id]
    );

    const newBan = mapBan(finalBanRes.rows[0]);

    await logAudit(`Issued Ban Record to ${name} (${cleanEmail}). Duration: ${durationType}`, 'ban', String(insertRes.rows[0].id), staff.email, null, newBan);

    res.json({ success: true, ban: newBan });
  } catch (err) {
    console.error('Failed to issue ban:', err);
    res.status(500).json({ error: 'Internal Server Error while issuing ban.' });
  }
});

// Lift an active Ban
router.post('/bans/:id/lift', requireAuth, (req: AuthenticatedRequest, res: Response, next) => {
  if (req.currentUser?.role === 'Administrator') {
    return next();
  }
  return res.status(401).json({ error: "Privilege Restriction: Only Administrators can lift active bans." });
}, async (req: AuthenticatedRequest, res: Response) => {
  const staff = req.currentUser!;
  const banId = req.params.id;
  const { reason } = req.body;

  if (!reason || String(reason).trim() === '') {
    return res.status(400).json({ error: 'Lifting Error: A written reason is mandatory to lift a ban.' });
  }

  try {
    const banRes = await query(`SELECT * FROM ban_records WHERE id = $1`, [parseInt(banId)]);
    if (banRes.rows.length === 0) {
      return res.status(404).json({ error: 'Ban record not found.' });
    }
    const banRow = banRes.rows[0];

    if (!banRow.is_active) {
      return res.status(400).json({ error: 'Lifting Error: This ban record is already inactive.' });
    }

    const oldBan = mapBan(banRow);

    // Update Ban record to lifted (is_active = FALSE)
    await query(
      `UPDATE ban_records 
       SET is_active = FALSE, lifted_by = $1, lifted_at = CURRENT_TIMESTAMP, lifting_reason = $2
       WHERE id = $3`,
      [staff.id, reason.trim(), parseInt(banId)]
    );

    // Re-fetch updated ban record
    const finalBanRes = await query(
      `SELECT b.*, u1.full_name as issuer_name, u2.full_name as lifter_name
       FROM ban_records b
       LEFT JOIN users u1 ON b.issued_by = u1.id
       LEFT JOIN users u2 ON b.lifted_by = u2.id
       WHERE b.id = $1`,
      [parseInt(banId)]
    );

    const updatedBan = mapBan(finalBanRes.rows[0]);

    await logAudit(`Lifted Ban on ${updatedBan.name} (${updatedBan.email}). Reason: ${reason}`, 'ban', banId, staff.email, oldBan, updatedBan);

    res.json({ success: true, ban: updatedBan });
  } catch (err) {
    console.error('Failed to lift ban:', err);
    res.status(500).json({ error: 'Internal Server Error while lifting ban.' });
  }
});

export default router;
