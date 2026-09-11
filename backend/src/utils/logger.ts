/**
 * ============================================================================
 * UTILS/LOGGER.TS — NHẬT KÝ HỆ THỐNG (winston)
 * ============================================================================
 *
 * VÌ SAO KHÔNG DÙNG console.log?
 *   - console.log không có MỨC ĐỘ (lỗi nghiêm trọng hay chỉ thông tin?)
 *   - Không có thời gian, không ghi ra file -> server restart là mất sạch
 *   - Không tắt được ở production -> log rác + lộ thông tin nhạy cảm
 *
 * 5 mức độ dùng trong dự án này (nặng -> nhẹ):
 *   error  : hỏng thật, cần sửa ngay      (DB mất kết nối)
 *   warn   : bất thường nhưng vẫn chạy    (Gemini timeout, dùng cache cũ)
 *   info   : sự kiện quan trọng           (server khởi động, cron chạy xong)
 *   http   : mỗi request đi vào           (GET /api/v1/matches 200 12ms)
 *   debug  : chi tiết khi dev             (nội dung prompt gửi Gemini)
 */

import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import { env, isDev } from '@/config/env';

// Tạo thư mục logs nếu chưa có (winston không tự tạo)
const logDir = path.resolve(process.cwd(), env.LOG_DIR);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

// Gắn màu cho mức "http" (winston không biết mức tự chế)
winston.addColors({ error: 'red', warn: 'yellow', info: 'green', http: 'cyan', debug: 'gray' });

/** Định dạng đẹp, có màu — dùng khi xem trực tiếp trên terminal */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ level: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    // Nếu có dữ liệu kèm theo (vd: { userId: 3 }) thì in ra phía sau
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return timestamp + ' ' + level + ' ' + String(message) + extra;
  })
);

/** Định dạng JSON — máy đọc được, dùng cho file log và dịch vụ giám sát */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }), // giữ lại stack trace của Error
  winston.format.json()
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  // Mức tuỳ chỉnh: thêm "http" nằm giữa info và debug
  levels: { error: 0, warn: 1, info: 2, http: 3, debug: 4 },
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    // Tất cả log
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB thì xoay vòng sang file mới
      maxFiles: 5,
    }),
    // Chỉ lỗi — để đọc nhanh khi có sự cố
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

/**
 * QUY TẮC BẢO MẬT: KHÔNG BAO GIỜ log password, token, API key.
 * Hàm này che bớt các trường nhạy cảm trước khi ghi log.
 */
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apikey', 'authorization'];

export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(clone)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) clone[key] = '***';
  }
  return clone;
}

if (isDev) logger.debug('Logger khởi tạo ở chế độ development');
