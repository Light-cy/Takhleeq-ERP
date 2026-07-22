import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Compass, 
  Award, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Bookmark, 
  BookOpen, 
  CornerDownRight 
} from 'lucide-react';

interface PublicCohortTrackPageProps {
  onNavigate: (path: string) => void;
}

export const PublicCohortTrackPage: React.FC<PublicCohortTrackPageProps> = ({ onNavigate }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicant, setApplicant] = useState<any | null>(null);
  const [confirmingSeat, setConfirmingSeat] = useState(false);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setError(null);
    setApplicant(null);

    try {
      const response = await fetch(`/api/applicants/track/${tokenInput.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to locate application records.');
      }

      setApplicant(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification Error: check your tracking token format and retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatConfirmation = async () => {
    if (!applicant) return;
    setConfirmingSeat(true);
    setError(null);

    try {
      const response = await fetch(`/api/applicants/${applicant.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'CONFIRMED'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm seat.');
      }

      // Update state locally
      setApplicant(prev => ({
        ...prev,
        status: 'CONFIRMED'
      }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Seat confirmation failed.');
    } finally {
      setConfirmingSeat(false);
    }
  };

  // Helper to get step status and details
  const getStepStatus = (step: 'submitted' | 'panel' | 'decision' | 'orientation') => {
    if (!applicant) return { state: 'pending', desc: '' };
    const stat = applicant.status;

    switch (step) {
      case 'submitted':
        return { state: 'complete', desc: 'Your application has been received and verified.' };
      
      case 'panel':
        if (stat === 'SUBMITTED') {
          return { state: 'active', desc: 'Pending evaluation panel review.' };
        }
        return { state: 'complete', desc: 'Panel evaluation complete.' };

      case 'decision':
        if (['SUBMITTED', 'IN_REVIEW'].includes(stat)) {
          return { state: 'pending', desc: 'Awaiting board decision.' };
        }
        if (stat === 'REJECTED') {
          return { state: 'failed', desc: 'Not selected for this cohort intake.' };
        }
        if (stat === 'BACKUP_CANDIDATE') {
          return { state: 'warning', desc: 'Placed on backup waiting list.' };
        }
        return { state: 'complete', desc: stat === 'ACCEPTED' ? 'Admitted! Seat confirmation pending.' : 'Admitted and seat confirmed!' };

      case 'orientation':
        if (['ACCEPTED', 'CONFIRMED'].includes(stat)) {
          if (applicant.orientation_conducted) {
            return { state: 'complete', desc: 'Orientation session attended.' };
          }
          return { state: 'active', desc: 'Orientation session pending.' };
        }
        return { state: 'pending', desc: 'Will open post-admission confirmation.' };
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full" id="public-cohort-track-page">
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 bg-rose-50 text-primary text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full border border-rose-100 shadow-3xs">
          <Sparkles className="h-3 w-3 animate-pulse" />
          Admissions Tracker
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Track Your Progress</h1>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          Verify the real-time status of your incubation blueprint or confirm your cohort placement seat.
        </p>
      </div>

      {/* Tracker Search Form */}
      <div className="bg-white border border-gray-100 shadow-3xs rounded-2xl p-6 max-w-xl mx-auto">
        <form onSubmit={handleTrackSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              required
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              placeholder="Enter Token (e.g. TK-STR-7821)"
              className="w-full bg-gray-50 border border-gray-150 rounded-xl pl-11 pr-4 py-3.5 text-xs font-mono text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-black"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-[#5A0F0F] text-white text-xs font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer shadow-3xs shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-45"
          >
            {loading ? 'Searching...' : 'Track'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-left text-xs text-rose-700 leading-relaxed font-semibold">
            {error}
          </div>
        )}
      </div>

      {/* Tracker Display Output */}
      {applicant && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 space-y-6 text-left"
          id="tracker-applicant-profile"
        >
          {/* Header Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Venture profile</span>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">{applicant.startup_name}</h2>
              <p className="text-xs text-gray-400 font-bold flex items-center gap-2">
                <span>Founder: <strong className="text-gray-600">{applicant.name}</strong></span>
                <span className="h-3 w-px bg-gray-200" />
                <span>Token: <strong className="text-gray-600 font-mono">{applicant.tracking_token}</strong></span>
              </p>
            </div>

            {/* Status pill mapping */}
            <div className="shrink-0">
              <span className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border shadow-3xs block text-center ${
                applicant.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-150' :
                applicant.status === 'IN_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-150' :
                applicant.status === 'BACKUP_CANDIDATE' ? 'bg-purple-50 text-purple-700 border-purple-150' :
                applicant.status === 'ACCEPTED' ? 'bg-indigo-50 text-indigo-700 border-indigo-150' :
                applicant.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                'bg-rose-50 text-rose-700 border-rose-150'
              }`}>
                {applicant.status === 'SUBMITTED' && 'Submitted'}
                {applicant.status === 'IN_REVIEW' && 'Under Screening'}
                {applicant.status === 'BACKUP_CANDIDATE' && 'Backup List'}
                {applicant.status === 'ACCEPTED' && 'Admitted'}
                {applicant.status === 'CONFIRMED' && 'Seat Confirmed'}
                {applicant.status === 'REJECTED' && 'Not Selected'}
              </span>
            </div>
          </div>

          {/* DYNAMIC SEAT CONFIRMATION INTERACTIVE CARD */}
          {applicant.status === 'ACCEPTED' && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-3xs"
              id="seat-confirmation-box"
            >
              <div className="space-y-1.5 text-center md:text-left flex-1">
                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider flex items-center justify-center md:justify-start gap-1.5">
                  <Award className="h-4.5 w-4.5 text-indigo-600" />
                  Cohort Placement Offer
                </h3>
                <p className="text-xs text-indigo-800 leading-relaxed font-semibold max-w-xl">
                  Congratulations! The Admissions Board of Takhleeq has accepted your startup. To secure your physical incubation space and register for orientation, confirm your seat acceptance.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSeatConfirmation}
                disabled={confirmingSeat}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider py-3.5 px-8 rounded-xl transition-all shrink-0 cursor-pointer shadow-sm animate-bounce"
              >
                {confirmingSeat ? 'Securing Space...' : 'Confirm My Seat'}
              </button>
            </motion.div>
          )}

          {/* ROADMAP TIMELINE VISUALIZER */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-3xs space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-3 block">
              Admission Progress Timeline
            </h3>

            <div className="relative pl-6 space-y-8 border-l border-gray-150">
              
              {/* Step 1: Submission */}
              {(() => {
                const s = getStepStatus('submitted');
                return (
                  <div className="relative" id="step-submitted">
                    <span className={`absolute -left-[31px] top-0.5 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center bg-white ${
                      s.state === 'complete' ? 'border-emerald-500 text-emerald-500' : 'border-gray-300'
                    }`}>
                      {s.state === 'complete' ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-1.5 w-1.5 bg-gray-300 rounded-full" />}
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Step 1: Application Intake</h4>
                      <p className="text-xs text-gray-500 leading-relaxed font-semibold">{s.desc}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Step 2: Evaluation Panel */}
              {(() => {
                const s = getStepStatus('panel');
                return (
                  <div className="relative" id="step-panel">
                    <span className={`absolute -left-[31px] top-0.5 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center bg-white ${
                      s.state === 'complete' ? 'border-emerald-500 text-emerald-500' :
                      s.state === 'active' ? 'border-amber-500 text-amber-500 animate-pulse' : 'border-gray-300'
                    }`}>
                      {s.state === 'complete' ? <CheckCircle2 className="h-3 w-3" /> : 
                       s.state === 'active' ? <Clock className="h-3 w-3" /> : <div className="h-1.5 w-1.5 bg-gray-300 rounded-full" />}
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Step 2: Admissions panel Screening</h4>
                      <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                        {s.state === 'pending' ? 'Evaluators check program alignment, pitch decks, and technical merit.' : s.desc}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Step 3: Admissions Decisions */}
              {(() => {
                const s = getStepStatus('decision');
                return (
                  <div className="relative" id="step-decision">
                    <span className={`absolute -left-[31px] top-0.5 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center bg-white ${
                      s.state === 'complete' ? 'border-emerald-500 text-emerald-500' :
                      s.state === 'active' ? 'border-indigo-500 text-indigo-500 animate-pulse' :
                      s.state === 'warning' ? 'border-purple-500 text-purple-500' :
                      s.state === 'failed' ? 'border-rose-500 text-rose-500' : 'border-gray-300'
                    }`}>
                      {s.state === 'complete' ? <CheckCircle2 className="h-3 w-3" /> :
                       s.state === 'failed' ? <AlertTriangle className="h-3 w-3" /> :
                       s.state === 'warning' ? <Bookmark className="h-3 w-3" /> : <div className="h-1.5 w-1.5 bg-gray-300 rounded-full" />}
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Step 3: Executive Board Decision</h4>
                      <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                        {s.state === 'pending' ? 'Formal decision regarding placement seat allocation.' : s.desc}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Step 4: Program Orientation Check */}
              {(() => {
                const s = getStepStatus('orientation');
                return (
                  <div className="relative" id="step-orientation">
                    <span className={`absolute -left-[31px] top-0.5 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center bg-white ${
                      s.state === 'complete' ? 'border-emerald-500 text-emerald-500' :
                      s.state === 'active' ? 'border-amber-500 text-amber-500 animate-pulse' : 'border-gray-300'
                    }`}>
                      {s.state === 'complete' ? <CheckCircle2 className="h-3 w-3" /> :
                       s.state === 'active' ? <Clock className="h-3 w-3" /> : <div className="h-1.5 w-1.5 bg-gray-300 rounded-full" />}
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Step 4: Incubator Orientation & Handover</h4>
                      <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                        {s.state === 'pending' ? 'Conducting on-boarding of verified, seat-confirmed startups.' : s.desc}
                      </p>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
          
          {/* Welcome Info Box */}
          {applicant.status === 'CONFIRMED' && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2 text-xs text-emerald-900 leading-relaxed font-semibold">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                Venture Onboarded!
              </p>
              <div className="pl-6 text-[11px] text-emerald-800 font-medium space-y-1">
                <p>Welcome to Takhleeq Incubator. Your team space registration is complete.</p>
                <p className="flex items-center gap-1.5 mt-2">
                  <CornerDownRight className="h-3.5 w-3.5" />
                  Orientation attendance status: {applicant.orientation_conducted ? (
                    <strong className="text-emerald-700">✓ Conducted & Complete</strong>
                  ) : (
                    <strong className="text-amber-700">● Pending (Awaiting next workshop)</strong>
                  )}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
