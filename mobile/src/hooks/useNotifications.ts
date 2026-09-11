/**
 * ============================================================================
 * HOOKS/USENOTIFICATIONS.TS — GẮN THÔNG BÁO VÀO VÒNG ĐỜI APP
 * ============================================================================
 *
 * Hook này gọi MỘT LẦN ở app/_layout.tsx. Nó lo hai việc:
 *
 *   1. Khi người dùng ĐĂNG NHẬP  -> xin quyền, lấy token, gửi lên backend
 *   2. Khi người dùng BẤM thông báo -> mở đúng màn hình liên quan
 *
 * ----------------------------------------------------------------------------
 * VÌ SAO CHỜ ĐĂNG NHẬP MỚI XIN QUYỀN?
 *
 * Hộp thoại xin quyền trên iOS chỉ hiện ĐÚNG MỘT LẦN trong đời app.
 * Bật lên ngay giây đầu tiên mở app, khi người dùng còn chưa biết app làm gì,
 * thì đa số sẽ bấm "Không cho phép" — và mất luôn cơ hội.
 *
 * Xin quyền SAU khi họ đã đăng nhập thì họ đã hiểu giá trị của app,
 * tỷ lệ đồng ý cao hơn hẳn. Đây gọi là "xin quyền đúng ngữ cảnh".
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import {
  addNotificationTapListener,
  registerForPushNotifications,
  sendTokenToServer,
} from '@/services/notifications';

export function useNotifications() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  /**
   * Cờ chống đăng ký lặp. Nếu không có nó, mỗi lần state đổi là lại
   * xin quyền và gửi token một lần nữa — tốn request vô ích.
   * Dùng useRef vì giá trị này KHÔNG cần làm giao diện vẽ lại.
   */
  const hasRegistered = useRef(false);

  // -------------------------------------------------------------------
  // 1. ĐĂNG KÝ NHẬN THÔNG BÁO
  // -------------------------------------------------------------------
  useEffect(() => {
    // Chưa đăng nhập hoặc đã đăng ký rồi -> bỏ qua
    if (!isAuthenticated || hasRegistered.current) return;

    hasRegistered.current = true;

    void (async () => {
      const result = await registerForPushNotifications();

      if (result.token) {
        await sendTokenToServer(result.token);
        if (__DEV__) console.log('[push] đã đăng ký thiết bị thành công');
      } else if (__DEV__) {
        // Chỉ log khi đang phát triển. KHÔNG hiện hộp thoại làm phiền
        // người dùng — họ có quyền từ chối thông báo.
        console.log('[push] không đăng ký được:', result.reason);
      }
    })();
  }, [isAuthenticated]);

  /** Đăng xuất rồi đăng nhập lại thì cho phép đăng ký lại */
  useEffect(() => {
    if (!isAuthenticated) hasRegistered.current = false;
  }, [isAuthenticated]);

  // -------------------------------------------------------------------
  // 2. XỬ LÝ KHI BẤM VÀO THÔNG BÁO
  // -------------------------------------------------------------------
  useEffect(() => {
    /**
     * Backend gửi kèm data: { type: 'goal', matchId: '12' }
     * Ta dựa vào đó để điều hướng.
     *
     * ⚠️ Mọi giá trị trong data đều là CHUỖI (giới hạn của FCM),
     * nên phải kiểm tra kiểu cẩn thận trước khi dùng.
     */
    const unsubscribe = addNotificationTapListener((data) => {
      const matchId = data.matchId;

      if (typeof matchId === 'string' && /^\d+$/.test(matchId)) {
        router.push(`/match/${matchId}`);
      }
    });

    // ⭐ DỌN DẸP: gỡ trình lắng nghe khi app đóng
    return unsubscribe;
  }, [router]);
}
