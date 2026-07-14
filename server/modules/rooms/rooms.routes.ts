import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.ts';
import { getRooms, createRoom, updateRoom, deleteRoom } from './rooms.controller.ts';

const router = Router();

// Get Room List
router.get('/rooms', getRooms);

// Add Room (Room Management or Admin)
router.post('/rooms', requireAuth, requirePermission('MANAGE_ROOMS'), createRoom);

// Update Room Details (Room Management or Admin)
router.put('/rooms/:id', requireAuth, requirePermission('MANAGE_ROOMS'), updateRoom);

// Delete Room (Room Management or Admin)
router.delete('/rooms/:id', requireAuth, requirePermission('MANAGE_ROOMS'), deleteRoom);

export default router;
