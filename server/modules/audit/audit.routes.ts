import { Router } from 'express';
import { requireAuth, requireAnyPermission } from '../../middleware/auth.ts';
import { getAuditLogs, getReports } from './audit.controller.ts';

const router = Router();

// Retrieve all audit logs
router.get('/audit-logs', requireAuth, requireAnyPermission(['VIEW_AUDIT_LOGS', 'EXPORT_AUDIT_LOGS', 'VIEW_ANALYTICS_DASHBOARD']), getAuditLogs);

// Retrieve aggregated operational reports and metrics
router.get('/reports', requireAuth, requireAnyPermission(['VIEW_AUDIT_LOGS', 'VIEW_ANALYTICS_DASHBOARD']), getReports);

export default router;
