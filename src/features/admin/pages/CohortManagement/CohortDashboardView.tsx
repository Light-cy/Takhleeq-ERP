import React from 'react';
import { 
  GraduationCap, 
  Users, 
  Calendar, 
  Clock, 
  ChevronRight, 
  AlertTriangle, 
  Rocket, 
  ArrowUpRight,
  Plus,
  FileCheck2,
  FileText,
  CheckCircle2,
  Layers,
  Lock
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
  onUpdateCohortStatus?: (status: 'DRAFT' | 'ACTIVE' | 'COMPLETED', bulkGraduate?: boolean) => void;
}

export const CohortDashboardView: React.FC<CohortDashboardViewProps> = ({
  selectedCohort,
  cohorts,
  setSelectedCohort,
  applicants = [],
  sessions = [],
  warnings = [],
  assignments = [],
  milestoneSubmissions = [],
  auditLogs = [],
  onNavigateSubTab,
  onCreateCohort,
  onUpdateCohortStatus
}) => {
  // Scope data strictly to the selected cohort
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
  const safeSubmissions = Array.isArray(milestoneSubmissions) ? milestoneSubmissions : [];
  const safeLogs = Array.isArray(auditLogs) ? auditLogs : [];

  const cohortApplicants = safeApplicants.filter(a => matchesCohort(a.cohort_id));
  const cohortSessions = safeSessions.filter(s => matchesCohort(s.cohort_id));
  const cohortWarnings = safeWarnings.filter(w => matchesCohort(w.cohort_id));
  const cohortAssignments = safeAssignments.filter(a => matchesCohort(a.cohort_id));

  // Pipeline funnel calculations from database
  const pipeline = {
    applied: cohortApplicants.filter(a => a.status === 'APPLIED' || a.status === 'SUBMITTED').length,
    underReview: cohortApplicants.filter(a => a.status === 'UNDER_REVIEW' || a.status === 'IN_REVIEW').length,
    shortlisted: cohortApplicants.filter(a => a.status === 'SHORTLISTED_FOR_PRESENTATION' || (a.status as string) === 'SHORTLISTED').length,
    presentation: cohortApplicants.filter(a => a.status === 'PRESENTATION_CONDUCTED').length,
    accepted: cohortApplicants.filter(a => a.status === 'ACCEPTED' || a.status === 'CONDITIONAL_ACCEPTED' || a.status === 'CONFIRMED' || a.status === 'ENROLLED').length,
    rejected: cohortApplicants.filter(a => a.status === 'REJECTED').length,
  };

  // Program status categorizations (strictly mutually exclusive & synchronized)
  const activeStartups = cohortApplicants.filter(a => 
    a.program_status === 'ACTIVE' || 
    ((a.status === 'ENROLLED' || a.status === 'CONFIRMED') && !['PAUSED', 'GRADUATED', 'KICKED_OUT', 'NOT_ENROLLED'].includes(a.program_status))
  );
  const pausedStartups = cohortApplicants.filter(a => a.program_status === 'PAUSED');
  const graduatedStartups = cohortApplicants.filter(a => a.program_status === 'GRADUATED');
  const terminatedStartups = cohortApplicants.filter(a => a.program_status === 'KICKED_OUT');
  const notEnrolledApplicants = cohortApplicants.filter(a => 
    a.program_status === 'NOT_ENROLLED' || 
    (!['ACTIVE', 'PAUSED', 'GRADUATED', 'KICKED_OUT'].includes(a.program_status) && !['CONFIRMED', 'ENROLLED'].includes(a.status))
  );

  // Action items (strictly real counts)
  const pendingReviews = pipeline.applied + pipeline.underReview;
  const activeWarningsCount = cohortWarnings.filter(w => w.status === 'ACTIVE').length;
  const cohortAssignmentIds = new Set(cohortAssignments.map(a => a.id));
  const pendingDeliverablesCount = cohortAssignments.length === 0 
    ? 0 
    : safeSubmissions.filter(s => s.status === 'PENDING' && cohortAssignmentIds.has(s.assignment_id)).length;
  const backupCandidatesCount = cohortApplicants.filter(a => a.status === 'BACKUP_CANDIDATE' || a.status === 'WAITLISTED').length;

  // Filter audit logs
  const displayActivities = safeLogs.filter(log => 
    log.action.includes('COHORT') || log.action.includes('APPLICANT') || log.action.includes('WARNING') || log.action.includes('SESSION')
  ).slice(0, 8);

  const uncompletedCohort = cohorts.find(c => c.status !== 'COMPLETED');

  return (
    <div className="space-y-6 text-left font-sans" id="cohort-main-dashboard">
      
      {/* ----------------------------------------------------------------------------------- */}
      {/* HEADER BAR: COHORT SELECTOR & OVERVIEW METRICS */}
      {/* ----------------------------------------------------------------------------------- */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

            {onCreateCohort && (
              <button
                type="button"
                onClick={onCreateCohort}
                className={`${
                  uncompletedCohort
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs'
                    : 'bg-primary hover:bg-[#5A0F0F] text-white shadow-3xs'
                } text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5`}
                title={
                  uncompletedCohort
                    ? `Bulk Graduate '${uncompletedCohort.name}' before creating a new cohort`
                    : 'Initiate a new incubation cohort'
                }
              >
                {uncompletedCohort ? <Lock className="h-3.5 w-3.5 text-amber-700" /> : <Plus className="h-3.5 w-3.5" />}
                <span>New Cohort</span>
              </button>
            )}

            {onUpdateCohortStatus && selectedCohort && selectedCohort.status !== 'COMPLETED' && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to Complete '${selectedCohort.name}' and BULK GRADUATE all ${activeStartups.length} active startups?`)) {
                    onUpdateCohortStatus('COMPLETED', true);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                title="Mark this cohort as Completed and automatically graduate all active founders"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Bulk Graduate Cohort</span>
              </button>
            )}

            {onUpdateCohortStatus && selectedCohort && selectedCohort.status === 'COMPLETED' && (
              <button
                type="button"
                onClick={() => onUpdateCohortStatus('ACTIVE', false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                title="Re-open cohort to Active status"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Re-activate</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="flex items-center gap-6 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-150 rounded-xl px-4 py-2 shrink-0 w-full md:w-auto justify-between">
          <div>
            <span className="text-[9px] font-black uppercase text-gray-400 block font-mono">Applicants</span>
            <span className="text-sm font-black text-gray-900 font-mono">{cohortApplicants.length}</span>
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <span className="text-[9px] font-black uppercase text-gray-400 block font-mono">Enrolled Startups</span>
            <span className="text-sm font-black text-emerald-700 font-mono">{activeStartups.length}</span>
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <span className="text-[9px] font-black uppercase text-gray-400 block font-mono">Sessions</span>
            <span className="text-sm font-black text-gray-900 font-mono">{cohortSessions.length}</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------------------- */}
      {/* APPLICANT PIPELINE FUNNEL */}
      {/* ----------------------------------------------------------------------------------- */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs space-y-3">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Applicant Pipeline
          </h3>
          <span className="text-[10px] text-gray-400 font-bold">Real-time application counts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'APPLIED')}
            className="p-3 bg-gray-50/70 hover:bg-gray-100 border border-gray-150 rounded-xl text-left transition-all cursor-pointer group"
          >
            <span className="text-[9px] font-black text-gray-400 uppercase block font-mono">1. Applied</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-gray-900 font-mono">{pipeline.applied}</span>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary transition-colors" />
            </div>
          </button>

          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'UNDER_REVIEW')}
            className="p-3 bg-amber-50/40 hover:bg-amber-50/80 border border-amber-200/60 rounded-xl text-left transition-all cursor-pointer group"
          >
            <span className="text-[9px] font-black text-amber-700 uppercase block font-mono">2. In Review</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-amber-900 font-mono">{pipeline.underReview}</span>
              <ChevronRight className="h-3.5 w-3.5 text-amber-400 group-hover:text-amber-700 transition-colors" />
            </div>
          </button>

          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'SHORTLISTED_FOR_PRESENTATION')}
            className="p-3 bg-purple-50/40 hover:bg-purple-50/80 border border-purple-200/60 rounded-xl text-left transition-all cursor-pointer group"
          >
            <span className="text-[9px] font-black text-purple-700 uppercase block font-mono">3. Shortlisted</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-purple-900 font-mono">{pipeline.shortlisted}</span>
              <ChevronRight className="h-3.5 w-3.5 text-purple-400 group-hover:text-purple-700 transition-colors" />
            </div>
          </button>

          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'PRESENTATION_CONDUCTED')}
            className="p-3 bg-blue-50/40 hover:bg-blue-50/80 border border-blue-200/60 rounded-xl text-left transition-all cursor-pointer group"
          >
            <span className="text-[9px] font-black text-blue-700 uppercase block font-mono">4. Evaluated</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-blue-900 font-mono">{pipeline.presentation}</span>
              <ChevronRight className="h-3.5 w-3.5 text-blue-400 group-hover:text-blue-700 transition-colors" />
            </div>
          </button>

          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'ACCEPTED')}
            className="p-3 bg-emerald-50/40 hover:bg-emerald-50/80 border border-emerald-200/60 rounded-xl text-left transition-all cursor-pointer group"
          >
            <span className="text-[9px] font-black text-emerald-700 uppercase block font-mono">5. Accepted</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-emerald-900 font-mono">{pipeline.accepted}</span>
              <ChevronRight className="h-3.5 w-3.5 text-emerald-400 group-hover:text-emerald-700 transition-colors" />
            </div>
          </button>

          <button
            onClick={() => onNavigateSubTab('cohort_applications', 'REJECTED')}
            className="p-3 bg-rose-50/40 hover:bg-rose-50/80 border border-rose-200/60 rounded-xl text-left transition-all cursor-pointer group"
          >
            <span className="text-[9px] font-black text-rose-700 uppercase block font-mono">6. Rejected</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-rose-900 font-mono">{pipeline.rejected}</span>
              <ChevronRight className="h-3.5 w-3.5 text-rose-400 group-hover:text-rose-700 transition-colors" />
            </div>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------------------------- */}
      {/* OPERATIONAL SUMMARY & ACTION QUEUE */}
      {/* ----------------------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div 
          onClick={() => onNavigateSubTab('cohort_applications')}
          className="p-4 bg-white border border-gray-100 rounded-2xl shadow-3xs cursor-pointer hover:border-amber-300 transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-[9px] font-black text-amber-700 uppercase block font-mono">Pending Reviews</span>
            <span className="text-2xl font-black text-gray-900 font-mono">{pendingReviews}</span>
            <p className="text-[10px] text-gray-400 mt-0.5">Applications awaiting evaluation</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigateSubTab('cohort_assignments')}
          className="p-4 bg-white border border-gray-100 rounded-2xl shadow-3xs cursor-pointer hover:border-blue-300 transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-[9px] font-black text-blue-700 uppercase block font-mono">Pending Submissions</span>
            <span className="text-2xl font-black text-gray-900 font-mono">{pendingDeliverablesCount}</span>
            <p className="text-[10px] text-gray-400 mt-0.5">Milestones pending verification</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
            <FileCheck2 className="h-5 w-5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigateSubTab('cohort_warnings')}
          className="p-4 bg-white border border-gray-100 rounded-2xl shadow-3xs cursor-pointer hover:border-rose-300 transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-[9px] font-black text-rose-700 uppercase block font-mono">Active Warnings</span>
            <span className="text-2xl font-black text-gray-900 font-mono">{activeWarningsCount}</span>
            <p className="text-[10px] text-gray-400 mt-0.5">Performance flags issued</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-black">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigateSubTab('cohort_applications', 'BACKUP_CANDIDATE')}
          className="p-4 bg-white border border-gray-100 rounded-2xl shadow-3xs cursor-pointer hover:border-purple-300 transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-[9px] font-black text-purple-700 uppercase block font-mono">Waitlist Candidates</span>
            <span className="text-2xl font-black text-gray-900 font-mono">{backupCandidatesCount}</span>
            <p className="text-[10px] text-gray-400 mt-0.5">Backup candidates standing by</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------------------------------------- */}
      {/* 2-COLUMN GRID: STARTUPS & SESSIONS */}
      {/* ----------------------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Startups Summary */}
        <div className="lg:col-span-6 bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Startups Breakdown
            </h3>
            <button
              onClick={() => onNavigateSubTab('cohort_startups')}
              className="text-[10px] font-black text-primary hover:underline uppercase flex items-center gap-0.5"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-bold">
            <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
              <span className="text-[9px] font-black text-emerald-700 uppercase block font-mono">Active</span>
              <span className="text-xl font-black text-gray-900 font-mono">{activeStartups.length}</span>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
              <span className="text-[9px] font-black text-amber-700 uppercase block font-mono">Paused</span>
              <span className="text-xl font-black text-gray-900 font-mono">{pausedStartups.length}</span>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
              <span className="text-[9px] font-black text-blue-700 uppercase block font-mono">Graduated</span>
              <span className="text-xl font-black text-gray-900 font-mono">{graduatedStartups.length}</span>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
              <span className="text-[9px] font-black text-rose-700 uppercase block font-mono">Terminated</span>
              <span className="text-xl font-black text-gray-900 font-mono">{terminatedStartups.length}</span>
            </div>
          </div>
        </div>

        {/* Sessions Summary */}
        <div className="lg:col-span-6 bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Cohort Sessions ({cohortSessions.length})
            </h3>
            <button
              onClick={() => onNavigateSubTab('cohort_sessions')}
              className="text-[10px] font-black text-primary hover:underline uppercase"
            >
              Manage Sessions →
            </button>
          </div>

          <div className="space-y-2">
            {cohortSessions.length > 0 ? (
              cohortSessions.slice(0, 3).map(sess => (
                <div 
                  key={sess.id}
                  onClick={() => onNavigateSubTab('cohort_sessions')}
                  className="p-3 bg-gray-50/70 border border-gray-150 hover:border-primary/40 rounded-xl transition-all cursor-pointer text-xs space-y-1"
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-extrabold text-gray-900 truncate">{sess.title}</h4>
                    {sess.mentor_name && (
                      <span className="text-[10px] font-bold text-primary shrink-0">{sess.mentor_name}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    📅 {sess.date} ({sess.start_time ? sess.start_time.substring(0, 5) : ''})
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-gray-400 font-medium bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                No sessions created for this cohort yet.
              </div>
            )}
          </div>
        </div>

        {/* Deliverables & Assignments Summary */}
        <div className="lg:col-span-12 bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Cohort Deliverables & Assignments ({cohortAssignments.length})
            </h3>
            <button
              onClick={() => onNavigateSubTab('cohort_assignments')}
              className="text-[10px] font-black text-primary hover:underline uppercase flex items-center gap-0.5"
            >
              <span>Manage & Create Assignments →</span>
            </button>
          </div>

          <div className="space-y-2">
            {cohortAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cohortAssignments.slice(0, 6).map(asg => (
                  <div 
                    key={asg.id}
                    onClick={() => onNavigateSubTab('cohort_assignments')}
                    className="p-3 bg-gray-50/70 border border-gray-150 hover:border-primary/40 rounded-xl transition-all cursor-pointer text-xs space-y-2"
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!asg.session_id ? (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Independent
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                            Session Linked
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-rose-600 font-mono shrink-0">
                        Due: {asg.due_date}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-gray-900 text-xs truncate" title={asg.title}>{asg.title}</h4>
                    {asg.description && (
                      <p className="text-[10px] text-gray-500 line-clamp-1">{asg.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-gray-400 font-medium bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                No assignments or milestone deliverables published for this cohort yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------------------------------------- */}
      {/* RECENT ACTIVITY LOG */}
      {/* ----------------------------------------------------------------------------------- */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs space-y-3">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Recent Activity Log
          </h3>
          <span className="text-[10px] text-gray-400 font-bold">System Audit Ledger</span>
        </div>

        <div className="space-y-2 max-h-[260px] overflow-y-auto">
          {displayActivities.length > 0 ? (
            displayActivities.map(act => (
              <div key={act.id} className="p-3 bg-gray-50/60 border border-gray-150 rounded-xl text-xs flex justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-900 text-xs">{act.performedBy || 'System Administrator'}</span>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono">{act.action}</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">{act.details}</p>
                </div>
                <span className="text-[10px] text-gray-400 font-mono shrink-0">
                  {act.timestamp ? new Date(act.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-gray-400 font-medium bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              No recent audit activity recorded.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
