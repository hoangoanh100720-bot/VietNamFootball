/**
 * ============================================================================
 * SERVICES/NOTIFICATION.SERVICE.TS — GỬI THÔNG BÁO ĐẨY (Firebase Cloud Messaging)
 * ============================================================================
 *
 * ĐẨY (PUSH) KHÁC GÌ WEBSOCKET?
 *
 *   WebSocket : chỉ hoạt động khi app ĐANG MỞ. Đóng app là mất kết nối.
 *   Push (FCM): hoạt động kể cả khi app ĐÃ ĐÓNG HẲN, điện thoại đang khoá.
 *
 * Vì sao? Push không đi thẳng từ server ta tới máy người dùng. Nó đi qua
 * hạ tầng của Google/Apple — thứ luôn chạy nền sẵn trên mọi điện thoại:
 *
 *   Backend  ->  Firebase  ->  Google/Apple  ->  Điện thoại
 *                                                  (dù app đã đóng)
 *
 * Đó là lý do PHẢI có cả hai: WebSocket cho người đang xem trận,
 * Push cho người đang làm việc khác mà vẫn muốn biết khi có bàn thắng.
 *
 * ----------------------------------------------------------------------------
 * THIẾT KẾ "TẮT ĐƯỢC" (graceful degradation)
 *
 * Chưa cấu hình Firebase thì module này KHÔNG làm app sập. Nó chỉ ghi log
 * "lẽ ra sẽ gửi thông báo này" rồi đi tiếp. Nhờ vậy bạn phát triển và kiểm thử
 * toàn bộ luồng nghiệp vụ trước, chuyện Firebase để sau.
 */

/**
 * firebase-admin phiên bản 12 trở lên dùng kiểu import THEO MODULE CON:
 *   'firebase-admin/app'       -> khởi tạo ứng dụng
 *   'firebase-admin/messaging' -> gửi thông báo
 *
 * Cách import cũ (import admin from 'firebase-admin') vẫn chạy được nhưng
 * đã lỗi thời và không còn đầy đủ kiểu dữ liệu TypeScript.
 */
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type SendResponse } from 'firebase-admin/messaging';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { query } from '@/config/database';

let app: App | null = null;
let initAttempted = false;

/** Đã cấu hình đủ ba biến Firebase chưa? */
function isConfigured(): boolean {
  return Boolean(
    env.FCM_ENABLED &&
      env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY
  );
}

/**
 * Khởi tạo Firebase Admin. Chỉ chạy MỘT LẦN, lần gọi đầu tiên.
 */
function getFirebaseApp(): App | null {
  if (app) return app;
  if (initAttempted) return null; // đã thử và thất bại -> đừng thử lại mãi

  initAttempted = true;

  if (!isConfigured()) {
    logger.info('FCM chưa bật (thiếu FIREBASE_* hoặc FCM_ENABLED=false) — chỉ ghi log');
    return null;
  }

  try {
    /**
     * ⚠️ BẪY KINH ĐIỂN VỚI FIREBASE_PRIVATE_KEY
     *
     * File .env không lưu được ký tự xuống dòng thật, nên private key được
     * ghi dưới dạng chuỗi có "\n" (hai ký tự: gạch chéo và chữ n).
     * Firebase cần xuống dòng THẬT -> phải thay thế trước khi dùng.
     *
     * Quên dòng này là gặp lỗi "Failed to parse private key" rất khó hiểu.
     */
    const privateKey = env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

    // getApps() để không khởi tạo trùng nếu file này bị nạp lại (hot reload)
    app = getApps()[0] ?? initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });

    logger.info('Firebase Admin đã khởi tạo cho dự án ' + env.FIREBASE_PROJECT_ID);
    return app;
  } catch (err) {
    logger.error('Không khởi tạo được Firebase: ' + String(err));
    return null;
  }
}

export interface PushMessage {
  title: string;
  body: string;
  /**
   * Dữ liệu kèm theo — app dùng để biết bấm vào thông báo thì mở màn hình nào.
   * ⚠️ FCM chỉ nhận CHUỖI ở đây, số phải chuyển sang chuỗi trước.
   */
  data?: Record<string, string>;
}

/**
 * Gửi thông báo tới NHIỀU thiết bị cùng lúc.
 *
 * @returns số thiết bị nhận thành công
 */
export async function sendToTokens(tokens: string[], message: PushMessage): Promise<number> {
  if (tokens.length === 0) return 0;

  const firebase = getFirebaseApp();

  // ---- Chế độ chưa cấu hình: chỉ ghi log ----
  if (!firebase) {
    logger.info(
      `[PUSH - chế độ mô phỏng] "${message.title}" -> ${tokens.length} thiết bị: ${message.body}`
    );
    return 0;
  }

  try {
    /**
     * sendEachForMulticast gửi tối đa 500 token mỗi lần gọi.
     * Nhiều hơn thì phải chia lô — xử lý ngay bên dưới.
     */
    const BATCH_SIZE = 500;
    let successCount = 0;
    const invalidTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);

      const response = await getMessaging(firebase).sendEachForMulticast({
        tokens: batch,
        notification: { title: message.title, body: message.body },
        data: message.data,

        // Cấu hình riêng cho Android
        android: {
          priority: 'high', // bàn thắng là tin khẩn -> đánh thức máy ngay
          notification: {
            channelId: 'match-events',
            sound: 'default',
          },
        },

        // Cấu hình riêng cho iOS
        apns: {
          payload: {
            aps: { sound: 'default', badge: 1 },
          },
        },
      });

      successCount += response.successCount;

      /**
       * DỌN TOKEN CHẾT — bước rất hay bị bỏ quên.
       *
       * Người dùng gỡ app, cài lại, hoặc đổi máy -> token cũ không còn dùng được.
       * Không dọn thì bảng device_tokens phình mãi và mỗi lần gửi đều tốn công
       * cho những địa chỉ không tồn tại.
       */
      response.responses.forEach((res: SendResponse, index: number) => {
        if (res.success) return;

        const code = res.error?.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          const token = batch[index];
          if (token) invalidTokens.push(token);
        }
      });
    }

    if (invalidTokens.length > 0) {
      await removeInvalidTokens(invalidTokens);
    }

    logger.info(`Đã gửi push tới ${successCount}/${tokens.length} thiết bị`);
    return successCount;
  } catch (err) {
    // Push lỗi KHÔNG được làm hỏng nghiệp vụ chính (ghi nhận bàn thắng)
    logger.error('Gửi push thất bại: ' + String(err));
    return 0;
  }
}

/** Xoá các token đã chết khỏi database */
async function removeInvalidTokens(tokens: string[]): Promise<void> {
  // ANY($1) cho phép truyền cả MẢNG vào một tham số duy nhất —
  // gọn hơn nhiều so với việc tự ghép $1,$2,$3... theo số phần tử.
  await query('DELETE FROM device_tokens WHERE fcm_token = ANY($1)', [tokens]);
  logger.info(`Đã dọn ${tokens.length} token thiết bị không còn hiệu lực`);
}

/** Lấy toàn bộ token của những người dùng đã đăng ký nhận thông báo */
async function getAllActiveTokens(): Promise<string[]> {
  const { rows } = await query<{ fcm_token: string }>(
    `SELECT fcm_token FROM device_tokens
     -- Token quá 60 ngày không dùng thì coi như thiết bị đã bỏ
     WHERE last_used_at IS NULL OR last_used_at > NOW() - INTERVAL '60 days'`
  );
  return rows.map((r) => r.fcm_token);
}

// ---------------------------------------------------------------------------
// CÁC LOẠI THÔNG BÁO CỦA DỰ ÁN
// ---------------------------------------------------------------------------

/**
 * ⚽ THÔNG BÁO BÀN THẮNG — thông báo quan trọng nhất của app.
 *
 * Gọi từ livePoll.job.ts ngay khi phát hiện tỷ số thay đổi.
 */
export async function notifyGoal(params: {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  scorer: string | null;
  isVietnamGoal: boolean;
}): Promise<void> {
  const tokens = await getAllActiveTokens();
  if (tokens.length === 0) return;

  /**
   * Nội dung thông báo phải đọc lướt là hiểu, vì nó hiện trên màn hình khoá
   * chỉ trong vài giây:
   *
   *   ⚽ VÀO! Việt Nam 2-0 Indonesia
   *   Xuân Son ghi bàn ở phút 67
   */
  const title = params.isVietnamGoal
    ? `⚽ VÀO! ${params.homeTeam} ${params.homeScore}-${params.awayScore} ${params.awayTeam}`
    : `${params.homeTeam} ${params.homeScore}-${params.awayScore} ${params.awayTeam}`;

  const body = params.scorer
    ? `${params.scorer} ghi bàn ở phút ${params.minute}`
    : `Bàn thắng ở phút ${params.minute}`;

  await sendToTokens(tokens, {
    title,
    body,
    // Bấm vào thông báo -> app mở thẳng màn hình chi tiết trận này
    data: { type: 'goal', matchId: String(params.matchId) },
  });
}

/** 🏁 Thông báo trận kết thúc */
export async function notifyMatchFinished(params: {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}): Promise<void> {
  const tokens = await getAllActiveTokens();
  if (tokens.length === 0) return;

  await sendToTokens(tokens, {
    title: '🏁 Kết thúc trận đấu',
    body: `${params.homeTeam} ${params.homeScore} - ${params.awayScore} ${params.awayTeam}`,
    data: { type: 'match_finished', matchId: String(params.matchId) },
  });
}

/** ⏰ Nhắc trước giờ bóng lăn — dùng cho cron job sau này */
export async function notifyMatchStartingSoon(params: {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  minutesUntil: number;
}): Promise<void> {
  const tokens = await getAllActiveTokens();
  if (tokens.length === 0) return;

  await sendToTokens(tokens, {
    title: '⏰ Sắp đến giờ thi đấu',
    body: `${params.homeTeam} vs ${params.awayTeam} bắt đầu sau ${params.minutesUntil} phút`,
    data: { type: 'match_reminder', matchId: String(params.matchId) },
  });
}

/** Trạng thái cấu hình — để endpoint /health hoặc admin kiểm tra */
export function getNotificationStatus() {
  return {
    enabled: isConfigured(),
    project: env.FIREBASE_PROJECT_ID ?? null,
  };
}
