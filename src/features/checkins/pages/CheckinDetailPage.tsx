import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, Clock, Building2, User, Mail, CheckCircle2, 
  AlertCircle, Save, Plus, Trash2, CheckSquare, Sparkles, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Checkin, CheckinChecklistItem, CheckinAttendanceStatus } from '../../../types/checkin.types';
import { fetchCheckinById, updateCheckin, addChecklistItem, updateChecklistItem, deleteChecklistItem } from '../api/checkinsApi';

interface CheckinDetailPageProps {
  checkinId: number;
  onBack: () => void;
  onNavigate?: (path: string) => void;
}

export const CheckinDetailPage: React.FC<CheckinDetailPageProps> = ({
  checkinId,
  onBack,
  onNavigate
}) => {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [checklistItems, setChecklistItems] = useState<CheckinChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [notes, setNotes] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<CheckinAttendanceStatus>('unmarked');
  const [scheduledAt, setScheduledAt] = useState('');

  // Confirm No-show Modal
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<CheckinAttendanceStatus | null>(null);

  // Checklist Item State
  const [newItemInput, setNewItemInput] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => {
    loadCheckinData();
  }, [checkinId]);

  const loadCheckinData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchCheckinById(checkinId);
      setCheckin(data);
      setNotes(data.notes || '');
      setAttendanceStatus(data.attendance_status || 'unmarked');
      setChecklistItems(data.checklist_items || []);

      if (data.scheduled_at) {
        const d = new Date(data.scheduled_at);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setScheduledAt(d.toISOString().slice(0, 16));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load check-in details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (targetStatus: CheckinAttendanceStatus) => {
    if (targetStatus === attendanceStatus) return;

    // Check transition to no_show (Requirement 3: only send email if transitioning INTO no_show)
    if (attendanceStatus !== 'no_show' && targetStatus === 'no_show') {
      setPendingStatus('no_show');
      setShowNoShowConfirm(true);
    } else {
      handleSaveCheckin({ attendance_status: targetStatus });
    }
  };

  const handleConfirmNoShow = () => {
    setShowNoShowConfirm(false);
    handleSaveCheckin({ attendance_status: 'no_show' });
  };

  const handleSaveCheckin = async (overridePayload?: { attendance_status?: CheckinAttendanceStatus }) => {
    if (!checkin) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetStatus = overridePayload?.attendance_status || attendanceStatus;

    try {
      const updated = await updateCheckin(checkin.id, {
        notes: notes.trim(),
        attendance_status: targetStatus,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined
      });

      setCheckin(updated);
      setAttendanceStatus(updated.attendance_status);
      setNotes(updated.notes || '');
      if (updated.checklist_items) setChecklistItems(updated.checklist_items);

      if (overridePayload?.attendance_status === 'no_show') {
        setSuccessMsg('Attendance updated to NO-SHOW. Missed meeting email notice dispatched to founder.');
      } else {
        setSuccessMsg('Check-in details updated successfully.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update check-in');
    } finally {
      setSaving(false);
    }
  };

  // Checklist Item Actions
  const handleToggleItem = async (item: CheckinChecklistItem) => {
    try {
      const nextCompleted = !item.is_completed;
      // Optimistic update
      setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: nextCompleted } : i));
      
      const updated = await updateChecklistItem(item.id, { is_completed: nextCompleted });
      setChecklistItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err: any) {
      setErrorMsg('Failed to update checklist item status');
      loadCheckinData(); // Rollback
    }
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemInput.trim() || !checkin) return;

    setAddingItem(true);
    try {
      const newItem = await addChecklistItem(checkin.id, newItemInput.trim());
      setChecklistItems(prev => [...prev, newItem]);
      setNewItemInput('');
    } catch (err: any) {
      setErrorMsg('Failed to add checklist item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      setChecklistItems(prev => prev.filter(i => i.id !== itemId));
      await deleteChecklistItem(itemId);
    } catch (err: any) {
      setErrorMsg('Failed to delete checklist item');
      loadCheckinData();
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4">
        <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loading Check-in Details...</p>
      </div>
    );
  }

  if (!checkin) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-rose-600 mx-auto" />
        <h3 className="text-sm font-black text-gray-900 uppercase">Check-in Not Found</h3>
        <p className="text-xs text-gray-500">The requested 1-on-1 check-in record does not exist or has been removed.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const completedCount = checklistItems.filter(i => i.is_completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 text-left animate-fade-in">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-primary transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-3xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>← Back to {checkin.startup_name || 'Startup'}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-400">
          <span>Check-in Record #{checkin.id}</span>
        </div>
      </div>

      {/* Alert Messages */}
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

      {/* Main Header Card */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-primary p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-white/15 text-white text-[10px] font-black uppercase font-mono px-3 py-1 rounded-full border border-white/20">
                1-on-1 Advisory Check-in
              </span>
              <span className="bg-white/10 text-gray-300 text-[10px] font-bold px-3 py-1 rounded-full border border-white/10">
                Cohort: {checkin.cohort_name || 'Assigned Cohort'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
              <Building2 className="h-7 w-7 text-white/80" />
              <span>{checkin.startup_name || 'Startup Venture'}</span>
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-300">
              {checkin.founder_name && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl border border-white/10">
                  <User className="h-3.5 w-3.5 text-white/70" />
                  Founder: {checkin.founder_name}
                </span>
              )}
              {checkin.founder_email && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl border border-white/10 font-mono">
                  <Mail className="h-3.5 w-3.5 text-white/70" />
                  {checkin.founder_email}
                </span>
              )}
            </div>
          </div>

          {/* Quick Attendance Selector */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl space-y-2 shrink-0 w-full md:w-auto">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/80 block font-mono">
              Attendance Outcome
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleStatusClick('attended')}
                disabled={saving}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  attendanceStatus === 'attended'
                    ? 'bg-emerald-500 text-white shadow-md border-2 border-emerald-300'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Attended</span>
              </button>

              <button
                onClick={() => handleStatusClick('no_show')}
                disabled={saving}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  attendanceStatus === 'no_show'
                    ? 'bg-rose-600 text-white shadow-md border-2 border-rose-300'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
              >
                <AlertCircle className="h-4 w-4" />
                <span>No-Show</span>
              </button>

              <button
                onClick={() => handleStatusClick('unmarked')}
                disabled={saving}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  attendanceStatus === 'unmarked'
                    ? 'bg-gray-700 text-white shadow-md border-2 border-gray-400'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
              >
                <span>Unmarked</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Meeting Notes & Schedule Details (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Notes & Schedule Card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Meeting Details & Advisory Notes
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold">
                    Logged by {checkin.created_by_email || 'Staff'} on {new Date(checkin.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleSaveCheckin()}
                disabled={saving}
                className="bg-primary hover:bg-[#5A0F0F] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-3xs disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Notes & Schedule'}</span>
              </button>
            </div>

            {/* Scheduled Date Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wide text-gray-700 block">
                Scheduled Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-primary max-w-md"
              />
            </div>

            {/* Notes Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wide text-gray-700 block">
                Meeting Notes / Minutes / Advisory Feedback
              </label>
              <textarea
                rows={10}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type comprehensive notes regarding venture progression, KPI updates, bottlenecks, feedback given, or agreed strategic targets..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-800 font-medium placeholder-gray-400 focus:outline-none focus:border-primary leading-relaxed resize-none"
              />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Checklist / Action Items (1 Col) */}
        <div className="space-y-6">
          
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-5">
            
            {/* Checklist Header */}
            <div className="space-y-3 border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Checklist & Action Items
                  </h3>
                </div>
                <span className="text-xs font-mono font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {completedCount}/{totalCount}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono font-bold text-gray-400">
                  <span>Progress</span>
                  <span>{progressPercent}% Done</span>
                </div>
              </div>
            </div>

            {/* Add Item Form */}
            <form onSubmit={handleAddChecklistItem} className="flex gap-2">
              <input
                type="text"
                value={newItemInput}
                onChange={(e) => setNewItemInput(e.target.value)}
                placeholder="Add new action item..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary font-medium"
              />
              <button
                type="submit"
                disabled={addingItem || !newItemInput.trim()}
                className="bg-primary hover:bg-[#5A0F0F] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs disabled:opacity-50 flex items-center justify-center shrink-0"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            {/* Checklist Items List */}
            {checklistItems.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-gray-200 rounded-2xl text-xs text-gray-400">
                No checklist action items defined for this check-in.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {checklistItems.map((item) => {
                  const isCarriedForward = item.originating_checkin_id && item.originating_checkin_id !== checkin.id;
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all text-xs flex items-start justify-between gap-3 ${
                        item.is_completed 
                          ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950' 
                          : 'bg-gray-50/80 border-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.is_completed}
                          onChange={() => handleToggleItem(item)}
                          className="mt-0.5 h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <span className={`font-medium leading-relaxed block break-words ${item.is_completed ? 'line-through text-emerald-800/70' : ''}`}>
                            {item.description || (item as any).text || (item as any).title || (item as any).item || 'Action Item'}
                          </span>

                          {isCarriedForward && (
                            <span className="inline-block bg-amber-100 text-amber-800 text-[8px] font-bold font-mono px-1.5 py-0.5 rounded border border-amber-200">
                              ↪ Carried forward from Check-in #{item.originating_checkin_id}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-gray-400 hover:text-rose-600 p-1 transition-colors shrink-0"
                        title="Delete action item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* CONFIRM NO-SHOW MODAL */}
      {showNoShowConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left border border-gray-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                  Confirm No-Show Status
                </h3>
                <p className="text-[10px] text-gray-500 font-bold">
                  Official absence notification protocol
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Marking this meeting as <strong>No-Show</strong> will automatically dispatch an official email notice to <strong>{checkin.founder_email}</strong> informing them of the missed 1-on-1 check-in.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNoShowConfirm(false)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmNoShow}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <span>Confirm & Send Email</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
