/**
 * ============================================================================
 * CONFIG/ENV.TS — NGƯỜI GÁC CỔNG BIẾN MÔI TRƯỜNG
 * ============================================================================
 *
 * VÌ SAO CẦN FILE NÀY?
 * Nếu code rải rác `process.env.JWT_SECRET` khắp nơi thì:
 *   1. TypeScript coi nó là `string | undefined` -> phải kiểm tra null khắp nơi.
 *   2. Nếu quên điền biến trong .env, app vẫn chạy rồi crash giữa chừng.
 *   3. Không ai biết app cần đúng những biến nào.
 *
 * Giải pháp: đọc + kiểm tra (validate) TẤT CẢ biến ở MỘT chỗ, ngay khi khởi
 * động. Thiếu biến -> app từ chối chạy và in ra đúng biến nào thiếu.
 * Đây gọi là nguyên tắc "fail fast" (hỏng thì hỏng sớm).
 */

// `dotenv/config` tự động đọc file .env và nạp vào process.env
import 'dotenv/config';
import { z } from 'zod';

/**
 * z.coerce.number() = "ép kiểu về số".
 * Mọi biến trong .env đều là CHUỖI (kể cả PORT=5000 -> "5000"),
 * nên phải ép về number thì mới dùng để tính toán được.
 */
const boolFromString = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true');

const envSchema = z.object({
  // ---------- 1. SERVER ----------
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  APP_NAME: z.string().default('VietNamFootball'),
  TZ: z.string().default('Asia/Ho_Chi_Minh'),

  // ---------- 2. DATABASE ----------
  /**
   * DB_DRIVER quyết định app cắm vào đâu:
   *   - 'pglite'   : PostgreSQL chạy nhúng trong Node (KHÔNG cần cài gì)
   *   - 'postgres' : PostgreSQL thật (localhost hoặc Neon/Supabase/Railway)
   * SQL viết ra giống hệt nhau cho cả hai -> đổi driver không phải sửa code.
   */
  DB_DRIVER: z.enum(['pglite', 'postgres']).default('pglite'),
  PGLITE_DATA_DIR: z.string().default('./data/pgdata'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().default(5432),
  DB_NAME: z.string().default('vnfootball'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_SSL: boolFromString.default('false'),
  DB_POOL_MAX: z.coerce.number().int().default(10),
  DATABASE_URL: z.string().optional(),

  // ---------- 3. CACHE ----------
  /** Bỏ trống REDIS_URL -> tự động dùng cache trong RAM (đủ cho môi trường dev) */
  REDIS_URL: z.string().optional(),
  CACHE_TTL_LIVE: z.coerce.number().int().default(15),      // giây
  CACHE_TTL_STATIC: z.coerce.number().int().default(86400), // 24 giờ
  CACHE_TTL_AI: z.coerce.number().int().default(21600),     // 6 giờ

  // ---------- 4. BẢO MẬT ----------
  JWT_SECRET: z.string().min(16, 'JWT_SECRET phải dài tối thiểu 16 ký tự'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET phải dài tối thiểu 16 ký tự'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  /** Danh sách domain được phép gọi API, phân tách bằng dấu phẩy */
  CORS_ORIGIN: z.string().default('*'),

  // ---------- 5. RATE LIMIT (chống spam / brute-force) ----------
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(900_000), // 15 phút
  RATE_LIMIT_MAX: z.coerce.number().int().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().default(5),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().default(20),

  // ---------- 6. GEMINI AI ----------
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.4),
  GEMINI_MAX_OUTPUT_TOKENS: z.coerce.number().int().default(2048),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().default(30_000),
  GEMINI_MAX_RETRIES: z.coerce.number().int().default(3),

  // ---------- 7. NGUỒN DỮ LIỆU BÓNG ĐÁ ----------
  FOOTBALL_API_BASE_URL: z.string().default('https://v3.football.api-sports.io'),
  FOOTBALL_API_KEY: z.string().optional(),
  VIETNAM_TEAM_ID: z.coerce.number().int().default(26),
  CRAWLER_USER_AGENT: z.string().default('VietNamFootballBot/1.0'),
  CRAWLER_TIMEOUT_MS: z.coerce.number().int().default(20_000),

  // ---------- 8. CRON ----------
  CRON_ENABLED: boolFromString.default('false'),
  CRON_TIMEZONE: z.string().default('Asia/Ho_Chi_Minh'),
  CRON_SYNC_SQUAD: z.string().default('0 1 * * *'),
  CRON_SYNC_PLAYERS: z.string().default('10 1 * * *'),
  CRON_SYNC_FIXTURES: z.string().default('20 1 * * *'),
  CRON_SYNC_RANKING: z.string().default('30 1 * * *'),
  CRON_CLEANUP: z.string().default('0 2 * * *'),

  // ---------- 9. REALTIME ----------
  LIVE_POLLING_ENABLED: boolFromString.default('true'),
  LIVE_POLLING_INTERVAL_MS: z.coerce.number().int().min(5000).default(12_000),
  SOCKET_ENABLED: boolFromString.default('true'),
  SOCKET_PATH: z.string().default('/socket.io'),
  SOCKET_CORS_ORIGIN: z.string().default('*'),

  // ---------- 10. FIREBASE (thông báo đẩy) ----------
  /**
   * Ba biến dưới lấy từ file JSON mà Firebase Console tải về:
   *   Project Settings -> Service accounts -> Generate new private key
   *
   * ⚠️ FIREBASE_PRIVATE_KEY phải để trong dấu nháy kép và giữ nguyên các "\n":
   *   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   * notification.service.ts sẽ tự đổi "\n" thành ký tự xuống dòng thật.
   */
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  /** Cờ bật/tắt riêng — cho phép tắt push mà không cần xoá cấu hình */
  FCM_ENABLED: boolFromString.default('false'),

  // ---------- 11. LOG ----------
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
  LOG_DIR: z.string().default('./logs'),
});

/** safeParse KHÔNG ném lỗi -> ta tự in thông báo cho đẹp rồi mới thoát */
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ CẤU HÌNH .env KHÔNG HỢP LỆ:\n');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\n👉 Mở file backend/.env và sửa các biến ở trên rồi chạy lại.\n');
  process.exit(1); // Dừng hẳn app. Thà không chạy còn hơn chạy sai.
}

export const env = parsed.data;

/** Các cờ tiện dụng, đỡ phải so sánh chuỗi ở nhiều nơi */
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';

/** Biến CORS_ORIGIN dạng "a.com,b.com" thành mảng ['a.com','b.com'] */
export const corsOrigins =
  env.CORS_ORIGIN === '*'
    ? '*'
    : env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
