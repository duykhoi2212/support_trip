import cron, { ScheduledTask } from 'node-cron';
import { SchedulerService } from './service.js';

const tasks: ScheduledTask[] = [];

/**
 * Khởi động toàn bộ các tác vụ tự động ngầm (Cron Jobs)
 */
export function startCronJobs() {
  stopCronJobs(); // Dọn dẹp task cũ nếu có

  // 1. CS-01: Quét đóng chuyến trước 6 giờ & hết hạn PENDING (Chạy mỗi phút)
  // Kèm theo: Nhắc nhở tài xế đến giờ đi & tự động hủy chuyến quá giờ 2 tiếng
  const taskCloseTrips = cron.schedule('* * * * *', async () => {
    try {
      const res = await SchedulerService.closeTripsBefore6h();
      if (res.closedTripsCount > 0) {
        console.log(`[CS-01] Đã tự động đóng ${res.closedTripsCount} chuyến xe và hết hạn ${res.expiredRequestsCount} yêu cầu.`);
      }

      // Quét nhắc nhở và hủy các chuyến quá hạn khởi hành > 2h
      const overdueRes = await SchedulerService.handleOverdueTrips();
      if (overdueRes.autoCancelledCount > 0) {
        console.log(`[Overdue Trips] Đã tự động hủy ${overdueRes.autoCancelledCount} chuyến xe quá hạn 2h và tạo ${overdueRes.incidentReportsCreated} báo cáo sự cố gửi Admin.`);
      }
    } catch (error) {
      console.error('[CS-01 / Overdue] Lỗi khi chạy tác vụ tự động đóng chuyến hoặc xử lý chuyến quá hạn:', error);
    }
  });
  tasks.push(taskCloseTrips);

  // 2. CS-02: Chốt tỷ lệ hủy tuần T2-CN (Chạy lúc 23:59:00 Chủ Nhật theo giờ Việt Nam)
  const taskWeeklyRate = cron.schedule(
    '59 23 * * 0',
    async () => {
      try {
        console.log('[CS-02] Bắt đầu chốt tỷ lệ hủy chuyến tuần (Asia/Ho_Chi_Minh)...');
        const res = await SchedulerService.settleWeeklyCancellationRate();
        console.log(`[CS-02] Hoàn tất chốt tuần: Đã đánh giá ${res.evaluatedUsersCount} người dùng, phát hiện ${res.violationsCount} trường hợp vi phạm.`);
      } catch (error) {
        console.error('[CS-02] Lỗi khi chốt tỷ lệ hủy tuần:', error);
      }
    },
    { timezone: 'Asia/Ho_Chi_Minh' }
  );
  tasks.push(taskWeeklyRate);

  // 3. CS-03: Tự động mở khóa tài khoản LOCKED_TEMP sau 14 ngày (Chạy mỗi 10 phút)
  const taskUnlockAccounts = cron.schedule('*/10 * * * *', async () => {
    try {
      const res = await SchedulerService.unlockExpiredLockedAccounts();
      if (res.unlockedCount > 0) {
        console.log(`[CS-03] Đã tự động mở khóa thành công cho ${res.unlockedCount} tài khoản hết hạn phạt 14 ngày.`);
      }
    } catch (error) {
      console.error('[CS-03] Lỗi khi mở khóa tự động tài khoản tạm khóa:', error);
    }
  });
  tasks.push(taskUnlockAccounts);

  console.log('⏰ Hệ thống Scheduler: Toàn bộ 3 cron jobs (CS-01, CS-02, CS-03) đã sẵn sàng.');
}

/**
 * Ngừng toàn bộ cron jobs
 */
export function stopCronJobs() {
  while (tasks.length > 0) {
    const task = tasks.pop();
    task?.stop();
  }
}

/**
 * Cơ chế chạy bù (Catch-up Bootstrap) khi khởi động Server
 * Tránh bỏ sót chuyến xe quá hạn -6h hoặc tài khoản hết hạn phạt trong thời gian server bảo trì
 */
export async function bootstrapScheduler() {
  console.log('🔄 Bắt đầu chạy bù (Catch-up) cho các tác vụ hệ thống...');
  try {
    const tripRes = await SchedulerService.closeTripsBefore6h();
    if (tripRes.closedTripsCount > 0) {
      console.log(`[Catch-up CS-01] Đã quét bù và đóng ${tripRes.closedTripsCount} chuyến xe quá hạn.`);
    }

    const overdueRes = await SchedulerService.handleOverdueTrips();
    if (overdueRes.autoCancelledCount > 0) {
      console.log(`[Catch-up Overdue] Đã quét bù và tự động hủy ${overdueRes.autoCancelledCount} chuyến xe quá hạn > 2h.`);
    }

    const unlockRes = await SchedulerService.unlockExpiredLockedAccounts();
    if (unlockRes.unlockedCount > 0) {
      console.log(`[Catch-up CS-03] Đã quét bù và mở khóa ${unlockRes.unlockedCount} tài khoản đã hết hạn phạt.`);
    }
  } catch (error) {
    console.error('❌ Lỗi khi thực hiện chạy bù hệ thống:', error);
  }

  // Khởi động các cron jobs định kỳ
  startCronJobs();
}

