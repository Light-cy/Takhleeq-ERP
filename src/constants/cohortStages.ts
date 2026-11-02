import { ApplicantStatus } from '../types/cohort.types';

export interface CohortStage {
  key: ApplicantStatus;
  label: string; // e.g. "1. Applied"
  name: string; // e.g. "Applied"
  shortLabel: string;
  stepNumber: number;
  desc: string;
  type: 'linear' | 'alternate' | 'terminal';
}

export const COHORT_STAGES: CohortStage[] = [
  {
    key: 'APPLIED',
    label: '1. Applied',
    name: 'Applied',
    shortLabel: 'Applied',
    stepNumber: 1,
    desc: 'Application form submitted',
    type: 'linear'
  },
  {
    key: 'UNDER_REVIEW',
    label: '2. Under review',
    name: 'Under review',
    shortLabel: 'Under review',
    stepNumber: 2,
    desc: 'Desk screening and review',
    type: 'linear'
  },
  {
    key: 'SHORTLISTED_FOR_PRESENTATION',
    label: '3. Shortlisted for presentation',
    name: 'Shortlisted for presentation',
    shortLabel: 'Shortlisted for pitch',
    stepNumber: 3,
    desc: 'Invited to panel presentation',
    type: 'linear'
  },
  {
    key: 'PRESENTATION_CONDUCTED',
    label: '4. Presentation completed',
    name: 'Presentation completed',
    shortLabel: 'Pitch completed',
    stepNumber: 4,
    desc: 'Panel evaluation completed',
    type: 'linear'
  },
  {
    key: 'CONDITIONAL_ACCEPTED',
    label: '5. Conditional offer',
    name: 'Conditional offer',
    shortLabel: 'Conditional offer',
    stepNumber: 5,
    desc: 'Conditional admission offer issued',
    type: 'linear'
  },
  {
    key: 'ACCEPTED',
    label: '6. Accepted',
    name: 'Accepted',
    shortLabel: 'Accepted',
    stepNumber: 6,
    desc: 'Seat offered to founder',
    type: 'linear'
  },
  {
    key: 'CONFIRMED',
    label: '7. Confirmed',
    name: 'Confirmed',
    shortLabel: 'Seat confirmed',
    stepNumber: 7,
    desc: 'Founder accepted and seat reserved',
    type: 'linear'
  },
  {
    key: 'ORIENTATION_CONDUCTED',
    label: '8. Orientation conducted',
    name: 'Orientation conducted',
    shortLabel: 'Orientation conducted',
    stepNumber: 8,
    desc: 'Induction and onboarding session',
    type: 'linear'
  },
  {
    key: 'ENROLLED',
    label: '9. Enrolled',
    name: 'Enrolled',
    shortLabel: 'Enrolled in batch',
    stepNumber: 9,
    desc: 'Active cohort venture',
    type: 'linear'
  },
  {
    key: 'WAITLISTED',
    label: '10. Waitlisted',
    name: 'Waitlisted',
    shortLabel: 'Waitlisted',
    stepNumber: 10,
    desc: 'Waitlisted for available seat',
    type: 'alternate'
  },
  {
    key: 'BACKUP_CANDIDATE',
    label: '11. Backup candidate',
    name: 'Backup candidate',
    shortLabel: 'Backup list',
    stepNumber: 11,
    desc: 'Backup pool candidate',
    type: 'alternate'
  },
  {
    key: 'REJECTED',
    label: '12. Rejected',
    name: 'Rejected',
    shortLabel: 'Not selected',
    stepNumber: 12,
    desc: 'Application not selected',
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
  if (s === '4' || s === 'PRESENTATION_SCHEDULED' || s === 'PRESENTATION_COMPLETED') return 'PRESENTATION_CONDUCTED';
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
