/**
 * ============================================================================
 * STORE/AUTHSTORE.TS — TRẠNG THÁI ĐĂNG NHẬP TOÀN APP (Zustand)
 * ============================================================================
 *
 * VÌ SAO CẦN "STORE"?
 * Thông tin "ai đang đăng nhập" cần dùng ở rất nhiều nơi: thanh tab, màn hình
 * hồ sơ, nút đăng xuất... Truyền props qua từng tầng thì rối.
 *
 * ZUSTAND vs REDUX: Zustand làm được việc tương tự với ~10% lượng code.
 * Không cần action, reducer, dispatch — chỉ cần một object có state và hàm.
 *
 * CÁCH DÙNG TRONG COMPONENT:
 *
 *   // Lấy đúng thứ cần -> component chỉ render lại khi CHÍNH thứ đó đổi
 *   const user = useAuthStore((s) => s.user);
 *   const login = useAuthStore((s) => s.login);
 *
 *   ❌ TRÁNH: const { user, login } = useAuthStore();
 *      Cách này khiến component render lại mỗi khi BẤT KỲ trường nào đổi.
 */

import { create } from 'zustand';
import { authApi } from '@/api/endpoints';
import { setSessionExpiredHandler } from '@/api/client';
import { clearAuth, getRefreshToken, getUser, saveTokens, saveUser } from '@/services/secureStore';
import type { User } from '@/types';

interface AuthState {
  // ----- Dữ liệu -----
  user: User | null;
  isAuthenticated: boolean;
  /** true khi app vừa mở, đang đọc token từ bộ nhớ máy */
  isLoading: boolean;
  /** true khi đang gửi request đăng nhập/đăng ký */
  isSubmitting: boolean;
  error: string | null;

  // ----- Hành động -----
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // ⭐ bắt đầu là true: chưa biết đã đăng nhập hay chưa
  isSubmitting: false,
  error: null,

  /**
   * KHỞI ĐỘNG — gọi MỘT LẦN khi app mở.
   *
   * Nhiệm vụ: đọc token đã lưu trong máy để người dùng KHÔNG phải đăng nhập lại
   * mỗi lần mở app.
   *
   * Chiến lược "hiển thị trước, xác minh sau":
   *   1. Có hồ sơ lưu sẵn -> hiện ngay lập tức (app mở tức thì, không chờ mạng)
   *   2. Song song, gọi /auth/me để kiểm chứng token còn dùng được không
   *   3. Token hỏng -> mới đăng xuất
   */
  bootstrap: async () => {
    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      // Bước 1: hiện hồ sơ đã lưu (nếu có)
      const cachedUser = await getUser<User>();
      if (cachedUser) {
        set({ user: cachedUser, isAuthenticated: true });
      }

      // Bước 2: xác minh với server
      // (interceptor sẽ tự làm mới access token nếu nó đã hết hạn)
      const { user } = await authApi.me();
      await saveUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      // Token không dùng được nữa -> dọn sạch, coi như chưa đăng nhập
      await clearAuth();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  /** ĐĂNG NHẬP. Trả về true nếu thành công. */
  login: async (email, password) => {
    set({ isSubmitting: true, error: null });

    try {
      const { user, tokens } = await authApi.login({ email, password });

      // Lưu token TRƯỚC khi cập nhật state: bảo đảm request tiếp theo
      // đã có token sẵn trong kho
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      await saveUser(user);

      set({ user, isAuthenticated: true, isSubmitting: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Đăng nhập thất bại',
        isSubmitting: false,
      });
      return false;
    }
  },

  /** ĐĂNG KÝ — backend trả luôn token nên đăng ký xong là vào thẳng app */
  register: async (email, password, fullName) => {
    set({ isSubmitting: true, error: null });

    try {
      const { user, tokens } = await authApi.register({
        email,
        password,
        full_name: fullName,
      });

      await saveTokens(tokens.accessToken, tokens.refreshToken);
      await saveUser(user);

      set({ user, isAuthenticated: true, isSubmitting: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Đăng ký thất bại',
        isSubmitting: false,
      });
      return false;
    }
  },

  /**
   * ĐĂNG XUẤT.
   * Gọi API để backend THU HỒI refresh token (quan trọng: nếu chỉ xoá ở máy,
   * token vẫn còn hiệu lực trên server tới 7 ngày).
   * Nhưng dù API lỗi thì VẪN phải xoá dữ liệu ở máy.
   */
  logout: async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Mất mạng cũng không sao — vẫn đăng xuất ở phía máy
    } finally {
      await clearAuth();
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  clearError: () => set({ error: null }),
}));

/**
 * KẾT NỐI HAI CHIỀU VỚI TẦNG API.
 *
 * Khi interceptor phát hiện refresh token đã chết, nó gọi hàm này để store
 * cập nhật giao diện (đẩy người dùng về màn hình đăng nhập).
 *
 * Đây là cách tránh "phụ thuộc vòng tròn": client.ts không import store,
 * mà store chủ động đưa hàm xuống cho client.ts.
 */
setSessionExpiredHandler(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});
