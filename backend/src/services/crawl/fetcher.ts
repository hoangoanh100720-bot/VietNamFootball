/**
 * ============================================================================
 * SERVICES/CRAWL/FETCHER.TS — TẢI TRANG WEB MỘT CÁCH LỊCH SỰ
 * ============================================================================
 *
 * Tải một trang web thì `axios.get(url)` là xong. Nhưng tải 50 trang mà không
 * có bốn thứ dưới đây thì bạn sẽ bị chặn IP trong vòng vài phút:
 *
 *   1. ⏱️  GIÃN NHỊP THEO TÊN MIỀN
 *      Nghỉ giữa hai request tới CÙNG một website. Quan trọng: nhịp tính
 *      riêng cho từng tên miền, nên cào xen kẽ hai báo khác nhau thì không
 *      phải chờ lẫn nhau — nhanh hơn nhiều mà vẫn lịch sự với cả hai.
 *
 *   2. 🪪  USER-AGENT TRUNG THỰC
 *      Khai đúng mình là bot, kèm cách liên hệ. Giả dạng trình duyệt Chrome
 *      là hành vi bị coi là gian dối; quản trị viên phát hiện sẽ chặn thẳng
 *      tay thay vì liên hệ với bạn.
 *
 *   3. 🔁  THỬ LẠI CÓ CHỪNG MỰC
 *      Lỗi 5xx / mất mạng thì thử lại với thời gian chờ tăng dần.
 *      Lỗi 4xx thì KHÔNG thử lại — 404 có thử một nghìn lần vẫn là 404.
 *
 *   4. 📏  CHẶN TRANG QUÁ LỚN
 *      Tránh một file 500MB nuốt sạch RAM của tiến trình.
 * ============================================================================
 */

import axios, { type AxiosResponse } from 'axios';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { getCrawlDelay } from './robots';

/** Kết quả tải một trang */
export interface FetchResult {
  url: string;
  /** URL cuối cùng sau khi đi hết các lần chuyển hướng (redirect) */
  finalUrl: string;
  status: number;
  contentType: string;
  /** Nội dung dạng chữ — chỉ có khi trang là HTML/text */
  html: string | null;
  /** Nội dung nhị phân — chỉ có khi là ảnh/PDF (để đưa sang OCR) */
  binary: Buffer | null;
}

/**
 * Lần cuối ta gọi tới từng tên miền.
 * Khoá là origin ("https://vff.org.vn"), giá trị là mốc thời gian ms.
 */
const lastRequestAt = new Map<string, number>();

/** Nghỉ đúng số mili-giây */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Chờ cho đủ khoảng nghỉ với tên miền này rồi mới cho đi tiếp.
 *
 * 🔬 CÁCH TÍNH: nếu đã 3 giây trôi qua kể từ lần gọi trước mà yêu cầu chỉ là
 * nghỉ 1,5 giây thì KHÔNG phải chờ thêm gì cả. Chỉ chờ đúng phần còn thiếu.
 * Ngủ cứng 1,5 giây mỗi lần sẽ làm cả phiên crawl chậm gấp đôi mà chẳng
 * lịch sự thêm chút nào.
 */
async function politeDelay(url: string): Promise<void> {
  const origin = new URL(url).origin;
  const delay = await getCrawlDelay(url);
  const last = lastRequestAt.get(origin) ?? 0;
  const waited = Date.now() - last;

  if (waited < delay) {
    await sleep(delay - waited);
  }
  lastRequestAt.set(origin, Date.now());
}

/** Tối đa 3 lần thử cho lỗi tạm thời */
const MAX_RETRIES = 3;

/** Trần dung lượng một trang: 10MB. Trang tin tức bình thường dưới 1MB. */
const MAX_CONTENT_BYTES = 10 * 1024 * 1024;

/**
 * ⭐ Tải một URL, đã lo sẵn phần lịch sự và thử lại.
 *
 * @returns FetchResult, hoặc null nếu thất bại hẳn sau mọi lần thử
 */
export async function fetchUrl(url: string): Promise<FetchResult | null> {
  await politeDelay(url);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response: AxiosResponse<ArrayBuffer> = await axios.get(url, {
        timeout: env.CRAWLER_TIMEOUT_MS,
        /**
         * 'arraybuffer' để nhận byte thô, xử lý được cả HTML lẫn ảnh/PDF
         * bằng cùng một hàm. Nếu để axios tự chuyển thành chuỗi, mọi file
         * nhị phân sẽ hỏng không cứu được.
         */
        responseType: 'arraybuffer',
        maxContentLength: MAX_CONTENT_BYTES,
        maxRedirects: 5,
        headers: {
          // Khai báo trung thực: ta là bot, và đây là cách liên hệ.
          'User-Agent': env.CRAWLER_USER_AGENT,
          // Ưu tiên nhận tiếng Việt khi trang có nhiều ngôn ngữ
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.5',
          Accept: 'text/html,application/xhtml+xml,application/pdf,image/*;q=0.8,*/*;q=0.5',
        },
        validateStatus: () => true, // tự xử lý mã trạng thái, không để axios ném lỗi
      });

      const status = response.status;
      const contentType = String(response.headers['content-type'] ?? '').toLowerCase();

      // --- Lỗi 4xx: sai từ phía ta hoặc trang không tồn tại -> đừng thử lại ---
      if (status >= 400 && status < 500) {
        logger.warn('[fetch] ' + status + ' ' + url + ' — bỏ qua, không thử lại.');
        return { url, finalUrl: url, status, contentType, html: null, binary: null };
      }

      // --- Lỗi 5xx: máy chủ đang trục trặc -> đáng để thử lại ---
      if (status >= 500) {
        throw new Error('Máy chủ trả về ' + status);
      }

      const buffer = Buffer.from(response.data);
      const isText = contentType.includes('text/') || contentType.includes('xml') || contentType.includes('json');

      return {
        url,
        // axios lưu URL cuối cùng sau redirect ở đây; không có thì dùng lại url gốc
        finalUrl: (response.request?.res?.responseUrl as string | undefined) ?? url,
        status,
        contentType,
        html: isText ? buffer.toString('utf8') : null,
        binary: isText ? null : buffer,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('[fetch] Lần ' + attempt + '/' + MAX_RETRIES + ' thất bại: ' + url + ' — ' + message);

      if (attempt < MAX_RETRIES) {
        /**
         * Chờ tăng dần: 2s -> 4s -> 8s (gọi là exponential backoff).
         * Thử lại ngay tức khắc chỉ làm máy chủ đang quá tải càng thêm nặng,
         * và làm bạn bị chặn nhanh hơn.
         */
        await sleep(2000 * Math.pow(2, attempt - 1));
      }
    }
  }

  logger.error('[fetch] Bỏ cuộc sau ' + MAX_RETRIES + ' lần thử: ' + url);
  return null;
}
