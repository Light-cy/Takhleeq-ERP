import { Router } from 'express';
import { requireAuth, requirePermission, requireAnyPermission } from '../../middleware/auth.ts';
import { 
  handleMicrosoftAuth, 
  handleSimulatedAuth, 
  getCurrentUser, 
  getUsers, 
  assignUserRole, 
  createUser,
  deleteUser 
} from './users.controller.ts';

const router = Router();

// Microsoft SSO Authentication Endpoint
router.post('/auth/azure-sso', handleMicrosoftAuth);

// Simulated Identity Authentication Endpoint (Dev/Test Bypass)
router.post('/auth/simulated', handleSimulatedAuth);

// Current Auth Session Details
router.get('/auth/me', requireAuth, getCurrentUser);

// Get User Registry
router.get('/users', requireAuth, requireAnyPermission(['MANAGE_USERS', 'MANAGE_ROLES', 'ISSUE_BAN', 'APPROVE_REJECT_BOOKINGS', 'BOOKING_OVERRIDE']), getUsers);

// Assign User Role (MANAGE_ROLES or MANAGE_USERS permission)
router.post('/users/assign-role', requireAuth, requireAnyPermission(['MANAGE_ROLES', 'MANAGE_USERS']), assignUserRole);

// Admin adds a simulated/pre-registered user account
router.post('/users', requireAuth, requirePermission('MANAGE_USERS'), createUser);

// Admin deletes a simulated/pre-registered user account
router.delete('/users/:email', requireAuth, requirePermission('MANAGE_USERS'), deleteUser);

export default router;
