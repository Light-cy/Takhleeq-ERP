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
  initialApplicant?: any;
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
  initialApplicant,
  onBack,
  currentUser,
  fetchWithAuth,
  triggerSuccess,
  triggerError,
  formSettings,
  selectedCohort,
  onNavigate
}) => {
  const [applicant, setApplicant] = useState<any>(() => initialApplicant || null);
  const [parentRecord, setParentRecord] = useState<any>(() => initialApplicant?.parent || null);
  const [stageHistory, setStageHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(() => !initialApplicant);
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
    if (!applicant) {
      setLoading(true);
    }
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

  // Authentic chronological events for the application intake lifecycle
  const timelineEvents = React.useMemo(() => {
    const list: Array<{
      id: string | number;
      type: 'submission' | 'transition';
      previous_stage?: string | null;
      new_stage: string;
      actor: string;
      date: string;
      comments?: string | null;
      include_in_email?: boolean;
    }> = [];

    const applicantCreatedTime = applicant.created_at ? new Date(applicant.created_at).getTime() : 0;

    // Filter out any stale ghost history that predates the applicant's creation date
    const relevantHistory = stageHistory.filter((item) => {
      if (!applicantCreatedTime) return true;
      const itemTime = item.change_date ? new Date(item.change_date).getTime() : 0;
      return itemTime >= applicantCreatedTime - 60000;
    });

    let hasSubmissionRecorded = false;

    relevantHistory.forEach((item, index) => {
      const isSub = !item.previous_stage || item.comments === 'Application Form Submitted' || (typeof item.previous_stage === 'string' && item.previous_stage.includes('@'));
      if (isSub) {
        if (hasSubmissionRecorded) return; // Prevent duplicate submission markers
        hasSubmissionRecorded = true;
      }

      const actorEmail = (typeof item.previous_stage === 'string' && item.previous_stage.includes('@'))
        ? item.previous_stage
        : (item.updated_by_email || (isSub ? applicant.email : 'Admissions Staff'));

      list.push({
        id: item.id || `hist-${index}`,
        type: isSub ? 'submission' : 'transition',
        previous_stage: (typeof item.previous_stage === 'string' && item.previous_stage.includes('@')) ? null : item.previous_stage,
        new_stage: item.new_stage || 'APPLIED',
        actor: actorEmail,
        date: item.change_date || applicant.created_at,
        comments: item.comments,
        include_in_email: item.include_in_email
      });
    });

    if (!hasSubmissionRecorded && applicant.created_at) {
      list.push({
        id: 'submission-init',
        type: 'submission',
        previous_stage: null,
        new_stage: 'APPLIED',
        actor: applicant.email,
        date: applicant.created_at,
        comments: 'Application Form Submitted',
        include_in_email: true
      });
    }

    // Sort descending by date (most recent first)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stageHistory, applicant.created_at, applicant.email]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-left" id="application-full-details-view">
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
              {currentStageDef.type === 'terminal' ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-xs font-bold">
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Application {currentStageDef.label}. Admissions review concluded.</span>
                </div>
              ) : currentStageDef.key === 'ENROLLED' ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-900 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Application Confirmed & Enrolled into Cohort.</span>
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
                      Terminal / Final Stage Reached
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
                {timelineEvents.length} Event{timelineEvents.length !== 1 ? 's' : ''}
              </span>
            </div>

            {historyLoading ? (
              <p className="text-xs text-gray-400 italic">Loading stage history...</p>
            ) : timelineEvents.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl text-center text-xs text-gray-500 font-medium">
                No stage history recorded yet.
              </div>
            ) : (
              <div className="space-y-4 relative pl-4 border-l-2 border-gray-150">
                {timelineEvents.map((evt) => {
                  const isSub = evt.type === 'submission';
                  const newDef = getStageDef(evt.new_stage);
                  const prevDef = evt.previous_stage ? getStageDef(evt.previous_stage) : null;

                  return (
                    <div key={evt.id} className="relative group text-xs space-y-1.5">
                      {/* Dot icon */}
                      <div
                        className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ${
                          isSub
                            ? 'bg-emerald-500 ring-emerald-50'
                            : newDef.type === 'terminal'
                            ? 'bg-rose-500 ring-rose-50'
                            : 'bg-primary ring-rose-50'
                        }`}
                      />

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 font-extrabold">
                          {isSub ? (
                            <span className="text-emerald-700 font-black">Application Submitted</span>
                          ) : (
                            <>
                              {prevDef && (
                                <>
                                  <span className="text-gray-500 font-bold">{prevDef.label}</span>
                                  <ChevronRight className="h-3 w-3 text-gray-400" />
                                </>
                              )}
                              <span className="text-primary font-black">{newDef.label}</span>
                            </>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                          {evt.date
                            ? new Date(evt.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '—'}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 font-medium">
                        {isSub ? 'Submitted by:' : 'Updated by:'}{' '}
                        <span className="font-bold text-gray-700">{evt.actor}</span>
                      </div>

                      {evt.comments && evt.comments !== 'Application Form Submitted' && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">
                              Remarks / Feedback
                            </span>
                            {evt.include_in_email !== false ? (
                              <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Sent in Candidate Email
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                                Internal Staff Note
                              </span>
                            )}
                          </div>
                          <p className="text-gray-800 font-semibold leading-relaxed">{evt.comments}</p>
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
