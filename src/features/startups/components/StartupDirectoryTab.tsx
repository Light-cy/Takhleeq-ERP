import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Filter, RefreshCw, TrendingUp, Globe, User, 
  ChevronLeft, ChevronRight, Sparkles, CheckCircle2, RotateCcw, Eye, Plus, Settings
} from 'lucide-react';
import { StartupProfile, Industry, StartupProgressStage } from '../../../types/startup.types';
import { STARTUP_PROGRESS_STAGES, getStartupStageInfo } from '../../../constants/startupStages';
import { fetchStartupProfiles, fetchIndustries, syncAcceptedStartups } from '../api/startupsApi';
import { StartupProfileDetailModal } from './StartupProfileDetailModal';
import { StartupDetailView } from './StartupDetailView';

interface Props {
  isStaff: boolean;
  cohortsList?: any[];
}

export const StartupDirectoryTab: React.FC<Props> = ({ isStaff, cohortsList = [] }) => {
  const [profiles, setProfiles] = useState<StartupProfile[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Full Page Detail View State
  const [viewingStartupId, setViewingStartupId] = useState<number | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<number | undefined>(undefined);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedProgramStatus, setSelectedProgramStatus] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  // Modal State
  const [selectedProfile, setSelectedProfile] = useState<StartupProfile | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadIndustries();
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [page, search, selectedCohort, selectedStage, selectedProgramStatus, selectedIndustry]);

  const loadIndustries = async () => {
    try {
      const data = await fetchIndustries();
      setIndustries(data);
    } catch (err: any) {
      console.error('Failed to load industries:', err);
    }
  };

  const loadProfiles = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchStartupProfiles({
        page,
        limit,
        search,
        cohort_id: selectedCohort,
        stage: selectedStage || undefined,
        program_status: selectedProgramStatus || undefined,
        industry_id: selectedIndustry
      });
      setProfiles(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load startup profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const msg = await syncAcceptedStartups();
      setSuccessMsg(msg);
      loadProfiles();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sync startups');
    } finally {
      setSyncing(false);
    }
  };

  // If a startup is selected for full detail page view
  if (viewingStartupId) {
    return (
      <StartupDetailView
        startupId={viewingStartupId}
        industries={industries}
        onBack={() => setViewingStartupId(null)}
        onProfileUpdated={loadProfiles}
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-primary p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-black tracking-tight">Startup Profiles & Progress Tracking</h2>
            <span className="bg-white/10 text-white border border-white/20 text-[10px] font-black uppercase font-mono px-2.5 py-0.5 rounded-full">
              MOD-02
            </span>
          </div>
          <p className="text-xs text-gray-300 font-medium mt-1">
            Manage accepted startup master profiles, post-enrollment progress stages, and permanent pivot history.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-inner disabled:opacity-50"
            title="Auto-create startup profiles for any newly accepted/enrolled cohort applicants"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Intake...' : 'Sync Accepted Intake'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">Dismiss</button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by startup, description, or founder..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-primary"
            />
          </div>

          {/* Cohort Filter */}
          <div>
            <select
              value={selectedCohort || ''}
              onChange={e => { setSelectedCohort(e.target.value ? parseInt(e.target.value) : undefined); setPage(1); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-primary"
            >
              <option value="">All Cohorts</option>
              {cohortsList.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Progress Stage Filter */}
          <div>
            <select
              value={selectedStage}
              onChange={e => { setSelectedStage(e.target.value); setPage(1); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-primary"
            >
              <option value="">All 6 Progress Stages</option>
              {STARTUP_PROGRESS_STAGES.map(stg => (
                <option key={stg.key} value={stg.key}>{stg.label}</option>
              ))}
            </select>
          </div>

          {/* Industry Filter */}
          <div>
            <select
              value={selectedIndustry || ''}
              onChange={e => { setSelectedIndustry(e.target.value ? parseInt(e.target.value) : undefined); setPage(1); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-primary"
            >
              <option value="">All Industries</option>
              {industries.map(ind => (
                <option key={ind.id} value={ind.id}>{ind.name}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Startup Table */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 font-mono text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Startup</th>
                <th className="py-3.5 px-4">Primary Founder</th>
                <th className="py-3.5 px-4">Cohort & Industry</th>
                <th className="py-3.5 px-4">Progress Stage</th>
                <th className="py-3.5 px-4">Program Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                    Loading startup profiles...
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-700">No startup profiles found</p>
                    <p className="text-xs text-gray-400 mt-1">Try resetting search filters or click "Sync Accepted Intake".</p>
                  </td>
                </tr>
              ) : (
                profiles.map((p) => {
                  const stageInfo = getStartupStageInfo(p.current_progress_stage);

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors group">
                      
                      {/* Startup Name & Logo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 p-1 flex items-center justify-center shrink-0">
                            {p.logo_url ? (
                              <img src={p.logo_url} alt={p.startup_name} className="h-full w-full object-contain rounded-lg" />
                            ) : (
                              <Building2 className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900 text-sm group-hover:text-primary transition-colors">{p.startup_name}</h4>
                            <p className="text-[11px] text-gray-500 line-clamp-1 max-w-xs">{p.description || 'No description provided.'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Founder */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-black text-gray-900">{p.founder_name || 'Primary Founder'}</p>
                          <p className="text-[11px] font-mono text-gray-500">{p.founder_email}</p>
                        </div>
                      </td>

                      {/* Cohort & Industry */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-block text-[10px] font-mono font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                            {p.cohort_name || 'Unassigned Cohort'}
                          </span>
                          <p className="text-[11px] font-bold text-gray-600">{p.industry_name || 'Unassigned Industry'}</p>
                        </div>
                      </td>

                      {/* Progress Stage */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-primary/10 text-primary border border-primary/20">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Step 0{stageInfo.stepNumber}: {stageInfo.name}
                          </span>
                        </div>
                      </td>

                      {/* Program Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block text-[10px] font-black uppercase font-mono px-2.5 py-1 rounded-lg border ${
                          p.program_status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          p.program_status === 'GRADUATED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          p.program_status === 'PAUSED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {p.program_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setViewingStartupId(p.id);
                          }}
                          className="px-3.5 py-2 bg-primary text-white hover:bg-primary-dark rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Manage Startup
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs font-bold text-gray-600">
          <span>
            Showing {profiles.length} of {pagination.total} startup profile(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-gray-900">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      {/* DETAIL MODAL */}
      {showModal && selectedProfile && (
        <StartupProfileDetailModal
          profile={selectedProfile}
          industries={industries}
          isStaff={isStaff}
          onClose={() => {
            setShowModal(false);
            setSelectedProfile(null);
          }}
          onProfileUpdated={() => {
            loadProfiles();
          }}
        />
      )}

    </div>
  );
};
