export type CohortStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';

export interface Cohort {
  id: number;
  name: string;
  status: CohortStatus;
  created_at: string;
  intake_year?: string;
  start_date?: string;
  end_date?: string;
  max_capacity?: number;
  assigned_manager_id?: string;
  assigned_manager_name?: string;
  description?: string;
  updated_at?: string;
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
  topic_category?: string;
  venue?: string;
  recording_url?: string;
  is_design_thinking_bootcamp?: boolean;
  attendance_summary?: string;
  assignments_summary?: string;
  feedback_count?: number;
  average_rating?: number;
  feedback_status?: 'UPCOMING' | 'ACTIVE' | 'EXPIRED';
  days_remaining?: number;
  feedback_summary?: string;
  created_at: string;
}

export interface SessionFeedbackSubmission {
  id: number;
  cohort_id: number;
  session_id: number;
  user_id?: number | null;
  applicant_id?: number | null;
  founder_name: string;
  startup_name: string;
  feedback_type: string;
  rating: number;
  title?: string;
  comment?: string;
  is_anonymous: boolean;
  status: string;
  staff_response?: string | null;
  created_at: string;
}

export interface SessionFeedbackSummary {
  session_id: number;
  session_title: string;
  session_date: string;
  start_time?: string;
  end_time?: string;
  mentor_name?: string | null;
  cohort_id: number;
  total_startups: number;
  total_submissions: number;
  average_rating: number;
  rating_breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  feedback_status: 'UPCOMING' | 'ACTIVE' | 'EXPIRED';
  days_remaining: number;
  window_opens_date: string;
  window_closes_date: string;
  current_user_submitted: boolean;
  current_user_feedback?: SessionFeedbackSubmission | null;
  feedbacks: SessionFeedbackSubmission[];
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

export type FeedbackQuestionType = 'rating_1_10' | 'short_text' | 'long_text';
export type FeedbackFormStatus = 'Active' | 'Closed';

export interface FeedbackQuestion {
  id: number;
  feedback_form_id: number;
  question_text: string;
  question_type: FeedbackQuestionType;
  question_order: number;
}

export interface FeedbackForm {
  id: number;
  cohort_id: number;
  title: string;
  description?: string;
  is_anonymous: boolean;
  created_by?: number | null;
  created_by_name?: string;
  created_at: string;
  expiry_date?: string | null;
  status: FeedbackFormStatus;
  session_id?: number | null;
  session_title?: string | null;
  questions?: FeedbackQuestion[];
  response_count?: number;
  total_startups?: number;
  completion_rate?: number;
  has_submitted?: boolean;
}

export interface FeedbackResponseItem {
  id: number;
  feedback_form_id: number;
  question_id: number;
  startup_id?: number;
  startup_name?: string;
  founder_name?: string;
  answer_value: string;
  submitted_at: string;
}

export interface FeedbackQuestionAnalytics {
  question: FeedbackQuestion;
  average_rating?: number;
  rating_distribution?: Record<number, number>;
  answers: {
    id?: number;
    answer_value: string;
    startup_name?: string;
    founder_name?: string;
    submitted_at: string;
  }[];
}

export interface FeedbackFormAnalytics {
  form: FeedbackForm;
  total_cohort_startups: number;
  submitted_startups_count: number;
  completion_rate_percent: number;
  questions_analytics: FeedbackQuestionAnalytics[];
}

