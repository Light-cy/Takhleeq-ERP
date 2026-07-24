import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

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
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return transporter;
}

export interface ApplicantEmailData {
  id: number;
  name: string;
  email: string;
  startup_name: string;
  tracking_token: string;
  status: string;
  notes?: string;
}

export const EMAIL_TEMPLATES: Record<string, (data: ApplicantEmailData) => { subject: string; title: string; badge: string; badgeColor: string; bodyHtml: string }> = {
  APPLIED: (data) => ({
    subject: `Application Received: ${data.startup_name} (${data.tracking_token})`,
    title: `Application Confirmed!`,
    badge: `Tracking Token: ${data.tracking_token}`,
    badgeColor: `#2563eb`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Thank you for applying to Takhleeq Business Incubator with your startup venture <strong>${data.startup_name}</strong>.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Your application has been logged into our system. Please keep your tracking token handy for future status inquiries:
      </p>
      <div style="background-color: #eff6ff; border: 1px dashed #3b82f6; padding: 12px 16px; border-radius: 6px; text-align: center; margin: 15px 0;">
        <span style="font-family: monospace; font-size: 18px; font-weight: bold; color: #1e40af;">${data.tracking_token}</span>
      </div>
      <p style="margin: 0; color: #6b7280; font-family: sans-serif; font-size: 13px; line-height: 1.5;">
        Our evaluation team will review your pitch and form details during the desk screening phase.
      </p>
    `
  }),

  SHORTLISTED_FOR_PRESENTATION: (data) => ({
    subject: `Shortlisted for Pitch Presentation: ${data.startup_name}`,
    title: `Pitch Presentation Invitation`,
    badge: `Stage: Shortlisted for Pitch`,
    badgeColor: `#7c3aed`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Congratulations! Your startup <strong>${data.startup_name}</strong> has successfully cleared the initial screening stage and has been <strong>shortlisted for the Panel Evaluation Pitch Presentation</strong>.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Please prepare a 5-minute presentation covering your value proposition, team background, market viability, and financial plan. Further scheduling details will be shared shortly by our incubation coordinator.
      </p>
    `
  }),

  ACCEPTED: (data) => ({
    subject: `Admission Offer: Welcome ${data.startup_name} to Takhleeq Incubator`,
    title: `Incubation Admission Offer`,
    badge: `Status: Accepted / Offer Issued`,
    badgeColor: `#16a34a`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        We are thrilled to inform you that <strong>${data.startup_name}</strong> has been officially accepted into the upcoming Takhleeq Incubator Cohort!
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        To secure your seat and claim your dedicated workspace, mentorship allocation, and lab resources, please log in using your tracking token (<strong>${data.tracking_token}</strong>) and confirm seat acceptance.
      </p>
    `
  }),

  CONDITIONAL_ACCEPTED: (data) => ({
    subject: `Conditional Admission Offer: ${data.startup_name}`,
    title: `Conditional Admission Offer`,
    badge: `Status: Conditional Acceptance`,
    badgeColor: `#0d9488`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Your startup <strong>${data.startup_name}</strong> has received a <strong>Conditional Admission Offer</strong> for the incubation cohort.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        ${data.notes || 'Our admissions committee requires minor prerequisite updates or documentation verification before full seat confirmation. Please get in touch with the incubation office.'}
      </p>
    `
  }),

  CONFIRMED: (data) => ({
    subject: `Official Seat Confirmation & Welcome: ${data.startup_name}`,
    title: `Seat Confirmed & Active Cohort Onboarding`,
    badge: `Status: Confirmed Venture`,
    badgeColor: `#059669`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Your seat for <strong>${data.startup_name}</strong> is officially <strong>CONFIRMED</strong>! Your venture has been enrolled into the active cohort program.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        You can now access the Founder Self-Service Portal to manage your startup profile, record weekly team check-ins, view orientation schedules, and reserve incubator facilities.
      </p>
    `
  }),

  REJECTED: (data) => ({
    subject: `Application Update regarding ${data.startup_name}`,
    title: `Incubation Application Status Update`,
    badge: `Status: Application Not Selected`,
    badgeColor: `#dc2626`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Thank you for taking the time to apply with <strong>${data.startup_name}</strong>. After careful evaluation by our selection panel, we regret to inform you that we are unable to offer admission in the current cohort.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        We encourage you to continue refining your business model and resubmit an updated application during our next intake cycle.
      </p>
    `
  })
};

export async function sendApplicantStatusEmail(data: ApplicantEmailData): Promise<boolean> {
  // Skip intermediate status 'UNDER_REVIEW' or unsupported statuses
  if (!data.status || data.status === 'UNDER_REVIEW' || data.status === 'IN_REVIEW') {
    return false;
  }

  const templateFn = EMAIL_TEMPLATES[data.status];
  if (!templateFn) {
    return false;
  }

  const template = templateFn(data);
  const fromEmail = process.env.SMTP_FROM || 'Takhleeq Incubator <noreply@takhleeq.pk>';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${template.subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f5f7;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f5f7; padding: 30px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <tr>
                <td style="background-color: #8B1A1A; padding: 20px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-family: sans-serif; font-size: 20px; font-weight: bold;">Takhleeq Business Incubator</h1>
                  <p style="margin: 4px 0 0 0; color: #fca5a5; font-family: sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Intake & Admissions Office</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 25px 30px;">
                  <div style="display: inline-block; padding: 4px 10px; background-color: ${template.badgeColor}; color: #ffffff; font-family: sans-serif; font-size: 11px; font-weight: bold; border-radius: 4px; text-transform: uppercase; margin-bottom: 15px;">
                    ${template.badge}
                  </div>
                  <h2 style="margin: 0 0 15px 0; color: #111827; font-family: sans-serif; font-size: 18px;">${template.title}</h2>
                  ${template.bodyHtml}
                </td>
              </tr>
              <tr>
                <td style="background-color: #fafafa; padding: 15px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; color: #9ca3af; font-family: sans-serif; font-size: 12px;">
                    Takhleeq Innovation & Entrepreneurship Center<br>
                    University of Central Punjab, Lahore
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

  const mailTransporter = getTransporter();

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: fromEmail,
        to: data.email,
        subject: template.subject,
        html: htmlBody,
      });
      console.log(`[SMTP] Dispatched cohort notification email to ${data.email} for startup '${data.startup_name}' (Status: ${data.status})`);
      return true;
    } catch (err) {
      console.error(`[SMTP Error] Failed to send email to ${data.email}:`, err);
      return false;
    }
  } else {
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log(`│ [SMTP SIMULATOR] Dispatching Cohort Status Email            │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│ TO:      ${data.email.padEnd(50)} │`);
    console.log(`│ STARTUP: ${data.startup_name.padEnd(50)} │`);
    console.log(`│ SUBJECT: ${template.subject.padEnd(50)} │`);
    console.log(`│ STATUS:  ${data.status.padEnd(50)} │`);
    console.log(`└─────────────────────────────────────────────────────────────┘\n`);
    return true;
  }
}
