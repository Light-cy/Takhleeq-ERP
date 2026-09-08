import { Router, Response } from 'express';
import { query, logAudit } from '../../db.ts';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../../middleware/auth.ts';

const router = Router();

// Retrieve all booking types (both active and inactive)
router.get('/booking-types', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(`SELECT * FROM booking_types ORDER BY id ASC`);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Failed to retrieve booking types:', err);
    res.status(500).json({ error: 'Failed to retrieve booking types.' });
  }
});

// Create a new booking type (Admin only)
router.post('/booking-types', requireAuth, requirePermission('MANAGE_BOOKING_TYPES'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, isActive } = req.body;
  const admin = req.currentUser!;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Booking type name is required.' });
  }

  try {
    // Check for duplicate name
    const dupRes = await query(`SELECT id FROM booking_types WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
    if (dupRes.rows.length > 0) {
      return res.status(400).json({ error: `A booking type named '${name}' already exists.` });
    }

    const is_active = isActive !== undefined ? !!isActive : true;
    const result = await query(
      `INSERT INTO booking_types (name, description, is_active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), description || '', is_active]
    );

    const newBT = result.rows[0];

    // Automatically sync new booking type with existing rooms so it immediately reflects in Room Management
    try {
      const roomsRes = await query(`SELECT * FROM rooms ORDER BY id ASC`);
      for (const room of roomsRes.rows) {
        let types: string[] = [];
        if (room.allowed_booking_types) {
          try {
            types = typeof room.allowed_booking_types === 'string'
              ? JSON.parse(room.allowed_booking_types)
              : room.allowed_booking_types;
          } catch {
            types = [];
          }
        }
        const alreadyExists = types.some(
          t => t.trim().toLowerCase() === newBT.name.trim().toLowerCase()
        );
        if (!alreadyExists) {
          types.push(newBT.name.trim());
          await query(
            `UPDATE rooms SET allowed_booking_types = $1 WHERE id = $2`,
            [JSON.stringify(types), room.id]
          );
        }
      }
    } catch (roomSyncErr) {
      console.error('Failed to sync new booking type to rooms:', roomSyncErr);
    }

    // Log administrative action in audits
    await logAudit(
      `Created booking type: ${name.trim()}`,
      'booking_type',
      String(newBT.id),
      admin.email,
      null,
      newBT
    );

    res.status(201).json(newBT);
  } catch (err: any) {
    console.error('Failed to create booking type:', err);
    res.status(500).json({ error: 'Failed to create booking type due to a database error.' });
  }
});

// Update a booking type (Admin only)
router.put('/booking-types/:id', requireAuth, requirePermission('MANAGE_BOOKING_TYPES'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, isActive } = req.body;
  const id = parseInt(req.params.id);
  const admin = req.currentUser!;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid booking type ID.' });
  }

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Booking type name is required.' });
  }

  try {
    // Check if it exists
    const existingRes = await query(`SELECT * FROM booking_types WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking type not found.' });
    }
    const oldBT = existingRes.rows[0];

    // Check for duplicates if name changed
    if (oldBT.name.toLowerCase() !== name.trim().toLowerCase()) {
      const dupRes = await query(`SELECT id FROM booking_types WHERE LOWER(name) = LOWER($1) AND id <> $2`, [name.trim(), id]);
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ error: `Another booking type named '${name}' already exists.` });
      }
    }

    const is_active = isActive !== undefined ? !!isActive : true;
    const result = await query(
      `UPDATE booking_types
       SET name = $1, description = $2, is_active = $3
       WHERE id = $4
       RETURNING *`,
      [name.trim(), description || '', is_active, id]
    );

    const updatedBT = result.rows[0];

    // If the name changed, update the name across all rooms' allowed_booking_types
    if (oldBT.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
      try {
        const roomsRes = await query(`SELECT * FROM rooms ORDER BY id ASC`);
        for (const room of roomsRes.rows) {
          let types: string[] = [];
          if (room.allowed_booking_types) {
            try {
              types = typeof room.allowed_booking_types === 'string'
                ? JSON.parse(room.allowed_booking_types)
                : room.allowed_booking_types;
            } catch {
              types = [];
            }
          }
          let modified = false;
          types = types.map(t => {
            if (t.trim().toLowerCase() === oldBT.name.trim().toLowerCase()) {
              modified = true;
              return name.trim();
            }
            return t;
          });
          if (modified) {
            await query(
              `UPDATE rooms SET allowed_booking_types = $1 WHERE id = $2`,
              [JSON.stringify(types), room.id]
            );
          }
        }
      } catch (roomSyncErr) {
        console.error('Failed to sync updated booking type name to rooms:', roomSyncErr);
      }
    }

    // Log administrative action in audits
    await logAudit(
      `Updated booking type: ${name.trim()}`,
      'booking_type',
      String(id),
      admin.email,
      oldBT,
      updatedBT
    );

    res.json(updatedBT);
  } catch (err: any) {
    console.error('Failed to update booking type:', err);
    res.status(500).json({ error: 'Failed to update booking type due to a database error.' });
  }
});

// Delete a booking type (Admin only)
router.delete('/booking-types/:id', requireAuth, requirePermission('MANAGE_BOOKING_TYPES'), async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const admin = req.currentUser!;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid booking type ID.' });
  }

  try {
    // Check if it exists
    const existingRes = await query(`SELECT * FROM booking_types WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking type not found.' });
    }
    const oldBT = existingRes.rows[0];

    // Delete the booking type
    const result = await query(`DELETE FROM booking_types WHERE id = $1 RETURNING *`, [id]);

    // Automatically remove this deleted booking type from ALL rooms' allowed_booking_types
    try {
      const roomsRes = await query(`SELECT * FROM rooms ORDER BY id ASC`);
      for (const room of roomsRes.rows) {
        let types: string[] = [];
        if (room.allowed_booking_types) {
          try {
            types = typeof room.allowed_booking_types === 'string'
              ? JSON.parse(room.allowed_booking_types)
              : room.allowed_booking_types;
          } catch {
            types = [];
          }
        }
        const filtered = types.filter(
          t => t.trim().toLowerCase() !== oldBT.name.trim().toLowerCase()
        );
        if (filtered.length !== types.length) {
          await query(
            `UPDATE rooms SET allowed_booking_types = $1 WHERE id = $2`,
            [JSON.stringify(filtered), room.id]
          );
        }
      }
    } catch (roomSyncErr) {
      console.error('Failed to remove deleted booking type from rooms:', roomSyncErr);
    }

    await logAudit(
      `Deleted booking type: ${oldBT.name}`,
      'booking_type',
      String(id),
      admin.email,
      oldBT,
      null
    );

    res.json({ success: true, message: `Booking type '${oldBT.name}' has been deleted successfully.` });
  } catch (err: any) {
    console.error('Failed to delete booking type:', err);
    res.status(500).json({ error: 'Failed to delete booking type due to a database error.' });
  }
});

export default router;
