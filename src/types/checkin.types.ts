export type CheckinAttendanceStatus = 'unmarked' | 'attended' | 'no_show';

export interface CheckinChecklistItem {
  id: number;
  checkin_id: number;
  originating_checkin_id?: number | null;
  description: string;
  is_completed: boolean;
  created_at: string;
}

export interface Checkin {
  id: number;
  startup_profile_id: number;
  cohort_id: number;
  scheduled_at: string;
  notes?: string | null;
  attendance_status: CheckinAttendanceStatus;
  created_by_user_id?: number | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;
  // Joins & derived
  startup_name?: string;
  founder_name?: string;
  founder_email?: string;
  cohort_name?: string;
  checklist_items?: CheckinChecklistItem[];
  total_checklist_items?: number;
  completed_checklist_items?: number;
}

export interface CreateCheckinPayload {
  startup_profile_id: number;
  scheduled_at?: string;
  notes?: string;
  attendance_status?: CheckinAttendanceStatus;
  checklist_items?: string[];
}

export interface UpdateCheckinPayload {
  notes?: string;
  attendance_status?: CheckinAttendanceStatus;
  scheduled_at?: string;
}
