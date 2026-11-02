/**
 * Enum Formatter for Takhleeq ERP
 * Standardizes raw database enum keys into clean, human-readable labels per UX Audit item G-02
 */

const ENUM_LABEL_MAP: Record<string, string> = {
  // Startup stages
  'IDEA': 'Idea',
  'IDEA_STAGE': 'Idea',
  'PROBLEM_DISCOVERY': 'Problem discovery',
  'PROBLEM_VALIDATION': 'Problem validation',
  'MARKET_VALIDATION': 'Market validation',
  'PROTOTYPE_MVP': 'Prototype / MVP',
  'MVP': 'Prototype / MVP',
  'EARLY_TRACTION': 'Early traction',
  'EARNING_REVENUE': 'Earning revenue',
  'POST_REVENUE': 'Earning revenue',
  'SCALING': 'Scaling',

  // Revenue stages
  'PRE_REVENUE': 'Not earning yet',
  'EARNING': 'Earning revenue',
  'PROFITABLE': 'Profitable',

  // Funding stages
  'BOOTSTRAPPED': 'Self-funded',
  'ANGEL': 'Angel funded',
  'SEED': 'Seed funded',
  'SERIES_A': 'Series A',

  // Application / Cohort stages
  'SUBMITTED': 'Submitted',
  'UNDER_REVIEW': 'Under review',
  'SHORTLISTED': 'Shortlisted',
  'INTERVIEW_SCHEDULED': 'Interview scheduled',
  'INTERVIEWED': 'Interviewed',
  'ACCEPTED': 'Accepted',
  'CONTRACT_SIGNED': 'Contract signed',
  'ORIENTATION_CONDUCTED': 'Orientation conducted',
  'ACTIVE_INCUBATION': 'Active incubation',
  'GRADUATED': 'Graduated',
  'REJECTED': 'Not accepted',
  'WITHDRAWN': 'Withdrawn',

  // Booking statuses
  'CONFIRMED': 'Confirmed',
  'PENDING': 'Pending review',
  'CANCELLED': 'Cancelled',
  'COMPLETED': 'Completed',

  // Booking classification
  'STUDENT': 'Student society',
  'FACULTY': 'Faculty / Dept',
  'STARTUP': 'Incubation startup',
  'ADMIN': 'Staff administration',
};

export function formatEnumLabel(rawEnum: string | null | undefined): string {
  if (!rawEnum) return '—';
  if (ENUM_LABEL_MAP[rawEnum]) return ENUM_LABEL_MAP[rawEnum];
  
  // Fallback: convert SNAKE_CASE to sentence case
  return rawEnum
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}
