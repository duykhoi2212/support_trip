import { Router } from 'express';
import { user_role } from '@prisma/client';
import { authenticateToken, requireRole } from '../../middlewares/auth.js';
import { uploadImage } from '../file-storage/multer.js';
import { RequestController } from './controller.js';

const router = Router();

router.use(authenticateToken);

// 1. Chức năng Người dùng (User)
router.post('/ride', RequestController.createRide);
router.post('/package', uploadImage.single('photo'), RequestController.createPackage);
router.get('/mine', RequestController.getMine);
router.post('/:id/cancel', RequestController.cancel);

// 2. Chức năng Tài xế (Driver)
router.get('/trip/:tripId', requireRole([user_role.DRIVER]), RequestController.getTripRequests);
router.post('/:id/accept', requireRole([user_role.DRIVER]), RequestController.accept);
router.post('/:id/reject', requireRole([user_role.DRIVER]), RequestController.reject);
router.patch('/:id/progress', requireRole([user_role.DRIVER]), RequestController.updateProgress);

// 3. Điều hành chuyến xe (Driver)
router.post('/trip/:tripId/start', requireRole([user_role.DRIVER]), RequestController.startTrip);
router.post('/trip/:tripId/complete', requireRole([user_role.DRIVER]), RequestController.completeTrip);

export default router;
