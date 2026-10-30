export interface CancellationRateResult {
  isApplicable: boolean; // false nếu mẫu số = 0
  confirmedCount: number;
  cancelledCount: number;
  rate: number; // Từ 0.0 đến 1.0
  isViolation: boolean; // rate > 0.05 (5%)
}

/**
 * Tính tỷ lệ hủy tuần (T2–CN, theo ngày khởi hành, giờ VN) = số lượt hủy bị tính ÷ số yêu cầu đã được xác nhận.
 * Mẫu số bằng 0 thì bỏ qua tuần đó.
 *
 * Được tính vào tử số:
 * - Người dùng hủy sau khi đã ACCEPTED
 * - FAILED do lỗi người dùng: WRONG_INFO, UNREACHABLE, ABSENT
 *
 * KHÔNG tính vào tử số:
 * - REJECTED
 * - EXPIRED
 * - Hủy khi còn PENDING
 * - FAILED lý do OTHER
 *
 * LOẠI KHỎI CẢ TỬ SỐ VÀ MẪU SỐ:
 * - Yêu cầu bị hủy do tài xế hủy chuyến
 */
export function calculateWeeklyCancellationRate(
  confirmedCount: number,
  cancelledCount: number
): CancellationRateResult {
  if (confirmedCount <= 0) {
    return {
      isApplicable: false,
      confirmedCount: 0,
      cancelledCount: 0,
      rate: 0,
      isViolation: false,
    };
  }

  const rate = cancelledCount / confirmedCount;
  // Làm tròn tỷ lệ để so sánh chính xác
  const isViolation = rate > 0.05;

  return {
    isApplicable: true,
    confirmedCount,
    cancelledCount,
    rate: Math.round(rate * 10000) / 10000,
    isViolation,
  };
}
