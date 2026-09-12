/**
 * ============================================================================
 * CLI/CRAWL.TS — CHẠY CRAWLER TỪ DÒNG LỆNH
 * ============================================================================
 *
 * 🚀 CÁCH DÙNG
 *
 *   # Cào theo danh sách CRAWLER_SEED_URLS trong .env
 *   npm run crawl
 *
 *   # Cào một URL cụ thể
 *   npm run crawl -- https://vff.org.vn/tin-tuc/
 *
 *   # Cào nhiều URL, giới hạn 20 trang, sâu 1 lớp
 *   npm run crawl -- https://a.vn https://b.vn --max-pages=20 --max-depth=1
 *
 *   # Cào nhanh, KHÔNG tốn quota Gemini (không làm sạch bằng AI, không nhúng vector)
 *   npm run crawl -- https://vff.org.vn --no-ai --no-embed
 *
 *   # Chỉ nhận URL chứa "bong-da"
 *   npm run crawl -- https://bao.vn --pattern=bong-da
 *
 * ----------------------------------------------------------------------------
 * 💡 MẸO TIẾT KIỆM QUOTA — quy trình 2 bước được khuyên dùng:
 *
 *   Bước 1:  npm run crawl -- <url> --no-embed     ← cào nhanh, lưu nội dung
 *   Bước 2:  npm run index                          ← nhúng vector sau
 *
 * Tách hai bước cho bạn quyền kiểm soát: xem nội dung cào về có dùng được
 * không rồi mới quyết định bỏ quota ra nhúng.
 * ============================================================================
 */

import { connectDatabase, closeDatabase } from '@/config/database';
import { env, crawlerSeedUrls } from '@/config/env';
import { getPoolStats, getKeyCount } from '@/config/gemini';
import { logger } from '@/utils/logger';
import { crawl } from '@/services/crawl/crawler';

/**
 * Đọc tham số dòng lệnh.
 *
 * Quy ước: bất cứ gì bắt đầu bằng "--" là CỜ, còn lại là URL.
 * Cách phân loại đơn giản này đủ dùng và không cần thêm thư viện nào.
 */
function parseArgs(argv: string[]) {
  const urls: string[] = [];
  const flags = new Map<string, string>();

  for (const arg of argv) {
    if (arg.startsWith('--')) {
      // split('=') luôn trả về ít nhất một phần tử, nhưng TypeScript ở chế độ
      // nghiêm ngặt vẫn coi phần tử mảng là có thể undefined -> chốt lại bằng ?? ''
      const [key, value] = arg.slice(2).split('=');
      if (key) flags.set(key, value ?? 'true');
    } else if (/^https?:\/\//i.test(arg)) {
      urls.push(arg);
    }
  }

  return { urls, flags };
}

async function main() {
  // process.argv = [node, script, ...tham số của người dùng]
  const { urls, flags } = parseArgs(process.argv.slice(2));

  // Không truyền URL nào -> lấy danh sách hạt giống trong .env
  const seedUrls = urls.length > 0 ? urls : crawlerSeedUrls;

  if (seedUrls.length === 0) {
    console.error('\n❌ Chưa có URL nào để cào.\n');
    console.error('   Cách 1 — truyền thẳng:  npm run crawl -- https://vff.org.vn/tin-tuc/');
    console.error('   Cách 2 — điền vào .env: CRAWLER_SEED_URLS=https://a.vn,https://b.vn\n');
    process.exit(1);
  }

  // --- Báo cáo tình trạng key TRƯỚC khi chạy ---
  // Biết trước mình có bao nhiêu quota còn hơn chạy nửa chừng mới phát hiện thiếu.
  const keyCount = getKeyCount();
  const useAi = flags.get('no-ai') !== 'true';
  const shouldEmbed = flags.get('no-embed') !== 'true';

  console.log('\n🕷️  BẮT ĐẦU CÀO DỮ LIỆU\n');
  console.log('   URL hạt giống : ' + seedUrls.length);
  seedUrls.forEach((u) => console.log('                   • ' + u));
  console.log('   Số key Gemini : ' + keyCount + (keyCount === 0 ? '  ⚠️  chưa có key!' : ''));
  console.log('   Làm sạch bằng AI: ' + (useAi ? 'bật' : 'TẮT'));
  console.log('   Nhúng vector    : ' + (shouldEmbed ? 'bật' : 'TẮT'));
  console.log('   Tôn trọng robots: ' + (env.CRAWLER_RESPECT_ROBOTS ? 'CÓ ✅' : 'KHÔNG ⚠️'));
  console.log('');

  if (keyCount === 0 && (useAi || shouldEmbed)) {
    console.warn(
      '⚠️  Chưa có key Gemini nào — sẽ chỉ cào được nội dung thô, không làm sạch\n' +
        '    và không nhúng vector. Thêm key vào GEMINI_API_KEYS trong .env ở gốc repo.\n'
    );
  }

  await connectDatabase();

  try {
    const report = await crawl({
      seedUrls,
      maxPages: flags.has('max-pages') ? Number(flags.get('max-pages')) : undefined,
      maxDepth: flags.has('max-depth') ? Number(flags.get('max-depth')) : undefined,
      sameDomainOnly: flags.get('any-domain') !== 'true',
      useAi,
      embed: shouldEmbed,
      // --pattern=bong-da  ->  chỉ đi vào link có chứa "bong-da"
      urlPattern: flags.has('pattern') ? new RegExp(flags.get('pattern')!, 'i') : undefined,
    });

    // --- In báo cáo ---
    console.log('\n📊 KẾT QUẢ\n');
    console.log('   Trang đã duyệt     : ' + report.pagesVisited);
    console.log('   Tài liệu lưu mới   : ' + report.documentsSaved);
    console.log('   Bỏ qua (không đổi) : ' + report.documentsSkipped);
    console.log('   robots.txt chặn    : ' + report.blocked);
    console.log('   Lỗi                : ' + report.errors);
    console.log('   Đoạn văn bản       : ' + report.chunksCreated);
    console.log('   Đã nhúng vector    : ' + report.chunksEmbedded);
    console.log('   Thời gian          : ' + Math.round(report.durationMs / 1000) + 's');

    // --- Tình trạng key sau khi chạy: biết key nào đang hết lượt ---
    if (keyCount > 0) {
      const stats = getPoolStats();
      console.log('\n🔑 TÌNH TRẠNG KEY GEMINI\n');
      for (const key of stats.keys) {
        const icon = key.status === 'ready' ? '✅' : '⏳';
        console.log(
          '   ' + icon + ' ' + key.label +
            '  thành công: ' + key.okCount +
            ', hết lượt: ' + key.quotaErrors +
            (key.cooldownSeconds > 0 ? ', nghỉ thêm ' + key.cooldownSeconds + 's' : '')
        );
      }
      if (stats.cooling > 0) {
        console.log(
          '\n   💡 Có ' + stats.cooling + '/' + stats.total + ' key đang hết lượt. ' +
            'Thêm key mới vào GEMINI_API_KEYS để cào nhanh hơn.'
        );
      }
    }

    if (report.chunksCreated > report.chunksEmbedded) {
      console.log(
        '\n   💡 Còn ' + (report.chunksCreated - report.chunksEmbedded) +
          ' đoạn chưa có vector. Chạy `npm run index` để xử lý nốt.'
      );
    }

    console.log('');
  } finally {
    /**
     * finally chạy KỂ CẢ khi có lỗi. Đóng database tử tế là bắt buộc với
     * PGlite: thoát đột ngột có thể làm hỏng file dữ liệu, và lần chạy sau
     * sẽ báo "Aborted()" — lúc đó phải `npm run db:reset`, mất sạch dữ liệu.
     */
    await closeDatabase();
  }
}

main().catch((err) => {
  logger.error('[crawl] Lỗi nghiêm trọng: ' + (err instanceof Error ? err.stack : String(err)));
  process.exit(1);
});
