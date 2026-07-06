import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.ts';
import { getAuditLogs, getReports } from './audit.controller.ts';

const router = Router();

// Retrieve all audit logs (Admin only)
router.get('/audit-logs', requireAuth, requirePermission('VIEW_AUDIT_LOGS'), getAuditLogs);

// Retrieve aggregated operational reports and metrics (Admin only)
router.get('/reports', requireAuth, requirePermission('VIEW_AUDIT_LOGS'), getReports);

export default router;
