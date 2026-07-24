import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Settings, 
  Search, 
  Plus, 
  Trash, 
  ToggleLeft, 
  ToggleRight, 
  UserCheck, 
  Clock, 
  AlertOctagon, 
  Calendar, 
  CheckCircle2, 
  X, 
  Award, 
  FolderPlus, 
  Bookmark, 
  UserPlus, 
  HelpCircle, 
  Sliders,
  Check,
  Ban,
  ChevronRight,
  Sparkles,
  FileText,
  Rocket
} from 'lucide-react';
import { FormField, Cohort, Applicant, ApplicantStatus, CohortSession, TeamCheckIn, PerformanceWarning, CohortAssignment, MilestoneSubmission, AuditRecord } from '../../../../types';
import { CohortDashboardView } from './CohortDashboardView';

interface CohortManagementPageProps {
  currentUser: any;
  hasPermission: (permission: string) => boolean;
  onRefresh: () => void;
  jwtToken: string | null;
  mode?: 'intake' | 'active_cohort';
  activeTab?: string;
  selectedCohortId?: number | null;
  setSelectedCohortId?: (id: number) => void;
  cohortsList?: Cohort[];
  auditLogs?: AuditRecord[];
}

export const CohortManagementPage: React.FC<CohortManagementPageProps> = ({ 
  currentUser, 
  hasPermission,
  onRefresh,
  jwtToken,
  mode,
  activeTab = 'cohort_dashboard',
  selectedCohortId,
  setSelectedCohortId,
  cohortsList = [],
  auditLogs = []
}) => {
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${jwtToken}`,
    };
    return fetch(url, { ...options, headers });
  };
  // Global View Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<string>(() => {
    if (activeTab) return activeTab;
    if (mode === 'active_cohort') return 'cohort_dashboard';
    return 'cohort_applications';
  });

  useEffect(() => {
    if (activeTab) {
      setActiveSubTab(activeTab);
    }
  }, [activeTab]);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Core synchronized states
  const [formSettings, setFormSettings] = useState<{ is_active: boolean; fields: FormField[] }>({ is_active: true, fields: [] });
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [sessions, setSessions] = useState<CohortSession[]>([]);
  const [checkins, setCheckins] = useState<TeamCheckIn[]>([]);
  const [warnings, setWarnings] = useState<PerformanceWarning[]>([]);
  const [assignments, setAssignments] = useState<CohortAssignment[]>([
    {
      id: 1,
      cohort_id: 1,
      title: 'Quarterly Cap Table & Shareholding Structure',
      type: 'MILESTONE',
      due_date: '2026-08-15',
      recurrence_rule: 'QUARTERLY',
      created_at: '2026-07-01'
    },
    {
      id: 2,
      cohort_id: 1,
      title: 'Traction Report & Monthly Burn Rate',
      type: 'MILESTONE',
      due_date: '2026-08-01',
      recurrence_rule: 'MONTHLY',
      created_at: '2026-07-01'
    }
  ]);
  const [milestoneSubmissions, setMilestoneSubmissions] = useState<MilestoneSubmission[]>([
    {
      id: 1,
      assignment_id: 1,
      applicant_id: 1,
      file_url: 'https://storage.ucp.edu.pk/captable_v1.pdf',
      notes: 'Updated Q2 cap table with founder vesting schedule',
      status: 'PENDING',
      submitted_at: '2026-07-20T10:00:00Z'
    },
    {
      id: 2,
      assignment_id: 2,
      applicant_id: 2,
      file_url: 'https://storage.ucp.edu.pk/burnrate_july.xlsx',
      notes: 'Monthly traction summary',
      status: 'PENDING',
      submitted_at: '2026-07-21T14:30:00Z'
    }
  ]);

  // Selected Entities
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [applicantParent, setApplicantParent] = useState<Applicant | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [selectedSession, setSelectedSession] = useState<CohortSession | null>(null);

  // Active Startup Profile Modal (Pivot History & Notes tabs)
  const [selectedStartupForModal, setSelectedStartupForModal] = useState<Applicant | null>(null);
  const [startupModalTab, setStartupModalTab] = useState<'overview' | 'pivots' | 'notes'>('overview');
  const [startupPivots, setStartupPivots] = useState<Array<{ id: number; date: string; title: string; description: string; impact: string }>>([
    { id: 1, date: '2026-03-15', title: 'B2C to B2B Model Shift', description: 'Transitioned from consumer retail app to B2B SaaS workflow for campus vendors.', impact: 'High Impact - MRR +40%' },
    { id: 2, date: '2026-05-10', title: 'API Integration Pivot', description: 'Replaced manual PDF uploading with direct Azure AD & webhook syncing.', impact: 'Medium Impact - Streamlined onboarding' }
  ]);
  const [startupNotes, setStartupNotes] = useState<Array<{ id: number; date: string; author: string; content: string }>>([
    { id: 1, date: '2026-06-01', author: 'Dr. Qaseeb Niaz (Director)', content: 'Startup demonstrated strong traction in week 4 demo clinic. Pitch presentation ready for investor circle.' },
    { id: 2, date: '2026-06-18', author: 'Maheen Malik (Manager)', content: 'Mentorship office hours completed with FinTech advisor. Legal incorporation docs verified.' }
  ]);
  const [newPivotTitle, setNewPivotTitle] = useState('');
  const [newPivotDesc, setNewPivotDesc] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Sync selected cohort with parent prop
  useEffect(() => {
    if (selectedCohortId && cohorts.length > 0) {
      const found = cohorts.find(c => c.id === selectedCohortId);
      if (found && found.id !== selectedCohort?.id) {
        setSelectedCohort(found);
      }
    }
  }, [selectedCohortId, cohorts]);

  useEffect(() => {
    if (selectedCohort && setSelectedCohortId && selectedCohort.id !== selectedCohortId) {
      setSelectedCohortId(selectedCohort.id);
    }
  }, [selectedCohort?.id]);
  
  // Form Builder Temp fields
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'email' | 'number' | 'phone' | 'cnic' | 'file'>('text');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Scheduling Temp Form
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState('');
  const [sessionEndTime, setSessionEndTime] = useState('');
  const [sessionMentor, setSessionMentor] = useState('');
  const [sessionCategory, setSessionCategory] = useState('Masterclass');
  const [sessionVenue, setSessionVenue] = useState('Auditorium 1');
  const [sessionRecordingUrl, setSessionRecordingUrl] = useState('');

  // Weekly Check-in Temp Form
  const [checkinStartupId, setCheckinStartupId] = useState<string>('');
  const [checkinBlockers, setCheckinBlockers] = useState('');
  const [checkinProgress, setCheckinProgress] = useState<number>(5);
  const [checkinNotes, setCheckinNotes] = useState('');

  // Performance Warning Temp Form
  const [warningStartupId, setWarningStartupId] = useState<string>('');
  const [warningSeverity, setWarningSeverity] = useState<'YELLOW' | 'RED'>('YELLOW');
  const [warningReason, setWarningReason] = useState('');
  const [warningResolutionNotes, setWarningResolutionNotes] = useState('');

  // Active Attendance Marking Sheet
  const [attendanceSheet, setAttendanceSheet] = useState<Record<number, 'PRESENT' | 'ABSENT' | 'EXCUSED'>>({});

  // Search/Filters in Intake Sheet
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Triggering new cohort form
  const [showCreateCohortForm, setShowCreateCohortForm] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');

  // Fetch all database tables
  const loadCohortModuleData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Form settings
      const settingsRes = await fetchWithAuth('/api/cohort-form-settings');
      const settingsData = await settingsRes.json();
      setFormSettings(settingsData);

      // 2. Fetch Applicants
      const applicantsRes = await fetchWithAuth('/api/applicants');
      const applicantsData = await applicantsRes.json();
      setApplicants(applicantsData);

      // 3. Fetch Cohorts
      const cohortsRes = await fetchWithAuth('/api/cohorts');
      const cohortsData = await cohortsRes.json();
      setCohorts(cohortsData);

      if (cohortsData.length > 0) {
        // Default to the first active cohort if exists
        const active = cohortsData.find((c: Cohort) => c.status === 'ACTIVE');
        setSelectedCohort(active || cohortsData[cohortsData.length - 1]);
      }

      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError('Connection Error: Unable to fetch cohort tracking data from the server.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCohortModuleData();
  }, []);

  // Sync sub-data when selected cohort changes
  useEffect(() => {
    if (!selectedCohort?.id) return;
    const cohortId = selectedCohort.id;

    // Fetch sessions
    fetchWithAuth(`/api/cohorts/${cohortId}/sessions`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setSessions(data);
          if (data.length > 0) {
            setSelectedSession(prev => (prev && data.some(s => s.id === prev.id) ? prev : data[0]));
          } else {
            setSelectedSession(null);
          }
        }
      })
      .catch(() => setSessions([]));

    // Fetch checkins
    fetchWithAuth(`/api/cohorts/${cohortId}/checkins`)
      .then(res => res.ok ? res.json() : [])
      .then(data => Array.isArray(data) && setCheckins(data))
      .catch(() => setCheckins([]));

    // Fetch warnings
    fetchWithAuth(`/api/cohorts/${cohortId}/warnings`)
      .then(res => res.ok ? res.json() : [])
      .then(data => Array.isArray(data) && setWarnings(data))
      .catch(() => setWarnings([]));

  }, [selectedCohort?.id]);

  // Sync attendance sheet when selected session changes
  useEffect(() => {
    if (!selectedSession?.id) {
      setAttendanceSheet({});
      return;
    }
    fetchWithAuth(`/api/sessions/${selectedSession.id}/attendance`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const mapping: Record<number, 'PRESENT' | 'ABSENT' | 'EXCUSED'> = {};
          data.forEach((att: any) => {
            mapping[att.applicant_id] = att.status;
          });
          setAttendanceSheet(mapping);
        }
      })
      .catch(() => setAttendanceSheet({}));
  }, [selectedSession?.id]);

  // Alert handler helpers
  const triggerSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  // --- SUBTAB 1: FORM BUILDER ACTIONS ---
  const handleToggleFormActive = async () => {
    const nextActive = !formSettings.is_active;
    try {
      const res = await fetchWithAuth('/api/cohort-form-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive, fields: formSettings.fields })
      });
      if (!res.ok) throw new Error('Failed to toggle dynamic form state.');
      setFormSettings(prev => ({ ...prev, is_active: nextActive }));
      triggerSuccess(`Dynamic application form is now ${nextActive ? 'ONLINE' : 'OFFLINE'}.`);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) return;

    // Create a slug id
    const fieldId = 'field_custom_' + newFieldLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Check if duplicate id exists
    if (formSettings.fields.some(f => f.id === fieldId)) {
      triggerError('A field with a similar label already exists.');
      return;
    }

    const newField: FormField = {
      id: fieldId,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      placeholder: newFieldPlaceholder.trim() || undefined
    };

    const updatedFields = [...formSettings.fields, newField];

    try {
      const res = await fetchWithAuth('/api/cohort-form-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: formSettings.is_active, fields: updatedFields })
      });
      if (!res.ok) throw new Error('Failed to save field builder configuration.');
      
      setFormSettings(prev => ({ ...prev, fields: updatedFields }));
      setNewFieldLabel('');
      setNewFieldPlaceholder('');
      setNewFieldRequired(false);
      triggerSuccess(`Added dynamic field '${newField.label}' successfully.`);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    // Prevent deletion of baseline criteria fields
    const isBaseline = ['field_startup_name', 'field_startup_desc', 'field_founder_name', 'field_founder_email', 'field_founder_phone', 'field_founder_cnic'].includes(fieldId);
    if (isBaseline) {
      triggerError('Admissions Constraint: You are forbidden from deleting core startup parameters.');
      return;
    }

    const updatedFields = formSettings.fields.filter(f => f.id !== fieldId);

    try {
      const res = await fetchWithAuth('/api/cohort-form-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: formSettings.is_active, fields: updatedFields })
      });
      if (!res.ok) throw new Error('Failed to save field configuration.');
      setFormSettings(prev => ({ ...prev, fields: updatedFields }));
      triggerSuccess('Deleted dynamic field.');
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // --- SUBTAB 2: INTAKE EVALUATION SHEET ---
  const handleSelectApplicant = async (app: Applicant) => {
    setSelectedApplicant(app);
    setApplicantParent(null);

    // If has parent, fetch parent application status history
    if (app.parent_applicant_id) {
      try {
        const res = await fetchWithAuth(`/api/applicants/${app.id}`);
        const data = await res.json();
        if (data.parent) {
          setApplicantParent(data.parent);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateApplicantStatus = async (newStatus: ApplicantStatus | string) => {
    if (!selectedApplicant) return;
    try {
      const res = await fetchWithAuth(`/api/applicants/${selectedApplicant.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          cohort_id: selectedCohort?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status.');

      const updatedApplicant = data.applicant || { ...selectedApplicant, status: newStatus as ApplicantStatus };
      setApplicants(prev => prev.map(a => a.id === selectedApplicant.id ? { ...a, ...updatedApplicant } : a));
      setSelectedApplicant(prev => prev ? { ...prev, ...updatedApplicant } : null);
      triggerSuccess(`Startup '${selectedApplicant.startup_name}' status set to '${newStatus}'.`);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleToggleOrientation = async () => {
    if (!selectedApplicant) return;
    const nextOrient = !selectedApplicant.orientation_conducted;
    try {
      const res = await fetchWithAuth(`/api/applicants/${selectedApplicant.id}/orientation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orientation_conducted: nextOrient })
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to update orientation log.');

      setApplicants(prev => prev.map(a => a.id === selectedApplicant.id ? { ...a, orientation_conducted: nextOrient } : a));
      setSelectedApplicant(prev => prev ? { ...prev, orientation_conducted: nextOrient } : null);
      triggerSuccess(`Orientation checklist set to ${nextOrient ? 'CONDUCTED' : 'PENDING'}.`);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // --- SUBTAB 3: COHORT & WORKSHOP SCHEDULER ---
  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;

    try {
      const res = await fetchWithAuth('/api/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCohortName, status: 'ACTIVE' }) // Create active right away for easy testing
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate cohort.');

      setCohorts(prev => [...prev, data.cohort]);
      setSelectedCohort(data.cohort);
      setNewCohortName('');
      setShowCreateCohortForm(false);
      triggerSuccess(`Cohort Incubator Program '${data.cohort.name}' initiated.`);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleUpdateCohortStatus = async (newStatus: 'DRAFT' | 'ACTIVE' | 'COMPLETED', bulkGraduate: boolean = false) => {
    if (!selectedCohort) return;
    try {
      const res = await fetchWithAuth(`/api/cohorts/${selectedCohort.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, auto_graduate_founders: bulkGraduate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change cohort state.');

      setCohorts(prev => prev.map(c => c.id === selectedCohort.id ? { ...c, status: newStatus } : c));
      setSelectedCohort(prev => prev ? { ...prev, status: newStatus } : null);
      triggerSuccess(`Cohort status updated to '${newStatus}'. Graduated seats count: ${data.bulkGraduatedCount || 0}`);
      
      // Reload applicants to see graduation/status changes
      const applicantsRes = await fetchWithAuth('/api/applicants');
      const applicantsData = await applicantsRes.json();
      setApplicants(applicantsData);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Workshops & Sessions Scheduling
  const handleScheduleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohort || !sessionTitle.trim() || !sessionDate || !sessionStartTime || !sessionEndTime) return;

    try {
      const res = await fetchWithAuth(`/api/cohorts/${selectedCohort.id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sessionTitle,
          date: sessionDate,
          start_time: sessionStartTime,
          end_time: sessionEndTime,
          mentor_name: sessionMentor,
          topic_category: sessionCategory,
          venue: sessionVenue,
          recording_url: sessionRecordingUrl
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule workshop session.');

      setSessions(prev => [...prev, data.session].sort((a,b) => a.date.localeCompare(b.date)));
      setSelectedSession(data.session);
      setSessionTitle('');
      setSessionDate('');
      setSessionStartTime('');
      setSessionEndTime('');
      setSessionMentor('');
      setSessionCategory('Masterclass');
      setSessionVenue('Auditorium 1');
      setSessionRecordingUrl('');
      triggerSuccess(`Workshop scheduled: '${data.session.title}'.`);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleDeleteSession = async (sessId: number) => {
    try {
      const res = await fetchWithAuth(`/api/sessions/${sessId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to cancel workshop.');

      setSessions(prev => prev.filter(s => s.id !== sessId));
      if (selectedSession?.id === sessId) {
        setSelectedSession(null);
      }
      triggerSuccess('Scheduled session cancelled and deleted.');
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Mark Attendance Log
  const handleMarkAttendance = (applicantId: number, status: 'PRESENT' | 'ABSENT' | 'EXCUSED') => {
    setAttendanceSheet(prev => ({
      ...prev,
      [applicantId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSession) return;
    
    // Structure attendance array
    const attendanceArray = confirmedCohortStartups.map(s => ({
      applicant_id: s.id,
      status: attendanceSheet[s.id] || 'ABSENT'
    }));

    try {
      const res = await fetchWithAuth(`/api/sessions/${selectedSession.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: attendanceArray })
      });
      if (!res.ok) throw new Error('Failed to record attendance logs.');
      triggerSuccess(`Attendance sheet synchronized successfully for '${selectedSession.title}'.`);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Weekly Team Check-ins log
  const handleLogWeeklyCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohort || !checkinStartupId || !checkinBlockers.trim()) return;

    try {
      const res = await fetchWithAuth(`/api/cohorts/${selectedCohort.id}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_id: parseInt(checkinStartupId),
          blockers: checkinBlockers,
          progress_score: checkinProgress,
          mentor_notes: checkinNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log checkin.');

      setCheckins(prev => [data.checkin, ...prev]);
      setCheckinBlockers('');
      setCheckinNotes('');
      setCheckinProgress(5);
      triggerSuccess('Weekly team check-in sheet updated.');
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Warning System
  const handleIssueWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohort || !warningStartupId || !warningReason.trim()) return;

    try {
      const res = await fetchWithAuth(`/api/cohorts/${selectedCohort.id}/warnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_id: parseInt(warningStartupId),
          reason: warningReason,
          severity: warningSeverity
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue warning.');

      setWarnings(prev => [data.warning, ...prev]);
      setWarningReason('');
      triggerSuccess(`Issued ${warningSeverity} warning successfully.`);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleResolveWarning = async (warningId: number) => {
    if (!warningResolutionNotes.trim()) {
      triggerError('You must write resolution or revocation notes first.');
      return;
    }
    try {
      const res = await fetchWithAuth(`/api/warnings/${warningId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          resolution_notes: warningResolutionNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve warning.');

      setWarnings(prev => prev.map(w => w.id === warningId ? data.warning : w));
      setWarningResolutionNotes('');
      triggerSuccess('Performance warning marked as resolved.');
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Add Pivot and Note handlers
  const handleAddPivot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPivotTitle.trim()) return;
    const newP = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      title: newPivotTitle,
      description: newPivotDesc,
      impact: 'Recorded Pivot Event'
    };
    setStartupPivots([newP, ...startupPivots]);
    setNewPivotTitle('');
    setNewPivotDesc('');
    triggerSuccess('Pivot history recorded.');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    const newN = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      author: currentUser?.name || 'Program Manager',
      content: newNoteContent
    };
    setStartupNotes([newN, ...startupNotes]);
    setNewNoteContent('');
    triggerSuccess('Internal staff note recorded.');
  };

  // Computed arrays for selected cohort
  const confirmedCohortStartups = applicants.filter(a => {
    const cId = selectedCohort?.id;
    const matchesCohort = !cId || String(a.cohort_id) === String(cId) || (!a.cohort_id && String(cId) === '1');
    const ps = typeof a.program_status === 'string' && a.program_status !== '{}' ? a.program_status : '';
    const matchesStatus = a.status === 'CONFIRMED' || 
                          a.status === 'ACCEPTED' || 
                          a.status === 'ENROLLED' || 
                          a.status === 'ORIENTATION_CONDUCTED' || 
                          ['ACTIVE', 'PAUSED', 'GRADUATED'].includes(ps) ||
                          (a.cohort_id && !['REJECTED', 'APPLIED', 'SUBMITTED', 'IN_REVIEW', 'UNDER_REVIEW', 'SHORTLISTED_FOR_PRESENTATION'].includes(a.status));
    return matchesCohort && matchesStatus;
  });

  // Filter intake list
  const getIntakeStepIndex = (status: any) => {
    const s = typeof status === 'string' ? status : String(status || '');
    if (s === 'APPLIED' || s === 'SUBMITTED') return 0;
    if (s === 'UNDER_REVIEW' || s === 'IN_REVIEW') return 1;
    if (s === 'SHORTLISTED_FOR_PRESENTATION' || s === 'SHORTLISTED') return 2;
    if (s === 'PRESENTATION_CONDUCTED') return 3;
    if (['ACCEPTED', 'CONDITIONAL_ACCEPTED', 'REJECTED', 'WAITLISTED', 'BACKUP_CANDIDATE'].includes(s)) return 4;
    if (s === 'CONFIRMED') return 5;
    if (s === 'ORIENTATION_CONDUCTED') return 6;
    if (s === 'ENROLLED') return 7;
    return 0;
  };

  const filteredApplicants = applicants.filter(app => {
    const matchesSearch = app.startup_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.tracking_token.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || 
      app.status === statusFilter ||
      (statusFilter === 'APPLIED' && app.status === 'SUBMITTED') ||
      (statusFilter === 'UNDER_REVIEW' && app.status === 'IN_REVIEW') ||
      (statusFilter === 'SHORTLISTED_FOR_PRESENTATION' && (app.status as string) === 'SHORTLISTED');
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-3xs" id="cohort-mgmt-loading">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-4 animate-pulse">Retrieving Takhleeq Cohort Ledger...</p>
      </div>
    );
  }

  const getHeaderInfo = () => {
    switch(activeSubTab) {
      case 'cohort_settings':
        return { title: 'Cohort Settings', desc: 'Batch-level config: name, intake year, start/end dates, capacity, program manager assignment' };
      case 'cohort_form_config':
      case 'builder':
        return { title: 'Application Form Configuration', desc: 'Configure dynamic intake form fields, open/close dates, UCP affiliation fields' };
      case 'cohort_applications':
      case 'cohort_intake':
      case 'intake':
        return { title: 'Review Applications', desc: 'Audit applicant evaluation scores, shortlist founders, and issue cohort admission decisions' };
      case 'cohort_startups':
        return { title: 'Active Startups', desc: 'Monitor active ventures, view founder profiles, track pivot history, and read mentor notes' };
      case 'cohort_sessions':
        return { title: 'Sessions & Workshops', desc: 'Schedule lectures, expert masterclasses, pitch clinics, and maintain recording links' };
      case 'cohort_assignments':
        return { title: 'Assignments & Deliverables', desc: 'Track milestone deliverables, pitch deck submissions, and financial models' };
      case 'cohort_attendance':
        return { title: 'Session Attendance', desc: 'Mark and synchronize founder attendance sheet for scheduled workshops' };
      case 'cohort_mentorship':
        return { title: 'Mentorship Program', desc: 'Manage mentor directory, office hour bookings, and advisory feedback' };
      case 'cohort_kpis':
        return { title: 'Performance: Metrics & KPIs', desc: 'Track weekly startup progress scores, team check-in blockers, and milestone velocity' };
      case 'cohort_investment':
        return { title: 'Performance: Investment Readiness', desc: 'Evaluate pitch deck scores, cap tables, valuation stages, and investor circle readiness' };
      case 'cohort_warnings':
        return { title: 'Performance: Warnings', desc: 'Issue formal yellow/red performance letters, manage probations, and log resolutions' };
      default:
        return { title: 'Cohort Management Dashboard', desc: 'Overview of active batch performance, seat occupancy, and incubator health metrics' };
    }
  };
  const { title: displayTitle, desc: displayDesc } = getHeaderInfo();

  return (
    <div className="space-y-6" id="cohort-management-dashboard">
      
      {/* HEADER SECTION WITH NAVIGATION SWITCH */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              {displayTitle}
              <span className="bg-[#8B1A1A] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shrink-0">
                Module 02
              </span>
            </h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{displayDesc}</p>
          </div>
        </div>
      </div>

      {/* Global alert messages */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 text-left font-bold flex items-center gap-2 animate-fade-in shadow-3xs">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 text-left font-bold flex items-center gap-2 animate-fade-in shadow-3xs">
          <AlertOctagon className="h-4.5 w-4.5 text-rose-600" />
          {error}
        </div>
      )}

      {/* ----------------------------------------------------------------------------------- */}
      {/* SUBTAB 0: COHORT OVERVIEW DASHBOARD */}
      {/* ----------------------------------------------------------------------------------- */}
      {(activeSubTab === 'cohort_dashboard' || activeSubTab === 'cohorts' || activeSubTab === 'dashboard') && (
        <CohortDashboardView 
          selectedCohort={selectedCohort}
          cohorts={cohorts}
          setSelectedCohort={setSelectedCohort}
          applicants={applicants}
          sessions={sessions}
          warnings={warnings}
          assignments={assignments}
          milestoneSubmissions={milestoneSubmissions}
          auditLogs={auditLogs}
          onNavigateSubTab={(subTab, filterStatus) => {
            setActiveSubTab(subTab);
            if (filterStatus) {
              setStatusFilter(filterStatus);
            }
          }}
        />
      )}

      {/* ----------------------------------------------------------------------------------- */}
      {/* SUBTAB 1: DYNAMIC FORM BUILDER SETTINGS */}
      {/* ----------------------------------------------------------------------------------- */}
      {(activeSubTab === 'builder' || activeSubTab === 'cohort_form_config') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="subtab-form-builder">
          
          {/* Dynamic Switch & Toggle */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-4">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Admission intake status</span>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Dynamic Toggle Switch</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-bold">
                Control dynamic public application form visibility instantly. When turned offline, public admissions forms will gracefully close and block new applicants, while still preserving status-checking capability.
              </p>

              <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-500 block font-mono">Form Accessibility</span>
                  <span className={`text-[11px] font-black uppercase ${formSettings.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {formSettings.is_active ? 'Online / Open' : 'Offline / Closed'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleFormActive}
                  className="text-primary hover:text-rose-900 transition-all cursor-pointer p-1"
                >
                  {formSettings.is_active ? (
                    <ToggleRight className="h-12 w-12 text-primary" />
                  ) : (
                    <ToggleLeft className="h-12 w-12 text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Field Addition Panel */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-4">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Dynamic Form configurator</span>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Add Custom Field</h3>
              
              <form onSubmit={handleAddField} className="space-y-4 font-black text-[10px] uppercase tracking-wider">
                <div className="space-y-1.5">
                  <label className="text-gray-500 block">Question / Field Label</label>
                  <input
                    type="text"
                    required
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="e.g. Pitch Deck Google Drive link"
                    className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 font-bold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-gray-500 block">Field Type</label>
                    <select
                      value={newFieldType}
                      onChange={(e: any) => setNewFieldType(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-2.5 py-3 text-xs text-gray-800 font-bold cursor-pointer focus:outline-none"
                    >
                      <option value="text">Short Text</option>
                      <option value="email">Email</option>
                      <option value="number">Numeric</option>
                      <option value="phone">Phone number</option>
                      <option value="cnic">CNIC identity</option>
                      <option value="file">Pitch Deck Link</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-gray-500 block">Validation</label>
                    <div className="flex items-center h-11">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-600 text-[11px] normal-case">
                        <input
                          type="checkbox"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        Required Field
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-500 block">Placeholder prompt</label>
                  <input
                    type="text"
                    value={newFieldPlaceholder}
                    onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                    placeholder="e.g. Paste public sharing URL"
                    className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 font-bold focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-[#5A0F0F] text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-3xs mt-2"
                >
                  <Plus className="h-4 w-4" />
                  Append Field Question
                </button>
              </form>
            </div>
          </div>

          {/* Current Dynamic Questionnaire Structure Table */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Ledger configuration</span>
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Dynamic Questionnaire Blueprint</h3>
                </div>
                <span className="text-[10px] font-mono font-black uppercase text-gray-400 bg-gray-100 px-3 py-1 rounded-md">
                  {formSettings.fields.length} Fields Defined
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-500 leading-normal border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <th className="py-3.5 px-4">Field Question (Label)</th>
                      <th className="py-3.5 px-4">Validation Type</th>
                      <th className="py-3.5 px-4">Constraint</th>
                      <th className="py-3.5 px-4 text-right">Scope Action</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-gray-700">
                    {formSettings.fields.map((field) => {
                      const isBaseline = ['field_startup_name', 'field_startup_desc', 'field_founder_name', 'field_founder_email', 'field_founder_phone', 'field_founder_cnic'].includes(field.id);
                      return (
                        <tr key={field.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-gray-800">{field.label}</div>
                            <div className="text-[9px] font-mono text-gray-400 mt-0.5">{field.id}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[9px] font-mono font-black uppercase bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-md">
                              {field.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-bold ${field.required ? 'text-rose-600' : 'text-gray-400'}`}>
                              {field.required ? 'Required *' : 'Optional'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isBaseline ? (
                              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                                Core Parameter
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteField(field.id)}
                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Delete Question Field"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------------------- */}
      {/* SUBTAB 2: INTAKE & ADMISSIONS EVALUATION SHEET */}
      {/* ----------------------------------------------------------------------------------- */}
      {(activeSubTab === 'intake' || activeSubTab === 'cohort_applications' || activeSubTab === 'cohort_intake') && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="subtab-intake-review">
          
          {/* Main applicants list table */}
          <div className="xl:col-span-2 space-y-6 text-left">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-5">
              
              {/* Filters header bar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Admission applications</span>
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Intake Admissions Evaluator</h3>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto font-black text-[10px] uppercase tracking-wider">
                  <div className="relative flex-1 md:w-60">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, token..."
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl pl-9 pr-4 py-2 text-xs font-bold placeholder-gray-400 focus:outline-none"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-150 text-xs text-gray-800 rounded-xl px-3 py-2 cursor-pointer focus:outline-none font-bold"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="APPLIED">1. Applied</option>
                    <option value="UNDER_REVIEW">2. Under Review</option>
                    <option value="SHORTLISTED_FOR_PRESENTATION">3. Shortlisted for Pitch</option>
                    <option value="PRESENTATION_CONDUCTED">4. Pitch Conducted</option>
                    <option value="CONDITIONAL_ACCEPTED">5. Conditional Accept</option>
                    <option value="ACCEPTED">6. Accepted / Offer Issued</option>
                    <option value="CONFIRMED">7. Seat Confirmed</option>
                    <option value="ORIENTATION_CONDUCTED">8. Orientation Conducted</option>
                    <option value="ENROLLED">9. Enrolled</option>
                    <option value="WAITLISTED">10. Waitlisted</option>
                    <option value="BACKUP_CANDIDATE">11. Backup List</option>
                    <option value="REJECTED">12. Rejected</option>
                  </select>
                </div>
              </div>

              {/* Table list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-500 border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <th className="py-3 px-4">Startup / Founder</th>
                      <th className="py-3 px-4">CNIC Number</th>
                      <th className="py-3 px-4">Program Status</th>
                      <th className="py-3 px-4">Intake Status</th>
                      <th className="py-3 px-4 text-right">Profile review</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-gray-700">
                    {filteredApplicants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400">
                          No startup intake applications match the active filters.
                        </td>
                      </tr>
                    ) : (
                      filteredApplicants.map((app) => (
                        <tr 
                          key={app.id} 
                          className={`border-b border-gray-50 hover:bg-gray-50/55 cursor-pointer transition-colors ${selectedApplicant?.id === app.id ? 'bg-rose-50/15 border-rose-100/50' : ''}`}
                          onClick={() => handleSelectApplicant(app)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-gray-800 leading-tight">{app.startup_name}</div>
                            <div className="text-[10px] font-bold text-gray-400 mt-0.5">{app.name} • <span className="font-mono text-[9px]">{app.tracking_token}</span></div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                            {app.cnic}
                          </td>
                          <td className="py-3.5 px-4">
                            {(() => {
                              const ps = typeof app.program_status === 'string' && app.program_status !== '{}' ? app.program_status : (app.status === 'CONFIRMED' || app.cohort_id ? 'ACTIVE' : 'NOT_ENROLLED');
                              const badgeStyle = 
                                ps === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                ps === 'GRADUATED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                ps === 'PAUSED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                ps === 'KICKED_OUT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                'bg-gray-100 text-gray-600 border-gray-200';
                              return (
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${badgeStyle}`}>
                                  {ps.replace(/_/g, ' ')}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${
                              (app.status === 'APPLIED' || app.status === 'SUBMITTED') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              (app.status === 'UNDER_REVIEW' || app.status === 'IN_REVIEW') ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              (app.status === 'SHORTLISTED_FOR_PRESENTATION' || (app.status as string) === 'SHORTLISTED') ? 'bg-purple-50 text-purple-700 border-purple-100' :
                              app.status === 'PRESENTATION_CONDUCTED' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                              app.status === 'CONDITIONAL_ACCEPTED' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                              app.status === 'ACCEPTED' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              app.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              app.status === 'ORIENTATION_CONDUCTED' ? 'bg-lime-50 text-lime-700 border-lime-100' :
                              app.status === 'ENROLLED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              app.status === 'WAITLISTED' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                              app.status === 'BACKUP_CANDIDATE' ? 'bg-violet-50 text-violet-700 border-violet-100' :
                              'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {typeof app.status === 'string' ? app.status.replace(/_/g, ' ') : (app.status ? String(app.status) : 'SUBMITTED')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleSelectApplicant(app)}
                              className="text-[10px] font-black uppercase tracking-wider text-primary hover:text-[#5A0F0F] bg-rose-50/50 hover:bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl transition-all cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sliding Details sidebar for Selected Applicant */}
          <div className="xl:col-span-1">
            <AnimatePresence mode="wait">
              {selectedApplicant ? (
                <motion.div
                  key={selectedApplicant.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-6"
                  id="intake-detail-panel"
                >
                  {/* Title card */}
                  <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Profile Details</span>
                      <h3 className="text-sm font-black text-gray-900 tracking-tight">{selectedApplicant.startup_name}</h3>
                      <p className="text-xs text-gray-400 font-bold font-mono">{selectedApplicant.tracking_token}</p>
                    </div>
                    <button
                      onClick={() => setSelectedApplicant(null)}
                      className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-lg transition-all cursor-pointer"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Section: Founder & Contact Identity */}
                  <div className="space-y-3.5 text-xs">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Founder Particulars</span>
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-150 space-y-2.5 font-bold text-gray-700">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Full name</span>
                        <span>{selectedApplicant.name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Contact channel</span>
                        <span>{selectedApplicant.email} • {selectedApplicant.phone}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">CNIC Card number</span>
                        <span>{selectedApplicant.cnic}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section: Parent history Lineage Link */}
                  {selectedApplicant.parent_applicant_id && (
                    <div className="space-y-3.5 text-xs">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Lineage Parent Record</span>
                      <div className="p-3.5 bg-[#FFF9E6] border border-[#FFE7A3] rounded-2xl space-y-2 text-gray-800">
                        <p className="font-extrabold text-amber-900 text-[11px] flex items-center gap-1.5">
                          <AlertOctagon className="h-4 w-4 text-amber-700" />
                          Previous Application Match
                        </p>
                        <div className="pl-5 text-[11px] font-medium leading-relaxed">
                          <p>We found a matching founder with email or CNIC from past intake cycles.</p>
                          {applicantParent ? (
                            <p className="mt-1 flex items-center gap-1">
                              <ChevronRight className="h-3 w-3 shrink-0" />
                              Past Token: <strong className="font-mono text-gray-950">{applicantParent.tracking_token}</strong> ({applicantParent.status})
                            </p>
                          ) : (
                            <p className="mt-1 animate-pulse">Scanning past registries...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Questionnaire answers list */}
                  <div className="space-y-3.5 text-xs">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Business Answers & dynamic fields</span>
                    <div className="space-y-3.5">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Venture Description</span>
                        <p className="text-gray-700 font-bold bg-gray-50 border border-gray-150 p-3 rounded-xl leading-relaxed mt-1">
                          {selectedApplicant.startup_description}
                        </p>
                      </div>

                      {selectedApplicant.form_data && Object.keys(selectedApplicant.form_data).map((key) => {
                        const questionLabel = formSettings.fields.find(f => f.id === key)?.label || key;
                        const answerVal = selectedApplicant.form_data[key];
                        return (
                          <div key={key}>
                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">{questionLabel}</span>
                            <div className="text-gray-700 font-bold bg-gray-50 border border-gray-150 p-3 rounded-xl leading-relaxed mt-1 break-all">
                              {answerVal || <em className="text-gray-400 font-normal">Blank / Unanswered</em>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* Vertical Stage Progress Tracker UI */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">Stage Progress Tracker</span>
                      <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        Step {getIntakeStepIndex(selectedApplicant.status) + 1} of 8
                      </span>
                    </div>

                    <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 space-y-0.5">
                      {(() => {
                        const currentIdx = getIntakeStepIndex(selectedApplicant.status);
                        const steps = [
                          { key: 'APPLIED', label: '1. APPLIED', desc: 'Application Form Submitted' },
                          { key: 'UNDER_REVIEW', label: '2. UNDER REVIEW', desc: 'Desk Screening & Review' },
                          { key: 'SHORTLISTED_FOR_PRESENTATION', label: '3. SHORTLISTED FOR PITCH', desc: 'Invited to Panel Presentation' },
                          { key: 'PRESENTATION_CONDUCTED', label: '4. PITCH CONDUCTED', desc: 'Panel Evaluation Completed' },
                          { 
                            key: 'DECISION', 
                            label: `5. ${['ACCEPTED', 'CONDITIONAL_ACCEPTED', 'REJECTED', 'WAITLISTED', 'BACKUP_CANDIDATE'].includes(selectedApplicant.status) ? (typeof selectedApplicant.status === 'string' ? selectedApplicant.status.replace(/_/g, ' ') : String(selectedApplicant.status)) : 'DECISION PENDING'}`, 
                            desc: 'Admissions Decision Outcome' 
                          },
                          { key: 'CONFIRMED', label: '6. SEAT CONFIRMED', desc: 'Founder Accepted & Seat Reserved' },
                          { key: 'ORIENTATION_CONDUCTED', label: '7. ORIENTATION CONDUCTED', desc: 'Induction & Onboarding' },
                          { key: 'ENROLLED', label: '8. ENROLLED', desc: 'Active Cohort Venture' },
                        ];

                        return steps.map((step, idx) => {
                          const isCompleted = idx < currentIdx;
                          const isCurrent = idx === currentIdx;
                          const isLast = idx === steps.length - 1;

                          return (
                            <div key={step.key} className="flex items-start gap-3 relative pb-3.5 last:pb-0">
                              {!isLast && (
                                <div 
                                  className={`absolute left-[11px] top-[22px] bottom-0 w-[2px] ${
                                    isCompleted ? 'bg-emerald-500' : 'bg-gray-200'
                                  }`} 
                                />
                              )}

                              <div className="shrink-0 z-10">
                                {isCompleted ? (
                                  <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-3xs">
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  </div>
                                ) : isCurrent ? (
                                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shadow-3xs ring-4 ring-primary/20">
                                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                                  </div>
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-gray-100 border border-gray-300 text-gray-400 flex items-center justify-center text-[10px] font-mono font-bold">
                                    {idx + 1}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 pt-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-xs font-black tracking-tight ${
                                    isCurrent ? 'text-gray-900 font-extrabold' : isCompleted ? 'text-emerald-950 font-bold' : 'text-gray-400'
                                  }`}>
                                    {step.label}
                                  </span>

                                  {isCurrent && (
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                      selectedApplicant.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                      selectedApplicant.status === 'CONFIRMED' || selectedApplicant.status === 'ENROLLED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                      'bg-primary/10 text-primary border-primary/20'
                                    }`}>
                                      Current Stage
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[10px] leading-tight mt-0.5 ${
                                  isCurrent ? 'text-gray-600 font-medium' : isCompleted ? 'text-emerald-700/80' : 'text-gray-400'
                                }`}>
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* Section: Status Decider & Operations */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Decisions & Operations</span>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block font-mono">
                        Intake Stage Status
                      </label>
                      <select
                        value={selectedApplicant.status}
                        onChange={(e) => handleUpdateApplicantStatus(e.target.value as ApplicantStatus)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-primary font-mono cursor-pointer"
                      >
                        <option value="APPLIED">1. APPLIED (Submitted)</option>
                        <option value="UNDER_REVIEW">2. UNDER REVIEW (Screening)</option>
                        <option value="SHORTLISTED_FOR_PRESENTATION">3. SHORTLISTED FOR PRESENTATION</option>
                        <option value="PRESENTATION_CONDUCTED">4. PRESENTATION CONDUCTED</option>
                        <option value="CONDITIONAL_ACCEPTED">5. CONDITIONAL ACCEPTED</option>
                        <option value="ACCEPTED">6. ACCEPTED (Offer Seat)</option>
                        <option value="CONFIRMED">7. CONFIRMED (Seat Confirmed)</option>
                        <option value="ORIENTATION_CONDUCTED">8. ORIENTATION CONDUCTED</option>
                        <option value="ENROLLED">9. ENROLLED (In Program)</option>
                        <option value="WAITLISTED">10. WAITLISTED</option>
                        <option value="BACKUP_CANDIDATE">11. BACKUP CANDIDATE</option>
                        <option value="REJECTED">12. REJECTED (Not Selected)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase tracking-wider font-mono pt-1">
                      <button
                        onClick={() => handleUpdateApplicantStatus('UNDER_REVIEW')}
                        className={`py-1.5 px-2 border rounded-xl text-[10px] cursor-pointer transition-all ${selectedApplicant.status === 'UNDER_REVIEW' || selectedApplicant.status === 'IN_REVIEW' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      >
                        Under Review
                      </button>
                      <button
                        onClick={() => handleUpdateApplicantStatus('SHORTLISTED_FOR_PRESENTATION')}
                        className={`py-1.5 px-2 border rounded-xl text-[10px] cursor-pointer transition-all ${selectedApplicant.status === 'SHORTLISTED_FOR_PRESENTATION' ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      >
                        Shortlisted
                      </button>
                      <button
                        onClick={() => handleUpdateApplicantStatus('ACCEPTED')}
                        className={`py-1.5 px-2 border rounded-xl text-[10px] cursor-pointer transition-all ${selectedApplicant.status === 'ACCEPTED' ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-black' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      >
                        Offer Seat
                      </button>
                      <button
                        onClick={() => handleUpdateApplicantStatus('REJECTED')}
                        className={`py-1.5 px-2 border rounded-xl text-[10px] cursor-pointer transition-all ${selectedApplicant.status === 'REJECTED' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      >
                        Not Selected
                      </button>
                    </div>

                    <div className="h-px bg-gray-50" />

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Orientation session</span>
                        <span className={`text-[11px] font-black uppercase ${selectedApplicant.orientation_conducted ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {selectedApplicant.orientation_conducted ? 'Conducted / Attended' : 'Pending / No attendance'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleOrientation}
                        className="bg-gray-50 hover:bg-gray-150 text-gray-800 text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-xl border border-gray-150 cursor-pointer transition-all"
                      >
                        Toggle Mark
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 py-20 text-center text-gray-400">
                  <Sliders className="h-10 w-10 text-gray-300 mb-2.5 animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-wider">No Startup Selected</p>
                  <p className="text-[11px] text-gray-400 max-w-xs mt-1">Select an application profile from the intake evaluation sheet to audit core answers, evaluation panel scoring, and admissions decisions.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------------------- */}
      {/* SUBTAB 3: INCUBATOR PROGRAM COHORT ACTIVE DASHBOARD */}
      {/* ----------------------------------------------------------------------------------- */}
      {(activeSubTab === 'active_cohort' || activeSubTab === 'cohort_sessions' || activeSubTab === 'cohort_assignments' || activeSubTab === 'cohort_attendance' || activeSubTab === 'cohort_warnings') && (
        <div className="space-y-6" id="subtab-active-incubator">
          
          {/* Cohort Selector and Graduation Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Active Incubation Cohorts</span>
                <div className="flex items-center gap-2.5">
                  <select
                    value={selectedCohort?.id || ''}
                    onChange={(e) => {
                      const found = cohorts.find(c => c.id === parseInt(e.target.value));
                      if (found) setSelectedCohort(found);
                    }}
                    className="bg-gray-50 border border-gray-150 text-xs text-gray-800 rounded-xl px-3 py-2 cursor-pointer focus:outline-none font-black"
                  >
                    {cohorts.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setShowCreateCohortForm(true)}
                    className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-xl border border-gray-150 transition-all cursor-pointer"
                    title="Initiate New Cohort"
                  >
                    <FolderPlus className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {selectedCohort && (
                <div className="sm:border-l sm:border-gray-100 sm:pl-4 space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Cohort Metadata</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border ${
                      selectedCohort.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      selectedCohort.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-gray-50 text-gray-700 border-gray-100'
                    }`}>
                      {selectedCohort.status}
                    </span>
                    <span className="text-xs font-black text-gray-600">
                      {confirmedCohortStartups.length} Verified Seats
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Graduation & Complete Cohort Actions */}
            {selectedCohort && selectedCohort.status === 'ACTIVE' && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleUpdateCohortStatus('COMPLETED', false)}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold py-2.5 px-4 rounded-xl border border-gray-150 transition-all cursor-pointer"
                >
                  Complete Program (Archive)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateCohortStatus('COMPLETED', true)}
                  className="bg-[#8B1A1A] hover:bg-[#5A0F0F] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
                  title="Graduate all founders that do not have unresolved Red or Yellow performance warnings"
                >
                  <Award className="h-4 w-4" />
                  Bulk Graduate Founders (Excl. Warnings)
                </button>
              </div>
            )}
          </div>

          {/* CREATE COHORT POPUP FORM */}
          {showCreateCohortForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Initiate Incubation Program</h3>
                  <button onClick={() => setShowCreateCohortForm(false)} className="text-gray-500">✕</button>
                </div>
                <form onSubmit={handleCreateCohort} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 block font-mono">Cohort Name</label>
                    <input
                      type="text"
                      required
                      value={newCohortName}
                      onChange={(e) => setNewCohortName(e.target.value)}
                      placeholder="e.g. Cohort 02 (Fall 2026)"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-[#5A0F0F] text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Launch Program
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Core Modules grid layout: workshops & attendance logs, weekly logs, warnings */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMN LEFT (8 spans): Workshop Schedules & Attendance */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Workshops calendar */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 text-primary" />
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Workshops & Guest sessions</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* List of sessions (7 spans) */}
                  <div className="md:col-span-7 space-y-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Scheduled lectures</span>
                    {sessions.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                        No workshop sessions have been scheduled.
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                        {sessions.map((sess) => (
                          <div
                            key={sess.id}
                            onClick={() => setSelectedSession(sess)}
                            className={`p-3.5 border rounded-xl transition-all cursor-pointer text-xs flex justify-between items-center gap-3 ${
                              selectedSession?.id === sess.id 
                                ? 'bg-rose-50/15 border-primary shadow-3xs' 
                                : 'bg-gray-50/40 border-gray-150 hover:bg-gray-50'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-gray-800">{sess.title}</h4>
                                {sess.topic_category && (
                                  <span className="bg-primary/5 text-primary text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-primary/5">
                                    {sess.topic_category}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 font-bold">
                                {sess.date} • {sess.start_time.substring(0, 5)} - {sess.end_time.substring(0, 5)} {sess.venue && `• ${sess.venue}`}
                              </p>
                              <div className="flex gap-2 flex-wrap items-center">
                                {sess.mentor_name && (
                                  <p className="text-[9px] text-primary font-black uppercase font-mono">Mentor: {sess.mentor_name}</p>
                                )}
                                {sess.recording_url && (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-black uppercase px-1 rounded">
                                    Recording Active
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(sess.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg"
                              title="Delete Session"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Session form (5 spans) */}
                  <div className="md:col-span-5 bg-gray-50/40 p-4 border border-gray-150 rounded-xl space-y-3.5 text-xs">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Session Scheduler</span>
                    
                    <form onSubmit={handleScheduleSession} className="space-y-3 font-black text-[10px] uppercase tracking-wider">
                      <div className="space-y-1">
                        <label className="text-gray-500">Lecture Title</label>
                        <input
                          type="text"
                          required
                          value={sessionTitle}
                          onChange={(e) => setSessionTitle(e.target.value)}
                          placeholder="e.g. Scaling Tech Infrastructure"
                          className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-500">Date</label>
                        <input
                          type="date"
                          required
                          value={sessionDate}
                          onChange={(e) => setSessionDate(e.target.value)}
                          className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-gray-500">Start Time</label>
                          <input
                            type="time"
                            required
                            value={sessionStartTime}
                            onChange={(e) => setSessionStartTime(e.target.value)}
                            className="w-full bg-white border border-gray-150 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-gray-500">End Time</label>
                          <input
                            type="time"
                            required
                            value={sessionEndTime}
                            onChange={(e) => setSessionEndTime(e.target.value)}
                            className="w-full bg-white border border-gray-150 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-500">Mentor / Expert Name</label>
                        <input
                          type="text"
                          value={sessionMentor}
                          onChange={(e) => setSessionMentor(e.target.value)}
                          placeholder="e.g. Dr. Qaseeb Niaz"
                          className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-gray-500">Category</label>
                          <select
                            value={sessionCategory}
                            onChange={(e) => setSessionCategory(e.target.value)}
                            className="w-full bg-white border border-gray-150 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none"
                          >
                            <option value="Masterclass">Masterclass</option>
                            <option value="Guest Lecture">Guest Lecture</option>
                            <option value="Technical Workshop">Technical Workshop</option>
                            <option value="Orientation">Orientation</option>
                            <option value="Fire-side Chat">Fire-side Chat</option>
                            <option value="Pitch Clinic">Pitch Clinic</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-gray-500">Venue</label>
                          <input
                            type="text"
                            value={sessionVenue}
                            onChange={(e) => setSessionVenue(e.target.value)}
                            placeholder="e.g. Auditorium 1"
                            className="w-full bg-white border border-gray-150 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-500">Recording / Resource URL (Optional)</label>
                        <input
                          type="url"
                          value={sessionRecordingUrl}
                          onChange={(e) => setSessionRecordingUrl(e.target.value)}
                          placeholder="e.g. https://loom.com/..."
                          className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-primary hover:bg-[#5A0F0F] text-white py-2.5 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer shadow-3xs"
                      >
                        Schedule Session
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Attendance Sheet */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4.5 w-4.5 text-primary" />
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Attendance Register</h3>
                  </div>
                  {selectedSession && (
                    <span className="text-[10px] font-mono font-black uppercase text-primary bg-rose-50 border border-rose-100 px-3 py-1 rounded-md">
                      Active: {selectedSession.title}
                    </span>
                  )}
                </div>

                {!selectedSession ? (
                  <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                    Please select or schedule a session above to mark attendance.
                  </div>
                ) : confirmedCohortStartups.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                    No confirmed seat-holders in this cohort to take attendance for.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                      {confirmedCohortStartups.map((startup) => {
                        const currentVal = attendanceSheet[startup.id] || 'PRESENT';
                        return (
                          <div key={startup.id} className="p-3 bg-gray-50/50 border border-gray-150 rounded-xl flex justify-between items-center gap-4 text-xs">
                            <div>
                              <h4 className="font-extrabold text-gray-800">{startup.startup_name}</h4>
                              <p className="text-[10px] text-gray-400 font-bold">{startup.name}</p>
                            </div>
                            <div className="flex items-center gap-1.5 font-black text-[9px] uppercase tracking-wider">
                              <button
                                type="button"
                                onClick={() => handleMarkAttendance(startup.id, 'PRESENT')}
                                className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border ${
                                  currentVal === 'PRESENT' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkAttendance(startup.id, 'ABSENT')}
                                className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border ${
                                  currentVal === 'ABSENT' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkAttendance(startup.id, 'EXCUSED')}
                                className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border ${
                                  currentVal === 'EXCUSED' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                Excused
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-50">
                      <button
                        type="button"
                        onClick={handleSaveAttendance}
                        className="bg-primary hover:bg-[#5A0F0F] text-white py-2.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-3xs"
                      >
                        Synchronize Attendance Log
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Weekly team check-ins logs */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-5">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Weekly Progress Sheets</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Log checkin Form (5 spans) */}
                  <div className="md:col-span-5 bg-gray-50/40 p-4 border border-gray-150 rounded-xl space-y-3.5 text-xs">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Progress Updater</span>
                    
                    {confirmedCohortStartups.length === 0 ? (
                      <p className="text-gray-400 text-[11px]">No confirmed startups available to check-in.</p>
                    ) : (
                      <form onSubmit={handleLogWeeklyCheckin} className="space-y-3 font-black text-[10px] uppercase tracking-wider">
                        <div className="space-y-1">
                          <label className="text-gray-500">Select Venture</label>
                          <select
                            required
                            value={checkinStartupId}
                            onChange={(e) => setCheckinStartupId(e.target.value)}
                            className="w-full bg-white border border-gray-150 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none"
                          >
                            <option value="">-- Choose Startup --</option>
                            {confirmedCohortStartups.map(s => (
                              <option key={s.id} value={s.id}>{s.startup_name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-gray-500">Weekly Blockers & Issues</label>
                          <textarea
                            required
                            rows={3}
                            value={checkinBlockers}
                            onChange={(e) => setCheckinBlockers(e.target.value)}
                            placeholder="e.g. Payment Gateway API delay or server crashes..."
                            className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none resize-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between font-bold font-mono">
                            <span className="text-gray-500">Weekly Progress Score</span>
                            <span className="text-primary">{checkinProgress}/10</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={checkinProgress}
                            onChange={(e) => setCheckinProgress(parseInt(e.target.value))}
                            className="w-full accent-primary h-1 bg-gray-150 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-gray-500">Mentor Feedback Notes</label>
                          <input
                            type="text"
                            value={checkinNotes}
                            onChange={(e) => setCheckinNotes(e.target.value)}
                            placeholder="Advice, targets for next week..."
                            className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-primary hover:bg-[#5A0F0F] text-white py-2.5 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer shadow-3xs"
                        >
                          Log Check-In
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Checkins log list (7 spans) */}
                  <div className="md:col-span-7 space-y-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Check-In Feed</span>
                    {checkins.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                        No check-ins logged for this cohort program.
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                        {checkins.map((chk) => {
                          const sName = applicants.find(a => a.id === chk.applicant_id)?.startup_name || 'Startup';
                          return (
                            <div key={chk.id} className="p-3.5 bg-gray-50/30 border border-gray-150 rounded-xl text-xs space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h4 className="font-extrabold text-gray-800">{sName}</h4>
                                  <p className="text-[9px] text-gray-400 font-bold uppercase font-mono">Logged by: {chk.logged_by}</p>
                                </div>
                                <span className="text-xs font-black font-mono text-[#8B1A1A] bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                                  Score: {chk.progress_score}/10
                                </span>
                              </div>
                              <div className="space-y-1 text-[11px] leading-relaxed">
                                <p className="font-semibold text-gray-600"><span className="text-gray-400 uppercase font-mono text-[9px] block">Blockers</span>"{chk.blockers}"</p>
                                {chk.mentor_notes && (
                                  <p className="font-bold text-primary italic"><span className="text-gray-400 uppercase font-mono text-[9px] block not-italic mt-1">Feedback</span>"{chk.mentor_notes}"</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMN RIGHT (4 spans): Risk Management & Warning System */}
            <div className="lg:col-span-4 space-y-6 text-left">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <AlertOctagon className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Performance Warning Board</h3>
                </div>

                {/* Form to issue a warning */}
                <div className="bg-gray-50/50 p-4 border border-gray-150 rounded-xl space-y-3.5 text-xs">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Issue Warning Notice</span>
                  
                  {confirmedCohortStartups.length === 0 ? (
                    <p className="text-gray-400 text-[11px]">No confirmed startups available.</p>
                  ) : (
                    <form onSubmit={handleIssueWarning} className="space-y-3 font-black text-[10px] uppercase tracking-wider">
                      <div className="space-y-1">
                        <label className="text-gray-500">Venture to Warn</label>
                        <select
                          required
                          value={warningStartupId}
                          onChange={(e) => setWarningStartupId(e.target.value)}
                          className="w-full bg-white border border-gray-150 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none"
                        >
                          <option value="">-- Choose Startup --</option>
                          {confirmedCohortStartups.map(s => (
                            <option key={s.id} value={s.id}>{s.startup_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-500">Severity Level</label>
                        <select
                          value={warningSeverity}
                          onChange={(e: any) => setWarningSeverity(e.target.value)}
                          className="w-full bg-white border border-gray-150 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="YELLOW">Yellow (Attendance / Slow progress)</option>
                          <option value="RED">Red (Severe negligence)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-500">Formal Reason</label>
                        <textarea
                          required
                          rows={3}
                          value={warningReason}
                          onChange={(e) => setWarningReason(e.target.value)}
                          placeholder="State attendance issues, missing workshops, or lack of weekly log responses..."
                          className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-primary hover:bg-[#5A0F0F] text-white py-2.5 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer shadow-3xs"
                      >
                        Issue Warning Letter
                      </button>
                    </form>
                  )}
                </div>

                {/* List of active warnings with resolve box */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Active Penalties & Warn logs</span>
                  {warnings.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-[11px]">
                      No performance warnings logged.
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
                      {warnings.map((warn) => {
                        const sName = applicants.find(a => a.id === warn.applicant_id)?.startup_name || 'Startup';
                        return (
                          <div
                            key={warn.id}
                            className={`p-3.5 border rounded-xl text-xs space-y-3.5 text-left ${
                              warn.status === 'ACTIVE' 
                                ? (warn.severity === 'RED' ? 'bg-red-50/20 border-red-200' : 'bg-amber-50/25 border-amber-200')
                                : 'bg-gray-50/30 border-gray-150 opacity-70'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h4 className="font-extrabold text-gray-800">{sName}</h4>
                                <p className="text-[9px] text-gray-400 font-bold font-mono">By: {warn.issued_by}</p>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                warn.status === 'ACTIVE'
                                  ? (warn.severity === 'RED' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500')
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              }`}>
                                {warn.status === 'ACTIVE' ? warn.severity : 'RESOLVED'}
                              </span>
                            </div>

                            <p className="text-gray-600 font-semibold leading-relaxed">"{warn.reason}"</p>

                            {/* Resolve Form inside Active warning card */}
                            {warn.status === 'ACTIVE' ? (
                              <div className="pt-2 border-t border-gray-100 space-y-2">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Resolve warning</span>
                                <input
                                  type="text"
                                  value={warningResolutionNotes}
                                  onChange={(e) => setWarningResolutionNotes(e.target.value)}
                                  placeholder="Type resolution / revocation reason..."
                                  className="w-full bg-white border border-gray-150 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleResolveWarning(warn.id)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg font-bold text-[9px] uppercase tracking-wider cursor-pointer"
                                >
                                  Resolve Case
                                </button>
                              </div>
                            ) : (
                              <div className="pt-2 border-t border-dashed border-gray-200 text-[11px] text-emerald-800 leading-normal font-semibold">
                                <span className="text-[9px] font-black uppercase text-gray-400 block font-mono">Resolution Notes</span>
                                "{warn.resolution_notes}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB: COHORT SETTINGS */}
      {activeSubTab === 'cohort_settings' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-6 text-left" id="cohort-settings-view">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Cohort Settings & Batch Configuration</h3>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">Manage batch name, intake year, start/end dates, capacity, and assigned program manager.</p>
            </div>
            {selectedCohort && (
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg border ${
                selectedCohort.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                selectedCohort.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                'bg-gray-50 text-gray-700 border-gray-100'
              }`}>
                Status: {selectedCohort.status}
              </span>
            )}
          </div>

          {selectedCohort ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-black uppercase tracking-wider">
              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">Cohort Name</label>
                <input
                  type="text"
                  value={selectedCohort.name}
                  onChange={(e) => setSelectedCohort({ ...selectedCohort, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">Intake Year</label>
                <input
                  type="text"
                  defaultValue="2026"
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">Start Date</label>
                <input
                  type="date"
                  defaultValue="2026-09-01"
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">End Date</label>
                <input
                  type="date"
                  defaultValue="2026-12-20"
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">Maximum Capacity (Seats)</label>
                <input
                  type="number"
                  defaultValue={20}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">Assigned Program Manager</label>
                <select className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none cursor-pointer">
                  <option value="1">Dr. Qaseeb Niaz (Director Incubation)</option>
                  <option value="2">Maheen Malik (Senior Manager)</option>
                  <option value="3">Hassan Raza (Operations Lead)</option>
                </select>
              </div>

              <div className="md:col-span-2 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => triggerSuccess('Cohort Settings Saved Successfully!')}
                  className="bg-primary hover:bg-[#5A0F0F] text-white py-2.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-3xs"
                >
                  Save Cohort Config
                </button>

                {selectedCohort.status === 'ACTIVE' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateCohortStatus('COMPLETED', false)}
                      className="bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold py-2.5 px-4 rounded-xl border border-gray-150 transition-all cursor-pointer"
                    >
                      Complete Program (Archive)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCohortStatus('COMPLETED', true)}
                      className="bg-[#8B1A1A] hover:bg-[#5A0F0F] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Award className="h-4 w-4" />
                      Bulk Graduate Founders (Excl. Warnings)
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
              No active cohort selected. Please pick a cohort from the top dropdown.
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: ACTIVE STARTUPS */}
      {activeSubTab === 'cohort_startups' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-6 text-left">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Active Cohort Startups ({confirmedCohortStartups.length})</h3>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">Explore active ventures, inspect pitch decks, review pivot history logs, and write mentor feedback.</p>
            </div>
          </div>

          {confirmedCohortStartups.length === 0 ? (
            <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl space-y-2">
              <Rocket className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-xs font-bold uppercase tracking-wider">No Confirmed Startups In Selected Cohort</p>
              <p className="text-[11px] text-gray-400">Select another active cohort or approve candidates from the Review Applications queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {confirmedCohortStartups.map((s) => (
                <div key={s.id} className="p-4 bg-gray-50/50 border border-gray-150 rounded-2xl space-y-3 hover:border-primary/40 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-sm">{s.startup_name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold">Founder: {s.name}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                      CONFIRMED SEAT
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-gray-500 font-medium">
                    <p><strong className="text-gray-700">Email:</strong> {s.email}</p>
                    <p><strong className="text-gray-700">UCP Status:</strong> {s.ucp_affiliation || 'External'}</p>
                    <p><strong className="text-gray-700">Tracking Code:</strong> <span className="font-mono text-primary font-bold">{s.tracking_token}</span></p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStartupForModal(s);
                      setStartupModalTab('overview');
                    }}
                    className="w-full bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold py-2 px-3 rounded-xl border border-gray-200 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    View Startup Profile & History ↗
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: ASSIGNMENTS */}
      {activeSubTab === 'cohort_assignments' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-6 text-left">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Assignments & Deliverables</h3>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">Post batch deliverables, pitch deck milestones, and monitor startup submissions.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-gray-50/50 p-4 border border-gray-150 rounded-xl space-y-3 font-bold text-xs">
              <span className="text-[9px] font-black uppercase text-gray-400 block font-mono tracking-widest">+ Post New Deliverable Assignment</span>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase block">Assignment Title</label>
                <input
                  type="text"
                  placeholder="e.g. Financial Model v1 & Unit Economics Sheet"
                  className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase block">Due Date</label>
                <input
                  type="date"
                  className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => triggerSuccess('Assignment Published to Cohort Portal.')}
                className="w-full bg-primary text-white py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider cursor-pointer shadow-3xs"
              >
                Publish Assignment
              </button>
            </div>

            <div className="lg:col-span-7 space-y-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Active Cohort Assignments</span>
              <div className="p-4 bg-gray-50/40 border border-gray-150 rounded-xl text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-gray-800">1. Elevator Pitch & Deck PDF</h4>
                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">Due: Sep 15, 2026</span>
                </div>
                <p className="text-[11px] text-gray-500">Submit 10-slide investor pitch deck with problem statement, market sizing, and TAM breakdown.</p>
                <p className="text-[10px] font-bold text-emerald-700">Submissions: {confirmedCohortStartups.length} / {confirmedCohortStartups.length} Founders</p>
              </div>

              <div className="p-4 bg-gray-50/40 border border-gray-150 rounded-xl text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-gray-800">2. Customer Validation Survey & Interviews</h4>
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">Due: Oct 02, 2026</span>
                </div>
                <p className="text-[11px] text-gray-500">Provide record of at least 25 structured customer interviews and survey feedback analysis.</p>
                <p className="text-[10px] font-bold text-primary">Submissions: 3 / {confirmedCohortStartups.length} Founders</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: MENTORSHIP */}
      {activeSubTab === 'cohort_mentorship' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-6 text-left">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Mentorship & Advisory Directory</h3>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">Assigned industry experts, office hours schedule, and startup feedback logs.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-xl space-y-2">
              <span className="text-[8px] font-black uppercase text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">FinTech / Banking</span>
              <h4 className="font-extrabold text-gray-900 text-sm">Mr. Zarrar Khan</h4>
              <p className="text-[11px] text-gray-500">Ex-VP Product at JazzCash. Available for payment gateway integration and financial modeling.</p>
              <p className="text-[10px] font-bold text-emerald-600">Office Hours: Every Tuesday 2:00 PM - 5:00 PM</p>
            </div>

            <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-xl space-y-2">
              <span className="text-[8px] font-black uppercase text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">AI & Cloud Architecture</span>
              <h4 className="font-extrabold text-gray-900 text-sm">Dr. Usman Tariq</h4>
              <p className="text-[11px] text-gray-500">Associate Professor & Cloud AI Consultant. Advises on LLM pipeline & infrastructure scale.</p>
              <p className="text-[10px] font-bold text-emerald-600">Office Hours: Every Thursday 10:00 AM - 1:00 PM</p>
            </div>

            <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-xl space-y-2">
              <span className="text-[8px] font-black uppercase text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">Legal & Incorporation</span>
              <h4 className="font-extrabold text-gray-900 text-sm">Adv. Syeda Ayesha</h4>
              <p className="text-[11px] text-gray-500">Corporate Attorney specializing in SECP registration, founder vesting agreements, and IP.</p>
              <p className="text-[10px] font-bold text-emerald-600">Office Hours: Every Friday 3:00 PM - 6:00 PM</p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: INVESTMENT READINESS */}
      {activeSubTab === 'cohort_investment' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-6 text-left">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Performance: Investment Readiness</h3>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">Audit cap table structures, pitch deck readiness ratings, and investor circle eligibility.</p>
            </div>
          </div>

          <div className="space-y-3">
            {confirmedCohortStartups.length === 0 ? (
              <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                No active startups in selected cohort.
              </div>
            ) : (
              confirmedCohortStartups.map((st) => (
                <div key={st.id} className="p-4 bg-gray-50/40 border border-gray-150 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-bold">
                  <div>
                    <h4 className="font-extrabold text-gray-800 text-sm">{st.startup_name}</h4>
                    <p className="text-[10px] text-gray-400">Founder: {st.name} • Token: {st.tracking_token}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-mono block">Pitch Score</span>
                      <span className="text-primary font-mono text-sm font-black">88 / 100</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-mono block">Stage</span>
                      <span className="text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px]">Pre-Seed</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-mono block">Investor Circle</span>
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded text-[10px] font-black uppercase">
                        READY
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* STARTUP PROFILE MODAL WITH PIVOT HISTORY AND NOTES TABS */}
      {selectedStartupForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-gray-100 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-black text-sm">
                  <Rocket className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">{selectedStartupForModal.startup_name}</h3>
                  <p className="text-[11px] text-gray-400 font-bold">Founder: {selectedStartupForModal.name} • {selectedStartupForModal.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStartupForModal(null)} 
                className="p-1.5 text-gray-400 hover:text-gray-800 rounded-lg bg-gray-50 border border-gray-150 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2 text-xs font-black uppercase tracking-wider">
              <button
                onClick={() => setStartupModalTab('overview')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${startupModalTab === 'overview' ? 'bg-primary text-white shadow-3xs' : 'text-gray-500 hover:text-gray-900 bg-gray-50'}`}
              >
                Overview & Profile
              </button>
              <button
                onClick={() => setStartupModalTab('pivots')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${startupModalTab === 'pivots' ? 'bg-primary text-white shadow-3xs' : 'text-gray-500 hover:text-gray-900 bg-gray-50'}`}
              >
                Pivot History ({startupPivots.length})
              </button>
              <button
                onClick={() => setStartupModalTab('notes')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${startupModalTab === 'notes' ? 'bg-primary text-white shadow-3xs' : 'text-gray-500 hover:text-gray-900 bg-gray-50'}`}
              >
                Mentor Notes & Logs ({startupNotes.length})
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {startupModalTab === 'overview' && (
              <div className="space-y-4 text-xs font-semibold text-gray-700">
                <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-150">
                  <div>
                    <span className="text-[9px] font-black uppercase text-gray-400 block font-mono">CNIC Number</span>
                    <p className="font-bold text-gray-800 mt-0.5">{selectedStartupForModal.cnic || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-gray-400 block font-mono">Mobile Contact</span>
                    <p className="font-bold text-gray-800 mt-0.5">{selectedStartupForModal.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-gray-400 block font-mono">UCP Affiliation</span>
                    <p className="font-bold text-gray-800 mt-0.5">{selectedStartupForModal.ucp_affiliation || 'External Founder'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-gray-400 block font-mono">Tracking Token</span>
                    <p className="font-mono font-bold text-primary mt-0.5">{selectedStartupForModal.tracking_token}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-gray-400 block font-mono">Pitch Deck / Product Deck</span>
                  {selectedStartupForModal.pitch_deck_url ? (
                    <a href={selectedStartupForModal.pitch_deck_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs">
                      📁 Open Uploaded Pitch Presentation PDF ↗
                    </a>
                  ) : (
                    <p className="text-gray-400 italic">No pitch deck link uploaded</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PIVOT HISTORY */}
            {startupModalTab === 'pivots' && (
              <div className="space-y-4">
                <form onSubmit={handleAddPivot} className="bg-gray-50/60 p-3.5 border border-gray-150 rounded-xl space-y-2.5 text-xs font-bold">
                  <span className="text-[9px] font-black uppercase text-gray-400 block font-mono tracking-widest">+ Log Business Model / Tech Pivot</span>
                  <input
                    type="text"
                    required
                    value={newPivotTitle}
                    onChange={(e) => setNewPivotTitle(e.target.value)}
                    placeholder="e.g. Pivot to B2B SaaS API Integration"
                    className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                  <textarea
                    rows={2}
                    value={newPivotDesc}
                    onChange={(e) => setNewPivotDesc(e.target.value)}
                    placeholder="Describe market or product shift rationale..."
                    className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs focus:outline-none resize-none"
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-[#5A0F0F] text-white py-2 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer shadow-3xs"
                  >
                    Save Pivot Record
                  </button>
                </form>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {startupPivots.map((p) => (
                    <div key={p.id} className="p-3 bg-gray-50/40 border border-gray-150 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-extrabold text-gray-800">{p.title}</h4>
                        <span className="text-[9px] font-mono text-gray-400">{p.date}</span>
                      </div>
                      <p className="text-gray-600 leading-relaxed text-[11px]">{p.description}</p>
                      <span className="inline-block bg-primary/5 text-primary text-[8px] font-black uppercase px-2 py-0.5 rounded border border-primary/10 mt-1">
                        {p.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: MENTOR NOTES & ACTIVITY LOG */}
            {startupModalTab === 'notes' && (
              <div className="space-y-4">
                <form onSubmit={handleAddNote} className="bg-gray-50/60 p-3.5 border border-gray-150 rounded-xl space-y-2.5 text-xs font-bold">
                  <span className="text-[9px] font-black uppercase text-gray-400 block font-mono tracking-widest">+ Add Internal Staff / Mentor Note</span>
                  <textarea
                    required
                    rows={2}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Type progress update, meeting summary, or advisory feedback..."
                    className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs focus:outline-none resize-none"
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-[#5A0F0F] text-white py-2 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer shadow-3xs"
                  >
                    Post Internal Note
                  </button>
                </form>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {startupNotes.map((n) => (
                    <div key={n.id} className="p-3 bg-gray-50/40 border border-gray-150 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-gray-800 text-[11px]">{n.author}</span>
                        <span className="text-[9px] font-mono text-gray-400">{n.date}</span>
                      </div>
                      <p className="text-gray-600 italic text-[11px] leading-relaxed">"{n.content}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
