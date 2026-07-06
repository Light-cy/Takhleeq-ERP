import { Router, Response } from 'express';
import { query, logAudit, mapRoom } from '../db.ts';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth.ts';

const router = Router();

// Get Room List
router.get('/rooms', async (req, res) => {
  try {
    const roomsRes = await query(`SELECT * FROM rooms ORDER BY id ASC`);
    const rooms = roomsRes.rows.map(mapRoom);
    res.json(rooms);
  } catch (err) {
    console.error('Failed to query rooms:', err);
    res.status(500).json({ error: 'Failed to retrieve rooms.' });
  }
});

// Add Room (Admin only)
router.post('/rooms', requireAuth, requirePermission('MANAGE_USERS'), async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser!;
  const { name, capacity, operatingHours, minBookingDuration, maxBookingDuration, purpose, policies } = req.body;

  if (!name || !capacity || !operatingHours) {
    return res.status(400).json({ error: 'Missing required parameters: name, capacity, operatingHours' });
  }

  try {
    // Check name uniqueness
    const dupRes = await query(`SELECT id FROM rooms WHERE LOWER(name) = LOWER($1)`, [name]);
    if (dupRes.rows.length > 0) {
      return res.status(400).json({ error: `A room named '${name}' already exists.` });
    }

    // Parse operating hours "09:00 - 17:00"
    const hoursParts = operatingHours.split('-');
    if (hoursParts.length !== 2) {
      return res.status(400).json({ error: 'Invalid operatingHours format. Expected format: "HH:MM - HH:MM"' });
    }
    const opStart = hoursParts[0].trim() + ':00';
    const opEnd = hoursParts[1].trim() + ':00';

    const minDur = minBookingDuration ? parseInt(minBookingDuration) : 30;
    const maxDur = maxBookingDuration ? parseInt(maxBookingDuration) : 180;
    const roomPurpose = purpose || 'General use';
    const roomPolicies = policies ? JSON.stringify(policies) : '[]';

    const insertRes = await query(
      `INSERT INTO rooms (name, capacity, operating_hours_start, operating_hours_end, min_duration_minutes, max_duration_minutes, purpose, policies, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING *`,
      [name, parseInt(capacity), opStart, opEnd, minDur, maxDur, roomPurpose, roomPolicies]
    );

    const newRoom = mapRoom(insertRes.rows[0]);

    await logAudit(`Added Room: ${name}`, 'room', String(insertRes.rows[0].id), admin.email, null, newRoom);

    res.json({ success: true, room: newRoom });
  } catch (err) {
    console.error('Failed to create room:', err);
    res.status(500).json({ error: 'Failed to create room due to database error.' });
  }
});

// Update Room Details (Admin only)
router.put('/rooms/:id', requireAuth, requirePermission('MANAGE_USERS'), async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser!;
  const roomId = req.params.id;

  try {
    const roomRes = await query(`SELECT * FROM rooms WHERE id = $1`, [parseInt(roomId)]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const oldRoom = mapRoom(roomRes.rows[0]);

    const { name, capacity, operatingHours, minBookingDuration, maxBookingDuration, purpose, policies, isActive } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let valCounter = 1;

    if (name !== undefined) {
      updates.push(`name = $${valCounter++}`);
      values.push(name);
    }
    if (capacity !== undefined) {
      updates.push(`capacity = $${valCounter++}`);
      values.push(parseInt(capacity));
    }
    if (operatingHours !== undefined) {
      const hoursParts = operatingHours.split('-');
      if (hoursParts.length === 2) {
        updates.push(`operating_hours_start = $${valCounter++}`);
        values.push(hoursParts[0].trim() + ':00');
        updates.push(`operating_hours_end = $${valCounter++}`);
        values.push(hoursParts[1].trim() + ':00');
      } else {
        return res.status(400).json({ error: 'Invalid operatingHours format. Expected "HH:MM - HH:MM"' });
      }
    }
    if (minBookingDuration !== undefined) {
      updates.push(`min_duration_minutes = $${valCounter++}`);
      values.push(parseInt(minBookingDuration));
    }
    if (maxBookingDuration !== undefined) {
      updates.push(`max_duration_minutes = $${valCounter++}`);
      values.push(parseInt(maxBookingDuration));
    }
    if (purpose !== undefined) {
      updates.push(`purpose = $${valCounter++}`);
      values.push(purpose);
    }
    if (policies !== undefined) {
      updates.push(`policies = $${valCounter++}`);
      values.push(JSON.stringify(policies));
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${valCounter++}`);
      values.push(isActive === true || isActive === 'true');
    }

    if (updates.length === 0) {
      return res.json({ success: true, room: oldRoom });
    }

    values.push(parseInt(roomId));
    const updateQuery = `UPDATE rooms SET ${updates.join(', ')} WHERE id = $${valCounter} RETURNING *`;
    const updateRes = await query(updateQuery, values);
    
    const updatedRoom = mapRoom(updateRes.rows[0]);

    await logAudit(`Updated Room: ${updatedRoom.name}`, 'room', roomId, admin.email, oldRoom, updatedRoom);

    res.json({ success: true, room: updatedRoom });
  } catch (err) {
    console.error('Failed to update room:', err);
    res.status(500).json({ error: 'Failed to update room due to database error.' });
  }
});

export default router;
