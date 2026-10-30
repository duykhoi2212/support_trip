import dotenv from 'dotenv';
import fs from 'fs';

/**
 * Chốt an toàn: chỉ cho phép chạy test trên CSDL test riêng biệt.
 * Dừng toàn bộ test nếu thiếu .env.test hoặc DATABASE_URL trùng với CSDL chính (.env).
 */
function getHost(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export default function setup() {
  if (!fs.existsSync('.env.test')) {
    throw new Error('❌ Thiếu file backend/.env.test. Không chạy test để bảo vệ CSDL chính.');
  }

  const testUrl = dotenv.parse(fs.readFileSync('.env.test')).DATABASE_URL;
  const testHost = getHost(testUrl);
  if (!testHost) {
    throw new Error('❌ DATABASE_URL trong .env.test không hợp lệ.');
  }

  if (fs.existsSync('.env')) {
    const mainHost = getHost(dotenv.parse(fs.readFileSync('.env')).DATABASE_URL);
    if (mainHost && mainHost === testHost) {
      throw new Error('❌ .env.test đang trỏ vào CSDL chính. Hãy dùng Neon branch "test".');
    }
  }

  console.log(`🧪 Test chạy trên CSDL: ${testHost}`);
}
