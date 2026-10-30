import { app } from './app.js';
import { config } from './config/index.js';

const PORT = config.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Máy chủ Backend đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 Môi trường: ${config.NODE_ENV}`);
});

