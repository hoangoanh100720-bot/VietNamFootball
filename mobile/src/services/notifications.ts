/**
 * ============================================================================
 * SERVICES/NOTIFICATIONS.TS — THÔNG BÁO PHÍA APP
 * ============================================================================
 *
 * ⚠️ ĐỌC KỸ PHẦN NÀY TRƯỚC KHI THỬ — GIỚI HẠN CỦA EXPO GO
 *
 * Từ SDK 53, **Expo Go KHÔNG nhận được thông báo đẩy từ xa (remote push)** nữa.
 * Muốn dùng push thật, bạn phải tạo "development build":
 *
 *   npx expo install expo-dev-client
 *   npx eas build --profile development --platform android
 *
 * Thông báo CỤC BỘ (local notification) vẫn chạy trong Expo Go trên iOS.
 *
 * ⚠️ RIÊNG ANDROID + EXPO GO: chỉ cần IMPORT expo-notifications là app SẬP
 * ngay khi mở ("Uncaught Error: expo-notifications: Android Push notifications
 * ... was removed from Expo Go"). Đã gặp thật khi chạy trên máy ảo Android.
 * Vì vậy module được nạp CÓ ĐIỀU KIỆN (xem ngay dưới phần import) — trong Expo
 * Go Android mọi hàm ở file này trả về lý do rõ ràng thay vì làm sập app.
 * Trên bản development build / bản phát hành thì mọi thứ chạy đầy đủ.
 *
 * Vì vậy app này làm hai lớp, bạn thấy kết quả ngay hôm nay:
 *
 *   Lớp 1 — LOCAL (chạy được ngay, kể cả Expo Go)
 *           App đang mở, nhận sự kiện bàn thắng qua WebSocket
 *           -> tự bắn một thông báo lên đầu màn hình.
 *
 *   Lớp 2 — REMOTE (cần development build + Firebase)
 *           App đã đóng hẳn -> Firebase đẩy thông báo tới máy.
 *
 * ----------------------------------------------------------------------------
 * BA BƯỚC BẮT BUỘC CỦA MỌI HỆ THỐNG THÔNG BÁO:
 *
 *   1. XIN QUYỀN     — người dùng phải đồng ý, không ai được ép
 *   2. LẤY TOKEN     — "địa chỉ" của máy này
 *   3. GỬI LÊN SERVER — để backend biết gửi cho ai
 */

import { Platform } from 'react-native';
import { staticColors } from '@/theme/colors';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { api } from '@/api/client';

/**
 * ⭐ NẠP expo-notifications CÓ ĐIỀU KIỆN — KHÔNG DÙNG "import" TĨNH.
 *
 * "import * as Notifications from 'expo-notifications'" chạy mã khởi tạo của
 * module NGAY LÚC NẠP FILE. Trong Expo Go trên Android (từ SDK 53), mã khởi tạo
 * đó NÉM LỖI — và vì file này được nạp từ app/_layout.tsx, cả app sập ngay màn
 * hình đầu tiên, trước khi người dùng kịp thấy gì.
 *
 * require() đặt sau một câu điều kiện thì chỉ chạy khi điều kiện đúng. Metro
 * vẫn đóng gói module vào bundle, nhưng KHÔNG thực thi nó trong Expo Go Android.
 *
 *   ExecutionEnvironment.StoreClient = đang chạy bên trong app Expo Go
 *   ExecutionEnvironment.Bare / Standalone = development build / bản phát hành
 */
type NotificationsModule = typeof import('expo-notifications');

const IS_EXPO_GO_ANDROID =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Notifications: NotificationsModule | null = IS_EXPO_GO_ANDROID ? null : require('expo-notifications');

/** Lời giải thích dùng chung khi thông báo không khả dụng */
const EXPO_GO_ANDROID_REASON =
  'Expo Go trên Android không hỗ trợ thông báo. Các tính năng khác của app vẫn dùng bình thường; ' +
  'muốn thử thông báo hãy dùng bản development build.';

/**
 * CẤU HÌNH CÁCH HIỂN THỊ KHI APP ĐANG MỞ.
 *
 * Mặc định, hệ điều hành KHÔNG hiện thông báo nếu người dùng đang dùng app
 * (nó cho rằng bạn đã thấy rồi). Với app bóng đá thì ngược lại: đang xem
 * màn hình đội hình mà có bàn thắng thì RẤT cần được báo.
 */
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,  // hiện dải thông báo ở đầu màn hình
    shouldShowList: true,    // lưu vào trung tâm thông báo
    shouldPlaySound: true,
    shouldSetBadge: false,   // không hiện số đỏ trên icon app — dễ gây phiền
  }),
});

/**
 * Tạo "kênh thông báo" cho Android.
 *
 * KÊNH LÀ GÌ? Từ Android 8 trở lên, mọi thông báo phải thuộc về một kênh.
 * Người dùng có thể tắt riêng từng kênh trong Cài đặt — ví dụ giữ lại
 * thông báo bàn thắng nhưng tắt thông báo khuyến mãi.
 *
 * Không tạo kênh thì trên Android thông báo sẽ KHÔNG hiện ra, mà cũng
 * không báo lỗi gì — rất khó tìm nguyên nhân.
 */
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || !Notifications) return;

  await Notifications.setNotificationChannelAsync('match-events', {
    name: 'Diễn biến trận đấu',
    description: 'Bàn thắng, thẻ phạt và kết quả trận đấu',
    importance: Notifications.AndroidImportance.HIGH, // hiện dải + có âm thanh
    vibrationPattern: [0, 250, 250, 250], // chờ 0ms, rung 250, nghỉ 250, rung 250
    // Màu đèn LED báo (máy nào còn có đèn). Lấy từ token thay vì viết mã màu
    // thô: đổi nhận diện thương hiệu thì đèn báo cũng đổi theo, không sót chỗ này.
    lightColor: staticColors.decor.flagRed,
    sound: 'default',
  });
}

export interface PushRegistration {
  token: string | null;
  granted: boolean;
  /** Lý do không lấy được token — để hiển thị cho người dùng hiểu */
  reason?: string;
}

/**
 * XIN QUYỀN VÀ LẤY TOKEN ĐẨY.
 *
 * Trả về token nếu thành công, hoặc lý do thất bại.
 */
export async function registerForPushNotifications(): Promise<PushRegistration> {
  if (!Notifications) return { token: null, granted: false, reason: EXPO_GO_ANDROID_REASON };

  // Bước 0: tạo kênh Android trước khi xin quyền
  await setupAndroidChannel();

  /**
   * Máy ảo không có dịch vụ đẩy của Google/Apple -> không lấy được token thật.
   * Kiểm tra sớm để báo lý do rõ ràng thay vì lỗi khó hiểu.
   */
  if (!Device.isDevice) {
    return {
      token: null,
      granted: false,
      reason: 'Thông báo đẩy chỉ hoạt động trên máy thật, không chạy trên máy ảo.',
    };
  }

  // ---- Bước 1: xin quyền ----
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  /**
   * CHỈ hỏi khi CHƯA từng hỏi.
   *
   * Trên iOS, hộp thoại xin quyền chỉ hiện ĐÚNG MỘT LẦN trong đời app.
   * Người dùng bấm "Không cho phép" là vĩnh viễn không hỏi lại được nữa —
   * họ phải tự vào Cài đặt để bật.
   * Vì vậy hãy xin quyền ĐÚNG LÚC (khi họ vừa bật một tính năng cần nó),
   * đừng hỏi ngay khi mở app lần đầu.
   */
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return {
      token: null,
      granted: false,
      reason: 'Bạn chưa cho phép gửi thông báo. Vào Cài đặt > Thông báo để bật lại.',
    };
  }

  // ---- Bước 2: lấy token ----
  try {
    /**
     * projectId lấy từ app.json (phần extra.eas.projectId, do EAS sinh ra).
     * Chưa chạy `eas init` thì chưa có — lúc đó chỉ dùng được local notification.
     */
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      return {
        token: null,
        granted: true, // đã có quyền, chỉ thiếu cấu hình dự án
        reason:
          'Chưa cấu hình EAS project. Thông báo trong app vẫn hoạt động, ' +
          'nhưng cần chạy "eas init" để nhận thông báo khi đã đóng app.',
      };
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: tokenResponse.data, granted: true };
  } catch (err) {
    return {
      token: null,
      granted: true,
      reason: err instanceof Error ? err.message : 'Không lấy được token thiết bị',
    };
  }
}

/**
 * GỬI TOKEN LÊN BACKEND.
 *
 * Chỉ gọi khi người dùng ĐÃ đăng nhập — endpoint này yêu cầu xác thực
 * (backend cần biết token thuộc về ai).
 */
export async function sendTokenToServer(token: string): Promise<boolean> {
  try {
    await api.post('/devices/token', {
      fcmToken: token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    });
    return true;
  } catch {
    // Không đăng ký được thì thôi, KHÔNG làm phiền người dùng bằng thông báo lỗi.
    // Thông báo đẩy là tính năng phụ, hỏng cũng không ảnh hưởng việc xem app.
    return false;
  }
}

/** Huỷ đăng ký khi người dùng đăng xuất hoặc tắt thông báo */
export async function removeTokenFromServer(token: string): Promise<void> {
  try {
    await api.delete('/devices/token', { data: { fcmToken: token } });
  } catch {
    // Bỏ qua — token chết rồi backend cũng tự dọn khi gửi thất bại
  }
}

/**
 * BẮN MỘT THÔNG BÁO CỤC BỘ NGAY LẬP TỨC.
 *
 * ⭐ Đây là thứ chạy được NGAY trong Expo Go, không cần Firebase.
 * useLiveScore sẽ gọi hàm này mỗi khi WebSocket báo có bàn thắng.
 *
 * @param trigger null nghĩa là "hiện ngay lập tức"
 */
export async function showLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!Notifications) return; // Expo Go Android: im lặng bỏ qua, không làm gián đoạn việc xem trận
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data ?? {},
        sound: 'default',
      },
      trigger: null,
    });
  } catch {
    // Thông báo lỗi không được làm gián đoạn việc xem trận
  }
}

/**
 * LẮNG NGHE NGƯỜI DÙNG BẤM VÀO THÔNG BÁO.
 *
 * Bấm vào "⚽ VÀO! Việt Nam 2-0 Indonesia" thì phải mở đúng màn hình trận đó,
 * không phải mở màn hình chính rồi bắt họ tự tìm.
 *
 * @returns hàm huỷ lắng nghe — NHỚ gọi khi component bị gỡ
 */
export function addNotificationTapListener(
  onTap: (data: Record<string, unknown>) => void
): () => void {
  if (!Notifications) return () => {}; // không có module -> không có gì để lắng nghe hay huỷ
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap(response.notification.request.content.data ?? {});
  });

  return () => subscription.remove();
}

/**
 * ============================================================================
 * ⭐ NHẮC TRƯỚC GIỜ ĐÁ — nút "NHẮC TÔI TRƯỚC GIỜ ĐÁ" của Senior mode (mục 7.3)
 * ============================================================================
 *
 * Hẹn một thông báo CỤC BỘ trên máy, 30 phút trước giờ bóng lăn.
 *
 * ⚠️ VÌ SAO CỤC BỘ mà không nhờ server gửi thông báo đẩy?
 *   • Chạy được khi KHÔNG đăng nhập và khi máy không có token đẩy (máy ảo,
 *     người dùng tắt dịch vụ Google) — đúng nhóm người lớn tuổi hay gặp.
 *   • Chạy được cả khi mất mạng lúc tới giờ: lịch nằm sẵn trên máy.
 *
 * ⚠️ XIN QUYỀN ĐÚNG LÚC: hàm này là nơi đầu tiên hỏi quyền thông báo — ngay
 * khi người dùng vừa CHỦ ĐỘNG bấm "nhắc tôi". Lúc đó họ hiểu vì sao app cần
 * quyền, nên tỷ lệ đồng ý cao hơn hẳn so với hỏi lúc vừa mở app.
 *
 * @returns thông điệp tiếng Việt để hiện cho người dùng (thành công hay lý do thất bại)
 */
export async function scheduleKickoffReminder(params: {
  matchId: number;
  homeName: string;
  awayName: string;
  kickoffAt: string;
  channels?: string[];
}): Promise<{ ok: boolean; message: string }> {
  const REMIND_BEFORE_MS = 30 * 60 * 1000;
  const fireAt = new Date(new Date(params.kickoffAt).getTime() - REMIND_BEFORE_MS);

  if (fireAt.getTime() <= Date.now()) {
    return { ok: false, message: 'Trận đấu sắp bắt đầu rồi, không kịp đặt lời nhắc nữa.' };
  }

  if (!Notifications) return { ok: false, message: EXPO_GO_ANDROID_REASON };

  try {
    await setupAndroidChannel();

    const { status } = await Notifications.getPermissionsAsync();
    const granted = status === 'granted' || (await Notifications.requestPermissionsAsync()).status === 'granted';
    if (!granted) {
      return {
        ok: false,
        message: 'App chưa được phép gửi thông báo. Bạn vào Cài đặt của điện thoại để bật cho app nhé.',
      };
    }

    /**
     * Mã định danh CỐ ĐỊNH theo trận: bấm "nhắc tôi" hai lần thì lần sau GHI
     * ĐÈ lần trước, chứ không tạo ra hai thông báo giống hệt nhau cùng lúc.
     */
    const identifier = `kickoff-${params.matchId}`;
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);

    const channelText = params.channels && params.channels.length > 0 ? ` Xem trên ${params.channels.join(' và ')}.` : '';

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        // Câu RÕ NGHĨA, không viết tắt "VIE-THA 19:30" (mục 7.4)
        title: 'Còn 30 phút nữa đội tuyển ra sân!',
        body: `${params.homeName} gặp ${params.awayName}.${channelText}`,
        data: { matchId: String(params.matchId) },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });

    const hh = fireAt.getHours();
    const mm = String(fireAt.getMinutes()).padStart(2, '0');
    return { ok: true, message: `Đã đặt lời nhắc lúc ${hh} giờ ${mm}.` };
  } catch {
    // Bản web không hỗ trợ hẹn thông báo -> báo rõ thay vì im lặng
    return { ok: false, message: 'Thiết bị này chưa hỗ trợ đặt lời nhắc.' };
  }
}
