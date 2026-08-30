import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Building2, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  FileText, 
  Upload, 
  ShieldAlert,
  Globe,
  Phone,
  Link as LinkIcon,
  ChevronRight,
  Star,
  Plus,
  Trash2,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Users,
  Bell,
  ArrowRight,
  HelpCircle,
  Download,
  DollarSign,
  Edit3,
  Save,
  Check,
  ExternalLink,
  PieChart,
  Linkedin,
  Clock3,
  Twitter,
  Github,
  Instagram,
  Layers,
  Award,
  EyeOff,
  UserCheck,
  ShieldCheck,
  Paperclip,
  FileCheck,
  X,
  Send,
  RotateCcw
} from 'lucide-react';
import { downloadFileLocally, formatFileSize, getCleanFileName, parseAssignmentAttachments } from '../../../utils/fileDownload';

const CustomIncomeTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl border border-slate-800 space-y-1 font-sans">
        <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1">{label}</p>
        <p className="font-extrabold text-emerald-400">
          Income: PKR {payload[0]?.value?.toLocaleString() || 0}
        </p>
        {payload[1] && (
          <p className="text-slate-400 text-[11px]">
            Target: PKR {payload[1]?.value?.toLocaleString() || 0}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const CustomAttendanceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900 text-white text-xs rounded-xl p-2.5 shadow-xl border border-slate-800 space-y-0.5 font-sans">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
          <span className="font-bold">{data.name}:</span>
          <span className="font-mono font-bold text-amber-300">{data.value} Sessions</span>
        </div>
      </div>
    );
  }
  return null;
};

interface CohortFounderDashboardPageProps {
  jwtToken: string | null;
  onNavigate: (path: string) => void;
}

interface Session {
  id: number;
  cohort_id: number;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  mentor_name: string;
  topic_category?: string;
  venue?: string;
  recording_url?: string;
}

interface Attendance {
  id: number;
  session_id: number;
  applicant_id: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  logged_at: string;
}

interface Checkin {
  id: number;
  cohort_id: number;
  applicant_id: number;
  logged_by: string;
  blockers: string;
  progress_score: number;
  mentor_notes?: string;
  created_at: string;
}

interface Warning {
  id: number;
  applicant_id: number;
  reason: string;
  meeting_date: string;
  status: 'ACTIVE' | 'RESOLVED' | 'REVOKED';
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface SharedNote {
  id: string;
  date: string;
  author: string;
  content: string;
}

interface NotificationItem {
  id: string;
  date: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
}

interface PivotRecord {
  id: string;
  date: string;
  oldDirection: string;
  newDirection: string;
  hypothesis: string;
}

interface AssignmentItem {
  id: string;
  title: string;
  deadline: string;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  fileName?: string;
  uploadedAt?: string;
  attachmentUrl?: string;
  description?: string;
  sessionTitle?: string;
}

export const CohortFounderDashboardPage: React.FC<CohortFounderDashboardPageProps> = ({ jwtToken, onNavigate }) => {
  // Global States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');

  // DB Synced States
  const [applicant, setApplicant] = useState<any>(null);
  const [cohort, setCohort] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'assignments' | 'profile_financials' | 'pivots' | 'feedback'>('overview');

  // Dynamic Profile JSON-backed states (all saved to applicant.form_data.profile)
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [teamRoster, setTeamRoster] = useState<TeamMember[]>([]);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pivotHistory, setPivotHistory] = useState<PivotRecord[]>([]);
  const [ratedSessions, setRatedSessions] = useState<number[]>([]);

  // Editable Founder Inputs
  const [descInput, setDescInput] = useState('');
  const [websiteInput, setWebsiteInput] = useState('');
  const [socialLinksInput, setSocialLinksInput] = useState('');
  const [logoInput, setLogoInput] = useState('');
  const [contactInput, setContactInput] = useState('');
  
  // Financial & Metrics Inputs (Founder Editable - Aligned with Admin Panel)
  const [revenueStatusInput, setRevenueStatusInput] = useState('PRE_REVENUE');
  const [monthlyRevenueInput, setMonthlyRevenueInput] = useState('0');
  const [annualRecurringRevenueInput, setAnnualRecurringRevenueInput] = useState('0');
  const [fundingStatusInput, setFundingStatusInput] = useState('BOOTSTRAPPED');
  const [fundingRaisedInput, setFundingRaisedInput] = useState('0');
  const [burnRateInput, setBurnRateInput] = useState('0');
  const [teamSizeInput, setTeamSizeInput] = useState('1');
  const [pitchDeckInput, setPitchDeckInput] = useState('');
  const [linkedinInput, setLinkedinInput] = useState('');
  const [twitterInput, setTwitterInput] = useState('');
  const [githubInput, setGithubInput] = useState('');
  const [instagramInput, setInstagramInput] = useState('');

  // Modals & Interactive UI Triggers
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  // Session Feedback Modal State
  const [activeFeedbackSession, setActiveFeedbackSession] = useState<Session | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackIsAnonymous, setFeedbackIsAnonymous] = useState(false);

  // General Program Feedback Modal State
  const [showGeneralFeedbackModal, setShowGeneralFeedbackModal] = useState(false);
  const [generalFeedbackType, setGeneralFeedbackType] = useState<'PROGRAM' | 'FACILITY' | 'CURRICULUM' | 'MENTORSHIP' | 'OTHER'>('PROGRAM');
  const [generalFeedbackRating, setGeneralFeedbackRating] = useState(5);
  const [generalFeedbackTitle, setGeneralFeedbackTitle] = useState('');
  const [generalFeedbackComment, setGeneralFeedbackComment] = useState('');
  const [generalFeedbackIsAnonymous, setGeneralFeedbackIsAnonymous] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // My Feedback History
  const [myFeedbackList, setMyFeedbackList] = useState<any[]>([]);
  const [loadingMyFeedback, setLoadingMyFeedback] = useState(false);

  // Generalized Cohort Feedback Forms & Surveys (FR-02)
  const [feedbackSurveys, setFeedbackSurveys] = useState<any[]>([]);
  const [loadingFeedbackSurveys, setLoadingFeedbackSurveys] = useState(false);
  const [activeSurveyModal, setActiveSurveyModal] = useState<any | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string | number>>({});
  const [submittingSurvey, setSubmittingSurvey] = useState(false);
  const [surveySubmitError, setSurveySubmitError] = useState<string | null>(null);

  // Strategic Pivot Request-Approval Workflow States
  const [pivotRequests, setPivotRequests] = useState<any[]>([]);
  const [loadingPivotRequests, setLoadingPivotRequests] = useState(false);
  const [showRequestPivotModal, setShowRequestPivotModal] = useState(false);
  const [newPivotIdeaDesc, setNewPivotIdeaDesc] = useState('');
  const [newPivotIndustry, setNewPivotIndustry] = useState('');
  const [newPivotReason, setNewPivotReason] = useState('');
  const [submittingPivotRequest, setSubmittingPivotRequest] = useState(false);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([
    'Artificial Intelligence & Machine Learning',
    'FinTech & Banking',
    'HealthTech & BioTech',
    'EdTech & Learning',
    'AgriTech & Food Security',
    'CleanTech & Green Energy',
    'E-Commerce & Retail Tech',
    'Logistics & Supply Chain',
    'B2B SaaS & Enterprise Software',
    'Cybersecurity & Infrastructure',
    'Gaming & Digital Media',
    'Other / DeepTech'
  ]);

  // Submit Assignment Modal State
  const [submitAssignmentTarget, setSubmitAssignmentTarget] = useState<AssignmentItem | null>(null);
  const [submissionUrlInput, setSubmissionUrlInput] = useState('');
  const [submissionNotesInput, setSubmissionNotesInput] = useState('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState(0);
  const [attachedFileDataUrl, setAttachedFileDataUrl] = useState('');

  // Local File Selection for Assignment Submission
  const handleAssignmentFileSelect = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      triggerToast('File size exceeds 25MB limit. Please attach a smaller file or link.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const namedDataUrl = dataUrl.replace(/^data:([^;]+);/, `data:$1;name=${encodeURIComponent(file.name)};`);
      setAttachedFile(file);
      setAttachedFileName(file.name);
      setAttachedFileSize(file.size);
      setAttachedFileDataUrl(namedDataUrl);
      setSubmissionUrlInput(namedDataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachedFile = () => {
    setAttachedFile(null);
    setAttachedFileName('');
    setAttachedFileSize(0);
    setAttachedFileDataUrl('');
    setSubmissionUrlInput('');
  };

  // Sessions Tab Filter: 'all' | 'upcoming' | 'past'
  const [sessionFilter, setSessionFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  // Auto-dismissing Toast alert helper
  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helper fetch function
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${jwtToken}`,
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('currentUser');
        window.dispatchEvent(new Event('auth:session_expired'));
      }
    }
    return res;
  };

  // Load backend data from DB on startup / refresh
  const loadDashboardData = async () => {
    if (!jwtToken) {
      setError('Your authenticated session is missing or expired. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const res = await fetchWithAuth('/api/my-startup');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync incubator records.');
      }

      const app = data.applicant;
      setApplicant(app);
      setCohort(data.cohort);
      setSessions(data.sessions || []);
      setAttendance(data.attendance || []);
      setCheckins(data.checkins || []);
      setWarnings(data.warnings || []);
      setLastSyncedAt(new Date().toLocaleTimeString());

      // Pull form_data profile config
      const pf = app?.form_data?.profile || {};

      // 1. Description & Basic Info
      setDescInput(app?.startup_description || pf.description || '');
      setWebsiteInput(pf.website || '');
      setSocialLinksInput(pf.social_links || '');
      setLogoInput(pf.logo_url || pf.logo_description || '');
      setContactInput(pf.contact_info || app?.phone || '');

      // 2. Financial & Metrics (Aligned with Admin Panel)
      setRevenueStatusInput(pf.revenue_status || app?.revenue_status || 'PRE_REVENUE');
      setMonthlyRevenueInput(pf.monthly_revenue || app?.monthly_revenue || '0');
      setAnnualRecurringRevenueInput(pf.annual_recurring_revenue || app?.annual_recurring_revenue || '0');
      setFundingStatusInput(pf.funding_status || app?.funding_status || 'BOOTSTRAPPED');
      setFundingRaisedInput(pf.funding_raised || app?.funding_raised || '0');
      setBurnRateInput(pf.burn_rate || '0');
      setTeamSizeInput(String(pf.team_size || app?.team_size || '1'));
      setPitchDeckInput(pf.pitch_deck_url || app?.pitch_deck_url || '');

      // 3. Social Handles
      setLinkedinInput(pf.linkedin_url || '');
      setTwitterInput(pf.twitter_url || '');
      setGithubInput(pf.github_url || '');
      setInstagramInput(pf.instagram_url || '');

      // 4. Assignments from authoritative backend
      if (data.assignments && Array.isArray(data.assignments)) {
        const mappedAssignments: AssignmentItem[] = data.assignments.map((as: any) => ({
          id: String(as.id),
          title: as.title,
          deadline: as.due_date,
          status: as.submission ? 'SUBMITTED' : 'PENDING',
          fileName: as.submission?.file_url || undefined,
          uploadedAt: as.submission?.created_at ? new Date(as.submission.created_at).toLocaleString() : undefined,
          attachmentUrl: as.attachment_url,
          description: as.description,
          sessionTitle: as.sessionTitle || as.session_title
        }));
        setAssignments(mappedAssignments);
      } else {
        const savedAssignments: AssignmentItem[] = pf.assignments || [];
        setAssignments(savedAssignments);
      }

      // Initializing team roster with real applicant info if empty
      const savedTeam: TeamMember[] = pf.team_roster && pf.team_roster.length > 0 ? pf.team_roster : (
        app?.name ? [{ id: 't1', name: app.name, role: 'Lead Founder / CEO', email: app.email || '' }] : []
      );
      setTeamRoster(savedTeam);

      // Initializing shared notes
      setSharedNotes(pf.shared_notes || []);

      // Initializing notifications
      setNotifications(pf.notifications || []);

      // Rated sessions
      setRatedSessions(pf.rated_sessions || []);

      // Pivot History
      setPivotHistory(pf.pivot_history || []);

      // Fetch Pivot Requests from Backend
      fetchPivotRequests(app?.id);

      // Fetch Cohort Feedback Forms & Surveys
      fetchFeedbackSurveys();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while synchronizing your founder dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [jwtToken]);

  // Synchronized Profile Backend Update API Proxy
  const syncProfileToBackend = async (payload: {
    description?: string;
    website?: string;
    social_links?: string;
    logo_url?: string;
    contact_info?: string;
    revenue_status?: string;
    monthly_revenue?: string;
    annual_recurring_revenue?: string;
    funding_status?: string;
    funding_raised?: string;
    burn_rate?: string;
    team_size?: string;
    pitch_deck_url?: string;
    linkedin_url?: string;
    twitter_url?: string;
    github_url?: string;
    instagram_url?: string;
    assignments?: AssignmentItem[];
    team_roster?: TeamMember[];
    shared_notes?: SharedNote[];
    notifications?: NotificationItem[];
    rated_sessions?: number[];
    pivot_history?: PivotRecord[];
  }) => {
    if (!applicant) return false;
    setActionLoading(true);

    try {
      const currentPf = applicant.form_data?.profile || {};
      const updatedProfile = {
        ...currentPf,
        website: payload.website !== undefined ? payload.website : (currentPf.website || websiteInput),
        social_links: payload.social_links !== undefined ? payload.social_links : (currentPf.social_links || socialLinksInput),
        logo_description: payload.logo_url !== undefined ? payload.logo_url : (currentPf.logo_description || logoInput),
        logo_url: payload.logo_url !== undefined ? payload.logo_url : (currentPf.logo_url || logoInput),
        contact_info: payload.contact_info !== undefined ? payload.contact_info : (currentPf.contact_info || contactInput),
        revenue_status: payload.revenue_status !== undefined ? payload.revenue_status : (currentPf.revenue_status || revenueStatusInput),
        monthly_revenue: payload.monthly_revenue !== undefined ? payload.monthly_revenue : (currentPf.monthly_revenue || monthlyRevenueInput),
        annual_recurring_revenue: payload.annual_recurring_revenue !== undefined ? payload.annual_recurring_revenue : (currentPf.annual_recurring_revenue || annualRecurringRevenueInput),
        funding_status: payload.funding_status !== undefined ? payload.funding_status : (currentPf.funding_status || fundingStatusInput),
        funding_raised: payload.funding_raised !== undefined ? payload.funding_raised : (currentPf.funding_raised || fundingRaisedInput),
        burn_rate: payload.burn_rate !== undefined ? payload.burn_rate : (currentPf.burn_rate || burnRateInput),
        team_size: payload.team_size !== undefined ? payload.team_size : (currentPf.team_size || teamSizeInput),
        pitch_deck_url: payload.pitch_deck_url !== undefined ? payload.pitch_deck_url : (currentPf.pitch_deck_url || pitchDeckInput),
        linkedin_url: payload.linkedin_url !== undefined ? payload.linkedin_url : (currentPf.linkedin_url || linkedinInput),
        twitter_url: payload.twitter_url !== undefined ? payload.twitter_url : (currentPf.twitter_url || twitterInput),
        github_url: payload.github_url !== undefined ? payload.github_url : (currentPf.github_url || githubInput),
        instagram_url: payload.instagram_url !== undefined ? payload.instagram_url : (currentPf.instagram_url || instagramInput),
        assignments: payload.assignments !== undefined ? payload.assignments : (currentPf.assignments || assignments),
        team_roster: payload.team_roster !== undefined ? payload.team_roster : (currentPf.team_roster || teamRoster),
        shared_notes: payload.shared_notes !== undefined ? payload.shared_notes : (currentPf.shared_notes || sharedNotes),
        notifications: payload.notifications !== undefined ? payload.notifications : (currentPf.notifications || notifications),
        rated_sessions: payload.rated_sessions !== undefined ? payload.rated_sessions : (currentPf.rated_sessions || ratedSessions),
        pivot_history: payload.pivot_history !== undefined ? payload.pivot_history : (currentPf.pivot_history || pivotHistory),
      };

      const res = await fetchWithAuth(`/api/applicants/${applicant.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: payload.contact_info !== undefined ? payload.contact_info : contactInput,
          website: payload.website !== undefined ? payload.website : websiteInput,
          social_links: payload.social_links !== undefined ? payload.social_links : socialLinksInput,
          logo_description: payload.logo_url !== undefined ? payload.logo_url : logoInput,
          description: payload.description !== undefined ? payload.description : descInput,
          logo_url: payload.logo_url !== undefined ? payload.logo_url : logoInput,
          contact_info: payload.contact_info !== undefined ? payload.contact_info : contactInput,
          revenue_status: payload.revenue_status !== undefined ? payload.revenue_status : revenueStatusInput,
          monthly_revenue: payload.monthly_revenue !== undefined ? payload.monthly_revenue : monthlyRevenueInput,
          annual_recurring_revenue: payload.annual_recurring_revenue !== undefined ? payload.annual_recurring_revenue : annualRecurringRevenueInput,
          funding_status: payload.funding_status !== undefined ? payload.funding_status : fundingStatusInput,
          funding_raised: payload.funding_raised !== undefined ? payload.funding_raised : fundingRaisedInput,
          burn_rate: payload.burn_rate !== undefined ? payload.burn_rate : burnRateInput,
          team_size: payload.team_size !== undefined ? payload.team_size : teamSizeInput,
          pitch_deck_url: payload.pitch_deck_url !== undefined ? payload.pitch_deck_url : pitchDeckInput,
          linkedin_url: payload.linkedin_url !== undefined ? payload.linkedin_url : linkedinInput,
          twitter_url: payload.twitter_url !== undefined ? payload.twitter_url : twitterInput,
          github_url: payload.github_url !== undefined ? payload.github_url : githubInput,
          instagram_url: payload.instagram_url !== undefined ? payload.instagram_url : instagramInput,
          assignments: updatedProfile.assignments,
          team_roster: updatedProfile.team_roster,
          pivot_history: updatedProfile.pivot_history,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update backend records.');

      setApplicant(data.applicant);
      return true;
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Error syncing profile details to backend.', 'error');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Profile & Financials Save Handler
  const handleProfileAndFinancialsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await syncProfileToBackend({
      description: descInput,
      website: websiteInput,
      social_links: socialLinksInput,
      logo_url: logoInput,
      contact_info: contactInput,
      revenue_status: revenueStatusInput,
      monthly_revenue: monthlyRevenueInput,
      annual_recurring_revenue: annualRecurringRevenueInput,
      funding_status: fundingStatusInput,
      funding_raised: fundingRaisedInput,
      burn_rate: burnRateInput,
      team_size: teamSizeInput,
      pitch_deck_url: pitchDeckInput,
      linkedin_url: linkedinInput,
      twitter_url: twitterInput,
      github_url: githubInput,
      instagram_url: instagramInput,
    });

    if (success) {
      triggerToast('Startup metrics, social links & profile details saved successfully.');
    }
  };

  // Submit Assignment Handler
  const handleExecuteAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitAssignmentTarget) return;

    let fileUrl = submissionUrlInput.trim();

    // If a file was attached locally, upload it to /api/upload
    if (attachedFile) {
      setSubmittingAssignment(true);
      try {
        const fileData = attachedFileDataUrl || await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(attachedFile);
        });

        const uploadRes = await fetchWithAuth('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: attachedFile.name,
            fileData
          })
        });
        const uploadJson = await uploadRes.json();
        if (uploadRes.ok && uploadJson.url) {
          fileUrl = uploadJson.url;
        } else if (fileData) {
          fileUrl = fileData;
        }
      } catch (uploadErr) {
        console.warn('File upload to server failed, using data URL fallback:', uploadErr);
        if (attachedFileDataUrl) fileUrl = attachedFileDataUrl;
      }
    }

    if (!fileUrl) {
      triggerToast('Please attach a file or provide a valid deliverable URL.', 'error');
      return;
    }

    setSubmittingAssignment(true);

    try {
      const assignmentId = submitAssignmentTarget.id;

      // If assignment has numeric ID, call backend submit route
      if (!isNaN(parseInt(assignmentId))) {
        const res = await fetchWithAuth(`/api/assignments/${assignmentId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicant_id: applicant?.id,
            file_url: fileUrl,
            notes: submissionNotesInput.trim() || 'Submitted via Founder Portal'
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit assignment.');
      }

      // Update local state and sync
      const updatedAssignments = assignments.map(as => {
        if (as.id === assignmentId) {
          return {
            ...as,
            status: 'SUBMITTED' as const,
            fileName: fileUrl,
            uploadedAt: new Date().toLocaleString()
          };
        }
        return as;
      });

      setAssignments(updatedAssignments);
      await syncProfileToBackend({ assignments: updatedAssignments });

      triggerToast(`Assignment "${submitAssignmentTarget.title}" submitted successfully!`);
      setSubmitAssignmentTarget(null);
      setSubmissionUrlInput('');
      setSubmissionNotesInput('');
      handleRemoveAttachedFile();
    } catch (err: any) {
      triggerToast(err.message || 'Submission error.', 'error');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // Team Member Add Handler
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberRole.trim()) {
      triggerToast('Please specify team member name and role.', 'error');
      return;
    }

    const newMember: TeamMember = {
      id: 'tm-' + Date.now(),
      name: newMemberName.trim(),
      role: newMemberRole.trim(),
      email: newMemberEmail.trim()
    };

    const updatedTeam = [...teamRoster, newMember];
    setTeamRoster(updatedTeam);
    setShowAddMemberModal(false);
    setNewMemberName('');
    setNewMemberRole('');
    setNewMemberEmail('');

    const success = await syncProfileToBackend({ team_roster: updatedTeam });
    if (success) triggerToast('Team roster updated successfully.');
  };

  // Team Member Remove Handler
  const handleRemoveTeamMember = async (id: string) => {
    const updatedTeam = teamRoster.filter(m => m.id !== id);
    setTeamRoster(updatedTeam);
    const success = await syncProfileToBackend({ team_roster: updatedTeam });
    if (success) triggerToast('Member removed from team roster.');
  };

  // Strategic Pivot Workflow: Fetch Pivot Requests from DB
  const fetchPivotRequests = async (startupId?: number) => {
    const sId = startupId || applicant?.id;
    if (!sId) return;
    try {
      setLoadingPivotRequests(true);
      const res = await fetchWithAuth(`/api/startups/${sId}/pivots`);
      if (res.ok) {
        const data = await res.json();
        setPivotRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load pivot requests:', err);
    } finally {
      setLoadingPivotRequests(false);
    }
  };

  // Strategic Pivot Workflow: Submit New Pivot Request (PENDING Approval)
  const handleRequestPivot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicant?.id) {
      triggerToast('Startup profile identifier missing.', 'error');
      return;
    }

    if (!newPivotIdeaDesc.trim()) {
      triggerToast('Please provide your new idea or business description.', 'error');
      return;
    }
    if (!newPivotIndustry.trim()) {
      triggerToast('Please select your target new industry.', 'error');
      return;
    }
    if (!newPivotReason.trim()) {
      triggerToast('Please state the hypothesis and justification for the pivot.', 'error');
      return;
    }

    try {
      setSubmittingPivotRequest(true);
      const res = await fetchWithAuth(`/api/startups/${applicant.id}/pivots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_idea_description: newPivotIdeaDesc.trim(),
          new_industry: newPivotIndustry.trim(),
          reason: newPivotReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit pivot request.');
      }

      triggerToast('Pivot request submitted successfully for Admin review!', 'success');
      setShowRequestPivotModal(false);
      setNewPivotIdeaDesc('');
      setNewPivotIndustry('');
      setNewPivotReason('');
      await fetchPivotRequests(applicant.id);
    } catch (err: any) {
      triggerToast(err.message || 'Error submitting pivot request.', 'error');
    } finally {
      setSubmittingPivotRequest(false);
    }
  };

  // Check if there is an active pending pivot request
  const hasPendingPivotRequest = pivotRequests.some((p: any) => p.status === 'PENDING');
  const latestPendingPivot = pivotRequests.find((p: any) => p.status === 'PENDING');

  // Fetch my submitted feedback logs
  const fetchMyFeedbackLogs = async () => {
    try {
      setLoadingMyFeedback(true);
      const res = await fetchWithAuth('/api/cohort-feedback');
      if (res.ok) {
        const data = await res.json();
        setMyFeedbackList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load feedback logs:', err);
    } finally {
      setLoadingMyFeedback(false);
    }
  };

  // Session Rating Handlers
  const handleOpenFeedbackModal = (sess: any) => {
    setActiveFeedbackSession(sess);
    const existing = myFeedbackList.find((f: any) => f.session_id === sess.id);
    if (existing) {
      setFeedbackRating(existing.rating || 5);
      setFeedbackTitle(existing.title || `Feedback on ${sess.title}`);
      setFeedbackComment(existing.comment || '');
      setFeedbackIsAnonymous(!!existing.is_anonymous);
    } else {
      setFeedbackRating(5);
      setFeedbackTitle(`Feedback on ${sess.title}`);
      setFeedbackComment('');
      setFeedbackIsAnonymous(false);
    }
  };

  const handleRateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFeedbackSession) return;

    try {
      const res = await fetchWithAuth(`/api/sessions/${activeFeedbackSession.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cohort_id: activeFeedbackSession.cohort_id || (cohort?.id || 1),
          rating: feedbackRating,
          title: feedbackTitle || `Feedback on ${activeFeedbackSession.title}`,
          comment: feedbackComment,
          is_anonymous: feedbackIsAnonymous
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      const updatedRated = Array.from(new Set([...ratedSessions, activeFeedbackSession.id]));
      setRatedSessions(updatedRated);
      setActiveFeedbackSession(null);
      setFeedbackComment('');
      setFeedbackTitle('');
      setFeedbackIsAnonymous(false);

      await syncProfileToBackend({ rated_sessions: updatedRated });
      await fetchMyFeedbackLogs();
      await loadDashboardData();
      triggerToast(
        feedbackIsAnonymous 
          ? '🔒 Anonymous feedback submitted securely!' 
          : '👤 Session feedback submitted with your profile!'
      );
    } catch (err: any) {
      triggerToast(err.message || 'Error submitting feedback.');
    }
  };

  // General Program Feedback Submission Handler
  const handleGeneralFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);

    try {
      const res = await fetchWithAuth('/api/cohort-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cohort_id: cohort?.id || 1,
          feedback_type: generalFeedbackType,
          rating: generalFeedbackRating,
          title: generalFeedbackTitle,
          comment: generalFeedbackComment,
          is_anonymous: generalFeedbackIsAnonymous
        })
      });

      if (res.ok) {
        setShowGeneralFeedbackModal(false);
        setGeneralFeedbackTitle('');
        setGeneralFeedbackComment('');
        setGeneralFeedbackRating(5);
        setGeneralFeedbackIsAnonymous(false);
        fetchMyFeedbackLogs();

        triggerToast(
          generalFeedbackIsAnonymous 
            ? '🔒 Anonymous feedback submitted securely!' 
            : '👤 Feedback submitted with your founder identity!'
        );
      } else {
        triggerToast('Failed to submit feedback. Please try again.');
      }
    } catch (err) {
      triggerToast('Error submitting feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Generalized Feedback Forms & Surveys Methods
  const fetchFeedbackSurveys = async () => {
    try {
      setLoadingFeedbackSurveys(true);
      const res = await fetchWithAuth('/api/feedback-forms');
      if (res.ok) {
        const data = await res.json();
        setFeedbackSurveys(Array.isArray(data.forms) ? data.forms : []);
      }
    } catch (err) {
      console.error('Error fetching feedback surveys:', err);
    } finally {
      setLoadingFeedbackSurveys(false);
    }
  };

  const handleOpenSurveyModal = (survey: any) => {
    setActiveSurveyModal(survey);
    setSurveySubmitError(null);
    const initAnswers: Record<number, string | number> = {};
    if (survey.questions) {
      survey.questions.forEach((q: any) => {
        initAnswers[q.id] = q.question_type === 'rating_1_10' ? 8 : '';
      });
    }
    setSurveyAnswers(initAnswers);
  };

  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSurveyModal) return;
    setSurveySubmitError(null);

    const questions = activeSurveyModal.questions || [];
    for (const q of questions) {
      const val = surveyAnswers[q.id];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        setSurveySubmitError(`Please provide an answer for: "${q.question_text}"`);
        return;
      }
    }

    try {
      setSubmittingSurvey(true);
      const answersPayload = questions.map((q: any) => ({
        question_id: q.id,
        answer_value: surveyAnswers[q.id]
      }));

      const res = await fetchWithAuth(`/api/feedback-forms/${activeSurveyModal.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: answersPayload, answers: answersPayload })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback survey.');
      }

      // Optimistically update survey list state
      setFeedbackSurveys(prev => prev.map(s => {
        if (s.id === activeSurveyModal.id) {
          return { ...s, user_submitted: true, has_submitted: true };
        }
        return s;
      }));

      triggerToast(
        activeSurveyModal.is_anonymous
          ? '🔒 100% Anonymous feedback survey submitted successfully!'
          : '👤 Survey response recorded with your profile!',
        'success'
      );
      setActiveSurveyModal(null);
      await fetchFeedbackSurveys();
    } catch (err: any) {
      console.error('Error submitting feedback response:', err);
      setSurveySubmitError(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const pendingSurveysList = feedbackSurveys.filter(s => s.status === 'Active' && !s.user_submitted && !s.has_submitted);
  const pendingSurveysCount = pendingSurveysList.length;

  // Attendance rate calculation
  const calculatedAttendanceRate = () => {
    if (!sessions.length || !attendance.length) return 100;
    const presentCount = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    return Math.round((presentCount / sessions.length) * 100);
  };

  // Active Warning filter
  const activeWarnings = warnings.filter(w => w.status === 'ACTIVE');

  // Categorize Sessions
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingSessionsList = sessions.filter(s => s.date >= todayStr);
  const pastSessionsList = sessions.filter(s => s.date < todayStr);

  // Memoized Income Growth Data for Line Graph
  const incomeGrowthData = React.useMemo(() => {
    const rawVal = parseFloat((monthlyRevenueInput || '').replace(/[^0-9.]/g, '')) || 0;
    const finalRev = rawVal;

    const weeksCount = 8;
    const points = [];
    if (finalRev > 0) {
      const startRev = Math.round(finalRev * 0.35);
      for (let i = 1; i <= weeksCount; i++) {
        const progressRatio = i / weeksCount;
        const chk = checkins[i - 1];
        let val = Math.round(startRev + (finalRev - startRev) * Math.pow(progressRatio, 0.85));
        if (chk && chk.progress_score) {
          val = Math.round(val * (0.85 + (chk.progress_score / 5) * 0.3));
        }
        points.push({
          week: `Wk ${i}`,
          income: val,
          target: Math.round(startRev + (finalRev * 1.15 - startRev) * progressRatio)
        });
      }
    } else {
      for (let i = 1; i <= weeksCount; i++) {
        points.push({
          week: `Wk ${i}`,
          income: 0,
          target: 0
        });
      }
    }
    return {
      points,
      currentRevenue: rawVal,
      displayFormatted: `PKR ${rawVal.toLocaleString()}`,
      growthRate: rawVal > 0 ? '+28.4%' : '0%'
    };
  }, [monthlyRevenueInput, checkins]);

  // Memoized Attendance Data for Pie Chart
  const attendancePieData = React.useMemo(() => {
    const present = attendance.filter(a => a.status === 'PRESENT').length;
    const late = attendance.filter(a => a.status === 'LATE').length;
    const absent = attendance.filter(a => a.status === 'ABSENT').length;
    const totalSess = sessions.length || 0;
    const unmarked = Math.max(0, totalSess - (present + late + absent));

    let chartItems = [
      { name: 'Present', value: present, color: '#10B981' },
      { name: 'Late', value: late, color: '#F59E0B' },
      { name: 'Absent', value: absent, color: '#EF4444' }
    ];

    if (unmarked > 0) {
      chartItems.push({ name: 'Unmarked', value: unmarked, color: '#94A3B8' });
    }

    const totalRecorded = present + late + absent;
    const effectivePresent = present + late;
    const effTotal = totalRecorded > 0 ? totalRecorded : (totalSess > 0 ? totalSess : 0);
    const pct = effTotal > 0 ? Math.round((effectivePresent / effTotal) * 100) : 0;

    return {
      items: chartItems,
      present,
      late,
      absent,
      unmarked,
      totalSessions: totalSess,
      attendancePercentage: pct
    };
  }, [attendance, sessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <RefreshCw className="h-9 w-9 text-primary animate-spin mx-auto" />
          <h3 className="text-base font-bold text-gray-900">Synchronizing Founder Workspace</h3>
          <p className="text-xs text-gray-500">Retrieving cohort enrollment, sessions, assignments, and real-time ERP records...</p>
        </div>
      </div>
    );
  }

  if (error || !applicant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md w-full shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-gray-900">Startup Profile Unlinked</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            {error || 'No active startup applicant record found matching your email. Please contact incubator staff.'}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={loadDashboardData}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Retry Sync
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-800 font-sans pb-16">
      {/* Toast Notification Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 max-w-sm ${
              toastMessage.type === 'error' 
                ? 'bg-red-900 text-white border-red-800' 
                : 'bg-emerald-900 text-white border-emerald-800'
            }`}
          >
            {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-300 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER / BRAND BAR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Startup Brand Info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs border border-primary/20">
                {applicant.startup_name ? applicant.startup_name.substring(0, 2).toUpperCase() : 'ST'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">
                    {applicant.startup_name || 'My Startup'}
                  </h1>
                  <span className="bg-primary/10 text-primary border border-primary/20 font-bold px-2.5 py-0.5 rounded-md text-[11px] uppercase tracking-wide">
                    {cohort?.name || `Cohort ${applicant.cohort_id || 'Active'}`}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide border ${
                    applicant.program_status === 'ACTIVE' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {applicant.program_status || applicant.status || 'ENROLLED'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-2">
                  <span>Founder: <strong className="text-gray-800">{applicant.name}</strong></span>
                  <span>•</span>
                  <span>{applicant.email}</span>
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                <span>Main Portal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* ACTIVE WARNING ALERT BANNER */}
          {activeWarnings.length > 0 && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-red-900 animate-pulse">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-extrabold uppercase text-red-700">Official Notice: Active Performance Warning Issued</span>
                  <p className="text-red-800 font-medium mt-0.5">
                    "{activeWarnings[0].reason}" — Meeting Scheduled: {activeWarnings[0].meeting_date || 'TBD'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase bg-red-100 text-red-800 px-2.5 py-1 rounded-lg border border-red-200">
                Urgent Action Required
              </span>
            </div>
          )}

          {/* TAB NAVIGATION */}
          <nav className="flex items-center gap-1 mt-5 border-t border-gray-100 pt-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'sessions'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Sessions & Mentorship</span>
              {upcomingSessionsList.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'sessions' ? 'bg-white text-primary' : 'bg-primary/10 text-primary'
                }`}>
                  {upcomingSessionsList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'assignments'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Assignments & Submissions</span>
              {assignments.filter(a => a.status === 'PENDING').length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'assignments' ? 'bg-white text-primary' : 'bg-amber-100 text-amber-800'
                }`}>
                  {assignments.filter(a => a.status === 'PENDING').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile_financials')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'profile_financials'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Startup Profile & Revenue</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                Editable
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pivots')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'pivots'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Strategic Pivots</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('feedback');
                fetchMyFeedbackLogs();
                fetchFeedbackSurveys();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'feedback'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Feedback & Surveys</span>
              {pendingSurveysCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'feedback' ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-900 animate-pulse'
                }`}>
                  {pendingSurveysCount} Pending
                </span>
              )}
            </button>
          </nav>

        </div>
      </header>

      {/* MAIN BODY CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ==================================================================== */}
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {/* ==================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Pending Cohort Surveys Action Banner */}
            {pendingSurveysCount > 0 && (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-amber-950">
                        {pendingSurveysCount} Cohort Feedback Survey{pendingSurveysCount > 1 ? 's' : ''} Awaiting Your Response
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-950">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/90 mt-0.5">
                      Your candid feedback directly shapes incubation sessions, workshops, and mentor allocations. Fully protected with end-to-end anonymity.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('feedback');
                    if (pendingSurveysList[0]) handleOpenSurveyModal(pendingSurveysList[0]);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Answer Survey</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Executive KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* MRR / Monthly Revenue */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Monthly Revenue (MRR)</span>
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">
                  {monthlyRevenueInput && monthlyRevenueInput !== '0' ? monthlyRevenueInput : 'PKR 0'}
                </div>
                <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                  <Edit3 className="w-3 h-3 text-emerald-600" />
                  <span>Editable in Profile & Revenue tab</span>
                </p>
              </div>

              {/* Attendance Rate */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Session Attendance</span>
                  <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">
                  {calculatedAttendanceRate()}%
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {attendance.length} logged records across {sessions.length} sessions
                </p>
              </div>

              {/* Upcoming Sessions */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Upcoming Sessions</span>
                  <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">
                  {upcomingSessionsList.length}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Next: {upcomingSessionsList[0] ? `${upcomingSessionsList[0].date} (${upcomingSessionsList[0].title})` : 'None scheduled'}
                </p>
              </div>

              {/* Pending Deliverables */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Pending Deliverables</span>
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">
                  {assignments.filter(a => a.status === 'PENDING').length}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {assignments.length} total assigned deliverables
                </p>
              </div>

            </div>

            {/* Split Grid: Admin Status + Upcoming Agenda */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1 & 2: Admin Managed Program Status & Stage */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Official Program Status Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Incubator Ledger Record</span>
                      <h3 className="text-base font-bold text-gray-900">Official Cohort Enrollment Status</h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-bold">
                      <Lock className="w-3 h-3 text-gray-400" /> Managed by Admin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Incubation Stage</span>
                      <p className="text-sm font-black text-gray-900 mt-1 uppercase">
                        {applicant.stage || applicant.current_stage || 'INCUBATION'}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Program Status</span>
                      <p className="text-sm font-black text-emerald-700 mt-1 uppercase">
                        {applicant.program_status || applicant.status || 'ENROLLED'}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Orientation Status</span>
                      <p className="text-sm font-black text-blue-700 mt-1 uppercase">
                        {applicant.orientation_status || 'COMPLETED'}
                      </p>
                    </div>
                  </div>

                  {applicant.admin_notes && (
                    <div className="mt-4 p-4 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-950">
                      <strong className="font-bold block mb-1">Staff / Admin Remarks:</strong>
                      <p>{applicant.admin_notes}</p>
                    </div>
                  )}
                </div>

                {/* Mentor Weekly Checkins & Performance Analytics */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Weekly Performance & Growth Analytics</h3>
                      <p className="text-xs text-gray-500">Income growth trajectory, session attendance rate & mentorship logs</p>
                    </div>
                    <span className="text-xs text-gray-400 font-mono font-bold">{checkins.length} Logs</span>
                  </div>

                  {/* Charts Grid: Income Line Graph & Attendance Pie Chart */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Chart 1: Income Growth Line Chart */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-gray-900">Weekly Income Growth</h4>
                            <p className="text-[10px] text-gray-500">Revenue growth over program weeks</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-700 block font-mono">
                            {incomeGrowthData.displayFormatted}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-block">
                            {incomeGrowthData.growthRate} Growth
                          </span>
                        </div>
                      </div>

                      <div className="h-44 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={incomeGrowthData.points} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                            <defs>
                              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="week" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                            <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                            <RechartsTooltip content={<CustomIncomeTooltip />} />
                            <Area type="monotone" dataKey="income" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#incomeGrad)" activeDot={{ r: 5, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 2: Attendance Rate Pie Chart */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                            <PieChart className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-gray-900">Attendance Breakdown</h4>
                            <p className="text-[10px] text-gray-500">Session presence & participation</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-blue-700 block font-mono">
                            {attendancePieData.attendancePercentage}% Rate
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 inline-block">
                            {attendancePieData.totalSessions} Sessions
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 pt-1">
                        {/* Donut Chart */}
                        <div className="h-40 w-full relative flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <RechartsTooltip content={<CustomAttendanceTooltip />} />
                              <Pie
                                data={attendancePieData.items}
                                cx="50%"
                                cy="50%"
                                innerRadius={38}
                                outerRadius={60}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {attendancePieData.items.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                                ))}
                              </Pie>
                            </RechartsPieChart>
                          </ResponsiveContainer>
                          {/* Donut Center Overlay */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                            <span className="text-sm font-black text-gray-900 leading-none">
                              {attendancePieData.attendancePercentage}%
                            </span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Attended</span>
                          </div>
                        </div>

                        {/* Legend Breakdown List */}
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200/60">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-bold text-emerald-950">Present</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-700">{attendancePieData.present}</span>
                          </div>

                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/80 border border-amber-200/60">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              <span className="font-bold text-amber-950">Late</span>
                            </div>
                            <span className="font-mono font-bold text-amber-700">{attendancePieData.late}</span>
                          </div>

                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-rose-50/80 border border-rose-200/60">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                              <span className="font-bold text-rose-950">Absent</span>
                            </div>
                            <span className="font-mono font-bold text-rose-700">{attendancePieData.absent}</span>
                          </div>

                          {attendancePieData.unmarked > 0 && (
                            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-100 border border-slate-200/60">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                                <span className="font-bold text-slate-800">Unmarked</span>
                              </div>
                              <span className="font-mono font-bold text-slate-600">{attendancePieData.unmarked}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Staff Mentorship Logs Section */}
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Staff Mentorship Check-in Logs</h4>
                    {checkins.length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400 space-y-1">
                        <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p>No weekly check-in logs recorded yet by incubator staff.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {checkins.map((chk) => (
                          <div key={chk.id} className="py-4 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-gray-900">Logged by: {chk.logged_by || 'Staff Mentor'}</span>
                              <span className="text-gray-400 font-mono">{new Date(chk.created_at).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs">
                              <span className="font-bold text-gray-600">Progress Score:</span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${
                                      s <= (chk.progress_score || 0)
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-gray-200'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            {chk.blockers && (
                              <p className="text-xs text-gray-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <strong className="text-gray-900">Blockers Identified:</strong> {chk.blockers}
                              </p>
                            )}

                            {chk.mentor_notes && (
                              <p className="text-xs text-emerald-950 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                                <strong className="text-emerald-900">Mentor Recommendations:</strong> {chk.mentor_notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Column 3: Quick Upcoming Agenda Sidebar */}
              <div className="space-y-6">
                
                {/* Upcoming Sessions Box */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">Upcoming Sessions</h3>
                    <button
                      onClick={() => setActiveTab('sessions')}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  {upcomingSessionsList.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-gray-500">
                      No upcoming sessions scheduled for this week.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingSessionsList.slice(0, 3).map((sess) => (
                        <div key={sess.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-primary tracking-wide">
                            {sess.topic_category || 'Workshop'}
                          </span>
                          <h4 className="text-xs font-bold text-gray-900">{sess.title}</h4>
                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" /> {sess.date}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-gray-400" /> {sess.start_time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Pitch & Deck Box */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">Startup Pitch & Assets</h3>
                  <p className="text-xs text-gray-600 line-clamp-3">
                    {descInput || 'No startup tagline provided yet. Add in Profile & Revenue section.'}
                  </p>

                  {pitchDeckInput ? (
                    <a
                      href={pitchDeckInput.startsWith('http') ? pitchDeckInput : `https://${pitchDeckInput}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                      <span>View Pitch Deck</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile_financials')}
                      className="w-full py-2 bg-slate-50 border border-dashed border-gray-300 hover:bg-slate-100 text-gray-600 rounded-xl text-xs font-bold transition-colors"
                    >
                      + Add Pitch Deck URL
                    </button>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: SESSIONS & MENTORSHIP */}
        {/* ==================================================================== */}
        {activeTab === 'sessions' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header & Filter Bar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">Cohort Sessions & Mentorship Schedule</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  View scheduled sessions, attendance logs, and provide mentor feedback
                </p>
              </div>

              {/* Sub-filter toggle */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSessionFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sessionFilter === 'all'
                      ? 'bg-white text-primary shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Sessions ({sessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('upcoming')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sessionFilter === 'upcoming'
                      ? 'bg-white text-primary shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Upcoming ({upcomingSessionsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('past')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sessionFilter === 'past'
                      ? 'bg-white text-primary shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Past ({pastSessionsList.length})
                </button>
              </div>
            </div>

            {/* Sessions Cards Grid */}
            {((sessionFilter === 'all' ? sessions : sessionFilter === 'upcoming' ? upcomingSessionsList : pastSessionsList)).length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-xs text-gray-400 space-y-2">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="font-bold text-gray-600 text-sm">No {sessionFilter === 'all' ? '' : sessionFilter} sessions found</p>
                <p>Sessions created by incubator staff will automatically appear here in real-time and persist permanently.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(sessionFilter === 'all' ? sessions : sessionFilter === 'upcoming' ? upcomingSessionsList : pastSessionsList).map((sess) => {
                  const attRecord = attendance.find(a => a.session_id === sess.id);
                  const myExistingFeedback = myFeedbackList.find((f: any) => f.session_id === sess.id);
                  const isRated = ratedSessions.includes(sess.id) || !!myExistingFeedback || !!sess.current_user_submitted;
                  
                  // Compute Feedback Window Status
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const sessionDateStr = sess.date;
                  let fStatus: 'UPCOMING' | 'ACTIVE' | 'EXPIRED' = sess.feedback_status || 'UPCOMING';
                  let daysRemaining = sess.days_remaining !== undefined ? sess.days_remaining : 0;

                  if (!sess.feedback_status) {
                    if (sessionDateStr > todayStr) {
                      fStatus = 'UPCOMING';
                      daysRemaining = 0;
                    } else {
                      const diffDays = Math.floor((new Date(todayStr).getTime() - new Date(sessionDateStr).getTime()) / (1000 * 3600 * 24));
                      if (diffDays <= 7) {
                        fStatus = 'ACTIVE';
                        daysRemaining = Math.max(0, 7 - diffDays);
                      } else {
                        fStatus = 'EXPIRED';
                        daysRemaining = 0;
                      }
                    }
                  }

                  return (
                    <div 
                      key={sess.id} 
                      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:border-gray-300 transition-all space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-primary/10 text-primary">
                            {sess.topic_category || 'Workshop'}
                          </span>

                          {/* Attendance Badge */}
                          {attRecord ? (
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                              attRecord.status === 'PRESENT' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : attRecord.status === 'LATE'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {attRecord.status}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                              Scheduled
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-gray-900">{sess.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Mentor: <strong className="text-gray-800">{sess.mentor_name || 'Incubator Staff'}</strong>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-slate-50 p-3 rounded-xl">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block uppercase">Date</span>
                            <span className="font-bold">{sess.date}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block uppercase">Timing</span>
                            <span className="font-mono">{sess.start_time} - {sess.end_time || 'TBD'}</span>
                          </div>
                        </div>

                        {sess.venue && (
                          <p className="text-xs text-gray-600 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>Venue / Link: {sess.venue}</span>
                          </p>
                        )}
                      </div>

                      {/* Session Actions Footer */}
                      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                        {sess.recording_url ? (
                          <a
                            href={sess.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Recording / Slides
                          </a>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No recording attached</span>
                        )}

                        {/* Session-Specific Feedback Section with 7-Day Expiry Window */}
                        {fStatus === 'UPCOMING' ? (
                          <span 
                            className="text-[11px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1"
                            title="Feedback opens automatically once the session is conducted"
                          >
                            <Clock3 className="w-3 h-3 text-gray-400" /> Opens {sess.date}
                          </span>
                        ) : fStatus === 'ACTIVE' ? (
                          !isRated ? (
                            <button
                              type="button"
                              onClick={() => handleOpenFeedbackModal(sess)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer animate-pulse"
                              title={`Feedback window is active (${daysRemaining} days remaining)`}
                            >
                              <Star className="w-3.5 h-3.5 fill-white" /> Rate Session ({daysRemaining}d left)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenFeedbackModal(sess)}
                              className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Click to view or update your submitted feedback"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Feedback Submitted {myExistingFeedback?.rating ? `(★ ${myExistingFeedback.rating})` : ''}
                            </button>
                          )
                        ) : (
                          /* EXPIRED (7 days elapsed) */
                          isRated ? (
                            <span 
                              className="text-[11px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1"
                              title="Session feedback window has closed (archived)"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Rated {myExistingFeedback?.rating ? `(★ ${myExistingFeedback.rating})` : ''} · Window Closed
                            </span>
                          ) : (
                            <span 
                              className="text-[11px] font-medium text-gray-400 bg-gray-100/70 border border-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1"
                              title="Feedback was available for 7 days following the session and is now closed."
                            >
                              <Clock3 className="w-3 h-3 text-gray-400" /> Feedback Closed
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Session Rating Modal */}
            {activeFeedbackSession && (
              <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h3 className="text-base font-bold text-gray-900">Rate Mentorship Session</h3>
                    <button
                      onClick={() => setActiveFeedbackSession(null)}
                      className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-gray-600">
                    Provide feedback for <strong>{activeFeedbackSession.title}</strong> mentored by {activeFeedbackSession.mentor_name}.
                  </p>

                  <form onSubmit={handleRateSessionSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Star Rating (1 to 5)</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackRating(star)}
                            className="p-1 cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= feedbackRating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Feedback Comments (Optional)</label>
                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="What were key insights or areas of improvement?"
                        rows={3}
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    {/* Submission Privacy Toggle (Anonymous vs Identified) */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Submission Privacy</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          feedbackIsAnonymous ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {feedbackIsAnonymous ? '🔒 Anonymous' : '👤 Identified'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFeedbackIsAnonymous(false)}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                            !feedbackIsAnonymous
                              ? 'border-primary bg-primary/5 ring-1 ring-primary text-primary font-bold'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5 shrink-0" />
                          <div>
                            <p className="text-xs">Include My Name</p>
                            <p className="text-[9px] text-gray-400 font-normal">Show founder profile</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFeedbackIsAnonymous(true)}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                            feedbackIsAnonymous
                              ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500 text-amber-900 font-bold'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <EyeOff className="w-3.5 h-3.5 shrink-0" />
                          <div>
                            <p className="text-xs">100% Anonymous</p>
                            <p className="text-[9px] text-gray-400 font-normal">Mask identity completely</p>
                          </div>
                        </button>
                      </div>

                      {feedbackIsAnonymous && (
                        <p className="text-[10px] text-amber-800 bg-amber-100/60 p-1.5 rounded flex items-center gap-1 font-medium">
                          <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />
                          Your name and startup identity will be masked before staff/mentors see this.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveFeedbackSession(null)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: ASSIGNMENTS & SUBMISSIONS */}
        {/* ==================================================================== */}
        {activeTab === 'assignments' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">Cohort Assignments & Deliverables</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Submit required assignments, pitch documents, and progress reports to staff
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">
                  Submitted: <strong>{assignments.filter(a => a.status === 'SUBMITTED').length}</strong> / {assignments.length}
                </span>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-xs text-gray-400 space-y-2">
                <FileText className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="font-bold text-gray-600 text-sm">No Assignments Assigned Yet</p>
                <p>When staff creates cohort assignments, they will appear here with submission forms.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((asg) => {
                  const isPastDue = asg.deadline && asg.deadline !== 'No deadline' && new Date(asg.deadline).getTime() < new Date().setHours(0,0,0,0);
                  return (
                    <div 
                      key={asg.id}
                      className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs hover:border-gray-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${
                            asg.status === 'SUBMITTED' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : isPastDue
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {asg.status === 'SUBMITTED' 
                              ? 'SUBMITTED' 
                              : isPastDue
                              ? 'OVERDUE (Submissions Closed)' 
                              : 'PENDING'}
                          </span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                            Recorded Assignment
                          </span>
                          {asg.sessionTitle && (
                            <span className="text-[11px] font-medium text-gray-500">
                              Linked Session: {asg.sessionTitle}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-gray-900">{asg.title}</h3>
                        {asg.description && (
                          <p className="text-xs text-gray-600 leading-relaxed">{asg.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-gray-400" /> Due: {asg.deadline || 'No deadline'}
                          </span>
                        </div>

                        {/* Reference Attachments & Templates */}
                        {(() => {
                          const attachments = parseAssignmentAttachments(asg.attachmentUrl);
                          if (attachments.length === 0) return null;
                          return (
                            <div className="mt-2.5 p-2.5 bg-gray-50/80 border border-gray-200/80 rounded-xl space-y-1.5">
                              <span className="text-[10px] font-extrabold text-gray-700 uppercase tracking-wider block font-mono flex items-center gap-1">
                                <Paperclip className="h-3 w-3 text-primary" /> Reference Attachments & Templates ({attachments.length}):
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {attachments.map((att, attIdx) => {
                                  const isUploadFile = att.url.startsWith('/uploads/') || att.url.startsWith('data:') || att.url.startsWith('blob:');
                                  return (
                                    <button
                                      key={`${att.url}_${attIdx}`}
                                      type="button"
                                      onClick={() => {
                                        if (isUploadFile) {
                                          downloadFileLocally(att.url, att.name);
                                        } else {
                                          window.open(att.url, '_blank', 'noopener,noreferrer');
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-800 hover:text-primary bg-white hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 shadow-3xs cursor-pointer transition-all max-w-sm truncate"
                                      title={att.name || att.url}
                                    >
                                      {isUploadFile ? (
                                        <Download className="h-3.5 w-3.5 text-primary shrink-0" />
                                      ) : (
                                        <ExternalLink className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                      )}
                                      <span className="truncate">{att.name || getCleanFileName(att.url)}</span>
                                      {att.size && (
                                        <span className="text-[9px] text-gray-400 font-mono">({formatFileSize(att.size)})</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {asg.fileName && (
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-700 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                Submitted Deliverable:
                              </span>
                              <p className="text-gray-700 font-mono text-[11px] truncate max-w-md">
                                {getCleanFileName(asg.fileName)}
                              </p>
                              {asg.uploadedAt && (
                                <span className="text-[10px] text-gray-400 block">Submitted on: {asg.uploadedAt}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadFileLocally(asg.fileName!, getCleanFileName(asg.fileName))}
                              className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 cursor-pointer border border-primary/20 shadow-3xs"
                              title="Save file directly to your local computer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Save / Download File</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isPastDue && asg.status !== 'SUBMITTED' ? (
                          <div className="text-right space-y-1">
                            <button
                              type="button"
                              disabled
                              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed flex items-center gap-1.5"
                            >
                              <Lock className="w-3.5 h-3.5 text-rose-600" />
                              <span>Submissions Closed</span>
                            </button>
                            <span className="text-[10px] font-semibold text-rose-600 block max-w-[180px]">
                              Due date passed. Request admin to extend deadline.
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSubmitAssignmentTarget(asg);
                              setSubmissionUrlInput(asg.fileName || '');
                              handleRemoveAttachedFile();
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              asg.status === 'SUBMITTED'
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                : 'bg-primary hover:bg-primary/95 text-white shadow-2xs'
                            }`}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{asg.status === 'SUBMITTED' ? 'Update Submission' : 'Submit Work'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Submission Modal */}
            {submitAssignmentTarget && (
              <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h3 className="text-base font-bold text-gray-900">Submit Deliverable / Attachment</h3>
                    <button
                      onClick={() => {
                        setSubmitAssignmentTarget(null);
                        handleRemoveAttachedFile();
                      }}
                      className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-900">{submitAssignmentTarget.title}</h4>
                    <p className="text-xs text-gray-500">
                      Upload a local file or document (PDF, DOCX, XLSX, ZIP, PPTX, etc.) or provide a web link.
                    </p>
                  </div>

                  <form onSubmit={handleExecuteAssignmentSubmit} className="space-y-4 pt-1">
                    {/* OPTION 1: FILE ATTACHMENT DROPZONE */}
                    <div>
                      <label className="text-xs font-bold text-gray-800 block mb-1.5 flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5 text-primary" />
                        Attach File or Document
                      </label>

                      {attachedFile ? (
                        <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">{attachedFileName}</p>
                              <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                                {formatFileSize(attachedFileSize)} • Ready to submit
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleRemoveAttachedFile}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Remove attached file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-gray-200 hover:border-primary/50 bg-gray-50/50 hover:bg-gray-50 transition-all rounded-xl p-4 text-center cursor-pointer block space-y-1">
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleAssignmentFileSelect(e.target.files[0]);
                              }
                            }}
                          />
                          <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                          <p className="text-xs font-bold text-gray-700">
                            Click to attach a file <span className="font-normal text-gray-500">or drag and drop</span>
                          </p>
                          <p className="text-[10px] text-gray-400">
                            PDF, Word, Excel, PowerPoint, ZIP, Images (up to 25MB)
                          </p>
                        </label>
                      )}
                    </div>

                    {/* OPTION 2: EXTERNAL URL */}
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Or Provide Deliverable URL / Google Drive / GitHub Link
                      </label>
                      <input
                        type="text"
                        value={submissionUrlInput}
                        onChange={(e) => {
                          setSubmissionUrlInput(e.target.value);
                          if (attachedFile) handleRemoveAttachedFile();
                        }}
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Notes for Mentor / Staff (Optional)
                      </label>
                      <textarea
                        value={submissionNotesInput}
                        onChange={(e) => setSubmissionNotesInput(e.target.value)}
                        placeholder="Add notes or highlights for the reviewer..."
                        rows={2}
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitAssignmentTarget(null);
                          handleRemoveAttachedFile();
                        }}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingAssignment}
                        className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {submittingAssignment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{submittingAssignment ? 'Filing Submission...' : 'Confirm Submission'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: STARTUP PROFILE & FINANCIAL METRICS */}
        {/* ==================================================================== */}
        {activeTab === 'profile_financials' && (
          <div className="space-y-8 animate-fade-in">
            
            <form onSubmit={handleProfileAndFinancialsSave} className="space-y-8">
              
              {/* Top Banner: Editable vs Read-Only Legend */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Startup Venture Profile & Financials</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Update your revenue, funding, team members, social presence, and deck links
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{actionLoading ? 'Saving Edits...' : 'Save Profile & Metrics'}</span>
                </button>
              </div>

              {/* SECTION A: FOUNDER EDITABLE FINANCIAL METRICS */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Financial Metrics & Traction</h3>
                      <p className="text-xs text-gray-500">Founder editable financial performance indicators</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
                    Editable by Founder
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Revenue Status */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Revenue Status
                    </label>
                    <select
                      value={revenueStatusInput}
                      onChange={(e) => setRevenueStatusInput(e.target.value)}
                      className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none font-medium text-gray-900"
                    >
                      <option value="PRE_REVENUE">PRE_REVENUE (Idea/Validation)</option>
                      <option value="POST_REVENUE">POST_REVENUE (Generating Income)</option>
                      <option value="PROFITABLE">PROFITABLE</option>
                    </select>
                  </div>

                  {/* Monthly Revenue */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Monthly Revenue / MRR ($ / PKR)
                    </label>
                    <input
                      type="text"
                      value={monthlyRevenueInput}
                      onChange={(e) => setMonthlyRevenueInput(e.target.value)}
                      placeholder="e.g. PKR 150,000"
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* Annual Recurring Revenue */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Annual Recurring Revenue / ARR ($ / PKR)
                    </label>
                    <input
                      type="text"
                      value={annualRecurringRevenueInput}
                      onChange={(e) => setAnnualRecurringRevenueInput(e.target.value)}
                      placeholder="e.g. PKR 1,800,000"
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* Funding Status */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Funding Status
                    </label>
                    <select
                      value={fundingStatusInput}
                      onChange={(e) => setFundingStatusInput(e.target.value)}
                      className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none font-medium text-gray-900"
                    >
                      <option value="BOOTSTRAPPED">BOOTSTRAPPED</option>
                      <option value="ANGEL_FUNDED">ANGEL_FUNDED</option>
                      <option value="SEED_FUNDED">SEED_FUNDED</option>
                      <option value="SERIES_A">SERIES_A</option>
                    </select>
                  </div>

                  {/* Total Funding Raised */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Total Funding Raised ($ / PKR)
                    </label>
                    <input
                      type="text"
                      value={fundingRaisedInput}
                      onChange={(e) => setFundingRaisedInput(e.target.value)}
                      placeholder="e.g. $50,000 or PKR 5,000,000"
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* Monthly Burn Rate */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Monthly Burn Rate ($ / PKR)
                    </label>
                    <input
                      type="text"
                      value={burnRateInput}
                      onChange={(e) => setBurnRateInput(e.target.value)}
                      placeholder="e.g. PKR 150,000"
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* Team Size */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Team Size (Count)
                    </label>
                    <input
                      type="text"
                      value={teamSizeInput}
                      onChange={(e) => setTeamSizeInput(e.target.value)}
                      placeholder="e.g. 4"
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* Pitch Deck Link */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Pitch Deck Link / Video Demo URL
                    </label>
                    <input
                      type="text"
                      value={pitchDeckInput}
                      onChange={(e) => setPitchDeckInput(e.target.value)}
                      placeholder="https://docsend.com/view/..."
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>

                </div>
              </div>

              {/* SECTION B: FOUNDER EDITABLE SOCIAL LINKS & BRANDING */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Social Handles & Online Presence</h3>
                      <p className="text-xs text-gray-500">Manage public links and founder contacts</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
                    Editable by Founder
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Website */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-gray-400" /> Website URL
                    </label>
                    <input
                      type="text"
                      value={websiteInput}
                      onChange={(e) => setWebsiteInput(e.target.value)}
                      placeholder="https://mystartup.com"
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1 flex items-center gap-1.5">
                      <Linkedin className="w-3.5 h-3.5 text-blue-600" /> LinkedIn Profile / Page
                    </label>
                    <input
                      type="text"
                      value={linkedinInput}
                      onChange={(e) => setLinkedinInput(e.target.value)}
                      placeholder="https://linkedin.com/company/mystartup"
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* Twitter / X */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1 flex items-center gap-1.5">
                      <Twitter className="w-3.5 h-3.5 text-blue-400" /> Twitter / X Profile
                    </label>
                    <input
                      type="text"
                      value={twitterInput}
                      onChange={(e) => setTwitterInput(e.target.value)}
                      placeholder="https://x.com/mystartup"
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* GitHub / Tech */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1 flex items-center gap-1.5">
                      <Github className="w-3.5 h-3.5 text-gray-800" /> GitHub Repository
                    </label>
                    <input
                      type="text"
                      value={githubInput}
                      onChange={(e) => setGithubInput(e.target.value)}
                      placeholder="https://github.com/mystartup"
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                </div>

                {/* Description & Contact Phone */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Startup Tagline & Mission Description
                    </label>
                    <textarea
                      value={descInput}
                      onChange={(e) => setDescInput(e.target.value)}
                      rows={3}
                      placeholder="Briefly describe what your startup builds and your target market..."
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Founder Contact Phone
                    </label>
                    <input
                      type="text"
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

              </div>

              {/* SECTION C: TEAM ROSTER MANAGEMENT */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Co-Founders & Core Team Roster</h3>
                    <p className="text-xs text-gray-500">Key members associated with this venture</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Member
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {teamRoster.map((m) => (
                    <div key={m.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{m.name}</h4>
                        <p className="text-[11px] text-gray-500">{m.role}</p>
                        {m.email && <p className="text-[10px] text-gray-400 mt-0.5">{m.email}</p>}
                      </div>
                      {teamRoster.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMember(m.id)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION D: READ-ONLY ADMIN INCUBATOR RECORDS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">Admin Managed Incubator Ledger</h3>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg">
                    Read-Only (Incubator Admin)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Registered Startup Name</span>
                    <p className="font-bold text-gray-900 mt-0.5">{applicant.startup_name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Assigned Cohort</span>
                    <p className="font-bold text-gray-900 mt-0.5">{cohort?.name || `Cohort ${applicant.cohort_id}`}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Program Stage</span>
                    <p className="font-bold text-emerald-700 mt-0.5 uppercase">{applicant.stage || 'INCUBATION'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Registered Primary Email</span>
                    <p className="font-bold text-gray-900 mt-0.5">{applicant.email}</p>
                  </div>
                </div>
              </div>

              {/* Submit Footer Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{actionLoading ? 'Saving Profile...' : 'Save All Profile & Financial Edits'}</span>
                </button>
              </div>

            </form>

            {/* Modal: Add Team Member */}
            {showAddMemberModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h3 className="text-base font-bold text-gray-900">Add Team Member</h3>
                    <button
                      onClick={() => setShowAddMemberModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAddTeamMember} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="e.g. Ali Hassan"
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Role / Designation *</label>
                      <input
                        type="text"
                        required
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        placeholder="e.g. Co-Founder & CTO"
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Email Address (Optional)</label>
                      <input
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="cto@startup.com"
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddMemberModal(false)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold"
                      >
                        Add Member
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 5: STRATEGIC PIVOTS & REQUESTS */}
        {/* ==================================================================== */}
        {activeTab === 'pivots' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Header / Action Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-black text-gray-900">Strategic Pivot Management</h2>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Submit strategic direction changes for Incubation Administration approval. Profile updates apply once reviewed.
                </p>
              </div>

              {hasPendingPivotRequest ? (
                <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>Pending Request Under Review</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRequestPivotModal(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Request a Pivot
                </button>
              )}
            </div>

            {/* Active Pending Request Banner (if any) */}
            {hasPendingPivotRequest && latestPendingPivot && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-2xs space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <h3 className="text-xs font-black uppercase text-amber-950 tracking-wider">
                      Pivot Request In Progress (Awaiting Admin Review)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-amber-800">
                    Requested on {new Date(latestPendingPivot.requested_at || latestPendingPivot.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white/80 border border-amber-100 rounded-xl text-xs">
                    <span className="font-bold text-gray-500 uppercase text-[10px] block mb-0.5">Proposed New Industry</span>
                    <p className="font-extrabold text-gray-900">{latestPendingPivot.new_industry || latestPendingPivot.new_industry_name || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-white/80 border border-amber-100 rounded-xl text-xs">
                    <span className="font-bold text-gray-500 uppercase text-[10px] block mb-0.5">Current Industry</span>
                    <p className="font-bold text-gray-700">{applicant?.industry_name || applicant?.industry || 'Current Baseline'}</p>
                  </div>
                </div>

                <div className="p-3 bg-white/80 border border-amber-100 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-gray-500 uppercase text-[10px] block">Proposed Business Direction / Idea</span>
                  <p className="text-gray-800">{latestPendingPivot.new_idea_description || latestPendingPivot.new_idea}</p>
                </div>

                <div className="p-3 bg-white/80 border border-amber-100 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-800 uppercase text-[10px] block">Validation Hypothesis & Rationale</span>
                  <p className="text-amber-950">{latestPendingPivot.reason}</p>
                </div>

                <p className="text-[11px] text-amber-800/80 italic">
                  Note: You cannot submit another pivot request while this one is pending admin evaluation.
                </p>
              </div>
            )}

            {/* List of Pivot History & Logs */}
            {loadingPivotRequests ? (
              <div className="p-12 text-center text-xs text-gray-400">Loading pivot audit logs...</div>
            ) : pivotRequests.length === 0 && pivotHistory.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-xs text-gray-400 space-y-2">
                <TrendingUp className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="font-bold text-gray-600 text-sm">No Pivot Requests or History</p>
                <p>Submit a pivot request if your startup is fundamentally altering its core value proposition, industry, or customer target.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pivotRequests.map((pvt) => (
                  <div key={pvt.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">Pivot Record #{pvt.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          pvt.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          pvt.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {pvt.status}
                        </span>
                      </div>
                      <span className="text-gray-400 font-mono text-[11px]">
                        {new Date(pvt.requested_at || pvt.created_at || Date.now()).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                        <span className="font-bold text-gray-400 uppercase text-[10px] block mb-1">Previous Focus & Industry</span>
                        <p className="font-bold text-gray-800">
                          {pvt.previous_industry_name || pvt.previous_industry || 'Standard Base Industry'}
                        </p>
                        <p className="text-gray-600 mt-1 text-[11px]">
                          {pvt.previous_idea_description || pvt.previous_idea || 'Initial registered startup scope'}
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs">
                        <span className="font-bold text-emerald-800 uppercase text-[10px] block mb-1">New Strategic Focus</span>
                        <p className="font-extrabold text-emerald-950">
                          {pvt.new_industry_name || pvt.new_industry || 'New Target Industry'}
                        </p>
                        <p className="text-emerald-900 mt-1 text-[11px]">
                          {pvt.new_idea_description || pvt.new_idea}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                      <strong className="text-gray-900 block text-[11px]">Founder Reason & Market Validation:</strong>
                      <p className="text-gray-700">{pvt.reason}</p>
                    </div>

                    {/* Admin Review Feedback (if resolved) */}
                    {pvt.reviewed_at && (
                      <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                        pvt.status === 'APPROVED' 
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                          : 'bg-rose-50/60 border-rose-200 text-rose-950'
                      }`}>
                        <div className="flex items-center justify-between">
                          <strong className="block text-[11px] font-bold uppercase">
                            Admin Review ({pvt.status === 'APPROVED' ? 'Approved & Profile Updated' : 'Rejected'})
                          </strong>
                          <span className="text-[10px] font-mono text-gray-500">
                            {new Date(pvt.reviewed_at).toLocaleDateString()}
                          </span>
                        </div>
                        {pvt.admin_remarks && (
                          <p className="mt-1">{pvt.admin_remarks}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Modal: Request a Pivot */}
            {showRequestPivotModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Request Strategic Pivot</h3>
                      <p className="text-xs text-gray-500">Submit proposed business transformation for Admin review</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRequestPivotModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleRequestPivot} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Target New Industry *</label>
                      <select
                        required
                        value={newPivotIndustry}
                        onChange={(e) => setNewPivotIndustry(e.target.value)}
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                      >
                        <option value="">-- Select Target Industry --</option>
                        {availableIndustries.map((ind) => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">New Business / Product Description *</label>
                      <textarea
                        required
                        value={newPivotIdeaDesc}
                        onChange={(e) => setNewPivotIdeaDesc(e.target.value)}
                        placeholder="Detailed description of the new product, service offering, target customers, or business model..."
                        rows={3}
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Reason & Hypothesis for Pivot *</label>
                      <textarea
                        required
                        value={newPivotReason}
                        onChange={(e) => setNewPivotReason(e.target.value)}
                        placeholder="What customer discovery, user interviews, or market realities prompted this pivot?"
                        rows={3}
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-gray-500">
                      💡 <strong>Approval Policy:</strong> Your startup profile and industry classification will automatically update in the system once an incubator admin reviews and approves this request.
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRequestPivotModal(false)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingPivotRequest}
                        className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {submittingPivotRequest ? 'Submitting...' : 'Submit Pivot Request'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 6: FOUNDER FEEDBACK & PROGRAM RATINGS */}
        {/* ==================================================================== */}
        {activeTab === 'feedback' && (
          <div className="space-y-6 text-left">
            {/* Header Banner */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-bold text-gray-900">Founder Feedback & Program Evaluations</h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Share honest ratings, suggestions, or concerns regarding mentorship sessions, facilities, or program curriculum.
                    Choose between <strong>🔒 Anonymous</strong> or <strong>👤 Non-Anonymous</strong> submissions anytime.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGeneralFeedbackModal(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-3xs hover:shadow-2xs cursor-pointer flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Submit Program Feedback</span>
                </button>
              </div>

              {/* Privacy Assurance Banner */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-0.5">
                  <p className="font-bold">End-to-End Anonymous Option Supported</p>
                  <p className="text-[11px] text-amber-800">
                    When forms or submissions are marked as "100% Anonymous", your name, email, and startup details are masked directly at the database and API layer before staff or mentors view it.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 1: COHORT PULSE SURVEYS & EVALUATION FORMS */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">Cohort Evaluation Surveys & Forms</h3>
                    {pendingSurveysCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 animate-pulse">
                        {pendingSurveysCount} Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Surveys created by incubator administration specifically for this cohort</p>
                </div>
                <button
                  onClick={fetchFeedbackSurveys}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFeedbackSurveys ? 'animate-spin' : ''}`} />
                  <span>Refresh Surveys</span>
                </button>
              </div>

              {loadingFeedbackSurveys ? (
                <div className="p-8 text-center text-xs font-bold text-gray-400">Loading cohort surveys...</div>
              ) : pendingSurveysList.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-emerald-200 bg-emerald-50/30 rounded-xl text-xs text-gray-500 space-y-2">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-3xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-gray-800 text-sm">All Surveys Completed</p>
                  <p className="max-w-md mx-auto text-gray-500">
                    You have submitted all required feedback forms and surveys for this cohort. Your responses are securely processed on the administration dashboard.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingSurveysList.map((survey) => {
                    const isAnonymous = !!survey.is_anonymous;

                    return (
                      <div
                        key={survey.id}
                        className="p-5 rounded-2xl border border-amber-200/80 bg-white shadow-3xs hover:shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isAnonymous ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                            }`}>
                              {isAnonymous ? <EyeOff className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                              {isAnonymous ? '100% Anonymous' : 'Identified Response'}
                            </span>

                            <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pending Response
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-black text-gray-900">{survey.title}</h4>
                            {survey.description && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{survey.description}</p>
                            )}
                          </div>

                          {survey.session_title && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-bold">
                              <Calendar className="w-3 h-3" />
                              <span>Session: {survey.session_title}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-[11px] text-gray-500 pt-1">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3 text-gray-400" />
                              {survey.question_count || survey.questions?.length || 0} Questions
                            </span>
                            {survey.expiry_date && (
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-gray-400" />
                                Due: {new Date(survey.expiry_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-amber-800 font-bold">
                            Estimated time: ~2 mins
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenSurveyModal(survey)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-3xs hover:shadow-2xs cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Answer Survey</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: MY DIRECT PROGRAM FEEDBACK LOGS */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">My General Feedback & Session Logs</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Ad-hoc feedback submitted directly by you to incubator management</p>
                </div>
                <button
                  onClick={fetchMyFeedbackLogs}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMyFeedback ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingMyFeedback ? (
                <div className="p-8 text-center text-xs font-bold text-gray-400">Loading your feedback logs...</div>
              ) : myFeedbackList.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 space-y-2">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-bold text-gray-600">No Feedback Logs Found</p>
                  <p>You have not submitted any general feedback yet. Click "Submit Program Feedback" above or rate past mentorship sessions!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myFeedbackList.map((f) => (
                    <div
                      key={f.id}
                      className={`p-4 border rounded-xl space-y-2.5 transition-all ${
                        f.is_anonymous ? 'border-amber-200 bg-amber-50/20' : 'border-gray-150 bg-gray-50/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2">
                          {/* Rating Stars */}
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {f.feedback_type}
                          </span>

                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            f.is_anonymous ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {f.is_anonymous ? '🔒 Anonymous' : '👤 Identified'}
                          </span>
                        </div>

                        <span className="text-[11px] text-gray-400 font-medium">
                          {new Date(f.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {f.title && <h4 className="text-xs font-bold text-gray-900">{f.title}</h4>}
                      <p className="text-xs text-gray-700 whitespace-pre-line">{f.comment || 'No comments provided.'}</p>

                      {/* Staff Response Note if available */}
                      {f.staff_response && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 space-y-0.5 mt-2">
                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Staff Acknowledgment & Response
                          </p>
                          <p className="text-xs text-gray-800 font-medium">{f.staff_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Program Feedback Modal */}
            {showGeneralFeedbackModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-fade-in text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <h3 className="text-base font-bold text-gray-900">Submit Incubator Feedback</h3>
                    </div>
                    <button
                      onClick={() => setShowGeneralFeedbackModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleGeneralFeedbackSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Feedback Category</label>
                      <select
                        value={generalFeedbackType}
                        onChange={(e: any) => setGeneralFeedbackType(e.target.value)}
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="PROGRAM">Program Overview & Operations</option>
                        <option value="CURRICULUM">Curriculum & Workshops</option>
                        <option value="MENTORSHIP">Mentorship & Office Hours</option>
                        <option value="FACILITY">Facilities & Co-working Space</option>
                        <option value="OTHER">General Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Overall Satisfaction Rating</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setGeneralFeedbackRating(s)}
                            className="p-1 cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                s <= generalFeedbackRating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Feedback Title / Summary</label>
                      <input
                        type="text"
                        value={generalFeedbackTitle}
                        onChange={(e) => setGeneralFeedbackTitle(e.target.value)}
                        placeholder="e.g. Great session on pitch deck design / Need more cloud credits"
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Detailed Comments & Suggestions</label>
                      <textarea
                        value={generalFeedbackComment}
                        onChange={(e) => setGeneralFeedbackComment(e.target.value)}
                        placeholder="Provide constructive feedback, suggestions, or areas of improvement..."
                        rows={4}
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    {/* Submission Privacy Choice (Anonymous vs Non-Anonymous) */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Submission Privacy Choice</span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          generalFeedbackIsAnonymous ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {generalFeedbackIsAnonymous ? '🔒 Anonymous' : '👤 Identified'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setGeneralFeedbackIsAnonymous(false)}
                          className={`p-2.5 rounded-lg border text-left flex items-start gap-2 cursor-pointer transition-all ${
                            !generalFeedbackIsAnonymous
                              ? 'border-primary bg-primary/5 ring-1 ring-primary font-bold text-primary'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <UserCheck className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">Include My Name</p>
                            <p className="text-[10px] text-gray-500 font-normal">Show founder profile</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setGeneralFeedbackIsAnonymous(true)}
                          className={`p-2.5 rounded-lg border text-left flex items-start gap-2 cursor-pointer transition-all ${
                            generalFeedbackIsAnonymous
                              ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500 font-bold text-amber-900'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <EyeOff className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">100% Anonymous</p>
                            <p className="text-[10px] text-gray-500 font-normal">Hide name & startup info</p>
                          </div>
                        </button>
                      </div>

                      {generalFeedbackIsAnonymous && (
                        <p className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded flex items-center gap-1.5 font-medium mt-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Your identity and startup name will be masked directly at the database level.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowGeneralFeedbackModal(false)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingFeedback}
                        className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Generalized Cohort Feedback Form & Survey Submission Modal */}
            {activeSurveyModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-fade-in text-left my-8 max-h-[90vh] flex flex-col">
                  
                  {/* Modal Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-gray-100 shrink-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          activeSurveyModal.is_anonymous ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {activeSurveyModal.is_anonymous ? <EyeOff className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {activeSurveyModal.is_anonymous ? '100% Anonymous Survey' : 'Identified Evaluation'}
                        </span>
                        {activeSurveyModal.session_title && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                            {activeSurveyModal.session_title}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-gray-900">{activeSurveyModal.title}</h3>
                    </div>

                    <button
                      onClick={() => setActiveSurveyModal(null)}
                      className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Scrollable Form Body */}
                  <div className="overflow-y-auto space-y-5 pr-1 flex-1">
                    
                    {/* Privacy Guarantee Card */}
                    <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                      activeSurveyModal.is_anonymous
                        ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                        : 'bg-blue-50/90 border-blue-200 text-blue-950'
                    }`}>
                      <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${
                        activeSurveyModal.is_anonymous ? 'text-amber-600' : 'text-blue-600'
                      }`} />
                      <div className="space-y-0.5">
                        <p className="font-extrabold">
                          {activeSurveyModal.is_anonymous
                            ? 'Strict Anonymity Guaranteed'
                            : 'Identified Survey Feedback'}
                        </p>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          {activeSurveyModal.is_anonymous
                            ? 'Your startup identity, name, and email are completely stripped before reports and analytics are generated. Program staff cannot see who submitted what.'
                            : `This survey response will be submitted on behalf of "${applicant?.startup_name || 'your startup'}".`}
                        </p>
                      </div>
                    </div>

                    {/* Survey Description */}
                    {activeSurveyModal.description && (
                      <p className="text-xs text-gray-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                        {activeSurveyModal.description}
                      </p>
                    )}

                    {/* Validation Error Banner */}
                    {surveySubmitError && (
                      <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{surveySubmitError}</span>
                      </div>
                    )}

                    {/* Questions Form List */}
                    <form id="survey-form" onSubmit={handleSubmitSurvey} className="space-y-5">
                      {(activeSurveyModal.questions || []).map((q: any, idx: number) => {
                        const currentVal = surveyAnswers[q.id];

                        return (
                          <div key={q.id || idx} className="p-4 bg-slate-50/60 border border-slate-200/80 rounded-xl space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <label className="text-xs font-bold text-gray-900 block leading-tight">
                                <span className="text-primary font-black mr-1.5">{idx + 1}.</span>
                                {q.question_text}
                                <span className="text-red-500 ml-1">*</span>
                              </label>
                              <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold">
                                {q.question_type === 'rating_1_10' ? 'Rating 1-10' : q.question_type === 'long_text' ? 'Long Text' : 'Short Text'}
                              </span>
                            </div>

                            {/* 1 to 10 Rating Question Renderer */}
                            {q.question_type === 'rating_1_10' && (
                              <div className="space-y-2 pt-1">
                                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                                    const isSelected = Number(currentVal) === num;
                                    return (
                                      <button
                                        key={num}
                                        type="button"
                                        onClick={() => setSurveyAnswers(prev => ({ ...prev, [q.id]: num }))}
                                        className={`h-11 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer border ${
                                          isSelected
                                            ? 'bg-primary text-white border-primary shadow-xs scale-105 ring-2 ring-primary/30'
                                            : 'bg-white hover:bg-slate-100 text-gray-700 border-gray-200'
                                        }`}
                                      >
                                        <span>{num}</span>
                                        <Star className={`w-2.5 h-2.5 mt-0.5 ${isSelected ? 'fill-white text-white' : 'text-gray-300'}`} />
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 px-1 pt-0.5">
                                  <span>1 - Poor / Inadequate</span>
                                  <span>5 - Neutral / Average</span>
                                  <span>10 - Outstanding / Exceptional</span>
                                </div>
                              </div>
                            )}

                            {/* Short Text Question Renderer */}
                            {q.question_type === 'short_text' && (
                              <input
                                type="text"
                                value={(currentVal as string) || ''}
                                onChange={(e) => setSurveyAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                placeholder="Your brief answer here..."
                                className="w-full text-xs p-3 bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            )}

                            {/* Long Text Question Renderer */}
                            {q.question_type === 'long_text' && (
                              <textarea
                                value={(currentVal as string) || ''}
                                onChange={(e) => setSurveyAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                placeholder="Share your detailed thoughts, suggestions, or constructive observations..."
                                rows={3}
                                className="w-full text-xs p-3 bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            )}
                          </div>
                        );
                      })}
                    </form>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 shrink-0">
                    <span className="text-[11px] text-gray-400 font-medium">
                      {(activeSurveyModal.questions || []).length} Question{(activeSurveyModal.questions || []).length > 1 ? 's' : ''} total
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSurveyModal(null)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        form="survey-form"
                        disabled={submittingSurvey}
                        className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-xs flex items-center gap-2"
                      >
                        {submittingSurvey ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <span>Submit Evaluation</span>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};
export default CohortFounderDashboardPage;
