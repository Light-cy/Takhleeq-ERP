import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.ts';
import { getRooms, createRoom, updateRoom } from './rooms.controller.ts';

const router = Router();

// Get Room List
router.get('/rooms', getRooms);

// Add Room (Admin only)
router.post('/rooms', requireAuth, requirePermission('MANAGE_USERS'), createRoom);

// Update Room Details (Admin only)
router.put('/rooms/:id', requireAuth, requirePermission('MANAGE_USERS'), updateRoom);

export default router;
