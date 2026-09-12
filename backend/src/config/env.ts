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

import path from 'path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * Cả dự án dùng MỘT file .env ở GỐC repo (backend, mobile, docker-compose).
 * src/config/env.ts và dist/config/env.js đều nằm sâu 3 cấp so với gốc repo.
 * Biến đã có sẵn trong môi trường (Docker, Secret Manager) được giữ nguyên —
 * dotenv không ghi đè; không có file (production) thì dotenv bỏ qua, không lỗi.
 */
loadDotenv({ path: path.resolve(__dirname, '../../../.env') });

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
  /**
   * ⭐ HAI CÁCH KHAI BÁO KEY — DÙNG ĐƯỢC CẢ HAI CÙNG LÚC
   *
   *   GEMINI_API_KEY  = một key duy nhất          (cách cũ, vẫn chạy)
   *   GEMINI_API_KEYS = nhiều key, ngăn bằng dấu phẩy   ⭐ cách khuyến nghị
   *
   * VÌ SAO CẦN NHIỀU KEY?
   * Gói miễn phí của Gemini giới hạn theo PHÚT và theo NGÀY (RPM / RPD).
   * Khi crawl + OCR hàng trăm trang, một key sẽ hết quota rất nhanh và
   * server trả về lỗi 429 (Too Many Requests).
   *
   * Giải pháp: bỏ nhiều key vào một "hồ" (pool). Mỗi lần gọi lấy key kế tiếp
   * theo vòng tròn (round-robin). Key nào dính 429 thì bị "phạt nghỉ"
   * GEMINI_KEY_COOLDOWN_MS mili-giây, pool tự chuyển sang key khác.
   * Chi tiết thuật toán: src/config/geminiKeyPool.ts
   *
   * ⚠️ Mỗi key phải thuộc MỘT tài khoản Google khác nhau thì mới thực sự
   *    nhân được quota. Nhiều key cùng một dự án vẫn chung một hạn mức.
   */
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_API_KEYS: z.string().optional(),
  /** Key dính 429/quota thì nghỉ bao lâu trước khi được dùng lại (mặc định 60 giây) */
  GEMINI_KEY_COOLDOWN_MS: z.coerce.number().int().min(1000).default(60_000),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
  /** Model "nặng" hơn, chỉ dùng cho tác vụ cần suy luận sâu (phân tích trận) */
  GEMINI_MODEL_PRO: z.string().default('gemini-3.6-pro'),
  GEMINI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.4),
  GEMINI_MAX_OUTPUT_TOKENS: z.coerce.number().int().default(2048),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().default(30_000),
  GEMINI_MAX_RETRIES: z.coerce.number().int().default(3),

  // ---------- 6b. EMBEDDING & TÌM KIẾM AI (RAG trên PostgreSQL) ----------
  /**
   * "Embedding" = biến một đoạn văn bản thành dãy số (vector) mô tả Ý NGHĨA.
   * Hai đoạn nói cùng một chuyện thì hai vector nằm gần nhau trong không gian
   * -> tìm kiếm theo ý nghĩa chứ không chỉ khớp từ khoá.
   *
   * ⚠️ EMBEDDING_DIM phải TRÙNG với vector(768) khai trong migration
   *    004_rag_vector.pg.sql. Đổi số chiều = phải index lại toàn bộ kb_chunks.
   */
  EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  EMBEDDING_DIM: z.coerce.number().int().default(768),
  /** Số đoạn văn bản gửi đi nhúng trong MỘT request (gộp để đỡ tốn lượt gọi) */
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(16),
  /** Bật/tắt API /search. Tắt thì endpoint trả 503 chứ không sập app */
  SEARCH_ENABLED: boolFromString.default('true'),
  /** Số kết quả trả về mặc định cho tìm kiếm lai (hybrid search) */
  SEARCH_TOP_K: z.coerce.number().int().min(1).max(50).default(8),
  /** Điểm tương đồng tối thiểu (0-1). Dưới ngưỡng này coi như không liên quan */
  SEARCH_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.25),
  /** Kích thước một "đoạn" tài liệu tính theo KÝ TỰ khi cắt nhỏ để nhúng */
  RAG_CHUNK_SIZE: z.coerce.number().int().min(200).default(1400),
  /** Phần gối đầu giữa hai đoạn liền kề — tránh cắt đứt câu đang dở */
  RAG_CHUNK_OVERLAP: z.coerce.number().int().min(0).default(200),

  // ---------- 6c. OCR BẰNG GEMINI (đọc chữ trong ảnh / PDF) ----------
  /**
   * Gemini là model ĐA PHƯƠNG THỨC (multimodal): gửi thẳng ảnh/PDF vào,
   * nó đọc chữ ra — không cần cài Tesseract hay dịch vụ OCR riêng.
   * Dùng để bóc dữ liệu từ ảnh chụp bảng xếp hạng, poster lịch thi đấu,
   * biên bản trận đấu dạng PDF...
   */
  OCR_ENABLED: boolFromString.default('true'),
  /** Model dùng cho OCR. Flash đủ tốt và rẻ hơn Pro nhiều lần */
  OCR_MODEL: z.string().default('gemini-3.6-flash'),
  /** Chặn file quá lớn trước khi tốn tiền gọi API */
  OCR_MAX_FILE_MB: z.coerce.number().min(0.1).max(50).default(15),

  // ---------- 7. NGUỒN DỮ LIỆU BÓNG ĐÁ & CRAWLER ----------
  FOOTBALL_API_BASE_URL: z.string().default('https://v3.football.api-sports.io'),
  FOOTBALL_API_KEY: z.string().optional(),
  VIETNAM_TEAM_ID: z.coerce.number().int().default(26),
  CRAWLER_USER_AGENT: z.string().default('VietNamFootballBot/1.0'),
  CRAWLER_TIMEOUT_MS: z.coerce.number().int().default(20_000),
  /**
   * ⚖️ CÀO DỮ LIỆU CÓ ĐẠO ĐỨC — bốn biến dưới đây không phải để trang trí:
   *   RESPECT_ROBOTS : đọc /robots.txt và TUÂN THỦ. Mặc định bật.
   *   DELAY_MS       : nghỉ giữa hai request tới CÙNG một tên miền.
   *   MAX_PAGES      : trần cứng, tránh crawl vô tận vì một vòng lặp link.
   *   MAX_DEPTH      : độ sâu tối đa tính từ URL gốc.
   */
  CRAWLER_RESPECT_ROBOTS: boolFromString.default('true'),
  CRAWLER_DELAY_MS: z.coerce.number().int().min(0).default(1500),
  CRAWLER_MAX_PAGES: z.coerce.number().int().min(1).default(50),
  CRAWLER_MAX_DEPTH: z.coerce.number().int().min(0).default(2),
  /** Danh sách URL hạt giống, ngăn bằng dấu phẩy — dùng cho `npm run crawl` */
  CRAWLER_SEED_URLS: z.string().default(''),

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
  console.error('\n👉 Mở file .env ở gốc repo và sửa các biến ở trên rồi chạy lại.\n');
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

/**
 * ⭐ DANH SÁCH KEY GEMINI ĐÃ GỘP & LÀM SẠCH
 *
 * Gộp `GEMINI_API_KEY` (một key) với `GEMINI_API_KEYS` (nhiều key) thành MỘT
 * mảng duy nhất, rồi:
 *   • bỏ khoảng trắng thừa ở hai đầu mỗi key
 *   • bỏ chuỗi rỗng (do người dùng gõ thừa dấu phẩy: "a,,b" hoặc "a,")
 *   • bỏ key trùng lặp bằng `new Set` — trùng key thì cũng chung quota,
 *     giữ lại chỉ làm pool tưởng nhầm là mình có nhiều quota hơn thực tế
 *
 * Nhờ vậy phần còn lại của code chỉ cần biết đúng một thứ: mảng này.
 */
export const geminiApiKeys: string[] = Array.from(
  new Set(
    [env.GEMINI_API_KEY ?? '', env.GEMINI_API_KEYS ?? '']
      .join(',')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
  )
);

/**
 * Danh sách URL hạt giống cho crawler, tách từ CRAWLER_SEED_URLS.
 * Chỉ giữ URL http/https hợp lệ — sai định dạng thì loại ngay ở đây
 * thay vì để crawler chạy rồi mới ném lỗi giữa chừng.
 */
export const crawlerSeedUrls: string[] = (env.CRAWLER_SEED_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => /^https?:\/\//i.test(s));
