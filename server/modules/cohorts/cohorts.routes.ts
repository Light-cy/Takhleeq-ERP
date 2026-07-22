import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.ts';
import {
  getCohortFormSettings,
  updateCohortFormSettings,
  submitApplicant,
  trackApplicant,
  getApplicants,
  getApplicantById,
  updateApplicantScores,
  updateApplicantStatus,
  updateApplicantOrientation,
  getCohorts,
  createCohort,
  updateCohortStatus,
  getCohortSessions,
  createCohortSession,
  deleteCohortSession,
  getSessionAttendance,
  saveSessionAttendance,
  getCohortCheckIns,
  createTeamCheckIn,
  getCohortWarnings,
  issuePerformanceWarning,
  resolvePerformanceWarning,
  getMyStartupDetails,
  updateApplicantProfile
} from './cohorts.controller.ts';

const router = Router();

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
router.get('/applicants', requireAuth, requirePermission('cohort:applicant_review'), getApplicants);
router.get('/applicants/:id', requireAuth, requirePermission('cohort:applicant_review'), getApplicantById);

// Applicant Admissions, Panel Scoring & Selection Decider
router.put('/applicants/:id/scores', requireAuth, requirePermission('cohort:applicant_review'), updateApplicantScores);
router.put('/applicants/:id/status', updateApplicantStatus);
router.put('/applicants/:id/orientation', requireAuth, requirePermission('cohort:attendance_write'), updateApplicantOrientation);

// Cohort lists and metadata
router.get('/cohorts', requireAuth, getCohorts);
router.post('/cohorts', requireAuth, requirePermission('cohort:form_manage'), createCohort);
router.put('/cohorts/:id/status', requireAuth, requirePermission('cohort:form_manage'), updateCohortStatus);

// Session Scheduling
router.get('/cohorts/:id/sessions', requireAuth, getCohortSessions);
router.post('/cohorts/:id/sessions', requireAuth, requirePermission('cohort:session_manage'), createCohortSession);
router.delete('/sessions/:id', requireAuth, requirePermission('cohort:session_manage'), deleteCohortSession);

// Attendance Markers
router.get('/sessions/:id/attendance', requireAuth, getSessionAttendance);
router.post('/sessions/:id/attendance', requireAuth, requirePermission('cohort:attendance_write'), saveSessionAttendance);

// Weekly Team Check-ins
router.get('/cohorts/:id/checkins', requireAuth, getCohortCheckIns);
router.post('/cohorts/:id/checkins', requireAuth, requirePermission('cohort:checkin_log'), createTeamCheckIn);

// Performance Warnings
router.get('/cohorts/:id/warnings', requireAuth, getCohortWarnings);
router.post('/cohorts/:id/warnings', requireAuth, requirePermission('cohort:warning_write'), issuePerformanceWarning);
router.put('/warnings/:id/resolve', requireAuth, requirePermission('cohort:warning_write'), resolvePerformanceWarning);

export default router;
