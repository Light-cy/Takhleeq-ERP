import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Bookmark, 
  CornerDownRight,
  ShieldAlert,
  Hourglass,
  Calendar,
  MessageSquare,
  Check
} from 'lucide-react';
import { 
  COHORT_STAGES, 
  normalizeApplicantStatus, 
  getStageIndexByStatus, 
  getStageByStatus,
  CohortStage
} from '../../../constants/cohortStages';

interface PublicCohortTrackPageProps {
  currentPath?: string;
  onNavigate: (path: string) => void;
}

export const PublicCohortTrackPage: React.FC<PublicCohortTrackPageProps> = ({ currentPath, onNavigate }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicant, setApplicant] = useState<any | null>(null);
  const [confirmingSeat, setConfirmingSeat] = useState(false);

  const fetchTrackingData = async (token: string) => {
    const response = await fetch(`/api/applicants/track/${token.trim()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to locate application records.');
    }

    return data;
  };

  React.useEffect(() => {
    let tokenParam: string | null = null;
    if (currentPath && currentPath.includes('?')) {
      const searchStr = currentPath.substring(currentPath.indexOf('?'));
      const urlParams = new URLSearchParams(searchStr);
      tokenParam = urlParams.get('token') || urlParams.get('id');
    }
    if (!tokenParam && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      tokenParam = urlParams.get('token') || urlParams.get('id');
    }
    if (tokenParam) {
      setTokenInput(tokenParam);
      setLoading(true);
      setError(null);
      fetchTrackingData(tokenParam)
        .then(data => setApplicant(data))
        .catch(err => {
          console.error(err);
          setError(err.message || 'Verification Error: Check your tracking token format and retry.');
        })
        .finally(() => setLoading(false));
    }
  }, [currentPath]);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setError(null);
    setApplicant(null);

    try {
      const data = await fetchTrackingData(tokenInput);
      setApplicant(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification Error: Check your tracking token format and retry.');
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

      // Re-fetch fresh tracking info to reflect stage history & confirmed status
      try {
        const fresh = await fetchTrackingData(applicant.tracking_token);
        setApplicant(fresh);
      } catch {
        setApplicant((prev: any) => ({
          ...prev,
          status: 'CONFIRMED'
        }));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Seat confirmation failed.');
    } finally {
      setConfirmingSeat(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  const currentNormalizedStatus = applicant ? normalizeApplicantStatus(applicant.status) : 'APPLIED';
  const currentStageIndex = applicant ? getStageIndexByStatus(applicant.status) : 0;
  const isBranchState = ['WAITLISTED', 'BACKUP_CANDIDATE', 'REJECTED'].includes(currentNormalizedStatus);

  // Filter linear stages (Steps 1 to 9)
  const linearStages = COHORT_STAGES.filter(s => s.type === 'linear');

  // Candidate friendly title mappings for the 9 linear stages
  const friendlyStageTitles: Record<string, { title: string; desc: string }> = {
    APPLIED: {
      title: '1. Application Intake',
      desc: 'Application submitted and logged into the admissions system.'
    },
    UNDER_REVIEW: {
      title: '2. Desk Review & Screening',
      desc: 'Evaluators checking venture alignment, pitch documents, and technical feasibility.'
    },
    SHORTLISTED_FOR_PRESENTATION: {
      title: '3. Shortlisted for Pitch Presentation',
      desc: 'Shortlisted candidate invited to present live pitch to the evaluation panel.'
    },
    PRESENTATION_CONDUCTED: {
      title: '4. Pitch Presentation Conducted',
      desc: 'Panel evaluation complete. Pitch scores recorded for Executive Board review.'
    },
    CONDITIONAL_ACCEPTED: {
      title: '5. Conditional Admission Offer',
      desc: 'Conditional offer issued subject to document verification or prerequisite setup.'
    },
    ACCEPTED: {
      title: '6. Admission Offer Issued',
      desc: 'Official admission offer granted! Founder seat confirmation required.'
    },
    CONFIRMED: {
      title: '7. Seat Confirmed & Workspace Reserved',
      desc: 'Seat acceptance confirmed. Venture assigned to incubation cohort.'
    },
    ORIENTATION_CONDUCTED: {
      title: '8. Incubator Orientation',
      desc: 'Onboarding session conducted. Workspace and lab access handed over.'
    },
    ENROLLED: {
      title: '9. Active Cohort Member',
      desc: 'Active venture enrolled in the incubator acceleration batch.'
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full" id="public-cohort-track-page">
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 bg-rose-50 text-primary text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full border border-rose-100 shadow-3xs">
          <Sparkles className="h-3 w-3 animate-pulse" />
          Admissions Tracker
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Track Your Application Progress</h1>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          Verify the real-time stage of your startup application or confirm your incubator cohort placement seat.
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
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-left text-xs text-rose-700 leading-relaxed font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
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
          {/* Header Profile Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Venture Profile</span>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">{applicant.startup_name}</h2>
              <p className="text-xs text-gray-500 font-bold flex flex-wrap items-center gap-2">
                <span>Founder: <strong className="text-gray-700">{applicant.name}</strong></span>
                <span className="h-3 w-px bg-gray-200 hidden sm:inline" />
                <span>Token: <strong className="text-gray-700 font-mono">{applicant.tracking_token}</strong></span>
                {applicant.created_at && (
                  <>
                    <span className="h-3 w-px bg-gray-200 hidden sm:inline" />
                    <span>Applied: <strong className="text-gray-700">{formatDate(applicant.created_at)}</strong></span>
                  </>
                )}
              </p>
            </div>

            {/* Status Pill Badge */}
            <div className="shrink-0">
              <span className={`text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-full border shadow-3xs block text-center ${
                currentNormalizedStatus === 'APPLIED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                currentNormalizedStatus === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                currentNormalizedStatus === 'SHORTLISTED_FOR_PRESENTATION' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                currentNormalizedStatus === 'PRESENTATION_CONDUCTED' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                currentNormalizedStatus === 'CONDITIONAL_ACCEPTED' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                currentNormalizedStatus === 'ACCEPTED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
                currentNormalizedStatus === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                currentNormalizedStatus === 'ORIENTATION_CONDUCTED' ? 'bg-lime-50 text-lime-700 border-lime-200' :
                currentNormalizedStatus === 'ENROLLED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                currentNormalizedStatus === 'WAITLISTED' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                currentNormalizedStatus === 'BACKUP_CANDIDATE' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {getStageByStatus(currentNormalizedStatus).shortLabel}
              </span>
            </div>
          </div>

          {/* BRANCH / EXCEPTION STATUS CALLOUT BANNERS */}
          {isBranchState && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`rounded-2xl p-6 border shadow-3xs flex items-start gap-4 ${
                currentNormalizedStatus === 'REJECTED'
                  ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                  : currentNormalizedStatus === 'WAITLISTED'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-purple-50/70 border-purple-200 text-purple-900'
              }`}
              id="branch-status-callout"
            >
              <div className="p-2.5 rounded-xl bg-white shadow-3xs shrink-0 mt-0.5">
                {currentNormalizedStatus === 'REJECTED' && <ShieldAlert className="h-5 w-5 text-rose-600" />}
                {currentNormalizedStatus === 'WAITLISTED' && <Hourglass className="h-5 w-5 text-amber-600 animate-spin" />}
                {currentNormalizedStatus === 'BACKUP_CANDIDATE' && <Bookmark className="h-5 w-5 text-purple-600" />}
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {currentNormalizedStatus === 'REJECTED' && 'Application Status: Not Selected'}
                  {currentNormalizedStatus === 'WAITLISTED' && 'Application Status: Waitlisted'}
                  {currentNormalizedStatus === 'BACKUP_CANDIDATE' && 'Application Status: Backup Candidate Pool'}
                </h3>
                <p className="text-xs leading-relaxed font-semibold opacity-90">
                  {currentNormalizedStatus === 'REJECTED' && 
                    'Thank you for applying to Takhleeq Business Incubator. After careful evaluation by our selection panel, your startup was not selected for this cohort intake cycle. We encourage you to refine your model and reapply in future rounds.'}
                  {currentNormalizedStatus === 'WAITLISTED' && 
                    'Your application has been placed on the admissions waitlist. If an admitted venture forfeits their placement seat before cohort commencement, waitlisted candidates will be contacted in order.'}
                  {currentNormalizedStatus === 'BACKUP_CANDIDATE' && 
                    'Your application is retained in our backup candidate pool. The admissions office will review backup candidates if additional capacity or rolling review windows open.'}
                </p>
              </div>
            </motion.div>
          )}

          {/* DYNAMIC SEAT CONFIRMATION INTERACTIVE CARD */}
          {currentNormalizedStatus === 'ACCEPTED' && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-3xs"
              id="seat-confirmation-box"
            >
              <div className="space-y-1.5 text-center md:text-left flex-1">
                <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center justify-center md:justify-start gap-2">
                  <Award className="h-5 w-5 text-indigo-600" />
                  Cohort Placement Offer Granted!
                </h3>
                <p className="text-xs text-indigo-900 leading-relaxed font-semibold max-w-xl">
                  Congratulations! Takhleeq Incubator has issued an admission offer for <strong>{applicant.startup_name}</strong>. Please confirm your seat acceptance to reserve your workspace and mentor allocation.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSeatConfirmation}
                disabled={confirmingSeat}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider py-3.5 px-8 rounded-xl transition-all shrink-0 cursor-pointer shadow-3xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {confirmingSeat ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Securing Space...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirm My Seat
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* ROADMAP TIMELINE VISUALIZER (12-STAGE CANONICAL PIPELINE) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-3xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest font-mono flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                Admission Stage Pipeline Timeline
              </h3>
              <span className="text-[10px] font-bold text-gray-400">
                {applicant.stage_history ? `${applicant.stage_history.length} logged milestone(s)` : 'Live status'}
              </span>
            </div>

            <div className="relative pl-6 space-y-8 border-l border-gray-150">
              {linearStages.map((stage, idx) => {
                const stageKey = stage.key;
                const stageIndex = stage.stepNumber - 1; // 0-based
                
                // Find matching stage_history entry
                const historyEntries = (applicant.stage_history || []).filter(
                  (h: any) => normalizeApplicantStatus(h.new_stage) === stageKey
                );
                const latestHistory = historyEntries.length > 0 ? historyEntries[historyEntries.length - 1] : null;

                // Determine stage status: 'complete' | 'active' | 'pending'
                let state: 'complete' | 'active' | 'pending' = 'pending';

                if (isBranchState) {
                  // For branch states (WAITLISTED, BACKUP_CANDIDATE, REJECTED), linear stages that have logged history are completed
                  const hasHistory = latestHistory !== null || (stageKey === 'APPLIED' && Boolean(applicant.created_at));
                  if (hasHistory) {
                    state = 'complete';
                  } else {
                    state = 'pending';
                  }
                } else {
                  // Linear stage progression:
                  if (currentNormalizedStatus === 'ENROLLED') {
                    state = 'complete';
                  } else if (currentNormalizedStatus === stageKey) {
                    state = 'active';
                  } else if (stageIndex < currentStageIndex) {
                    state = 'complete';
                  } else {
                    state = 'pending';
                  }
                }

                const friendly = friendlyStageTitles[stageKey] || { title: stage.label, desc: stage.desc };
                const eventTimestamp = latestHistory?.change_date 
                  ? formatDate(latestHistory.change_date) 
                  : (stageKey === 'APPLIED' && applicant.created_at ? formatDate(applicant.created_at) : null);

                return (
                  <div key={stageKey} className="relative" id={`timeline-stage-${stageKey.toLowerCase()}`}>
                    {/* Circle Indicator */}
                    <span className={`absolute -left-[31px] top-0.5 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center bg-white transition-all ${
                      state === 'complete' 
                        ? 'border-emerald-500 text-emerald-500 shadow-3xs' 
                        : state === 'active' 
                        ? 'border-primary text-primary animate-pulse ring-4 ring-rose-50' 
                        : 'border-gray-300 text-gray-300'
                    }`}>
                      {state === 'complete' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-500 text-white" />
                      ) : state === 'active' ? (
                        <div className="h-2 w-2 bg-primary rounded-full animate-ping" />
                      ) : (
                        <div className="h-1.5 w-1.5 bg-gray-300 rounded-full" />
                      )}
                    </span>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className={`text-xs font-black uppercase tracking-wider ${
                          state === 'complete' ? 'text-gray-900' : state === 'active' ? 'text-primary font-black' : 'text-gray-400'
                        }`}>
                          {friendly.title}
                        </h4>
                        {eventTimestamp && (
                          <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {eventTimestamp}
                          </span>
                        )}
                      </div>

                      <p className={`text-xs leading-relaxed font-semibold ${
                        state === 'pending' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {friendly.desc}
                      </p>

                      {/* Display remark / comment note if included in history */}
                      {latestHistory && latestHistory.comments && latestHistory.include_in_email !== false && (
                        <div className="mt-2 p-2.5 bg-gray-50 border border-gray-150 rounded-lg text-[11px] text-gray-700 leading-normal flex items-start gap-2 font-medium">
                          <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-gray-900 block text-[10px] uppercase tracking-wider">Admissions Note:</span>
                            {latestHistory.comments}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Welcome Info Box for Confirmed/Enrolled */}
          {(currentNormalizedStatus === 'CONFIRMED' || currentNormalizedStatus === 'ORIENTATION_CONDUCTED' || currentNormalizedStatus === 'ENROLLED') && (
            <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2 text-xs text-emerald-950 leading-relaxed font-semibold shadow-3xs">
              <p className="flex items-center gap-2 font-black text-sm text-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                Venture Onboarded to Incubation Program!
              </p>
              <div className="pl-7 text-xs text-emerald-900 font-medium space-y-1.5">
                <p>Welcome to Takhleeq Incubator. Your physical workspace reservation and cohort placement are active.</p>
                <p className="flex items-center gap-1.5 mt-2">
                  <CornerDownRight className="h-4 w-4 text-emerald-600" />
                  Orientation Attendance Status: {applicant.orientation_conducted ? (
                    <strong className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">✓ Conducted & Completed</strong>
                  ) : (
                    <strong className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">● Pending Schedule</strong>
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
