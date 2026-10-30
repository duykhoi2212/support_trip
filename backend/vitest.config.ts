import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import fs from 'fs';

// Nạp biến môi trường của CSDL test. Nếu thiếu file, tests/setup.ts sẽ dừng toàn bộ test.
const testEnv = fs.existsSync('.env.test') ? dotenv.parse(fs.readFileSync('.env.test')) : {};

export default defineConfig({
  test: {
    env: testEnv,
    // Kiểm tra an toàn CSDL trước khi chạy bất kỳ test nào
    globalSetup: ['./tests/setup.ts'],
    // Test chạy tuần tự để tránh tranh chấp dữ liệu trên cùng CSDL test
    fileParallelism: false,
  },
});
