/**
 * ============================================================================
 * APP.TS — LẮP RÁP ỨNG DỤNG EXPRESS
 * ============================================================================
 *
 * VÌ SAO TÁCH app.ts VÀ server.ts?
 *   app.ts    : chỉ định nghĩa "ứng dụng" (middleware + route), KHÔNG mở cổng.
 *   server.ts : mới thực sự listen(PORT), gắn Socket.IO, cron...
 * Nhờ tách ra, file test có thể import app và gọi thẳng, không cần mở cổng.
 *
 * THỨ TỰ MIDDLEWARE RẤT QUAN TRỌNG — chạy từ trên xuống dưới:
 *   1. helmet      : gắn header bảo mật (phải sớm nhất)
 *   2. cors        : cho phép app mobile gọi vào
 *   3. body parser : đọc JSON trong request
 *   4. logger      : ghi lại request
 *   5. rate limit  : chặn spam
 *   6. ROUTES      : xử lý nghiệp vụ
 *   7. notFound    : không route nào khớp
 *   8. errorHandler: cuối cùng, bắt mọi lỗi
 */

import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { corsOrigins, env } from '@/config/env';
import { requestLogger } from '@/middlewares/requestLogger.middleware';
import { generalLimiter } from '@/middlewares/rateLimit.middleware';
import { errorHandler, notFoundHandler } from '@/middlewares/error.middleware';
import { sendSuccess } from '@/utils/apiResponse';
import { apiRouter } from '@/routes';

export function createApp(): Application {
  const app = express();

  /* --------------------------------------------------------------------
   * 1. HELMET — bộ header bảo mật
   * Tự động thêm: X-Content-Type-Options, X-Frame-Options, HSTS...
   * Tắt CSP vì API JSON không trả HTML, bật lên chỉ gây phiền.
   * ------------------------------------------------------------------ */
  app.use(helmet({ contentSecurityPolicy: false }));

  /* --------------------------------------------------------------------
   * 2. CORS — Cross-Origin Resource Sharing
   * Trình duyệt chặn website A gọi API ở domain B trừ khi B cho phép.
   * App mobile (native) không bị chặn, nhưng Expo Web thì có.
   * ------------------------------------------------------------------ */
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  /* --------------------------------------------------------------------
   * 3. BODY PARSER — biến chuỗi JSON trong request thành object JS
   * limit '1mb' để chặn kẻ xấu gửi payload khổng lồ làm sập RAM.
   * ------------------------------------------------------------------ */
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  /* --------------------------------------------------------------------
   * 4. Tin tưởng proxy (Nginx / Railway / Render)
   * Không có dòng này, rate-limit sẽ thấy MỌI request đến từ cùng 1 IP
   * (IP của proxy) và chặn nhầm toàn bộ người dùng.
   * ------------------------------------------------------------------ */
  app.set('trust proxy', 1);

  /* ---------------------- 5. LOG & RATE LIMIT ----------------------- */
  app.use(requestLogger);
  app.use(env.API_PREFIX, generalLimiter);

  /* --------------------------------------------------------------------
   * 6. HEALTH CHECK — endpoint kiểm tra server còn sống
   * Đặt NGOÀI /api/v1 và ngoài rate-limit để dịch vụ giám sát
   * (Railway, UptimeRobot) ping liên tục không bị chặn.
   * ------------------------------------------------------------------ */
  app.get('/health', (_req, res) => {
    sendSuccess(res, {
      status: 'ok',
      app: env.APP_NAME,
      env: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  /* ------------------------- 7. ROUTES CHÍNH ------------------------ */
  app.use(env.API_PREFIX, apiRouter);

  /* ------------------ 8. BẮT LỖI (luôn ở cuối cùng) ----------------- */
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
