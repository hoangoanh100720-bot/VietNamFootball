/**
 * ============================================================================
 * STORE/SETTINGSSTORE.TS — CÀI ĐẶT NGƯỜI DÙNG (lưu trên máy)
 * ============================================================================
 *
 * Giữ những lựa chọn cá nhân KHÔNG cần tài khoản: chế độ sáng/tối, giao diện
 * người lớn tuổi. Chúng thuộc về CHIẾC MÁY chứ không thuộc về tài khoản —
 * ông dùng senior mode trên máy ông, không liên quan tới máy con cháu.
 *
 * ----------------------------------------------------------------------------
 * 💾 VÌ SAO DÙNG AsyncStorage MÀ KHÔNG DÙNG SecureStore?
 *
 *   SecureStore  — két sắt có mã hoá, CHẬM, dung lượng nhỏ. Dành cho TOKEN.
 *   AsyncStorage — ngăn kéo thường, nhanh, không giới hạn. Dành cho cài đặt.
 *
 * Cỡ chữ của người dùng không phải bí mật cần mã hoá. Nhét nó vào két sắt chỉ
 * làm app khởi động chậm đi mà chẳng an toàn thêm chút nào.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ ĐỌC TỪ Ổ ĐĨA LÀ THAO TÁC BẤT ĐỒNG BỘ — VÀ ĐÓ LÀ CẢ MỘT VẤN ĐỀ
 *
 * Lúc app vừa mở, ta CHƯA biết người dùng có bật senior mode hay không.
 * Nếu render ngay với mặc định "tắt" rồi vài trăm mili-giây sau mới đổi sang
 * "bật", người dùng sẽ thấy cả màn hình NHẢY một cái — chữ nhỏ rồi phình to.
 *
 * Cờ `hydrated` giải quyết: app chờ đọc xong mới vẽ. Xem cách dùng trong
 * app/_layout.tsx.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PixelRatio } from 'react-native';

/** Khoá lưu trong AsyncStorage. Đặt tiền tố để không đụng khoá của thư viện khác. */
const STORAGE_KEY = '@vnfootball/settings';

/** Chế độ màu: theo hệ điều hành, hoặc người dùng tự chọn */
export type ColorSchemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  /** ⭐ Giao diện người lớn tuổi — chữ to, vùng chạm rộng (ARCHITECTURE.md mục 7) */
  isSenior: boolean;
  /** Sáng / Tối / Theo hệ thống */
  colorScheme: ColorSchemePreference;
  /**
   * Đã đọc xong cài đặt từ ổ đĩa chưa.
   * false = app chưa nên vẽ gì cả, xem giải thích ở đầu file.
   */
  hydrated: boolean;
  /**
   * Đã xem phần giới thiệu (onboarding) chưa.
   * Người dùng cũ mở app sẽ vào thẳng, không phải xem lại slide.
   */
  seenOnboarding: boolean;

  setSenior: (value: boolean) => void;
  setColorScheme: (value: ColorSchemePreference) => void;
  setSeenOnboarding: (value: boolean) => void;
  /** Đọc cài đặt từ ổ đĩa — gọi MỘT LẦN lúc app khởi động */
  hydrate: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  isSenior: false,
  colorScheme: 'system',
  hydrated: false,
  seenOnboarding: false,

  setSenior: (value) => {
    set({ isSenior: value });
    void persist(get());
  },

  setColorScheme: (value) => {
    set({ colorScheme: value });
    void persist(get());
  },

  setSeenOnboarding: (value) => {
    set({ seenOnboarding: value });
    void persist(get());
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<SettingsState>) : {};

      /**
       * ⭐ TỰ GỢI Ý SENIOR MODE KHI PHÁT HIỆN NGƯỜI DÙNG ĐÃ PHÓNG CHỮ HỆ THỐNG.
       *
       * `PixelRatio.getFontScale()` trả về hệ số cỡ chữ mà người dùng đặt
       * trong Cài đặt điện thoại. ≥ 1.3 nghĩa là họ đã chủ động phóng chữ lên —
       * một dấu hiệu rất rõ rằng họ khó đọc chữ nhỏ.
       *
       * ⚠️ Chỉ áp dụng khi người dùng CHƯA TỪNG tự chọn (saved.isSenior là
       * undefined). Nếu họ đã tắt senior mode bằng tay thì phải tôn trọng —
       * bật lại là phớt lờ lựa chọn của họ, và đó là hành vi rất khó chịu.
       */
      const goiYSenior = saved.isSenior === undefined && PixelRatio.getFontScale() >= 1.3;

      set({
        isSenior: saved.isSenior ?? goiYSenior,
        colorScheme: saved.colorScheme ?? 'system',
        seenOnboarding: saved.seenOnboarding ?? false,
        hydrated: true,
      });
    } catch {
      /**
       * Đọc lỗi (dữ liệu hỏng, quyền bị chặn) -> dùng mặc định và ĐI TIẾP.
       * Không đặt hydrated = true thì app treo mãi ở màn hình trắng —
       * một cài đặt đọc không được không đáng để cả app không mở lên nổi.
       */
      set({ hydrated: true });
    }
  },
}));

/**
 * Ghi cài đặt xuống ổ đĩa.
 *
 * Chỉ lưu ba trường thật sự cần nhớ — KHÔNG lưu `hydrated` vì nó là trạng
 * thái tạm của phiên chạy hiện tại. Lưu nhầm nó vào ổ đĩa thì lần mở app sau
 * sẽ đọc lên `hydrated: true` trước khi thật sự đọc xong, và ta mất luôn tác
 * dụng của cả cơ chế chống nhấp nháy.
 *
 * Nuốt lỗi vì ghi cài đặt thất bại không đáng để làm sập app — người dùng chỉ
 * mất lựa chọn sau khi tắt app, còn phiên hiện tại vẫn chạy đúng.
 */
async function persist(state: SettingsState): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        isSenior: state.isSenior,
        colorScheme: state.colorScheme,
        seenOnboarding: state.seenOnboarding,
      })
    );
  } catch {
    // cố tình im lặng — xem giải thích phía trên
  }
}
