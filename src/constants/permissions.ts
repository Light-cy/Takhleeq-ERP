// Single source of truth for custom role permission nodes
export const Permissions = {
  // --- COHORT & INCUBATION GRANULAR NODES ---
  VIEW_COHORT_DASHBOARD: 'cohort:dashboard_view',
  MANAGE_COHORT_SETTINGS: 'cohort:settings_manage',
  MANAGE_APPLICATION_FORM: 'cohort:form_manage',
  REVIEW_COHORT_APPLICATIONS: 'cohort:applicant_review',
  MANAGE_COHORT_STARTUPS: 'cohort:startups_manage',
  MANAGE_COHORT_SESSIONS: 'cohort:session_manage',
  MANAGE_COHORT_ASSIGNMENTS: 'cohort:assignment_manage',
  VIEW_FOUNDER_FEEDBACK: 'cohort:feedback_view',
  MANAGE_FEEDBACK_FORMS: 'cohort:feedback_forms_manage',
  
  // Cohort Operational Sub-nodes
  COHORT_ATTENDANCE_WRITE: 'cohort:attendance_write',
  COHORT_CHECKIN_LOG: 'cohort:checkin_log',
  COHORT_WARNING_WRITE: 'cohort:warning_write',
  COHORT_PROFILE_WRITE: 'cohort:profile_write',
  COHORT_FEEDBACK_SUBMIT: 'cohort:feedback_submit',
  COHORT_ASSIGNMENT_UPLOAD: 'cohort:assignment_upload',

  // --- FACILITY & BOOKING NODES ---
  SUBMIT_BOOKING: 'SUBMIT_BOOKING',
  CANCEL_OWN_BOOKING: 'CANCEL_OWN_BOOKING',
  VIEW_PENDING_QUEUE: 'VIEW_PENDING_QUEUE',
  APPROVE_REJECT_BOOKINGS: 'APPROVE_REJECT_BOOKINGS',
  BOOKING_OVERRIDE: 'BOOKING_OVERRIDE',
  MANAGE_ROOMS: 'MANAGE_ROOMS',
  MANAGE_BOOKING_TYPES: 'MANAGE_BOOKING_TYPES',
  VIEW_BOOKING_ANALYTICS: 'VIEW_BOOKING_ANALYTICS',

  // --- GOVERNANCE & SECURITY NODES ---
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  VIEW_ANALYTICS_DASHBOARD: 'VIEW_ANALYTICS_DASHBOARD',
  EXPORT_AUDIT_LOGS: 'EXPORT_AUDIT_LOGS',
  ISSUE_BAN: 'ISSUE_BAN'
} as const;

export type PermissionType = typeof Permissions[keyof typeof Permissions];

