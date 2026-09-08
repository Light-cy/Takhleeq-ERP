/**
 * Staff Back-Office Tab Navigation & Permission Guard Utilities
 */

export interface StaffTabDefinition {
  id: string;
  name: string;
  section: 'booking' | 'cohort' | 'admin';
  check: (has: (permissionNode: string) => boolean) => boolean;
}

export const STAFF_TABS: StaffTabDefinition[] = [
  // 1. Booking Operations
  {
    id: 'queue',
    name: 'Review Queue',
    section: 'booking',
    check: (has) => has('VIEW_PENDING_QUEUE')
  },
  {
    id: 'register',
    name: 'Booking Register',
    section: 'booking',
    check: (has) => has('BOOKING_OVERRIDE') || has('VIEW_PENDING_QUEUE')
  },
  {
    id: 'rooms',
    name: 'Room Management',
    section: 'booking',
    check: (has) => has('MANAGE_ROOMS')
  },
  {
    id: 'booking_types',
    name: 'Booking Types',
    section: 'booking',
    check: (has) => has('MANAGE_BOOKING_TYPES')
  },
  {
    id: 'booking_analytics',
    name: 'Booking Analytics',
    section: 'booking',
    check: (has) => has('VIEW_BOOKING_ANALYTICS') || has('VIEW_ANALYTICS_DASHBOARD')
  },

  // 2. Cohort & Incubation Management
  {
    id: 'cohort_dashboard',
    name: 'Cohort Dashboard',
    section: 'cohort',
    check: (has) => 
      has('cohort:dashboard_view') || 
      has('VIEW_COHORT_DASHBOARD') || 
      has('cohort:applicant_review') || 
      has('cohort:session_manage') || 
      has('cohort:form_manage')
  },
  {
    id: 'cohort_settings',
    name: 'Cohort Settings',
    section: 'cohort',
    check: (has) => 
      has('cohort:settings_manage') || 
      has('MANAGE_COHORT_SETTINGS') || 
      has('cohort:form_manage')
  },
  {
    id: 'cohort_form_config',
    name: 'Application Form Config',
    section: 'cohort',
    check: (has) => 
      has('cohort:form_manage') || 
      has('MANAGE_APPLICATION_FORM')
  },
  {
    id: 'cohort_applications',
    name: 'Review Applications',
    section: 'cohort',
    check: (has) => 
      has('cohort:applicant_review') || 
      has('REVIEW_COHORT_APPLICATIONS')
  },
  {
    id: 'cohort_startups',
    name: 'Active Startups',
    section: 'cohort',
    check: (has) => 
      has('cohort:startups_manage') || 
      has('MANAGE_COHORT_STARTUPS') || 
      has('cohort:applicant_review')
  },
  {
    id: 'cohort_sessions',
    name: 'Sessions',
    section: 'cohort',
    check: (has) => 
      has('cohort:session_manage') || 
      has('MANAGE_COHORT_SESSIONS')
  },
  {
    id: 'cohort_assignments',
    name: 'Assignments',
    section: 'cohort',
    check: (has) => 
      has('cohort:assignment_manage') || 
      has('MANAGE_COHORT_ASSIGNMENTS') || 
      has('cohort:session_manage')
  },
  {
    id: 'cohort_feedback',
    name: 'Founder Feedback',
    section: 'cohort',
    check: (has) => 
      has('cohort:feedback_view') || 
      has('VIEW_FOUNDER_FEEDBACK') || 
      has('cohort:checkin_log') || 
      has('cohort:applicant_review')
  },
  {
    id: 'cohort_feedback_forms',
    name: 'Feedback Forms & Surveys',
    section: 'cohort',
    check: (has) => 
      has('cohort:feedback_forms_manage') || 
      has('MANAGE_FEEDBACK_FORMS') || 
      has('cohort:form_manage') || 
      has('cohort:applicant_review')
  },

  // 3. Administration & Governance
  {
    id: 'governance',
    name: 'Governance Center',
    section: 'admin',
    check: (has) => 
      has('ISSUE_BAN') || 
      has('MANAGE_ROLES') || 
      has('MANAGE_USERS')
  },
  {
    id: 'audits',
    name: 'Audit Logs & Analytics',
    section: 'admin',
    check: (has) => 
      has('VIEW_AUDIT_LOGS') || 
      has('EXPORT_AUDIT_LOGS') || 
      has('VIEW_ANALYTICS_DASHBOARD')
  }
];

/**
 * Normalizes tab alias strings to canonical tab IDs
 */
export function normalizeStaffTab(tabId: string): string {
  if (!tabId) return 'queue';
  if (tabId === 'types') return 'booking_types';
  if (tabId === 'analytics') return 'booking_analytics';
  if (tabId === 'cohorts') return 'cohort_dashboard';
  if (tabId === 'builder') return 'cohort_form_config';
  if (tabId === 'cohort_intake') return 'cohort_applications';
  if (tabId === 'feedback_forms' || tabId === 'cohort_surveys') return 'cohort_feedback_forms';
  return tabId;
}

/**
 * Checks whether a specific tab is permitted for the active user's permissions
 */
export function isStaffTabAllowed(
  tabId: string, 
  hasPermission: (permissionNode: string) => boolean
): boolean {
  const normalized = normalizeStaffTab(tabId);
  const def = STAFF_TABS.find(t => t.id === normalized);
  if (!def) return false;
  return def.check(hasPermission);
}

/**
 * Finds the first allowed staff tab according to user permissions.
 * Falls back to 'queue' if nothing or if queue is allowed.
 */
export function getFirstAllowedStaffTab(
  hasPermission: (permissionNode: string) => boolean
): string {
  const firstAllowed = STAFF_TABS.find(t => t.check(hasPermission));
  return firstAllowed ? firstAllowed.id : 'queue';
}

/**
 * Identifies the sidebar parent section of a tab for auto-expanding accordions
 */
export function getStaffTabSection(tabId: string): 'booking' | 'cohort' | 'admin' {
  const normalized = normalizeStaffTab(tabId);
  const def = STAFF_TABS.find(t => t.id === normalized);
  return def ? def.section : 'booking';
}
