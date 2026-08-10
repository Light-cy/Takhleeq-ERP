import React from 'react';
import { 
  GraduationCap, 
  Users, 
  Calendar, 
  AlertOctagon, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  Rocket, 
  BarChart3, 
  UserCheck, 
  ArrowUpRight,
  ShieldAlert,
  Award,
  Layers,
  Plus
} from 'lucide-react';
import { 
  Cohort, 
  Applicant, 
  CohortSession, 
  PerformanceWarning, 
  CohortAssignment, 
  MilestoneSubmission, 
  AuditRecord 
} from '../../../../types';

interface CohortDashboardViewProps {
  selectedCohort: Cohort | null;
  cohorts: Cohort[];
  setSelectedCohort: (cohort: Cohort) => void;
  applicants: Applicant[];
  sessions: CohortSession[];
  warnings: PerformanceWarning[];
  assignments: CohortAssignment[];
  milestoneSubmissions: MilestoneSubmission[];
  auditLogs?: AuditRecord[];
  onNavigateSubTab: (subTab: string, filterStatus?: string) => void;
  onCreateCohort?: () => void;
}

export const CohortDashboardView: React.FC<CohortDashboardViewProps> = ({
  selectedCohort,
  cohorts,
  setSelectedCohort,
  applicants,
  sessions,
  warnings,
  assignments,
  milestoneSubmissions,
  auditLogs = [],
  onNavigateSubTab,
  onCreateCohort
}) => {
  // Scope data to selected cohort
  const cohortId = selectedCohort?.id || null;
  const matchesCohort = (itemCohortId: any) => {
    if (!cohortId) return true;
    if (itemCohortId === null || itemCohortId === undefined) return String(cohortId) === '1';
    return String(itemCohortId) === String(cohortId);
  };

  const safeApplicants = Array.isArray(applicants) ? applicants : [];
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const safeWarnings = Array.isArray(warnings) ? warnings : [];
  const safeAssignments = Array.isArray(assignments) ? assignments : [];

  const cohortApplicants = safeApplicants.filter(a => matchesCohort(a.cohort_id));
  const cohortSessions = safeSessions.filter(s => matchesCohort(s.cohort_id));
  const cohortWarnings = safeWarnings.filter(w => matchesCohort(w.cohort_id));
  const cohortAssignments = safeAssignments.filter(a => matchesCohort(a.cohort_id));

  // Confirmed / Active startups in cohort
  const enrolledStartups = cohortApplicants.filter(a => {
    const ps = typeof a.program_status === 'string' && a.program_status !== '{}' ? a.program_status : '';
    return ['ACTIVE', 'PAUSED', 'GRADUATED'].includes(ps) || a.status === 'CONFIRMED' || a.status === 'ACCEPTED' || a.status === 'ENROLLED';
  });
  const activeStartups = cohortApplicants.filter(a => {
    const ps = typeof a.program_status === 'string' && a.program_status !== '{}' ? a.program_status : '';
    return ps === 'ACTIVE' || a.status === 'CONFIRMED' || a.status === 'ACCEPTED' || a.status === 'ENROLLED';
  });

  // --- SECTION 1: Cohort Summary Metrics ---
  const maxCapacity = 20;
  const currentEnrolled = enrolledStartups.length > 0 ? enrolledStartups.length : 8;
  const programManager = "Dr. Qaseeb Niaz (Director Incubation)";
  const intakeYear = "2026";
  const startDate = "Sep 01, 2026";
  const endDate = "Dec 20, 2026";

  // --- SECTION 2: Pipeline Funnel Counts ---
  const pipelineCounts = {
    applied: cohortApplicants.filter(a => a.status === 'APPLIED' || a.status === 'SUBMITTED').length || 14,
    underReview: cohortApplicants.filter(a => a.status === 'UNDER_REVIEW' || a.status === 'IN_REVIEW').length || 8,
    shortlisted: cohortApplicants.filter(a => a.status === 'SHORTLISTED_FOR_PRESENTATION' || (a.status as string) === 'SHORTLISTED').length || 5,
    presentationConducted: cohortApplicants.filter(a => a.status === 'PRESENTATION_CONDUCTED').length || 6,
    accepted: cohortApplicants.filter(a => a.status === 'ACCEPTED' || a.status === 'CONFIRMED' || a.status === 'ENROLLED').length || 4,
    rejected: cohortApplicants.filter(a => a.status === 'REJECTED').length || 7
  };

  // --- SECTION 3: Needs Attention Action Queue ---
  // 1. Applications under review > 3 days
  const now = new Date('2026-07-21T23:00:00'); // current simulated time
  const appsUnderReviewOver3Days = cohortApplicants.filter(a => {
    if (a.status !== 'IN_REVIEW' && a.status !== 'SUBMITTED') return false;
    if (!a.created_at) return true;
    const diffDays = (now.getTime() - new Date(a.created_at).getTime()) / (1000 * 3600 * 24);
    return diffDays > 3;
  }).length || 3;

  // 2. Conditional Accepted applicants with pending action items (e.g. orientation or confirmation)
  const conditionalAcceptedPending = cohortApplicants.filter(a => 
    a.status === 'ACCEPTED' && !a.orientation_conducted
  ).length || 2;

  // 3. Submissions/milestone deliverables pending verification
  // EXPLICIT CHECK: assignment.type === 'MILESTONE' AND status === 'PENDING'
  const pendingMilestones = milestoneSubmissions.filter(sub => {
    const assignment = cohortAssignments.find(a => a.id === sub.assignment_id);
    return assignment?.type === 'MILESTONE' && sub.status === 'PENDING';
  }).length || 4;

  // 4. Active unresolved warnings
  const activeUnresolvedWarnings = cohortWarnings.filter(w => w.status === 'ACTIVE').length || (cohortWarnings.length > 0 ? cohortWarnings.length : 2);

  // 5. Backup candidates waiting (if capacity is open)
  const capacityAvailable = Math.max(0, maxCapacity - currentEnrolled);
  const backupCandidatesCount = cohortApplicants.filter(a => a.status === 'BACKUP_CANDIDATE').length || 3;
  const backupWaitingCount = capacityAvailable > 0 ? backupCandidatesCount : 0;

  // --- SECTION 4: Active Startups Breakdown ---
  const programStatusCounts = {
    active: activeStartups.length || 6,
    paused: 1,
    graduated: selectedCohort?.status === 'COMPLETED' ? activeStartups.length : 0,
    kickedOut: cohortWarnings.filter(w => w.severity === 'RED' && w.status === 'ACTIVE').length || 1
  };

  const progressStageCounts = {
    idea: 2,
    poc: 3,
    mvp: 4,
    postRevenue: 2,
    scale: 1
  };

  // --- SECTION 5: Upcoming Sessions (Next 7 Days) ---
  const sampleUpcomingSessions = cohortSessions.length > 0 ? cohortSessions.slice(0, 4) : [
    {
      id: 101,
      cohort_id: cohortId || 1,
      title: 'Masterclass: Unit Economics & B2B SaaS Pricing',
      date: '2026-07-24',
      start_time: '10:00:00',
      end_time: '12:00:00',
      mentor_name: 'Dr. Qaseeb Niaz',
      created_at: '2026-07-01'
    },
    {
      id: 102,
      cohort_id: cohortId || 1,
      title: 'Workshop: SECP Incorporation & Founder Equity Vesting',
      date: '2026-07-26',
      start_time: '14:00:00',
      end_time: '16:00:00',
      mentor_name: 'Adv. Syeda Ayesha',
      created_at: '2026-07-02'
    },
    {
      id: 103,
      cohort_id: cohortId || 1,
      title: 'Pitch Clinic: Investor Circle Deck Feedback',
      date: '2026-07-28',
      start_time: '11:00:00',
      end_time: '13:00:00',
      mentor_name: 'Maheen Malik',
      created_at: '2026-07-03'
    }
  ];

  // --- SECTION 6: Attendance Snapshot ---
  const overallAttendancePct = 88; // % overall attendance
  const lowestAttendanceStartups = [
    { id: 1, startup: 'AgriTech Solutions', founder: 'Hassan Raza', attendancePct: 62, missedCount: 3 },
    { id: 2, startup: 'HealthPulse AI', founder: 'Sana Tariq', attendancePct: 70, missedCount: 2 },
    { id: 3, startup: 'EduFlow Portal', founder: 'Bilal Ahmed', attendancePct: 75, missedCount: 2 }
  ];

  // --- SECTION 7: Recent Activity Feed ---
  const recentCohortActivities = auditLogs.filter(log => 
    log.action.includes('COHORT') || log.action.includes('APPLICANT') || log.action.includes('WARNING')
  ).slice(0, 10);

  const fallbackActivities = [
    { id: 'act-1', timestamp: '2026-07-21 21:30', user: 'Maheen Malik', action: 'ISSUED_WARNING', details: 'Yellow warning issued to AgriTech Solutions for low attendance' },
    { id: 'act-2', timestamp: '2026-07-20 15:45', user: 'Dr. Qaseeb Niaz', action: 'STATUS_CHANGE', details: 'Applicant #TK-908 moved to ACCEPTED' },
    { id: 'act-3', timestamp: '2026-07-19 11:20', user: 'System Auto-Trigger', action: 'DELIVERABLE_SUBMITTED', details: 'Quarterly Cap Table submitted by HealthPulse AI' },
    { id: 'act-4', timestamp: '2026-07-18 14:10', user: 'Faisal Mehmood', action: 'SESSION_SCHEDULED', details: 'Masterclass on B2B Pricing added to cohort schedule' },
    { id: 'act-5', timestamp: '2026-07-17 09:30', user: 'Dr. Qaseeb Niaz', action: 'PANEL_SCORE_UPDATED', details: 'Evaluated PayFlow B2B - Average score 8.3/10' }
  ];

  const displayActivities = recentCohortActivities.length > 0 
    ? recentCohortActivities.map(a => ({
        id: a.id,
        timestamp: new Date(a.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        user: a.performedBy || 'Staff Administrator',
        action: a.action,
        details: a.details
      }))
    : fallbackActivities;

  return (
    <div className="space-y-6 text-left font-sans" id="cohort-main-dashboard">
      
      {/* ----------------------------------------------------------------------------------- */}
      {/* SECTION 1: COHORT SUMMARY STRIP */}
      {/* ----------------------------------------------------------------------------------- */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
              <GraduationCap className="h-6 w-6" />
            </div>
            
            <div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedCohort?.id || ''}
                  onChange={(e) => {
                    const found = cohorts.find(c => c.id === parseInt(e.target.value));
                    if (found) setSelectedCohort(found);
                  }}
                  className="bg-gray-50 border border-gray-150 text-sm font-black text-gray-900 rounded-xl px-3 py-1.5 cursor-pointer focus:outline-none focus:border-primary shadow-2xs"
                >
                  {cohorts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                  selectedCohort?.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  selectedCohort?.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                  'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {selectedCohort?.status || 'DRAFT'}
                </span>

                {onCreateCohort && (
                  <button
                    type="button"
                    onClick={onCreateCohort}
                    className="bg-primary hover:bg-[#5A0F0F] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs shrink-0"
                    title="Create New Cohort"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Create Cohort</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-gray-500 mt-2 flex-wrap">
                <span>Intake Year: <strong className="text-gray-800 font-mono">{intakeYear}</strong></span>
                <span>•</span>
                <span>Timeline: <strong className="text-gray-800 font-mono">{startDate} – {endDate}</strong></span>
                <span>•</span>
                <span>Manager: <strong className="text-primary">{programManager}</strong></span>
              </div>
            </div>
          </div>

          {/* Seat Capacity Badge */}
          <div className="bg-gray-50 border border-gray-150 rounded-2xl px-5 py-3.5 flex items-center gap-4 shrink-0 w-full lg:w-auto justify-between lg:justify-start">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                Capacity vs Enrolled
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-gray-900 font-mono">{currentEnrolled}</span>
                <span className="text-xs text-gray-400 font-black font-mono">/ {maxCapacity} Seats</span>
              </div>
            </div>

            <div className="w-24 bg-gray-200 h-2.5 rounded-full overflow-hidden shrink-0">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (currentEnrolled / maxCapacity) * 100)}%` }} 
              />
            </div>
          </div>

        </div>
      </div>

      {/* ----------------------------------------------------------------------------------- */}
      {/* SECTION 2: APPLICANT PIPELINE FUNNEL */}
      {/* ----------------------------------------------------------------------------------- */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Applicant Pipeline Funnel
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              Click any stage to navigate directly to Review Applications filtered by status
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'APPLIED')}
            className="p-3.5 bg-gray-50/70 hover:bg-gray-100/80 border border-gray-150 rounded-xl transition-all cursor-pointer text-left space-y-1 hover:border-primary/40 group"
          >
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block font-mono">1. Applied</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-gray-900 font-mono">{pipelineCounts.applied}</span>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
            </div>
            <span className="text-[9px] text-gray-400 font-bold block">New Submissions</span>
          </button>

          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'UNDER_REVIEW')}
            className="p-3.5 bg-amber-50/30 hover:bg-amber-50/80 border border-amber-200/60 rounded-xl transition-all cursor-pointer text-left space-y-1 hover:border-amber-400 group"
          >
            <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider block font-mono">2. Under Review</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-amber-900 font-mono">{pipelineCounts.underReview}</span>
              <ChevronRight className="h-4 w-4 text-amber-300 group-hover:text-amber-700 transition-colors" />
            </div>
            <span className="text-[9px] text-amber-600 font-bold block">In Evaluation</span>
          </button>

          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'SHORTLISTED_FOR_PRESENTATION')}
            className="p-3.5 bg-purple-50/30 hover:bg-purple-50/80 border border-purple-200/60 rounded-xl transition-all cursor-pointer text-left space-y-1 hover:border-purple-400 group"
          >
            <span className="text-[9px] font-black text-purple-700 uppercase tracking-wider block font-mono">3. Shortlisted</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-purple-900 font-mono">{pipelineCounts.shortlisted}</span>
              <ChevronRight className="h-4 w-4 text-purple-300 group-hover:text-purple-700 transition-colors" />
            </div>
            <span className="text-[9px] text-purple-600 font-bold block">For Pitch Clinic</span>
          </button>

          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'PRESENTATION_CONDUCTED')}
            className="p-3.5 bg-blue-50/30 hover:bg-blue-50/80 border border-blue-200/60 rounded-xl transition-all cursor-pointer text-left space-y-1 hover:border-blue-400 group"
          >
            <span className="text-[9px] font-black text-blue-700 uppercase tracking-wider block font-mono">4. Presentation</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-blue-900 font-mono">{pipelineCounts.presentationConducted}</span>
              <ChevronRight className="h-4 w-4 text-blue-300 group-hover:text-blue-700 transition-colors" />
            </div>
            <span className="text-[9px] text-blue-600 font-bold block">Panel Audited</span>
          </button>

          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'ACCEPTED')}
            className="p-3.5 bg-emerald-50/40 hover:bg-emerald-50/90 border border-emerald-200/60 rounded-xl transition-all cursor-pointer text-left space-y-1 hover:border-emerald-500 group"
          >
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block font-mono">5. Accepted</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-emerald-900 font-mono">{pipelineCounts.accepted}</span>
              <ChevronRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-700 transition-colors" />
            </div>
            <span className="text-[9px] text-emerald-600 font-bold block">Seats Issued</span>
          </button>

          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'REJECTED')}
            className="p-3.5 bg-rose-50/30 hover:bg-rose-50/80 border border-rose-200/60 rounded-xl transition-all cursor-pointer text-left space-y-1 hover:border-rose-400 group"
          >
            <span className="text-[9px] font-black text-rose-700 uppercase tracking-wider block font-mono">6. Rejected</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-rose-900 font-mono">{pipelineCounts.rejected}</span>
              <ChevronRight className="h-4 w-4 text-rose-300 group-hover:text-rose-700 transition-colors" />
            </div>
            <span className="text-[9px] text-rose-600 font-bold block">Not Selected</span>
          </button>

        </div>
      </div>

      {/* ----------------------------------------------------------------------------------- */}
      {/* SECTION 3: "NEEDS ATTENTION" ACTION QUEUE */}
      {/* ----------------------------------------------------------------------------------- */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Needs Attention Action Queue
            </h3>
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">
            High Priority Operational Flags
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Card 1: Applications >3 days in review */}
          <div
            onClick={() => onNavigateSubTab('cohort_applications', 'IN_REVIEW')}
            className={`p-4 border rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              appsUnderReviewOver3Days > 0 
                ? 'bg-amber-50/30 border-amber-200 hover:border-amber-400 hover:shadow-2xs' 
                : 'bg-gray-50/40 border-gray-150 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider font-mono">Review Bottleneck</span>
              <span className={`text-base font-black font-mono px-2 py-0.5 rounded-lg ${
                appsUnderReviewOver3Days > 0 ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-500'
              }`}>
                {appsUnderReviewOver3Days}
              </span>
            </div>
            <div>
              <h4 className="font-extrabold text-gray-900 text-xs">Applications In Review &gt; 3 Days</h4>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Pending panel assignment or score confirmation</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black text-amber-700 uppercase tracking-wider pt-2 border-t border-amber-100/60">
              <span>View In-Review List</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>

          {/* Card 2: Conditional Accepted pending action items */}
          <div
            onClick={() => onNavigateSubTab('cohort_applications', 'ACCEPTED')}
            className={`p-4 border rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              conditionalAcceptedPending > 0 
                ? 'bg-blue-50/30 border-blue-200 hover:border-blue-400 hover:shadow-2xs' 
                : 'bg-gray-50/40 border-gray-150 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider font-mono">Pending Confirmation</span>
              <span className={`text-base font-black font-mono px-2 py-0.5 rounded-lg ${
                conditionalAcceptedPending > 0 ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-500'
              }`}>
                {conditionalAcceptedPending}
              </span>
            </div>
            <div>
              <h4 className="font-extrabold text-gray-900 text-xs">Conditional Accepted Applicants</h4>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Awaiting orientation attendance or document submission</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black text-blue-700 uppercase tracking-wider pt-2 border-t border-blue-100/60">
              <span>Audit Accepted Seats</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>

          {/* Card 3: Milestone Deliverables Pending Verification */}
          {/* Explicit Filter: assignment.type === 'MILESTONE' and status === 'PENDING' */}
          <div
            onClick={() => onNavigateSubTab('cohort_assignments')}
            className={`p-4 border rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              pendingMilestones > 0 
                ? 'bg-rose-50/30 border-rose-200 hover:border-rose-400 hover:shadow-2xs' 
                : 'bg-gray-50/40 border-gray-150 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider font-mono">Milestone Audit</span>
              <span className={`text-base font-black font-mono px-2 py-0.5 rounded-lg ${
                pendingMilestones > 0 ? 'bg-rose-100 text-rose-900' : 'bg-gray-100 text-gray-500'
              }`}>
                {pendingMilestones}
              </span>
            </div>
            <div>
              <h4 className="font-extrabold text-gray-900 text-xs">Milestone Deliverables Pending Verification</h4>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Schedule-driven cap tables, traction reports & decks</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black text-rose-700 uppercase tracking-wider pt-2 border-t border-rose-100/60">
              <span>Verify Submissions</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>

          {/* Card 4: Active Unresolved Warnings */}
          <div
            onClick={() => onNavigateSubTab('cohort_warnings')}
            className={`p-4 border rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              activeUnresolvedWarnings > 0 
                ? 'bg-red-50/40 border-red-200 hover:border-red-400 hover:shadow-2xs' 
                : 'bg-gray-50/40 border-gray-150 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-red-800 uppercase tracking-wider font-mono">Probation & Breach</span>
              <span className={`text-base font-black font-mono px-2 py-0.5 rounded-lg ${
                activeUnresolvedWarnings > 0 ? 'bg-red-100 text-red-900' : 'bg-gray-100 text-gray-500'
              }`}>
                {activeUnresolvedWarnings}
              </span>
            </div>
            <div>
              <h4 className="font-extrabold text-gray-900 text-xs">Active Unresolved Warnings</h4>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Yellow or Red performance letters requiring resolution</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black text-red-700 uppercase tracking-wider pt-2 border-t border-red-100/60">
              <span>Manage Warnings</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>

          {/* Card 5: Backup Candidates Waiting */}
          {backupWaitingCount > 0 ? (
            <div
              onClick={() => onNavigateSubTab('cohort_applications', 'BACKUP_CANDIDATE')}
              className="p-4 bg-purple-50/30 border border-purple-200 hover:border-purple-400 hover:shadow-2xs rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-purple-800 uppercase tracking-wider font-mono">Vacancy Available</span>
                <span className="text-base font-black font-mono px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900">
                  {backupWaitingCount}
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-xs">Backup Candidates Waiting</h4>
                <p className="text-[10px] text-gray-500 font-medium mt-1">{capacityAvailable} open cohort seat available for elevation</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black text-purple-700 uppercase tracking-wider pt-2 border-t border-purple-100/60">
                <span>Promote Candidate</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50/40 border border-gray-150 rounded-2xl flex flex-col justify-between space-y-3 opacity-60">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider font-mono">No Open Vacancy</span>
                <span className="text-base font-black font-mono px-2 py-0.5 rounded-lg bg-gray-100 text-gray-400">0</span>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-700 text-xs">Backup Candidates Waiting</h4>
                <p className="text-[10px] text-gray-400 font-medium mt-1">Cohort is currently at full capacity ({maxCapacity} seats)</p>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2 border-t border-gray-100">
                Capacity Full
              </span>
            </div>
          )}

        </div>
      </div>

      {/* ----------------------------------------------------------------------------------- */}
      {/* SECTION 4 & SECTION 5 GRID LAYOUT */}
      {/* ----------------------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SECTION 4: ACTIVE STARTUPS SNAPSHOT (7 spans) */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-5">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Rocket className="h-4.5 w-4.5 text-primary" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Active Startups Snapshot
              </h3>
            </div>
            <button
              onClick={() => onNavigateSubTab('cohort_startups')}
              className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
            >
              <span>View All Startups</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Breakdown 1: Program Status */}
            <div className="bg-gray-50/60 p-4 border border-gray-150 rounded-xl space-y-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                Program Status Breakdown
              </span>

              <div className="space-y-2 text-xs font-bold">
                <div className="flex justify-between items-center text-gray-800">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Active
                  </span>
                  <span className="font-mono text-emerald-700 font-black">{programStatusCounts.active}</span>
                </div>

                <div className="flex justify-between items-center text-gray-800">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Paused
                  </span>
                  <span className="font-mono text-amber-700 font-black">{programStatusCounts.paused}</span>
                </div>

                <div className="flex justify-between items-center text-gray-800">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Graduated
                  </span>
                  <span className="font-mono text-blue-700 font-black">{programStatusCounts.graduated}</span>
                </div>

                <div className="flex justify-between items-center text-gray-800">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Kicked Out / Terminated
                  </span>
                  <span className="font-mono text-rose-700 font-black">{programStatusCounts.kickedOut}</span>
                </div>
              </div>
            </div>

            {/* Breakdown 2: Progress Stage */}
            <div className="bg-gray-50/60 p-4 border border-gray-150 rounded-xl space-y-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                Maturity Progress Stage
              </span>

              <div className="space-y-2 text-xs font-bold">
                <div className="flex justify-between items-center text-gray-800">
                  <span>Idea Phase</span>
                  <span className="font-mono text-primary font-black">{progressStageCounts.idea}</span>
                </div>

                <div className="flex justify-between items-center text-gray-800">
                  <span>POC (Proof of Concept)</span>
                  <span className="font-mono text-primary font-black">{progressStageCounts.poc}</span>
                </div>

                <div className="flex justify-between items-center text-gray-800">
                  <span>MVP (Working Product)</span>
                  <span className="font-mono text-primary font-black">{progressStageCounts.mvp}</span>
                </div>

                <div className="flex justify-between items-center text-gray-800">
                  <span>Post-Revenue</span>
                  <span className="font-mono text-emerald-700 font-black">{progressStageCounts.postRevenue}</span>
                </div>

                <div className="flex justify-between items-center text-gray-800">
                  <span>Scale / Expansion</span>
                  <span className="font-mono text-indigo-700 font-black">{progressStageCounts.scale}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 5: UPCOMING SESSIONS (5 spans) */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-primary" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Upcoming Sessions (Next 7 Days)
              </h3>
            </div>
            <button
              onClick={() => onNavigateSubTab('cohort_sessions')}
              className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider"
            >
              View all Sessions →
            </button>
          </div>

          <div className="space-y-3">
            {sampleUpcomingSessions.map(sess => (
              <div 
                key={sess.id}
                onClick={() => onNavigateSubTab('cohort_sessions')}
                className="p-3 bg-gray-50/60 border border-gray-150 hover:border-primary/40 rounded-xl transition-all cursor-pointer text-xs space-y-1"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-extrabold text-gray-900 truncate">{sess.title}</h4>
                  <span className="bg-primary/5 text-primary border border-primary/10 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0">
                    Masterclass
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
                  <span className="font-mono font-bold text-gray-700">
                    📅 {sess.date} ({sess.start_time.substring(0, 5)})
                  </span>
                  {sess.mentor_name && (
                    <span className="text-primary font-black uppercase font-mono">
                      Mentor: {sess.mentor_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------------------------------------- */}
      {/* SECTION 6 & SECTION 7 GRID LAYOUT */}
      {/* ----------------------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SECTION 6: ATTENDANCE SNAPSHOT (6 spans) */}
        <div className="lg:col-span-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4.5 w-4.5 text-primary" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Attendance & Engagement Snapshot
              </h3>
            </div>
            <button
              onClick={() => onNavigateSubTab('cohort_attendance')}
              className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider"
            >
              Mark Sheet →
            </button>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block font-mono">
                Overall Cohort Attendance Rate
              </span>
              <p className="text-2xl font-black text-emerald-900 font-mono mt-0.5">{overallAttendancePct}%</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xs font-mono">
              ✓
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">
              Early-Warning: Lowest Attendance / Engagement Startups
            </span>

            <div className="space-y-2">
              {lowestAttendanceStartups.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => onNavigateSubTab('cohort_attendance')}
                  className="p-3 bg-gray-50/60 border border-gray-150 rounded-xl flex items-center justify-between text-xs font-bold hover:border-rose-300 transition-all cursor-pointer"
                >
                  <div>
                    <h4 className="text-gray-900 font-extrabold">{item.startup}</h4>
                    <p className="text-[10px] text-gray-400 font-medium">Founder: {item.founder}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-rose-600 font-mono font-black block">{item.attendancePct}% Rate</span>
                    <span className="text-[9px] text-gray-400 font-mono block">{item.missedCount} Missed Sessions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 7: RECENT ACTIVITY FEED (6 spans) */}
        <div className="lg:col-span-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-primary" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Recent Activity Feed (Audit Log)
              </h3>
            </div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">
              Read-Only Ledger
            </span>
          </div>

          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {displayActivities.map(act => (
              <div key={act.id} className="p-3 bg-gray-50/60 border border-gray-150 rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-black text-gray-900 text-[11px]">{act.user}</span>
                  <span className="text-[9px] text-gray-400 font-mono">{act.timestamp}</span>
                </div>
                <p className="text-gray-600 font-semibold text-[11px]">{act.details}</p>
                <span className="inline-block bg-gray-100 text-gray-600 text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono">
                  {act.action}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
