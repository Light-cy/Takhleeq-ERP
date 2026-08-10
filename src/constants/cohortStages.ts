import { ApplicantStatus } from '../types/cohort.types';

export interface CohortStage {
  key: ApplicantStatus;
  label: string; // e.g. "1. APPLIED"
  name: string; // e.g. "Applied"
  shortLabel: string;
  stepNumber: number;
  desc: string;
  type: 'linear' | 'alternate' | 'terminal';
}

export const COHORT_STAGES: CohortStage[] = [
  {
    key: 'APPLIED',
    label: '1. APPLIED',
    name: 'Applied',
    shortLabel: 'Applied',
    stepNumber: 1,
    desc: 'Application Form Submitted',
    type: 'linear'
  },
  {
    key: 'UNDER_REVIEW',
    label: '2. UNDER REVIEW',
    name: 'Under Review',
    shortLabel: 'Under Review',
    stepNumber: 2,
    desc: 'Desk Screening & Review',
    type: 'linear'
  },
  {
    key: 'SHORTLISTED_FOR_PRESENTATION',
    label: '3. SHORTLISTED FOR PRESENTATION',
    name: 'Shortlisted for Presentation',
    shortLabel: 'Shortlisted for Pitch',
    stepNumber: 3,
    desc: 'Invited to Panel Presentation',
    type: 'linear'
  },
  {
    key: 'PRESENTATION_CONDUCTED',
    label: '4. PRESENTATION CONDUCTED',
    name: 'Presentation Conducted',
    shortLabel: 'Pitch Conducted',
    stepNumber: 4,
    desc: 'Panel Evaluation Completed',
    type: 'linear'
  },
  {
    key: 'CONDITIONAL_ACCEPTED',
    label: '5. CONDITIONAL ACCEPTED',
    name: 'Conditional Accepted',
    shortLabel: 'Conditional Accept',
    stepNumber: 5,
    desc: 'Conditional Offer Issued',
    type: 'linear'
  },
  {
    key: 'ACCEPTED',
    label: '6. ACCEPTED',
    name: 'Accepted',
    shortLabel: 'Accepted / Offer',
    stepNumber: 6,
    desc: 'Seat Offered to Founder',
    type: 'linear'
  },
  {
    key: 'CONFIRMED',
    label: '7. CONFIRMED',
    name: 'Confirmed',
    shortLabel: 'Seat Confirmed',
    stepNumber: 7,
    desc: 'Founder Accepted & Seat Reserved',
    type: 'linear'
  },
  {
    key: 'ORIENTATION_CONDUCTED',
    label: '8. ORIENTATION CONDUCTED',
    name: 'Orientation Conducted',
    shortLabel: 'Orientation Conducted',
    stepNumber: 8,
    desc: 'Induction & Onboarding Session',
    type: 'linear'
  },
  {
    key: 'ENROLLED',
    label: '9. ENROLLED',
    name: 'Enrolled',
    shortLabel: 'Enrolled in Batch',
    stepNumber: 9,
    desc: 'Active Cohort Venture',
    type: 'linear'
  },
  {
    key: 'WAITLISTED',
    label: '10. WAITLISTED',
    name: 'Waitlisted',
    shortLabel: 'Waitlisted Pool',
    stepNumber: 10,
    desc: 'Waitlisted for Available Seat',
    type: 'alternate'
  },
  {
    key: 'BACKUP_CANDIDATE',
    label: '11. BACKUP CANDIDATE',
    name: 'Backup Candidate',
    shortLabel: 'Backup List',
    stepNumber: 11,
    desc: 'Backup Pool Candidate',
    type: 'alternate'
  },
  {
    key: 'REJECTED',
    label: '12. REJECTED',
    name: 'Rejected',
    shortLabel: 'Not Selected',
    stepNumber: 12,
    desc: 'Application Rejected / Not Selected',
    type: 'terminal'
  }
];

/**
 * Normalizes legacy or raw status values to valid ApplicantStatus
 */
export const normalizeApplicantStatus = (rawStatus: any): ApplicantStatus => {
  if (!rawStatus) return 'APPLIED';
  const s = typeof rawStatus === 'string' ? rawStatus.toUpperCase().trim() : String(rawStatus).toUpperCase().trim();
  if (s === 'SUBMITTED' || s === '1') return 'APPLIED';
  if (s === 'IN_REVIEW' || s === '2') return 'UNDER_REVIEW';
  if (s === 'SHORTLISTED' || s === '3') return 'SHORTLISTED_FOR_PRESENTATION';
  if (s === '4') return 'PRESENTATION_CONDUCTED';
  if (s === '5') return 'CONDITIONAL_ACCEPTED';
  if (s === '6') return 'ACCEPTED';
  if (s === '7') return 'CONFIRMED';
  if (s === '8') return 'ORIENTATION_CONDUCTED';
  if (s === '9') return 'ENROLLED';
  if (s === '10') return 'WAITLISTED';
  if (s === '11') return 'BACKUP_CANDIDATE';
  if (s === '12') return 'REJECTED';

  const matched = COHORT_STAGES.find(st => st.key === s);
  return matched ? matched.key : 'APPLIED';
};

/**
 * Get stage object by status
 */
export const getStageByStatus = (rawStatus: any): CohortStage => {
  const normalized = normalizeApplicantStatus(rawStatus);
  return COHORT_STAGES.find(st => st.key === normalized) || COHORT_STAGES[0];
};

/**
 * Get 0-based index of stage in COHORT_STAGES by matching stage key
 */
export const getStageIndexByStatus = (rawStatus: any): number => {
  const normalized = normalizeApplicantStatus(rawStatus);
  const idx = COHORT_STAGES.findIndex(st => st.key === normalized);
  return idx >= 0 ? idx : 0;
};
