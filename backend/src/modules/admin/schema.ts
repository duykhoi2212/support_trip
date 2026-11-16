import { z } from 'zod';
import { user_role, account_status, incident_status } from '@prisma/client';

export const unlockUserSchema = z.object({
  reason: z
    .string({ required_error: 'Vui lòng nhập lý do mở khóa tài khoản' })
    .trim()
    .min(10, 'Lý do mở khóa phải có ít nhất 10 ký tự giải trình'),
});

export const updateIncidentStatusSchema = z.object({
  status: z.nativeEnum(incident_status, {
    errorMap: () => ({ message: 'Trạng thái sự cố không hợp lệ' }),
  }),
  result_note: z.string().trim().optional(),
});

export const listUsersQuerySchema = z.object({
  role: z.nativeEnum(user_role).optional(),
  status: z.nativeEnum(account_status).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const listIncidentsQuerySchema = z.object({
  status: z.nativeEnum(incident_status).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const statisticsQuerySchema = z.object({
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

export const tripsByDateQuerySchema = z.object({
  date: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
