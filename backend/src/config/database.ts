/**
 * ============================================================================
 * CONFIG/DATABASE.TS — LỚP TRUY CẬP DỮ LIỆU (2 driver, 1 giao diện)
 * ============================================================================
 *
 * Ý TƯỞNG CỐT LÕI:
 * Toàn bộ ứng dụng chỉ gọi đúng 2 hàm: query() và withTransaction().
 * Bên dưới, dữ liệu thật sự nằm ở đâu là chuyện riêng của file này:
 *
 *   DB_DRIVER=pglite    -> PostgreSQL biên dịch sang WebAssembly, chạy ngay
 *                          trong tiến trình Node, lưu vào thư mục ./data.
 *                          KHÔNG cần cài đặt gì. Hoàn hảo để học và dev.
 *   DB_DRIVER=postgres  -> PostgreSQL thật (máy bạn, Neon, Supabase, Railway).
 *
 * Cú pháp SQL của hai bên GIỐNG HỆT NHAU vì PGlite chính là Postgres.
 * Đổi driver = sửa 1 dòng trong .env, không đụng tới bất kỳ dòng code nào.
 *
 * ----------------------------------------------------------------------------
 * BẢO MẬT — CHỐNG SQL INJECTION:
 *
 *   SAI:  query("SELECT * FROM users WHERE email = " + email)
 *         Kẻ tấn công nhập email chứa mệnh đề luôn đúng -> lấy sạch bảng users.
 *
 *   ĐÚNG: query('SELECT * FROM users WHERE email = $1', [email])
 *         $1 là "tham số hoá": Postgres nhận giá trị RIÊNG với câu lệnh,
 *         nên dữ liệu không bao giờ bị hiểu nhầm thành câu lệnh.
 *
 * TRONG DỰ ÁN NÀY: MỌI giá trị đến từ người dùng BẮT BUỘC đi qua $1, $2, $3...
 * ============================================================================
 */

import path from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/** Hình dạng kết quả trả về, thống nhất cho cả hai driver */
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/**
 * Giao diện chung mà một "kết nối" phải đáp ứng.
 * Dùng cho cả kết nối thường lẫn kết nối bên trong transaction.
 */
export interface DbExecutor {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

// --------------------------------------------------------------------------
// Biến lưu kết nối. Chỉ MỘT trong hai được dùng, tuỳ DB_DRIVER.
// --------------------------------------------------------------------------
let pgPool: Pool | null = null;
let pglite: PGlite | null = null;

/**
 * Mở kết nối tới database. Gọi MỘT LẦN duy nhất lúc server khởi động.
 */
export async function connectDatabase(): Promise<void> {
  if (env.DB_DRIVER === 'pglite') {
    const dir = path.resolve(process.cwd(), env.PGLITE_DATA_DIR);
    logger.info('Đang mở PGlite (Postgres nhúng) tại: ' + dir);

    try {
      pglite = new PGlite(dir);
      await pglite.waitReady; // chờ WebAssembly nạp xong
      await pglite.query('SELECT 1'); // kiểm tra chạy được thật
      logger.info('PGlite sẵn sàng — không cần cài PostgreSQL');
      return;
    } catch (err) {
      /**
       * PGlite hỏng thường chỉ vì MỘT lý do: tiến trình trước bị tắt cưỡng chế
       * (Task Manager, kill -9, mất điện) nên dữ liệu ghi dở dang.
       *
       * Thông báo mặc định của WebAssembly là "Aborted()" — hoàn toàn khó hiểu
       * với người mới. Ta dịch nó thành hướng dẫn cụ thể.
       */
      pglite = null;
      logger.error('==================================================');
      logger.error('KHÔNG MỞ ĐƯỢC DATABASE PGLITE');
      logger.error('Nguyên nhân thường gặp: lần chạy trước bị tắt đột ngột');
      logger.error('(đóng Task Manager / kill -9) khiến dữ liệu hỏng.');
      logger.error('');
      logger.error('CÁCH SỬA:  npm run db:reset');
      logger.error('(lệnh này xoá và dựng lại database kèm dữ liệu mẫu)');
      logger.error('');
      logger.error('CÁCH TRÁNH LẦN SAU: luôn tắt server bằng Ctrl + C');
      logger.error('==================================================');
      throw err;
    }
  }

  // ---- PostgreSQL thật ----
  // POOL LÀ GÌ? Mở một kết nối TCP tới Postgres mất 20-50ms. Nếu mỗi request
  // đều mở rồi đóng thì rất chậm. Pool giữ sẵn N kết nối để tái sử dụng.
  pgPool = new Pool(
    env.DATABASE_URL
      ? {
          connectionString: env.DATABASE_URL,
          max: env.DB_POOL_MAX,
          ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
        }
      : {
          host: env.DB_HOST,
          port: env.DB_PORT,
          database: env.DB_NAME,
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          max: env.DB_POOL_MAX,
          ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
          idleTimeoutMillis: 30_000, // kết nối rảnh 30s thì trả lại hệ thống
          connectionTimeoutMillis: 10_000, // chờ tối đa 10s khi xin kết nối
        }
  );

  // Kết nối đang rảnh vẫn có thể đứt (mạng chập chờn, DB restart).
  // Không bắt lỗi ở đây thì Node sẽ đánh sập toàn bộ tiến trình.
  pgPool.on('error', (err) => {
    logger.error('Kết nối Postgres rảnh gặp lỗi: ' + err.message);
  });

  const client = await pgPool.connect();
  try {
    const res = await client.query('SELECT version()');
    logger.info('PostgreSQL đã kết nối: ' + String(res.rows[0]?.version).slice(0, 40));
  } finally {
    client.release(); // LUÔN trả kết nối về pool, kể cả khi có lỗi
  }
}

/**
 * Chạy một câu SQL.
 *
 * @param text   Câu SQL, dùng $1 $2 $3 cho tham số
 * @param params Mảng giá trị tương ứng
 *
 * Ví dụ:
 *   const { rows } = await query<Player>(
 *     'SELECT * FROM players WHERE position = $1 LIMIT $2', ['GK', 5]
 *   );
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const startedAt = Date.now();

  try {
    if (pglite) {
      const res = await pglite.query<T>(text, params);
      logSlowQuery(text, Date.now() - startedAt);
      return { rows: res.rows, rowCount: countRows(res) };
    }

    if (pgPool) {
      const res = await pgPool.query(text, params as never[]);
      logSlowQuery(text, Date.now() - startedAt);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
    }

    throw new Error('Database chưa được kết nối. Hãy gọi connectDatabase() trước.');
  } catch (err) {
    // Log câu SQL để debug, nhưng KHÔNG log params (có thể chứa mật khẩu)
    logger.error('SQL lỗi: ' + text.replace(/\s+/g, ' ').slice(0, 120));
    throw err;
  }
}

/**
 * Chạy một SCRIPT SQL gồm NHIỀU câu lệnh (phân tách bởi dấu ;).
 *
 * Vì sao cần hàm riêng? query() ở trên chỉ chạy được MỘT câu lệnh
 * (đó là ràng buộc của chế độ "extended query" khi có tham số $1, $2).
 * File migration thì luôn có hàng chục câu CREATE TABLE liền nhau
 * -> phải dùng chế độ "simple query" mới chạy được cả script.
 *
 * LƯU Ý: hàm này KHÔNG nhận tham số $1 -> chỉ dùng cho SQL do ta tự viết
 * (migration, seed), TUYỆT ĐỐI không truyền dữ liệu người dùng vào đây.
 */
export async function execScript(sql: string): Promise<void> {
  if (pglite) {
    await pglite.exec(sql);
    return;
  }
  if (pgPool) {
    // pg cho phép nhiều câu lệnh khi KHÔNG truyền mảng params
    await pgPool.query(sql);
    return;
  }
  throw new Error('Database chưa được kết nối.');
}

/**
 * ĐẾM SỐ DÒNG BỊ ẢNH HƯỞNG — có một cái bẫy ở đây.
 *
 * SELECT trả về dữ liệu trong `rows`, nên đếm rows là đúng.
 * Nhưng INSERT / UPDATE / DELETE (không có RETURNING) trả về `rows` RỖNG,
 * số dòng thật nằm ở `affectedRows`.
 *
 * Nếu chỉ dùng rows.length thì mọi lệnh DELETE đều báo "đã xoá 0 dòng"
 * dù thực tế đã xoá thành công. Bug này rất khó phát hiện vì
 * dữ liệu VẪN bị xoá đúng — chỉ con số báo về là sai, khiến những đoạn
 * code kiểu `if (rowCount > 0)` chạy sai nhánh.
 *
 * ?? (nullish coalescing) chỉ lùi về rows.length khi affectedRows là
 * null/undefined — KHÔNG lùi khi nó bằng 0, vì 0 cũng là một câu trả lời hợp lệ.
 */
function countRows(res: { rows: unknown[]; affectedRows?: number }): number {
  return res.affectedRows ?? res.rows.length;
}

/** Cảnh báo câu truy vấn chậm — dấu hiệu cần thêm INDEX */
function logSlowQuery(text: string, ms: number) {
  if (ms > 300) {
    logger.warn('Truy vấn chậm ' + ms + 'ms: ' + text.replace(/\s+/g, ' ').slice(0, 100));
  }
}

/**
 * TRANSACTION — "tất cả hoặc không gì cả".
 *
 * Ví dụ khi đăng ký: (1) tạo user, (2) tạo refresh token.
 * Nếu bước (2) lỗi mà bước (1) đã lưu -> user tồn tại nhưng không đăng nhập được.
 * Transaction đảm bảo: lỗi ở bất kỳ đâu -> ROLLBACK, database quay về như cũ.
 *
 *   await withTransaction(async (tx) => {
 *     await tx.query('INSERT INTO users ... RETURNING *', [...]);
 *     await tx.query('INSERT INTO refresh_tokens ...', [...]);
 *   });
 */
export async function withTransaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  // ---- PGlite ----
  if (pglite) {
    const db = pglite;
    await db.query('BEGIN');
    try {
      const result = await fn({
        query: async <R,>(text: string, params: unknown[] = []) => {
          const res = await db.query<R>(text, params);
          return { rows: res.rows, rowCount: countRows(res) };
        },
      });
      await db.query('COMMIT');
      return result;
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  }

  // ---- PostgreSQL thật ----
  if (pgPool) {
    const client: PoolClient = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn({
        query: async <R,>(text: string, params: unknown[] = []) => {
          const res = await client.query(text, params as never[]);
          return { rows: res.rows as R[], rowCount: res.rowCount ?? 0 };
        },
      });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  throw new Error('Database chưa được kết nối.');
}

/** Đóng kết nối khi tắt server (graceful shutdown) */
export async function closeDatabase(): Promise<void> {
  if (pglite) {
    await pglite.close();
    pglite = null;
    logger.info('Đã đóng PGlite');
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
    logger.info('Đã đóng pool PostgreSQL');
  }
}
