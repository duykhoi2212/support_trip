import { Router } from 'express';
import { user_role } from '@prisma/client';
import { TripController } from './controller.js';
import { authenticateToken, requireRole } from '../../middlewares/auth.js';

export const tripRouter = Router();

// Routes công khai (Public)
tripRouter.get('/search', TripController.search);

// Routes dành cho Tài xế (DRIVER)
tripRouter.post('/', authenticateToken, requireRole([user_role.DRIVER]), TripController.create);
tripRouter.get('/mine', authenticateToken, requireRole([user_role.DRIVER]), TripController.getMyTrips);
tripRouter.post('/:id/cancel', authenticateToken, requireRole([user_role.DRIVER]), TripController.cancel);

// Chi tiết chuyến xe (Đặt sau cùng để tránh nuốt các route tĩnh)
tripRouter.get('/:id', TripController.getById);

