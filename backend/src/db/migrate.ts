/**
 * ============================================================================
 * DB/MIGRATE.TS — BỘ CHẠY MIGRATION
 * ============================================================================
 *
 * Chạy bằng:  npm run migrate
 *
 * CÁCH HOẠT ĐỘNG (rất đơn giản, chỉ 4 bước):
 *   1. Tạo bảng _migrations để ghi nhớ file nào đã chạy.
 *   2. Đọc tất cả file .sql trong thư mục migrations, sắp xếp theo tên.
 *   3. Với mỗi file CHƯA có trong _migrations -> chạy nó.
 *   4. Ghi tên file vào _migrations.
 *
 * Nhờ bước 3, chạy lệnh này 100 lần cũng an toàn: lần thứ 2 trở đi
 * nó chỉ báo "không có migration mới". Tính chất này gọi là IDEMPOTENT.
 */

import fs from 'node:fs';
import path from 'node:path';
import { closeDatabase, connectDatabase, execScript, query } from '@/config/database';
import { logger } from '@/utils/logger';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export async function runMigrations(): Promise<void> {
  // --- Bước 1: bảng theo dõi ---
  await execScript(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // --- Bước 2: đọc danh sách file ---
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // "001_" < "002_" < "010_" nên sắp theo chuỗi là đúng thứ tự

  // --- Bước 3: lọc ra file chưa chạy ---
  const { rows } = await query<{ name: string }>('SELECT name FROM _migrations');
  const applied = new Set(rows.map((r) => r.name));

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    logger.info('Database đã ở phiên bản mới nhất — không có migration nào cần chạy');
    return;
  }

  // --- Bước 4: chạy lần lượt ---
  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    logger.info('Đang chạy migration: ' + file);

    try {
      await execScript(sql);
      await query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      logger.info('   Thành công: ' + file);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('   THẤT BẠI: ' + file + ' -> ' + message);
      // Dừng ngay, không chạy tiếp: migration sau có thể phụ thuộc migration này
      throw err;
    }
  }

  logger.info('Đã chạy xong ' + pending.length + ' migration');
}

/**
 * Khối này chỉ chạy khi gọi trực tiếp file (npm run migrate),
 * không chạy khi file được import từ nơi khác.
 */
if (require.main === module) {
  (async () => {
    await connectDatabase();
    await runMigrations();
    await closeDatabase();
    process.exit(0);
  })().catch((err: unknown) => {
    logger.error('Migration lỗi: ' + (err instanceof Error ? err.message : String(err)));
    process.exit(1);
  });
}
