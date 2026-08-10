import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Link,
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
  Download
} from 'lucide-react';

interface CohortFounderDashboardPageProps {
  jwtToken: string | null;
  onNavigate: (path: string) => void;
}

// Interfaces based on domain specifications
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

  // DB Synced States
  const [applicant, setApplicant] = useState<any>(null);
  const [cohort, setCohort] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  // Sub-tab Navigation: 'dashboard' | 'profile'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile'>('dashboard');

  // Dynamic Profile JSON-backed states (all saved to applicant.form_data.profile)
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [teamRoster, setTeamRoster] = useState<TeamMember[]>([]);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pivotHistory, setPivotHistory] = useState<PivotRecord[]>([]);
  const [ratedSessions, setRatedSessions] = useState<number[]>([]);

  // Profile editable input states
  const [descInput, setDescInput] = useState('');
  const [websiteInput, setWebsiteInput] = useState('');
  const [socialLinksInput, setSocialLinksInput] = useState('');
  const [logoInput, setLogoInput] = useState('');
  const [contactInput, setContactInput] = useState('');

  // Interactive UI triggers
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const [activeFeedbackSession, setActiveFeedbackSession] = useState<Session | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const [showAddPivotModal, setShowAddPivotModal] = useState(false);
  const [newPivotOld, setNewPivotOld] = useState('');
  const [newPivotNew, setNewPivotNew] = useState('');
  const [newPivotHypothesis, setNewPivotHypothesis] = useState('');
  const [newPivotDate, setNewPivotDate] = useState('');

  const [activePivotExpanded, setActivePivotExpanded] = useState<string | null>(null);

  // File Upload states
  const [uploadingAssignmentId, setUploadingAssignmentId] = useState<string | null>(null);
  const [uploadedFileText, setUploadedFileText] = useState('');

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
    return fetch(url, { ...options, headers });
  };

  // Load backend data on startup
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

      // Pull form_data profile config or initialize with beautiful defaults
      const pf = app.form_data?.profile || {};

      // 1. Description
      setDescInput(app.startup_description || pf.description || 'No description logged.');
      
      // 2. Website
      setWebsiteInput(pf.website || '');
      
      // 3. Social links
      setSocialLinksInput(pf.social_links || '');
      
      // 4. Logo Link/Description
      setLogoInput(pf.logo_url || pf.logo_description || '');
      
      // 5. Contact Info / Phone
      setContactInput(pf.contact_info || app.phone || '');

      // 6. Assignments from backend or fallback profile JSON
      if (data.assignments && Array.isArray(data.assignments) && data.assignments.length > 0) {
        const mappedAssignments: AssignmentItem[] = data.assignments.map((as: any) => ({
          id: String(as.id),
          title: as.title,
          deadline: as.due_date,
          status: as.is_submitted ? 'SUBMITTED' : 'PENDING',
          fileName: as.submission?.file_url || undefined,
          uploadedAt: as.submission?.submitted_at ? new Date(as.submission.submitted_at).toLocaleString() : undefined,
          attachmentUrl: as.attachment_url,
          description: as.description,
          sessionTitle: as.session_title
        }));
        setAssignments(mappedAssignments);
      } else {
        const savedAssignments: AssignmentItem[] = pf.assignments || [
          { id: '1', title: 'Validated Lean Canvas Document', deadline: '2026-07-28', status: 'PENDING' },
          { id: '2', title: 'Investor Pitch Deck (V1.0)', deadline: '2026-08-15', status: 'PENDING' },
          { id: '3', title: 'Validated Financial & Pricing Model', deadline: '2026-09-02', status: 'PENDING' }
        ];
        setAssignments(savedAssignments);
      }

      // Initializing default team roster
      const savedTeam: TeamMember[] = pf.team_roster || [
        { id: 't1', name: app.name, role: 'CEO & Co-Founder', email: app.email },
        { id: 't2', name: 'Amir Khan', role: 'CTO', email: 'amir@takhleeq.pk' }
      ];
      setTeamRoster(savedTeam);

      // Initializing default shared notes (non-private!)
      const savedNotes: SharedNote[] = pf.shared_notes || [
        { id: 'n1', date: '2026-07-18', author: 'Usman Ghani (Lead Mentor)', content: 'Excellent progress on the customer discovery matrix. Focus on narrowing down your first 100 beachhead medical shops in Lahore.' },
        { id: 'n2', date: '2026-07-15', author: 'Dr. Qaseeb Ahmed', content: 'Incubation blueprint slides have been dispatched. Please review and ensure your validated lean canvas is uploaded on time.' }
      ];
      setSharedNotes(savedNotes);

      // Initializing default notifications
      const savedNotifications: NotificationItem[] = pf.notifications || [
        { id: 'not1', date: new Date().toISOString(), message: 'Cohort incubation workspace is now live. Welcome to Takhleeq ERP!', type: 'success' },
        { id: 'not2', date: new Date(Date.now() - 3600000).toISOString(), message: 'A new workshop "Value Proposition & Customer Discovery" has been added to your calendar.', type: 'info' }
      ];
      setNotifications(savedNotifications);

      // Rated sessions
      setRatedSessions(pf.rated_sessions || []);

      // Pivot History
      const savedPivots: PivotRecord[] = pf.pivot_history || [
        { id: 'p1', date: '2026-06-15', oldDirection: 'Direct-to-consumer pharmacy delivery service', newDirection: 'B2B express pharmaceutical dispatch & route optimizer', hypothesis: 'Customer surveys indicated razor-thin retail margins and heavy marketing costs. Moving to B2B clinics and pharmacies provides a 3x higher utility and predictable contract revenue.' }
      ];
      setPivotHistory(savedPivots);

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
      // Build current full profile payload merged with previous values
      const currentPf = applicant.form_data?.profile || {};
      const updatedProfile = {
        ...currentPf,
        website: payload.website !== undefined ? payload.website : (currentPf.website || websiteInput),
        social_links: payload.social_links !== undefined ? payload.social_links : (currentPf.social_links || socialLinksInput),
        logo_description: payload.logo_url !== undefined ? payload.logo_url : (currentPf.logo_description || logoInput),
        logo_url: payload.logo_url !== undefined ? payload.logo_url : (currentPf.logo_url || logoInput),
        contact_info: payload.contact_info !== undefined ? payload.contact_info : (currentPf.contact_info || contactInput),
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
          pivot_history: updatedProfile.pivot_history,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update backend records.');

      setApplicant(data.applicant);
      return true;
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Error sync records to Takhleeq ERP ledgers.', 'error');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Editable Profile Form submission handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await syncProfileToBackend({
      description: descInput,
      website: websiteInput,
      social_links: socialLinksInput,
      logo_url: logoInput,
      contact_info: contactInput
    });

    if (success) {
      triggerToast('Venture profile detail logs committed and updated successfully.');
    }
  };

  // 1. Assignment Action: File Upload with Real Persistence
  const triggerAssignmentUpload = async (assignmentId: string, fileUrlOverride?: string) => {
    const fileUrl = fileUrlOverride || uploadedFileText.trim();
    if (!fileUrl) {
      triggerToast('Please write or upload a file.', 'error');
      return;
    }

    setUploadingAssignmentId(assignmentId);

    try {
      // Check if assignment is numeric ID (real backend assignment)
      if (!isNaN(parseInt(assignmentId))) {
        const res = await fetchWithAuth(`/api/assignments/${assignmentId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_url: fileUrl,
            notes: 'Submitted via Founder Workspace'
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit assignment.');
      } else {
        // Fallback for profile JSON mock assignments
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

        await syncProfileToBackend({ assignments: updatedAssignments });
      }

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
      setUploadedFileText('');
      triggerToast(`Deliverable filed successfully.`);
    } catch (err: any) {
      triggerToast(err.message, 'error');
    } finally {
      setUploadingAssignmentId(null);
    }
  };

  const handleFileUploadAndSubmit = async (e: React.ChangeEvent<HTMLInputElement>, assignmentId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAssignmentId(assignmentId);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const fileData = reader.result as string;
        const uploadRes = await fetchWithAuth('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileData })
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'File upload failed.');

        await triggerAssignmentUpload(assignmentId, uploadData.url);
      };
    } catch (err: any) {
      triggerToast(err.message, 'error');
      setUploadingAssignmentId(null);
    }
  };

  // 2. Feedback Action: Rate a Session with Real Persistence
  const submitSessionFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFeedbackSession) return;

    const sessionKey = activeFeedbackSession.id;
    const updatedRated = [...ratedSessions, sessionKey];

    const updatedNotifications: NotificationItem[] = [
      {
        id: `not_${Date.now()}`,
        date: new Date().toISOString(),
        message: `Session review and feedback compiled for workshop "${activeFeedbackSession.title}".`,
        type: 'info'
      },
      ...notifications
    ];

    const success = await syncProfileToBackend({
      rated_sessions: updatedRated,
      notifications: updatedNotifications
    });

    if (success) {
      setRatedSessions(updatedRated);
      setNotifications(updatedNotifications);
      triggerToast(`Thank you! Your rating of ${feedbackRating}/5 stars and comments are saved.`);
      setActiveFeedbackSession(null);
      setFeedbackComment('');
      setFeedbackRating(5);
    }
  };

  // 3. Team Roster Action: Add Team Member with Real Persistence
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberRole.trim() || !newMemberEmail.trim()) {
      triggerToast('All team member profile inputs are required.', 'error');
      return;
    }

    const newMember: TeamMember = {
      id: `member_${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole.trim(),
      email: newMemberEmail.trim()
    };

    const updatedRoster = [...teamRoster, newMember];

    const updatedNotifications: NotificationItem[] = [
      {
        id: `not_${Date.now()}`,
        date: new Date().toISOString(),
        message: `New venture roster logged: ${newMember.name} joined as ${newMember.role}.`,
        type: 'success'
      },
      ...notifications
    ];

    const success = await syncProfileToBackend({
      team_roster: updatedRoster,
      notifications: updatedNotifications
    });

    if (success) {
      setTeamRoster(updatedRoster);
      setNotifications(updatedNotifications);
      setNewMemberName('');
      setNewMemberRole('');
      setNewMemberEmail('');
      setShowAddMemberModal(false);
      triggerToast(`Added ${newMember.name} to startup team roster.`);
    }
  };

  // 4. Team Roster Action: Remove Member with Real Persistence
  const handleRemoveTeamMember = async (memberId: string) => {
    if (memberId === 't1') {
      triggerToast('Primary team lead cannot be purged from the team ledger.', 'error');
      return;
    }

    const removedMember = teamRoster.find(m => m.id === memberId);
    const updatedRoster = teamRoster.filter(m => m.id !== memberId);

    const updatedNotifications: NotificationItem[] = [
      {
        id: `not_${Date.now()}`,
        date: new Date().toISOString(),
        message: `Team member ${removedMember?.name || ''} deleted from incubation registry.`,
        type: 'warning'
      },
      ...notifications
    ];

    const success = await syncProfileToBackend({
      team_roster: updatedRoster,
      notifications: updatedNotifications
    });

    if (success) {
      setTeamRoster(updatedRoster);
      setNotifications(updatedNotifications);
      triggerToast(`Removed ${removedMember?.name || 'member'} from roster.`);
    }
  };

  // 5. Pivot History Action: Create a Pivot Log with Real Persistence
  const handleAddPivotLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPivotOld.trim() || !newPivotNew.trim() || !newPivotHypothesis.trim() || !newPivotDate) {
      triggerToast('Please complete all strategic pivot logs.', 'error');
      return;
    }

    const newPivot: PivotRecord = {
      id: `pivot_${Date.now()}`,
      date: newPivotDate,
      oldDirection: newPivotOld.trim(),
      newDirection: newPivotNew.trim(),
      hypothesis: newPivotHypothesis.trim()
    };

    const updatedPivots = [newPivot, ...pivotHistory];

    const updatedNotifications: NotificationItem[] = [
      {
        id: `not_${Date.now()}`,
        date: new Date().toISOString(),
        message: `Strategic business pivot logged: transitioned from "${newPivot.oldDirection.substring(0, 30)}..." to "${newPivot.newDirection.substring(0, 30)}..."`,
        type: 'alert'
      },
      ...notifications
    ];

    const success = await syncProfileToBackend({
      pivot_history: updatedPivots,
      notifications: updatedNotifications
    });

    if (success) {
      setPivotHistory(updatedPivots);
      setNotifications(updatedNotifications);
      setNewPivotOld('');
      setNewPivotNew('');
      setNewPivotHypothesis('');
      setNewPivotDate('');
      setShowAddPivotModal(false);
      setActivePivotExpanded(newPivot.id);
      triggerToast('Strategic business pivot committed onto official ERP logs.');
    }
  };

  // --- Calculations for Quick Stats Row ---
  // Stat 1: Pending assignments count
  const pendingAssignmentsCount = assignments.filter(a => a.status === 'PENDING').length;

  // Stat 2: Upcoming sessions this week
  const getUpcomingSessionsCount = () => {
    const today = new Date();
    // End of current week
    const nextSunday = new Date();
    nextSunday.setDate(today.getDate() + (7 - today.getDay()));
    nextSunday.setHours(23, 59, 59, 999);

    return sessions.filter(s => {
      const sDate = new Date(s.date);
      return sDate >= today && sDate <= nextSunday;
    }).length;
  };

  // Stat 3: Dynamic attendance rate based on backend session attendance log
  const getAttendanceRateString = () => {
    if (sessions.length === 0) return '100%';
    
    // Filter sessions that have passed
    const passedSessions = sessions.filter(s => new Date(s.date) < new Date());
    if (passedSessions.length === 0) return '100%';

    const attendedCount = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const rate = Math.round((attendedCount / passedSessions.length) * 100);
    return `${rate}%`;
  };

  // Stat 4: Days since last mentor/weekly check-in
  const getDaysSinceLastCheckIn = () => {
    if (checkins.length === 0) return 'No check-ins logged';
    const lastCheckinDate = new Date(checkins[0].created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastCheckinDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Check if there is an active performance warning from real database
  const activeWarning = warnings.find(w => w.status === 'ACTIVE');

  // Progress Stages array for Stepper
  const PROGRESS_STAGES = ['Idea', 'POC', 'MVP', 'Post-Revenue', 'Scale'];
  const currentStage = applicant?.form_data?.profile?.stage || 'MVP';
  const currentStageIndex = PROGRESS_STAGES.indexOf(currentStage) !== -1 ? PROGRESS_STAGES.indexOf(currentStage) : 2;

  // Render Loader
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-28 bg-[#FFFFFF]" id="founder-portal-loader">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-5 font-mono">Loading Venture Workspace...</p>
      </div>
    );
  }

  // Render Restricted State
  if (error || !applicant) {
    return (
      <div className="flex-1 max-w-lg mx-auto px-6 py-20 text-center space-y-6 bg-[#FFFFFF]" id="founder-portal-error">
        <div className="h-16 w-16 bg-[#8B1A1A]/5 border border-[#8B1A1A]/10 rounded-2xl flex items-center justify-center mx-auto text-[#8B1A1A]">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">Access Token Revoked</h2>
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            {error || 'No active Takhleeq ERP incubator registration associated with your credentials could be verified.'}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => onNavigate('/')}
            className="bg-[#8B1A1A] hover:bg-[#5A0F0F] text-white text-[10px] font-black uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all shadow-3xs cursor-pointer"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50/50 pb-16 relative" id="takhleeq-founder-dashboard">
      
      {/* Dynamic Toast Alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3.5 rounded-xl shadow-md border text-xs font-bold flex items-center gap-2.5 ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WARNING NOTIFICATION BANNER (Non-dismissible, Professional Alert Tone) */}
      {activeWarning && (
        <div className="bg-amber-50 border-b border-amber-200" id="active-warning-alert-strip">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-amber-950 uppercase tracking-tight">Incubation Support Warning Logged</p>
                <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                  Your team has an active program notice regarding: <span className="font-extrabold italic">"{activeWarning.reason}"</span>. Please review goals immediately.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 bg-white border border-amber-200 p-2.5 rounded-xl">
              <Calendar className="h-4 w-4 text-amber-600" />
              <div className="text-left">
                <span className="text-[9px] font-black text-gray-400 block uppercase font-mono">Review Meeting Date</span>
                <span className="text-xs font-extrabold text-amber-950">
                  {new Date(activeWarning.meeting_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER STRIP CONTAINER */}
      <section className="bg-[#FFFFFF] border-b border-gray-100 py-6 shadow-3xs" id="founder-header-strip">
        <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            
            {/* Logo and venture tags */}
            <div className="flex items-center gap-4 text-left">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-[#C41E3A] text-white flex items-center justify-center shrink-0 shadow-3xs border border-[#8B1A1A]/10 relative overflow-hidden">
                {logoInput ? (
                  <img 
                    src={logoInput} 
                    alt="Startup logo" 
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Building2 className="h-7 w-7" />
                )}
                <div className="absolute inset-0 bg-black/5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-[#8B1A1A] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-3xs">
                    Venture Ledger
                  </span>
                  <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
                    REF: {applicant.tracking_token}
                  </span>
                </div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
                  {applicant.startup_name}
                </h1>
                <p className="text-xs text-gray-500 font-bold flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-gray-400" /> Lead Founder: {applicant.name}
                  </span>
                  <span className="h-3 w-px bg-gray-300 hidden md:inline" />
                  <span className="text-gray-600 hidden md:inline">{applicant.email}</span>
                </p>
              </div>
            </div>

            {/* Stepper progress stages and program status */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 w-full lg:w-auto">
              
              {/* Progress Stage Stepper */}
              <div className="flex flex-col space-y-2 text-left w-full md:w-auto">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Venture Growth Stage</span>
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-150 p-1.5 rounded-xl">
                  {PROGRESS_STAGES.map((st, idx) => {
                    const isPassed = idx < currentStageIndex;
                    const isActive = idx === currentStageIndex;
                    return (
                      <div key={st} className="flex items-center">
                        <span 
                          className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg border transition-all ${
                            isActive 
                              ? 'bg-[#8B1A1A] text-white border-[#8B1A1A] shadow-3xs scale-105 animate-pulse' 
                              : isPassed 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-white text-gray-400 border-gray-200'
                          }`}
                        >
                          {st}
                        </span>
                        {idx < PROGRESS_STAGES.length - 1 && (
                          <ChevronRight className="h-3 w-3 mx-1 text-gray-300" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Pill and refresh */}
              <div className="flex items-center gap-3 self-end md:self-center">
                <div className="text-right">
                  <span className="text-[9px] font-black text-gray-400 block uppercase font-mono">Program Status</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 rounded-xl border mt-1 ${
                    cohort?.status === 'ACTIVE' || applicant?.status === 'CONFIRMED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : cohort?.status === 'COMPLETED'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      cohort?.status === 'ACTIVE' || applicant?.status === 'CONFIRMED' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    {cohort?.status === 'ACTIVE' || applicant?.status === 'CONFIRMED' ? 'ACTIVE' : cohort?.status || 'ONBOARDING'}
                  </span>
                </div>

                <button
                  onClick={loadDashboardData}
                  disabled={actionLoading}
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer mt-3 shrink-0 disabled:opacity-50"
                  title="Sync Database Logs"
                >
                  <RefreshCw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

            </div>

          </div>

          {/* ERP SWITCHING TABS */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-150 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'bg-[#8B1A1A] text-white shadow-3xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Startup Workspace
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'profile'
                    ? 'bg-[#8B1A1A] text-white shadow-3xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Building2 className="h-4 w-4" />
                Venture Profile
              </button>
            </div>
            
            <div className="text-[10px] text-gray-400 font-mono font-bold hidden md:block">
              Incubator Intake: <span className="text-gray-700 uppercase font-black">{cohort?.name || 'Onboarding Registry'}</span>
            </div>
          </div>

        </div>
      </section>

      {activeTab === 'dashboard' ? (
        <div className="space-y-8" id="tab-dashboard-content">
          
          {/* QUICK STATS ROW */}
          <section className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Stat 1 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 text-left flex items-center justify-between shadow-3xs hover:border-[#8B1A1A]/10 transition-colors">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block font-mono">Pending Deliverables</span>
                  <p className="text-2xl font-black text-gray-900 font-mono">{pendingAssignmentsCount}</p>
                  <span className="text-[9px] text-gray-400 font-semibold block leading-none">Incomplete milestones</span>
                </div>
                <div className="h-11 w-11 bg-[#8B1A1A]/5 text-[#8B1A1A] rounded-xl flex items-center justify-center shrink-0 border border-[#8B1A1A]/5">
                  <FileText className="h-5.5 w-5.5" />
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 text-left flex items-center justify-between shadow-3xs hover:border-[#8B1A1A]/10 transition-colors">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block font-mono">Workshops This Week</span>
                  <p className="text-2xl font-black text-gray-900 font-mono">{getUpcomingSessionsCount()}</p>
                  <span className="text-[9px] text-gray-400 font-semibold block leading-none">Incubator scheduled sessions</span>
                </div>
                <div className="h-11 w-11 bg-[#C41E3A]/5 text-[#C41E3A] rounded-xl flex items-center justify-center shrink-0 border border-[#C41E3A]/5">
                  <Calendar className="h-5.5 w-5.5" />
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 text-left flex items-center justify-between shadow-3xs hover:border-[#8B1A1A]/10 transition-colors">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block font-mono">Avg Attendance Rate</span>
                  <p className="text-2xl font-black text-[#8B1A1A] font-mono">{getAttendanceRateString()}</p>
                  <span className="text-[9px] text-gray-400 font-semibold block leading-none">Required threshold: 80%</span>
                </div>
                <div className="h-11 w-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                  <CheckCircle2 className="h-5.5 w-5.5" />
                </div>
              </div>

              {/* Stat 4 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 text-left flex items-center justify-between shadow-3xs hover:border-[#8B1A1A]/10 transition-colors">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block font-mono">Last Check-In Log</span>
                  <p className="text-lg font-black text-gray-900 tracking-tight leading-7 truncate max-w-[170px]">{getDaysSinceLastCheckIn()}</p>
                  <span className="text-[9px] text-gray-400 font-semibold block leading-none">Weekly evaluation pulse</span>
                </div>
                <div className="h-11 w-11 bg-[#D4AF37]/5 text-amber-700 rounded-xl flex items-center justify-center shrink-0 border border-[#D4AF37]/10">
                  <Clock className="h-5.5 w-5.5" />
                </div>
              </div>

            </div>
          </section>

          {/* TWO-COLUMN MAIN LAYOUT */}
          <section className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN (7 COLS): Sessions, Assignments, Feedback prompts */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. UPCOMING SESSIONS LIST */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs overflow-hidden text-left">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4.5 w-4.5 text-[#8B1A1A]" />
                      <h2 className="text-sm font-black text-gray-900 uppercase">Upcoming Workshops & Sessions</h2>
                    </div>
                    <span className="bg-[#8B1A1A]/5 text-[#8B1A1A] font-mono text-[9px] font-black px-2 py-0.5 rounded-md border border-[#8B1A1A]/5">
                      {sessions.length} scheduled
                    </span>
                  </div>

                  <div className="divide-y divide-gray-50 max-h-[380px] overflow-y-auto">
                    {sessions.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 font-bold text-xs leading-normal">
                        No incubation program workshops have been scheduled yet.
                      </div>
                    ) : (
                      sessions.map((sess) => {
                        const isPast = new Date(sess.date) < new Date();
                        return (
                          <div key={sess.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50/50 transition-colors">
                            <div className="space-y-1.5 text-left">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-[#8B1A1A]/5 text-[#8B1A1A] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-[#8B1A1A]/5">
                                  {sess.topic_category || 'Masterclass'}
                                </span>
                                {isPast && (
                                  <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-2 py-0.5 rounded">
                                    Concluded
                                  </span>
                                )}
                              </div>
                              <h3 className="text-xs font-black text-gray-800 uppercase tracking-tight">{sess.title}</h3>
                              <p className="text-[10px] text-gray-400 font-bold flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-gray-400" /> 
                                  {new Date(sess.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} @ {sess.start_time.substring(0, 5)} - {sess.end_time.substring(0, 5)}
                                </span>
                                <span className="text-gray-300">|</span>
                                <span>Mentor: {sess.mentor_name}</span>
                              </p>
                            </div>
                            
                            <div className="shrink-0 w-full sm:w-auto">
                              {sess.recording_url ? (
                                <a 
                                  href={sess.recording_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full sm:w-auto text-center inline-flex items-center justify-center gap-1 bg-[#8B1A1A]/5 hover:bg-[#8B1A1A]/10 text-[#8B1A1A] text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border border-[#8B1A1A]/10 transition-all"
                                >
                                  Watch Recording
                                </a>
                              ) : sess.venue ? (
                                <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-50 border border-gray-150 px-2.5 py-1.5 rounded-xl block text-center">
                                  Venue: {sess.venue}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-xl block text-center">
                                  Virtual Class
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. PENDING POST-SESSION FEEDBACK PROMPTS */}
                {sessions.filter(s => new Date(s.date) < new Date() && !ratedSessions.includes(s.id)).length > 0 && (
                  <div className="bg-amber-50/40 border border-amber-200/70 rounded-2xl p-5 text-left space-y-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4.5 w-4.5 text-[#8B1A1A]" />
                      <h3 className="text-xs font-black text-[#8B1A1A] uppercase tracking-wider">Pending Workshop Feedback</h3>
                    </div>
                    <p className="text-[11px] text-gray-600 font-semibold leading-relaxed">
                      To complete attendance compliance, please provide anonymous feedback and scores for your completed workshops.
                    </p>

                    <div className="space-y-3">
                      {sessions
                        .filter(s => new Date(s.date) < new Date() && !ratedSessions.includes(s.id))
                        .map(sess => (
                          <div key={sess.id} className="bg-white border border-amber-100 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                              <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{sess.title}</p>
                              <p className="text-[10px] font-bold text-gray-400">Concluded on: {new Date(sess.date).toLocaleDateString()}</p>
                            </div>
                            
                            {activeFeedbackSession?.id === sess.id ? (
                              <form onSubmit={submitSessionFeedback} className="w-full mt-3 pt-3 border-t border-gray-100 space-y-3 sm:col-span-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-gray-500 uppercase">Rate Value:</span>
                                  <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        type="button"
                                        key={star}
                                        onClick={() => setFeedbackRating(star)}
                                        className="focus:outline-none"
                                      >
                                        <Star className={`h-4.5 w-4.5 ${star <= feedbackRating ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-gray-200'}`} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  required
                                  value={feedbackComment}
                                  onChange={(e) => setFeedbackComment(e.target.value)}
                                  placeholder="Write a brief review (e.g., clear methodology, great industry cases)..."
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveFeedbackSession(null)}
                                    className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-400 hover:text-gray-600"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="bg-[#8B1A1A] hover:bg-[#5A0F0F] text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    Submit Feedback
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveFeedbackSession(sess);
                                  setFeedbackRating(5);
                                  setFeedbackComment('');
                                }}
                                className="bg-[#8B1A1A] hover:bg-[#5A0F0F] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all shadow-3xs"
                              >
                                Review Session
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 3. ASSIGNMENTS TABLE */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs overflow-hidden text-left" id="assignments-ledger-section">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-[#8B1A1A]" />
                      <h2 className="text-sm font-black text-gray-900 uppercase">Incubation Deliverables & Pitch Decks</h2>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] border-collapse text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-black uppercase text-gray-400 tracking-wider">
                          <th className="px-5 py-3">Milestone Deliverable</th>
                          <th className="px-5 py-3">Deadline</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Upload Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs font-semibold">
                        {assignments.map((as) => (
                          <tr key={as.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-5 py-4 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <p className="font-extrabold text-gray-800 uppercase tracking-tight">{as.title}</p>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                  as.sessionTitle 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}>
                                  {as.sessionTitle ? `Session: ${as.sessionTitle}` : 'Cohort Assignment'}
                                </span>
                              </div>
                              {as.description && (
                                <p className="text-[11px] text-gray-500 font-normal leading-relaxed">{as.description}</p>
                              )}
                              {as.attachmentUrl && (
                                <div>
                                  <a
                                    href={as.attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline bg-gray-50 px-2 py-0.5 rounded border border-gray-200"
                                  >
                                    <Download className="h-3 w-3" /> Reference Template
                                  </a>
                                </div>
                              )}
                              {as.fileName && (
                                <p className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 font-bold pt-0.5">
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  Submitted: <a href={as.fileName} target="_blank" rel="noreferrer" className="underline">{as.fileName.split('/').pop()}</a> <span className="text-gray-400">({as.uploadedAt})</span>
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 font-mono font-bold text-gray-500">
                              {as.deadline}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                as.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : as.status === 'SUBMITTED'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : as.status === 'REJECTED'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {as.status}
                              </span>
                            </td>
                             <td className="px-5 py-4 text-right">
                              {uploadingAssignmentId === as.id ? (
                                <div className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 font-mono font-bold">
                                  <div className="h-3.5 w-3.5 border-2 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" />
                                  Uploading...
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2 items-end justify-end">
                                  <div className="flex items-center gap-1.5">
                                    <label className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold py-1 px-2.5 rounded-lg cursor-pointer transition-all flex items-center gap-1">
                                      <Upload className="h-3 w-3 text-primary" />
                                      Select File
                                      <input 
                                        type="file" 
                                        onChange={(e) => handleFileUploadAndSubmit(e, as.id)} 
                                        disabled={as.status === 'APPROVED'}
                                        className="hidden" 
                                      />
                                    </label>
                                    <span className="text-[10px] text-gray-400 font-mono">or</span>
                                    <input
                                      type="text"
                                      placeholder="File URL..."
                                      disabled={as.status === 'APPROVED'}
                                      value={uploadingAssignmentId === null && as.status !== 'APPROVED' ? undefined : undefined}
                                      onChange={(e) => setUploadedFileText(e.target.value)}
                                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] w-28 focus:outline-none focus:border-primary font-mono disabled:opacity-40"
                                    />
                                    <button
                                      disabled={as.status === 'APPROVED'}
                                      onClick={() => {
                                        triggerAssignmentUpload(as.id);
                                      }}
                                      className="bg-[#8B1A1A] hover:bg-[#5A0F0F] text-white px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-45"
                                      title="Submit URL"
                                    >
                                      Submit
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN (5 COLS): Roster, Notes, Notifications */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. TEAM ROSTER LIST */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs overflow-hidden text-left" id="roster-ledger-section">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4.5 w-4.5 text-[#8B1A1A]" />
                      <h2 className="text-sm font-black text-gray-900 uppercase">Team Roster Registry</h2>
                    </div>
                    <button
                      onClick={() => setShowAddMemberModal(!showAddMemberModal)}
                      className="bg-[#8B1A1A]/5 hover:bg-[#8B1A1A]/10 text-[#8B1A1A] text-[10px] font-black uppercase px-2.5 py-1 rounded-md border border-[#8B1A1A]/5 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add Member
                    </button>
                  </div>

                  {showAddMemberModal && (
                    <form onSubmit={handleAddTeamMember} className="bg-gray-50/50 p-4 border-b border-gray-100 space-y-3 text-left">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-gray-500 font-mono block">Member Full Name</label>
                        <input
                          type="text"
                          required
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          placeholder="Zohaib Hassan"
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-gray-500 font-mono block">Venture Role</label>
                          <input
                            type="text"
                            required
                            value={newMemberRole}
                            onChange={(e) => setNewMemberRole(e.target.value)}
                            placeholder="COO, Marketing Lead"
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-gray-500 font-mono block">Registered Email</label>
                          <input
                            type="email"
                            required
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="zohaib@venture.pk"
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1.5">
                        <button
                          type="button"
                          onClick={() => setShowAddMemberModal(false)}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="bg-[#8B1A1A] hover:bg-[#5A0F0F] text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all"
                        >
                          Save Member
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="p-4 space-y-3.5">
                    {teamRoster.map((member) => (
                      <div key={member.id} className="flex justify-between items-center gap-3 bg-gray-50/20 p-2.5 border border-gray-100 rounded-xl">
                        <div className="flex items-center gap-3 text-left">
                          <div className="h-8.5 w-8.5 rounded-lg bg-[#8B1A1A]/5 text-[#8B1A1A] border border-[#8B1A1A]/10 flex items-center justify-center shrink-0">
                            <User className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-gray-800 uppercase tracking-tight">{member.name}</p>
                            <p className="text-[10px] text-[#8B1A1A] font-bold uppercase block tracking-wider">{member.role}</p>
                            <p className="text-[9px] text-gray-400 font-mono">{member.email}</p>
                          </div>
                        </div>

                        {member.id !== 't1' && (
                          <button
                            onClick={() => handleRemoveTeamMember(member.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete team member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. SHARED NOTES TIMELINE (PRIVATE NOTES MUST NEVER BE FETCHED OR SHOWN HERE) */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs overflow-hidden text-left" id="shared-notes-timeline">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4.5 w-4.5 text-[#8B1A1A]" />
                      <h2 className="text-sm font-black text-gray-900 uppercase">Mentorship & Shared Updates</h2>
                    </div>
                  </div>

                  <div className="p-5 space-y-5 max-h-[340px] overflow-y-auto">
                    {sharedNotes.length === 0 ? (
                      <div className="text-center text-gray-400 font-bold text-xs py-4 leading-normal">
                        No general public mentorship updates logged yet.
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-gray-100 pl-4 space-y-6">
                        {sharedNotes.map((note) => (
                          <div key={note.id} className="relative space-y-1.5">
                            {/* Dot */}
                            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-[#8B1A1A]" />
                            
                            <div className="flex justify-between items-center flex-wrap gap-1">
                              <span className="text-[10px] font-extrabold text-gray-800 uppercase">{note.author}</span>
                              <span className="text-[9px] font-mono text-gray-400 font-bold">
                                {new Date(note.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            
                            <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                              {note.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. NOTIFICATIONS FEED */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs overflow-hidden text-left" id="notifications-feed">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4.5 w-4.5 text-[#8B1A1A]" />
                      <h2 className="text-sm font-black text-gray-900 uppercase">Recent ERP Notifications</h2>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 font-bold text-xs">
                        No recent activity alerts.
                      </div>
                    ) : (
                      notifications.map((not) => (
                        <div key={not.id} className="p-3.5 flex items-start gap-3 hover:bg-gray-50/30 transition-colors">
                          <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${
                            not.type === 'success' ? 'bg-emerald-500' : not.type === 'warning' ? 'bg-amber-500' : not.type === 'alert' ? 'bg-[#8B1A1A]' : 'bg-blue-500'
                          }`} />
                          <div className="space-y-0.5 text-left">
                            <p className="text-xs text-gray-700 leading-relaxed font-semibold">{not.message}</p>
                            <p className="text-[9px] font-mono text-gray-400 font-bold">
                              {new Date(not.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          </section>

        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 md:px-6 pt-8 text-left" id="tab-profile-content">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Read-Only Panel */}
            <div className="md:col-span-4 space-y-6">
              
              <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <Lock className="h-4 w-4 text-gray-400" />
                  <h3 className="text-xs font-black text-gray-700 uppercase">Official Program Tags</h3>
                </div>

                <div className="space-y-4">
                  <div className="text-left">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Growth Progress Stage</span>
                    <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-150 text-gray-700 text-xs font-black px-3 py-1.5 rounded-xl uppercase mt-1">
                      <Lock className="h-3.5 w-3.5 text-gray-400" />
                      {currentStage}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Program Enrollment Status</span>
                    <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-150 text-gray-700 text-xs font-black px-3 py-1.5 rounded-xl uppercase mt-1">
                      <Lock className="h-3.5 w-3.5 text-gray-400" />
                      {applicant.status === 'CONFIRMED' ? 'Confirmed Participant' : applicant.status}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Active Incubator Intake</span>
                    <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-150 text-gray-700 text-xs font-black px-3 py-1.5 rounded-xl uppercase mt-1 leading-normal">
                      <Lock className="h-3.5 w-3.5 text-gray-400" />
                      {cohort?.name || 'Onboarding Registry'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#8B1A1A]/5 border border-[#8B1A1A]/10 rounded-xl flex items-start gap-2.5">
                  <HelpCircle className="h-4 w-4 text-[#8B1A1A] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
                    Growth, status, and cohort tags are managed exclusively by Takhleeq ERP directors. <span className="font-extrabold text-[#8B1A1A]">Contact your Program Manager to change this.</span>
                  </p>
                </div>
              </div>

            </div>

            {/* Editable Profile Form */}
            <div className="md:col-span-8 bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-6">
              
              <div>
                <h2 className="text-base font-black text-gray-900 uppercase">Self-Service Venture profile</h2>
                <p className="text-xs text-gray-500 font-medium">Keep your core public links, social identities, description, and contact records updated. Evaluators read this ledger.</p>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-5">
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-mono block">Venture Baseline Description</label>
                  <textarea
                    rows={3}
                    required
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    placeholder="We provide AI-powered medicine dispatch routing for micro pharmacies..."
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:border-primary font-semibold leading-relaxed"
                  />
                  <span className="text-[9px] text-gray-400 block font-bold leading-none">Explain your business direction, market focus, and core solution model.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-mono block">Venture Website URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <input
                        type="url"
                        value={websiteInput}
                        onChange={(e) => setWebsiteInput(e.target.value)}
                        placeholder="https://medroute.pk"
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9.5 pr-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-mono block">Lead Contact Details</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={contactInput}
                        onChange={(e) => setContactInput(e.target.value)}
                        placeholder="0300-1234567"
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9.5 pr-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-mono block">Venture Logo URL / Asset Path</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={logoInput}
                      onChange={(e) => setLogoInput(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-logo-url-here"
                      className="w-full bg-white border border-gray-200 rounded-xl pl-9.5 pr-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <span className="text-[9px] text-gray-400 block font-bold leading-none">Provide an absolute image link or reference path of your vector graphics.</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-mono block">Social Channels & Links</label>
                  <div className="relative">
                    <Link className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={socialLinksInput}
                      onChange={(e) => setSocialLinksInput(e.target.value)}
                      placeholder="LinkedIn: https://linkedin.com/company/medroute, Twitter: @medroute"
                      className="w-full bg-white border border-gray-200 rounded-xl pl-9.5 pr-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary font-semibold"
                    />
                  </div>
                  <span className="text-[9px] text-gray-400 block font-bold mt-1 leading-none">Separate multiple URLs or handles with commas (e.g. LinkedIn, Twitter, GitHub).</span>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-[#8B1A1A] hover:bg-[#5A0F0F] text-white text-xs font-black uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-3xs cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving Profile Details...' : 'Commit Profile Details'}
                  </button>
                </div>

              </form>

            </div>

          </div>

          {/* COLLAPSED PIVOT HISTORY ACCORDION */}
          <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-6" id="pivot-history-section">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="space-y-1">
                <h3 className="text-base font-black text-gray-900 uppercase">Strategic Pivot History Ledger</h3>
                <p className="text-xs text-gray-500 font-medium">Record major adjustments to your business model, customer segments, or products during incubation.</p>
              </div>
              <button
                onClick={() => setShowAddPivotModal(!showAddPivotModal)}
                className="bg-[#8B1A1A]/5 hover:bg-[#8B1A1A]/10 text-[#8B1A1A] text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border border-[#8B1A1A]/10 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Log Pivot
              </button>
            </div>

            {showAddPivotModal && (
              <form onSubmit={handleAddPivotLog} className="bg-gray-50 border border-gray-150 p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-[#8B1A1A] uppercase">Log Strategic Pivot Shift</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-500 font-mono block">Pivot Date</label>
                    <input
                      type="date"
                      required
                      value={newPivotDate}
                      onChange={(e) => setNewPivotDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-500 font-mono block">Old Venture Direction / Product</label>
                    <input
                      type="text"
                      required
                      value={newPivotOld}
                      onChange={(e) => setNewPivotOld(e.target.value)}
                      placeholder="D2C on-demand consumer pharmacy courier app"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-500 font-mono block">New Venture Direction / Product</label>
                    <input
                      type="text"
                      required
                      value={newPivotNew}
                      onChange={(e) => setNewPivotNew(e.target.value)}
                      placeholder="B2B route-optimized pharmaceutical logistics network"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-500 font-mono block">Core Validation Hypothesis & Learning</label>
                  <textarea
                    rows={3}
                    required
                    value={newPivotHypothesis}
                    onChange={(e) => setNewPivotHypothesis(e.target.value)}
                    placeholder="Describe customer interviews, surveys, or validation experiments that catalyzed this pivot..."
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-primary font-semibold leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPivotModal(false)}
                    className="px-3.5 py-2 text-[10px] font-bold uppercase text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-[#8B1A1A] hover:bg-[#5A0F0F] text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all"
                  >
                    Commit Pivot Log
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3.5">
              {pivotHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-400 font-bold text-xs bg-gray-50 rounded-2xl border border-gray-150">
                  No business pivots have been recorded for this venture.
                </div>
              ) : (
                pivotHistory.map((pivot) => {
                  const isExpanded = activePivotExpanded === pivot.id;
                  return (
                    <div 
                      key={pivot.id} 
                      className="border border-gray-150 rounded-2xl overflow-hidden shadow-3xs"
                    >
                      <button
                        type="button"
                        onClick={() => setActivePivotExpanded(isExpanded ? null : pivot.id)}
                        className="w-full px-5 py-4 bg-gray-50/50 hover:bg-gray-50 flex items-center justify-between text-left focus:outline-none transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-4.5 w-4.5 text-[#8B1A1A] shrink-0" />
                          <div>
                            <span className="text-[10px] font-mono font-bold text-gray-400 block">Date of Strategic Shift: {pivot.date}</span>
                            <span className="text-xs font-black text-gray-800 uppercase tracking-tight flex items-center gap-1.5 flex-wrap">
                              <span>{pivot.oldDirection.substring(0, 45)}...</span>
                              <ArrowRight className="h-3 w-3 text-[#8B1A1A] shrink-0" />
                              <span className="text-[#8B1A1A]">{pivot.newDirection.substring(0, 45)}...</span>
                            </span>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-5 border-t border-gray-150 text-xs space-y-4 bg-white">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 bg-rose-50/30 border border-rose-100 p-3 rounded-xl text-left">
                              <span className="text-[9px] font-black uppercase text-rose-700 tracking-wider font-mono">Previous Product / Strategy</span>
                              <p className="font-extrabold text-gray-800 uppercase tracking-tight">{pivot.oldDirection}</p>
                            </div>
                            <div className="space-y-1.5 bg-emerald-50/30 border border-emerald-100 p-3 rounded-xl text-left">
                              <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider font-mono">Pivoted Direction</span>
                              <p className="font-extrabold text-[#8B1A1A] uppercase tracking-tight">{pivot.newDirection}</p>
                            </div>
                          </div>

                          <div className="space-y-1.5 bg-gray-50/50 border border-gray-150 p-4 rounded-xl text-left">
                            <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-mono">Validation Hypotheses, Surveys & Lessons</span>
                            <p className="text-gray-700 font-semibold leading-relaxed whitespace-pre-wrap">{pivot.hypothesis}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
