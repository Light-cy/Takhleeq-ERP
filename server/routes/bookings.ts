import { Router, Response } from 'express';
import { query, logAudit, mapBooking } from '../db.ts';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth.ts';

const router = Router();

// Retrieve all bookings in the system
router.get('/bookings', async (req, res) => {
  try {
    const bookingsRes = await query(
      `SELECT b.*, r.name as room_name, u.full_name as approver_name, cb.booking_id as conflicting_booking_ref
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN users u ON b.approved_by = u.id
       LEFT JOIN bookings cb ON b.conflicting_booking_id = cb.id
       ORDER BY b.id DESC`
    );
    const bookings = bookingsRes.rows.map(mapBooking);
    res.json(bookings);
  } catch (err) {
    console.error('Failed to retrieve bookings:', err);
    res.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
});

// SUBMIT BOOKING (MOD-01A Public and Staff Submission Flow)
router.post('/bookings', async (req, res) => {
  const { 
    name, email, phone, organization, room, 
    date, startTime, endTime, eventTitle, eventDescription, 
    bookingType, expectedAttendance 
  } = req.body;

  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const currentYear = new Date().getFullYear();

    // Generate next unique Booking Ref (e.g. TBK-2026-001)
    const countRes = await query(`SELECT COUNT(*) FROM bookings`);
    const nextNum = parseInt(countRes.rows[0].count) + 1;
    const nextRefId = `TBK-${currentYear}-${String(nextNum).padStart(3, '0')}`;

    // -------------------------------------------------------------
    // STAGE 1: BAN CHECK (FRD BR-09, must check before validation)
    // -------------------------------------------------------------
    const activeBanRes = await query(
      `SELECT * FROM ban_records WHERE LOWER(email) = $1 AND is_active = TRUE`,
      [cleanEmail]
    );

    if (activeBanRes.rows.length > 0) {
      const activeBan = activeBanRes.rows[0];

      // Insert rejected booking into database with status REJECTED_BAN
      await query(
        `INSERT INTO bookings (
          booking_id, requester_name, requester_email, requester_phone, organization_name,
          booking_type, event_title, event_description, date, start_time, end_time,
          expected_attendance, status, conflict_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          nextRefId, name || 'Banned Requester', cleanEmail, phone || '000', organization || '',
          bookingType || 'Event', eventTitle || 'Banned Attempt', eventDescription || 'Banned',
          date || new Date().toISOString().split('T')[0], startTime || '09:00:00', endTime || '10:00:00',
          expectedAttendance ? parseInt(expectedAttendance) : 0, 'REJECTED_BAN', 'NO_CONFLICT'
        ]
      );

      // Log full ban details in the audit log for staff review (never shown to the requester)
      await logAudit(
        `Blocked booking attempt from banned email: ${cleanEmail}. Ban Reason: ${activeBan.reason}`,
        'booking',
        nextRefId,
        'System (Ban Check)'
      );

      // Return a standard generic helpful message to avoid revealing internal ban parameters directly
      return res.status(400).json({ 
        error: 'We are unable to process your booking request at this time. Please contact operations if you believe this is an error.' 
      });
    }

    // -------------------------------------------------------------
    // STAGE 2: MANDATORY VALIDATION
    // -------------------------------------------------------------
    const hasMissingFields = !name || !email || !phone || !room || !date || !startTime || !endTime || 
                             !eventTitle || !eventDescription || !bookingType || !expectedAttendance;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = emailRegex.test(cleanEmail);

    let isPastDate = false;
    if (date) {
      const reqDate = new Date(`${date}T00:00:00`);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (reqDate < today) {
        isPastDate = true;
      }
    }

    // Lookup Room (can match by Name or ID)
    let roomRecord: any = null;
    if (room) {
      const roomRes = await query(
        `SELECT * FROM rooms WHERE LOWER(name) = LOWER($1) OR id = $2`,
        [String(room).trim(), isNaN(Number(room)) ? -1 : parseInt(room)]
      );
      if (roomRes.rows.length > 0) {
        roomRecord = roomRes.rows[0];
      }
    }

    let validationErrorMsg = '';
    if (hasMissingFields) {
      validationErrorMsg = 'Validation Error: All mandatory fields must be completed.';
    } else if (!isValidEmail) {
      validationErrorMsg = 'Validation Error: Invalid email address format.';
    } else if (isPastDate) {
      validationErrorMsg = 'Validation Error: Past dates cannot be booked.';
    } else if (!roomRecord) {
      validationErrorMsg = 'Validation Error: The requested room does not exist.';
    } else if (!roomRecord.is_active) {
      validationErrorMsg = 'Validation Error: New bookings are not allowed for this room (Deactivated).';
    } else {
      // Validate Operating Hours
      const cleanStart = startTime.includes(':') && startTime.split(':').length === 2 ? startTime + ':00' : startTime;
      const cleanEnd = endTime.includes(':') && endTime.split(':').length === 2 ? endTime + ':00' : endTime;

      if (cleanStart < roomRecord.operating_hours_start || cleanEnd > roomRecord.operating_hours_end || cleanStart >= cleanEnd) {
        validationErrorMsg = `Validation Error: Bookings must fall within the room's configured operating hours (${roomRecord.operating_hours_start.slice(0, 5)} - ${roomRecord.operating_hours_end.slice(0, 5)}).`;
      } else {
        // Validate Min/Max Duration limits
        const [sH, sM] = startTime.split(':').map(Number);
        const [eH, eM] = endTime.split(':').map(Number);
        const durationMins = (eH * 60 + eM) - (sH * 60 + sM);

        if (durationMins < roomRecord.min_duration_minutes) {
          validationErrorMsg = `Validation Error: Booking duration (${durationMins} mins) is below the room's minimum threshold (${roomRecord.min_duration_minutes} mins).`;
        } else if (durationMins > roomRecord.max_duration_minutes) {
          validationErrorMsg = `Validation Error: Booking duration (${durationMins} mins) exceeds the room's maximum threshold (${roomRecord.max_duration_minutes} mins).`;
        }
      }
    }

    if (validationErrorMsg) {
      // Insert a REJECTED_VALIDATION booking entry for record-keeping
      await query(
        `INSERT INTO bookings (
          booking_id, requester_name, requester_email, requester_phone, organization_name,
          booking_type, event_title, event_description, date, start_time, end_time,
          expected_attendance, status, conflict_status, rejection_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          nextRefId, name || 'Validation Failed', cleanEmail, phone || '', organization || '',
          bookingType || 'Event', eventTitle || 'Validation Failed', eventDescription || '',
          date || new Date().toISOString().split('T')[0], startTime || '00:00:00', endTime || '00:00:00',
          expectedAttendance ? parseInt(expectedAttendance) : 0, 'REJECTED_VALIDATION', 'NO_CONFLICT', validationErrorMsg
        ]
      );

      await logAudit(`Rejected booking request during validation stage: ${validationErrorMsg}`, 'booking', nextRefId, 'System (Validator)');
      return res.status(400).json({ error: validationErrorMsg });
    }

    // -------------------------------------------------------------
    // STAGE 3: CONFLICT DETECTION
    // -------------------------------------------------------------
    // Find any overlapping bookings for the same room that are either APPROVED or PENDING_REVIEW
    const overlapRes = await query(
      `SELECT * FROM bookings 
       WHERE room_id = $1 
         AND date = $2 
         AND status IN ('APPROVED', 'PENDING_REVIEW')
         AND start_time < $3 
         AND end_time > $4`,
      [roomRecord.id, date, endTime, startTime]
    );

    let conflictStatus: 'NO_CONFLICT' | 'CONFLICT_DETECTED' = 'NO_CONFLICT';
    let conflictingBookingId: number | null = null;

    if (overlapRes.rows.length > 0) {
      conflictStatus = 'CONFLICT_DETECTED';
      conflictingBookingId = overlapRes.rows[0].id;
    }

    // -------------------------------------------------------------
    // STAGE 4: SAVE AS PENDING_REVIEW
    // -------------------------------------------------------------
    const insBooking = await query(
      `INSERT INTO bookings (
        booking_id, requester_name, requester_email, requester_phone, organization_name,
        room_id, booking_type, event_title, event_description, date, start_time, end_time,
        expected_attendance, status, conflict_status, conflicting_booking_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        nextRefId, name, cleanEmail, phone, organization || '',
        roomRecord.id, bookingType, eventTitle, eventDescription, date, startTime, endTime,
        parseInt(expectedAttendance), 'PENDING_REVIEW', conflictStatus, conflictingBookingId
      ]
    );

    // Re-fetch complete booking row with relations
    const finalBookingRes = await query(
      `SELECT b.*, r.name as room_name, cb.booking_id as conflicting_booking_ref
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN bookings cb ON b.conflicting_booking_id = cb.id
       WHERE b.id = $1`,
      [insBooking.rows[0].id]
    );

    const savedBooking = mapBooking(finalBookingRes.rows[0]);

    await logAudit(
      `Submitted Booking Request: ${nextRefId}. Status: PENDING_REVIEW. Conflict Status: ${conflictStatus}`,
      'booking',
      nextRefId,
      name
    );

    res.json({
      success: true,
      booking: savedBooking,
      message: conflictStatus === 'CONFLICT_DETECTED'
        ? 'Your booking has been submitted but a schedule overlap was detected. Staff will review the conflict.'
        : 'Your booking request has been submitted successfully and is awaiting staff approval.'
    });

  } catch (err) {
    console.error('Error submitting booking request:', err);
    res.status(500).json({ error: 'Failed to process booking submission due to server error.' });
  }
});

// APPROVE BOOKING (MOD-01B Staff Dashboard Approval Flow)
router.post('/bookings/:id/approve', requireAuth, requirePermission('APPROVE_REJECT_BOOKINGS'), async (req: AuthenticatedRequest, res: Response) => {
  const staff = req.currentUser!;
  const bookingId = req.params.id;

  try {
    // Retrieve booking
    const bookingRes = await query(`SELECT * FROM bookings WHERE booking_id = $1`, [bookingId]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    const booking = bookingRes.rows[0];

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Approval Blocked: System prevents approving cancelled sessions.' });
    }

    const prevBooking = mapBooking(booking);

    // Update Status to APPROVED
    await query(
      `UPDATE bookings 
       SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [staff.id, booking.id]
    );

    // Resolve/Mark any overlapping requests currently in PENDING_REVIEW as CONFLICT_DETECTED
    await query(
      `UPDATE bookings
       SET conflict_status = 'CONFLICT_DETECTED', conflicting_booking_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id != $1 
         AND room_id = $2 
         AND date = $3 
         AND status = 'PENDING_REVIEW'
         AND start_time < $4 
         AND end_time > $5`,
      [booking.id, booking.room_id, booking.date, booking.end_time, booking.start_time]
    );

    // Fetch the updated booking record
    const updatedRes = await query(
      `SELECT b.*, r.name as room_name, u.full_name as approver_name
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN users u ON b.approved_by = u.id
       WHERE b.id = $1`,
      [booking.id]
    );
    const updatedBooking = mapBooking(updatedRes.rows[0]);

    await logAudit(`Approved Booking: ${bookingId}`, 'booking', bookingId, staff.email, prevBooking, updatedBooking);

    res.json({ success: true, booking: updatedBooking });
  } catch (err) {
    console.error('Failed to approve booking:', err);
    res.status(500).json({ error: 'Internal Server Error while approving booking.' });
  }
});

// REJECT BOOKING (MOD-01B Staff Dashboard Rejection Flow)
router.post('/bookings/:id/reject', requireAuth, requirePermission('APPROVE_REJECT_BOOKINGS'), async (req: AuthenticatedRequest, res: Response) => {
  const staff = req.currentUser!;
  const bookingId = req.params.id;
  const { reason } = req.body;

  if (!reason || String(reason).trim() === '') {
    return res.status(400).json({ error: 'Rejection Error: A written reason is mandatory to reject a booking.' });
  }

  try {
    const bookingRes = await query(`SELECT * FROM bookings WHERE booking_id = $1`, [bookingId]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    const booking = bookingRes.rows[0];

    const prevBooking = mapBooking(booking);

    // Set status to REJECTED_BY_STAFF
    await query(
      `UPDATE bookings 
       SET status = 'REJECTED_BY_STAFF', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [reason.trim(), booking.id]
    );

    const updatedRes = await query(
      `SELECT b.*, r.name as room_name 
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE b.id = $1`,
      [booking.id]
    );
    const updatedBooking = mapBooking(updatedRes.rows[0]);

    await logAudit(`Rejected Booking: ${bookingId}. Reason: ${reason}`, 'booking', bookingId, staff.email, prevBooking, updatedBooking);

    res.json({ success: true, booking: updatedBooking });
  } catch (err) {
    console.error('Failed to reject booking:', err);
    res.status(500).json({ error: 'Internal Server Error while rejecting booking.' });
  }
});

// CANCEL BOOKING (MOD-01A Public / Staff Cancellation Flow)
router.post('/bookings/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.currentUser!;
  const bookingId = req.params.id;
  const { reason } = req.body;

  if (!reason || String(reason).trim() === '') {
    return res.status(400).json({ error: 'Cancellation Error: A written reason is mandatory to cancel a booking.' });
  }

  try {
    const bookingRes = await query(`SELECT * FROM bookings WHERE booking_id = $1`, [bookingId]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    const booking = bookingRes.rows[0];

    // Access control: User can only cancel their own bookings, unless they are staff
    const isStaff = actor.role !== 'UCP Member';
    const isOwner = actor.email.toLowerCase() === booking.requester_email.toLowerCase();

    if (!isStaff && !isOwner) {
      return res.status(403).json({ error: 'Access Denied: You do not have permissions to cancel this booking.' });
    }

    const prevBooking = mapBooking(booking);

    // Check 1-hour advance notice policy for approved bookings cancelled by non-staff (UCP Members)
    let policyViolation = false;
    if (booking.status === 'APPROVED' && !isStaff) {
      // Parse dates safely
      const bookingStartDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.start_time}`);
      const timeDiffMs = bookingStartDateTime.getTime() - Date.now();
      const hoursDiff = timeDiffMs / (1000 * 60 * 60);
      if (hoursDiff < 1.0) {
        policyViolation = true;
      }
    }

    // Cancel Booking
    await query(
      `UPDATE bookings 
       SET status = 'CANCELLED', cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [reason.trim(), booking.id]
    );

    const updatedRes = await query(
      `SELECT b.*, r.name as room_name 
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE b.id = $1`,
      [booking.id]
    );
    const updatedBooking = mapBooking(updatedRes.rows[0]);

    const logMsg = `Cancelled Booking: ${bookingId}. Reason: ${reason}${policyViolation ? ' [POLICY VIOLATION: Less than 1-hour notice]' : ''}`;
    await logAudit(logMsg, 'booking', bookingId, actor.email, prevBooking, updatedBooking);

    res.json({ success: true, booking: updatedBooking, policyViolation });
  } catch (err) {
    console.error('Failed to cancel booking:', err);
    res.status(500).json({ error: 'Internal Server Error while cancelling booking.' });
  }
});

// BOOKING OVERRIDE / EDIT (MOD-01B Staff Calendar/Override Capability)
router.post('/bookings/:id/override', requireAuth, requirePermission('BOOKING_OVERRIDE'), async (req: AuthenticatedRequest, res: Response) => {
  const staff = req.currentUser!;
  const bookingId = req.params.id;
  const { room, date, startTime, endTime, forceApprove } = req.body;

  try {
    // 1. Fetch Booking
    const bookingRes = await query(`SELECT * FROM bookings WHERE booking_id = $1`, [bookingId]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    const booking = bookingRes.rows[0];
    const prevBooking = mapBooking(booking);

    // 2. Fetch target Room
    let targetRoomId = booking.room_id;
    if (room) {
      const roomRes = await query(`SELECT id FROM rooms WHERE name = $1 OR id = $2`, [room, isNaN(Number(room)) ? -1 : parseInt(room)]);
      if (roomRes.rows.length === 0) {
        return res.status(400).json({ error: `Room '${room}' does not exist.` });
      }
      targetRoomId = roomRes.rows[0].id;
    }

    const cleanDate = date || booking.date.toISOString().split('T')[0];
    const cleanStart = startTime || booking.start_time;
    const cleanEnd = endTime || booking.end_time;

    // 3. Determine Overlap/Conflicts
    const overlapRes = await query(
      `SELECT id FROM bookings
       WHERE id != $1
         AND room_id = $2
         AND date = $3
         AND status = 'APPROVED'
         AND start_time < $4
         AND end_time > $5`,
      [booking.id, targetRoomId, cleanDate, cleanEnd, cleanStart]
    );

    let conflictStatus: 'NO_CONFLICT' | 'CONFLICT_DETECTED' = 'NO_CONFLICT';
    let conflictingBookingId: number | null = null;

    if (overlapRes.rows.length > 0) {
      conflictStatus = 'CONFLICT_DETECTED';
      conflictingBookingId = overlapRes.rows[0].id;
    }

    // 4. Build Override updates
    const statusVal = forceApprove ? 'APPROVED' : booking.status;
    const approvedByVal = forceApprove ? staff.id : booking.approved_by;
    const approvedAtVal = forceApprove ? new Date() : booking.approved_at;

    await query(
      `UPDATE bookings 
       SET room_id = $1, date = $2, start_time = $3, end_time = $4, 
           status = $5, approved_by = $6, approved_at = $7,
           conflict_status = $8, conflicting_booking_id = $9, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        targetRoomId, cleanDate, cleanStart, cleanEnd, 
        statusVal, approvedByVal, approvedAtVal,
        conflictStatus, conflictingBookingId, booking.id
      ]
    );

    // Fetch and return updated booking details
    const finalBookingRes = await query(
      `SELECT b.*, r.name as room_name, u.full_name as approver_name, cb.booking_id as conflicting_booking_ref
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN users u ON b.approved_by = u.id
       LEFT JOIN bookings cb ON b.conflicting_booking_id = cb.id
       WHERE b.id = $1`,
      [booking.id]
    );

    const updatedBooking = mapBooking(finalBookingRes.rows[0]);

    await logAudit(`Booking Override Applied: ${bookingId}`, 'booking', bookingId, staff.email, prevBooking, updatedBooking);

    res.json({ success: true, booking: updatedBooking });
  } catch (err) {
    console.error('Failed to override booking:', err);
    res.status(500).json({ error: 'Internal Server Error while overriding booking.' });
  }
});

export default router;
