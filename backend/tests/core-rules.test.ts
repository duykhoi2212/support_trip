import { describe, it, expect } from 'vitest';
import { isWithinRouteDistance } from '../src/utils/distance.js';
import { isScheduleOverlapping } from '../src/utils/schedule.js';
import { canAcceptRequest } from '../src/utils/capacity.js';
import { calculateWeeklyCancellationRate } from '../src/utils/cancellation.js';

describe('1. Kiểm tra khoảng cách điểm đón/trả tới Polyline (<= 2km)', () => {
  // Lộ trình mẫu: Đường thẳng từ [21.0000, 105.8000] đến [21.0000, 105.9000] (chạy dọc theo vĩ độ 21)
  const route: Array<[number, number]> = [
    [21.0000, 105.8000],
    [21.0000, 105.8500],
    [21.0000, 105.9000],
  ];

  it('Nên trả về true khi điểm đón nằm ngay trên tuyến (cách 0 km)', () => {
    const result = isWithinRouteDistance(21.0000, 105.8500, route);
    expect(result.isWithin).toBe(true);
    expect(result.distanceKm).toBeLessThanOrEqual(0.01);
  });

  it('Nên trả về true khi điểm đón cách tuyến 0.5 km (<= 2 km)', () => {
    // 1 độ vĩ độ khoảng 111 km -> 0.004 độ vĩ độ ~ 0.44 km
    const result = isWithinRouteDistance(21.0040, 105.8500, route);
    expect(result.isWithin).toBe(true);
    expect(result.distanceKm).toBeLessThan(2.0);
  });

  it('Nên trả về false khi điểm đón cách tuyến > 2.0 km', () => {
    // 0.03 độ vĩ độ ~ 3.3 km
    const result = isWithinRouteDistance(21.0300, 105.8500, route);
    expect(result.isWithin).toBe(false);
    expect(result.distanceKm).toBeGreaterThan(2.0);
  });
});

describe('2. Kiểm tra chống chồng lịch chuyến xe của cùng một xe (không có đệm)', () => {
  const tripStart = new Date('2026-11-01T08:00:00Z');
  const tripEnd = new Date('2026-11-01T11:00:00Z');

  it('Nên phát hiện chồng lịch khi chuyến mới bắt đầu trong khung giờ chuyến cũ', () => {
    const newStart = new Date('2026-11-01T09:00:00Z');
    const newEnd = new Date('2026-11-01T12:00:00Z');
    expect(isScheduleOverlapping(tripStart, tripEnd, newStart, newEnd)).toBe(true);
  });

  it('Nên phát hiện chồng lịch khi chuyến mới bao trùm hoàn toàn chuyến cũ', () => {
    const newStart = new Date('2026-11-01T07:00:00Z');
    const newEnd = new Date('2026-11-01T12:00:00Z');
    expect(isScheduleOverlapping(tripStart, tripEnd, newStart, newEnd)).toBe(true);
  });

  it('Nên trả về false khi chuyến mới bắt đầu ngay khi chuyến cũ kết thúc (không đệm)', () => {
    // Chuyến cũ kết thúc 11:00, chuyến mới bắt đầu đúng 11:00 -> Không chồng lịch
    const newStart = new Date('2026-11-01T11:00:00Z');
    const newEnd = new Date('2026-11-01T14:00:00Z');
    expect(isScheduleOverlapping(tripStart, tripEnd, newStart, newEnd)).toBe(false);
  });

  it('Nên trả về false khi chuyến mới hoàn toàn trước chuyến cũ', () => {
    const newStart = new Date('2026-11-01T05:00:00Z');
    const newEnd = new Date('2026-11-01T08:00:00Z');
    expect(isScheduleOverlapping(tripStart, tripEnd, newStart, newEnd)).toBe(false);
  });
});

describe('3. Kiểm tra sức chứa xe dựa trên Snapshot khi tài xế duyệt yêu cầu', () => {
  const snapshot = {
    seats_total: 4,
    cargo_area_total_m2: 2.0,
    cargo_weight_total_kg: 200.0,
  };

  it('Nên chấp nhận yêu cầu đi nhờ khi còn đủ ghế ngồi', () => {
    const reserved = { seats_reserved: 2, cargo_area_reserved_m2: 0, cargo_weight_reserved_kg: 0 };
    const request = { type: 'RIDE' as const, passenger_count: 2 };
    const result = canAcceptRequest(snapshot, reserved, request);
    expect(result.canAccept).toBe(true);
  });

  it('Nên từ chối yêu cầu đi nhờ khi số ghế vượt quá sức chứa snapshot', () => {
    const reserved = { seats_reserved: 3, cargo_area_reserved_m2: 0, cargo_weight_reserved_kg: 0 };
    const request = { type: 'RIDE' as const, passenger_count: 2 };
    const result = canAcceptRequest(snapshot, reserved, request);
    expect(result.canAccept).toBe(false);
    expect(result.reason).toContain('Hết chỗ ngồi');
  });

  it('Nên chấp nhận yêu cầu gửi đồ khi diện tích và tải trọng còn đủ', () => {
    const reserved = { seats_reserved: 0, cargo_area_reserved_m2: 1.0, cargo_weight_reserved_kg: 100.0 };
    const request = {
      type: 'PACKAGE' as const,
      package_items: [
        { area_m2: 0.5, weight_kg: 50.0 },
        { area_m2: 0.3, weight_kg: 30.0 },
      ],
    };
    const result = canAcceptRequest(snapshot, reserved, request);
    expect(result.canAccept).toBe(true);
  });

  it('Nên từ chối khi vượt quá tải trọng kg', () => {
    const reserved = { seats_reserved: 0, cargo_area_reserved_m2: 0.5, cargo_weight_reserved_kg: 180.0 };
    const request = {
      type: 'PACKAGE' as const,
      package_items: [{ area_m2: 0.2, weight_kg: 30.0 }], // 180 + 30 = 210 > 200kg
    };
    const result = canAcceptRequest(snapshot, reserved, request);
    expect(result.canAccept).toBe(false);
    expect(result.reason).toContain('tải trọng');
  });
});

describe('4. Kiểm tra quy tắc tỷ lệ hủy tuần (CS-02)', () => {
  it('Nên bỏ qua khi mẫu số = 0 (confirmed_count = 0)', () => {
    const result = calculateWeeklyCancellationRate(0, 0);
    expect(result.isApplicable).toBe(false);
    expect(result.isViolation).toBe(false);
  });

  it('Nên không vi phạm khi tỷ lệ hủy <= 5% (ví dụ 1 / 20 = 5.0%)', () => {
    const result = calculateWeeklyCancellationRate(20, 1);
    expect(result.isApplicable).toBe(true);
    expect(result.rate).toBe(0.05);
    expect(result.isViolation).toBe(false); // <= 5% là hợp lệ
  });

  it('Nên phát hiện vi phạm khi tỷ lệ hủy > 5% (ví dụ 1 / 15 ~ 6.67%)', () => {
    const result = calculateWeeklyCancellationRate(15, 1);
    expect(result.isApplicable).toBe(true);
    expect(result.rate).toBeGreaterThan(0.05);
    expect(result.isViolation).toBe(true); // > 5% là vi phạm
  });

  it('Nên phát hiện vi phạm khi tỷ lệ hủy cao (ví dụ 2 / 10 = 20%)', () => {
    const result = calculateWeeklyCancellationRate(10, 2);
    expect(result.isApplicable).toBe(true);
    expect(result.rate).toBe(0.2);
    expect(result.isViolation).toBe(true);
  });
});
