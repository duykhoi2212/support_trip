import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/utils/prisma.js';
import { TripService } from '../src/modules/trip/service.js';
import { RequestService } from '../src/modules/request/service.js';
import { NotificationService } from '../src/modules/notification/service.js';
import {
  user_role,
  vehicle_type,
  vehicle_status,
  trip_status,
  request_status,
  ride_progress,
  package_status,
} from '@prisma/client';
import bcrypt from 'bcrypt';

describe('Kiểm thử Module Yêu cầu vận chuyển & Điều hành chuyến xe (US-01, US-03, DR-02, DR-03) + Thông báo', () => {
  let driverId: bigint;
  let user1Id: bigint;
  let user2Id: bigint;
  let vehicleId: bigint;
  let tripId: bigint;
  let rideRequestId: bigint;
  let packageRequestId: bigint;
  let validPickup: [number, number];
  let validDropoff: [number, number];

  const driverPhone = '0977112233';
  const driverEmail = 'driver_stage4@example.com';
  const user1Phone = '0988445566';
  const user1Email = 'user1_stage4@example.com';
  const user2Phone = '0966778899';
  const user2Email = 'user2_stage4@example.com';
  const testPlate = '29A-999.88';

  beforeAll(async () => {
    // 1. Dọn dẹp dữ liệu cũ nếu có
    await prisma.notification.deleteMany({
      where: {
        user: {
          email: { in: [driverEmail, user1Email, user2Email] },
        },
      },
    });
    await prisma.packageItem.deleteMany({
      where: {
        transport_request: {
          user: { email: { in: [user1Email, user2Email] } },
        },
      },
    });
    await prisma.transportRequest.deleteMany({
      where: {
        user: { email: { in: [user1Email, user2Email] } },
      },
    });
    await prisma.trip.deleteMany({ where: { origin_name: { contains: 'Test Stage 4' } } });
    await prisma.vehicle.deleteMany({ where: { plate_number: testPlate } });
    await prisma.user.deleteMany({
      where: { email: { in: [driverEmail, user1Email, user2Email] } },
    });

    // 2. Tạo tài khoản Driver & Users
    const passwordHash = await bcrypt.hash('Password@123', 10);
    const driver = await prisma.user.create({
      data: {
        phone: driverPhone,
        email: driverEmail,
        password_hash: passwordHash,
        full_name: 'Tài Xế Stage 4',
        role: user_role.DRIVER,
      },
    });
    driverId = driver.id;

    const user1 = await prisma.user.create({
      data: {
        phone: user1Phone,
        email: user1Email,
        password_hash: passwordHash,
        full_name: 'Khách Đi Nhờ',
        role: user_role.USER,
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        phone: user2Phone,
        email: user2Email,
        password_hash: passwordHash,
        full_name: 'Khách Gửi Hàng',
        role: user_role.USER,
      },
    });
    user2Id = user2.id;

    // 3. Tạo phương tiện cho tài xế
    const vehicle = await prisma.vehicle.create({
      data: {
        driver_id: driverId,
        type: vehicle_type.CAR,
        plate_number: testPlate,
        brand_model: 'Toyota Vios',
        seat_count: 4,
        cargo_area_m2: 1.0,
        cargo_max_kg: 100,
        photo_url: '/uploads/vios.jpg',
        status: vehicle_status.ACTIVE,
      },
    });
    vehicleId = vehicle.id;

    // 4. Tạo chuyến xe mẫu (Hà Nội -> Nam Định) khởi hành sau 30h
    const depTime = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString();
    const trip = await TripService.createTrip(driverId, {
      vehicle_id: vehicleId.toString(),
      origin_name: 'Test Stage 4 - Hà Nội',
      origin_lat: 21.0285,
      origin_lng: 105.7782,
      dest_name: 'Test Stage 4 - Nam Định',
      dest_lat: 20.4344,
      dest_lng: 106.1764,
      departure_time: depTime,
    });
    tripId = BigInt(trip.id);

    // Lấy 2 điểm tọa độ nằm trực tiếp trên polyline của chuyến xe để đảm bảo khoảng cách trắc địa 0.0 km <= 2km
    const tripRecord = await prisma.trip.findUnique({ where: { id: tripId } });
    const coords: Array<[number, number]> = JSON.parse(tripRecord!.route_polyline!);
    validPickup = coords[Math.floor(coords.length * 0.1)];
    validDropoff = coords[Math.floor(coords.length * 0.8)];
  });

  afterAll(async () => {
    // Dọn dẹp sau kiểm thử
    await prisma.notification.deleteMany({
      where: {
        user: { email: { in: [driverEmail, user1Email, user2Email] } },
      },
    });
    await prisma.packageItem.deleteMany({
      where: {
        transport_request: {
          user: { email: { in: [user1Email, user2Email] } },
        },
      },
    });
    await prisma.transportRequest.deleteMany({
      where: {
        user: { email: { in: [user1Email, user2Email] } },
      },
    });
    await prisma.trip.deleteMany({ where: { driver_id: driverId } });
    await prisma.vehicle.deleteMany({ where: { driver_id: driverId } });
    await prisma.user.deleteMany({
      where: { id: { in: [driverId, user1Id, user2Id] } },
    });
  });

  it('1. US-01: Chặn tạo yêu cầu khi điểm đón hoặc điểm trả cách xa lộ trình > 2.0 km', async () => {
    // Tọa độ xa lắc tại Lạng Sơn (cách cao tốc Hà Nội - Nam Định hàng chục km)
    await expect(
      RequestService.createRideRequest(user1Id, {
        trip_id: tripId.toString(),
        pickup_name: 'Điểm đón xa lộ trình',
        pickup_lat: 21.8500,
        pickup_lng: 106.7500,
        dropoff_name: 'Điểm trả hợp lệ',
        dropoff_lat: validDropoff[0],
        dropoff_lng: validDropoff[1],
        passenger_count: 1,
      })
    ).rejects.toThrow('vượt quá bán kính cho phép 2.0 km');
  });

  it('2. US-01: Tạo yêu cầu đi nhờ xe (RIDE) thành công khi điểm đón/trả <= 2.0 km', async () => {
    const request = await RequestService.createRideRequest(user1Id, {
      trip_id: tripId.toString(),
      pickup_name: 'Điểm đón trên lộ trình',
      pickup_lat: validPickup[0],
      pickup_lng: validPickup[1],
      dropoff_name: 'Điểm trả trên lộ trình',
      dropoff_lat: validDropoff[0],
      dropoff_lng: validDropoff[1],
      passenger_count: 2,
    });

    expect(request).toBeDefined();
    expect(request.code).toMatch(/^REQ-\d{6}$/);
    expect(request.status).toBe(request_status.PENDING);
    expect(request.passenger_count).toBe(2);
    rideRequestId = BigInt(request.id);
  });

  it('3. US-01: Chặn tạo yêu cầu trùng lặp khi người dùng đang có yêu cầu PENDING trên chuyến xe', async () => {
    await expect(
      RequestService.createRideRequest(user1Id, {
        trip_id: tripId.toString(),
        pickup_name: 'Điểm đón trên lộ trình',
        pickup_lat: validPickup[0],
        pickup_lng: validPickup[1],
        dropoff_name: 'Điểm trả trên lộ trình',
        dropoff_lat: validDropoff[0],
        dropoff_lng: validDropoff[1],
        passenger_count: 1,
      })
    ).rejects.toThrow('Bạn đã có một yêu cầu');
  });

  it('4. US-01: Tạo yêu cầu gửi hàng (PACKAGE) thành công khi còn diện tích và tải trọng', async () => {
    const pkgReq = await RequestService.createPackageRequest(user2Id, {
      trip_id: tripId.toString(),
      pickup_name: 'Điểm gửi trên lộ trình',
      pickup_lat: validPickup[0],
      pickup_lng: validPickup[1],
      dropoff_name: 'Điểm nhận trên lộ trình',
      dropoff_lat: validDropoff[0],
      dropoff_lng: validDropoff[1],
      recipient_name: 'Trần Thị Nhận',
      recipient_phone: '0912345678',
      description: 'Thùng quà tết và tài liệu',
      weight_kg: 15,
      length_cm: 50,
      width_cm: 40,
      height_cm: 30,
      photo_url: '/uploads/package1.jpg',
    });

    expect(pkgReq).toBeDefined();
    expect(pkgReq.status).toBe(request_status.PENDING);
    packageRequestId = BigInt(pkgReq.id);
  });

  it('5. DR-02: Bảo mật số điện thoại - Khi yêu cầu PENDING, tài xế không thấy số điện thoại của hành khách', async () => {
    const list = await RequestService.getTripRequests(driverId, tripId);
    expect(list.length).toBe(2);

    const pendingRide = list.find((r) => r.id === rideRequestId.toString());
    expect(pendingRide).toBeDefined();
    // Chưa ACCEPTED -> SĐT của hành khách phải bị ẩn (undefined)
    expect(pendingRide?.user.phone).toBeUndefined();
  });

  it('6. DR-02: Tài xế chấp nhận yêu cầu (ACCEPTED) -> Khóa nguyên tử sức chứa và mở khóa hiển thị SĐT', async () => {
    const accepted = await RequestService.acceptRequest(driverId, rideRequestId);
    expect(accepted.status).toBe(request_status.ACCEPTED);

    // Kiểm tra chuyến xe đã được cộng dồn sức chứa (2 ghế ngồi)
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    expect(trip?.seats_reserved).toBe(2);

    // Kiểm tra tài xế xem danh sách đã thấy số điện thoại của khách
    const list = await RequestService.getTripRequests(driverId, tripId);
    const updatedRide = list.find((r) => r.id === rideRequestId.toString());
    expect(updatedRide?.user.phone).toBe(user1Phone);
  });

  it('7. US-03: Hành khách xem yêu cầu của tôi -> Thấy số điện thoại của tài xế sau khi được ACCEPTED', async () => {
    const myRequests = await RequestService.getMyRequests(user1Id);
    expect(myRequests.length).toBeGreaterThan(0);
    const ride = myRequests.find((r) => r.id === rideRequestId.toString());
    expect(ride).toBeDefined();
    // Đã ACCEPTED -> Hành khách được thấy SĐT của tài xế để gọi điện đón
    expect(ride?.trip.driver.phone).toBe(driverPhone);
  });

  it('8. DR-02: Tài xế chấp nhận yêu cầu gửi hàng (PACKAGE) -> Cộng dồn diện tích và khối lượng', async () => {
    const acceptedPkg = await RequestService.acceptRequest(driverId, packageRequestId);
    expect(acceptedPkg.status).toBe(request_status.ACCEPTED);

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    expect(trip?.cargo_weight_reserved_kg).toBe(15);
    expect(trip?.cargo_area_reserved_m2).toBeGreaterThan(0);
  });

  it('9. US-03: Khách hủy yêu cầu đã ACCEPTED -> Tự động hoàn trả sức chứa xe nguyên tử', async () => {
    // Khách 2 hủy yêu cầu gửi hàng
    const cancelled = await RequestService.cancelRequest(user2Id, packageRequestId, {
      cancel_reason: 'Tôi đổi ý không gửi hàng nữa',
    });
    expect(cancelled.status).toBe(request_status.CANCELLED);

    // Kiểm tra sức chứa xe đã được hoàn trả lại
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    expect(trip?.cargo_weight_reserved_kg).toBe(0);
    expect(trip?.cargo_area_reserved_m2).toBe(0);
  });

  it('10. DR-03: Tài xế bắt đầu chuyến xe (IN_PROGRESS)', async () => {
    const started = await RequestService.startTrip(driverId, tripId);
    expect(started.status).toBe(trip_status.IN_PROGRESS);

    // Chặn hành khách hủy sau khi chuyến xe đã khởi hành
    await expect(
      RequestService.cancelRequest(user1Id, rideRequestId, {
        cancel_reason: 'Xin hủy phút chót',
      })
    ).rejects.toThrow('Chuyến xe đã khởi hành');
  });

  it('11. DR-03: Tài xế cập nhật tiến trình đón/trả khách (PICKED_UP -> DROPPED_OFF -> COMPLETED)', async () => {
    // Đón khách
    const pickedUp = await RequestService.updateProgress(driverId, rideRequestId, {
      ride_progress: ride_progress.PICKED_UP,
    });
    expect(pickedUp.ride_progress).toBe(ride_progress.PICKED_UP);

    // Trả khách -> Yêu cầu tự động hoàn thành
    const droppedOff = await RequestService.updateProgress(driverId, rideRequestId, {
      ride_progress: ride_progress.DROPPED_OFF,
    });
    expect(droppedOff.status).toBe(request_status.COMPLETED);
  });

  it('12. DR-03: Tài xế kết thúc chuyến xe (COMPLETED)', async () => {
    const completed = await RequestService.completeTrip(driverId, tripId);
    expect(completed.status).toBe(trip_status.COMPLETED);
  });

  it('13. Notifications: Kiểm tra thông báo được tạo tự động và đánh dấu đã đọc', async () => {
    // Tài xế nhận thông báo khi có yêu cầu mới và khi khách hủy
    const driverNotifications = await NotificationService.getMyNotifications(driverId);
    expect(driverNotifications.length).toBeGreaterThan(0);

    // Hành khách nhận thông báo khi được duyệt, khi chuyến chạy, khi đón/trả
    const userNotifications = await NotificationService.getMyNotifications(user1Id);
    expect(userNotifications.length).toBeGreaterThan(0);

    // Đánh dấu đã đọc
    const unreadBefore = await NotificationService.getUnreadCount(user1Id);
    expect(unreadBefore).toBeGreaterThan(0);

    await NotificationService.markAllAsRead(user1Id);
    const unreadAfter = await NotificationService.getUnreadCount(user1Id);
    expect(unreadAfter).toBe(0);
  });
});
