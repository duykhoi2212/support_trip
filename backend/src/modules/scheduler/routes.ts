import { Router } from 'express';
import { user_role } from '@prisma/client';
import { SchedulerController } from './controller.js';
import { authenticateToken, requireRole } from '../../middlewares/auth.js';

export const schedulerRouter = Router();

// Xem trạng thái scheduler
schedulerRouter.get('/status', SchedulerController.getStatus);

// Các trigger thủ công yêu cầu quyền ADMIN
schedulerRouter.post(
  '/trigger/close-trips',
  authenticateToken,
  requireRole([user_role.ADMIN]),
  SchedulerController.triggerCloseTrips
);

schedulerRouter.post(
  '/trigger/weekly-cancellation',
  authenticateToken,
  requireRole([user_role.ADMIN]),
  SchedulerController.triggerWeeklyCancellation
);

schedulerRouter.post(
  '/trigger/unlock-accounts',
  authenticateToken,
  requireRole([user_role.ADMIN]),
  SchedulerController.triggerUnlockAccounts
);

schedulerRouter.post(
  '/trigger/overdue-trips',
  authenticateToken,
  requireRole([user_role.ADMIN]),
  SchedulerController.triggerOverdueTrips
);

