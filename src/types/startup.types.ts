export type StartupProgressStage = 
  | 'IDEA_STAGE' 
  | 'PROBLEM_DISCOVERY' 
  | 'MARKET_VALIDATION' 
  | 'POC_MVP' 
  | 'POST_REVENUE' 
  | 'SCALE_STAGE';

export type StartupProgramStatus = 'ACTIVE' | 'PAUSED' | 'GRADUATED' | 'KICKED_OUT';
export type ProgramStatus = StartupProgramStatus;
export type StartupType = 'PRODUCT' | 'SERVICE' | 'HYBRID';
export type BusinessModel = 'B2B' | 'B2C' | 'SUBSCRIPTION';
export type RevenueStatus = 'PRE_REVENUE' | 'POST_REVENUE' | 'PROFITABLE';
export type FundingStatus = 'BOOTSTRAPPED' | 'GRANT_FUNDED' | 'PRE_SEED' | 'SEED' | 'SERIES_A_PLUS';

export interface Industry {
  id: number;
  name: string;
}

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  github?: string;
}

export interface ContactInfo {
  primary_email?: string;
  primary_phone?: string;
  address?: string;
  secondary_email?: string;
}

export interface FounderInfo {
  id: number;
  name: string;
  email: string;
  phone: string;
  cnic: string;
  role: 'PRIMARY' | 'CO_FOUNDER';
  tracking_token?: string;
}

export interface StartupProfile {
  id: number;
  applicant_id: number;
  startup_name: string;
  logo_url?: string | null;
  industry_id?: number | null;
  industry_name?: string | null;
  description: string;
  website?: string | null;
  social_links: SocialLinks;
  contact_info: ContactInfo;
  startup_type?: StartupType | null;
  business_model?: BusinessModel | null;
  cohort_id?: number | null;
  cohort_name?: string | null;
  enrollment_date: string;
  current_progress_stage: StartupProgressStage;
  program_status: ProgramStatus;
  team_size: number;
  revenue_status: RevenueStatus;
  funding_status: FundingStatus;
  founders?: FounderInfo[];
  created_at: string;
  updated_at: string;
}

export interface StartupStageHistory {
  id: number;
  startup_profile_id: number;
  previous_stage: StartupProgressStage | null;
  new_stage: StartupProgressStage;
  change_date: string;
  updated_by_user_id?: number | null;
  updated_by_email: string;
  comments?: string | null;
}

export interface StartupPivot {
  id: number;
  startup_profile_id: number;
  previous_idea?: string | null;
  new_idea: string;
  previous_industry_id?: number | null;
  previous_industry_name?: string | null;
  new_industry_id?: number | null;
  new_industry_name?: string | null;
  pivot_date: string;
  reason: string;
  approved_by_user_id?: number | null;
  approved_by_email: string;
  supporting_notes?: string | null;
}

export interface StartupAuditLog {
  id: number;
  startup_profile_id: number;
  changed_by_user_id?: number | null;
  changed_by_email: string;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
}
