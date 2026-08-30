import { Router } from 'express';
import {
  getIndustries,
  createIndustry,
  syncAcceptedStartupsRoute,
  getStartupProfiles,
  getFounderOwnProfile,
  getStartupProfileById,
  getStartupFullDetails,
  updateStartupProfile,
  adminUpdateStartupProfile,
  updateProgressStage,
  getStageHistory,
  createPivot,
  getPivots,
  getAuditLogs,
  revertAuditEntry,
  issueStartupWarning,
  resolveStartupWarning
} from './startups.controller.ts';
import {
  requestStartupPivot,
  getPivotRequests,
  reviewStartupPivot
} from '../cohorts/cohorts.controller.ts';

const router = Router();

// Lookup endpoints
router.get('/industries', getIndustries);
router.post('/industries', createIndustry);

// Auto-sync endpoint
router.post('/startup-profiles/sync-accepted', syncAcceptedStartupsRoute);

// Founder self-service lookup
router.get('/startup-profiles/me', getFounderOwnProfile);

// Startup Profile CRUD & Full Details
router.get('/startup-profiles', getStartupProfiles);
router.get('/startup-profiles/:id', getStartupProfileById);
router.get('/startup-profiles/:id/full-details', getStartupFullDetails);
router.put('/startup-profiles/:id', updateStartupProfile);
router.post('/startup-profiles/:id/admin-update', adminUpdateStartupProfile);

// Short /startups alias routes
router.get('/startups', getStartupProfiles);
router.get('/startups/:id', getStartupProfileById);
router.get('/startups/:id/full-details', getStartupFullDetails);
router.put('/startups/:id', updateStartupProfile);

// Warnings Management for Startups
router.post('/startup-profiles/:id/warnings', issueStartupWarning);
router.put('/startup-profiles/warnings/:warningId/resolve', resolveStartupWarning);

// Progress Stage Tracking
router.post('/startup-profiles/:id/stage', updateProgressStage);
router.get('/startup-profiles/:id/stage-history', getStageHistory);
router.get('/startups/:id/stage-history', getStageHistory);

// Startup Pivots
router.post('/startup-profiles/:id/pivots', createPivot);
router.get('/startup-profiles/:id/pivots', getPivots);
router.post('/startups/:id/pivots', createPivot);
router.get('/startups/:id/pivots', getPivots);

// Pivot Review Workflow endpoints
router.post('/startups/pivots/request', requestStartupPivot);
router.get('/startups/pivots', getPivotRequests);
router.post('/startups/pivots/:id/review', reviewStartupPivot);
router.post('/pivots/request', requestStartupPivot);
router.get('/pivots', getPivotRequests);
router.post('/pivots/:id/review', reviewStartupPivot);

// Audit Logs & Revert
router.get('/startup-profiles/:id/audit-logs', getAuditLogs);
router.post('/startup-profiles/:id/audit-logs/:logId/revert', revertAuditEntry);
router.get('/startups/:id/audit-logs', getAuditLogs);

export default router;
