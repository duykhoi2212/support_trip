import { Router } from 'express';
import { AuthController } from './controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { uploadImage } from '../file-storage/multer.js';

export const authRouter = Router();
export const meRouter = Router();

// Routes công khai (Auth)
authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/forgot-password', AuthController.forgotPassword);
authRouter.post('/reset-password', AuthController.resetPassword);

// Routes yêu cầu đăng nhập (Me / Hồ sơ)
meRouter.use(authenticateToken);
meRouter.get('/', AuthController.getMe);
meRouter.patch('/', AuthController.updateMe);
meRouter.patch('/password', AuthController.changePassword);
meRouter.post('/avatar', uploadImage.single('avatar'), AuthController.updateAvatar);
