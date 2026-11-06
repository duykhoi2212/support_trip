import dotenv from 'dotenv';
import fs from 'fs';

/**
 * Chốt an toàn: chỉ cho phép chạy test trên CSDL test riêng biệt.
 * Dừng toàn bộ test nếu thiếu .env.test hoặc DATABASE_URL trùng với CSDL chính (.env).
 */
function getHostAndSchema(url?: string): { host: string | null; schema: string } {
  if (!url) return { host: null, schema: 'public' };
  try {
    const parsed = new URL(url);
    const schema = parsed.searchParams.get('schema') || 'public';
    return { host: parsed.host, schema };
  } catch {
    return { host: null, schema: 'public' };
  }
}

export default function setup() {
  if (!fs.existsSync('.env.test')) {
    throw new Error('❌ Thiếu file backend/.env.test. Không chạy test để bảo vệ CSDL chính.');
  }

  const testConfig = getHostAndSchema(dotenv.parse(fs.readFileSync('.env.test')).DATABASE_URL);
  if (!testConfig.host) {
    throw new Error('❌ DATABASE_URL trong .env.test không hợp lệ.');
  }

  if (fs.existsSync('.env')) {
    const mainConfig = getHostAndSchema(dotenv.parse(fs.readFileSync('.env')).DATABASE_URL);
    // Nếu cùng host và cùng schema -> Nguy hiểm cho dữ liệu chính
    if (mainConfig.host && mainConfig.host === testConfig.host && mainConfig.schema === testConfig.schema) {
      throw new Error(
        '❌ .env.test đang trỏ vào cùng CSDL và Schema với CSDL chính. Vui lòng dùng branch riêng hoặc schema=test_schema.'
      );
    }
  }

  console.log(`🧪 Test chạy trên CSDL: ${testConfig.host} (Schema: ${testConfig.schema})`);
}

