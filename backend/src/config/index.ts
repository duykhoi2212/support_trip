import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/final_project_db?schema=public'),
  JWT_SECRET: z.string().default('graduation-project-jwt-secret-key-32-chars-long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ORS_API_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Lỗi cấu hình biến môi trường (.env):', parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;
