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

// Warnings Management for Startups
router.post('/startup-profiles/:id/warnings', issueStartupWarning);
router.put('/startup-profiles/warnings/:warningId/resolve', resolveStartupWarning);

// Progress Stage Tracking
router.post('/startup-profiles/:id/stage', updateProgressStage);
router.get('/startup-profiles/:id/stage-history', getStageHistory);

// Startup Pivots
router.post('/startup-profiles/:id/pivots', createPivot);
router.get('/startup-profiles/:id/pivots', getPivots);

// Audit Logs & Revert
router.get('/startup-profiles/:id/audit-logs', getAuditLogs);
router.post('/startup-profiles/:id/audit-logs/:logId/revert', revertAuditEntry);

export default router;
