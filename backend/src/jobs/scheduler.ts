/**
 * ============================================================================
 * JOBS/SCHEDULER.TS — LỊCH CHẠY TỰ ĐỘNG (node-cron)
 * ============================================================================
 *
 * ĐỌC BIỂU THỨC CRON — 5 ô, ngăn cách bởi dấu cách:
 *
 *   ┌───── phút        (0-59)
 *   │ ┌─── giờ         (0-23)
 *   │ │ ┌─ ngày tháng  (1-31)
 *   │ │ │ ┌ tháng      (1-12)
 *   │ │ │ │ ┌ thứ      (0-7, 0 và 7 đều là Chủ nhật)
 *   │ │ │ │ │
 *   0 1 * * *     -> 01:00 mỗi ngày
 *   0 2 * * 0     -> 02:00 mỗi Chủ nhật
 *   (dấu sao chéo)15 * * * *  -> cứ 15 phút một lần
 *
 * ⚠️ MẸO NHỎ VỪA GẶP: KHÔNG viết dãy "sao + gạch chéo" bên trong khối comment
 * kiểu này, vì đó chính là ký hiệu ĐÓNG comment -> trình biên dịch báo lỗi
 * hàng loạt ở những dòng phía dưới. Đây là lỗi rất hay gặp khi ghi chú cron.
 *
 * ⚠️ MÚI GIỜ: máy chủ đặt ở Mỹ nhưng ta muốn chạy 01:00 GIỜ VIỆT NAM.
 * Luôn truyền timezone rõ ràng, đừng phó mặc cho múi giờ hệ điều hành.
 *
 * LỊCH CỦA DỰ ÁN (mục 8.1 ARCHITECTURE.md):
 *   01:00  đội hình + sơ đồ
 *   01:10  cầu thủ + giá trị chuyển nhượng
 *   01:20  lịch thi đấu + kết quả
 *   01:30  bảng xếp hạng FIFA
 *   02:00  dọn token hết hạn
 *
 * Vì sao lệch 10 phút mỗi job? Để không gọi dồn dập vào cùng một nguồn dữ liệu
 * (dễ bị chặn IP), và nếu lỗi thì biết ngay job nào lỗi.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { env, crawlerSeedUrls } from '@/config/env';
import { logger } from '@/utils/logger';
import { cleanupExpiredTokens } from '@/modules/auth/auth.service';
import { cacheDel } from '@/utils/cache';
import { syncFixtures, syncPlayers, syncRanking, syncSquad } from '@/services/crawler.service';
import { crawl } from '@/services/crawl/crawler';

const tasks: ScheduledTask[] = [];

/**
 * Bọc mỗi job bằng lớp bảo vệ chung: đo thời gian, ghi log, thử lại khi lỗi.
 * Nhờ vậy từng job chỉ cần lo phần việc của nó.
 */
function createJob(name: string, fn: () => Promise<unknown>, maxRetries = 3) {
  return async () => {
    const startedAt = Date.now();
    logger.info(`[CRON] Bắt đầu: ${name}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        logger.info(`[CRON] Xong: ${name} (${Date.now() - startedAt}ms)`, {
          result: typeof result === 'number' ? result : undefined,
        });
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(`[CRON] ${name} lần ${attempt}/${maxRetries} lỗi: ${message}`);

        if (attempt === maxRetries) {
          // Thất bại hết số lần cho phép -> ghi log mức error.
          // Ở production, đây là chỗ gắn cảnh báo qua Sentry/Telegram/email.
          logger.error(`[CRON] ${name} THẤT BẠI sau ${maxRetries} lần thử`);
        } else {
          // Chờ tăng dần: 5s, 10s, 20s
          await new Promise((r) => setTimeout(r, 5000 * Math.pow(2, attempt - 1)));
        }
      }
    }
  };
}

/** Đăng ký toàn bộ cron job. Gọi một lần khi server khởi động. */
export function startScheduler(): void {
  if (!env.CRON_ENABLED) {
    logger.info('Cron job đang TẮT (CRON_ENABLED=false)');
    return;
  }

  const options = { timezone: env.CRON_TIMEZONE };

  // 01:00 — đội hình
  tasks.push(cron.schedule(env.CRON_SYNC_SQUAD, createJob('syncSquad', syncSquad), options));

  // 01:10 — cầu thủ & giá trị
  tasks.push(cron.schedule(env.CRON_SYNC_PLAYERS, createJob('syncPlayers', syncPlayers), options));

  // 01:20 — lịch thi đấu
  tasks.push(cron.schedule(env.CRON_SYNC_FIXTURES, createJob('syncFixtures', syncFixtures), options));

  // 01:30 — BXH FIFA
  tasks.push(cron.schedule(env.CRON_SYNC_RANKING, createJob('syncRanking', syncRanking), options));

  /**
   * ⭐ 01:40 — CÀO KHO TRI THỨC CHO TRỢ LÝ AI
   *
   * Khác với bốn job phía trên (lấy SỐ LIỆU từ api-football), job này lấy
   * KIẾN THỨC từ các trang web công khai để trợ lý AI có cái mà tra cứu.
   * Xem bảng so sánh ở đầu services/crawler.service.ts.
   *
   * 🕐 VÌ SAO ĐẶT LÚC 01:40 SÁNG?
   *   1. Máy chủ của người ta cũng rảnh giờ này — cào lúc đó là lịch sự.
   *   2. Quota Gemini reset theo ngày; chạy sớm thì phần quota còn lại trong
   *      ngày vẫn đủ phục vụ người dùng thật.
   *   3. Cách job 01:30 mười phút để hai job không tranh nhau kết nối database.
   *
   * 💰 Job này rẻ hơn nhiều so với vẻ ngoài của nó: nhờ so `content_hash`,
   * trang nào không đổi nội dung sẽ bị bỏ qua hoàn toàn, không tốn một lượt
   * gọi API nhúng vector nào. Chạy hằng đêm 30 trang mà chỉ vài trang có bài
   * mới thì chi phí gần như bằng không.
   *
   * ⚙️ Job chỉ chạy khi CRAWLER_SEED_URLS có giá trị trong .env — không cấu
   * hình thì nó tự bỏ qua, không báo lỗi.
   */
  if (crawlerSeedUrls.length > 0) {
    tasks.push(
      cron.schedule(
        '40 1 * * *',
        createJob('crawlKnowledge', async () => {
          const report = await crawl({
            seedUrls: crawlerSeedUrls,
            // Giới hạn thấp hơn lúc chạy tay: job nền không nên ngốn hết quota
            maxPages: Math.min(env.CRAWLER_MAX_PAGES, 30),
            useAi: true,
            embed: true,
          });
          logger.info(
            `[CRON] Cào tri thức: ${report.documentsSaved} tài liệu mới, ` +
              `${report.documentsSkipped} không đổi, ${report.chunksEmbedded} đoạn đã nhúng`
          );
          return report.documentsSaved;
        }),
        options
      )
    );
  }

  // 02:00 — dọn dẹp
  tasks.push(
    cron.schedule(
      env.CRON_CLEANUP,
      createJob('cleanup', async () => {
        const deleted = await cleanupExpiredTokens();
        await cacheDel('*'); // xoá sạch cache để dữ liệu mới đồng bộ đêm qua được dùng
        logger.info(`[CRON] Đã xoá ${deleted} refresh token hết hạn`);
        return deleted;
      }),
      options
    )
  );

  logger.info(`Đã đăng ký ${tasks.length} cron job (múi giờ ${env.CRON_TIMEZONE})`);
}

/** Dừng toàn bộ cron khi tắt server */
export function stopScheduler(): void {
  for (const task of tasks) task.stop();
  tasks.length = 0;
}
