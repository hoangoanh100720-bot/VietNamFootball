/**
 * ============================================================================
 * DB/DATAPATCHES.TS — BẢN VÁ DỮ LIỆU CHẠY MỘT LẦN KHI SERVER KHỞI ĐỘNG
 * ============================================================================
 *
 * Migration (.sql) lo CẤU TRÚC bảng. Còn những đợt thay DỮ LIỆU lớn viết bằng
 * TypeScript (như thay toàn bộ trận mẫu bằng trận thật) thì đặt ở đây.
 *
 * Vì sao chạy trong server mà không làm lệnh CLI riêng? PGlite chỉ cho MỘT tiến
 * trình mở database. Lệnh riêng chạy song song với server = hai tiến trình cùng
 * ghi = database hỏng (đã xảy ra thật ngày 27/09/2026).
 *
 * Mỗi bản vá ghi tên vào bảng _migrations (dùng chung với migration SQL) nên chỉ
 * chạy ĐÚNG MỘT LẦN. Muốn áp lại dữ liệu mới -> thêm bản vá với TÊN MỚI.
 * ============================================================================
 */

import { query, withTransaction, type DbExecutor } from '@/config/database';
import { applyRealMatches } from '@/db/realMatches';
import { logger } from '@/utils/logger';

interface DataPatch {
  name: string;
  run: (db: DbExecutor) => Promise<unknown>;
}

export const DATA_PATCHES: DataPatch[] = [
  // Thay trận mẫu bằng trận thật (nguồn: seeds/realMatches.ts)
  { name: 'data:real-matches-2026-09-28', run: applyRealMatches },
];

export async function applyDataPatches(): Promise<void> {
  const { rows } = await query<{ name: string }>(`SELECT name FROM _migrations WHERE name LIKE 'data:%'`);
  const done = new Set(rows.map((r) => r.name));

  for (const patch of DATA_PATCHES) {
    if (done.has(patch.name)) continue;
    logger.info('Đang áp bản vá dữ liệu: ' + patch.name);
    const result = await withTransaction(async (tx) => {
      const r = await patch.run(tx);
      await tx.query(`INSERT INTO _migrations (name) VALUES ($1)`, [patch.name]);
      return r;
    });
    logger.info('   Thành công: ' + patch.name + ' ' + JSON.stringify(result));
  }
}

/** Đánh dấu mọi bản vá là "đã chạy" — dùng sau khi seed, vì seed đã tự áp dữ liệu thật */
export async function markDataPatchesApplied(db: DbExecutor): Promise<void> {
  for (const patch of DATA_PATCHES) {
    await db.query(`INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [patch.name]);
  }
}
