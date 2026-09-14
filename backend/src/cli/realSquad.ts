/**
 * ============================================================================
 * CLI/REALSQUAD.TS — ÁP ĐỘI HÌNH THẬT VÀO DATABASE ĐANG CHẠY
 * ============================================================================
 *
 * Chạy bằng:  npm run data:real-squad
 *
 * ⚠️ PHẢI TẮT SERVER TRƯỚC KHI CHẠY. PGlite chỉ cho MỘT tiến trình mở thư mục
 * dữ liệu; server đang chạy mà mở thêm tiến trình này là có nguy cơ hỏng DB
 * (xem cảnh báo "KHÔNG MỞ ĐƯỢC DATABASE PGLITE" trong config/database.ts).
 *
 * Toàn bộ nằm trong MỘT transaction: lỗi giữa chừng thì không có gì bị đổi.
 * Chi tiết từng bước: db/realSquad.ts. Nguồn dữ liệu: db/seeds/realSquad.ts.
 * ============================================================================
 */

import { closeDatabase, connectDatabase, withTransaction } from '@/config/database';
import { applyRealSquad } from '@/db/realSquad';
import { REAL_SQUAD } from '@/db/seeds/realSquad';
import { logger } from '@/utils/logger';

async function main() {
  await connectDatabase();
  try {
    const r = await withTransaction((tx) => applyRealSquad(tx));
    logger.info(
      `Đã áp "${REAL_SQUAD.title}": cập nhật ${r.updated}, thêm mới ${r.inserted}, ` +
      `chuyển ${r.retired} cầu thủ mẫu sang không hoạt động`
    );
  } finally {
    await closeDatabase();
  }
}

main().catch((err) => {
  logger.error('Áp đội hình thật thất bại', err);
  process.exit(1);
});
