import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, CheckCircle2, AlertCircle, FileText, CheckSquare, ChevronRight, RefreshCw, User } from 'lucide-react';
import { Checkin } from '../../../types/checkin.types';
import { fetchStartupCheckins } from '../api/checkinsApi';
import { NewCheckinModal } from './NewCheckinModal';

interface StartupCheckinsTabProps {
  startupId: number;
  startupName: string;
  cohortId?: number;
  cohortName?: string;
  onNavigate?: (path: string) => void;
  onOpenCheckinDetail?: (checkinId: number) => void;
}

export const StartupCheckinsTab: React.FC<StartupCheckinsTabProps> = ({
  startupId,
  startupName,
  cohortId,
  cohortName,
  onNavigate,
  onOpenCheckinDetail
}) => {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadCheckins();
  }, [startupId]);

  const loadCheckins = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchStartupCheckins(startupId);
      setCheckins(data || []);
    } catch (err: any) {
      console.error('Failed to load checkins:', err);
      setErrorMsg('Failed to load check-ins history.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (chkId: number) => {
    if (onOpenCheckinDetail) {
      onOpenCheckinDetail(chkId);
    } else if (onNavigate) {
      onNavigate(`/admin/checkins/${chkId}`);
    } else {
      window.history.pushState({}, '', `/admin/checkins/${chkId}`);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3 bg-white border border-gray-150 rounded-3xl">
        <RefreshCw className="h-6 w-6 text-primary animate-spin mx-auto" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loading 1-on-1 Check-ins...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Tab Header Card */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              1-on-1 Advisory Check-ins
            </h3>
            <p className="text-[10px] text-gray-400 font-bold">
              Individual staff meetings scoped to {startupName} • Cohort: {cohortName || 'Active'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-[#5A0F0F] text-white px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule / Log Check-in</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* Checkins Cards Grid */}
      {checkins.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-gray-200 rounded-3xl space-y-3">
          <Calendar className="h-10 w-10 text-gray-300 mx-auto" />
          <h4 className="text-xs font-black text-gray-700 uppercase tracking-wide">No 1-on-1 Check-ins Recorded</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Log a meeting that already happened or schedule a future advisory check-in for this startup.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Check-in</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checkins.map((chk) => {
            const formattedDate = new Date(chk.scheduled_at).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={chk.id}
                onClick={() => handleOpenDetail(chk.id)}
                className="bg-white border border-gray-200 hover:border-primary/50 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-900 group-hover:text-primary transition-colors">
                        <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Logged by {chk.created_by_email || 'Staff'}
                      </p>
                    </div>

                    {/* Attendance Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1 border font-mono ${
                      chk.attendance_status === 'attended' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : chk.attendance_status === 'no_show' 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {chk.attendance_status === 'attended' && <CheckCircle2 className="h-3 w-3" />}
                      {chk.attendance_status === 'no_show' && <AlertCircle className="h-3 w-3" />}
                      <span>{chk.attendance_status === 'attended' ? 'Attended' : chk.attendance_status === 'no_show' ? 'No-Show' : 'Unmarked'}</span>
                    </span>
                  </div>

                  {/* Notes Excerpt */}
                  <p className="text-xs text-gray-600 font-medium line-clamp-3 leading-relaxed italic">
                    "{chk.notes ? chk.notes : 'No meeting notes recorded yet.'}"
                  </p>

                </div>

                {/* Card Footer: Checklist stats & Link */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      {chk.completed_checklist_items || 0} / {chk.total_checklist_items || 0} Action Items
                    </span>
                  </div>

                  <span className="text-xs font-black text-primary group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    <span>Full Details</span>
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* New Check-in Modal */}
      {isModalOpen && (
        <NewCheckinModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          preselectedStartupId={startupId}
          onCheckinCreated={(newRecord) => {
            setCheckins(prev => [newRecord, ...prev]);
            setIsModalOpen(false);
            handleOpenDetail(newRecord.id);
          }}
        />
      )}

    </div>
  );
};
