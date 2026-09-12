/**
 * ============================================================================
 * CLI/INDEX.TS — NHÚNG VECTOR BÙ CHO CÁC ĐOẠN CÒN THIẾU
 * ============================================================================
 *
 * 🚀 CÁCH DÙNG
 *
 *   npm run index              # xử lý tối đa 500 đoạn
 *   npm run index -- 2000      # xử lý tối đa 2000 đoạn
 *
 * 📌 KHI NÀO CẦN CHẠY?
 *   • Sau khi crawl với cờ --no-embed
 *   • Khi lần crawl trước hết quota giữa chừng, còn sót đoạn chưa nhúng
 *   • Sau khi bạn vừa thêm key Gemini mới vào .env
 *
 * Lệnh này AN TOÀN khi chạy nhiều lần: nó chỉ đụng tới những đoạn có
 * embedding_json IS NULL, nên không bao giờ nhúng lại thứ đã xong.
 * ============================================================================
 */

import { connectDatabase, closeDatabase } from '@/config/database';
import { getKeyCount, getPoolStats } from '@/config/gemini';
import { logger } from '@/utils/logger';
import { embedPendingChunks } from '@/services/crawl/crawler';
import { getIndexStats } from '@/modules/search/search.service';

async function main() {
  const limitArg = process.argv[2];
  const limit = limitArg && Number.isFinite(Number(limitArg)) ? Number(limitArg) : 500;

  if (getKeyCount() === 0) {
    console.error('\n❌ Chưa có key Gemini — không nhúng vector được.\n');
    console.error('   Điền vào .env ở gốc repo:  GEMINI_API_KEYS=key1,key2,key3\n');
    process.exit(1);
  }

  await connectDatabase();

  try {
    const before = await getIndexStats();
    console.log('\n📚 KHO TRI THỨC TRƯỚC KHI CHẠY\n');
    console.log('   Tài liệu        : ' + before.documents);
    console.log('   Đoạn văn bản    : ' + before.chunks);
    console.log('   Đã nhúng vector : ' + before.embedded);
    console.log('   Còn chờ         : ' + before.pending);
    console.log('   Cơ chế vector   : ' + before.vector_engine + ' (' + before.driver + ')');

    if (before.pending === 0) {
      console.log('\n✅ Không còn đoạn nào cần nhúng.\n');
      return;
    }

    console.log('\n⏳ Đang nhúng tối đa ' + limit + ' đoạn...\n');
    const result = await embedPendingChunks(limit);

    const after = await getIndexStats();
    console.log('\n✅ XONG\n');
    console.log('   Đã xử lý     : ' + result.processed + ' đoạn');
    console.log('   Nhúng thành công: ' + result.embedded + ' đoạn');
    console.log('   Còn lại      : ' + after.pending + ' đoạn');

    if (after.pending > 0) {
      console.log('\n   💡 Chạy lại `npm run index` để xử lý tiếp phần còn lại.');
    }

    const stats = getPoolStats();
    console.log('\n🔑 KEY GEMINI: ' + stats.available + '/' + stats.total + ' đang sẵn sàng');
    for (const key of stats.keys) {
      console.log(
        '   ' + (key.status === 'ready' ? '✅' : '⏳') + ' ' + key.label +
          '  thành công: ' + key.okCount + ', hết lượt: ' + key.quotaErrors
      );
    }
    console.log('');
  } finally {
    await closeDatabase();
  }
}

main().catch((err) => {
  logger.error('[index] Lỗi nghiêm trọng: ' + (err instanceof Error ? err.stack : String(err)));
  process.exit(1);
});
