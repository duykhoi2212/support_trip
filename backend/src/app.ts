import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authRouter, meRouter } from './modules/auth-account/routes.js';
import { vehicleRouter } from './modules/vehicle/routes.js';
import { tripRouter } from './modules/trip/routes.js';
import { mapRouter } from './modules/map/routes.js';
import requestRouter from './modules/request/routes.js';
import notificationRouter from './modules/notification/routes.js';
import { schedulerRouter } from './modules/scheduler/routes.js';
import { incidentRouter } from './modules/incident/routes.js';
import { adminRouter } from './modules/admin/routes.js';
import { uploadDir } from './modules/file-storage/multer.js';

export const app = express();

// Tin cậy header X-Forwarded-For từ Nginx Reverse Proxy
app.set('trust proxy', 1);

// HTTP Security Headers (cho phép tải ảnh từ /uploads qua cross-origin)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Cấu hình CORS theo danh sách origin cho phép trong production
const allowedOrigins = (config.CORS_ORIGINS || config.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có Origin (Postman, curl, server-to-server) hoặc môi trường dev/test
      if (!origin || config.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Không được phép truy cập từ nguồn (CORS) này.'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Giới hạn tần suất cho nhóm Auth & AI Search (tự bỏ qua khi chạy test)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Bạn gửi quá nhiều yêu cầu xác thực. Vui lòng thử lại sau 15 phút.',
    },
  },
});

const aiAndMapLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Bạn thao tác tìm kiếm/định tuyến quá nhanh. Vui lòng thử lại sau ít phút.',
    },
  },
});

// Phục vụ thư mục static uploads (chuẩn hóa đồng bộ cùng uploadDir của Multer)
app.use('/uploads', express.static(uploadDir));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'GoX AI Coordination Backend API',
    },
  });
});

// Business Modules Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/me', meRouter);
app.use('/api/vehicles', vehicleRouter);
app.use('/api/trips/search/ai', aiAndMapLimiter);
app.use('/api/trips', tripRouter);
app.use('/api/map', aiAndMapLimiter, mapRouter);
app.use('/api/requests', requestRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/scheduler', schedulerRouter);
app.use('/api/incidents', incidentRouter);
app.use('/api/admin', adminRouter);

// Centralized error handler
app.use(errorHandler);

