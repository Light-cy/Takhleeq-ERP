export type CohortStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';

export interface Cohort {
  id: number;
  name: string;
  status: CohortStatus;
  created_at: string;
}

export type FormFieldValidation = 'text' | 'email' | 'number' | 'cnic' | 'phone' | 'file' | 'select' | 'textarea';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldValidation;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface CohortFormSettings {
  is_active: boolean;
  fields: FormField[];
}

export type ApplicantStatus = 
  | 'APPLIED' 
  | 'UNDER_REVIEW' 
  | 'SHORTLISTED_FOR_PRESENTATION' 
  | 'PRESENTATION_CONDUCTED' 
  | 'CONDITIONAL_ACCEPTED' 
  | 'ACCEPTED' 
  | 'REJECTED' 
  | 'WAITLISTED' 
  | 'BACKUP_CANDIDATE' 
  | 'CONFIRMED' 
  | 'ORIENTATION_CONDUCTED' 
  | 'ENROLLED';
export type ProgramStatus = 'NOT_ENROLLED' | 'ACTIVE' | 'PAUSED' | 'GRADUATED' | 'KICKED_OUT';

export interface Applicant {
  id: number;
  tracking_token: string;
  name: string;
  email: string;
  phone: string;
  cnic: string;
  startup_name: string;
  startup_description: string;
  cohort_id: number | null;
  status: ApplicantStatus;
  program_status: ProgramStatus;
  panel_scores?: {
    viability?: number;
    team?: number;
    scalability?: number;
    average?: number;
    [key: string]: any;
  } | null;
  parent_applicant_id: number | null;
  form_data: Record<string, any>;
  orientation_conducted: boolean;
  created_at: string;
}

export interface CohortSession {
  id: number;
  cohort_id: number;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  mentor_name: string | null;
  created_at: string;
}

export interface SessionAttendance {
  id: number;
  session_id: number;
  applicant_id: number;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  marked_at: string;
}

export interface TeamCheckIn {
  id: number;
  cohort_id: number;
  applicant_id: number;
  logged_by: string;
  blockers: string;
  progress_score: number; // 1-10
  mentor_notes: string;
  created_at: string;
}

export interface PerformanceWarning {
  id: number;
  cohort_id: number;
  applicant_id: number;
  issued_by: string;
  reason: string;
  severity: 'YELLOW' | 'RED';
  status: 'ACTIVE' | 'RESOLVED' | 'REVOKED';
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AssignmentType = 'SESSION' | 'MILESTONE';
export type RecurrenceRule = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY';

export interface CohortAssignment {
  id: number;
  cohort_id: number;
  title: string;
  description?: string;
  type: AssignmentType;
  due_date: string;
  recurrence_rule?: RecurrenceRule;
  session_id?: number | null;
  is_template?: boolean;
  parent_template_id?: number | null;
  created_at: string;
}

export type SubmissionVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface MilestoneSubmission {
  id: number;
  assignment_id: number; // References CohortAssignment where type = 'MILESTONE'
  applicant_id: number;
  file_url: string;
  notes?: string;
  status: SubmissionVerificationStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  submitted_at: string;
}

