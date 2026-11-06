import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middlewares/errorHandler.js';
import { authRouter, meRouter } from './modules/auth-account/routes.js';
import { uploadDir } from './modules/file-storage/multer.js';

export const app = express();

// Middlewares cơ bản
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ thư mục static uploads (chuẩn hóa đồng bộ cùng uploadDir của Multer)
app.use('/uploads', express.static(uploadDir));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'DiNho & GuiDo AI Coordination Backend API',
    },
  });
});

// Auth & Me Routes
app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);

// Centralized error handler
app.use(errorHandler);

