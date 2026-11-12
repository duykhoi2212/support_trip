import { app } from './app.js';
import { config } from './config/index.js';
import { bootstrapScheduler } from './modules/scheduler/cron.js';

const PORT = config.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Máy chủ Backend đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 Môi trường: ${config.NODE_ENV}`);

  // Khởi động chạy bù và các cron jobs tự động của hệ thống
  await bootstrapScheduler();
});

