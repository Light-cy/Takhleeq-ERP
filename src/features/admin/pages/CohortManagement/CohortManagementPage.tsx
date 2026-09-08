import React, { useState, useEffect, useRef } from 'react';
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
  Rocket,
  Upload,
  Download,
  ExternalLink,
  FileCheck,
  ArrowLeft,
  CheckSquare,
  User,
  Paperclip,
  Link as LinkIcon,
  Lock,
  AlertTriangle,
  Save,
  Loader2
} from 'lucide-react';
import { downloadFileLocally, getCleanFileName, parseAssignmentAttachments, formatFileSize, AssignmentAttachment } from '../../../../utils/fileDownload';
import { CohortFeedbackTab } from '../../components/CohortFeedbackTab';
import { FeedbackFormsTab } from '../../components/FeedbackFormsTab';
import { FormField, Cohort, Applicant, ApplicantStatus, CohortSession, TeamCheckIn, PerformanceWarning, CohortAssignment, MilestoneSubmission, AuditRecord } from '../../../../types';
import { 
  COHORT_STAGES, 
  getStageByStatus, 
  getStageIndexByStatus, 
  normalizeApplicantStatus 
} from '../../../../constants/cohortStages';
import { CohortDashboardView } from './CohortDashboardView';
import { StartupDirectoryTab } from '../../../startups/components/StartupDirectoryTab';
import { ApplicationDetailsPage } from './ApplicationDetailsPage';
import { SessionDetailModal } from '../../components/SessionDetailModal';
import { CheckinDetailPage } from '../../../checkins/pages/CheckinDetailPage';
import { BulkGraduateConfirmationModal } from '../../components/BulkGraduateConfirmationModal';

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const PROGRAM_MANAGERS = [
  { id: '1', name: 'Dr. Qaseeb Niaz (Director Incubation)' },
  { id: '2', name: 'Maheen Malik (Senior Manager)' },
  { id: '3', name: 'Hassan Raza (Operations Lead)' }
];

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
  auditLogs = [],
  currentPath,
  onNavigate
}) => {
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
  // Global View Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<string>(() => {
    if (activeTab) return activeTab;
    if (mode === 'active_cohort') return 'cohort_dashboard';
    return 'cohort_applications';
  });

  const prevActiveTabRef = useRef(activeTab);
  useEffect(() => {
    if (activeTab) {
      const isChanged = prevActiveTabRef.current !== activeTab;
      prevActiveTabRef.current = activeTab;
      setActiveSubTab(activeTab);
      // Clear sub-page overlays/detail views so user immediately sees the clicked section
      // Only clear if activeTab actually changed and we are NOT on an application details view
      if (isChanged && !currentPath?.startsWith('/admissions/applications/')) {
        setSelectedApplicant(null);
        setSelectedStartupForModal(null);
        setSelectedSession(null);
        setSessionDetailModalSession(null);
      }
    }
  }, [activeTab, currentPath]);

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
  const [assignments, setAssignments] = useState<CohortAssignment[]>([]);
  const [milestoneSubmissions, setMilestoneSubmissions] = useState<MilestoneSubmission[]>([]);

  // Selected Entities
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [applicantParent, setApplicantParent] = useState<Applicant | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [selectedSession, setSelectedSession] = useState<CohortSession | null>(null);
  const [sessionDetailModalSession, setSessionDetailModalSession] = useState<CohortSession | null>(null);
  const [showScheduleSessionModal, setShowScheduleSessionModal] = useState(false);
  const [fetchedRouteSession, setFetchedRouteSession] = useState<any | null>(null);
  const [loadingRouteSession, setLoadingRouteSession] = useState(false);

  // Extract Session Route parameter if on /admin/sessions/:id
  const sessionRouteMatch = currentPath ? currentPath.match(/^\/admin\/sessions\/(\d+)/) : null;
  const routeSessionId = sessionRouteMatch ? parseInt(sessionRouteMatch[1], 10) : null;

  useEffect(() => {
    if (routeSessionId) {
      const existing = sessions.find(s => s.id === routeSessionId);
      if (existing) {
        setFetchedRouteSession(existing);
      } else {
        setLoadingRouteSession(true);
        fetchWithAuth(`/api/sessions/${routeSessionId}/attendance`)
          .then(async res => {
            if (!res.ok) return null;
            const text不易 = await res.text().catch(() => '');
            try { return JSON.parse(text不易); } catch { return null; }
          })
          .then(data => {
            if (data && data.session) {
              setFetchedRouteSession(data.session);
            }
          })
          .catch(err => console.error(err))
          .finally(() => setLoadingRouteSession(false));
      }
    } else {
      setFetchedRouteSession(null);
    }
  }, [routeSessionId, sessions]);

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

  // Cohort Settings State
  const [savingCohortSettings, setSavingCohortSettings] = useState(false);
  const [cohortSettingsForm, setCohortSettingsForm] = useState<{
    name: string;
    intake_year: string;
    start_date: string;
    end_date: string;
    max_capacity: number;
    assigned_manager_id: string;
    assigned_manager_name: string;
    description: string;
  }>({
    name: '',
    intake_year: '2026',
    start_date: '2026-09-01',
    end_date: '2026-12-20',
    max_capacity: 20,
    assigned_manager_id: '1',
    assigned_manager_name: 'Dr. Qaseeb Niaz (Director Incubation)',
    description: ''
  });

  // Sync cohortSettingsForm whenever selectedCohort changes
  useEffect(() => {
    if (selectedCohort) {
      setCohortSettingsForm({
        name: selectedCohort.name || '',
        intake_year: selectedCohort.intake_year || '2026',
        start_date: selectedCohort.start_date || '2026-09-01',
        end_date: selectedCohort.end_date || '2026-12-20',
        max_capacity: typeof selectedCohort.max_capacity === 'number' ? selectedCohort.max_capacity : 20,
        assigned_manager_id: selectedCohort.assigned_manager_id || '1',
        assigned_manager_name: selectedCohort.assigned_manager_name || 'Dr. Qaseeb Niaz (Director Incubation)',
        description: selectedCohort.description || ''
      });
    }
  }, [
    selectedCohort?.id,
    selectedCohort?.name,
    selectedCohort?.intake_year,
    selectedCohort?.start_date,
    selectedCohort?.end_date,
    selectedCohort?.max_capacity,
    selectedCohort?.assigned_manager_id,
    selectedCohort?.assigned_manager_name,
    selectedCohort?.description
  ]);
  
  // Form Builder Temp fields
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'email' | 'number' | 'phone' | 'cnic' | 'file'>('text');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [isTogglingForm, setIsTogglingForm] = useState(false);

  // Scheduling Temp Form
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState('');
  const [sessionEndTime, setSessionEndTime] = useState('');
  const [sessionMentor, setSessionMentor] = useState('');
  const [sessionCategory, setSessionCategory] = useState('Masterclass');
  const [sessionVenue, setSessionVenue] = useState('Auditorium 1');
  const [sessionRecordingUrl, setSessionRecordingUrl] = useState('');
  const [isDesignThinkingBootcamp, setIsDesignThinkingBootcamp] = useState(false);

  // Weekly Check-in Temp Form
  const [checkinStartupId, setCheckinStartupId] = useState<string>('');
  const [checkinBlockers, setCheckinBlockers] = useState('');
  const [checkinProgress, setCheckinProgress] = useState<number>(5);
  const [checkinNotes, setCheckinNotes] = useState('');

  // Performance Warning Temp Form
  const [warningStartupId, setWarningStartupId] = useState<string>('');
  const [warningSeverity, setWarningSeverity] = useState<'YELLOW' | 'RED'>('YELLOW');
  const [warningReason, setWarningReason] = useState('');
  const [warningResolutionNotes, setWarningResolutionNotes] = useState<Record<number, string>>({});

  // Active Attendance Marking Sheet
  const [attendanceSheet, setAttendanceSheet] = useState<Record<number, 'PRESENT' | 'ABSENT' | 'EXCUSED'>>({});

  // Independent Cohort Assignments State
  const [cohortAssignments, setCohortAssignments] = useState<any[]>([]);
  const [loadingCohortAssignments, setLoadingCohortAssignments] = useState(false);
  const [asgFilter, setAsgFilter] = useState<'ALL' | 'INDEPENDENT' | 'SESSION'>('ALL');
  const [newAsgTitle, setNewAsgTitle] = useState('');
  const [newAsgDesc, setNewAsgDesc] = useState('');
  const [newAsgDueDate, setNewAsgDueDate] = useState('');
  const [newAsgFiles, setNewAsgFiles] = useState<File[]>([]);
  const [newAsgFileUrls, setNewAsgFileUrls] = useState<string[]>([]);
  const [newAsgUrlInput, setNewAsgUrlInput] = useState('');
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [uploadingAsgFile, setUploadingAsgFile] = useState(false);
  const [publishingAsg, setPublishingAsg] = useState(false);
  const [selectedAsgForSubmissions, setSelectedAsgForSubmissions] = useState<any | null>(null);
  const [asgSubmissions, setAsgSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [deletingAsgId, setDeletingAsgId] = useState<number | null>(null);

  // Extend / Edit Assignment State
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);

  // Search/Filters in Intake Sheet
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Triggering new cohort form
  const [showCreateCohortForm, setShowCreateCohortForm] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortStatus, setNewCohortStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');

  // Helper to safely parse json responses
  const safeParseResponse = async <T,>(res: Response, fallback: T): Promise<T> => {
    try {
      if (!res.ok) return fallback;
      const text = await res.text().catch(() => '');
      if (!text) return fallback;
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  };

  // Fetch all database tables
  const loadCohortModuleData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Form settings
      const settingsRes = await fetchWithAuth('/api/cohort-form-settings');
      const settingsData = await safeParseResponse(settingsRes, { is_active: true, fields: [] });
      setFormSettings(settingsData || { is_active: true, fields: [] });

      // 2. Fetch Applicants
      const applicantsRes = await fetchWithAuth('/api/applicants');
      const applicantsData = await safeParseResponse(applicantsRes, []);
      setApplicants(Array.isArray(applicantsData) ? applicantsData : []);

      // 3. Fetch Cohorts
      const cohortsRes = await fetchWithAuth('/api/cohorts');
      const cohortsData = await safeParseResponse(cohortsRes, []);
      setCohorts(cohortsData);

      if (Array.isArray(cohortsData) && cohortsData.length > 0) {
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
      .then(res => safeParseResponse(res, []))
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
      .then(res => safeParseResponse(res, []))
      .then(data => Array.isArray(data) && setCheckins(data))
      .catch(() => setCheckins([]));

    // Fetch warnings
    fetchWithAuth(`/api/cohorts/${cohortId}/warnings`)
      .then(res => safeParseResponse(res, []))
      .then(data => Array.isArray(data) && setWarnings(data))
      .catch(() => setWarnings([]));

    // Fetch cohort assignments
    fetchCohortAssignments(cohortId);

    // Refresh applicants whenever switching tabs or changing selected cohort
    fetchWithAuth('/api/applicants')
      .then(res => safeParseResponse(res, []))
      .then(data => Array.isArray(data) && setApplicants(data))
      .catch(() => {});

  }, [selectedCohort?.id, activeSubTab]);

  const fetchCohortAssignments = async (cohortIdOverride?: number, silent = false) => {
    const cId = cohortIdOverride || selectedCohort?.id;
    if (!silent) {
      setLoadingCohortAssignments(true);
    }
    try {
      const endpoint = cId ? `/api/cohorts/${cId}/assignments` : '/api/assignments';
      const res = await fetchWithAuth(endpoint);
      if (res.ok) {
        const data = await res.json();
        const list = data.assignments || [];
        setCohortAssignments(list);
        setAssignments(list);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      if (!silent) {
        setLoadingCohortAssignments(false);
      }
    }
  };

  // Multi-file attachment handlers
  const handleAddAsgFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    setNewAsgFiles(prev => {
      // Avoid duplicate files with same name and size
      const existingSignatures = new Set(prev.map(f => `${f.name}_${f.size}`));
      const uniqueNew = incoming.filter(f => !existingSignatures.has(`${f.name}_${f.size}`));
      return [...prev, ...uniqueNew];
    });
  };

  const handleRemoveAsgFile = (index: number) => {
    setNewAsgFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddExternalUrl = () => {
    const trimmed = newAsgUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      triggerError('Please enter a valid URL starting with https:// or http://');
      return;
    }
    if (!newAsgFileUrls.includes(trimmed)) {
      setNewAsgFileUrls(prev => [...prev, trimmed]);
      setNewAsgUrlInput('');
    }
  };

  const handleRemoveExternalUrl = (index: number) => {
    setNewAsgFileUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Create Independent Cohort Assignment
  const handleCreateIndependentAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsgTitle.trim() || !newAsgDueDate) {
      triggerError('Please provide an assignment title and due date.');
      return;
    }
    const todayStr = getTodayDateString();
    if (newAsgDueDate < todayStr) {
      triggerError('Submission due date cannot be in the past. Please select today or a future date.');
      return;
    }
    setPublishingAsg(true);
    try {
      const attachmentsList: AssignmentAttachment[] = [];

      // 1. Upload any selected files
      if (newAsgFiles.length > 0) {
        setUploadingAsgFile(true);
        for (let i = 0; i < newAsgFiles.length; i++) {
          const file = newAsgFiles[i];
          setUploadProgressText(`Uploading (${i + 1}/${newAsgFiles.length}): ${file.name}...`);
          
          const reader = new FileReader();
          const fileData = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          });

          const uploadRes = await fetchWithAuth('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, fileData })
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || `Reference file upload failed for ${file.name}`);
          
          attachmentsList.push({
            name: file.name,
            url: uploadData.url,
            size: file.size
          });
        }
        setUploadingAsgFile(false);
      }

      // 2. Add external URLs
      newAsgFileUrls.forEach(url => {
        if (url.trim()) {
          attachmentsList.push({
            name: getCleanFileName(url.trim()),
            url: url.trim()
          });
        }
      });

      // 3. Add single url input if user typed but forgot to click Add
      if (newAsgUrlInput.trim() && !newAsgFileUrls.includes(newAsgUrlInput.trim())) {
        attachmentsList.push({
          name: getCleanFileName(newAsgUrlInput.trim()),
          url: newAsgUrlInput.trim()
        });
      }

      const finalAttachmentUrl = attachmentsList.length > 0 ? JSON.stringify(attachmentsList) : null;

      const targetCohortId = selectedCohort?.id || 1;
      const res = await fetchWithAuth(`/api/cohorts/${targetCohortId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAsgTitle.trim(),
          description: newAsgDesc.trim(),
          due_date: newAsgDueDate,
          attachment_url: finalAttachmentUrl,
          cohort_id: targetCohortId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish independent assignment.');

      const attachedCountMsg = attachmentsList.length > 0 ? ` with ${attachmentsList.length} attachment(s)` : '';
      triggerSuccess(`Independent assignment "${newAsgTitle}"${attachedCountMsg} published for all cohort startups!`);
      if (data.assignment) {
        setCohortAssignments(prev => [data.assignment, ...prev.filter(a => a.id !== data.assignment.id)]);
        setAssignments(prev => [data.assignment, ...prev.filter(a => a.id !== data.assignment.id)]);
      }
      setNewAsgTitle('');
      setNewAsgDesc('');
      setNewAsgDueDate('');
      setNewAsgFiles([]);
      setNewAsgFileUrls([]);
      setNewAsgUrlInput('');
      setUploadProgressText('');
      await fetchCohortAssignments(targetCohortId, true);
    } catch (err: any) {
      triggerError(err.message || 'Failed to publish assignment.');
    } finally {
      setPublishingAsg(false);
      setUploadingAsgFile(false);
      setUploadProgressText('');
    }
  };

  // View startup submissions for a specific assignment
  const handleToggleSubmissions = async (asg: any) => {
    if (selectedAsgForSubmissions?.id === asg.id) {
      setSelectedAsgForSubmissions(null);
      return;
    }
    setSelectedAsgForSubmissions(asg);
    setLoadingSubmissions(true);
    try {
      const res = await fetchWithAuth(`/api/assignments/${asg.id}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setAsgSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Delete assignment
  const handleDeleteAssignment = async (asgId: number) => {
    try {
      setDeletingAsgId(null);
      setCohortAssignments(prev => prev.filter(a => a.id !== asgId));
      setAssignments(prev => prev.filter(a => a.id !== asgId));
      if (selectedAsgForSubmissions?.id === asgId) setSelectedAsgForSubmissions(null);

      const res = await fetchWithAuth(`/api/assignments/${asgId}`, { method: 'DELETE' });
      if (res.ok) {
        triggerSuccess('Assignment deleted successfully.');
        await fetchCohortAssignments(selectedCohort?.id, true);
      } else {
        triggerError('Failed to delete assignment.');
        await fetchCohortAssignments(selectedCohort?.id, true);
      }
    } catch (err) {
      triggerError('Failed to delete assignment.');
      await fetchCohortAssignments(selectedCohort?.id, true);
    }
  };

  const handleSaveAssignmentUpdate = async () => {
    if (!editingAssignment || !editingAssignment.due_date) {
      triggerError('Due date is required.');
      return;
    }
    const todayStr = getTodayDateString();
    if (editingAssignment.due_date < todayStr) {
      triggerError('Due date cannot be in the past. Please select today or a future date.');
      return;
    }
    setIsUpdatingAssignment(true);
    try {
      const res = await fetchWithAuth(`/api/assignments/${editingAssignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingAssignment.title,
          description: editingAssignment.description,
          due_date: editingAssignment.due_date
        })
      });
      if (res.ok) {
        triggerSuccess('Assignment due date updated / extended successfully!');
        setCohortAssignments(prev => prev.map(a => a.id === editingAssignment.id ? { ...a, ...editingAssignment } : a));
        setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? { ...a, ...editingAssignment } : a));
        setEditingAssignment(null);
      } else {
        const err = await res.json();
        triggerError(err.error || 'Failed to update assignment.');
      }
    } catch (err) {
      triggerError('Error updating assignment due date.');
    } finally {
      setIsUpdatingAssignment(false);
    }
  };

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
    if (isTogglingForm) return;
    const nextActive = !formSettings.is_active;
    setIsTogglingForm(true);
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
    } finally {
      setIsTogglingForm(false);
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
  useEffect(() => {
    if (currentPath && currentPath.startsWith('/admissions/applications/')) {
      const parts = currentPath.split('/');
      const idStr = parts[parts.length - 1];
      const appId = parseInt(idStr);
      if (!isNaN(appId)) {
        setActiveSubTab('cohort_applications');
        if (!selectedApplicant || selectedApplicant.id !== appId) {
          fetchWithAuth(`/api/applicants/${appId}`)
            .then(res => res.json())
            .then(data => {
              if (data && data.id) {
                setSelectedApplicant(data);
                if (data.parent) setApplicantParent(data.parent);
              }
            })
            .catch(err => console.error(err));
        }
      }
    }
  }, [currentPath, selectedApplicant?.id]);

  const handleSelectApplicant = async (app: Applicant) => {
    setSelectedApplicant(app);
    setApplicantParent((app as any).parent || null);

    if (onNavigate) {
      onNavigate(`/admissions/applications/${app.id}`);
    } else if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', `/admissions/applications/${app.id}`);
    }

    if (app.parent_applicant_id && !(app as any).parent) {
      try {
        const res = await fetchWithAuth(`/api/applicants/${app.id}`);
        const data = await res.json();
        if (data && data.parent) {
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
  const uncompletedCohort = cohorts.find(c => c.status !== 'COMPLETED');
  const [cohortToGraduate, setCohortToGraduate] = useState<Cohort | null>(null);
  const [isGraduatingCohort, setIsGraduatingCohort] = useState(false);

  const handleOpenCreateCohortModal = () => {
    setShowCreateCohortForm(true);
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;

    if (uncompletedCohort) {
      triggerError(`Cannot create a new cohort. Previous cohort '${uncompletedCohort.name}' is still '${uncompletedCohort.status}'. Please bulk graduate (complete) the previous cohort first.`);
      return;
    }

    try {
      const res = await fetchWithAuth('/api/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCohortName.trim(), status: newCohortStatus || 'ACTIVE' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate cohort.');

      const newCohortObj = data.cohort;
      setCohorts(prev => [...prev.filter(c => c.id !== newCohortObj.id), newCohortObj]);
      setSelectedCohort(newCohortObj);
      if (setSelectedCohortId) {
        setSelectedCohortId(newCohortObj.id);
      }
      setSessions([]);
      setCheckins([]);
      setWarnings([]);
      setCohortAssignments([]);
      setAssignments([]);
      setSelectedSession(null);
      setNewCohortName('');
      setShowCreateCohortForm(false);
      triggerSuccess(`Cohort Incubator Program '${newCohortObj.name}' created successfully.`);

      if (onRefresh) {
        try {
          await onRefresh();
        } catch (e) {
          console.error('Error refreshing parent context:', e);
        }
      }
    } catch (err: any) {
      triggerError(err.message || 'Failed to create cohort.');
    }
  };

  const handleUpdateCohortStatus = async (
    newStatus: 'DRAFT' | 'ACTIVE' | 'COMPLETED',
    bulkGraduate: boolean = false,
    cohortIdOverride?: number
  ) => {
    const targetCohort = cohortIdOverride ? cohorts.find(c => c.id === cohortIdOverride) : selectedCohort;
    if (!targetCohort) return;
    try {
      const res = await fetchWithAuth(`/api/cohorts/${targetCohort.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, auto_graduate_founders: bulkGraduate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change cohort state.');

      setCohorts(prev => prev.map(c => c.id === targetCohort.id ? { ...c, status: newStatus } : c));
      if (selectedCohort?.id === targetCohort.id) {
        setSelectedCohort(prev => prev ? { ...prev, status: newStatus } : null);
      }
      triggerSuccess(`Cohort status updated to '${newStatus}'. Graduated seats count: ${data.bulkGraduatedCount || 0}`);
      
      // Reload applicants to see graduation/status changes
      const applicantsRes = await fetchWithAuth('/api/applicants');
      const applicantsData = await applicantsRes.json();
      setApplicants(Array.isArray(applicantsData) ? applicantsData : []);

      if (onRefresh) {
        try {
          await onRefresh();
        } catch (e) {
          console.error('Error refreshing parent context:', e);
        }
      }
    } catch (err: any) {
      triggerError(err.message || 'Failed to update cohort status.');
    }
  };

  const handleConfirmBulkGraduateInPage = async () => {
    if (!cohortToGraduate) return;
    setIsGraduatingCohort(true);
    try {
      await handleUpdateCohortStatus('COMPLETED', true, cohortToGraduate.id);
      setCohortToGraduate(null);
    } finally {
      setIsGraduatingCohort(false);
    }
  };

  const handleSaveCohortSettings = async () => {
    if (!selectedCohort) return;
    if (!cohortSettingsForm.name.trim()) {
      triggerError('Cohort name cannot be empty.');
      return;
    }

    setSavingCohortSettings(true);
    try {
      const res = await fetchWithAuth(`/api/cohorts/${selectedCohort.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cohortSettingsForm.name.trim(),
          intake_year: cohortSettingsForm.intake_year.trim(),
          start_date: cohortSettingsForm.start_date,
          end_date: cohortSettingsForm.end_date,
          max_capacity: Number(cohortSettingsForm.max_capacity) || 20,
          assigned_manager_id: cohortSettingsForm.assigned_manager_id,
          assigned_manager_name: cohortSettingsForm.assigned_manager_name,
          description: cohortSettingsForm.description.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update cohort settings.');
      }

      const updatedCohort: Cohort = data.cohort;

      // Update selectedCohort and cohorts array in local state
      setSelectedCohort(updatedCohort);
      setCohorts(prev => prev.map(c => c.id === updatedCohort.id ? updatedCohort : c));

      // Refresh parent context so header and sidebar dropdowns immediately reflect the new name and settings
      if (onRefresh) {
        try {
          await onRefresh();
        } catch (e) {
          console.error('Error refreshing parent context:', e);
        }
      }

      triggerSuccess(`Cohort settings for '${updatedCohort.name}' saved and applied successfully!`);
    } catch (err: any) {
      console.error('Failed to save cohort settings:', err);
      triggerError(err.message || 'Failed to save cohort settings.');
    } finally {
      setSavingCohortSettings(false);
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
          recording_url: sessionRecordingUrl,
          is_design_thinking_bootcamp: isDesignThinkingBootcamp
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
      setIsDesignThinkingBootcamp(false);
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

    // Date Lock Verification
    const todayStr = getTodayDateString();
    const sessionDateStr = selectedSession.date ? String(selectedSession.date).slice(0, 10) : todayStr;
    if (sessionDateStr > todayStr) {
      triggerError(`Attendance is locked until the scheduled session date (${sessionDateStr}).`);
      return;
    }
    
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record attendance logs.');
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
    const notes = (warningResolutionNotes[warningId] || '').trim();
    if (!notes) {
      triggerError('You must write resolution or revocation notes first.');
      return;
    }
    try {
      const res = await fetchWithAuth(`/api/warnings/${warningId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          resolution_notes: notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve warning.');

      setWarnings(prev => prev.map(w => w.id === warningId ? (data.warning || { ...w, status: 'RESOLVED', resolution_notes: notes }) : w));
      setWarningResolutionNotes(prev => ({ ...prev, [warningId]: '' }));
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

  // Computed arrays for selected cohort (excluding paused / kicked out startups)
  const safeApplicantsList = Array.isArray(applicants) ? applicants : [];
  const confirmedCohortStartups = safeApplicantsList.filter(a => {
    const cId = selectedCohort?.id;
    const matchesCohort = !cId || String(a.cohort_id) === String(cId) || (!a.cohort_id && String(cId) === '1');
    const ps = typeof a.program_status === 'string' && a.program_status !== '{}' ? a.program_status.toUpperCase() : '';
    const s = String(a.status || '').toUpperCase();

    // Explicitly exclude paused, kicked-out, suspended, dropped, or rejected startups
    if (['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED'].includes(ps)) return false;
    if (['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED', 'REJECTED'].includes(s)) return false;

    const matchesStatus = s === 'CONFIRMED' || 
                          s === 'ACCEPTED' || 
                          s === 'ENROLLED' || 
                          s === 'ORIENTATION_CONDUCTED' || 
                          ['ACTIVE', 'GRADUATED'].includes(ps) ||
                          (a.cohort_id && !['REJECTED', 'APPLIED', 'SUBMITTED', 'IN_REVIEW', 'UNDER_REVIEW', 'SHORTLISTED_FOR_PRESENTATION'].includes(s));
    return matchesCohort && matchesStatus;
  });

  // Filter intake list
  const filteredApplicants = safeApplicantsList.filter(app => {
    const matchesSearch = app.startup_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.tracking_token.toLowerCase().includes(searchQuery.toLowerCase());
    const normStatus = normalizeApplicantStatus(app.status);
    const matchesStatus = statusFilter === 'ALL' || normStatus === statusFilter;
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
      case 'cohort_feedback':
        return { title: 'Founder Feedback', desc: 'Review real-time ratings, mentor feedback, and incubator evaluation logs submitted by cohort founders' };
      case 'cohort_feedback_forms':
      case 'feedback_forms':
      case 'cohort_surveys':
        return { title: 'Feedback Forms & Surveys', desc: 'Build custom survey questionnaires, pulse checks, and analyze founder responses' };
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

  if (currentPath && currentPath.startsWith('/admin/checkins/')) {
    const parts = currentPath.split('/');
    const checkinId = parseInt(parts[parts.length - 1]);
    return (
      <CheckinDetailPage
        checkinId={checkinId}
        onBack={() => {
          if (onNavigate) onNavigate('/staff/dashboard', 'cohort_startups');
        }}
        onNavigate={onNavigate}
      />
    );
  }

  if (routeSessionId) {
    const targetSession = fetchedRouteSession || sessions.find(s => s.id === routeSessionId);

    if (!targetSession && loadingRouteSession) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-500 font-bold shadow-3xs">
          Loading session details...
        </div>
      );
    }

    if (!targetSession) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-3xs space-y-4 text-left">
          <button 
            type="button" 
            onClick={() => onNavigate('/staff/dashboard', 'cohort_sessions')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sessions
          </button>
          <p className="text-sm font-bold text-gray-700">Session #{routeSessionId} was not found or was deleted.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <SessionDetailModal
          session={targetSession}
          cohortStartups={confirmedCohortStartups}
          jwtToken={jwtToken}
          isFullPage={true}
          onBack={() => onNavigate('/staff/dashboard', 'cohort_sessions')}
          onUpdateSession={(updated) => {
            setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
            setFetchedRouteSession(updated);
          }}
          triggerSuccess={triggerSuccess}
          triggerError={triggerError}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="cohort-management-dashboard">
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

      {/* Top Navigation Bar with Back Button for all Subtabs */}
      {activeSubTab !== 'cohort_dashboard' && activeSubTab !== 'cohorts' && activeSubTab !== 'dashboard' && !selectedApplicant && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-150 rounded-2xl p-4 shadow-3xs text-left animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedApplicant(null);
                setSelectedStartupForModal(null);
                setSelectedSession(null);
                setSessionDetailModalSession(null);
                setStatusFilter('ALL');
                setActiveSubTab('cohort_dashboard');
                if (onNavigate) {
                  onNavigate('/staff/dashboard', 'cohort_dashboard');
                }
              }}
              className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-primary border border-gray-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
              id="back-to-cohort-dashboard-btn"
            >
              <ArrowLeft className="h-4 w-4 text-primary" />
              <span>Back to Cohort Dashboard</span>
            </button>
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />
            <div>
              <h2 className="text-sm font-black text-gray-900 leading-tight">{displayTitle}</h2>
              <p className="text-[11px] text-gray-400 font-bold">{displayDesc}</p>
            </div>
          </div>

          {selectedCohort && (
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-150 self-start sm:self-auto text-xs font-bold text-gray-600">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              <span>{selectedCohort.name}</span>
            </div>
          )}
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
          assignments={cohortAssignments}
          milestoneSubmissions={milestoneSubmissions}
          auditLogs={auditLogs}
          onCreateCohort={handleOpenCreateCohortModal}
          onUpdateCohortStatus={handleUpdateCohortStatus}
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
                  id="toggle-form-active-btn"
                  disabled={isTogglingForm}
                  onClick={handleToggleFormActive}
                  className="text-primary hover:text-rose-900 transition-all cursor-pointer p-1 disabled:opacity-60 flex items-center justify-center min-w-[48px]"
                  title={formSettings.is_active ? 'Click to turn Form Offline' : 'Click to turn Form Online'}
                >
                  {isTogglingForm ? (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  ) : formSettings.is_active ? (
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
        <div id="subtab-intake-review">
          {selectedApplicant ? (
            <ApplicationDetailsPage
              applicantId={selectedApplicant.id}
              initialApplicant={selectedApplicant}
              onBack={() => {
                setSelectedApplicant(null);
                fetchWithAuth('/api/applicants')
                  .then(res => safeParseResponse(res, []))
                  .then(data => Array.isArray(data) && setApplicants(data))
                  .catch(() => {});
                if (onNavigate) {
                  onNavigate('/staff/dashboard', 'cohort_applications');
                } else if (typeof window !== 'undefined' && window.history.pushState) {
                  window.history.pushState({}, '', '/staff/dashboard');
                }
              }}
              currentUser={currentUser}
              fetchWithAuth={fetchWithAuth}
              triggerSuccess={triggerSuccess}
              triggerError={triggerError}
              formSettings={formSettings}
              selectedCohort={selectedCohort}
              onNavigate={onNavigate}
            />
          ) : (
            <div className="space-y-6 text-left w-full">
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
                      {COHORT_STAGES.map((st) => (
                        <option key={st.key} value={st.key}>
                          {st.label} ({st.shortLabel})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table list */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-500 border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <th className="py-3.5 px-4">Startup / Founder</th>
                        <th className="py-3.5 px-4">CNIC Number</th>
                        <th className="py-3.5 px-4">Program Status</th>
                        <th className="py-3.5 px-4">Intake Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
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
                            className="border-b border-gray-50 hover:bg-gray-50/70 cursor-pointer transition-colors"
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
                                const rawPs = typeof app.program_status === 'string' && app.program_status !== '{}' ? app.program_status.toUpperCase().trim() : '';
                                const ps = (rawPs === 'ACTIVE' || rawPs === 'GRADUATED' || rawPs === 'PAUSED' || rawPs === 'KICKED_OUT')
                                  ? rawPs
                                  : (app.status === 'CONFIRMED' || app.status === 'ENROLLED' || app.cohort_id ? 'ACTIVE' : 'NOT_ENROLLED');
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectApplicant(app);
                                }}
                                className="text-[10px] font-black uppercase tracking-wider text-primary hover:text-white hover:bg-primary border border-rose-200 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-3xs"
                              >
                                Details →
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
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------------------------- */}
      {/* SUBTAB 3: INCUBATOR PROGRAM COHORT ACTIVE DASHBOARD */}
      {/* ----------------------------------------------------------------------------------- */}
      {(activeSubTab === 'active_cohort' || activeSubTab === 'cohort_sessions' || activeSubTab === 'cohort_warnings') && (
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
          </div>

          {/* SCHEDULE SESSION MODAL */}
          {showScheduleSessionModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-left">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Schedule New Session</h3>
                  <button 
                    onClick={() => setShowScheduleSessionModal(false)}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  handleScheduleSession(e);
                  setShowScheduleSessionModal(false);
                }} className="space-y-3 font-black text-[10px] uppercase tracking-wider">
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

                  {/* Design Thinking Bootcamp Toggle */}
                  <div className="p-3 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-200/80 rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-black text-gray-900">Design Thinking Bootcamp</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-mono uppercase">Track</span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Mark this session as part of the specialized Design Thinking Bootcamp curriculum.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isDesignThinkingBootcamp}
                      onClick={() => setIsDesignThinkingBootcamp(!isDesignThinkingBootcamp)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isDesignThinkingBootcamp ? 'bg-amber-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isDesignThinkingBootcamp ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowScheduleSessionModal(false)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary hover:bg-[#5A0F0F] text-white py-2 px-5 rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer shadow-3xs transition-all"
                    >
                      Schedule Session
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SESSIONS VIEW (FULL WIDTH) */}
          {activeSubTab === 'cohort_sessions' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Workshops & Guest sessions</h3>
                    <p className="text-[10px] text-gray-400 font-bold">Schedule and manage cohort lectures, masterclasses, and workshops</p>
                  </div>
                  <span className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono ml-2">
                    {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
                  </span>
                </div>

                {hasPermission('cohort:session_manage') && (
                  <button
                    type="button"
                    onClick={() => setShowScheduleSessionModal(true)}
                    className="bg-primary hover:bg-[#5A0F0F] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    New session
                  </button>
                )}
              </div>

              {sessions.length === 0 ? (
                <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                  No workshop sessions have been scheduled for this cohort.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sessions.map((sess) => {
                    const sessDateStr = sess.date ? String(sess.date).slice(0, 10) : '';
                    const isFuture = sessDateStr > getTodayDateString();
                    return (
                      <div
                        key={sess.id}
                        onClick={() => onNavigate(`/admin/sessions/${sess.id}`)}
                        className="p-4 border border-gray-150 rounded-xl bg-gray-50/40 hover:bg-white hover:border-primary/40 hover:shadow-2xs transition-all cursor-pointer text-xs flex justify-between items-start gap-3 group"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-gray-900 text-sm group-hover:text-primary transition-colors">{sess.title}</h4>
                            {sess.is_design_thinking_bootcamp && (
                              <span className="bg-amber-50 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                Design Thinking Bootcamp
                              </span>
                            )}
                            {sess.topic_category && (
                              <span className="bg-primary/5 text-primary text-[9px] font-black uppercase px-2 py-0.5 rounded border border-primary/10">
                                {sess.topic_category}
                              </span>
                            )}
                            {isFuture && (
                              <span className="bg-amber-50 text-amber-850 border border-amber-200 text-[8px] font-black uppercase px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-amber-600" />
                                Attendance Locked
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>{sess.date} • {sess.start_time?.substring(0, 5)} - {sess.end_time?.substring(0, 5)}</span>
                            {sess.venue && <span className="text-gray-400 font-normal">({sess.venue})</span>}
                          </p>

                          <div className="flex gap-2 flex-wrap items-center">
                            {sess.mentor_name && (
                              <span className="text-[10px] text-gray-600 font-bold flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-400" />
                                Mentor: {sess.mentor_name}
                              </span>
                            )}
                            {sess.recording_url && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-black uppercase px-1.5 py-0.5 rounded font-mono">
                                Recording Active
                              </span>
                            )}
                          </div>

                          <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 font-medium">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>{sess.attendance_summary || 'Attendance not marked yet'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>{sess.assignments_summary || 'No assignments yet'}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(sess.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Delete Session"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Core Modules grid layout for active_cohort / cohort_warnings */}
          {activeSubTab !== 'cohort_sessions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMN LEFT (8 spans): Attendance & Weekly logs */}
            <div className="lg:col-span-8 space-y-6">

              {/* Attendance Sheet */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs text-left space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4.5 w-4.5 text-primary" />
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Attendance Register</h3>
                  </div>
                  {selectedSession && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-black uppercase text-primary bg-rose-50 border border-rose-100 px-3 py-1 rounded-md">
                        Active: {selectedSession.title}
                      </span>
                      {(selectedSession.date ? String(selectedSession.date).slice(0, 10) : '') > getTodayDateString() && (
                        <span className="text-[10px] font-mono font-black uppercase text-amber-850 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-600" />
                          Locked until {selectedSession.date}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {selectedSession && (String(selectedSession.date || '').slice(0, 10) > getTodayDateString()) && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                    <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black block font-mono text-[11px] uppercase">Attendance Locked</span>
                      <span className="text-[11px] text-amber-800">
                        Attendance marking is locked until the scheduled session date ({selectedSession.date}).
                      </span>
                    </div>
                  </div>
                )}

                {!selectedSession ? (
                  <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                    Please select or schedule a session above to mark attendance.
                  </div>
                ) : confirmedCohortStartups.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                    No active seat-holders in this cohort to take attendance for.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const isSessLocked = selectedSession?.date ? (String(selectedSession.date).slice(0, 10) > getTodayDateString()) : false;
                      return (
                        <>
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
                                      disabled={isSessLocked}
                                      onClick={() => handleMarkAttendance(startup.id, 'PRESENT')}
                                      className={`px-2.5 py-1.5 rounded-lg transition-all border ${
                                        isSessLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                      } ${
                                        currentVal === 'PRESENT' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                                      }`}
                                    >
                                      Present
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSessLocked}
                                      onClick={() => handleMarkAttendance(startup.id, 'ABSENT')}
                                      className={`px-2.5 py-1.5 rounded-lg transition-all border ${
                                        isSessLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                      } ${
                                        currentVal === 'ABSENT' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                                      }`}
                                    >
                                      Absent
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSessLocked}
                                      onClick={() => handleMarkAttendance(startup.id, 'EXCUSED')}
                                      className={`px-2.5 py-1.5 rounded-lg transition-all border ${
                                        isSessLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                      } ${
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
                              disabled={isSessLocked}
                              onClick={handleSaveAttendance}
                              className={`py-2.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-3xs flex items-center gap-1.5 ${
                                isSessLocked
                                  ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                                  : 'bg-primary hover:bg-[#5A0F0F] text-white cursor-pointer'
                              }`}
                            >
                              {isSessLocked ? (
                                <>
                                  <Lock className="h-3.5 w-3.5" />
                                  Attendance Locked
                                </>
                              ) : (
                                'Synchronize Attendance Log'
                              )}
                            </button>
                          </div>
                        </>
                      );
                    })()}
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
                            <div 
                              key={chk.id} 
                              onClick={() => {
                                if (onNavigate) {
                                  onNavigate(`/admin/checkins/${chk.id}`);
                                } else {
                                  window.history.pushState({}, '', `/admin/checkins/${chk.id}`);
                                  window.dispatchEvent(new Event('popstate'));
                                }
                              }}
                              className="p-3.5 bg-gray-50/30 border border-gray-150 hover:border-primary/50 rounded-xl text-xs space-y-2 cursor-pointer transition-all hover:bg-white hover:shadow-2xs group"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h4 className="font-extrabold text-gray-800 group-hover:text-primary transition-colors">{sName}</h4>
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
                        const sName = (warn as any).startup_name || applicants.find(a => a.id === warn.applicant_id)?.startup_name || 'Startup';
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
                                  value={warningResolutionNotes[warn.id] || ''}
                                  onChange={(e) => setWarningResolutionNotes(prev => ({ ...prev, [warn.id]: e.target.value }))}
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
          )}
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
                  value={cohortSettingsForm.name}
                  onChange={(e) => setCohortSettingsForm({ ...cohortSettingsForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:border-primary"
                  placeholder="e.g. Cohort 1"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">Intake Year</label>
                <input
                  type="text"
                  value={cohortSettingsForm.intake_year}
                  onChange={(e) => setCohortSettingsForm({ ...cohortSettingsForm, intake_year: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:border-primary"
                  placeholder="e.g. 2026"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">Start Date</label>
                <input
                  type="date"
                  value={cohortSettingsForm.start_date}
                  onChange={(e) => setCohortSettingsForm({ ...cohortSettingsForm, start_date: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">End Date</label>
                <input
                  type="date"
                  value={cohortSettingsForm.end_date}
                  onChange={(e) => setCohortSettingsForm({ ...cohortSettingsForm, end_date: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">Maximum Capacity (Seats)</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={cohortSettingsForm.max_capacity}
                  onChange={(e) => setCohortSettingsForm({ ...cohortSettingsForm, max_capacity: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] block font-mono">Assigned Program Manager</label>
                <select 
                  value={cohortSettingsForm.assigned_manager_id}
                  onChange={(e) => {
                    const chosen = PROGRAM_MANAGERS.find(m => m.id === e.target.value);
                    setCohortSettingsForm({
                      ...cohortSettingsForm,
                      assigned_manager_id: e.target.value,
                      assigned_manager_name: chosen ? chosen.name : e.target.value
                    });
                  }}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:border-primary cursor-pointer"
                >
                  {PROGRAM_MANAGERS.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-gray-500 text-[10px] block font-mono">Cohort Overview & Focus Areas (Optional)</label>
                <textarea
                  value={cohortSettingsForm.description}
                  onChange={(e) => setCohortSettingsForm({ ...cohortSettingsForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:border-primary resize-none"
                  placeholder="e.g. Incubation program focused on deep tech, enterprise software, and scalable venture building."
                />
              </div>

              <div className="md:col-span-2 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  id="save-cohort-config-btn"
                  disabled={savingCohortSettings}
                  onClick={handleSaveCohortSettings}
                  className="bg-primary hover:bg-[#5A0F0F] text-white py-2.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-3xs flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingCohortSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Config...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Cohort Config</span>
                    </>
                  )}
                </button>

                {/* Cohort Lifecycle & Bulk Graduate Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedCohort.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateCohortStatus('ACTIVE', false)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-3xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Set Cohort to Active</span>
                    </button>
                  )}

                  {selectedCohort.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => setCohortToGraduate(selectedCohort)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-3xs flex items-center gap-1.5"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>🎓 Bulk Graduate Cohort (Mark Completed)</span>
                    </button>
                  )}
                </div>
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
        <StartupDirectoryTab isStaff={true} cohortsList={cohorts} onNavigate={onNavigate} />
      )}

      {/* SUBTAB: ASSIGNMENTS */}
      {activeSubTab === 'cohort_assignments' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-6 text-left">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#8B1A1A]" />
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Independent & Cohort Deliverables</h3>
              </div>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                Create independent assignments or batch milestones for all startups in {selectedCohort?.name || 'the active cohort'}.
                Published assignments automatically appear on every founder's workspace.
              </p>
            </div>
            <button
              onClick={() => fetchCohortAssignments()}
              className="text-[10px] font-bold text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-all cursor-pointer"
            >
              Refresh List
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: CREATE INDEPENDENT ASSIGNMENT FORM */}
            <form onSubmit={handleCreateIndependentAssignment} className="lg:col-span-5 bg-gray-50/50 p-4 border border-gray-150 rounded-xl space-y-3 font-bold text-xs">
              <span className="text-[10px] font-black uppercase text-[#8B1A1A] block font-mono tracking-widest flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Post Independent Cohort Assignment
              </span>
              
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase block font-semibold">Assignment Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Validated Lean Canvas & Financial Model"
                  value={newAsgTitle}
                  onChange={(e) => setNewAsgTitle(e.target.value)}
                  className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase block font-semibold">Instructions / Guidelines</label>
                <textarea
                  rows={3}
                  placeholder="Describe the milestone requirements, format, and evaluation criteria..."
                  value={newAsgDesc}
                  onChange={(e) => setNewAsgDesc(e.target.value)}
                  className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary font-medium resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase block font-semibold">Submission Due Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  min={getTodayDateString()}
                  value={newAsgDueDate}
                  onChange={(e) => setNewAsgDueDate(e.target.value)}
                  className="w-full bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-gray-500 uppercase block font-semibold">Reference Attachments & Templates</label>
                  {(newAsgFiles.length > 0 || newAsgFileUrls.length > 0) && (
                    <span className="text-[9px] font-bold text-primary font-mono">
                      {newAsgFiles.length + newAsgFileUrls.length} item(s) attached
                    </span>
                  )}
                </div>

                {/* Multi-file selector drop area */}
                <div className="border border-dashed border-gray-300 hover:border-primary rounded-xl p-3 bg-white text-center transition-colors">
                  <input
                    type="file"
                    id="cohort-multi-asg-files"
                    multiple
                    onChange={(e) => {
                      handleAddAsgFiles(e.target.files);
                      e.target.value = ''; // Reset input to allow re-selection
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="cohort-multi-asg-files"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1 text-[11px] text-gray-600 hover:text-primary font-medium"
                  >
                    <Paperclip className="h-4 w-4 text-gray-400" />
                    <span>Click to select <strong>Multiple Files</strong> (PDF, PPTX, XLSX, DOCX, ZIP)</span>
                    <span className="text-[9px] text-gray-400">Attach templates, rubrics, guides, or example sheets</span>
                  </label>
                </div>

                {/* Selected Files List */}
                {newAsgFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase block font-mono">Selected Files to Upload ({newAsgFiles.length}):</span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {newAsgFiles.map((file, idx) => (
                        <div
                          key={`${file.name}_${idx}`}
                          className="flex items-center justify-between p-1.5 bg-white border border-gray-200 rounded-lg text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 truncate mr-2">
                            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-semibold text-gray-800 truncate" title={file.name}>{file.name}</span>
                            <span className="text-[9px] text-gray-400 font-mono shrink-0">({formatFileSize(file.size)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAsgFile(idx)}
                            className="text-gray-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 cursor-pointer shrink-0 transition-colors"
                            title="Remove file"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* External Resource URL Input */}
                <div className="pt-1 space-y-1">
                  <span className="text-[9px] text-gray-400 font-mono block">or attach external links (Google Drive, Figma, Notion):</span>
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      placeholder="https://drive.google.com/... or https://notion.so/..."
                      value={newAsgUrlInput}
                      onChange={(e) => setNewAsgUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExternalUrl();
                        }
                      }}
                      className="flex-1 bg-white border border-gray-150 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary font-mono text-[10px]"
                    />
                    <button
                      type="button"
                      onClick={handleAddExternalUrl}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[10px] rounded-lg cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <LinkIcon className="h-3 w-3" /> Add Link
                    </button>
                  </div>

                  {/* External URLs List */}
                  {newAsgFileUrls.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {newAsgFileUrls.map((url, idx) => (
                        <div
                          key={`url_${idx}`}
                          className="flex items-center justify-between p-1.5 bg-white border border-blue-100 rounded-lg text-[10px]"
                        >
                          <div className="flex items-center gap-1.5 truncate mr-2">
                            <LinkIcon className="h-3 w-3 text-blue-600 shrink-0" />
                            <span className="font-mono text-blue-700 truncate">{url}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExternalUrl(idx)}
                            className="text-gray-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 cursor-pointer shrink-0 transition-colors"
                            title="Remove link"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={publishingAsg || uploadingAsgFile}
                className="w-full bg-[#8B1A1A] hover:bg-[#5A0F0F] text-white py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider cursor-pointer shadow-3xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {publishingAsg || uploadingAsgFile ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{uploadProgressText || 'Publishing Assignment...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Publish to All Cohort Founders {newAsgFiles.length + newAsgFileUrls.length > 0 ? `(${newAsgFiles.length + newAsgFileUrls.length} Files)` : ''}</span>
                  </>
                )}
              </button>
            </form>

            {/* RIGHT COLUMN: PUBLISHED ASSIGNMENTS DIRECTORY */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                  Cohort Deliverables & Assignments ({cohortAssignments.length})
                </span>
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAsgFilter('ALL')}
                    className={`px-2 py-0.5 rounded-md transition-all ${asgFilter === 'ALL' ? 'bg-white text-gray-900 shadow-2xs font-extrabold' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    All ({cohortAssignments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsgFilter('INDEPENDENT')}
                    className={`px-2 py-0.5 rounded-md transition-all ${asgFilter === 'INDEPENDENT' ? 'bg-white text-gray-900 shadow-2xs font-extrabold' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Independent ({cohortAssignments.filter((a) => !a.session_id).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsgFilter('SESSION')}
                    className={`px-2 py-0.5 rounded-md transition-all ${asgFilter === 'SESSION' ? 'bg-white text-gray-900 shadow-2xs font-extrabold' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Session Linked ({cohortAssignments.filter((a) => a.session_id).length})
                  </button>
                </div>
              </div>

              {loadingCohortAssignments ? (
                <div className="p-8 text-center text-gray-400 font-mono text-xs">
                  Loading cohort assignments...
                </div>
              ) : cohortAssignments.filter((a) => {
                if (asgFilter === 'INDEPENDENT') return !a.session_id;
                if (asgFilter === 'SESSION') return !!a.session_id;
                return true;
              }).length === 0 ? (
                <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs space-y-1">
                  <FileText className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                  <p className="font-bold text-gray-500">No deliverables match this filter.</p>
                  <p className="text-[11px] text-gray-400">Use the form on the left to publish an assignment to cohort startups.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cohortAssignments.filter((a) => {
                    if (asgFilter === 'INDEPENDENT') return !a.session_id;
                    if (asgFilter === 'SESSION') return !!a.session_id;
                    return true;
                  }).map((asg) => {
                    const isExpanded = selectedAsgForSubmissions?.id === asg.id;
                    return (
                      <div key={asg.id} className="p-4 bg-gray-50/50 border border-gray-150 rounded-xl text-xs space-y-3 transition-all hover:border-gray-300">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {!asg.session_id ? (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200">
                                  Independent Milestone
                                </span>
                              ) : (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-purple-50 text-purple-800 border-purple-200">
                                  Session: {asg.session_title || `Session #${asg.session_id}`}
                                </span>
                              )}
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-200">
                                Published
                              </span>
                            </div>
                            <h4 className="font-extrabold text-gray-900 text-sm mt-1">{asg.title}</h4>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded font-mono">
                              Due: {asg.due_date}
                            </span>
                            {asg.due_date && new Date(asg.due_date).getTime() < new Date().setHours(0,0,0,0) && (
                              <span className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                Past Due (Kept in Record)
                              </span>
                            )}
                          </div>
                        </div>

                        {asg.description && (
                          <p className="text-[11px] text-gray-600 leading-relaxed">{asg.description}</p>
                        )}

                        {(() => {
                          const attachments = parseAssignmentAttachments(asg.attachment_url);
                          if (attachments.length === 0) return null;
                          return (
                            <div className="pt-1 space-y-1">
                              <span className="text-[9px] font-bold text-gray-500 uppercase block font-mono">
                                Attached Materials ({attachments.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {attachments.map((att, attIdx) => {
                                  const isHttpLink = att.url.startsWith('http://') || att.url.startsWith('https://');
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
                                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-800 hover:text-primary bg-white hover:bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 shadow-3xs cursor-pointer transition-all max-w-xs truncate"
                                      title={att.name || att.url}
                                    >
                                      {isUploadFile ? (
                                        <Download className="h-3 w-3 text-primary shrink-0" />
                                      ) : (
                                        <ExternalLink className="h-3 w-3 text-blue-600 shrink-0" />
                                      )}
                                      <span className="truncate">{att.name || getCleanFileName(att.url)}</span>
                                      {att.size && (
                                        <span className="text-[8px] text-gray-400 font-mono">({formatFileSize(att.size)})</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex justify-between items-center pt-2 border-t border-gray-200/60 text-[11px]">
                          <span className="font-bold text-emerald-700 flex items-center gap-1 font-mono">
                            <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                            Submissions: {asg.submissions_count || 0} / {confirmedCohortStartups.length} Founders
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingAssignment({ id: asg.id, title: asg.title, description: asg.description || '', due_date: asg.due_date || '' })}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 flex items-center gap-1"
                              title="Extend or Edit Due Date"
                            >
                              <Calendar className="h-3 w-3" /> Extend Date
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSubmissions(asg)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                                isExpanded
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {isExpanded ? 'Hide Submissions' : 'View Submissions'}
                            </button>
                            {deletingAsgId === asg.id ? (
                              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg animate-fadeIn">
                                <span className="text-[10px] text-rose-700 font-bold">Delete?</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteAssignment(asg.id);
                                  }}
                                  className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded hover:bg-rose-700 cursor-pointer shadow-2xs"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDeletingAsgId(null);
                                  }}
                                  className="text-[10px] bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded hover:bg-gray-300 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeletingAsgId(asg.id);
                                }}
                                className="text-gray-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                title="Delete Assignment"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* EXPANDED SUBMISSIONS LIST */}
                        {isExpanded && (
                          <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 space-y-2 text-left">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                              <span className="text-[10px] font-black uppercase text-gray-500 font-mono">Startup Submission Roster</span>
                              <span className="text-[9px] text-gray-400 font-mono">Realtime Sync</span>
                            </div>

                            {loadingSubmissions ? (
                              <div className="text-center py-4 text-[10px] text-gray-400 font-mono">
                                Loading startup submissions...
                              </div>
                            ) : asgSubmissions.length === 0 ? (
                              <div className="text-center py-4 text-[10px] text-gray-400">
                                No startup records found for this cohort.
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                                {asgSubmissions.map((sub) => (
                                  <div key={sub.applicant_id} className="py-2 flex items-center justify-between text-[11px]">
                                    <div>
                                      <p className="font-bold text-gray-800">{sub.startup_name}</p>
                                      <p className="text-[10px] text-gray-400">Lead: {sub.founder_name}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {sub.is_submitted ? (
                                        <>
                                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black px-1.5 py-0.5 rounded">
                                            Submitted
                                          </span>
                                          {sub.file_url && (
                                            <button
                                              type="button"
                                              onClick={() => downloadFileLocally(sub.file_url, `${sub.startup_name.replace(/\s+/g, '_')}_${getCleanFileName(sub.file_url)}`)}
                                              className="bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[9px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 cursor-pointer border border-primary/20"
                                            >
                                              <Download className="h-2.5 w-2.5" /> Save File
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black px-1.5 py-0.5 rounded">
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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

      {/* SUBTAB: FOUNDER FEEDBACK */}
      {activeSubTab === 'cohort_feedback' && (
        <CohortFeedbackTab cohortId={selectedCohort?.id} />
      )}

      {/* SUBTAB: GENERALIZED FEEDBACK FORMS & SURVEYS */}
      {(activeSubTab === 'cohort_feedback_forms' || activeSubTab === 'feedback_forms' || activeSubTab === 'cohort_surveys') && (
        <FeedbackFormsTab 
          cohortId={selectedCohort?.id} 
          jwtToken={jwtToken}
          sessions={sessions.map(s => ({ id: s.id, title: s.title, date: s.date }))}
        />
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

      {/* SESSION DETAIL TABBED MODAL */}
      {sessionDetailModalSession && (
        <SessionDetailModal
          session={sessionDetailModalSession}
          cohortStartups={confirmedCohortStartups}
          jwtToken={jwtToken}
          onClose={() => setSessionDetailModalSession(null)}
          onUpdateSession={(updated) => {
            setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
            setSessionDetailModalSession(updated);
          }}
          triggerSuccess={triggerSuccess}
          triggerError={triggerError}
        />
      )}

      {/* CREATE COHORT POPUP FORM */}
      {showCreateCohortForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <FolderPlus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Create New Cohort</h3>
                  <p className="text-[10px] text-gray-400 font-bold">Initiate a new incubation program batch</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCreateCohortForm(false)} 
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Warning when uncompleted cohort exists */}
            {uncompletedCohort ? (
              <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl space-y-3 text-xs text-amber-900 shadow-2xs">
                <div className="flex items-center gap-2 font-black text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Active Cohort in Progress: {uncompletedCohort.name}</span>
                </div>
                <p className="text-amber-700 leading-relaxed font-medium">
                  Naya cohort create karne ke liye zaroori hai ke pehle moujooda cohort <strong>'{uncompletedCohort.name}'</strong> ko bulk graduate kiya jaye aur status <strong>COMPLETED</strong> set ho.
                </p>
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setCohortToGraduate(uncompletedCohort);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider cursor-pointer shadow-3xs transition-all"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Bulk Graduate '{uncompletedCohort.name}' Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCohortForm(false);
                      setSelectedCohort(uncompletedCohort);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold text-[11px] cursor-pointer"
                  >
                    <span>View Cohort</span>
                  </button>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleCreateCohort} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 block font-mono">Cohort Name *</label>
                <input
                  type="text"
                  required
                  disabled={!!uncompletedCohort}
                  value={newCohortName}
                  onChange={(e) => setNewCohortName(e.target.value)}
                  placeholder="e.g. Cohort 02 (Fall 2026)"
                  className={`w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary font-bold ${
                    uncompletedCohort ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 block font-mono">Initial Program Status</label>
                <select
                  disabled={!!uncompletedCohort}
                  value={newCohortStatus}
                  onChange={(e) => setNewCohortStatus(e.target.value as 'ACTIVE' | 'DRAFT')}
                  className={`w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary font-bold cursor-pointer ${
                    uncompletedCohort ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''
                  }`}
                >
                  <option value="ACTIVE">ACTIVE (Open for Intake & Active Sessions)</option>
                  <option value="DRAFT">DRAFT (Internal Preparation Mode)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateCohortForm(false)}
                  className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!uncompletedCohort}
                  className={`w-1/2 text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-3xs flex items-center justify-center gap-1.5 ${
                    uncompletedCohort
                      ? 'bg-gray-400 opacity-60 cursor-not-allowed'
                      : 'bg-primary hover:bg-[#5A0F0F] cursor-pointer'
                  }`}
                >
                  {uncompletedCohort ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  <span>{uncompletedCohort ? 'Creation Locked' : 'Create Cohort'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTEND / EDIT ASSIGNMENT MODAL */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Extend / Edit Due Date</h3>
              <button onClick={() => setEditingAssignment(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Assignment Title</label>
                <input
                  type="text"
                  value={editingAssignment.title}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Extended Due Date *</label>
                <input
                  type="date"
                  required
                  min={getTodayDateString()}
                  value={editingAssignment.due_date}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Instructions / Description</label>
                <textarea
                  value={editingAssignment.description}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingAssignment(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignmentUpdate}
                disabled={isUpdatingAssignment}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs"
              >
                {isUpdatingAssignment ? 'Saving...' : 'Save Extended Date'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cohortToGraduate && (
        <BulkGraduateConfirmationModal
          isOpen={!!cohortToGraduate}
          onClose={() => setCohortToGraduate(null)}
          onConfirm={handleConfirmBulkGraduateInPage}
          cohortName={cohortToGraduate.name}
          startups={(applicants || []).filter(a => {
            const matchesC = String(a.cohort_id) === String(cohortToGraduate.id) || (!a.cohort_id && String(cohortToGraduate.id) === '1');
            const ps = typeof a.program_status === 'string' && a.program_status !== '{}' ? a.program_status.toUpperCase() : '';
            const s = String(a.status || '').toUpperCase();
            if (['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED', 'REJECTED'].includes(ps)) return false;
            if (['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED', 'REJECTED'].includes(s)) return false;
            return ps === 'ACTIVE' || ['ENROLLED', 'CONFIRMED', 'ACCEPTED'].includes(s);
          })}
          isSubmitting={isGraduatingCohort}
        />
      )}

    </div>
  );
};
