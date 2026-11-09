import { Router } from 'express';
import { user_role } from '@prisma/client';
import { VehicleController } from './controller.js';
import { authenticateToken, requireRole } from '../../middlewares/auth.js';
import { uploadImage } from '../file-storage/multer.js';

export const vehicleRouter = Router();

// Toàn bộ chức năng quản lý phương tiện chỉ dành cho vai trò DRIVER
vehicleRouter.use(authenticateToken, requireRole([user_role.DRIVER]));

vehicleRouter.post('/', uploadImage.single('photo'), VehicleController.create);
vehicleRouter.get('/', VehicleController.getMyVehicles);
vehicleRouter.get('/:id', VehicleController.getById);
vehicleRouter.patch('/:id', VehicleController.update);
vehicleRouter.post('/:id/deactivate', VehicleController.deactivate);
vehicleRouter.post('/:id/activate', VehicleController.activate);

