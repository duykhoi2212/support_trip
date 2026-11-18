import { z } from 'zod';
import { user_role, account_status, incident_status } from '@prisma/client';

export const unlockUserSchema = z.object({
  reason: z
    .string({ required_error: 'Vui lòng nhập lý do mở khóa tài khoản' })
    .trim()
    .min(10, 'Lý do mở khóa phải có ít nhất 10 ký tự giải trình'),
});

export const lockUserSchema = z.object({
  lock_type: z.enum(['LOCKED_TEMP', 'LOCKED_PERM'], {
    errorMap: () => ({ message: 'Vui lòng chọn hình thức khóa tài khoản hợp lệ (Tạm khóa hoặc Vĩnh viễn)' }),
  }),
  duration_days: z.coerce.number().int().min(1, 'Số ngày khóa tối thiểu là 1 ngày').max(365, 'Số ngày khóa tối đa là 365 ngày').optional().default(14),
  reason: z
    .string({ required_error: 'Vui lòng nhập lý do khóa tài khoản' })
    .trim()
    .min(10, 'Lý do khóa tài khoản phải có ít nhất 10 ký tự giải trình'),
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
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  search: z.string().trim().optional(),
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
