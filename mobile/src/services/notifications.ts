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
 * NHƯNG: **thông báo cục bộ (local notification) vẫn chạy tốt trong Expo Go.**
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
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from '@/api/client';

/**
 * CẤU HÌNH CÁCH HIỂN THỊ KHI APP ĐANG MỞ.
 *
 * Mặc định, hệ điều hành KHÔNG hiện thông báo nếu người dùng đang dùng app
 * (nó cho rằng bạn đã thấy rồi). Với app bóng đá thì ngược lại: đang xem
 * màn hình đội hình mà có bàn thắng thì RẤT cần được báo.
 */
Notifications.setNotificationHandler({
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
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('match-events', {
    name: 'Diễn biến trận đấu',
    description: 'Bàn thắng, thẻ phạt và kết quả trận đấu',
    importance: Notifications.AndroidImportance.HIGH, // hiện dải + có âm thanh
    vibrationPattern: [0, 250, 250, 250], // chờ 0ms, rung 250, nghỉ 250, rung 250
    lightColor: '#DA251D', // màu đèn LED báo (máy nào có)
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
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap(response.notification.request.content.data ?? {});
  });

  return () => subscription.remove();
}
