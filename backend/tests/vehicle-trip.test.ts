import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VehicleService } from '../src/modules/vehicle/service.js';
import { TripService } from '../src/modules/trip/service.js';
import { prisma } from '../src/utils/prisma.js';
import { user_role, vehicle_type, vehicle_status, trip_status } from '@prisma/client';
import bcrypt from 'bcrypt';

describe('Kiểm thử Module Phương tiện & Chuyến xe (DR-04, DR-01, DR-05)', () => {
  let driverId: bigint;
  let vehicleId: bigint;
  const driverPhone = '0988112233';
  const driverEmail = 'driver_stage3_test@example.com';
  const testPlate = '30F-123.45';

  beforeAll(async () => {
    // 1. Dọn dẹp dữ liệu test cũ nếu có
    await prisma.trip.deleteMany({ where: { origin_name: { contains: 'Test Stage 3' } } });
    await prisma.vehicle.deleteMany({ where: { plate_number: testPlate } });
    await prisma.user.deleteMany({ where: { OR: [{ phone: driverPhone }, { email: driverEmail }] } });

    // 2. Tạo tài khoản tài xế mẫu cho test
    const passwordHash = await bcrypt.hash('Password@123', 10);
    const driver = await prisma.user.create({
      data: {
        phone: driverPhone,
        email: driverEmail,
        password_hash: passwordHash,
        full_name: 'Tài Xế Giai Đoạn 3',
        role: user_role.DRIVER,
      },
    });
    driverId = driver.id;
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu sau khi test xong
    await prisma.trip.deleteMany({ where: { driver_id: driverId } });
    await prisma.vehicle.deleteMany({ where: { driver_id: driverId } });
    await prisma.user.deleteMany({ where: { id: driverId } });
  });

  it('1. DR-04: Thêm phương tiện mới thành công kèm ảnh', async () => {
    const vehicle = await VehicleService.createVehicle(
      driverId,
      {
        type: vehicle_type.CAR,
        plate_number: testPlate,
        brand_model: 'Mazda 3',
        color: 'Đỏ',
        seat_count: 4,
        cargo_area_m2: 1.2,
        cargo_max_kg: 120,
      },
      '/uploads/test-car.jpg'
    );

    expect(vehicle).toBeDefined();
    expect(vehicle.plate_number).toBe(testPlate);
    expect(vehicle.status).toBe(vehicle_status.ACTIVE);
    expect(vehicle.photo_url).toBe('/uploads/test-car.jpg');
    vehicleId = vehicle.id;
  });

  it('2. DR-04: Chặn trùng phương tiện (loại xe + biển số)', async () => {
    await expect(
      VehicleService.createVehicle(
        driverId,
        {
          type: vehicle_type.CAR,
          plate_number: testPlate,
          brand_model: 'Xe Trùng',
          seat_count: 4,
          cargo_area_m2: 1,
          cargo_max_kg: 100,
        },
        '/uploads/test-car-2.jpg'
      )
    ).rejects.toThrow('đã được đăng ký cho loại xe này');
  });

  it('3. DR-01: Chặn tạo chuyến khi thời gian khởi hành < 24 giờ', async () => {
    const tooSoonTime = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(); // +10 giờ

    await expect(
      TripService.createTrip(driverId, {
        vehicle_id: vehicleId.toString(),
        origin_name: 'Test Stage 3 - Hà Nội',
        origin_lat: 21.0285,
        origin_lng: 105.7782,
        dest_name: 'Test Stage 3 - Nam Định',
        dest_lat: 20.4200,
        dest_lng: 106.1683,
        departure_time: tooSoonTime,
      })
    ).rejects.toThrow('tối thiểu 24 giờ');
  });

  it('4. DR-01: Tạo chuyến xe thành công khi hợp lệ (>= 24h, snapshot sức chứa, polyline)', async () => {
    const validDepartureTime = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(); // +30 giờ

    const trip = await TripService.createTrip(driverId, {
      vehicle_id: vehicleId.toString(),
      origin_name: 'Test Stage 3 - Hà Nội',
      origin_lat: 21.0285,
      origin_lng: 105.7782,
      dest_name: 'Test Stage 3 - Nam Định',
      dest_lat: 20.4200,
      dest_lng: 106.1683,
      departure_time: validDepartureTime,
    });

    expect(trip).toBeDefined();
    expect(trip.code).toMatch(/^TRIP-\d{6}$/);
    expect(trip.status).toBe(trip_status.OPEN);
    expect(trip.seats_total).toBe(4); // Snapshot từ xe
    expect(trip.cargo_area_total_m2).toBe(1.2);
    expect(trip.cargo_weight_total_kg).toBe(120);
    expect(trip.route_polyline).toBeDefined();
    expect(trip.distance_km).toBeGreaterThan(0);
  });

  it('5. DR-01: Chặn chồng lịch xe khi tạo chuyến mới trùng khung giờ chuyến cũ', async () => {
    // Chuyến 1 đã tạo bắt đầu lúc now + 30h
    // Chuyến mới bắt đầu lúc now + 30.5h (nằm trong khoảng [departure_time, ETA])
    const conflictTime = new Date(Date.now() + 30.5 * 60 * 60 * 1000).toISOString();

    await expect(
      TripService.createTrip(driverId, {
        vehicle_id: vehicleId.toString(),
        origin_name: 'Test Stage 3 - Hà Nội',
        origin_lat: 21.0285,
        origin_lng: 105.7782,
        dest_name: 'Test Stage 3 - Hải Phòng',
        dest_lat: 20.8449,
        dest_lng: 106.6881,
        departure_time: conflictTime,
      })
    ).rejects.toThrow('đã có lịch trình');
  });

  it('5b. DR-01: Cho phép nhập thời gian kết thúc chuyến dự kiến (eta) hợp lệ, chặn khi eta < thời gian chạy tối thiểu', async () => {
    const depTime = new Date(Date.now() + 60 * 60 * 1000 * 24).toISOString(); // +24h
    // ETA sớm hơn giờ khởi hành -> Lỗi
    const invalidEta = new Date(Date.now() + 60 * 60 * 1000 * 20).toISOString();

    await expect(
      TripService.createTrip(driverId, {
        vehicle_id: vehicleId.toString(),
        origin_name: 'Test Stage 3 - Hà Nội',
        origin_lat: 21.0285,
        origin_lng: 105.7782,
        dest_name: 'Test Stage 3 - Nam Định',
        dest_lat: 20.4200,
        dest_lng: 106.1683,
        departure_time: depTime,
        eta: invalidEta,
      })
    ).rejects.toThrow('không thể sớm hơn thời gian chạy tối thiểu');
  });

  it('6. DR-04: Chặn ngừng sử dụng xe (deactivate) khi xe đang có chuyến OPEN', async () => {
    await expect(VehicleService.deactivateVehicle(driverId, vehicleId)).rejects.toThrow(
      'Không thể ngừng sử dụng phương tiện vì đang gắn với chuyến xe'
    );
  });

  it('7. DR-05: Tài xế hủy chuyến xe thành công (status chuyển CANCELLED)', async () => {
    const trips = await TripService.getMyTrips(driverId, trip_status.OPEN);
    expect(trips.length).toBeGreaterThan(0);

    const cancelled = await TripService.cancelTrip(driverId, trips[0].id, {
      cancel_reason: 'Tài xế có việc bận đột xuất gia đình',
    });

    expect(cancelled.status).toBe(trip_status.CANCELLED);
    expect(cancelled.cancel_reason).toContain('việc bận');
  });

  it('8. DR-04: Sau khi hủy hết chuyến, có thể ngừng sử dụng xe (INACTIVE) và kích hoạt lại', async () => {
    const deactivated = await VehicleService.deactivateVehicle(driverId, vehicleId);
    expect(deactivated.status).toBe(vehicle_status.INACTIVE);

    const activated = await VehicleService.activateVehicle(driverId, vehicleId);
    expect(activated.status).toBe(vehicle_status.ACTIVE);
  });
});
