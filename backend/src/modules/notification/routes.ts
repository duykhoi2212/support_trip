import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.js';
import { NotificationController } from './controller.js';

const router = Router();

router.use(authenticateToken);

router.get('/', NotificationController.getMyNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/:id/read', NotificationController.markAsRead);
router.patch('/read-all', NotificationController.markAllAsRead);

export default router;
