/**
 * ============================================================================
 * THEME/TOKENS.TS — CHỮ, KHOẢNG CÁCH, BO GÓC, BÓNG ĐỔ
 * ============================================================================
 *
 * Ba hệ thống nhỏ quyết định 80% cảm giác "chuyên nghiệp" của giao diện.
 */

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

// ===========================================================================
// 1. THANG CHỮ (TYPE SCALE)
// ===========================================================================
/**
 * VÌ SAO PHẢI CÓ THANG?
 * Nếu mỗi màn hình tự chọn 13, 15, 16, 17, 18px thì giao diện thành mớ hỗn độn.
 * Ta chọn TRƯỚC một dãy cỡ chữ theo tỷ lệ ~1.25 rồi chỉ dùng trong dãy đó.
 *
 *   11 - 13 - 15 - 17 - 22 - 28 - 40
 *
 * Vài nguyên tắc bắt buộc:
 *   • Chữ nội dung KHÔNG BAO GIỜ nhỏ hơn 15 (dưới mức đó là mỏi mắt).
 *   • Cỡ 11-13 chỉ dành cho NHÃN phụ, luôn kèm màu mờ.
 *   • Cỡ 40 chỉ dành cho MỘT thứ duy nhất: con số tỷ số trực tiếp.
 *
 * PHÂN CẤP BẰNG 3 THỨ, KHÔNG CHỈ CỠ CHỮ:
 *   cỡ + độ đậm + màu.  Chữ mờ đi thường hiệu quả hơn là thu nhỏ lại.
 */
export const fontSize = {
  xs: 11,   // nhãn siêu nhỏ: "PHÚT", "SÂN"
  sm: 13,   // chú thích, ngày tháng
  base: 15, // ⭐ chữ nội dung mặc định
  md: 17,   // tiêu đề thẻ
  lg: 22,   // tiêu đề màn hình
  xl: 28,   // số liệu lớn (tổng giá trị đội hình)
  display: 40, // ⭐ CHỈ dùng cho tỷ số trực tiếp
} as const;

/**
 * ĐỘ CAO DÒNG (line-height)
 *   • Chữ nội dung: 1.5-1.7 lần cỡ chữ -> dễ đọc đoạn dài (bài nhận định AI)
 *   • Tiêu đề: 1.1-1.25 lần -> gọn, không bị "rời rạc"
 */
export const lineHeight = {
  tight: 1.15,
  snug: 1.35,
  normal: 1.55,
  relaxed: 1.7,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '800',
} as const;

/**
 * ⭐ MẸO QUAN TRỌNG VỚI CON SỐ: fontVariant tabular-nums
 *
 * Phông chữ thường có bề rộng chữ số khác nhau ("1" hẹp hơn "8").
 * Khi tỷ số nhảy từ 1-1 sang 2-1, cả cụm số sẽ "giật" sang bên.
 * tabular-nums buộc mọi chữ số rộng BẰNG NHAU -> số đứng yên tuyệt đối.
 *
 * BẮT BUỘC dùng cho: tỷ số, phút thi đấu, bảng xếp hạng, phần trăm AI.
 */
export const tabularNums: TextStyle = {
  fontVariant: ['tabular-nums'],
};

/**
 * Bộ phông chữ hệ thống. Đây là lựa chọn hợp lệ và NHANH:
 * không phải tải file font, chữ hiển thị tức thì, và trông "đúng chất"
 * của từng hệ điều hành.
 */
export const fontFamily = Platform.select({
  ios: { regular: 'System', mono: 'Menlo' },
  android: { regular: 'sans-serif', mono: 'monospace' },
  default: { regular: 'System', mono: 'monospace' },
})!;

// ===========================================================================
// 2. KHOẢNG CÁCH (SPACING)
// ===========================================================================
/**
 * TẤT CẢ đều là bội số của 4. Không bao giờ có 7px hay 13px.
 *
 * NGUYÊN TẮC VÀNG — "KHOẢNG CÁCH CHÍNH LÀ PHÂN CẤP":
 * Những thứ LIÊN QUAN đứng gần nhau, thứ KHÔNG liên quan đứng xa nhau.
 * Khoảng cách GIỮA các khối phải gấp 2-3 lần khoảng cách BÊN TRONG khối.
 *
 *   ┌─────────────────┐
 *   │ Tên cầu thủ     │  <- cách nhau 4px  (rất liên quan)
 *   │ Vị trí          │
 *   │                 │
 *   │ [ảnh]           │  <- cách 16px      (cùng thẻ)
 *   └─────────────────┘
 *          ↕ 24px         <- cách 24px      (khác thẻ)
 *   ┌─────────────────┐
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,   // ⭐ lề ngang mặc định của màn hình
  xl: 24,   // khoảng cách giữa các khối
  xxl: 32,
  xxxl: 48, // khoảng cách giữa các phần lớn
} as const;

// ===========================================================================
// 3. BO GÓC (RADIUS)
// ===========================================================================
export const radius = {
  sm: 8,
  md: 12,   // ⭐ mặc định cho thẻ nhỏ, nút
  lg: 16,   // thẻ lớn
  xl: 20,   // thẻ tỷ số trực tiếp
  pill: 999, // viên thuốc — badge, chip lọc
  full: 9999, // tròn hoàn toàn — avatar
} as const;

// ===========================================================================
// 4. ĐỘ NỔI (ELEVATION / SHADOW)
// ===========================================================================
/**
 * TRIẾT LÝ: ƯU TIÊN VIỀN 1px, HẠN CHẾ BÓNG ĐỔ.
 *
 * Một cái bóng to mờ dưới mọi thẻ là dấu hiệu của giao diện năm 2015.
 * Viền mảnh + đổi nhẹ màu nền cho cảm giác sắc nét, hiện đại hơn nhiều.
 *
 * Bóng chỉ dành cho thứ THỰC SỰ nổi lên khỏi mặt phẳng:
 * thanh tab dưới cùng, hộp thoại, thông báo trượt.
 *
 * Lưu ý kỹ thuật: iOS dùng shadowColor/Offset/Opacity/Radius,
 * Android dùng elevation. Phải khai báo cả hai.
 */
export const shadow: Record<'none' | 'sm' | 'md' | 'lg', ViewStyle> = {
  none: {},

  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },

  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
  },

  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 14,
  },
};

// ===========================================================================
// 5. HOẠT ẢNH (MOTION)
// ===========================================================================
/**
 * Thời lượng 120-250ms là khoảng "cảm thấy tức thì nhưng vẫn thấy chuyển động".
 * Dưới 100ms mắt không kịp nhận ra; trên 400ms người dùng thấy app ì ạch.
 *
 * Chỉ tạo hoạt ảnh cho transform và opacity — hai thuộc tính này chạy trên
 * luồng đồ hoạ, không làm bố cục tính lại nên luôn mượt.
 * TUYỆT ĐỐI không animate width/height/margin.
 */
export const duration = {
  fast: 120,   // đổi màu khi nhấn
  normal: 200, // hiện/ẩn phần tử
  slow: 320,   // chuyển màn hình
} as const;

/** Kích thước tối thiểu của vùng chạm — chuẩn của Apple và Google */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TOUCH_SIZE = 44;
