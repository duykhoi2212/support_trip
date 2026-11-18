import { Router } from 'express';
import { user_role } from '@prisma/client';
import { authenticateToken, requireRole } from '../../middlewares/auth.js';
import { uploadImage } from '../file-storage/multer.js';
import { RequestController } from './controller.js';

const router = Router();

router.use(authenticateToken);

// 1. Chức năng Người dùng (User) - Bắt buộc đúng vai trò USER
router.get('/dashboard', requireRole([user_role.USER]), RequestController.getUserDashboard);
router.post('/ride', requireRole([user_role.USER]), RequestController.createRide);
router.post('/package', requireRole([user_role.USER]), uploadImage.single('photo'), RequestController.createPackage);
router.get('/mine', requireRole([user_role.USER]), RequestController.getMine);
router.get('/history', requireRole([user_role.USER]), RequestController.getUserHistory);
router.post('/:id/cancel', requireRole([user_role.USER]), RequestController.cancel);

// 2. Chức năng Tài xế (Driver)
router.get('/trip/:tripId', requireRole([user_role.DRIVER]), RequestController.getTripRequests);
router.post('/:id/accept', requireRole([user_role.DRIVER]), RequestController.accept);
router.post('/:id/reject', requireRole([user_role.DRIVER]), RequestController.reject);
router.patch('/:id/progress', requireRole([user_role.DRIVER]), RequestController.updateProgress);
router.post('/:id/report-issue', requireRole([user_role.DRIVER]), RequestController.reportIssue);

// 3. Điều hành chuyến xe (Driver)
router.post('/trip/:tripId/start', requireRole([user_role.DRIVER]), RequestController.startTrip);
router.post('/trip/:tripId/pickup-all', requireRole([user_role.DRIVER]), RequestController.pickupAll);
router.post('/trip/:tripId/dropoff-all', requireRole([user_role.DRIVER]), RequestController.dropoffAll);
router.post('/trip/:tripId/complete', requireRole([user_role.DRIVER]), RequestController.completeTrip);

export default router;
