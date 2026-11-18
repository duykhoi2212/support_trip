import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const DEFAULT_DEV_JWT_SECRET = 'graduation-project-jwt-secret-key-32-chars-long';

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/final_project_db?schema=public'),
  JWT_SECRET: z.string().default(DEFAULT_DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ORS_API_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  // Gửi email (quên mật khẩu). Để trống SMTP_HOST khi phát triển: link được in ra console.
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default(''),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Lỗi cấu hình biến môi trường (.env):', parsedEnv.error.format());
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV === 'production' &&
  (parsedEnv.data.JWT_SECRET === DEFAULT_DEV_JWT_SECRET || parsedEnv.data.JWT_SECRET.length < 32)
) {
  console.error('❌ BẢO MẬT: Vui lòng cấu hình JWT_SECRET mạnh (>= 32 ký tự) trước khi chạy môi trường production.');
  process.exit(1);
}

export const config = parsedEnv.data;
