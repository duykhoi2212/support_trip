import { z } from 'zod';
import { vehicle_type } from '@prisma/client';

export const createVehicleSchema = z.object({
  type: z.enum([vehicle_type.MOTORBIKE, vehicle_type.CAR, vehicle_type.VAN, vehicle_type.TRUCK], {
    required_error: 'Vui lòng chọn loại phương tiện',
  }),
  plate_number: z
    .string({ required_error: 'Vui lòng nhập biển số xe' })
    .min(3, 'Biển số xe phải có ít nhất 3 ký tự')
    .max(20, 'Biển số xe không được vượt quá 20 ký tự')
    .transform((val) => val.trim().toUpperCase()),
  brand_model: z.string().max(100, 'Hãng xe không được vượt quá 100 ký tự').optional(),
  color: z.string().max(30, 'Màu xe không được vượt quá 30 ký tự').optional(),
  seat_count: z.coerce
    .number({ required_error: 'Vui lòng nhập số ghế ngồi' })
    .int('Số ghế phải là số nguyên')
    .min(1, 'Số ghế ngồi phải có ít nhất 1 chỗ'),
  cargo_area_m2: z.coerce
    .number()
    .min(0, 'Diện tích khoang hàng không thể âm')
    .default(0),
  cargo_max_kg: z.coerce
    .number()
    .min(0, 'Tải trọng khoang hàng không thể âm')
    .default(0),
});

export const updateVehicleSchema = z.object({
  brand_model: z.string().max(100, 'Hãng xe không được vượt quá 100 ký tự').optional(),
  color: z.string().max(30, 'Màu xe không được vượt quá 30 ký tự').optional(),
  seat_count: z.coerce
    .number()
    .int('Số ghế phải là số nguyên')
    .min(1, 'Số ghế ngồi phải có ít nhất 1 chỗ')
    .optional(),
  cargo_area_m2: z.coerce
    .number()
    .min(0, 'Diện tích khoang hàng không thể âm')
    .optional(),
  cargo_max_kg: z.coerce
    .number()
    .min(0, 'Tải trọng khoang hàng không thể âm')
    .optional(),
});

