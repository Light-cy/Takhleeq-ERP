import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Building2, AlertCircle } from 'lucide-react';
import { Checkin, CreateCheckinPayload } from '../../../types/checkin.types';
import { createCheckin } from '../api/checkinsApi';
import { fetchStartupProfiles } from '../../startups/api/startupsApi';
import { StartupProfile } from '../../../types/startup.types';

interface NewCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedStartupId?: number;
  onCheckinCreated: (checkin: Checkin) => void;
}

export const NewCheckinModal: React.FC<NewCheckinModalProps> = ({
  isOpen,
  onClose,
  preselectedStartupId,
  onCheckinCreated
}) => {
  const [mode, setMode] = useState<'log_now' | 'schedule'>('log_now');
  const [startups, setStartups] = useState<StartupProfile[]>([]);
  const [loadingStartups, setLoadingStartups] = useState(false);

  const [selectedStartupId, setSelectedStartupId] = useState<number | ''>(preselectedStartupId || '');
  const [selectedStartup, setSelectedStartup] = useState<StartupProfile | null>(null);

  // Meeting Date & Time field
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStartups();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedStartupId) {
      setSelectedStartupId(preselectedStartupId);
    }
  }, [preselectedStartupId]);

  const loadStartups = async () => {
    setLoadingStartups(true);
    try {
      const res = await fetchStartupProfiles({ limit: 200, program_status: 'ACTIVE' });
      setStartups(res.data || []);
      
      const targetId = preselectedStartupId || selectedStartupId;
      if (targetId) {
        const found = (res.data || []).find((s: StartupProfile) => s.id === Number(targetId));
        if (found) setSelectedStartup(found);
      }
    } catch (err: any) {
      console.error('Failed to load startups for checkin modal:', err);
    } finally {
      setLoadingStartups(false);
    }
  };

  const handleStartupChange = (idVal: number) => {
    setSelectedStartupId(idVal);
    const found = startups.find(s => s.id === idVal);
    setSelectedStartup(found || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStartupId) {
      setErrorMsg('Please select a startup profile.');
      return;
    }

    if (selectedStartup && !selectedStartup.cohort_id) {
      setErrorMsg('Selected startup is not currently assigned to any active cohort.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: CreateCheckinPayload = {
        startup_profile_id: Number(selectedStartupId),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        attendance_status: mode === 'log_now' ? 'attended' : 'unmarked'
      };

      const newRecord = await createCheckin(payload);
      onCheckinCreated(newRecord);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 text-left border border-gray-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">
                Create 1-on-1 Check-in
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Quick creation step — details & notes managed on full page
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('log_now')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'log_now' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Log Now</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('schedule')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'schedule' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Schedule Upcoming</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Startup Field (Pre-filled & read-only if preselected) */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wide text-gray-700 block">
              Startup *
            </label>
            {preselectedStartupId ? (
              <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  {selectedStartup ? selectedStartup.startup_name : `Startup #${preselectedStartupId}`}
                </span>
                <span className="text-[10px] bg-primary/10 text-primary font-mono font-bold px-2 py-0.5 rounded-md">
                  Pre-filled
                </span>
              </div>
            ) : (
              <select
                required
                value={selectedStartupId}
                onChange={(e) => handleStartupChange(Number(e.target.value))}
                disabled={loadingStartups}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">-- Select Startup Venture --</option>
                {startups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.startup_name} ({s.cohort_name || 'No Cohort'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Derived Cohort Display */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wide text-gray-700 block">
              Assigned Cohort (Auto-Derived)
            </label>
            <div className="w-full bg-gray-100/70 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-600 flex items-center justify-between">
              <span>
                {selectedStartup ? (selectedStartup.cohort_name || 'Assigned Cohort') : 'Select a startup above'}
              </span>
              <span className="text-[9px] text-gray-400 font-mono font-bold">Auto-Derived</span>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wide text-gray-700 block">
              Meeting Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-primary"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-2xl bg-primary hover:bg-[#5A0F0F] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'Creating...' : (mode === 'log_now' ? 'Log & Open Detail' : 'Schedule & Open Detail')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

