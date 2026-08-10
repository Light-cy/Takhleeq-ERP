import React, { useState, useEffect } from 'react';
import { 
  X, Building2, Globe, Sparkles, Check, Clock, TrendingUp, AlertCircle, 
  History, ShieldAlert, ArrowRight, RotateCcw, Edit3, Plus, User, Mail, Phone,
  FileText, CheckCircle2, Lock
} from 'lucide-react';
import { StartupProfile, Industry, StartupProgressStage, StartupStageHistory, StartupPivot, StartupAuditLog } from '../../../types/startup.types';
import { STARTUP_PROGRESS_STAGES, getStartupStageInfo, getStartupStageIndex } from '../../../constants/startupStages';
import { 
  updateStartupProfile, 
  updateStartupProgressStage, 
  fetchStageHistory, 
  recordStartupPivot, 
  fetchStartupPivots, 
  fetchStartupAuditLogs, 
  revertStartupAuditLog 
} from '../api/startupsApi';

interface Props {
  profile: StartupProfile | null;
  industries: Industry[];
  isStaff: boolean;
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const StartupProfileDetailModal: React.FC<Props> = ({
  profile,
  industries,
  isStaff,
  onClose,
  onProfileUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'team' | 'stage' | 'pivots' | 'audit'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<StartupProfile>>({});

  // History & Pivots state
  const [stageHistory, setStageHistory] = useState<StartupStageHistory[]>([]);
  const [pivots, setPivots] = useState<StartupPivot[]>([]);
  const [auditLogs, setAuditLogs] = useState<StartupAuditLog[]>([]);

  // Stage update modal state
  const [showStageModal, setShowStageModal] = useState(false);
  const [targetStage, setTargetStage] = useState<StartupProgressStage>('IDEA_STAGE');
  const [stageComments, setStageComments] = useState('');

  // Pivot modal state
  const [showPivotModal, setShowPivotModal] = useState(false);
  const [pivotNewIdea, setPivotNewIdea] = useState('');
  const [pivotNewIndustryId, setPivotNewIndustryId] = useState<number | undefined>(undefined);
  const [pivotReason, setPivotReason] = useState('');
  const [pivotNotes, setPivotNotes] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        startup_name: profile.startup_name,
        logo_url: profile.logo_url || '',
        industry_id: profile.industry_id,
        description: profile.description || '',
        website: profile.website || '',
        social_links: profile.social_links || {},
        contact_info: profile.contact_info || {},
        startup_type: profile.startup_type || 'PRODUCT',
        business_model: profile.business_model || 'B2B',
        team_size: profile.team_size || 1,
        revenue_status: profile.revenue_status || 'PRE_REVENUE',
        funding_status: profile.funding_status || 'BOOTSTRAPPED',
        program_status: profile.program_status || 'ACTIVE'
      });
      loadData(profile.id);
    }
  }, [profile]);

  const loadData = async (profileId: number) => {
    try {
      const [histData, pivData, audData] = await Promise.all([
        fetchStageHistory(profileId),
        fetchStartupPivots(profileId),
        isStaff ? fetchStartupAuditLogs(profileId) : Promise.resolve({ data: [] })
      ]);
      setStageHistory(histData.data);
      setPivots(pivData.data);
      setAuditLogs(audData.data);
    } catch (e: any) {
      console.error('Failed to load profile history:', e);
    }
  };

  if (!profile) return null;

  const currentStageInfo = getStartupStageInfo(profile.current_progress_stage);
  const currentStageIdx = getStartupStageIndex(profile.current_progress_stage);

  const handleSaveProfile = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateStartupProfile(profile.id, formData);
      setSuccessMsg('Profile changes saved successfully');
      setIsEditing(false);
      onProfileUpdated();
      loadData(profile.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStageSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateStartupProgressStage(profile.id, targetStage, stageComments);
      setSuccessMsg(`Progress stage updated to ${getStartupStageInfo(targetStage).name}`);
      setShowStageModal(false);
      setStageComments('');
      onProfileUpdated();
      loadData(profile.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update stage');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPivotSubmit = async () => {
    if (!pivotNewIdea.trim()) {
      setErrorMsg('New startup idea/description is required');
      return;
    }
    if (!pivotReason.trim()) {
      setErrorMsg('Reason for pivot is required');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await recordStartupPivot(profile.id, {
        new_idea: pivotNewIdea,
        new_industry_id: pivotNewIndustryId,
        reason: pivotReason,
        supporting_notes: pivotNotes
      });
      setSuccessMsg('Startup pivot recorded permanently and current profile updated');
      setShowPivotModal(false);
      setPivotNewIdea('');
      setPivotReason('');
      setPivotNotes('');
      onProfileUpdated();
      loadData(profile.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record pivot');
    } finally {
      setLoading(false);
    }
  };

  const handleRevertLog = async (logId: number) => {
    if (!window.confirm('Are you sure you want to revert this change to its previous value?')) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await revertStartupAuditLog(profile.id, logId);
      setSuccessMsg('Profile change successfully reverted');
      onProfileUpdated();
      loadData(profile.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revert change');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="p-5 md:p-6 bg-gradient-to-r from-gray-900 via-gray-800 to-primary text-white flex items-start justify-between shrink-0 relative">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-inner">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt={profile.startup_name} className="h-full w-full object-contain rounded-xl" />
              ) : (
                <Building2 className="h-7 w-7 text-white/80" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">{profile.startup_name}</h2>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                  profile.program_status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' :
                  profile.program_status === 'GRADUATED' ? 'bg-blue-500/20 text-blue-200 border-blue-400/30' :
                  profile.program_status === 'PAUSED' ? 'bg-amber-500/20 text-amber-200 border-amber-400/30' :
                  'bg-rose-500/20 text-rose-200 border-rose-400/30'
                }`}>
                  {profile.program_status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300 font-medium mt-1">
                <span>Industry: <strong className="text-white">{profile.industry_name || 'Unassigned'}</strong></span>
                <span>Cohort: <strong className="text-white">{profile.cohort_name || 'Unassigned Cohort'}</strong></span>
                <span>Stage: <strong className="text-emerald-300">{currentStageInfo.name}</strong></span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 px-6 text-xs font-bold text-rose-800 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-6 text-xs font-bold text-emerald-800 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'info' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'team' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <User className="h-4 w-4" />
            Founders & Team ({profile.founders?.length || 1})
          </button>
          <button
            onClick={() => setActiveTab('stage')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'stage' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Progress Stage Tracker
          </button>
          <button
            onClick={() => setActiveTab('pivots')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'pivots' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            Pivot History ({pivots.length})
          </button>
          {isStaff && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'audit' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <History className="h-4 w-4" />
              Audit Log ({auditLogs.length})
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: PROFILE INFO */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider font-mono">
                  {isEditing ? 'Editing Startup Details' : 'Startup Core Overview'}
                </h3>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!isStaff && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-900 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Founder Self-Service View:</strong> You can edit description, website, logo, and contact info. Assigned Cohort, Stage, and Program Status are staff-only editable.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* General Info */}
                <div className="space-y-4 bg-gray-50/70 p-4 border border-gray-200/80 rounded-2xl">
                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest font-mono">General Information</h4>
                  
                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Startup Name</label>
                    {isEditing && isStaff ? (
                      <input
                        type="text"
                        value={formData.startup_name || ''}
                        onChange={e => setFormData({ ...formData, startup_name: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-primary"
                      />
                    ) : (
                      <p className="text-sm font-black text-gray-900">{profile.startup_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Industry</label>
                    {isEditing && isStaff ? (
                      <select
                        value={formData.industry_id || ''}
                        onChange={e => setFormData({ ...formData, industry_id: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-primary"
                      >
                        <option value="">Select Industry</option>
                        {industries.map(ind => (
                          <option key={ind.id} value={ind.id}>{ind.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs font-bold text-gray-800">{profile.industry_name || 'Unassigned'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Logo URL (Cloudinary / Image)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="https://res.cloudinary.com/..."
                        value={formData.logo_url || ''}
                        onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-primary"
                      />
                    ) : (
                      <p className="text-xs font-mono font-medium text-gray-600 truncate">{profile.logo_url || 'No logo URL set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Website</label>
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="https://startup.pk"
                        value={formData.website || ''}
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-primary"
                      />
                    ) : (
                      <a href={profile.website || '#'} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        {profile.website || 'No website provided'}
                      </a>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Description / Core Idea</label>
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={formData.description || ''}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-primary"
                      />
                    ) : (
                      <p className="text-xs text-gray-700 font-medium leading-relaxed bg-white p-3 border border-gray-150 rounded-xl">{profile.description}</p>
                    )}
                  </div>
                </div>

                {/* Classification & Operations */}
                <div className="space-y-4 bg-gray-50/70 p-4 border border-gray-200/80 rounded-2xl">
                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest font-mono">Classification & Program Status</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Startup Type</label>
                      {isEditing && isStaff ? (
                        <select
                          value={formData.startup_type || 'PRODUCT'}
                          onChange={e => setFormData({ ...formData, startup_type: e.target.value as any })}
                          className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-900"
                        >
                          <option value="PRODUCT">Product</option>
                          <option value="SERVICE">Service</option>
                          <option value="HYBRID">Hybrid</option>
                        </select>
                      ) : (
                        <p className="text-xs font-bold text-gray-800">{profile.startup_type || 'Product'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Business Model</label>
                      {isEditing && isStaff ? (
                        <select
                          value={formData.business_model || 'B2B'}
                          onChange={e => setFormData({ ...formData, business_model: e.target.value as any })}
                          className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-900"
                        >
                          <option value="B2B">B2B</option>
                          <option value="B2C">B2C</option>
                          <option value="SUBSCRIPTION">Subscription</option>
                        </select>
                      ) : (
                        <p className="text-xs font-bold text-gray-800">{profile.business_model || 'B2B'}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Revenue Status</label>
                      {isEditing && isStaff ? (
                        <select
                          value={formData.revenue_status || 'PRE_REVENUE'}
                          onChange={e => setFormData({ ...formData, revenue_status: e.target.value as any })}
                          className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-900"
                        >
                          <option value="PRE_REVENUE">Pre-Revenue</option>
                          <option value="POST_REVENUE">Post-Revenue</option>
                          <option value="PROFITABLE">Profitable</option>
                        </select>
                      ) : (
                        <p className="text-xs font-bold text-gray-800">{profile.revenue_status || 'Pre-Revenue'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Funding Status</label>
                      {isEditing && isStaff ? (
                        <select
                          value={formData.funding_status || 'BOOTSTRAPPED'}
                          onChange={e => setFormData({ ...formData, funding_status: e.target.value as any })}
                          className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-900"
                        >
                          <option value="BOOTSTRAPPED">Bootstrapped</option>
                          <option value="GRANT_FUNDED">Grant Funded</option>
                          <option value="PRE_SEED">Pre-Seed</option>
                          <option value="SEED">Seed</option>
                          <option value="SERIES_A_PLUS">Series A+</option>
                        </select>
                      ) : (
                        <p className="text-xs font-bold text-gray-800">{profile.funding_status || 'Bootstrapped'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Program Status (Staff Restricted)</label>
                    {isEditing && isStaff ? (
                      <select
                        value={formData.program_status || 'ACTIVE'}
                        onChange={e => setFormData({ ...formData, program_status: e.target.value as any })}
                        className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-900"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="PAUSED">Paused</option>
                        <option value="GRADUATED">Graduated</option>
                        <option value="KICKED_OUT">Kicked Out</option>
                      </select>
                    ) : (
                      <span className="inline-block px-2.5 py-1 bg-gray-200 text-gray-800 rounded-lg text-xs font-black uppercase font-mono">
                        {profile.program_status}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Enrollment Date</label>
                    <p className="text-xs font-mono font-bold text-gray-600">
                      {new Date(profile.enrollment_date).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FOUNDERS & TEAM */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider font-mono">
                  Admissions Linked Founders & Team Members
                </h3>
                <span className="text-xs font-mono text-gray-500">Linked to Admissions Application ID #{profile.applicant_id}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.founders?.map((f, idx) => (
                  <div key={f.id || idx} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs relative">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
                        {f.name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-gray-900">{f.name}</h4>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                            f.role === 'PRIMARY' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {f.role}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {f.email}
                        </p>
                        <p className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {f.phone}
                        </p>
                        <p className="text-[11px] font-mono text-gray-400">CNIC: {f.cnic}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PROGRESS STAGE TRACKER */}
          {activeTab === 'stage' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider font-mono">
                    Post-Acceptance Business Progress Stage
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Predefined 6-stage maturity pipeline (Idea Stage → Scale Stage)
                  </p>
                </div>
                {isStaff && (
                  <button
                    onClick={() => {
                      setTargetStage(profile.current_progress_stage);
                      setShowStageModal(true);
                    }}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Update Progress Stage
                  </button>
                )}
              </div>

              {/* Stage Progress Bar / Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {STARTUP_PROGRESS_STAGES.map((stg, idx) => {
                  const isCurrent = stg.key === profile.current_progress_stage;
                  const isPassed = idx < currentStageIdx;

                  return (
                    <div 
                      key={stg.key}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        isCurrent ? 'bg-primary/10 border-primary text-primary font-black shadow-xs ring-2 ring-primary/20' :
                        isPassed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-bold' :
                        'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-black">Step 0{stg.stepNumber}</span>
                        {isPassed && <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />}
                        {isCurrent && <span className="h-2 w-2 rounded-full bg-primary animate-ping" />}
                      </div>
                      <div>
                        <p className="text-xs font-black tracking-tight leading-snug">{stg.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Append-Only Stage Change History Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest font-mono">
                  Stage Revision Timeline (Append-Only)
                </h4>

                {stageHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No stage changes recorded yet.</p>
                ) : (
                  <div className="space-y-2 border-l-2 border-gray-200 pl-4 ml-2">
                    {stageHistory.map((hist) => {
                      const stgInfo = getStartupStageInfo(hist.new_stage);
                      return (
                        <div key={hist.id} className="relative pb-3 last:pb-0">
                          <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-white ring-2 ring-primary/20" />
                          <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-gray-900">
                                {hist.previous_stage ? `${getStartupStageInfo(hist.previous_stage).name} → ` : ''}
                                <strong className="text-primary">{stgInfo.name}</strong>
                              </span>
                              <span className="text-[10px] font-mono text-gray-400">
                                {new Date(hist.change_date).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                            {hist.comments && (
                              <p className="text-gray-600 font-medium text-[11px] bg-white p-2 border border-gray-150 rounded-lg">
                                "{hist.comments}"
                              </p>
                            )}
                            <p className="text-[10px] font-mono text-gray-400">Changed by: {hist.updated_by_email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PIVOTS */}
          {activeTab === 'pivots' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider font-mono">
                    Startup Pivot History
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Permanent record of major business model or core idea pivots
                  </p>
                </div>
                {isStaff && (
                  <button
                    onClick={() => {
                      setPivotNewIdea(profile.description);
                      setPivotNewIndustryId(profile.industry_id || undefined);
                      setShowPivotModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    Record Startup Pivot
                  </button>
                )}
              </div>

              {pivots.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                  <RotateCcw className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-600">No pivot records found for this startup.</p>
                  <p className="text-[11px] text-gray-400 mt-1">Pivots represent core idea or industry shifts approved by staff.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pivots.map((piv) => (
                    <div key={piv.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="text-xs font-black uppercase text-indigo-900 font-mono flex items-center gap-1.5">
                          <RotateCcw className="h-3.5 w-3.5 text-indigo-600" />
                          Approved Pivot Record
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {new Date(piv.pivot_date).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-rose-50/50 p-3 border border-rose-100 rounded-xl space-y-1">
                          <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider font-mono block">Previous Concept</span>
                          <p className="text-gray-800 font-medium">{piv.previous_idea || 'None'}</p>
                          {piv.previous_industry_name && (
                            <p className="text-[10px] text-gray-500 font-mono">Industry: {piv.previous_industry_name}</p>
                          )}
                        </div>

                        <div className="bg-emerald-50/50 p-3 border border-emerald-100 rounded-xl space-y-1">
                          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider font-mono block">New Concept</span>
                          <p className="text-gray-900 font-bold">{piv.new_idea}</p>
                          {piv.new_industry_name && (
                            <p className="text-[10px] text-gray-600 font-mono font-bold">Industry: {piv.new_industry_name}</p>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider font-mono block">Reason for Pivot</span>
                        <p className="text-gray-800 font-medium">{piv.reason}</p>
                        {piv.supporting_notes && (
                          <p className="text-[11px] text-gray-500 italic mt-1">{piv.supporting_notes}</p>
                        )}
                        <p className="text-[10px] font-mono text-gray-400 mt-2">Approved by Staff: {piv.approved_by_email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT LOG (Staff Only) */}
          {activeTab === 'audit' && isStaff && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider font-mono">
                    Profile Edit Audit Log
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Track all modifications made by staff or founders with revert functionality
                  </p>
                </div>
              </div>

              {auditLogs.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No audit log entries recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3 text-xs flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-gray-900 uppercase text-[10px] bg-gray-200 px-2 py-0.5 rounded-md">
                            {log.field_name}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(log.created_at).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-rose-600 line-through text-[11px]">{log.old_value || 'None'}</span>
                          <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="text-emerald-700 font-bold">{log.new_value || 'None'}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono">Changed by: {log.changed_by_email}</p>
                      </div>

                      {log.old_value && log.field_name !== 'PROFILE_CREATED' && log.field_name !== 'PIVOT_RECORDED' && (
                        <button
                          onClick={() => handleRevertLog(log.id)}
                          className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                          title="Revert field to previous value"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Revert
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-mono text-gray-500">Startup ID #{profile.id}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold cursor-pointer"
          >
            Close Profile
          </button>
        </div>

      </div>

      {/* UPDATE STAGE MODAL */}
      {showStageModal && (
        <div className="fixed inset-0 z-60 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in">
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wider font-mono">
              Update Progress Stage
            </h3>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">Select New Business Stage</label>
              <select
                value={targetStage}
                onChange={e => setTargetStage(e.target.value as StartupProgressStage)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-primary"
              >
                {STARTUP_PROGRESS_STAGES.map(stg => (
                  <option key={stg.key} value={stg.key}>{stg.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">
                Comments / Notes <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain reason or milestones achieved for stage transition..."
                value={stageComments}
                onChange={e => setStageComments(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowStageModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStageSubmit}
                disabled={loading}
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Confirm Stage Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PIVOT MODAL */}
      {showPivotModal && (
        <div className="fixed inset-0 z-60 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-2xl max-w-lg w-full space-y-4 animate-in fade-in">
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wider font-mono flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-indigo-600" />
              Record Permanent Startup Pivot
            </h3>

            <p className="text-xs text-gray-500 font-medium">
              Recording a pivot will permanently archive the previous idea and update the startup's current profile description and industry.
            </p>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">New Startup Idea / Description *</label>
              <textarea
                rows={3}
                value={pivotNewIdea}
                onChange={e => setPivotNewIdea(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:border-primary"
                placeholder="Describe the new product/service direction..."
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">New Industry (Optional)</label>
              <select
                value={pivotNewIndustryId || ''}
                onChange={e => setPivotNewIndustryId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-primary"
              >
                <option value="">Keep Existing Industry</option>
                {industries.map(ind => (
                  <option key={ind.id} value={ind.id}>{ind.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">Reason for Pivot *</label>
              <input
                type="text"
                value={pivotReason}
                onChange={e => setPivotReason(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-primary"
                placeholder="e.g., Low market demand in initial niche, switching to B2B SaaS"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">Supporting Notes (Optional)</label>
              <input
                type="text"
                value={pivotNotes}
                onChange={e => setPivotNotes(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:border-primary"
                placeholder="Additional details or board approval notes..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPivotModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPivotSubmit}
                disabled={loading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {loading ? 'Saving Pivot...' : 'Approve & Record Pivot'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
