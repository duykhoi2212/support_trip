import { z } from 'zod';
import { trip_status } from '@prisma/client';

export const createTripSchema = z.object({
  vehicle_id: z.coerce.string({ required_error: 'Vui lòng chọn phương tiện' }),
  origin_name: z.string({ required_error: 'Vui lòng nhập tên điểm xuất phát' }).min(2).max(255),
  origin_lat: z.coerce.number({ required_error: 'Vui lòng chọn tọa độ điểm xuất phát' }),
  origin_lng: z.coerce.number({ required_error: 'Vui lòng chọn tọa độ điểm xuất phát' }),
  dest_name: z.string({ required_error: 'Vui lòng nhập tên điểm đến' }).min(2).max(255),
  dest_lat: z.coerce.number({ required_error: 'Vui lòng chọn tọa độ điểm đến' }),
  dest_lng: z.coerce.number({ required_error: 'Vui lòng chọn tọa độ điểm đến' }),
  departure_time: z.string({ required_error: 'Vui lòng chọn thời gian khởi hành' }).refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Định dạng ngày giờ không hợp lệ' }
  ),
});

export const cancelTripSchema = z.object({
  cancel_reason: z
    .string({ required_error: 'Vui lòng nhập lý do hủy chuyến' })
    .min(5, 'Lý do hủy chuyến phải có ít nhất 5 ký tự')
    .max(255, 'Lý do hủy không được vượt quá 255 ký tự'),
});

export const searchTripsSchema = z.object({
  origin_name: z.string().optional(),
  dest_name: z.string().optional(),
  departure_date: z.string().optional(),
  type: z.enum(['RIDE', 'PACKAGE']).optional(),
  passenger_count: z.coerce.number().optional(),
  cargo_weight_kg: z.coerce.number().optional(),
  cargo_area_m2: z.coerce.number().optional(),
});
