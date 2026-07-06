import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/types/index.ts';
import { query, mapAudit } from '../../db.ts';

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logsRes = await query(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 1000`);
    const logs = logsRes.rows.map(mapAudit);
    res.json(logs);
  } catch (err) {
    console.error('Failed to query audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
};

export const getReports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Get Booking States Breakdown
    const statusRes = await query(
      `SELECT status, COUNT(*) as count 
       FROM bookings 
       GROUP BY status`
    );
    const statusBreakdown: Record<string, number> = {};
    statusRes.rows.forEach(r => {
      statusBreakdown[r.status] = parseInt(r.count);
    });

    // 2. Get Rooms Reservation Frequency
    const roomsRes = await query(
      `SELECT r.name, COUNT(b.id) as count
       FROM rooms r
       LEFT JOIN bookings b ON r.id = b.room_id AND b.status = 'APPROVED'
       GROUP BY r.name
       ORDER BY count DESC`
    );
    const popularRooms = roomsRes.rows.map(r => ({
      room: r.name,
      count: parseInt(r.count)
    }));

    // 3. Get Active Bans Counts
    const activeBansRes = await query(
      `SELECT COUNT(*) as count FROM ban_records WHERE is_active = TRUE`
    );
    const activeBansCount = parseInt(activeBansRes.rows[0].count);

    // 4. Get Conflict Occurrence Count
    const conflictsRes = await query(
      `SELECT COUNT(*) as count FROM bookings WHERE conflict_status = 'CONFLICT_DETECTED'`
    );
    const conflictCount = parseInt(conflictsRes.rows[0].count);

    // 5. Get Bookings distribution by Type
    const typeRes = await query(
      `SELECT booking_type, COUNT(*) as count
       FROM bookings
       WHERE status = 'APPROVED'
       GROUP BY booking_type`
    );
    const bookingTypeStats = typeRes.rows.map(r => ({
      type: r.booking_type,
      count: parseInt(r.count)
    }));

    res.json({
      totalSubmittedBookings: Object.values(statusBreakdown).reduce((a, b) => a + b, 0),
      statusBreakdown,
      popularRooms,
      activeBansCount,
      conflictCount,
      bookingTypeStats
    });

  } catch (err) {
    console.error('Failed to compile operational report metrics:', err);
    res.status(500).json({ error: 'Failed to compile report statistics.' });
  }
};
