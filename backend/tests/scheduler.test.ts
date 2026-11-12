import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/utils/prisma.js';
import { SchedulerService, getPreviousWeekRangeVN } from '../src/modules/scheduler/service.js';
import {
  user_role,
  account_status,
  vehicle_type,
  trip_status,
  request_type,
  request_status,
  actor_type,
  lock_type,
  violation_status,
  fail_reason_code,
} from '@prisma/client';
import bcrypt from 'bcrypt';

describe('Kiểm thử Hệ thống Tác vụ Tự động Ngầm (Giai đoạn 5: CS-01, CS-02, CS-03)', () => {
  let driverId: bigint;
  let vehicleId: bigint;
  let userId1: bigint;
  let userId2: bigint;
  let tripCloseId: bigint;
  let tripFarId: bigint;

  const driverPhone = '0981999888';
  const driverEmail = 'driver_stage5@example.com';
  const user1Phone = '0981111222';
  const user1Email = 'user1_stage5@example.com';
  const user2Phone = '0983333444';
  const user2Email = 'user2_stage5@example.com';

  beforeAll(async () => {
    // 1. Dọn dẹp dữ liệu test cũ nếu có
    await prisma.incidentReport.deleteMany({
      where: {
        OR: [
          { reporter: { email: { in: [user1Email, user2Email, driverEmail] } } },
          { trip: { driver: { email: driverEmail } } },
        ],
      },
    });
    await prisma.violation.deleteMany({
      where: { user: { email: { in: [user1Email, user2Email] } } },
    });
    await prisma.auditLog.deleteMany({
      where: { actor: { email: { in: [user1Email, user2Email, driverEmail] } } },
    });
    await prisma.notification.deleteMany({
      where: { user: { email: { in: [user1Email, user2Email, driverEmail] } } },
    });
    await prisma.transportRequest.deleteMany({
      where: { user: { email: { in: [user1Email, user2Email] } } },
    });
    await prisma.trip.deleteMany({
      where: { driver: { email: driverEmail } },
    });
    await prisma.vehicle.deleteMany({
      where: { driver: { email: driverEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [driverEmail, user1Email, user2Email] } },
    });

    // 2. Tạo tài khoản Driver & Phương tiện
    const passwordHash = await bcrypt.hash('Password@123', 10);
    const driver = await prisma.user.create({
      data: {
        phone: driverPhone,
        email: driverEmail,
        password_hash: passwordHash,
        full_name: 'Tài Xế Stage 5',
        role: user_role.DRIVER,
      },
    });
    driverId = driver.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        driver_id: driverId,
        type: vehicle_type.CAR,
        plate_number: '30K-999.55',
        brand_model: 'Toyota Vios',
        seat_count: 4,
        cargo_area_m2: 1.0,
        cargo_max_kg: 100,
        photo_url: '/uploads/stage5-car.jpg',
      },
    });
    vehicleId = vehicle.id;

    // 3. Tạo tài khoản User 1 và User 2
    const u1 = await prisma.user.create({
      data: {
        phone: user1Phone,
        email: user1Email,
        password_hash: passwordHash,
        full_name: 'Người Dùng Vi Phạm',
        role: user_role.USER,
      },
    });
    userId1 = u1.id;

    const u2 = await prisma.user.create({
      data: {
        phone: user2Phone,
        email: user2Email,
        password_hash: passwordHash,
        full_name: 'Người Dùng Tạm Khóa Hết Hạn',
        role: user_role.USER,
        status: account_status.LOCKED_TEMP,
        locked_until: new Date(Date.now() - 2 * 60 * 60 * 1000), // Đã hết hạn tạm khóa cách đây 2 tiếng
      },
    });
    userId2 = u2.id;
  });

  afterAll(async () => {
    // Dọn dẹp sau kiểm thử
    await prisma.incidentReport.deleteMany({
      where: {
        OR: [
          { reporter_id: { in: [driverId, userId1, userId2] } },
          { trip: { driver_id: driverId } },
        ],
      },
    });
    await prisma.violation.deleteMany({
      where: { user: { email: { in: [user1Email, user2Email] } } },
    });
    await prisma.auditLog.deleteMany({
      where: { target_id: { in: [userId1, userId2] } },
    });
    await prisma.notification.deleteMany({
      where: { user_id: { in: [userId1, userId2, driverId] } },
    });
    await prisma.transportRequest.deleteMany({
      where: { user_id: { in: [userId1, userId2] } },
    });
    await prisma.trip.deleteMany({
      where: { driver_id: driverId },
    });
    await prisma.vehicle.deleteMany({
      where: { driver_id: driverId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [driverId, userId1, userId2] } },
    });
  });

  it('1. CS-01: Quét đóng chuyến trước 6 giờ (departure_time <= now + 6h) & chuyển PENDING sang EXPIRED', async () => {
    const now = new Date();
    // Chuyến 1: Khởi hành sau 3 giờ nữa (nằm trong mốc <= 6h)
    const tripSoon = await prisma.trip.create({
      data: {
        code: 'TRIP-CS0101',
        driver_id: driverId,
        vehicle_id: vehicleId,
        origin_name: 'Hà Nội',
        origin_lat: 21.0,
        origin_lng: 105.8,
        dest_name: 'Nam Định',
        dest_lat: 20.4,
        dest_lng: 106.1,
        departure_time: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        eta: new Date(now.getTime() + 5 * 60 * 60 * 1000),
        seats_total: 4,
        cargo_area_total_m2: 1.0,
        cargo_weight_total_kg: 100,
        seats_reserved: 0,
        cargo_area_reserved_m2: 0,
        cargo_weight_reserved_kg: 0,
        status: trip_status.OPEN,
      },
    });
    tripCloseId = tripSoon.id;

    // Chuyến 2: Khởi hành sau 30 giờ nữa (> 6h)
    const tripFar = await prisma.trip.create({
      data: {
        code: 'TRIP-CS0102',
        driver_id: driverId,
        vehicle_id: vehicleId,
        origin_name: 'Hà Nội',
        origin_lat: 21.0,
        origin_lng: 105.8,
        dest_name: 'Ninh Bình',
        dest_lat: 20.2,
        dest_lng: 105.9,
        departure_time: new Date(now.getTime() + 30 * 60 * 60 * 1000),
        eta: new Date(now.getTime() + 32 * 60 * 60 * 1000),
        seats_total: 4,
        cargo_area_total_m2: 1.0,
        cargo_weight_total_kg: 100,
        seats_reserved: 0,
        cargo_area_reserved_m2: 0,
        cargo_weight_reserved_kg: 0,
        status: trip_status.OPEN,
      },
    });
    tripFarId = tripFar.id;

    // Tạo yêu cầu PENDING trên chuyến 1
    const pendingReq = await prisma.transportRequest.create({
      data: {
        code: 'REQ-CS0101',
        trip_id: tripCloseId,
        user_id: userId1,
        type: request_type.RIDE,
        pickup_name: 'Bến xe Giáp Bát',
        pickup_lat: 20.98,
        pickup_lng: 105.84,
        dropoff_name: 'TP Nam Định',
        dropoff_lat: 20.42,
        dropoff_lng: 106.16,
        passenger_count: 1,
        status: request_status.PENDING,
      },
    });

    // Thực thi quét đóng chuyến CS-01
    const result = await SchedulerService.closeTripsBefore6h(now);
    expect(result.closedTripsCount).toBeGreaterThanOrEqual(1);
    expect(result.expiredRequestsCount).toBeGreaterThanOrEqual(1);

    // Kiểm tra chuyến 1 chuyển sang CLOSED
    const checkTrip1 = await prisma.trip.findUnique({ where: { id: tripCloseId } });
    expect(checkTrip1?.status).toBe(trip_status.CLOSED);

    // Kiểm tra yêu cầu trên chuyến 1 chuyển sang EXPIRED
    const checkReq = await prisma.transportRequest.findUnique({ where: { id: pendingReq.id } });
    expect(checkReq?.status).toBe(request_status.EXPIRED);

    // Kiểm tra chuyến 2 vẫn OPEN (không bị đóng do > 6h)
    const checkTrip2 = await prisma.trip.findUnique({ where: { id: tripFarId } });
    expect(checkTrip2?.status).toBe(trip_status.OPEN);

    // Kiểm tra thông báo được gửi cho hành khách và tài xế
    const notifUser = await prisma.notification.findFirst({
      where: { user_id: userId1, type: 'REQUEST_EXPIRED' },
    });
    expect(notifUser).toBeDefined();
    expect(notifUser?.content).toContain('đã hết hạn');

    const notifDriver = await prisma.notification.findFirst({
      where: { user_id: driverId, type: 'TRIP_CLOSED' },
    });
    expect(notifDriver).toBeDefined();
    expect(notifDriver?.content).toContain('tự động đóng nhận yêu cầu');
  });

  it('2. CS-02: Kiểm tra tính toán ranh giới tuần theo giờ Việt Nam (Asia/Ho_Chi_Minh)', () => {
    const testDate = new Date('2026-11-12T10:00:00Z'); // Thứ Năm
    const range = getPreviousWeekRangeVN(testDate);

    // Tuần trước của 12/11/2026 là từ 02/11/2026 đến 08/11/2026
    expect(range.weekStart).toBeDefined();
    expect(range.weekEnd).toBeDefined();
    expect(range.weekEnd.getTime()).toBeGreaterThan(range.weekStart.getTime());
    // Khoảng cách giữa start và end là 7 ngày trừ 1ms
    const diffHours = (range.weekEnd.getTime() - range.weekStart.getTime()) / (1000 * 60 * 60);
    expect(Math.round(diffHours)).toBe(168); // 7 * 24 = 168 giờ
  });

  it('3. CS-02: Chốt tỷ lệ hủy tuần > 5% - Lần đầu vi phạm: Tạm khóa 14 ngày (LOCKED_TEMP)', async () => {
    // Thiết lập tuần test độc lập
    const weekStart = new Date('2026-10-05T00:00:00.000Z');
    const weekEnd = new Date('2026-10-11T23:59:59.999Z');
    const weekStartDateOnly = new Date('2026-10-05T00:00:00.000Z');

    // Tạo 1 chuyến xe trong tuần test
    const tripWeek = await prisma.trip.create({
      data: {
        code: 'TRIP-CS02W1',
        driver_id: driverId,
        vehicle_id: vehicleId,
        origin_name: 'Hà Nội',
        origin_lat: 21.0,
        origin_lng: 105.8,
        dest_name: 'Hải Phòng',
        dest_lat: 20.8,
        dest_lng: 106.6,
        departure_time: new Date('2026-10-07T08:00:00.000Z'),
        eta: new Date('2026-10-07T11:00:00.000Z'),
        seats_total: 4,
        cargo_area_total_m2: 1.0,
        cargo_weight_total_kg: 100,
        seats_reserved: 0,
        cargo_area_reserved_m2: 0,
        cargo_weight_reserved_kg: 0,
        status: trip_status.COMPLETED,
      },
    });

    // Tạo 10 yêu cầu đã hoàn thành (COMPLETED) cho User 1
    for (let i = 1; i <= 9; i++) {
      await prisma.transportRequest.create({
        data: {
          code: `REQ-OK${i}-${Math.floor(1000 + Math.random() * 9000)}`,
          trip_id: tripWeek.id,
          user_id: userId1,
          type: request_type.RIDE,
          pickup_name: 'Hà Nội',
          pickup_lat: 21.0,
          pickup_lng: 105.8,
          dropoff_name: 'Hải Phòng',
          dropoff_lat: 20.8,
          dropoff_lng: 106.6,
          passenger_count: 1,
          status: request_status.COMPLETED,
        },
      });
    }

    // Tạo 1 yêu cầu User tự hủy sau khi đã ACCEPTED (tính vào tỷ lệ hủy)
    // Tỷ lệ = 1 / (9 + 1) = 1/10 = 10% > 5% -> Vi phạm!
    await prisma.transportRequest.create({
      data: {
        code: `REQ-CAN-${Math.floor(1000 + Math.random() * 9000)}`,
        trip_id: tripWeek.id,
        user_id: userId1,
        type: request_type.RIDE,
        pickup_name: 'Hà Nội',
        pickup_lat: 21.0,
        pickup_lng: 105.8,
        dropoff_name: 'Hải Phòng',
        dropoff_lat: 20.8,
        dropoff_lng: 106.6,
        passenger_count: 1,
        status: request_status.CANCELLED,
        cancelled_by: actor_type.USER,
        counts_toward_cancel_rate: true,
        cancel_reason: 'Bận đột xuất',
      },
    });

    // Thực hiện chốt tuần CS-02
    const res = await SchedulerService.settleWeeklyCancellationRate({
      customWeekRange: { weekStart, weekEnd, weekStartDateOnly },
    });

    expect(res.violationsCount).toBe(1);
    expect(res.penalties[0].userId).toBe(userId1.toString());
    expect(res.penalties[0].lockType).toBe(lock_type.TEMPORARY);
    expect(res.penalties[0].cancelRate).toBe(0.1); // 10%

    // Kiểm tra tài khoản User 1 bị chuyển sang LOCKED_TEMP kèm locked_until
    const updatedUser = await prisma.user.findUnique({ where: { id: userId1 } });
    expect(updatedUser?.status).toBe(account_status.LOCKED_TEMP);
    expect(updatedUser?.locked_until).toBeDefined();

    // Kiểm tra bản ghi Violation trong CSDL
    const violation = await prisma.violation.findUnique({
      where: {
        user_id_week_start: {
          user_id: userId1,
          week_start: weekStartDateOnly,
        },
      },
    });
    expect(violation).toBeDefined();
    expect(violation?.status).toBe(violation_status.ACTIVE);
    expect(violation?.lock_type).toBe(lock_type.TEMPORARY);

    // Kiểm tra AuditLog
    const audit = await prisma.auditLog.findFirst({
      where: { target_id: userId1, action: 'LOCK_ACCOUNT_TEMP' },
    });
    expect(audit).toBeDefined();
    expect(audit?.actor_type).toBe(actor_type.SYSTEM);
  });

  it('4. CS-02: Tái phạm lần 2 tỷ lệ hủy tuần > 5% -> Khóa tài khoản vĩnh viễn (LOCKED_PERM)', async () => {
    // Tuần test kế tiếp
    const weekStart2 = new Date('2026-10-12T00:00:00.000Z');
    const weekEnd2 = new Date('2026-10-18T23:59:59.999Z');
    const weekStartDateOnly2 = new Date('2026-10-12T00:00:00.000Z');

    const tripWeek2 = await prisma.trip.create({
      data: {
        code: 'TRIP-CS02W2',
        driver_id: driverId,
        vehicle_id: vehicleId,
        origin_name: 'Hà Nội',
        origin_lat: 21.0,
        origin_lng: 105.8,
        dest_name: 'Hải Phòng',
        dest_lat: 20.8,
        dest_lng: 106.6,
        departure_time: new Date('2026-10-15T08:00:00.000Z'),
        eta: new Date('2026-10-15T11:00:00.000Z'),
        seats_total: 4,
        cargo_area_total_m2: 1.0,
        cargo_weight_total_kg: 100,
        seats_reserved: 0,
        cargo_area_reserved_m2: 0,
        cargo_weight_reserved_kg: 0,
        status: trip_status.COMPLETED,
      },
    });

    // Tạo 1 yêu cầu FAILED do lỗi khách vắng mặt (ABSENT) trên tổng số 1 yêu cầu xác nhận -> Tỷ lệ 1/1 = 100% > 5%
    await prisma.transportRequest.create({
      data: {
        code: `REQ-FAIL-${Math.floor(1000 + Math.random() * 9000)}`,
        trip_id: tripWeek2.id,
        user_id: userId1,
        type: request_type.RIDE,
        pickup_name: 'Hà Nội',
        pickup_lat: 21.0,
        pickup_lng: 105.8,
        dropoff_name: 'Hải Phòng',
        dropoff_lat: 20.8,
        dropoff_lng: 106.6,
        passenger_count: 1,
        status: request_status.FAILED,
        fail_reason_code: fail_reason_code.ABSENT,
        counts_toward_cancel_rate: true,
      },
    });

    // Chốt tuần lần 2
    const res2 = await SchedulerService.settleWeeklyCancellationRate({
      customWeekRange: {
        weekStart: weekStart2,
        weekEnd: weekEnd2,
        weekStartDateOnly: weekStartDateOnly2,
      },
    });

    expect(res2.violationsCount).toBe(1);
    expect(res2.penalties[0].userId).toBe(userId1.toString());
    expect(res2.penalties[0].lockType).toBe(lock_type.PERMANENT); // Tái phạm -> Khóa vĩnh viễn!
    expect(res2.penalties[0].lockUntil).toBeNull();

    // Kiểm tra tài khoản User 1 bị chuyển sang LOCKED_PERM
    const permUser = await prisma.user.findUnique({ where: { id: userId1 } });
    expect(permUser?.status).toBe(account_status.LOCKED_PERM);
    expect(permUser?.locked_until).toBeNull();

    // Kiểm tra AuditLog
    const auditPerm = await prisma.auditLog.findFirst({
      where: { target_id: userId1, action: 'LOCK_ACCOUNT_PERM' },
    });
    expect(auditPerm).toBeDefined();
  });

  it('5. CS-03: Tự động mở khóa các tài khoản LOCKED_TEMP đã hết hạn 14 ngày', async () => {
    // User 2 được khởi tạo ở trạng thái LOCKED_TEMP với locked_until = now - 2h
    const userBefore = await prisma.user.findUnique({ where: { id: userId2 } });
    expect(userBefore?.status).toBe(account_status.LOCKED_TEMP);

    // Chạy tác vụ tự động mở khóa CS-03
    const unlockResult = await SchedulerService.unlockExpiredLockedAccounts();
    expect(unlockResult.unlockedCount).toBeGreaterThanOrEqual(1);
    expect(unlockResult.userIds).toContain(userId2.toString());

    // Kiểm tra tài khoản User 2 đã được phục hồi về ACTIVE và xóa locked_until
    const userAfter = await prisma.user.findUnique({ where: { id: userId2 } });
    expect(userAfter?.status).toBe(account_status.ACTIVE);
    expect(userAfter?.locked_until).toBeNull();

    // Kiểm tra AuditLog mở khóa tự động của hệ thống
    const unlockAudit = await prisma.auditLog.findFirst({
      where: { target_id: userId2, action: 'UNLOCK_ACCOUNT_AUTO' },
    });
    expect(unlockAudit).toBeDefined();
    expect(unlockAudit?.actor_type).toBe(actor_type.SYSTEM);

    // Kiểm tra thông báo mở khóa cho người dùng
    const unlockNotif = await prisma.notification.findFirst({
      where: { user_id: userId2, type: 'ACCOUNT_UNLOCKED' },
    });
    expect(unlockNotif).toBeDefined();
    expect(unlockNotif?.content).toContain('tự động mở khóa');
  });

  it('6. CS-OVERDUE: Quá giờ 2 tiếng tài xế chưa bấm bắt đầu -> Hủy chuyến của tài xế, báo sự cố cho khách và tạo IncidentReport cho Admin', async () => {
    const now = new Date();

    // 1. Chuyến xe A: Đến giờ khởi hành (now = departure_time + 10 phút) -> Nhắc nhở tài xế
    const tripRemind = await prisma.trip.create({
      data: {
        code: 'TRIP-REMIND1',
        driver_id: driverId,
        vehicle_id: vehicleId,
        origin_name: 'Hà Nội',
        origin_lat: 21.0,
        origin_lng: 105.8,
        dest_name: 'Thái Bình',
        dest_lat: 20.4,
        dest_lng: 106.3,
        departure_time: new Date(now.getTime() - 10 * 60 * 1000), // Cách đây 10 phút (< 2h)
        eta: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        seats_total: 4,
        cargo_area_total_m2: 1.0,
        cargo_weight_total_kg: 100,
        seats_reserved: 0,
        cargo_area_reserved_m2: 0,
        cargo_weight_reserved_kg: 0,
        status: trip_status.CLOSED,
      },
    });

    // 2. Chuyến xe B: Quá giờ khởi hành 2.5 tiếng (now = departure_time + 2.5h) -> Bị hủy và tạo IncidentReport
    const tripOverdue = await prisma.trip.create({
      data: {
        code: 'TRIP-OVERDUE1',
        driver_id: driverId,
        vehicle_id: vehicleId,
        origin_name: 'Hà Nội',
        origin_lat: 21.0,
        origin_lng: 105.8,
        dest_name: 'Ninh Bình',
        dest_lat: 20.2,
        dest_lng: 105.9,
        departure_time: new Date(now.getTime() - 2.5 * 60 * 60 * 1000), // Cách đây 2.5 giờ (> 2h)
        eta: new Date(now.getTime() - 30 * 60 * 1000),
        seats_total: 4,
        cargo_area_total_m2: 1.0,
        cargo_weight_total_kg: 100,
        seats_reserved: 1,
        cargo_area_reserved_m2: 0,
        cargo_weight_reserved_kg: 0,
        status: trip_status.CLOSED,
      },
    });

    // Tạo 1 yêu cầu ACCEPTED của hành khách trên chuyến B
    const passengerReq = await prisma.transportRequest.create({
      data: {
        code: 'REQ-PASS-OVD1',
        trip_id: tripOverdue.id,
        user_id: userId1,
        type: request_type.RIDE,
        pickup_name: 'Bến xe Nước Ngầm',
        pickup_lat: 20.97,
        pickup_lng: 105.83,
        dropoff_name: 'Ninh Bình',
        dropoff_lat: 20.25,
        dropoff_lng: 105.97,
        passenger_count: 1,
        status: request_status.ACCEPTED,
      },
    });

    // Thực thi xử lý quá hạn
    const overdueResult = await SchedulerService.handleOverdueTrips(now);

    expect(overdueResult.remindedCount).toBeGreaterThanOrEqual(1);
    expect(overdueResult.autoCancelledCount).toBeGreaterThanOrEqual(1);
    expect(overdueResult.incidentReportsCreated).toBeGreaterThanOrEqual(1);

    // Kiểm tra thông báo nhắc nhở gửi cho tài xế của chuyến A
    const reminderNotif = await prisma.notification.findFirst({
      where: {
        user_id: driverId,
        type: 'DEPARTURE_REMINDER',
        ref_id: tripRemind.id,
      },
    });
    expect(reminderNotif).toBeDefined();
    expect(reminderNotif?.content).toContain('Đã đến giờ khởi hành');

    // Kiểm tra chuyến B đã bị chuyển sang CANCELLED
    const cancelledTripB = await prisma.trip.findUnique({ where: { id: tripOverdue.id } });
    expect(cancelledTripB?.status).toBe(trip_status.CANCELLED);
    expect(cancelledTripB?.cancel_reason).toContain('sau 2 tiếng');

    // Kiểm tra yêu cầu của khách trên chuyến B chuyển sang CANCELLED do sự cố và không bị phạt
    const updatedReq = await prisma.transportRequest.findUnique({ where: { id: passengerReq.id } });
    expect(updatedReq?.status).toBe(request_status.CANCELLED);
    expect(updatedReq?.cancelled_by).toBe(actor_type.DRIVER);
    expect(updatedReq?.counts_toward_cancel_rate).toBe(false); // Không phạt hành khách

    // Kiểm tra hành khách nhận được thông báo chuyến xe gặp sự cố
    const incidentNotif = await prisma.notification.findFirst({
      where: {
        user_id: userId1,
        type: 'TRIP_INCIDENT_CANCELLED',
        ref_id: tripOverdue.id,
      },
    });
    expect(incidentNotif).toBeDefined();
    expect(incidentNotif?.content).toContain('phát sinh sự cố');

    // Kiểm tra đã tự động tạo 1 bản ghi Sự cố (IncidentReport) gửi Admin
    const incident = await prisma.incidentReport.findFirst({
      where: { trip_id: tripOverdue.id },
    });
    expect(incident).toBeDefined();
    expect(incident?.title).toContain('[SỰ CỐ KHỞI HÀNH]');
    expect(incident?.description).toContain('tài xế không bấm bắt đầu hành trình');
    expect(incident?.status).toBe('NOT_RECEIVED'); // Chờ Admin xử lý
  });
});
