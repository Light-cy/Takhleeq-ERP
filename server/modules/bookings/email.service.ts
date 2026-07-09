import nodemailer from 'nodemailer';
import { Booking } from '../../../src/types.ts';

// Cache transporter instance
let transporter: nodemailer.Transporter | null = null;

/**
 * Lazily initialize and return the Nodemailer SMTP transporter.
 * If credentials are not configured, returns null to trigger dev-fallback logs.
 */
function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !pass) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

/**
 * Interface for optional email custom parameters
 */
export interface EmailOptions {
  rejectionReason?: string;
  cancellationReason?: string;
  changeNotes?: string;
}

/**
 * Send booking status email to the requester
 */
export async function sendBookingStatusEmail(
  booking: Booking,
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'UPDATED' | 'SUBMITTED',
  options: EmailOptions = {}
) {
  const recipient = booking.email;
  const name = booking.name;
  const refId = booking.id;
  const eventTitle = booking.eventTitle;
  const room = booking.room;
  const date = booking.date;
  const time = `${booking.startTime} - ${booking.endTime}`;

  let subject = `Takhleeq ERP - Booking ${refId} Update`;
  let statusText: string = status;
  let statusColor = '#4f46e5'; // Indigo/Indigo 600
  let statusDescription = 'Your booking has been updated.';

  if (status === 'APPROVED') {
    subject = `Booking APPROVED: ${eventTitle} (${refId})`;
    statusText = 'APPROVED';
    statusColor = '#16a34a'; // Green 600
    statusDescription = 'Great news! Your booking has been approved by the administration. The room has been reserved for your scheduled event.';
  } else if (status === 'REJECTED') {
    subject = `Booking REJECTED: ${eventTitle} (${refId})`;
    statusText = 'REJECTED';
    statusColor = '#dc2626'; // Red 600
    statusDescription = 'We regret to inform you that your booking request could not be approved at this time.';
  } else if (status === 'CANCELLED') {
    subject = `Booking CANCELLED: ${eventTitle} (${refId})`;
    statusText = 'CANCELLED';
    statusColor = '#4b5563'; // Gray 600
    statusDescription = 'This booking request has been officially cancelled.';
  } else if (status === 'UPDATED') {
    subject = `Booking UPDATED: ${eventTitle} (${refId})`;
    statusText = 'SCHEDULE UPDATED';
    statusColor = '#2563eb'; // Blue 600
    statusDescription = 'An administrator has updated the schedule or location details of your booking request. Please review the updated itinerary below.';
  } else if (status === 'SUBMITTED') {
    subject = `Booking SUBMITTED: ${eventTitle} (${refId})`;
    statusText = 'PENDING REVIEW';
    statusColor = '#8b1a1a'; // Maroon #8B1A1A
    statusDescription = 'Your reservation request has been successfully submitted and received. It has been placed in the queue for staff review and conflict verification.';
  }

  // Build the Callout Section for Reasons/Notes
  let calloutHtml = '';
  if (status === 'REJECTED' && options.rejectionReason) {
    calloutHtml = `
      <div style="margin-top: 20px; padding: 15px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
        <h4 style="margin: 0 0 5px 0; color: #991b1b; font-family: sans-serif; font-size: 14px; font-weight: 600;">Reason for Rejection:</h4>
        <p style="margin: 0; color: #7f1d1d; font-family: sans-serif; font-size: 14px; line-height: 1.5;">"${options.rejectionReason}"</p>
      </div>
    `;
  } else if (status === 'CANCELLED' && options.cancellationReason) {
    calloutHtml = `
      <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-left: 4px solid #4b5563; border-radius: 4px;">
        <h4 style="margin: 0 0 5px 0; color: #374151; font-family: sans-serif; font-size: 14px; font-weight: 600;">Reason for Cancellation:</h4>
        <p style="margin: 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.5;">"${options.cancellationReason}"</p>
      </div>
    `;
  } else if (status === 'UPDATED' && options.changeNotes) {
    calloutHtml = `
      <div style="margin-top: 20px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
        <h4 style="margin: 0 0 5px 0; color: #1e40af; font-family: sans-serif; font-size: 14px; font-weight: 600;">Modification Notes:</h4>
        <p style="margin: 0; color: #1e3a8a; font-family: sans-serif; font-size: 14px; line-height: 1.5;">${options.changeNotes}</p>
      </div>
    `;
  }

  // HTML Email Body Template
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 30px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); overflow: hidden;">
              <!-- Header Section -->
              <tr>
                <td style="background-color: #111827; padding: 25px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Takhleeq ERP</h1>
                  <p style="margin: 3px 0 0 0; color: #9ca3af; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase;">Facility Reservation Operations</p>
                </td>
              </tr>

              <!-- Status Header Banner -->
              <tr>
                <td style="padding: 30px 30px 20px 30px; border-bottom: 1px solid #e5e7eb;">
                  <div style="display: inline-block; padding: 6px 12px; background-color: ${statusColor}; color: #ffffff; font-family: sans-serif; font-size: 12px; font-weight: 700; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 15px;">
                    ${statusText}
                  </div>
                  <h2 style="margin: 0 0 10px 0; color: #111827; font-family: sans-serif; font-size: 20px; font-weight: 600;">Hello ${name},</h2>
                  <p style="margin: 0; color: #4b5563; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
                    ${statusDescription}
                  </p>
                  ${calloutHtml}
                </td>
              </tr>

              <!-- Event Summary Table -->
              <tr>
                <td style="padding: 25px 30px; background-color: #fafafa;">
                  <h3 style="margin: 0 0 15px 0; color: #374151; font-family: sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Reservation Summary</h3>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding: 8px 0; width: 30%; color: #6b7280; font-family: sans-serif; font-size: 14px; font-weight: 500; vertical-align: top;">Booking ID:</td>
                      <td style="padding: 8px 0; color: #111827; font-family: sans-serif; font-size: 14px; font-weight: 600; vertical-align: top;">${refId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-family: sans-serif; font-size: 14px; font-weight: 500; vertical-align: top;">Event Name:</td>
                      <td style="padding: 8px 0; color: #111827; font-family: sans-serif; font-size: 14px; font-weight: 500; vertical-align: top;">${eventTitle}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-family: sans-serif; font-size: 14px; font-weight: 500; vertical-align: top;">Reserved Space:</td>
                      <td style="padding: 8px 0; color: #111827; font-family: sans-serif; font-size: 14px; font-weight: 500; vertical-align: top;">${room}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-family: sans-serif; font-size: 14px; font-weight: 500; vertical-align: top;">Scheduled Date:</td>
                      <td style="padding: 8px 0; color: #111827; font-family: sans-serif; font-size: 14px; font-weight: 500; vertical-align: top;">${date}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-family: sans-serif; font-size: 14px; font-weight: 500; vertical-align: top;">Time Slot:</td>
                      <td style="padding: 8px 0; color: #111827; font-family: sans-serif; font-size: 14px; font-weight: 500; vertical-align: top;">${time}</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer Section -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #9ca3af; font-family: sans-serif; font-size: 12px; line-height: 1.5;">
                    This is an automated notification from Takhleeq ERP.<br>
                    Please do not reply directly to this message.
                  </p>
                  <p style="margin: 10px 0 0 0; color: #4b5563; font-family: sans-serif; font-size: 12px; font-weight: 600;">
                    Takhleeq Operations & Support Team
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Get Transporter or use development fallback logger
  const mailTransporter = getTransporter();
  const fromEmail = process.env.SMTP_FROM || 'Takhleeq ERP <noreply@takhleeq.pk>';

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: fromEmail,
        to: recipient,
        subject,
        html: htmlBody,
      });
      console.log(`[SMTP] Successfully dispatched status update email to ${recipient} for booking ${refId} (Status: ${statusText})`);
    } catch (err) {
      console.error(`[SMTP] Critical failure dispatching email to ${recipient}:`, err);
    }
  } else {
    // Elegant console simulation box for zero-dependency local setup
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log(`│ [SMTP SIMULATOR] Dispatching Booking Notification Email      │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│ FROM:    ${fromEmail.padEnd(50)} │`);
    console.log(`│ TO:      ${recipient.padEnd(50)} │`);
    console.log(`│ SUBJECT: ${subject.padEnd(50)} │`);
    console.log(`│ BOOKING: ${refId.padEnd(50)} │`);
    console.log(`│ ROOM:    ${room.padEnd(50)} │`);
    console.log(`│ TIME:    ${(date + ' ' + time).padEnd(50)} │`);
    console.log(`│ STATUS:  ${statusText.padEnd(50)} │`);
    if (status === 'REJECTED' && options.rejectionReason) {
      console.log(`│ REASON:  ${options.rejectionReason.padEnd(50)} │`);
    } else if (status === 'CANCELLED' && options.cancellationReason) {
      console.log(`│ REASON:  ${options.cancellationReason.padEnd(50)} │`);
    } else if (status === 'UPDATED' && options.changeNotes) {
      console.log(`│ NOTES:   ${options.changeNotes.padEnd(50)} │`);
    }
    console.log(`└─────────────────────────────────────────────────────────────┘\n`);
  }
}
