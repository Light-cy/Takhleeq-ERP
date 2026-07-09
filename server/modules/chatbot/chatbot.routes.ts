import { Router, Response } from 'express';
import { query, mapBooking } from '../../db.ts';
import { AuthenticatedRequest } from '../../middleware/auth.ts';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// Retrieve current date/time details and day of the week
function getCurrentDateTimeDetails() {
  const now = new Date();
  
  // Format as YYYY-MM-DD in local time
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  
  const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = days[now.getDay()];
  
  return { dateStr, timeStr, dayOfWeek };
}

router.post('/chatbot', async (req: AuthenticatedRequest, res: Response) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  // Verify API Key existence
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to your environment variables.' 
    });
  }

  try {
    // 1. Fetch active rooms
    const roomsRes = await query('SELECT * FROM rooms WHERE is_active = TRUE ORDER BY id ASC');
    const rooms = roomsRes.rows;

    // 2. Fetch active bookings (APPROVED or PENDING REVIEW)
    const bookingsRes = await query(
      `SELECT b.*, r.name as room_name 
       FROM bookings b 
       LEFT JOIN rooms r ON b.room_id = r.id 
       WHERE b.status IN ('APPROVED', 'PENDING REVIEW') 
       ORDER BY b.date ASC, b.start_time ASC`
    );
    const bookings = bookingsRes.rows.map(mapBooking);

    // 3. Prepare current time/date context
    const { dateStr, timeStr, dayOfWeek } = getCurrentDateTimeDetails();

    // 4. Construct descriptive context summaries
    let roomsSummary = rooms.map(r => {
      return `- ${r.name} (Capacity: ${r.capacity} people, Operating Hours: ${r.operating_hours_start} to ${r.operating_hours_end}, Duration Limits: ${r.min_duration_minutes}-${r.max_duration_minutes} minutes, Purpose: ${r.purpose || 'None'}, Policies: ${r.policies || 'None'})`;
    }).join('\n');

    if (rooms.length === 0) {
      roomsSummary = 'No active rooms found in the system.';
    }

    let bookingsSummary = bookings.map(b => {
      return `- Booking ID: ${b.id}, Event: "${b.eventTitle}", Room: "${b.room}", Date: ${b.date}, Slot: ${b.startTime} - ${b.endTime}, Status: ${b.status}`;
    }).join('\n');

    if (bookings.length === 0) {
      bookingsSummary = 'No existing bookings found in the system.';
    }

    // 5. Construct comprehensive system instruction
    const systemInstruction = `You are the Takhleeq ERP Facility Booking Assistant, an expert, friendly AI designed to help students, staff, and cohort startups manage and query room reservations.

Your primary superpower is checking real-time availability and finding open slots for users based on the dynamic schedule of the system.

=== REAL-TIME TIME & DATE SYSTEM CONTEXT ===
- Today's Date: ${dateStr}
- Current Day of the Week: ${dayOfWeek}
- Current Local Time: ${timeStr}

=== ACTIVE ROOMS IN THE INCUBATOR ===
${roomsSummary}

=== CURRENT CONFIRMED SCHEDULE (BOOKINGS) ===
${bookingsSummary}

=== RULES & BEHAVIOR ===
1. Checking Open Slot Queries (e.g. "which booking times are open on Wednesday", "is Cube 1 free tomorrow", etc.):
   - Carefully compute the target date relative to Today's Date (${dateStr}, ${dayOfWeek}).
   - Note that if today is Thursday July 9, 2026:
     - "Wednesday" refers to yesterday (July 8) if past, or next Wednesday (July 15). If the user asks about availability on a day of the week, assume they mean the upcoming occurrence of that day (e.g., Wednesday July 15, 2026) unless they imply otherwise.
     - Always explicitly state the exact date you are checking (e.g. "Wednesday, July 15, 2026") so the user knows you understood them correctly.
   - For the target date, compare the room's operating hours with all bookings scheduled for that room.
   - List the open time blocks (gaps) for each room.
   - If a room has absolutely no bookings scheduled on that target date, explicitly state that it is fully free during its active operating hours (e.g., "09:00 AM to 05:00 PM").
   - If a room is fully booked, state that there are no slots available.
2. Formats:
   - Present times clearly, in 12-hour format with AM/PM (e.g., "09:00 AM - 11:30 AM") for better readability.
   - Organize availability by room so the output is elegant, visual, and easy to scan.
3. Booking Assistance:
   - Advise the user about room rules (capacities, purpose, and time limits).
   - If the user selects a time and wants to proceed, politely instruct them to use the standard "Book a Room" form on the dashboard to officially register their request. Mention that you cannot write directly to the database yourself.
4. Tone:
   - Professional, conversational, welcoming, and concise.
   - Do not display raw JSON in your final answer. Present information in clean markdown tables or bulleted lists.
`;

    // 6. Initialize Google Gen AI
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // 7. Format History into Gemini contents array
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        if (h.role === 'user' || h.role === 'model') {
          contents.push({
            role: h.role,
            parts: [{ text: h.content }]
          });
        }
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // 8. Generate response using gemini-3.5-flash
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.2, // Keep it precise and factual
      }
    });

    const reply = response.text || 'Sorry, I could not process that request.';

    res.json({ reply });
  } catch (err: any) {
    console.error('[CHATBOT ERROR]', err);
    res.status(500).json({ error: 'Chatbot failed to generate a response: ' + err.message });
  }
});

export default router;
