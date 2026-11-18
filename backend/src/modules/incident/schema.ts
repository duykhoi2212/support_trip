import { z } from 'zod';
import { incident_status } from '@prisma/client';

export const createIncidentSchema = z.object({
  trip_id: z.coerce.string().optional().nullable(),
  request_id: z.coerce.string().optional().nullable(),
  title: z.string({ required_error: 'Vui lòng nhập tiêu đề sự cố' })
    .min(3, 'Tiêu đề sự cố phải có ít nhất 3 ký tự')
    .max(150, 'Tiêu đề sự cố không vượt quá 150 ký tự'),
  description: z.string({ required_error: 'Vui lòng nhập mô tả chi tiết sự cố' })
    .min(10, 'Mô tả sự cố phải có ít nhất 10 ký tự'),
});

export const listMyIncidentsQuerySchema = z.object({
  status: z.nativeEnum(incident_status).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});
