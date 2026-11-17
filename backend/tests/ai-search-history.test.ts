import { describe, it, expect, beforeAll } from 'vitest';
import { GeminiAdapter } from '../src/adapters/ai/gemini.js';
import { TripService } from '../src/modules/trip/service.js';
import { RequestService } from '../src/modules/request/service.js';
import { IncidentService } from '../src/modules/incident/service.js';
import { prisma } from '../src/utils/prisma.js';
import { user_role, vehicle_type, fuel_type } from '@prisma/client';

describe('Kiểm thử Chặng 2: Tìm kiếm Gemini AI (US-02), CS-05 Fallback & Lịch sử Chuyến xe', () => {
  let testDriverId: bigint;
  let testUserId: bigint;
  let testVehicleId: bigint;
  let testTripId: bigint;
  let testPlateNumber: string;

  beforeAll(async () => {
    const timestamp = Date.now().toString().slice(-6);
    const randPhone1 = `093${Math.floor(Math.random() * 9000000 + 1000000)}`;
    const randPhone2 = `094${Math.floor(Math.random() * 9000000 + 1000000)}`;
    testPlateNumber = `43A-${timestamp.slice(0, 3)}.${timestamp.slice(3)}`;

    // 1. Tạo test driver
    const driver = await prisma.user.create({
      data: {
        role: user_role.DRIVER,
        phone: randPhone1,
        email: `driver_hist_${timestamp}@gox.vn`,
        password_hash: 'hashedpassword',
        full_name: 'Tài xế Lịch Sử Test',
      },
    });
    testDriverId = driver.id;

    // 2. Tạo test user
    const user = await prisma.user.create({
      data: {
        role: user_role.USER,
        phone: randPhone2,
        email: `user_hist_${timestamp}@gox.vn`,
        password_hash: 'hashedpassword',
        full_name: 'Hành khách Lịch Sử Test',
      },
    });
    testUserId = user.id;

    // 3. Tạo xe ô tô
    const vehicle = await prisma.vehicle.create({
      data: {
        driver_id: testDriverId,
        type: vehicle_type.CAR,
        plate_number: testPlateNumber,
        brand_model: 'VinFast VF e34',
        seat_count: 5,
        cargo_area_m2: 0.8,
        cargo_max_kg: 80,
        fuel_type: fuel_type.ELECTRIC,
        fuel_consumption: 13.5,
        photo_url: '/uploads/test_car.jpg',
        inspection_expiry_date: new Date('2027-12-31'),
      },
    });
    testVehicleId = vehicle.id;

    // 4. Tạo chuyến xe COMPLETED để test lịch sử
    const trip = await prisma.trip.create({
      data: {
        code: `TRIP-H${timestamp}`,
        driver_id: testDriverId,
        vehicle_id: testVehicleId,
        origin_name: 'Đà Nẵng, Việt Nam',
        origin_lat: 16.0544,
        origin_lng: 108.2022,
        dest_name: 'Hội An, Quảng Nam',
        dest_lat: 15.8801,
        dest_lng: 108.3380,
        departure_time: new Date('2026-11-01T08:00:00Z'),
        eta: new Date('2026-11-01T09:00:00Z'),
        distance_km: 30,
        duration_min: 60,
        route_polyline: '[]',
        seats_total: 5,
        cargo_area_total_m2: 0.8,
        cargo_weight_total_kg: 80,
        seats_reserved: 2,
        cargo_area_reserved_m2: 0,
        cargo_weight_reserved_kg: 0,
        estimated_fuel_cost: 60000,
        fuel_price: 3850,
        status: 'COMPLETED',
        completed_at: new Date('2026-11-01T09:10:00Z'),
      },
    });
    testTripId = trip.id;

    // 5. Tạo yêu cầu COMPLETED thuộc chuyến này
    await prisma.transportRequest.create({
      data: {
        code: `REQ-H${timestamp}`,
        trip_id: testTripId,
        user_id: testUserId,
        type: 'RIDE',
        pickup_name: 'Đà Nẵng, Việt Nam',
        pickup_lat: 16.0544,
        pickup_lng: 108.2022,
        dropoff_name: 'Hội An, Quảng Nam',
        dropoff_lat: 15.8801,
        dropoff_lng: 108.3380,
        passenger_count: 2,
        status: 'COMPLETED',
        shared_fuel_cost: 60000,
      },
    });
  });

  // -------------------------------------------------------------
  // TEST PHẦN 1: BỘ PHÂN TÍCH CS-05 FALLBACK VÀ GEMINI ADAPTER
  // -------------------------------------------------------------
  describe('1. Cơ chế Dự phòng CS-05 Fallback Engine', () => {
    it('Nên bóc tách chính xác điểm đi, điểm đến, ngày mai và 2 người đi nhờ', () => {
      const prompt = 'Tìm xe từ Đà Nẵng đi Hội An chiều mai 2 người';
      const result = GeminiAdapter.parseWithRegexFallback(prompt);

      expect(result.origin_name).toContain('Đà Nẵng');
      expect(result.dest_name).toContain('Hội An');
      expect(result.type).toBe('RIDE');
      expect(result.passenger_count).toBe(2);
      expect(result.departure_date).toBeDefined();
      expect(result.is_fallback).toBe(true);
    });

    it('Nên phát hiện yêu cầu gửi hàng và ngày hôm nay', () => {
      const prompt = 'Cần gửi kiện hàng từ Hà Nội về Thái Bình hôm nay';
      const result = GeminiAdapter.parseWithRegexFallback(prompt);

      expect(result.origin_name).toContain('Hà Nội');
      expect(result.dest_name).toContain('Thái Bình');
      expect(result.type).toBe('PACKAGE');
      expect(result.departure_date).toBeDefined();
      expect(result.is_fallback).toBe(true);
    });

    it('Nên bóc tách đúng định dạng ngày dd/mm/yyyy', () => {
      const prompt = 'Đi từ Sài Gòn tới Vũng Tàu ngày 25/12/2026';
      const result = GeminiAdapter.parseWithRegexFallback(prompt);

      expect(result.origin_name).toContain('Sài Gòn');
      expect(result.dest_name).toContain('Vũng Tàu');
      expect(result.departure_date).toBe('2026-12-25');
    });

    it('Nên tự động kích hoạt fallback khi Gemini API key không tồn tại', async () => {
      // Gọi qua GeminiAdapter.parseSearchPrompt với API key rỗng
      const prevKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const result = await GeminiAdapter.parseSearchPrompt('Xe từ Hải Phòng về Hà Nội ngày mai');
      expect(result.is_fallback).toBe(true);
      expect(result.origin_name).toContain('Hải Phòng');
      expect(result.dest_name).toContain('Hà Nội');

      process.env.GEMINI_API_KEY = prevKey;
    });
  });

  // -------------------------------------------------------------
  // TEST PHẦN 2: TÌM KIẾM AI QUA TRIP SERVICE
  // -------------------------------------------------------------
  describe('2. Tìm kiếm Chuyến xe AI qua TripService', () => {
    it('Nên thực thi tìm kiếm bằng AI thành công và trả về tiêu chí bóc tách', async () => {
      const result = await TripService.searchTripsWithAi('Tìm xe từ Đà Nẵng đến Hội An');

      expect(result).toHaveProperty('trips');
      expect(result).toHaveProperty('extracted_criteria');
      expect(result).toHaveProperty('explanation');
      expect(Array.isArray(result.trips)).toBe(true);
      expect(result.extracted_criteria.origin_name).toContain('Đà Nẵng');
      expect(result.extracted_criteria.dest_name).toContain('Hội An');
    });
  });

  // -------------------------------------------------------------
  // TEST PHẦN 3: LỊCH SỬ CHUYẾN XE TÀI XẾ & NGƯỜI DÙNG
  // -------------------------------------------------------------
  describe('3. Lịch sử Chuyến xe và Thống kê Doanh thu', () => {
    it('Tài xế xem lịch sử: Trả về danh sách chuyến COMPLETED kèm thống kê tổng tiền hỗ trợ', async () => {
      const history = await TripService.getDriverHistory(testDriverId);

      expect(history.trips.length).toBeGreaterThanOrEqual(1);
      expect(history.stats.total_completed_trips).toBeGreaterThanOrEqual(1);
      expect(history.stats.total_passengers_served).toBeGreaterThanOrEqual(2);
      expect(history.stats.total_fuel_received).toBeGreaterThanOrEqual(60000);
    });

    it('Người dùng xem lịch sử: Trả về danh sách yêu cầu COMPLETED, FAILED kèm chỉ số cancellation stats', async () => {
      // Tạo thêm 1 request trạng thái FAILED do khách vắng mặt để kiểm tra
      const failedCode = `REQ-FL-${Date.now().toString().slice(-8)}`;
      const failedReq = await prisma.transportRequest.create({
        data: {
          code: failedCode,
          user_id: testUserId,
          trip_id: testTripId,
          type: 'RIDE',
          status: 'FAILED',
          fail_reason_code: 'ABSENT',
          cancel_reason: 'Khách hàng không có mặt tại điểm đón',
          counts_toward_cancel_rate: true,
          passenger_count: 1,
          pickup_name: 'Điểm đón vắng mặt',
          pickup_lat: 16.0544,
          pickup_lng: 108.2022,
          dropoff_name: 'Hội An',
          dropoff_lat: 15.8801,
          dropoff_lng: 108.3380,
        },
      });

      const history = await RequestService.getUserHistory(testUserId);

      expect(history.requests.length).toBeGreaterThanOrEqual(2);
      expect(history.stats.total_rides).toBeGreaterThanOrEqual(2);
      expect(history.stats.total_fuel_shared).toBeGreaterThanOrEqual(60000);

      // Kiểm tra cấu trúc chỉ số hủy chuyến tuần
      expect(history.stats.cancellation).toBeDefined();
      expect(typeof history.stats.cancellation.week_rate).toBe('number');
      expect(typeof history.stats.cancellation.week_confirmed).toBe('number');
      expect(typeof history.stats.cancellation.week_cancelled).toBe('number');
      expect(typeof history.stats.cancellation.is_violation).toBe('boolean');

      // Kiểm tra request FAILED có trong danh sách
      const foundFailed = history.requests.find((r) => r.id.toString() === failedReq.id.toString());
      expect(foundFailed).toBeDefined();
      expect(foundFailed?.status).toBe('FAILED');
      expect(foundFailed?.fail_reason_code).toBe('ABSENT');

      // Kiểm tra bộ lọc ngày from_date / to_date
      const filteredFuture = await RequestService.getUserHistory(testUserId, {
        from_date: '2030-01-01',
      });
      expect(filteredFuture.requests.length).toBe(0);

      const firstReq = history.requests.find((r) => r.status === 'COMPLETED');
      expect(firstReq?.trip).toBeDefined();
      expect(firstReq?.trip?.driver?.full_name).toBe('Tài xế Lịch Sử Test');
      expect(firstReq?.trip?.vehicle?.plate_number).toBe(testPlateNumber);
    });
  });

  // -------------------------------------------------------------
  // TEST PHẦN 4: BÁO CÁO SỰ CỐ TỪ LỊCH SỬ CHUYẾN ĐI
  // -------------------------------------------------------------
  describe('4. Báo cáo Sự cố Chuyến xe (IncidentReport)', () => {
    it('Người dùng gửi báo cáo sự cố thành công với trạng thái NOT_RECEIVED', async () => {
      const report = await IncidentService.reportIncident(testUserId, {
        trip_id: testTripId.toString(),
        title: 'Tài xế trễ giờ / không xuất hiện',
        description: 'Tài xế hẹn 8h00 nhưng tới 9h00 mới tới mà không gọi điện báo trước.',
      });

      expect(report.id).toBeDefined();
      expect(report.status).toBe('NOT_RECEIVED');
      expect(report.title).toBe('Tài xế trễ giờ / không xuất hiện');
      expect(report.reporter_id).toBe(testUserId.toString());
    });

    it('Chặn gửi báo cáo sự cố khi mô tả quá ngắn (< 10 ký tự)', async () => {
      await expect(
        IncidentService.reportIncident(testUserId, {
          title: 'Xe có mùi',
          description: 'Hôi quá', // < 10 ký tự
        })
      ).rejects.toThrow();
    });
  });
});
