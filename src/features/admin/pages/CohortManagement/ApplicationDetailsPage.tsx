import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Building2, User, Mail, Phone, CreditCard, Calendar, 
  ShieldAlert, CheckCircle2, XCircle, Clock, ChevronRight, MoreVertical, 
  Send, MessageSquare, AlertTriangle, FileText, Layers, History, Check,
  UserCheck, AlertOctagon, CornerDownRight, ExternalLink, Key, Copy, Loader2, Award
} from 'lucide-react';
import { COHORT_STAGES, normalizeApplicantStatus, getStageByStatus, CohortStage } from '../../../../constants/cohortStages';

export type StageDefinition = CohortStage;
export const INTAKE_STAGES = COHORT_STAGES;

export function normalizeStageKey(status: string): string {
  return normalizeApplicantStatus(status);
}

export function getStageDef(status: string): StageDefinition {
  return getStageByStatus(status);
}

export function getNextLinearStage(status: string): StageDefinition | null {
  const normKey = normalizeApplicantStatus(status);
  const linearStages = COHORT_STAGES.filter(s => s.type === 'linear');
  const idx = linearStages.findIndex(s => s.key === normKey);
  if (idx !== -1 && idx < linearStages.length - 1) {
    return linearStages[idx + 1];
  }
  return null;
}

export interface ApplicationDetailsPageProps {
  applicantId: number;
  onBack: () => void;
  currentUser: any;
  fetchWithAuth: (url: string, options?: any) => Promise<any>;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
  formSettings: any;
  selectedCohort?: any;
  onNavigate?: (path: string, tab?: string) => void;
}

export const ApplicationDetailsPage: React.FC<ApplicationDetailsPageProps> = ({
  applicantId,
  onBack,
  currentUser,
  fetchWithAuth,
  triggerSuccess,
  triggerError,
  formSettings,
  selectedCohort,
  onNavigate
}) => {
  const [applicant, setApplicant] = useState<any>(null);
  const [parentRecord, setParentRecord] = useState<any>(null);
  const [stageHistory, setStageHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Kebab menu state
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [targetStage, setTargetStage] = useState<StageDefinition | null>(null);
  const [customStageKey, setCustomStageKey] = useState<string>('');
  const [isManualSelection, setIsManualSelection] = useState<boolean>(false);
  const [remarks, setRemarks] = useState<string>('');
  const [includeInEmail, setIncludeInEmail] = useState<boolean>(true);

  // Orientation state
  const [updatingOrientation, setUpdatingOrientation] = useState<boolean>(false);

  // Credentials Management state
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [resendingCredentials, setResendingCredentials] = useState<boolean>(false);
  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  const handleCopyCredentials = () => {
    if (!applicant) return;
    const loginEmail = applicant.email;
    const password = applicant.founder_password || 'Not generated yet';
    const textToCopy = `Founder Portal Credentials for ${applicant.startup_name}:\nURL: ${window.location.origin}/login\nEmail: ${loginEmail}\nPassword: ${password}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    triggerSuccess('Credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResendCredentialsEmail = async () => {
    setResendingCredentials(true);
    try {
      const res = await fetchWithAuth(`/api/applicants/${applicantId}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resendEmail: true })
      });
      if (!res.ok) throw new Error('Failed to send credentials email');
      const data = await res.json();
      setApplicant({ ...applicant, founder_password: data.credentials.password });
      triggerSuccess(`Credentials email successfully dispatched to ${applicant.email}!`);
    } catch (err: any) {
      triggerError(err.message || 'Failed to send credentials email.');
    } finally {
      setResendingCredentials(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`/api/applicants/${applicantId}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPasswordInput || undefined, resendEmail: true })
      });
      if (!res.ok) throw new Error('Failed to reset password');
      const data = await res.json();
      setApplicant({ ...applicant, founder_password: data.credentials.password });
      triggerSuccess('Founder password updated and notification email sent!');
      setResetModalOpen(false);
      setNewPasswordInput('');
    } catch (err: any) {
      triggerError(err.message || 'Failed to update founder password.');
    }
  };

  const [updatingProgramStatus, setUpdatingProgramStatus] = useState<boolean>(false);

  const handleUpdateProgramStatus = async (newProgramStatus: string) => {
    if (!applicant) return;
    const isAlreadyKicked = applicant.program_status === 'KICKED_OUT' || applicant.status === 'KICKED_OUT';
    if (isAlreadyKicked && newProgramStatus !== 'KICKED_OUT') {
      triggerError('Yeh startup incubator se permanently kick out ho chuka hai. Iska status reactivate ya change nahi kiya ja sakta.');
      return;
    }

    setUpdatingProgramStatus(true);
    try {
      const res = await fetchWithAuth(`/api/applicants/${applicant.id}/program-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_status: newProgramStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update program status');
      setApplicant({ ...applicant, program_status: newProgramStatus });
      triggerSuccess(`Startup program status set to ${newProgramStatus} across all views.`);
      loadStageHistory();
    } catch (err: any) {
      triggerError(err.message || 'Failed to update program status.');
    } finally {
      setUpdatingProgramStatus(false);
    }
  };

  // Close kebab menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch applicant data and stage history
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/applicants/${applicantId}`);
      if (!res.ok) throw new Error('Failed to fetch application details');
      const data = await res.json();
      setApplicant(data);
      if (data.parent) {
        setParentRecord(data.parent);
      }
    } catch (err: any) {
      triggerError(err.message || 'Error loading application');
    } finally {
      setLoading(false);
    }
  };

  const loadStageHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetchWithAuth(`/api/applicants/${applicantId}/stage-history`);
      if (res.ok) {
        const historyData = await res.json();
        setStageHistory(Array.isArray(historyData) ? historyData : []);
      }
    } catch (err) {
      console.error('Failed to load stage history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadStageHistory();
  }, [applicantId]);

  // Open confirmation modal for a targeted stage
  const handleOpenTransitionModal = (stage: StageDefinition, manual: boolean = false) => {
    setTargetStage(stage);
    setCustomStageKey(stage.key);
    setIsManualSelection(manual);
    setRemarks('');
    setIncludeInEmail(true);
    setMenuOpen(false);
    setModalOpen(true);
  };

  const handleOpenManualModal = () => {
    const currentNorm = normalizeStageKey(applicant?.status);
    const firstOther = INTAKE_STAGES.find(s => s.key !== currentNorm) || INTAKE_STAGES[0];
    handleOpenTransitionModal(firstOther, true);
  };

  const handleConfirmStageTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicant) return;

    const finalStageKey = isManualSelection ? customStageKey : targetStage?.key;
    if (!finalStageKey) return;

    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`/api/applicants/${applicant.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: finalStageKey,
          cohort_id: selectedCohort?.id,
          comments: remarks.trim(),
          include_in_email: includeInEmail
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update stage.');

      const updatedApplicant = data.applicant || { ...applicant, status: finalStageKey };
      setApplicant(updatedApplicant);
      triggerSuccess(`Application moved to '${getStageDef(finalStageKey).label}' successfully.`);
      setModalOpen(false);
      loadStageHistory();
    } catch (err: any) {
      triggerError(err.message || 'Failed to update stage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleOrientation = async () => {
    if (!applicant) return;
    const nextOrient = !applicant.orientation_conducted;
    setUpdatingOrientation(true);
    try {
      const res = await fetchWithAuth(`/api/applicants/${applicant.id}/orientation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orientation_conducted: nextOrient })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update orientation.');

      setApplicant({ ...applicant, orientation_conducted: nextOrient });
      triggerSuccess(`Orientation status updated to ${nextOrient ? 'Conducted' : 'Pending'}.`);
    } catch (err: any) {
      triggerError(err.message);
    } finally {
      setUpdatingOrientation(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-gray-150 shadow-3xs max-w-4xl mx-auto my-6 space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Loading Application File...</p>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-gray-150 shadow-3xs max-w-2xl mx-auto my-6 space-y-4">
        <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto" />
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Application Record Not Found</h3>
        <p className="text-xs text-gray-500">The requested application record could not be loaded or may have been deleted.</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-hover transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications List
        </button>
      </div>
    );
  }

  const currentStageDef = getStageDef(applicant.status);
  const nextStageDef = getNextLinearStage(applicant.status);
  const isTerminalOrAlternate = currentStageDef.type === 'terminal' || currentStageDef.type === 'alternate' || currentStageDef.key === 'ENROLLED';
  const isPermanentlyKicked = applicant.program_status === 'KICKED_OUT' || applicant.status === 'KICKED_OUT';
  const isGraduated = applicant.program_status === 'GRADUATED';
  const isLockedTerminal = isPermanentlyKicked || isGraduated;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-left" id="application-full-details-view">
      {/* Floating Status Update Progress Indicator */}
      {updatingProgramStatus && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-gray-700 text-xs font-bold animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
          <Loader2 className="h-4 w-4 animate-spin text-rose-400 shrink-0" />
          <div>
            <p className="font-extrabold text-[12px] leading-none">Updating Program Status...</p>
            <p className="text-[10px] text-gray-300 font-normal mt-0.5">Please wait, updating system records and syncing startup profile</p>
          </div>
        </div>
      )}

      {/* Navigation Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-primary bg-white hover:bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl shadow-3xs transition-all cursor-pointer"
            id="back-to-applications-btn"
          >
            <ArrowLeft className="h-4 w-4 text-primary" />
            <span>Back to Applications</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate('/staff/dashboard', 'cohort_dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl transition-all cursor-pointer"
            >
              <span>Cohort Dashboard</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
          <span>Intake Admissions Evaluator</span>
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-bold text-gray-900">{applicant.tracking_token}</span>
        </div>
      </div>

      {/* Card 1: Main Header & Identity Badge */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-md font-mono">
                {applicant.tracking_token}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border font-mono ${
                applicant.program_status === 'ACTIVE' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                applicant.program_status === 'PAUSED'
                  ? 'bg-amber-50 text-amber-800 border-amber-200' :
                applicant.program_status === 'GRADUATED'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                applicant.program_status === 'KICKED_OUT'
                  ? 'bg-rose-50 text-rose-800 border-rose-200' :
                  'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                Program Status: {applicant.program_status || 'NOT_ENROLLED'}
              </span>
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">{applicant.startup_name}</h1>
            <p className="text-xs text-gray-500 font-medium">Submitted on {new Date(applicant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Current Stage</span>
              <span className={`inline-block mt-0.5 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl border ${
                currentStageDef.type === 'terminal' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                currentStageDef.type === 'alternate' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                currentStageDef.key === 'ENROLLED' || currentStageDef.key === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                'bg-blue-50 text-blue-900 border-blue-200'
              }`}>
                {currentStageDef.label}
              </span>
            </div>
          </div>
        </div>

        {/* Program Status Quick Switch & Orientation Bar */}
        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500 font-bold text-[11px] uppercase font-mono flex items-center gap-1.5">
              <span>Program Status:</span>
              {updatingProgramStatus && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-[10px] font-bold">
              {(['NOT_ENROLLED', 'ACTIVE', 'PAUSED', 'GRADUATED', 'KICKED_OUT'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={updatingProgramStatus || (isLockedTerminal && (applicant.program_status || 'NOT_ENROLLED') !== st) || (applicant.program_status || 'NOT_ENROLLED') === st}
                  onClick={() => handleUpdateProgramStatus(st)}
                  className={`px-2 py-1 rounded-md font-mono transition-all ${
                    (applicant.program_status || 'NOT_ENROLLED') === st
                      ? st === 'ACTIVE' ? 'bg-emerald-600 text-white font-black shadow-xs cursor-default'
                        : st === 'PAUSED' ? 'bg-amber-600 text-white font-black shadow-xs cursor-default'
                        : st === 'GRADUATED' ? 'bg-indigo-600 text-white font-black shadow-xs cursor-default'
                        : st === 'KICKED_OUT' ? 'bg-rose-600 text-white font-black shadow-xs cursor-default'
                        : 'bg-gray-700 text-white font-black shadow-xs cursor-default'
                      : isLockedTerminal
                      ? 'text-gray-400 opacity-40 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 cursor-pointer'
                  }`}
                  title={isLockedTerminal && (applicant.program_status || 'NOT_ENROLLED') !== st ? 'Startup is locked in terminal status' : undefined}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
            {isPermanentlyKicked ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold font-mono">
                <ShieldAlert className="h-3 w-3 text-rose-600 shrink-0" />
                Permanently Locked (Terminated)
              </span>
            ) : isGraduated ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold font-mono">
                <Award className="h-3 w-3 text-indigo-600 shrink-0" />
                Permanently Locked (Graduated)
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Orientation:</span>
            <button
              onClick={handleToggleOrientation}
              disabled={updatingOrientation}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-extrabold transition-all cursor-pointer ${
                applicant.orientation_conducted 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
            >
              {applicant.orientation_conducted ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Clock className="h-3.5 w-3.5 text-gray-400" />}
              <span>{applicant.orientation_conducted ? 'Conducted' : 'Pending'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cards 2 & 3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 2: Founder Particulars */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Founder Particulars
              </h2>
              <span className="text-[10px] font-bold text-gray-400 font-mono">Lead Applicant</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-150 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Full Name</span>
                <p className="font-bold text-gray-900 text-sm">{applicant.name}</p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-150 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">CNIC Card Number</span>
                <p className="font-bold text-gray-900 text-sm font-mono">{applicant.cnic || 'N/A'}</p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-150 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Email Address</span>
                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <a href={`mailto:${applicant.email}`} className="hover:underline hover:text-primary">{applicant.email}</a>
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-150 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Phone Number</span>
                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  <a href={`tel:${applicant.phone}`} className="hover:underline hover:text-primary">{applicant.phone}</a>
                </p>
              </div>
            </div>

            {/* Lineage Link if applicable */}
            {applicant.parent_applicant_id && (
              <div className="p-3.5 bg-[#FFF9E6] border border-[#FFE7A3] rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                  <AlertOctagon className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>Past Application Match Found</span>
                </div>
                <p className="text-gray-800 text-xs pl-6">
                  This founder matched with a previous intake submission cycle.
                  {parentRecord && (
                    <span className="block mt-1 font-semibold text-gray-900">
                      Previous Token: <strong className="font-mono">{parentRecord.tracking_token}</strong> ({parentRecord.status})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Card 3: Venture Description & Dynamic Fields */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Venture Description & Business Questionnaire
              </h2>
              <span className="text-[10px] font-bold text-gray-400 font-mono">Form Data</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono mb-1">
                  Startup Executive Summary / Description
                </span>
                <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl font-bold text-gray-800 leading-relaxed whitespace-pre-line">
                  {applicant.startup_description || 'No description provided.'}
                </div>
              </div>

              {applicant.form_data && typeof applicant.form_data === 'object' && Object.keys(applicant.form_data).length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                    Dynamic Application Fields
                  </span>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.keys(applicant.form_data).map((key) => {
                      const fieldLabel = formSettings?.fields?.find((f: any) => f.id === key)?.label || key;
                      const val = applicant.form_data[key];
                      return (
                        <div key={key} className="p-3.5 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">
                            {fieldLabel}
                          </span>
                          <p className="font-bold text-gray-800 leading-relaxed break-words">
                            {val ? String(val) : <em className="text-gray-400 font-normal">Blank / Unanswered</em>}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Card 4 (Stage Advancement) & Card 5 (Timeline) */}
        <div className="space-y-6">
          {/* Card 4: Stage Progress & Action Control */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Stage Advancement Control
              </h2>
            </div>

            {/* Current Stage Highlight Box */}
            <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl space-y-2">
              <span className="text-[9px] font-black text-rose-900/60 uppercase tracking-widest block font-mono">Active Intake Status</span>
              <div className="flex items-center justify-between">
                <p className="font-black text-gray-900 text-sm">{currentStageDef.label}</p>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                  currentStageDef.type === 'terminal' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                  currentStageDef.type === 'alternate' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {currentStageDef.type.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-gray-600">{currentStageDef.desc}</p>
            </div>

            {/* Action Buttons: Primary Next Stage + Kebab Exceptions Menu */}
            <div className="space-y-3 pt-2">
              {isPermanentlyKicked ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-xs font-bold">
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Startup Permanently Terminated. Stage advancement locked.</span>
                </div>
              ) : isGraduated ? (
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2.5 text-indigo-900 text-xs font-bold">
                  <Award className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Incubator Alumni (Graduated). Stage advancement and program modifications are locked.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 relative" ref={menuRef}>
                  {/* Primary Button */}
                  {nextStageDef ? (
                    <button
                      onClick={() => handleOpenTransitionModal(nextStageDef)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold py-3 px-4 rounded-xl shadow-3xs transition-all cursor-pointer"
                      id="primary-stage-advance-btn"
                    >
                      <span>Move to {nextStageDef.label}</span>
                      <ChevronRight className="h-4 w-4 stroke-[3]" />
                    </button>
                  ) : (
                    <div className="flex-1 p-3 bg-gray-100 border border-gray-200 rounded-xl text-center text-xs font-bold text-gray-500">
                      {currentStageDef.key === 'ENROLLED' ? 'Application Fully Enrolled' : 'Terminal / Exception Stage Reached'}
                    </div>
                  )}

                  {/* Kebab Button (...) */}
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl transition-all cursor-pointer"
                    title="Exception stage options"
                    id="stage-kebab-menu-btn"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 p-2 space-y-1 text-xs">
                      <div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 font-mono border-b border-gray-100">
                        Exception / Branch Options
                      </div>

                      <button
                        onClick={() => handleOpenTransitionModal(getStageDef('WAITLISTED'))}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 text-amber-900 font-bold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span>Move to Waitlist</span>
                      </button>

                      <button
                        onClick={() => handleOpenTransitionModal(getStageDef('BACKUP_CANDIDATE'))}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-violet-50 text-violet-900 font-bold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-violet-600" />
                        <span>Move to Backup Candidate</span>
                      </button>

                      <button
                        onClick={() => handleOpenTransitionModal(getStageDef('REJECTED'))}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-900 font-bold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>Reject Application</span>
                      </button>

                      <div className="my-1 border-t border-gray-100" />

                      <button
                        onClick={handleOpenManualModal}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-700 font-bold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-gray-500" />
                        <span>Set Stage Manually...</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Visual Step Tracker Mini List */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono block">Intake Pipeline Steps</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {INTAKE_STAGES.filter(s => s.type === 'linear').map((s, i) => {
                  const currentNorm = normalizeStageKey(applicant.status);
                  const isCurrent = s.key === currentNorm;
                  const isPast = INTAKE_STAGES.findIndex(st => st.key === currentNorm) > i;

                  return (
                    <div key={s.key} className="flex items-center justify-between text-[11px] p-2 rounded-lg border bg-gray-50 border-gray-150">
                      <span className={`font-bold ${isCurrent ? 'text-primary font-extrabold' : isPast ? 'text-emerald-700' : 'text-gray-500'}`}>
                        {i + 1}. {s.label}
                      </span>
                      {isCurrent ? (
                        <span className="text-[9px] font-mono font-black text-primary bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">Active</span>
                      ) : isPast ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 4.5: Founder Portal Login Credentials */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Founder Portal Credentials
              </h2>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                Active Access
              </span>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 text-xs">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">
                  Login Email
                </span>
                <p className="font-mono font-bold text-gray-900 text-xs mt-0.5 select-all">
                  {applicant.email}
                </p>
              </div>

              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">
                  Generated Password
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono font-black text-xs bg-white border border-gray-200 px-3 py-1 rounded-lg text-primary tracking-widest shadow-2xs">
                    {showPassword ? (applicant.founder_password || 'Not Set') : (applicant.founder_password ? '••••••••' : 'Not Set')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] font-bold text-gray-500 hover:text-gray-900 underline cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="inline-flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 px-3 rounded-xl border border-gray-200 transition-all cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-gray-500" />
                <span>{copied ? 'Copied!' : 'Copy Info'}</span>
              </button>

              <button
                type="button"
                onClick={handleResendCredentialsEmail}
                disabled={resendingCredentials}
                className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all shadow-3xs cursor-pointer disabled:opacity-50"
              >
                {resendingCredentials ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Send className="h-3.5 w-3.5" />}
                <span>Send Email</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setNewPasswordInput(''); setResetModalOpen(true); }}
              className="w-full text-center text-[11px] font-bold text-gray-500 hover:text-primary transition-colors cursor-pointer py-1"
            >
              Reset / Customize Founder Password
            </button>
          </div>

          {/* Card 5: Stage History Chronological Timeline */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Stage History Timeline
              </h2>
              <span className="text-[10px] font-bold text-gray-400 font-mono">
                {stageHistory.length === 0 ? 'Baseline (0 Transitions)' : `${stageHistory.length} Transition${stageHistory.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {historyLoading ? (
              <p className="text-xs text-gray-400 italic">Loading stage history...</p>
            ) : stageHistory.length === 0 ? (
              <div className="space-y-4 relative pl-4 border-l-2 border-emerald-200">
                <div className="relative group text-xs space-y-2">
                  {/* Dot icon */}
                  <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-extrabold text-[10px] uppercase tracking-wider border border-blue-200">
                        Initial Baseline
                      </span>
                      <span className="text-primary font-black text-xs">
                        Intake Stage: {currentStageDef.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">
                      {applicant.created_at ? new Date(applicant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Intake Registration'}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-500 font-medium">
                    Logged by: <strong className="text-gray-800">System (Intake Admissions Portal)</strong>
                  </div>

                  <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-1 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 font-mono">Intake Milestone Note</span>
                      <span className="text-[9px] font-mono font-bold text-blue-800 bg-blue-100/80 border border-blue-200 px-1.5 py-0.5 rounded">
                        Active Baseline
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium leading-relaxed text-[11px]">
                      Startup application was received under <strong className="font-bold text-gray-900">{applicant.startup_name}</strong> by <strong className="font-bold text-gray-900">{applicant.name}</strong>. Currently operating at initial baseline stage <strong className="text-primary font-bold">{currentStageDef.label}</strong>. No manual stage transitions have occurred yet.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 relative pl-4 border-l-2 border-gray-150">
                {stageHistory.map((item, idx) => {
                  const prevDef = item.previous_stage ? getStageDef(item.previous_stage) : null;
                  const newDef = getStageDef(item.new_stage);

                  return (
                    <div key={item.id || idx} className="relative group text-xs space-y-1.5">
                      {/* Dot icon */}
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-rose-50" />

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 font-extrabold">
                          {prevDef && (
                            <>
                              <span className="text-gray-500">{prevDef.label}</span>
                              <ChevronRight className="h-3 w-3 text-gray-400" />
                            </>
                          )}
                          <span className="text-primary font-black">{newDef.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                          {new Date(item.change_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 font-medium">
                        Updated by: <span className="font-bold text-gray-700">{item.updated_by_email || 'Staff'}</span>
                      </div>

                      {item.comments && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Remarks / Note</span>
                            {item.include_in_email !== false ? (
                              <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Included in Email
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                                Internal Only
                              </span>
                            )}
                          </div>
                          <p className="text-gray-800 font-bold leading-relaxed">{item.comments}</p>
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

      {/* Stage Transition Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5 text-left animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="space-y-1.5 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-widest font-mono">
                <Send className="h-4 w-4 text-primary" />
                <span>Stage Advancement Confirmation</span>
              </div>
              <h3 className="text-lg font-black text-gray-900">
                Move to {isManualSelection ? (INTAKE_STAGES.find(s => s.key === customStageKey)?.label || customStageKey) : targetStage?.label}?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Transitioning application from <strong className="text-gray-900">{currentStageDef.label}</strong> → <strong className="text-primary">{isManualSelection ? (INTAKE_STAGES.find(s => s.key === customStageKey)?.label || customStageKey) : targetStage?.label}</strong>. An automated notification email will be dispatched to the candidate.
              </p>
            </div>

            <form onSubmit={handleConfirmStageTransition} className="space-y-4 text-xs">
              {/* Manual Selector Dropdown if triggered via Manual option */}
              {isManualSelection && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono block">
                    Select Target Stage
                  </label>
                  <select
                    value={customStageKey}
                    onChange={(e) => setCustomStageKey(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {INTAKE_STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label} ({s.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Remarks Textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono block">
                  Remarks / Admission Notes (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Please bring your laptop and pitch deck to orientation."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                  id="stage-remarks-textarea"
                />
              </div>

              {/* Include in email checkbox */}
              <div className="flex items-start gap-2.5 p-3 bg-gray-50 border border-gray-150 rounded-xl">
                <input
                  type="checkbox"
                  id="include-remarks-checkbox"
                  checked={includeInEmail}
                  onChange={(e) => setIncludeInEmail(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="include-remarks-checkbox" className="text-xs text-gray-700 font-bold cursor-pointer leading-snug">
                  Include these remarks in the notification email
                  <span className="block text-[10px] font-normal text-gray-500 mt-0.5">
                    If checked, the candidate will see this note styled inside their official email notification.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl shadow-3xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  id="confirm-stage-submit-btn"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Update Stage</span>
                      <ChevronRight className="h-4 w-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Founder Password Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5 text-left animate-in fade-in zoom-in duration-150">
            <div className="space-y-1.5 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest font-mono">
                <Key className="h-4 w-4" />
                <span>Reset Founder Password</span>
              </div>
              <h3 className="text-base font-black text-gray-900">
                Update Login Credentials for {applicant.startup_name}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Specify a custom password or leave blank to automatically generate a secure random password. An email with the updated credentials will be dispatched to <strong className="text-gray-900">{applicant.email}</strong>.
              </p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono block">
                  New Password (Optional)
                </label>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Leave blank to auto-generate (e.g. Tk#849201)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl shadow-3xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>Update & Dispatch Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
