import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../../middlewares/errorHandler.js';
import { config } from '../../config/index.js';

// Đường dẫn tuyệt đối chuẩn xác đến thư mục uploads ở gốc backend
export const uploadDir = path.resolve(process.cwd(), config.UPLOAD_DIR || 'uploads');

// Đảm bảo thư mục uploads luôn tồn tại
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình lưu trữ tệp trên đĩa VPS
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Đặt tên tệp: timestamp-random.ext
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Bộ lọc định dạng tệp (chỉ chấp nhận JPG, JPEG, PNG, WEBP)
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        400,
        'INVALID_FILE_TYPE',
        'Định dạng ảnh không hợp lệ. Chỉ chấp nhận các tệp JPG, PNG, WEBP.'
      )
    );
  }
};

// Giới hạn dung lượng tối đa 5MB theo quy định
export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});
