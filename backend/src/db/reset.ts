/**
 * ============================================================================
 * DB/RESET.TS — XOÁ SẠCH VÀ DỰNG LẠI DATABASE
 * ============================================================================
 *
 * Chạy bằng:  npm run db:reset
 *
 * KHI NÀO CẦN DÙNG?
 *
 * 1. PGLITE BỊ HỎNG SAU KHI TẮT CƯỠNG CHẾ
 *    Nếu bạn tắt server bằng Task Manager, `kill -9`, hoặc rút điện đột ngột,
 *    PGlite không kịp ghi nốt dữ liệu ra đĩa -> thư mục data hỏng.
 *    Lần khởi động sau sẽ báo lỗi khó hiểu: "Aborted()".
 *
 *    ⭐ CÁCH TRÁNH: luôn tắt server bằng Ctrl+C. Lúc đó hàm shutdown()
 *    trong server.ts sẽ đóng database tử tế.
 *
 * 2. MUỐN QUAY VỀ DỮ LIỆU GỐC sau khi nghịch lung tung.
 *
 * 3. VỪA SỬA FILE MIGRATION và muốn chạy lại từ đầu.
 *
 * ⚠️ CẢNH BÁO: lệnh này XOÁ TOÀN BỘ dữ liệu, kể cả tài khoản đã đăng ký.
 * Chỉ dùng ở môi trường development.
 *
 * ----------------------------------------------------------------------------
 * VÌ SAO ĐÂY KHÔNG PHẢI VẤN ĐỀ Ở PRODUCTION?
 * Vì production dùng PostgreSQL thật (DB_DRIVER=postgres), chạy như một dịch vụ
 * riêng biệt, có cơ chế phục hồi sau sự cố (crash recovery) và sao lưu tự động.
 * PGlite chỉ để học và phát triển.
 */

import fs from 'node:fs';
import path from 'node:path';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { closeDatabase, connectDatabase } from '@/config/database';
import { runMigrations } from '@/db/migrate';
import { seedDatabase } from '@/db/seed';

async function reset() {
  if (env.DB_DRIVER !== 'pglite') {
    logger.error(
      'db:reset chỉ dùng được với DB_DRIVER=pglite. ' +
        'Với PostgreSQL thật, hãy tự DROP DATABASE rồi CREATE lại.'
    );
    process.exit(1);
  }

  const dataDir = path.resolve(process.cwd(), env.PGLITE_DATA_DIR);

  // ---- Bước 1: xoá thư mục dữ liệu ----
  if (fs.existsSync(dataDir)) {
    logger.warn('Đang XOÁ toàn bộ dữ liệu tại: ' + dataDir);
    // recursive: xoá cả thư mục con | force: không báo lỗi nếu không tồn tại
    fs.rmSync(dataDir, { recursive: true, force: true });
    logger.info('Đã xoá xong');
  } else {
    logger.info('Chưa có thư mục dữ liệu — sẽ tạo mới');
  }

  // ---- Bước 2: dựng lại từ đầu ----
  await connectDatabase(); // PGlite tự tạo database mới khi thư mục trống
  await runMigrations();   // tạo lại 14 bảng
  await seedDatabase();    // đổ lại dữ liệu mẫu
  await closeDatabase();

  logger.info('===== DATABASE ĐÃ ĐƯỢC DỰNG LẠI HOÀN TOÀN =====');
}

reset()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    logger.error('Reset thất bại: ' + (err instanceof Error ? err.message : String(err)));
    process.exit(1);
  });
