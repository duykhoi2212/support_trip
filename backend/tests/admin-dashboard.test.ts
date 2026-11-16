import { describe, it, expect, beforeAll } from 'vitest';
import { AdminService } from '../src/modules/admin/service.js';
import { IncidentService } from '../src/modules/incident/service.js';
import { prisma } from '../src/utils/prisma.js';
import {
  user_role,
  account_status,
  incident_status,
  lock_type,
  trip_status,
  request_status,
  request_type,
  vehicle_type,
  fuel_type,
} from '@prisma/client';

describe('Kiểm thử Chặng 3: Hệ thống Quản trị viên (Admin Dashboard - AD-01, AD-02, AD-03)', () => {
  let adminId: bigint;
  let lockedUserId: bigint;
  let testDriverId: bigint;
  let testTripId: bigint;
  let testRequestId: bigint;
  let testIncidentId: bigint;

  beforeAll(async () => {
    const timestamp = Date.now().toString().slice(-6);
    const randPhoneAdmin = `090${Math.floor(Math.random() * 9000000 + 1000000)}`;
    const randPhoneLocked = `091${Math.floor(Math.random() * 9000000 + 1000000)}`;
    const randPhoneDriver = `092${Math.floor(Math.random() * 9000000 + 1000000)}`;

    // 1. Tạo Admin
    const admin = await prisma.user.create({
      data: {
        role: user_role.ADMIN,
        phone: randPhoneAdmin,
        email: `admin_${timestamp}@gox.vn`,
        password_hash: 'hashedpassword',
        full_name: 'Quản trị viên Hệ thống',
      },
    });
    adminId = admin.id;

    // 2. Tạo User bị khóa LOCKED_TEMP kèm bản ghi Violation ACTIVE
    const lockedUser = await prisma.user.create({
      data: {
        role: user_role.USER,
        phone: randPhoneLocked,
        email: `locked_user_${timestamp}@gox.vn`,
        password_hash: 'hashedpassword',
        full_name: 'Người dùng Bị Khóa Test',
        status: account_status.LOCKED_TEMP,
        locked_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    lockedUserId = lockedUser.id;

    await prisma.violation.create({
      data: {
        user_id: lockedUserId,
        week_start: new Date('2026-11-09'),
        confirmed_count: 10,
        cancelled_count: 2,
        cancel_rate: 0.2,
        lock_type: lock_type.TEMPORARY,
        lock_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    // 3. Tạo Driver, Vehicle & Trip để phục vụ AD-02 và AD-03
    const driver = await prisma.user.create({
      data: {
        role: user_role.DRIVER,
        phone: randPhoneDriver,
        email: `driver_admin_${timestamp}@gox.vn`,
        password_hash: 'hashedpassword',
        full_name: 'Tài xế Admin Thống kê',
      },
    });
    testDriverId = driver.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        driver_id: testDriverId,
        type: vehicle_type.CAR,
        plate_number: `51A-${timestamp.slice(0, 3)}.${timestamp.slice(3)}`,
        brand_model: 'VinFast VF8',
        color: 'Trắng',
        seat_count: 5,
        fuel_type: fuel_type.ELECTRIC,
        photo_url: '/uploads/test-vf8.jpg',
      },
    });

    const trip = await prisma.trip.create({
      data: {
        code: `TRIP-AD-${timestamp}`,
        driver_id: testDriverId,
        vehicle_id: vehicle.id,
        origin_name: 'Quận 1, TP Hồ Chí Minh',
        origin_lat: 10.7769,
        origin_lng: 106.7009,
        dest_name: 'Vũng Tàu, Bà Rịa - Vũng Tàu',
        dest_lat: 10.346,
        dest_lng: 107.0843,
        departure_time: new Date(),
        eta: new Date(Date.now() + 2 * 60 * 60 * 1000),
        distance_km: 95.5,
        duration_min: 120,
        seats_total: 4,
        cargo_area_total_m2: 2.0,
        cargo_weight_total_kg: 100,
        seats_reserved: 2,
        estimated_fuel_cost: 150000,
        status: trip_status.COMPLETED,
      },
    });
    testTripId = trip.id;

    // 4. Tạo Request & Incident
    const req = await prisma.transportRequest.create({
      data: {
        code: `REQ-AD-${timestamp}`,
        trip_id: testTripId,
        user_id: lockedUserId,
        type: request_type.RIDE,
        pickup_name: 'Quận 1, TP Hồ Chí Minh',
        pickup_lat: 10.7769,
        pickup_lng: 106.7009,
        dropoff_name: 'Vũng Tàu',
        dropoff_lat: 10.346,
        dropoff_lng: 107.0843,
        passenger_count: 2,
        status: request_status.COMPLETED,
        shared_fuel_cost: 75000,
      },
    });
    testRequestId = req.id;

    const incident = await IncidentService.reportIncident(lockedUserId, {
      trip_id: testTripId.toString(),
      request_id: testRequestId.toString(),
      title: 'Tài xế đón muộn 30 phút',
      description: 'Chuyến xe bị hoãn đón và tài xế không thông báo trước qua điện thoại.',
    });
    testIncidentId = BigInt(incident.id);
  });

  describe('1. AD-01: Quản lý & Mở khóa tài khoản', () => {
    it('Lấy danh sách người dùng kèm bộ lọc vai trò và trạng thái', async () => {
      const result = await AdminService.getUsers({
        role: user_role.USER,
        status: account_status.LOCKED_TEMP,
      });

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('pagination');
      expect(result.users.length).toBeGreaterThanOrEqual(1);

      const target = result.users.find((u) => u.id === lockedUserId.toString());
      expect(target).toBeDefined();
      expect(target?.status).toBe(account_status.LOCKED_TEMP);
      expect(target?.violations.length).toBeGreaterThanOrEqual(1);
    });

    it('Chặn mở khóa tài khoản nếu lý do < 10 ký tự', async () => {
      await expect(
        AdminService.unlockUser(adminId, lockedUserId, {
          reason: 'Mở lại',
        })
      ).rejects.toThrow();
    });

    it('Mở khóa tài khoản thành công: chuyển ACTIVE, đổi REVOKED vi phạm, ghi AuditLog & gửi thông báo', async () => {
      const unlockReason = 'Người dùng đã gửi đơn giải trình hợp lệ có xác nhận lý do khẩn cấp';

      const result = await AdminService.unlockUser(adminId, lockedUserId, {
        reason: unlockReason,
      });

      expect(result.message).toContain('thành công');
      expect(result.user.status).toBe(account_status.ACTIVE);
      expect(result.user.locked_until).toBeNull();
      expect(result.audit_log.action).toBe('UNLOCK_ACCOUNT');
      expect(result.audit_log.reason).toBe(unlockReason);

      // Kiểm tra CSDL: Vi phạm cũ đã đổi thành REVOKED
      const violations = await prisma.violation.findMany({
        where: { user_id: lockedUserId },
      });
      expect(violations[0].status).toBe('REVOKED');
      expect(violations[0].revoked_by).toBe(adminId);

      // Kiểm tra CSDL: Thông báo đã được gửi
      const notifications = await prisma.notification.findMany({
        where: { user_id: lockedUserId, type: 'ACCOUNT_UNLOCKED' },
      });
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications[0].content).toContain(unlockReason);
    });

    it('Chặn mở khóa tài khoản khi tài khoản đã ACTIVE', async () => {
      await expect(
        AdminService.unlockUser(adminId, lockedUserId, {
          reason: 'Mở khóa lại lần 2 khi đã hoạt động',
        })
      ).rejects.toThrow(/Hoạt động/);
    });
  });

  describe('2. AD-02: Tiếp nhận & Xử lý sự cố (4 trạng thái tuần tự)', () => {
    it('Lấy danh sách sự cố với bộ lọc NOT_RECEIVED', async () => {
      const result = await AdminService.getIncidents({
        status: incident_status.NOT_RECEIVED,
      });

      expect(result.incidents.length).toBeGreaterThanOrEqual(1);
      const inc = result.incidents.find((i) => i.id === testIncidentId.toString());
      expect(inc).toBeDefined();
      expect(inc?.status).toBe(incident_status.NOT_RECEIVED);
    });

    it('Chặn nhảy cóc trạng thái (từ NOT_RECEIVED trực tiếp lên RESOLVED)', async () => {
      await expect(
        AdminService.updateIncidentStatus(adminId, testIncidentId, {
          status: incident_status.RESOLVED,
          result_note: 'Giải quyết ngay không qua các bước',
        })
      ).rejects.toThrow(/tuân thủ tuần tự từng bước/);
    });

    it('Bước 1: Chuyển NOT_RECEIVED -> RECEIVED (Đã tiếp nhận)', async () => {
      const result = await AdminService.updateIncidentStatus(adminId, testIncidentId, {
        status: incident_status.RECEIVED,
      });

      expect(result.incident.status).toBe(incident_status.RECEIVED);
      expect(result.incident.handled_by).toBe(adminId.toString());

      // Kiểm tra thông báo
      const notifs = await prisma.notification.findMany({
        where: { user_id: lockedUserId, type: 'INCIDENT_UPDATE' },
        orderBy: { created_at: 'desc' },
      });
      expect(notifs[0].content).toContain('tiếp nhận');
    });

    it('Bước 2: Chuyển RECEIVED -> PROCESSING (Đang xử lý)', async () => {
      const result = await AdminService.updateIncidentStatus(adminId, testIncidentId, {
        status: incident_status.PROCESSING,
      });

      expect(result.incident.status).toBe(incident_status.PROCESSING);
    });

    it('Bước 3: Chuyển PROCESSING -> RESOLVED (Đã giải quyết kèm ghi chú)', async () => {
      const resultNote = 'Đã nhắc nhở tài xế tuân thủ giờ giấc và bồi hoàn chi phí tượng trưng cho hành khách.';
      const result = await AdminService.updateIncidentStatus(adminId, testIncidentId, {
        status: incident_status.RESOLVED,
        result_note: resultNote,
      });

      expect(result.incident.status).toBe(incident_status.RESOLVED);
      expect(result.incident.result_note).toBe(resultNote);

      // Kiểm tra thông báo có ghi chú kết quả
      const notifs = await prisma.notification.findMany({
        where: { user_id: lockedUserId, type: 'INCIDENT_UPDATE' },
        orderBy: { created_at: 'desc' },
      });
      expect(notifs[0].content).toContain(resultNote);
    });
  });

  describe('3. AD-03: Thống kê & Báo cáo chuyến xe theo ngày', () => {
    it('Lấy tổng quan KPI vận hành & biểu đồ theo ngày', async () => {
      const stats = await AdminService.getStatisticsOverview({});

      expect(stats).toHaveProperty('kpi');
      expect(stats.kpi.trips.total).toBeGreaterThanOrEqual(1);
      expect(stats.kpi.trips.completed).toBeGreaterThanOrEqual(1);
      expect(stats.kpi.impact.total_passengers_served).toBeGreaterThanOrEqual(2);
      expect(stats.kpi.impact.total_shared_fuel_cost).toBeGreaterThanOrEqual(75000);
      expect(stats.daily_breakdown.length).toBeGreaterThanOrEqual(1);
    });

    it('Lấy danh sách chuyến xe chi tiết theo ngày', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const result = await AdminService.getTripsByDate({
        date: todayStr,
      });

      expect(result).toHaveProperty('trips');
      expect(result.trips.length).toBeGreaterThanOrEqual(1);
      const trip = result.trips.find((t) => t.id === testTripId.toString());
      expect(trip).toBeDefined();
      expect(trip?.driver.full_name).toContain('Tài xế');
      expect(trip?.vehicle.brand_model).toContain('VinFast');
    });
  });
});
