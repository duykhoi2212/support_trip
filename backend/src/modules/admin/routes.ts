import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middlewares/auth.js';
import { user_role } from '@prisma/client';
import { AdminController } from './controller.js';

export const adminRouter = Router();

// Toàn bộ API admin yêu cầu token hợp lệ và quyền ADMIN
adminRouter.use(authenticateToken, requireRole([user_role.ADMIN]));

// AD-01: Quản lý, xem chi tiết, khóa và mở khóa tài khoản
adminRouter.get('/users', AdminController.getUsers);
adminRouter.get('/users/:id', AdminController.getUserDetail);
adminRouter.post('/users/:id/lock', AdminController.lockUser);
adminRouter.post('/users/:id/unlock', AdminController.unlockUser);

// AD-02: Tiếp nhận và xử lý sự cố (4 trạng thái)
adminRouter.get('/incidents', AdminController.getIncidents);
adminRouter.patch('/incidents/:id/status', AdminController.updateIncidentStatus);

// AD-03: Thống kê chuyến theo ngày, KPI tổng quan & Xem chi tiết chuyến xe
adminRouter.get('/statistics/overview', AdminController.getStatisticsOverview);
adminRouter.get('/statistics/trips', AdminController.getTripsByDate);
adminRouter.get('/trips/:id', AdminController.getTripDetail);
