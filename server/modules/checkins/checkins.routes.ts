import { Router } from 'express';
import {
  createCheckin,
  getStartupCheckins,
  getCohortCheckins,
  getCheckinById,
  updateCheckin,
  deleteCheckin,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem
} from './checkins.controller.ts';

const router = Router();

// Check-ins Routes
router.post('/checkins', createCheckin as any);
router.get('/startup-profiles/:id/checkins', getStartupCheckins as any);
router.get('/cohorts/:cohortId/checkins', getCohortCheckins as any);
router.get('/checkins/:id', getCheckinById as any);
router.put('/checkins/:id', updateCheckin as any);
router.delete('/checkins/:id', deleteCheckin as any);

// Checklist Item Routes
router.post('/checkins/:id/checklist', addChecklistItem as any);
router.put('/checkin-checklist-items/:itemId', updateChecklistItem as any);
router.delete('/checkin-checklist-items/:itemId', deleteChecklistItem as any);

export default router;
