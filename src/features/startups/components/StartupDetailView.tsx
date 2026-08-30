import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Building2, User, Mail, Phone, Lock, Eye, EyeOff, ShieldAlert, 
  CheckCircle2, AlertTriangle, TrendingUp, Calendar, DollarSign, History, 
  FileText, Sparkles, RefreshCw, Save, ShieldX, Ban, PlayCircle, Award,
  AlertCircle, CheckCircle, Send, RotateCcw, Plus, X
} from 'lucide-react';
import { Industry } from '../../../types/startup.types';
import { STARTUP_PROGRESS_STAGES, getStartupStageInfo } from '../../../constants/startupStages';
import { 
  fetchStartupFullDetails, 
  adminUpdateStartupProfile,
  issueStartupWarning,
  resolveStartupWarning,
  reviewStartupPivot
} from '../api/startupsApi';
import { StartupCheckinsTab } from '../../checkins/components/StartupCheckinsTab';

interface Props {
  startupId: number;
  industries: Industry[];
  onBack: () => void;
  onProfileUpdated?: () => void;
  onNavigate?: (path: string) => void;
}

export const StartupDetailView: React.FC<Props> = ({
  startupId,
  industries,
  onBack,
  onProfileUpdated,
  onNavigate
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'checkins' | 'management' | 'attendance' | 'financials' | 'warnings' | 'stage' | 'pivots' | 'audit'>('overview');

  // Password toggle
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Form Fields
  const [formData, setFormData] = useState<any>({});
  const [adminNotes, setAdminNotes] = useState('');

  // Warning Issue Form State
  const [showWarningForm, setShowWarningForm] = useState(false);
  const [warningSeverity, setWarningSeverity] = useState<'YELLOW' | 'RED'>('YELLOW');
  const [warningCategory, setWarningCategory] = useState('Attendance & Absenteeism');
  const [warningReason, setWarningReason] = useState('');
  const [issuingWarning, setIssuingWarning] = useState(false);

  // Warning Resolution State
  const [warningResolvingId, setWarningResolvingId] = useState<number | null>(null);
  const [warningResolutionNotes, setWarningResolutionNotes] = useState('');
  const [resolvingWarning, setResolvingWarning] = useState(false);

  useEffect(() => {
    loadFullDetails();
  }, [startupId]);

  const loadFullDetails = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchStartupFullDetails(startupId);
      setData(res);
      if (res.profile) {
        setFormData({
          startup_name: res.profile.startup_name || '',
          description: res.profile.description || '',
          industry_id: res.profile.industry_id || 1,
          website: res.profile.website || '',
          team_size: res.profile.team_size || 1,
          program_status: res.profile.program_status || 'ACTIVE',
          current_progress_stage: res.profile.current_progress_stage || 'IDEA_STAGE',
          revenue_status: res.profile.revenue_status || 'PRE_REVENUE',
          monthly_revenue: res.profile.monthly_revenue || 'PKR 0',
          annual_recurring_revenue: res.profile.annual_recurring_revenue || 'PKR 0',
          funding_status: res.profile.funding_status || 'BOOTSTRAPPED',
          funding_raised: res.profile.funding_raised || '0'
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load startup details');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSave = async (customPayload?: any) => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload = customPayload || {
        ...formData,
        founder_password: newPassword.trim() || undefined,
        admin_notes: adminNotes.trim() || undefined
      };

      const result = await adminUpdateStartupProfile(startupId, payload);
      setSuccessMsg(result.message || 'Startup updated successfully and notification email sent to founder!');
      setNewPassword('');
      setAdminNotes('');
      if (onProfileUpdated) onProfileUpdated();
      await loadFullDetails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleIssueWarningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningReason.trim()) {
      setErrorMsg('Please specify the exact reason for issuing this warning.');
      return;
    }
    setIssuingWarning(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await issueStartupWarning(startupId, {
        severity: warningSeverity,
        category: warningCategory,
        reason: warningReason.trim()
      });
      setSuccessMsg(result.message || `Issued ${warningSeverity} warning and dispatched email to founder.`);
      setWarningReason('');
      setShowWarningForm(false);
      await loadFullDetails();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue warning');
    } finally {
      setIssuingWarning(false);
    }
  };

  const handleResolveWarningSubmit = async (warningId: number) => {
    if (!warningResolutionNotes.trim()) {
      setErrorMsg('Please enter resolution notes before marking warning as resolved/revoked.');
      return;
    }
    setResolvingWarning(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await resolveStartupWarning(warningId, {
        status: 'RESOLVED',
        resolution_notes: warningResolutionNotes.trim()
      });
      setSuccessMsg(result.message || 'Warning marked as resolved and email notification sent to founder.');
      setWarningResolvingId(null);
      setWarningResolutionNotes('');
      await loadFullDetails();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resolve warning');
    } finally {
      setResolvingWarning(false);
    }
  };

  // Pivot Review State
  const [reviewingPivotId, setReviewingPivotId] = useState<number | null>(null);
  const [pivotReviewAction, setPivotReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [pivotAdminRemarks, setPivotAdminRemarks] = useState('');
  const [submittingPivotReview, setSubmittingPivotReview] = useState(false);

  const handleReviewPivotSubmit = async (pivotId: number, action: 'APPROVE' | 'REJECT') => {
    setSubmittingPivotReview(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await reviewStartupPivot(pivotId, {
        action,
        admin_remarks: pivotAdminRemarks.trim() || undefined
      });
      setSuccessMsg(res.message || `Pivot request ${action.toLowerCase()}d successfully.`);
      setReviewingPivotId(null);
      setPivotAdminRemarks('');
      await loadFullDetails();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to ${action.toLowerCase()} pivot request`);
    } finally {
      setSubmittingPivotReview(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 border border-gray-200 rounded-3xl text-center space-y-3">
        <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
        <p className="text-sm font-bold text-gray-700">Loading complete startup dossier...</p>
      </div>
    );
  }

  if (!data || !data.profile) {
    return (
      <div className="bg-white p-8 border border-gray-200 rounded-3xl text-center space-y-4">
        <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-gray-800">Startup Profile Not Found</p>
        <button onClick={onBack} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold">
          &larr; Return to Active Startups
        </button>
      </div>
    );
  }

  const { profile, attendance, financials, stage_history, pivots, audit_logs, warnings = [] } = data;
  const activeWarnings = warnings.filter((w: any) => w.status === 'ACTIVE');
  const currentStageInfo = getStartupStageInfo(profile.current_progress_stage);

  return (
    <div className="space-y-6 text-left">
      
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Active Startups Directory
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-gray-500">Startup ID: #{profile.id}</span>
          <span className="text-xs font-mono font-bold text-gray-500">&bull; Token: {profile.founder_tracking_token || 'N/A'}</span>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 font-black">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 font-black">Dismiss</button>
        </div>
      )}

      {/* Active Warning Banner */}
      {activeWarnings.length > 0 && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl text-xs font-bold text-amber-900 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 animate-bounce" />
            <div>
              <p className="font-black text-amber-950 uppercase tracking-wide">
                ⚠️ Active Performance Warning In Effect ({activeWarnings.length})
              </p>
              <p className="text-[11px] font-medium text-amber-800 mt-0.5">
                {activeWarnings[0].severity} Warning issued by {activeWarnings[0].issued_by}: "{activeWarnings[0].reason}"
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('warnings');
              setShowWarningForm(false);
            }}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs"
          >
            Review & Resolve Warnings &rarr;
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-primary p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 p-2 flex items-center justify-center shrink-0 shadow-inner">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt={profile.startup_name} className="h-full w-full object-contain rounded-xl" />
              ) : (
                <Building2 className="h-8 w-8 text-white/80" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">{profile.startup_name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase font-mono border ${
                  profile.program_status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  profile.program_status === 'PAUSED' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  profile.program_status === 'GRADUATED' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' :
                  profile.program_status === 'NOT_ENROLLED' ? 'bg-gray-500/20 text-gray-300 border-gray-500/40' :
                  'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {profile.program_status === 'ACTIVE' ? '🟢 Active Startup' : 
                   profile.program_status === 'PAUSED' ? '🟡 Paused' : 
                   profile.program_status === 'GRADUATED' ? '🎓 Graduated' : 
                   profile.program_status === 'NOT_ENROLLED' ? '⚪ Not Enrolled' : 
                   '🔴 Kicked Out / Terminated'}
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium mt-1 line-clamp-2 max-w-2xl">
                {profile.description || 'No description provided.'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-bold text-gray-300">
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">Industry: {profile.industry_name || 'General'}</span>
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">Cohort: {profile.cohort_name || 'Cohort 1'}</span>
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  Stage: {currentStageInfo.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch md:items-end gap-2 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('management')}
              className="px-4 py-2.5 bg-white text-gray-900 hover:bg-gray-100 font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Lock className="h-4 w-4 text-primary" />
              Admin Actions & Password
            </button>
          </div>

        </div>
      </div>

      {/* ADMIN QUICK ACTION BAR */}
      <div className="bg-white border-2 border-primary/20 p-5 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Instant Admin Control Panel</h3>
          </div>
          <span className="text-[10px] font-bold font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            Auto-Dispatches Email to Founder on Any Change
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          
          {/* Quick Status Control */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 flex flex-col justify-between">
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wide block mb-2">Account & Program Status</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                <button
                  onClick={() => handleAdminSave({ program_status: 'ACTIVE' })}
                  disabled={saving || profile.program_status === 'ACTIVE'}
                  className="py-1.5 px-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-40 cursor-pointer text-center"
                >
                  <PlayCircle className="h-3 w-3 shrink-0" />
                  <span>Active</span>
                </button>
                <button
                  onClick={() => handleAdminSave({ program_status: 'PAUSED' })}
                  disabled={saving || profile.program_status === 'PAUSED'}
                  className="py-1.5 px-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-40 cursor-pointer text-center"
                >
                  <Ban className="h-3 w-3 shrink-0" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={() => handleAdminSave({ program_status: 'GRADUATED' })}
                  disabled={saving || profile.program_status === 'GRADUATED'}
                  className="py-1.5 px-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-40 cursor-pointer text-center"
                >
                  <Award className="h-3 w-3 shrink-0" />
                  <span>Graduate</span>
                </button>
                <button
                  onClick={() => handleAdminSave({ program_status: 'KICKED_OUT' })}
                  disabled={saving || profile.program_status === 'KICKED_OUT'}
                  className="py-1.5 px-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-40 cursor-pointer text-center"
                >
                  <ShieldX className="h-3 w-3 shrink-0" />
                  <span>Kick Out</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 font-medium mt-1">Updates status & sends explanation email.</p>
          </div>

          {/* Quick Password Reset */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 flex flex-col justify-between">
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wide block mb-2">Change Founder Password</label>
              <div className="flex items-center gap-1.5 min-w-0">
                <input
                  type="text"
                  placeholder="New password..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full min-w-0 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-primary placeholder:text-gray-400 placeholder:font-sans placeholder:text-[11px]"
                />
                <button
                  onClick={() => handleAdminSave({ founder_password: newPassword })}
                  disabled={saving || !newPassword.trim()}
                  className="shrink-0 px-2.5 py-1.5 bg-primary text-white hover:bg-primary-dark font-bold text-[11px] rounded-xl transition-all disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  Save & Email
                </button>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 font-medium mt-1 truncate">
              Current password: <span className="font-mono font-bold text-gray-800">{profile.founder_password || profile.founders?.find((f: any) => f.role === 'PRIMARY' || f.id === profile.applicant_id)?.founder_password || profile.founders?.[0]?.founder_password || 'Not set'}</span>
            </p>
          </div>

          {/* Quick Stage Progression */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 flex flex-col justify-between">
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wide block mb-2">Advance Progress Stage</label>
              <select
                value={formData.current_progress_stage}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({ ...formData, current_progress_stage: val });
                  handleAdminSave({ current_progress_stage: val });
                }}
                disabled={saving}
                className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-primary truncate"
              >
                {STARTUP_PROGRESS_STAGES.map(stg => (
                  <option key={stg.key} value={stg.key}>{stg.label}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-gray-500 font-medium mt-1 truncate">Current: {currentStageInfo.name}</p>
          </div>

          {/* Quick Issue Warning Action */}
          <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-300/60 space-y-2 flex flex-col justify-between">
            <div>
              <label className="text-xs font-black text-amber-900 uppercase tracking-wide block mb-2 flex items-center justify-between">
                <span>Performance Notice</span>
                {activeWarnings.length > 0 && <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded-full font-bold">{activeWarnings.length} Active</span>}
              </label>
              <button
                onClick={() => {
                  setActiveTab('warnings');
                  setShowWarningForm(true);
                }}
                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Issue Warning & Email</span>
              </button>
            </div>
            <p className="text-[10px] text-amber-800 font-medium mt-1">Flag attendance, performance or policies.</p>
          </div>

        </div>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-1.5 flex flex-wrap gap-1 shadow-2xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'overview' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📋 Dossier Overview
        </button>
        <button
          onClick={() => setActiveTab('checkins')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'checkins' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🤝 1-on-1 Check-ins
        </button>
        <button
          onClick={() => setActiveTab('management')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'management' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          ✏️ Edit Details & Credentials
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'attendance' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📅 Attendance Report ({attendance?.attendance_rate || 100}%)
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'financials' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          💵 Income & Financials
        </button>
        <button
          onClick={() => setActiveTab('warnings')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'warnings' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Warnings ({warnings.length})
          {activeWarnings.length > 0 && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {activeWarnings.length} Active
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('stage')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'stage' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📈 Stage History ({stage_history?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('pivots')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'pivots' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🔄 Pivots ({pivots?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'audit' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🛡️ Audit Trail ({audit_logs?.length || 0})
        </button>
      </div>

      {/* TAB: CHECK-INS */}
      {activeTab === 'checkins' && (
        <StartupCheckinsTab
          startupId={profile.id}
          startupName={profile.startup_name}
          cohortId={profile.cohort_id}
          cohortName={profile.cohort_name}
          onNavigate={onNavigate}
        />
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Primary Dossier */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Primary Founder Card */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Primary Founder & Account Credentials</h3>
                </div>
                <span className="text-xs font-mono font-bold text-gray-500">ID: #{profile.applicant_id}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Founder Name</p>
                  <p className="font-black text-gray-900 text-sm mt-0.5">{profile.founder_name || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Email Address</p>
                  <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">{profile.founder_email}</p>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Phone Number</p>
                  <p className="font-mono font-bold text-gray-900 mt-0.5">{profile.founder_phone || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-400 uppercase">CNIC / Govt ID</p>
                  <p className="font-mono font-bold text-gray-900 mt-0.5">{profile.founder_cnic || 'N/A'}</p>
                </div>
                <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200 sm:col-span-2 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-rose-800 uppercase">Portal Login Password</p>
                    <p className="font-mono font-black text-rose-950 text-sm mt-0.5">
                      {showPassword 
                        ? (profile.founder_password || profile.founders?.find((f: any) => f.role === 'PRIMARY' || f.id === profile.applicant_id)?.founder_password || profile.founders?.[0]?.founder_password || 'Not set') 
                        : '••••••••••••'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-1.5 bg-white text-rose-800 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPassword ? 'Hide Password' : 'Show Password'}
                  </button>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Startup Team & Co-Founders</h3>
                </div>
                <span className="text-xs font-mono font-bold bg-gray-100 px-2.5 py-0.5 rounded-full">
                  Total Team: {profile.team_size || profile.founders?.length || 1}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {(profile.founders || []).map((f: any) => (
                  <div key={f.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-black text-gray-900">{f.name}</p>
                      <p className="font-mono text-gray-500">{f.email} &bull; {f.phone || 'No phone'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase font-mono ${
                      f.role === 'PRIMARY' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {f.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Application Questionnaire Responses */}
            {profile.form_data && (
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Intake Application Form Responses</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 max-h-80 overflow-y-auto font-mono text-xs text-gray-800 space-y-2">
                  {typeof profile.form_data === 'object' ? (
                    Object.entries(profile.form_data).map(([k, v]: any) => (
                      <div key={k} className="border-b border-gray-200 pb-2">
                        <span className="font-bold text-gray-900 capitalize">{k.replace(/_/g, ' ')}:</span>
                        <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">{String(profile.form_data)}</p>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Column 3: Stats & Metrics */}
          <div className="space-y-6">
            
            {/* Quick Metrics */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Key Performance Indicators</h3>
              
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">Monthly Revenue (MRR)</p>
                    <p className="text-lg font-black text-emerald-950 mt-0.5">{financials.monthly_revenue}</p>
                  </div>
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-blue-800 uppercase">Attendance Compliance</p>
                    <p className="text-lg font-black text-blue-950 mt-0.5">{attendance.attendance_rate}%</p>
                  </div>
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>

                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-purple-800 uppercase">Funding Raised</p>
                    <p className="text-lg font-black text-purple-950 mt-0.5">{financials.funding_raised || '0'}</p>
                  </div>
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Social & Website Links */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Web & Digital Footprint</h3>
              <p className="text-xs font-bold text-gray-800 flex items-center gap-2">
                <span className="text-gray-400">Website:</span> 
                {profile.website ? <a href={profile.website} target="_blank" rel="noreferrer" className="text-primary underline">{profile.website}</a> : 'Not added'}
              </p>
              <div className="text-xs space-y-1">
                <p className="font-bold text-gray-400">Social Links:</p>
                {profile.social_links && typeof profile.social_links === 'object' ? (
                  Object.entries(profile.social_links).map(([k, v]: any) => (
                    <p key={k} className="text-gray-700 font-mono"><strong className="capitalize">{k}:</strong> {String(v)}</p>
                  ))
                ) : (
                  <p className="text-gray-500">No social links logged.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: EDIT DETAILS & CREDENTIALS */}
      {activeTab === 'management' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900">Comprehensive Admin Master Profile Editor</h3>
              <p className="text-xs text-gray-500 font-medium">
                Admin can update startup information, password, stage, and revenue figures here. All edits send an email to the founder.
              </p>
            </div>
            <button
              onClick={() => handleAdminSave()}
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-white hover:bg-primary-dark rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving & Dispatching Email...' : 'Save All Changes & Notify Founder'}
            </button>
          </div>

          <div className="space-y-6">
            
            {/* Admin Notes / Email Message */}
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2">
              <label className="text-xs font-black text-amber-900 uppercase tracking-wider block">Admin Remarks / Message Included in Notification Email</label>
              <textarea
                rows={2}
                placeholder="E.g., Updated password per request, advanced stage to MVP after review call..."
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl p-3 text-xs font-medium text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-medium">
              
              <div className="space-y-2">
                <label className="font-black text-gray-700 uppercase tracking-wide block">Startup Name</label>
                <input
                  type="text"
                  value={formData.startup_name || ''}
                  onChange={e => setFormData({ ...formData, startup_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 font-bold text-gray-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="font-black text-gray-700 uppercase tracking-wide block">Industry Sector</label>
                <select
                  value={formData.industry_id || ''}
                  onChange={e => setFormData({ ...formData, industry_id: parseInt(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 font-bold text-gray-900 focus:outline-none focus:border-primary"
                >
                  {industries.map(ind => (
                    <option key={ind.id} value={ind.id}>{ind.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="font-black text-gray-700 uppercase tracking-wide block">Startup Description</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 font-medium text-gray-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="font-black text-gray-700 uppercase tracking-wide block">Team Size</label>
                <input
                  type="number"
                  value={formData.team_size || 1}
                  onChange={e => setFormData({ ...formData, team_size: parseInt(e.target.value) || 1 })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 font-bold text-gray-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="font-black text-gray-700 uppercase tracking-wide block">Website URL</label>
                <input
                  type="text"
                  value={formData.website || ''}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 font-bold text-gray-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="font-black text-gray-700 uppercase tracking-wide block">Revenue Status</label>
                <select
                  value={formData.revenue_status || 'PRE_REVENUE'}
                  onChange={e => setFormData({ ...formData, revenue_status: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 font-bold text-gray-900 focus:outline-none focus:border-primary"
                >
                  <option value="PRE_REVENUE">PRE_REVENUE (Idea/Validation)</option>
                  <option value="POST_REVENUE">POST_REVENUE (Generating Income)</option>
                  <option value="PROFITABLE">PROFITABLE</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="font-black text-gray-700 uppercase tracking-wide block">Monthly Revenue (MRR)</label>
                <input
                  type="text"
                  placeholder="e.g., PKR 150,000"
                  value={formData.monthly_revenue || ''}
                  onChange={e => setFormData({ ...formData, monthly_revenue: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 font-bold text-gray-900 focus:outline-none focus:border-primary"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => handleAdminSave()}
                disabled={saving}
                className="px-6 py-3 bg-primary text-white hover:bg-primary-dark rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving Changes...' : 'Save Profile & Email Founder'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE REPORT */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-2xl text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Attendance Rate</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{attendance.attendance_rate}%</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-2xl text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Total Sessions</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{attendance.total_sessions}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-2xl text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Sessions Attended</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{attendance.present_count}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-2xl text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Absences</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{attendance.absent_count}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Cohort Workshop & Mentorship Session Log</h3>
              <span className="text-xs font-mono font-bold text-gray-500">{attendance.records.length} session(s) logged</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 font-mono text-[11px] font-bold text-gray-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Session Title</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Marked Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {attendance.records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                      No cohort session attendance records logged yet for this startup.
                    </td>
                  </tr>
                ) : (
                  attendance.records.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-black text-gray-900">{rec.session_title || 'Cohort Workshop Session'}</td>
                      <td className="py-3 px-4 font-mono text-gray-600">{rec.session_date ? new Date(rec.session_date).toLocaleDateString() : 'N/A'}</td>
                      <td className="py-3 px-4 font-bold text-gray-600">{rec.session_type || 'WORKSHOP'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase ${
                          String(rec.status).toUpperCase() === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                          String(rec.status).toUpperCase() === 'ABSENT' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIALS */}
      {activeTab === 'financials' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Startup Income & Revenue Performance Report</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Track recurring revenue figures, investment status, and capital raised.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 space-y-2">
              <p className="text-[11px] font-bold text-emerald-800 uppercase">Monthly Recurring Revenue (MRR)</p>
              <p className="text-2xl font-black text-emerald-950">{financials.monthly_revenue}</p>
              <p className="text-[11px] text-emerald-700">Calculated based on latest monthly financial check-ins.</p>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200 space-y-2">
              <p className="text-[11px] font-bold text-blue-800 uppercase">Revenue Status Classification</p>
              <p className="text-xl font-black text-blue-950 uppercase">{financials.revenue_status}</p>
              <p className="text-[11px] text-blue-700">Program classification for seed & incubation tracking.</p>
            </div>

            <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-200 space-y-2">
              <p className="text-[11px] font-bold text-purple-800 uppercase">Funding & Grants Raised</p>
              <p className="text-2xl font-black text-purple-950">{financials.funding_raised || 'PKR 0'}</p>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-2">
              <p className="text-[11px] font-bold text-gray-600 uppercase">Funding Stage</p>
              <p className="text-xl font-black text-gray-900 uppercase">{financials.funding_status}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STAGE HISTORY */}
      {/* TAB: WARNINGS & NOTICES */}
      {activeTab === 'warnings' && (
        <div className="space-y-6">
          
          {/* Header & Issue Button Bar */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Performance & Attendance Warnings Management
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Issue official performance or attendance warnings to this startup founder. An automated official email will be sent immediately upon issuance or resolution.
              </p>
            </div>
            <button
              onClick={() => setShowWarningForm(!showWarningForm)}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
            >
              {showWarningForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showWarningForm ? 'Cancel Form' : 'Raise New Warning & Email Founder'}
            </button>
          </div>

          {/* Issue Warning Form Card */}
          {showWarningForm && (
            <form onSubmit={handleIssueWarningSubmit} className="bg-amber-500/5 border-2 border-amber-500/30 rounded-3xl p-6 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Issue Official Startup Warning
                </h4>
                <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  Dispatches Email Notification to Founder
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 uppercase tracking-wide block">
                    Warning Severity Level *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWarningSeverity('YELLOW')}
                      className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        warningSeverity === 'YELLOW'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-amber-50'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      YELLOW (Notice)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWarningSeverity('RED')}
                      className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        warningSeverity === 'RED'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-rose-50'
                      }`}
                    >
                      <ShieldAlert className="h-4 w-4" />
                      RED (Critical Warning)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 uppercase tracking-wide block">
                    Warning Category *
                  </label>
                  <select
                    value={warningCategory}
                    onChange={e => setWarningCategory(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Attendance & Absenteeism">Attendance & Absenteeism (Unexcused absences)</option>
                    <option value="Performance & Deliverables">Performance & Deliverables (Missing KPIs / Deadlines)</option>
                    <option value="Weekly Progress Logs">Weekly Progress Logs (Failure to submit reports)</option>
                    <option value="Policy & Conduct">Policy & Incubator Conduct Violation</option>
                    <option value="Other">Other Administrative Notice</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wide block">
                  Detailed Explanation / Reason for Warning *
                </label>
                <textarea
                  rows={3}
                  value={warningReason}
                  onChange={e => setWarningReason(e.target.value)}
                  placeholder="State clearly why this warning is being issued (e.g. Founder missed 3 consecutive mandatory mentoring sessions without prior approval)..."
                  className="w-full bg-white border border-gray-300 rounded-2xl p-3 text-xs font-medium text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWarningForm(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuingWarning || !warningReason.trim()}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  {issuingWarning ? 'Dispatching Email...' : 'Issue Warning & Dispatch Email'}
                </button>
              </div>
            </form>
          )}

          {/* Active Warnings Section */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Active Warnings ({activeWarnings.length})
              </h4>
              <span className="text-[10px] font-mono text-gray-400">Requires Staff Resolution or Revocation</span>
            </div>

            {activeWarnings.length === 0 ? (
              <div className="p-8 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-center space-y-1">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-900">No Active Warnings</p>
                <p className="text-[11px] text-emerald-700">This startup is currently in good standing with Takhleeq incubator policies.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeWarnings.map((w: any) => (
                  <div
                    key={w.id}
                    className={`p-5 rounded-2xl border-2 space-y-3 transition-all ${
                      w.severity === 'RED' ? 'bg-rose-50/60 border-rose-200' : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono border ${
                          w.severity === 'RED' ? 'bg-rose-600 text-white border-rose-700' : 'bg-amber-500 text-white border-amber-600'
                        }`}>
                          {w.severity} WARNING
                        </span>
                        <span className="text-xs font-bold text-gray-900">{w.category || 'Administrative'}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-gray-500">
                        Issued: {w.created_at ? new Date(w.created_at).toLocaleString() : 'N/A'} by {w.issued_by}
                      </span>
                    </div>

                    <p className="text-xs text-gray-800 font-medium leading-relaxed bg-white/80 p-3 rounded-xl border border-gray-200/50">
                      "{w.reason}"
                    </p>

                    {/* Inline Resolution Controls */}
                    {warningResolvingId === w.id ? (
                      <div className="bg-white p-4 rounded-xl border border-gray-300 space-y-3 animate-in fade-in">
                        <label className="text-[11px] font-black text-gray-700 uppercase block">
                          Resolution / Revocation Remarks for Founder *
                        </label>
                        <textarea
                          rows={2}
                          value={warningResolutionNotes}
                          onChange={e => setWarningResolutionNotes(e.target.value)}
                          placeholder="Provide resolution details (e.g., Founder submitted makeup progress reports and attended makeup mentoring session)..."
                          className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:border-primary"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setWarningResolvingId(null);
                              setWarningResolutionNotes('');
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveWarningSubmit(w.id)}
                            disabled={resolvingWarning || !warningResolutionNotes.trim()}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {resolvingWarning ? 'Resolving...' : 'Confirm Resolve & Email Founder'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setWarningResolvingId(w.id);
                            setWarningResolutionNotes('');
                          }}
                          className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          Resolve / Clear Warning
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical Resolved / Revoked Warnings */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <History className="h-4 w-4 text-gray-500" />
                Warning History & Resolved Records ({warnings.filter((w: any) => w.status !== 'ACTIVE').length})
              </h4>
            </div>

            {warnings.filter((w: any) => w.status !== 'ACTIVE').length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No resolved warning records in history.</p>
            ) : (
              <div className="space-y-3">
                {warnings.filter((w: any) => w.status !== 'ACTIVE').map((w: any) => (
                  <div key={w.id} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md text-[10px] font-bold font-mono">
                          {w.status}
                        </span>
                        <span className="font-bold text-gray-800">{w.severity} - {w.category}</span>
                      </div>
                      <span className="font-mono text-[10px] text-gray-400">
                        Resolved: {w.resolved_at ? new Date(w.resolved_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <p className="text-gray-600"><strong>Original Warning:</strong> "{w.reason}"</p>
                    {w.resolution_notes && (
                      <p className="text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 font-medium text-[11px]">
                        <strong>Resolution Notes:</strong> {w.resolution_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 5: STAGE HISTORY */}
      {activeTab === 'stage' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Historical Progress Stage Timeline</h3>
            <p className="text-xs text-gray-500">Every transition approved by Takhleeq staff is logged with timestamp and remarks.</p>
          </div>

          <div className="space-y-3">
            {stage_history.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No progress stage transitions logged yet.</p>
            ) : (
              stage_history.map((stg: any) => (
                <div key={stg.id} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-gray-900">
                      {stg.previous_stage || 'Initial'} &rarr; <span className="text-primary">{stg.new_stage}</span>
                    </span>
                    <span className="font-mono text-gray-400 text-[10px]">{stg.change_date ? new Date(stg.change_date).toLocaleString() : ''}</span>
                  </div>
                  <p className="text-gray-600">Updated by: <span className="font-bold text-gray-800">{stg.updated_by_email}</span></p>
                  {stg.comments && <p className="text-gray-500 italic mt-1">"{stg.comments}"</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: PIVOTS */}
      {activeTab === 'pivots' && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  Strategic Pivots & Business Model Evolution
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-gray-400">
                Total Records: {pivots.length}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Audit founder-submitted strategic direction changes, validate hypotheses, and approve profile transitions.
            </p>
          </div>

          {/* Pending Reviews Section */}
          {pivots.filter((p: any) => p.status === 'PENDING').length > 0 && (
            <div className="bg-amber-50/60 border-2 border-amber-300/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Action Required: Pending Pivot Requests ({pivots.filter((p: any) => p.status === 'PENDING').length})
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-amber-800 uppercase font-mono">Awaiting Decision</span>
              </div>

              <div className="space-y-4">
                {pivots.filter((p: any) => p.status === 'PENDING').map((p: any) => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-amber-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
                      <span className="font-extrabold text-gray-900">Request #{p.id}</span>
                      <span className="font-mono text-gray-400 text-[11px]">
                        Submitted: {p.requested_at ? new Date(p.requested_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                        <span className="font-bold text-gray-400 uppercase text-[9px] block">Previous Baseline</span>
                        <p className="font-bold text-gray-800">{p.previous_industry_name || p.previous_industry || profile.industry_name || 'Standard Baseline'}</p>
                        <p className="text-gray-600 text-[11px]">{p.previous_idea_description || profile.description}</p>
                      </div>

                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                        <span className="font-bold text-emerald-800 uppercase text-[9px] block">Proposed Pivot Target</span>
                        <p className="font-extrabold text-emerald-950">{p.new_industry || p.new_industry_name}</p>
                        <p className="text-emerald-900 text-[11px]">{p.new_idea_description || p.new_idea}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-amber-900 uppercase text-[9px] block">Founder Validation Reason & Hypothesis:</span>
                      <p className="text-amber-950 font-medium">{p.reason}</p>
                    </div>

                    {/* Review Form / Buttons */}
                    {reviewingPivotId === p.id ? (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in text-xs">
                        <label className="font-bold text-gray-700 uppercase text-[10px] block">
                          Review Remarks / Feedback to Founder (Optional):
                        </label>
                        <textarea
                          rows={2}
                          value={pivotAdminRemarks}
                          onChange={(e) => setPivotAdminRemarks(e.target.value)}
                          placeholder="e.g., Approved after discussion in weekly mentor checkin. Strategic fit with current market demand."
                          className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:border-primary"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingPivotId(null);
                              setPivotAdminRemarks('');
                            }}
                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={submittingPivotReview}
                            onClick={() => handleReviewPivotSubmit(p.id, 'REJECT')}
                            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" />
                            {submittingPivotReview ? 'Saving...' : 'Reject Request'}
                          </button>
                          <button
                            type="button"
                            disabled={submittingPivotReview}
                            onClick={() => handleReviewPivotSubmit(p.id, 'APPROVE')}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {submittingPivotReview ? 'Applying...' : 'Approve & Update Profile'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingPivotId(p.id);
                            setPivotReviewAction('APPROVE');
                            setPivotAdminRemarks('');
                          }}
                          className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Review Pivot Request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historical Resolved Pivots */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <History className="h-4 w-4 text-gray-500" />
                Historical Pivot Decisions ({pivots.filter((p: any) => p.status !== 'PENDING').length})
              </h4>
            </div>

            {pivots.filter((p: any) => p.status !== 'PENDING').length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No resolved pivot history for this startup.</p>
            ) : (
              <div className="space-y-3">
                {pivots.filter((p: any) => p.status !== 'PENDING').map((p: any) => (
                  <div key={p.id} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-gray-900 border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span>Pivot Record #{p.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                          p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-gray-400">
                        {p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString() : p.pivot_date ? new Date(p.pivot_date).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-2.5 bg-white border border-gray-150 rounded-xl">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Previous Scope</span>
                        <p className="font-bold text-gray-800">{p.previous_industry_name || p.previous_industry || 'Baseline'}</p>
                        <p className="text-gray-600 text-[11px] mt-0.5">{p.previous_idea_description || 'Original profile concept'}</p>
                      </div>
                      <div className="p-2.5 bg-emerald-50/40 border border-emerald-150 rounded-xl">
                        <span className="text-[9px] font-bold text-emerald-800 uppercase block mb-0.5">New Direction</span>
                        <p className="font-extrabold text-emerald-950">{p.new_industry || p.new_industry_name || 'Target Industry'}</p>
                        <p className="text-emerald-900 text-[11px] mt-0.5">{p.new_idea_description || p.new_idea}</p>
                      </div>
                    </div>

                    <div className="text-gray-700 bg-white p-2.5 rounded-xl border border-gray-150">
                      <strong>Founder Validation Rationale:</strong> {p.reason}
                    </div>

                    {p.admin_remarks && (
                      <div className="text-emerald-900 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-[11px]">
                        <strong>Review Remarks:</strong> {p.admin_remarks} (Reviewed by: {p.reviewed_by_email || p.approved_by_email || 'Incubator Admin'})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 7: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">System Audit Trail</h3>
            <p className="text-xs text-gray-500">Log of all profile changes and administrative edits.</p>
          </div>

          <div className="divide-y divide-gray-150 text-xs">
            {audit_logs.length === 0 ? (
              <p className="text-gray-400 py-6 text-center">No audit log entries found.</p>
            ) : (
              audit_logs.map((log: any) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900">{log.field_name}:</span>{' '}
                    <span className="text-gray-500">{log.old_value || 'None'}</span> &rarr;{' '}
                    <span className="text-primary font-bold">{log.new_value}</span>
                  </div>
                  <div className="text-right font-mono text-[10px] text-gray-400">
                    <div>{log.changed_by_email}</div>
                    <div>{log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
