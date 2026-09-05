import { Router } from 'express';
import { requireAuth, requirePermission, requireAnyPermission } from '../../middleware/auth.ts';
import {
  getCohortFormSettings,
  updateCohortFormSettings,
  submitApplicant,
  trackApplicant,
  getApplicants,
  getApplicantById,
  updateApplicantScores,
  updateApplicantStatus,
  updateApplicantProgramStatus,
  updateApplicantOrientation,
  getCohorts,
  createCohort,
  updateCohortStatus,
  updateCohortSettings,
  getCohortSessions,
  createCohortSession,
  updateCohortSession,
  deleteCohortSession,
  getSessionAttendance,
  saveSessionAttendance,
  createSessionAssignment,
  createCohortAssignment,
  getCohortAssignments,
  getSessionAssignments,
  deleteSessionAssignment,
  updateAssignment,
  getAssignmentSubmissions,
  submitAssignment,
  getCohortCheckIns,
  createTeamCheckIn,
  getCohortWarnings,
  issuePerformanceWarning,
  resolvePerformanceWarning,
  getMyStartupDetails,
  updateApplicantProfile,
  getApplicantStageHistory,
  getApplicantCredentials,
  manageApplicantCredentials,
  submitCohortFeedback,
  getCohortFeedback,
  updateCohortFeedbackStatus,
  deleteCohortFeedback,
  getSessionFeedback,
  submitSessionFeedback,
  createFeedbackForm,
  getFeedbackForms,
  getPendingFeedbackForms,
  submitFeedbackFormResponse,
  getFeedbackFormResponses,
  updateFeedbackFormStatus,
  deleteFeedbackForm,
  requestStartupPivot,
  getPivotRequests,
  reviewStartupPivot
} from './cohorts.controller.ts';

const router = Router();

const COHORT_VIEW_PERMS = [
  'cohort:dashboard_view',
  'VIEW_COHORT_DASHBOARD',
  'cohort:applicant_review',
  'REVIEW_COHORT_APPLICATIONS',
  'cohort:startups_manage',
  'MANAGE_COHORT_STARTUPS',
  'cohort:session_manage',
  'MANAGE_COHORT_SESSIONS',
  'cohort:assignment_manage',
  'MANAGE_COHORT_ASSIGNMENTS',
  'cohort:form_manage',
  'MANAGE_APPLICATION_FORM',
  'cohort:settings_manage',
  'MANAGE_COHORT_SETTINGS',
  'cohort:feedback_view',
  'VIEW_FOUNDER_FEEDBACK',
  'cohort:feedback_forms_manage',
  'MANAGE_FEEDBACK_FORMS',
  'cohort:attendance_write',
  'cohort:checkin_log',
  'cohort:warning_write'
];

// --- PUBLIC ROUTING ---
// Get public dynamic form config
router.get('/cohort-form-settings', getCohortFormSettings);

// Public application form submission
router.post('/applicants', submitApplicant);

// Public status tracking
router.get('/applicants/track/:token', trackApplicant);

// --- FOUNDER SELF-SERVICE ROUTING ---
router.get('/my-startup', requireAuth, getMyStartupDetails);
router.put('/applicants/:id/profile', requireAuth, updateApplicantProfile);


// --- PROTECTED ADMIN ROUTING ---
// Update dynamic form structure and switch form ON/OFF
router.post('/cohort-form-settings', requireAuth, requirePermission('cohort:form_manage'), updateCohortFormSettings);

// Applicant listings and details
router.get('/applicants', requireAuth, requireAnyPermission(COHORT_VIEW_PERMS), getApplicants);
router.get('/applicants/:id/stage-history', requireAuth, requireAnyPermission(COHORT_VIEW_PERMS), getApplicantStageHistory);
router.get('/applicants/:id', requireAuth, requireAnyPermission(COHORT_VIEW_PERMS), getApplicantById);

// Applicant Admissions, Panel Scoring & Selection Decider
router.get('/applicants/:id/credentials', requireAuth, requirePermission('cohort:applicant_review'), getApplicantCredentials);
router.post('/applicants/:id/credentials', requireAuth, requirePermission('cohort:applicant_review'), manageApplicantCredentials);
router.put('/applicants/:id/scores', requireAuth, requirePermission('cohort:applicant_review'), updateApplicantScores);
router.put('/applicants/:id/status', updateApplicantStatus);
router.put('/applicants/:id/program-status', requireAuth, requirePermission('cohort:applicant_review'), updateApplicantProgramStatus);
router.put('/applicants/:id/orientation', requireAuth, requirePermission('cohort:attendance_write'), updateApplicantOrientation);

// Cohort lists and metadata
router.get('/cohorts', requireAuth, getCohorts);
router.post('/cohorts', requireAuth, requirePermission('cohort:form_manage'), createCohort);
router.put('/cohorts/:id', requireAuth, requireAnyPermission(COHORT_VIEW_PERMS), updateCohortSettings);
router.patch('/cohorts/:id', requireAuth, requireAnyPermission(COHORT_VIEW_PERMS), updateCohortSettings);
router.put('/cohorts/:id/status', requireAuth, requirePermission('cohort:form_manage'), updateCohortStatus);

// Session Scheduling
router.get('/cohorts/:id/sessions', requireAuth, getCohortSessions);
router.post('/cohorts/:id/sessions', requireAuth, requirePermission('cohort:session_manage'), createCohortSession);
router.patch('/sessions/:id', requireAuth, requirePermission('cohort:session_manage'), updateCohortSession);
router.delete('/sessions/:id', requireAuth, requirePermission('cohort:session_manage'), deleteCohortSession);

// Session Specific Feedback & Ratings (Opens after session date, active for 7 days)
router.get('/sessions/:id/feedback', requireAuth, getSessionFeedback);
router.post('/sessions/:id/feedback', requireAuth, submitSessionFeedback);

// Attendance Markers
router.get('/sessions/:id/attendance', requireAuth, getSessionAttendance);
router.post('/sessions/:id/attendance', requireAuth, requirePermission('cohort:attendance_write'), saveSessionAttendance);

// Session Assignments & Submissions
router.get('/sessions/:id/assignments', requireAuth, getSessionAssignments);
router.post('/sessions/:id/assignments', requireAuth, requirePermission('cohort:session_manage'), createSessionAssignment);
router.get('/cohorts/:id/assignments', requireAuth, getCohortAssignments);
router.post('/cohorts/:id/assignments', requireAuth, requirePermission('cohort:session_manage'), createCohortAssignment);
router.get('/assignments', requireAuth, getCohortAssignments);
router.post('/assignments', requireAuth, requirePermission('cohort:session_manage'), createCohortAssignment);
router.delete('/assignments/:id', requireAuth, requirePermission('cohort:session_manage'), deleteSessionAssignment);
router.put('/assignments/:id', requireAuth, requirePermission('cohort:session_manage'), updateAssignment);
router.get('/assignments/:id/submissions', requireAuth, requirePermission('cohort:attendance_write'), getAssignmentSubmissions);
router.post('/assignments/:id/submit', requireAuth, submitAssignment);

// Weekly Team Check-ins
router.get('/cohorts/:id/checkins', requireAuth, getCohortCheckIns);
router.post('/cohorts/:id/checkins', requireAuth, requirePermission('cohort:checkin_log'), createTeamCheckIn);

// Performance Warnings
router.get('/cohorts/:id/warnings', requireAuth, getCohortWarnings);
router.post('/cohorts/:id/warnings', requireAuth, requirePermission('cohort:warning_write'), issuePerformanceWarning);
router.put('/warnings/:id/resolve', requireAuth, requirePermission('cohort:warning_write'), resolvePerformanceWarning);

// Cohort & Program Feedback System
router.post('/cohort-feedback', requireAuth, submitCohortFeedback);
router.get('/cohort-feedback', requireAuth, getCohortFeedback);
router.put('/cohort-feedback/:id/status', requireAuth, updateCohortFeedbackStatus);
router.delete('/cohort-feedback/:id', requireAuth, deleteCohortFeedback);

// Generalized Feedback Forms & Surveys System (FR-02 Feedback Builder & Anonymized Responses)
router.post('/cohorts/:cohortId/feedback-forms', requireAuth, createFeedbackForm);
router.post('/feedback-forms', requireAuth, createFeedbackForm);
router.get('/cohorts/:cohortId/feedback-forms', requireAuth, getFeedbackForms);
router.get('/feedback-forms', requireAuth, getFeedbackForms);
router.get('/cohorts/:cohortId/feedback-forms/pending', requireAuth, getPendingFeedbackForms);
router.get('/feedback-forms/pending', requireAuth, getPendingFeedbackForms);
router.get('/feedback-forms/:id/responses', requireAuth, getFeedbackFormResponses);
router.post('/feedback-forms/:id/responses', requireAuth, submitFeedbackFormResponse);
router.post('/feedback-forms/:id/submit', requireAuth, submitFeedbackFormResponse);
router.patch('/feedback-forms/:id/status', requireAuth, updateFeedbackFormStatus);
router.put('/feedback-forms/:id/status', requireAuth, updateFeedbackFormStatus);
router.delete('/feedback-forms/:id', requireAuth, deleteFeedbackForm);

// Strategic Pivot Request-Approval Workflow
router.post('/pivots/request', requireAuth, requestStartupPivot);
router.post('/startup-pivots/request', requireAuth, requestStartupPivot);
router.get('/pivots', requireAuth, getPivotRequests);
router.get('/startup-pivots', requireAuth, getPivotRequests);
router.post('/pivots/:id/review', requireAuth, reviewStartupPivot);
router.post('/startup-pivots/:id/review', requireAuth, reviewStartupPivot);

export default router;
