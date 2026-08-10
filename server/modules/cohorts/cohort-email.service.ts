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
  include_in_email?: boolean;
  login_email?: string;
  login_password?: string;
  login_url?: string;
}

function renderCredentialsBlock(data: ApplicantEmailData): string {
  if (!data.login_password) return '';
  const email = data.login_email || data.email;
  const link = data.login_url || 'https://takhleeq-erp.ucp.edu.pk/login';
  return `
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 18px 0; text-align: left;">
      <h4 style="margin: 0 0 10px 0; color: #0f172a; font-family: sans-serif; font-size: 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
        🔑 Founder Portal Login Credentials
      </h4>
      <p style="margin: 6px 0; font-family: sans-serif; font-size: 13px; color: #334155;">
        <strong>Portal URL:</strong> <a href="${link}" style="color: #2563eb; text-decoration: underline; font-family: monospace;">${link}</a>
      </p>
      <p style="margin: 6px 0; font-family: sans-serif; font-size: 13px; color: #334155;">
        <strong>Login Email:</strong> <span style="font-family: monospace; font-weight: bold; color: #0f172a;">${email}</span>
      </p>
      <p style="margin: 6px 0; font-family: sans-serif; font-size: 13px; color: #334155;">
        <strong>Password:</strong> <span style="background-color: #e2e8f0; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; font-weight: bold; color: #0f172a; font-family: monospace;">${data.login_password}</span>
      </p>
      <p style="margin: 10px 0 0 0; color: #64748b; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
        Please use these credentials to sign in to the Takhleeq Founder Self-Service Portal to access session schedules, submit weekly check-ins, and manage your startup profile.
      </p>
    </div>
  `;
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

  UNDER_REVIEW: (data) => ({
    subject: `Application Under Desk Review: ${data.startup_name}`,
    title: `Application Under Review`,
    badge: `Stage: Desk Review & Screening`,
    badgeColor: `#d97706`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Your application for <strong>${data.startup_name}</strong> is now actively under review by the Takhleeq Admissions Evaluation Panel.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Our team is evaluating your value proposition, market scalability, and team capabilities. You can track ongoing progress anytime using token <strong>${data.tracking_token}</strong>.
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

  PRESENTATION_CONDUCTED: (data) => ({
    subject: `Pitch Presentation Completed: ${data.startup_name}`,
    title: `Presentation Evaluation Completed`,
    badge: `Stage: Pitch Conducted`,
    badgeColor: `#0891b2`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Thank you for delivering your pitch presentation for <strong>${data.startup_name}</strong>. The evaluation panel has logged your scores and feedback.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Your application is now moving to the Executive Board for placement decision.
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
        Our admissions committee requires minor prerequisite updates or documentation verification before full seat confirmation. Please get in touch with the incubation office.
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

  ORIENTATION_CONDUCTED: (data) => ({
    subject: `Orientation Attendance Confirmed: ${data.startup_name}`,
    title: `Incubator Orientation Completed`,
    badge: `Status: Orientation Completed`,
    badgeColor: `#65a30d`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Orientation attendance for <strong>${data.startup_name}</strong> has been marked as <strong>Conducted & Complete</strong>.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Your venture is now fully integrated into the active incubation workflow with access to incubator facilities, mentors, and lab tools.
      </p>
    `
  }),

  ENROLLED: (data) => ({
    subject: `Batch Enrollment Confirmed: ${data.startup_name}`,
    title: `Active Cohort Member`,
    badge: `Status: Enrolled`,
    badgeColor: `#047857`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        <strong>${data.startup_name}</strong> is now officially enrolled in the active incubation cohort.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        We look forward to accelerating your venture journey.
      </p>
    `
  }),

  WAITLISTED: (data) => ({
    subject: `Application Status Update: Waitlisted - ${data.startup_name}`,
    title: `Waitlisted for Cohort Seat`,
    badge: `Status: Waitlisted`,
    badgeColor: `#ea580c`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Your startup <strong>${data.startup_name}</strong> has been placed on the <strong>Waitlist</strong> for the upcoming cohort intake.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        If an open seat becomes available prior to program launch, our team will reach out directly to offer placement.
      </p>
    `
  }),

  BACKUP_CANDIDATE: (data) => ({
    subject: `Application Status Update: Backup Pool - ${data.startup_name}`,
    title: `Backup Candidate Pool`,
    badge: `Status: Backup Candidate`,
    badgeColor: `#8b5cf6`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Your application for <strong>${data.startup_name}</strong> has been categorized in the <strong>Backup Candidate Pool</strong>.
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        We will contact you if additional seats open up or during specialized rolling review windows.
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
  }),

  CREDENTIALS: (data) => ({
    subject: `Your Founder Portal Credentials: ${data.startup_name}`,
    title: `Founder Portal Access Credentials`,
    badge: `Founder Credentials`,
    badgeColor: `#0284c7`,
    bodyHtml: `
      <p style="margin: 0 0 12px 0; color: #374151; font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Dear <strong>${data.name}</strong>,
      </p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-family: sans-serif; font-size: 14px; line-height: 1.6;">
        Below are your official login credentials to access the Takhleeq Cohort Founder Self-Service Dashboard for <strong>${data.startup_name}</strong>:
      </p>
      ${renderCredentialsBlock(data)}
    `
  })
};

export async function sendApplicantStatusEmail(data: ApplicantEmailData): Promise<boolean> {
  if (!data.status) {
    return false;
  }

  // Map status aliases to template keys
  let templateKey = data.status.toUpperCase();
  if (templateKey === 'SUBMITTED') templateKey = 'APPLIED';
  if (templateKey === 'IN_REVIEW') templateKey = 'UNDER_REVIEW';
  if (templateKey === 'SHORTLISTED') templateKey = 'SHORTLISTED_FOR_PRESENTATION';

  const templateFn = EMAIL_TEMPLATES[templateKey];
  if (!templateFn) {
    console.warn(`[SMTP Warning] No template found for status '${data.status}' (mapped key '${templateKey}')`);
    return false;
  }

  const template = templateFn(data);
  const fromEmail = process.env.SMTP_FROM || 'Takhleeq Incubator <noreply@takhleeq.pk>';

  // Append credentials block if login_password is provided and not already in template
  let extraBodyHtml = '';
  if (data.login_password && templateKey !== 'CREDENTIALS') {
    extraBodyHtml = renderCredentialsBlock(data);
  }

  // Conditionally render remarks section if notes present and include_in_email is true
  const remarksHtml = (data.notes && data.notes.trim().length > 0 && data.include_in_email !== false) ? `
    <div style="margin-top: 18px; padding: 14px 18px; background-color: #f8fafc; border-left: 4px solid #8B1A1A; border-radius: 6px;">
      <p style="margin: 0 0 6px 0; color: #1e293b; font-family: sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Note from the admissions team:</p>
      <p style="margin: 0; color: #334155; font-family: sans-serif; font-size: 13px; line-height: 1.6;">${data.notes.trim()}</p>
    </div>
  ` : '';

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
                  ${extraBodyHtml}
                  ${remarksHtml}
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

export interface StartupUpdateEmailParams {
  founderName: string;
  founderEmail: string;
  startupName: string;
  trackingToken?: string;
  updatedBy?: string;
  passwordChanged?: boolean;
  newPassword?: string;
  programStatusChanged?: boolean;
  oldStatus?: string;
  newStatus?: string;
  stageChanged?: boolean;
  oldStage?: string;
  newStage?: string;
  otherChanges?: string[];
  adminNotes?: string;
}

export async function sendStartupAdminUpdateEmail(params: StartupUpdateEmailParams): Promise<boolean> {
  const fromEmail = process.env.SMTP_FROM || '"Takhleeq Admin" <notifications@takhleeq-erp.ucp.edu.pk>';
  const mailTransporter = getTransporter();

  let changesSummaryHtml = '';

  if (params.passwordChanged && params.newPassword) {
    changesSummaryHtml += `
      <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
        <strong style="color: #991b1b; font-size: 13px;">🔑 Login Password Reset:</strong>
        <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 14px; font-weight: bold; color: #7f1d1d;">
          New Password: ${params.newPassword}
        </p>
        <span style="font-size: 11px; color: #991b1b;">Please use this password to log in to your Founder Portal.</span>
      </div>
    `;
  }

  if (params.programStatusChanged) {
    let badgeBg = '#f3f4f6';
    let badgeText = '#374151';
    let statusDesc = '';

    if (params.newStatus === 'ACTIVE') {
      badgeBg = '#dcfce7';
      badgeText = '#166534';
      statusDesc = 'Your startup program status is set to ACTIVE.';
    } else if (params.newStatus === 'PAUSED') {
      badgeBg = '#fef3c7';
      badgeText = '#92400e';
      statusDesc = 'Your startup account has been TEMPORARILY BLOCKED / PAUSED by Takhleeq Management.';
    } else if (params.newStatus === 'KICKED_OUT') {
      badgeBg = '#fee2e2';
      badgeText = '#991b1b';
      statusDesc = 'Your startup has been TERMINATED / KICKED OUT from the cohort program by Takhleeq Management.';
    }

    changesSummaryHtml += `
      <div style="background-color: ${badgeBg}; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
        <strong style="color: ${badgeText}; font-size: 13px;">📌 Program Status Updated:</strong>
        <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: ${badgeText};">
          ${params.oldStatus || 'Previous'} &rarr; ${params.newStatus}
        </p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: ${badgeText};">${statusDesc}</p>
      </div>
    `;
  }

  if (params.stageChanged) {
    changesSummaryHtml += `
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
        <strong style="color: #1e40af; font-size: 13px;">🚀 Progress Stage Advanced:</strong>
        <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: #1e3a8a;">
          ${params.oldStage || 'Previous Stage'} &rarr; ${params.newStage}
        </p>
      </div>
    `;
  }

  if (params.otherChanges && params.otherChanges.length > 0) {
    changesSummaryHtml += `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
        <strong style="color: #334155; font-size: 13px;">📝 Profile Details Updated:</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 12px; color: #475569;">
          ${params.otherChanges.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (params.adminNotes && params.adminNotes.trim()) {
    changesSummaryHtml += `
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
        <strong style="color: #92400e; font-size: 13px;">💬 Admin Remarks:</strong>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #78350f;">${params.adminNotes.trim()}</p>
      </div>
    `;
  }

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <tr>
          <td style="background-color: #8B1A1A; padding: 20px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">Takhleeq Business Incubator</h1>
            <p style="margin: 4px 0 0 0; color: #fca5a5; font-size: 11px; text-transform: uppercase;">Startup Profile Update Notice</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 25px 30px;">
            <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 16px;">Dear ${params.founderName},</h3>
            <p style="margin: 0 0 15px 0; color: #4b5563; font-size: 13px; line-height: 1.5;">
              This email is to notify you that administrative updates have been made to your startup profile <strong>${params.startupName}</strong> by Takhleeq Management.
            </p>
            ${changesSummaryHtml}
            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px;">
              You can log in to your Founder Portal at any time to review your updated dashboard and progress records.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f9fafb; padding: 15px 30px; text-align: center; border-top: 1px solid #f3f4f6;">
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
              Takhleeq Innovation & Entrepreneurship Center &bull; University of Central Punjab
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const subject = `Startup Profile Updated: ${params.startupName}`;

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: fromEmail,
        to: params.founderEmail,
        subject,
        html: htmlBody,
      });
      console.log(`[SMTP] Sent startup admin update email to ${params.founderEmail}`);
      return true;
    } catch (err) {
      console.error(`[SMTP Error] Failed to send update email to ${params.founderEmail}:`, err);
      return false;
    }
  } else {
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log(`│ [SMTP SIMULATOR] Dispatching Startup Update Email           │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│ TO:      ${params.founderEmail.padEnd(50)} │`);
    console.log(`│ STARTUP: ${params.startupName.padEnd(50)} │`);
    console.log(`│ SUBJECT: ${subject.padEnd(50)} │`);
    console.log(`└─────────────────────────────────────────────────────────────┘\n`);
    return true;
  }
}
