/**
 * ============================================================================
 * UTILS/CACHE.TS — BỘ NHỚ ĐỆM (Redis, tự động lùi về RAM)
 * ============================================================================
 *
 * CACHE LÀ GÌ VÀ VÌ SAO CẦN?
 * Tỷ số live được 10.000 người xem cùng lúc. Nếu mỗi người là một câu truy vấn
 * database thì DB gục ngay. Cache giữ kết quả trong bộ nhớ:
 *
 *   Request 1  -> không có trong cache -> hỏi DB (20ms) -> lưu cache
 *   Request 2..N -> có trong cache -> trả về (0.1ms)      -> DB nghỉ ngơi
 *
 * TTL (Time To Live) = thời gian sống. Hết TTL, dữ liệu tự biến mất và lần
 * hỏi tiếp theo sẽ lấy bản mới. Đây là cách cân bằng giữa NHANH và TƯƠI:
 *   - Tỷ số live : TTL 15 giây  (phải tươi)
 *   - Đội hình   : TTL 24 giờ   (cả ngày mới đổi một lần)
 *   - Dự đoán AI : TTL 6 giờ    (gọi lại tốn tiền)
 *
 * THIẾT KẾ HAI TẦNG:
 *   - Có REDIS_URL  -> dùng Redis (nhiều server dùng chung một cache)
 *   - Không có      -> dùng Map trong RAM (đủ tốt khi học và khi chỉ 1 server)
 * Code gọi cache KHÔNG cần biết đang chạy tầng nào.
 */

import { createClient, type RedisClientType } from 'redis';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

let redis: RedisClientType | null = null;

/** Cache dự phòng trong RAM: key -> { giá trị, thời điểm hết hạn } */
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

/**
 * Dọn rác định kỳ cho cache RAM.
 * Map không tự xoá phần tử hết hạn -> không dọn thì RAM phình dần.
 * .unref() để timer này không giữ tiến trình Node sống mãi khi tắt server.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryStore) {
    if (item.expiresAt <= now) memoryStore.delete(key);
  }
}, 60_000).unref();

/** Kết nối Redis nếu có cấu hình. Gọi lúc server khởi động. */
export async function connectCache(): Promise<void> {
  if (!env.REDIS_URL) {
    logger.info('Không cấu hình REDIS_URL — dùng cache trong RAM');
    return;
  }

  try {
    redis = createClient({ url: env.REDIS_URL });
    redis.on('error', (err: Error) => logger.error('Redis lỗi: ' + err.message));
    await redis.connect();
    logger.info('Redis đã kết nối');
  } catch (err) {
    // Redis hỏng KHÔNG được làm sập app — cache chỉ là tối ưu, không bắt buộc.
    logger.warn('Không kết nối được Redis, lùi về cache RAM: ' + String(err));
    redis = null;
  }
}

/**
 * Đọc từ cache.
 * @returns giá trị đã parse JSON, hoặc null nếu không có / hết hạn
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (redis) {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }

    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return JSON.parse(item.value) as T;
  } catch (err) {
    logger.warn('Đọc cache lỗi (bỏ qua): ' + String(err));
    return null; // Lỗi cache -> coi như không có, đi hỏi DB
  }
}

/** Ghi vào cache với thời gian sống ttlSeconds */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const raw = JSON.stringify(value);

    if (redis) {
      // EX = expire, đơn vị giây
      await redis.set(key, raw, { EX: ttlSeconds });
      return;
    }
    memoryStore.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  } catch (err) {
    logger.warn('Ghi cache lỗi (bỏ qua): ' + String(err));
  }
}

/**
 * Xoá cache theo mẫu, ví dụ cacheDel('match:*').
 * Gọi khi dữ liệu thay đổi để người dùng không thấy thông tin cũ
 * (thao tác này gọi là "invalidate cache").
 */
export async function cacheDel(pattern: string): Promise<void> {
  try {
    if (redis) {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(keys);
      return;
    }

    // Chuyển mẫu "match:*" thành biểu thức chính quy ^match:.*$
    const regex = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    for (const key of memoryStore.keys()) {
      if (regex.test(key)) memoryStore.delete(key);
    }
  } catch (err) {
    logger.warn('Xoá cache lỗi (bỏ qua): ' + String(err));
  }
}

/**
 * MẪU THIẾT KẾ "cache-aside" — dùng nhiều nhất trong dự án này.
 *
 *   const matches = await cached('matches:upcoming', 300, async () => {
 *     return query('SELECT ...');       // chỉ chạy khi cache trống
 *   });
 *
 * Đọc là: "lấy từ cache, nếu chưa có thì chạy hàm này rồi nhớ kết quả 300 giây".
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;

  const fresh = await producer();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

/** Đóng kết nối Redis khi tắt server */
export async function closeCache(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Đã đóng Redis');
  }
  memoryStore.clear();
}
