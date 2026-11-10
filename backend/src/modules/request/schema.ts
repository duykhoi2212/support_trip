import { z } from 'zod';
import { ride_progress, package_status, fail_reason_code } from '@prisma/client';

const VIETNAMESE_PHONE_REGEX = /^(0)(3|5|7|8|9)[0-9]{8}$/;

export const createRideRequestSchema = z.object({
  trip_id: z.coerce.string({ required_error: 'Vui lòng chọn chuyến xe' }),
  pickup_name: z.string({ required_error: 'Vui lòng nhập tên điểm đón' }).min(2).max(255),
  pickup_lat: z.coerce.number({ required_error: 'Tọa độ điểm đón không hợp lệ' }),
  pickup_lng: z.coerce.number({ required_error: 'Tọa độ điểm đón không hợp lệ' }),
  dropoff_name: z.string({ required_error: 'Vui lòng nhập tên điểm trả' }).min(2).max(255),
  dropoff_lat: z.coerce.number({ required_error: 'Tọa độ điểm trả không hợp lệ' }),
  dropoff_lng: z.coerce.number({ required_error: 'Tọa độ điểm trả không hợp lệ' }),
  passenger_count: z.coerce.number().int().min(1, 'Số lượng hành khách tối thiểu là 1').default(1),
});

export const createPackageRequestSchema = z.object({
  trip_id: z.coerce.string({ required_error: 'Vui lòng chọn chuyến xe' }),
  pickup_name: z.string({ required_error: 'Vui lòng nhập điểm gửi hàng' }).min(2).max(255),
  pickup_lat: z.coerce.number({ required_error: 'Tọa độ điểm gửi không hợp lệ' }),
  pickup_lng: z.coerce.number({ required_error: 'Tọa độ điểm gửi không hợp lệ' }),
  dropoff_name: z.string({ required_error: 'Vui lòng nhập điểm nhận hàng' }).min(2).max(255),
  dropoff_lat: z.coerce.number({ required_error: 'Tọa độ điểm nhận không hợp lệ' }),
  dropoff_lng: z.coerce.number({ required_error: 'Tọa độ điểm nhận không hợp lệ' }),
  recipient_name: z.string({ required_error: 'Vui lòng nhập họ tên người nhận' }).min(2).max(100),
  recipient_phone: z
    .string({ required_error: 'Vui lòng nhập số điện thoại người nhận' })
    .regex(VIETNAMESE_PHONE_REGEX, 'Số điện thoại người nhận không đúng định dạng Việt Nam'),
  description: z.string({ required_error: 'Vui lòng mô tả kiện hàng' }).min(2).max(255),
  category: z.string().max(50).optional(),
  weight_kg: z.coerce.number().positive('Khối lượng hàng phải lớn hơn 0'),
  length_cm: z.coerce.number().positive('Chiều dài kiện hàng phải lớn hơn 0'),
  width_cm: z.coerce.number().positive('Chiều rộng kiện hàng phải lớn hơn 0'),
  height_cm: z.coerce.number().positive('Chiều cao kiện hàng phải lớn hơn 0'),
  photo_url: z.string({ required_error: 'Ảnh chụp kiện hàng là bắt buộc' }).min(1),
});

export const rejectRequestSchema = z.object({
  reject_reason: z
    .string({ required_error: 'Vui lòng nhập lý do từ chối' })
    .min(5, 'Lý do từ chối phải có ít nhất 5 ký tự')
    .max(255, 'Lý do từ chối không được vượt quá 255 ký tự'),
});

export const cancelRequestSchema = z.object({
  cancel_reason: z
    .string({ required_error: 'Vui lòng nhập lý do hủy' })
    .min(5, 'Lý do hủy phải có ít nhất 5 ký tự')
    .max(255, 'Lý do hủy không được vượt quá 255 ký tự'),
});

export const updateProgressSchema = z.object({
  // Cho đi nhờ (RIDE): PICKED_UP hoặc DROPPED_OFF
  ride_progress: z.nativeEnum(ride_progress).optional(),
  // Cho gửi hàng (PACKAGE): PICKED_UP hoặc DELIVERED
  package_status: z.nativeEnum(package_status).optional(),
  // Lý do thất bại (nếu có sự cố)
  fail_reason_code: z.nativeEnum(fail_reason_code).optional(),
});
