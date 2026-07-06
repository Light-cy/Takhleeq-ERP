import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.ts';
import { 
  handleMicrosoftAuth, 
  handleSimulatedAuth, 
  getCurrentUser, 
  getUsers, 
  assignUserRole, 
  createUser 
} from './users.controller.ts';

const router = Router();

// Microsoft SSO Authentication Endpoint
router.post('/auth/microsoft', handleMicrosoftAuth);

// Simulated Identity Authentication Endpoint (Dev/Test Bypass)
router.post('/auth/simulated', handleSimulatedAuth);

// Current Auth Session Details
router.get('/auth/me', requireAuth, getCurrentUser);

// Get User Registry
router.get('/users', requireAuth, requirePermission('MANAGE_USERS'), getUsers);

// Assign User Role (MANAGE_ROLES or MANAGE_USERS permission)
router.post('/users/assign-role', requireAuth, requirePermission('MANAGE_ROLES'), assignUserRole);

// Admin adds a simulated/pre-registered user account
router.post('/users', requireAuth, requirePermission('MANAGE_USERS'), createUser);

export default router;
