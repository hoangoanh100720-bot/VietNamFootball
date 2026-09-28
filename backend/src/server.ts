/**
 * ============================================================================
 * SERVER.TS — ĐIỂM KHỞI ĐỘNG (ENTRY POINT)
 * ============================================================================
 *
 * Nhiệm vụ, theo đúng thứ tự:
 *   1. Kết nối database + cache  (không có DB thì khởi động vô nghĩa)
 *   2. Tạo HTTP server từ Express app
 *   3. Gắn Socket.IO vào CÙNG server đó (dùng chung cổng, không mở thêm)
 *   4. Bật cron job + vòng lặp theo dõi tỷ số trực tiếp
 *   5. Lắng nghe cổng
 *   6. Xử lý TẮT MƯỢT (graceful shutdown)
 *
 * TẮT MƯỢT là gì? Khi bạn nhấn Ctrl+C hoặc Railway deploy bản mới,
 * hệ điều hành gửi tín hiệu SIGTERM. Nếu thoát ngay lập tức:
 *   - Request đang xử lý dở bị cắt giữa chừng -> người dùng thấy lỗi
 *   - Kết nối DB không đóng -> rò rỉ tài nguyên
 * Tắt mượt = ngừng nhận request MỚI, xử lý nốt request CŨ, rồi mới thoát.
 */

import http from 'node:http';
import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { closeDatabase, connectDatabase } from '@/config/database';
import { runMigrations } from '@/db/migrate';
import { applyDataPatches } from '@/db/dataPatches';
import { closeCache, connectCache } from '@/utils/cache';
import { closeSocket, initSocket } from '@/services/socket.service';
import { startLivePolling, stopLivePolling } from '@/jobs/livePoll.job';
import { startScheduler, stopScheduler } from '@/jobs/scheduler';

async function bootstrap() {
  // --------- 1. Database + Cache ---------
  await connectDatabase();
  /**
   * ⭐ TỰ ÁP MIGRATION CÒN THIẾU NGAY KHI KHỞI ĐỘNG.
   *
   * Vì sao không để người dùng tự chạy `npm run migrate`? Với PGlite, lệnh đó
   * mở database bằng một tiến trình THỨ HAI — nếu server đang chạy, hai tiến
   * trình cùng ghi vào một thư mục dữ liệu và database HỎNG (đã xảy ra thật ngày
   * 27/09/2026, phải cứu bằng pg_resetwal). Chạy trong chính server thì luôn chỉ
   * có một tiến trình. runMigrations bỏ qua file đã chạy, nên mỗi lần khởi động
   * chỉ tốn một câu SELECT. Migration lỗi -> server dừng, không chạy trên dữ liệu dở dang.
   */
  await runMigrations();
  // Bản vá DỮ LIỆU viết bằng TS (vd: thay trận mẫu bằng trận thật) — mỗi bản chạy đúng một lần
  await applyDataPatches();
  await connectCache();

  // --------- 2. HTTP server ---------
  const app = createApp();
  const server = http.createServer(app);

  // --------- 3. Socket.IO (realtime) ---------
  if (env.SOCKET_ENABLED) {
    initSocket(server);
  }

  // --------- 4. Công việc nền ---------
  startScheduler();     // cron 01:00, 01:10, 01:20, 01:30, 02:00
  startLivePolling();   // vòng lặp tỷ số trực tiếp mỗi 12 giây

  // --------- 5. Lắng nghe ---------
  server.listen(env.PORT, () => {
    logger.info('==============================================');
    logger.info(env.APP_NAME + ' API đã sẵn sàng');
    logger.info('   Môi trường : ' + env.NODE_ENV);
    logger.info('   Địa chỉ    : http://localhost:' + env.PORT + env.API_PREFIX);
    logger.info('   Health     : http://localhost:' + env.PORT + '/health');
    logger.info('   Database   : ' + env.DB_DRIVER);
    logger.info('   WebSocket  : ' + (env.SOCKET_ENABLED ? env.SOCKET_PATH : 'tắt'));
    logger.info('==============================================');
  });

  // --------- 6. Tắt mượt ---------
  const shutdown = async (signal: string) => {
    logger.info('Nhận tín hiệu ' + signal + ' — đang tắt server...');

    // Dừng công việc nền TRƯỚC để chúng không ghi vào DB sắp đóng
    stopLivePolling();
    stopScheduler();
    await closeSocket();

    // Ngừng nhận kết nối mới, chờ request hiện tại xong
    server.close(async () => {
      await closeDatabase();
      await closeCache();
      logger.info('Đã đóng toàn bộ kết nối. Tạm biệt!');
      process.exit(0);
    });

    // Nếu sau 10 giây vẫn chưa xong thì buộc thoát
    setTimeout(() => {
      logger.error('Không thể tắt mượt sau 10s — buộc thoát');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM')); // lệnh dừng từ hệ thống
  process.on('SIGINT', () => void shutdown('SIGINT'));   // Ctrl + C

  /**
   * Hai lưới an toàn cuối cùng: lỗi lọt ra ngoài mọi try/catch.
   * Khi tới đây, tiến trình đã ở trạng thái không đáng tin -> ghi log rồi thoát,
   * để trình quản lý tiến trình (PM2 / Railway) khởi động lại sạch sẽ.
   */
  process.on('unhandledRejection', (reason) => {
    logger.error('Promise bị từ chối mà không ai bắt: ' + String(reason));
  });
  process.on('uncaughtException', (err: Error) => {
    logger.error('Lỗi không được bắt: ' + err.message, { stack: err.stack });
    process.exit(1);
  });
}

// Chạy! Nếu khởi động thất bại thì báo lỗi rõ ràng rồi thoát.
bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error('KHỞI ĐỘNG THẤT BẠI: ' + message);
  process.exit(1);
});
