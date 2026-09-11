/**
 * ============================================================================
 * THEME/COLORS.TS — BẢNG MÀU (DESIGN TOKENS)
 * ============================================================================
 *
 * TOKEN LÀ GÌ VÀ VÌ SAO PHẢI CÓ?
 * Token là "biến màu có tên". Thay vì rải #DA251D khắp 40 file, ta khai báo
 * một lần là colors.accent. Muốn đổi nhận diện thương hiệu -> sửa 1 dòng.
 *
 * ⛔ QUY TẮC BẤT DI BẤT DỊCH CỦA DỰ ÁN:
 *    KHÔNG viết mã màu thô (#fff, 'red', 'rgba(...)') trong component.
 *    Mọi màu PHẢI lấy từ file này.
 *
 * ----------------------------------------------------------------------------
 * NHỮNG QUYẾT ĐỊNH THIẾT KẾ (mỗi màu đều có LÝ DO, không chọn bừa)
 *
 * 1. TỐI LÀM GỐC (dark-first)
 *    Bóng đá Việt Nam đá 19h30. Người dùng mở app buổi tối, thường trong
 *    phòng thiếu sáng. Nền tối đỡ chói mắt, đồng thời làm màu đỏ cờ và
 *    màu xanh sân cỏ nổi bật hơn hẳn.
 *
 * 2. MỘT MÀU NHẤN DUY NHẤT: ĐỎ CỜ #DA251D
 *    Đây là màu đỏ chính thức trên quốc kỳ Việt Nam. Nhưng có một vấn đề:
 *    trên nền tối, #DA251D chỉ đạt độ tương phản ~4:1 với chữ nhỏ -> KHÔNG
 *    đạt chuẩn tiếp cận WCAG (yêu cầu 4.5:1).
 *    -> Giải pháp: giữ #DA251D cho MẢNG LỚN (nút bấm, nền), và dùng bản
 *       SÁNG HƠN #FF5147 cho CHỮ và ICON ở chế độ tối.
 *
 * 3. MÀU PHỤ: VÀNG SAO #FFCD00
 *    Cũng lấy từ quốc kỳ (ngôi sao vàng). Chỉ dùng cho ĐÚNG HAI việc:
 *    đánh dấu trận ĐANG ĐÁ và đánh dấu đội trưởng. Dùng bừa là mất tác dụng.
 *
 * 4. MÀU TRUNG TÍNH CÓ SẮC ĐỘ (hue 222 - xanh navy)
 *    Xám thuần (#888888) trông chết chóc, rẻ tiền. Xám pha chút xanh navy
 *    gợi cảm giác "sân vận động về đêm" và khiến giao diện có chủ đích.
 *
 * 5. NỀN SÁNG DẦN KHI NỔI LÊN (elevation)
 *    Ở chế độ tối, vật thể càng "nổi" thì nền càng SÁNG (không phải tối đi
 *    như nhiều người lầm tưởng). Bóng đổ gần như vô hình trên nền tối,
 *    nên ta dùng VIỀN 1px thay cho bóng.
 *
 * 6. KHÔNG BAO GIỜ TRUYỀN TIN CHỈ BẰNG MÀU
 *    Thắng/Hoà/Thua luôn kèm chữ "T"/"H"/"B", không chỉ tô màu.
 *    Khoảng 8% nam giới bị mù màu đỏ-lục — họ vẫn phải dùng được app.
 * ============================================================================
 */

/** Kiểu dữ liệu ràng buộc: mọi bảng màu đều PHẢI có đủ các khoá này */
export interface ColorPalette {
  // --- Nền và bề mặt ---
  bg: string;            // nền màn hình
  surface: string;       // thẻ (card) đặt trên nền
  surfaceRaised: string; // thẻ nổi cao hơn (modal, thẻ trong thẻ)
  surfaceSunken: string; // ô lõm xuống (ô nhập liệu, thanh tiến trình)

  // --- Chữ ---
  text: string;          // chữ chính
  textMuted: string;     // chữ phụ (nhãn, ngày tháng)
  textFaint: string;     // chữ rất mờ (chú thích nhỏ)
  textInverse: string;   // chữ trên nền màu nhấn

  // --- Đường viền ---
  border: string;        // viền mảnh phân tách
  borderStrong: string;  // viền rõ (ô nhập liệu, nút viền)

  // --- Màu nhấn ---
  accent: string;        // đỏ cờ — nút chính, thanh chọn
  accentText: string;    // bản sáng hơn, dùng cho CHỮ/ICON để đủ tương phản
  accentSoft: string;    // nền nhạt của màu nhấn (badge, vùng chọn)
  accentFg: string;      // chữ ĐẶT TRÊN nền accent

  // --- Màu phụ ---
  gold: string;          // vàng sao — LIVE, đội trưởng
  goldSoft: string;

  // --- Màu ngữ nghĩa ---
  win: string;           // thắng
  draw: string;          // hoà
  lose: string;          // thua
  winSoft: string;
  drawSoft: string;
  loseSoft: string;

  // --- Sân cỏ (dùng vẽ sơ đồ chiến thuật) ---
  pitch: string;         // mặt cỏ
  pitchStripe: string;   // vạch cỏ xen kẽ
  pitchLine: string;     // vạch vôi

  // --- Khác ---
  overlay: string;       // lớp phủ mờ sau modal
  skeleton: string;      // khối xám nhấp nháy khi đang tải
}

/**
 * CHẾ ĐỘ TỐI — bảng màu chính của app.
 * Các giá trị nền đi từ tối nhất (bg) tới sáng nhất (surfaceRaised),
 * đúng nguyên tắc "càng nổi càng sáng".
 */
export const darkColors: ColorPalette = {
  bg: '#0B1220',            // navy gần đen — nền sân vận động về đêm
  surface: '#131C2E',       // sáng hơn nền một bậc
  surfaceRaised: '#1B2539', // sáng hơn nữa
  surfaceSunken: '#080D18', // tối hơn nền -> cảm giác lõm xuống

  text: '#F1F5F9',          // không dùng #FFFFFF thuần: trắng tinh trên nền tối
                            // gây "chói mờ" (halation), đọc lâu mỏi mắt
  textMuted: '#94A3B8',     // tương phản 7.2:1 trên bg — vẫn đọc tốt
  textFaint: '#64748B',     // 4.6:1 — chỉ dùng cho chữ ≥ 13px
  textInverse: '#0B1220',

  border: '#233046',        // vừa đủ thấy, không cắt vụn giao diện
  borderStrong: '#33415C',

  accent: '#DA251D',        // đỏ cờ — dùng cho MẢNG LỚN
  accentText: '#FF5147',    // đỏ sáng hơn — dùng cho CHỮ và ICON
  accentSoft: '#2A1418',    // nền badge đỏ rất tối
  accentFg: '#FFFFFF',

  gold: '#FFCD00',
  goldSoft: '#2B2410',

  win: '#22C55E',
  draw: '#94A3B8',
  lose: '#F43F5E',          // hồng-đỏ, KHÁC hẳn đỏ cờ để không nhầm lẫn
  winSoft: '#0F2A1B',
  drawSoft: '#1E2837',
  loseSoft: '#2C1420',

  pitch: '#12331F',         // xanh cỏ tối, không chói
  pitchStripe: '#163A24',
  pitchLine: 'rgba(255,255,255,0.22)',

  overlay: 'rgba(3, 7, 18, 0.72)',
  skeleton: '#1B2539',
};

/**
 * CHẾ ĐỘ SÁNG — không phải "đảo ngược" chế độ tối!
 * Đây là lỗi phổ biến nhất khi làm dark mode. Ở chế độ sáng:
 *   - Nền chuyển sang trắng ngà (không trắng tinh, đỡ chói)
 *   - Bóng đổ NHÌN THẤY được -> dùng bóng nhẹ thay vì chỉ viền
 *   - Màu nhấn giữ nguyên #DA251D vì trên nền sáng nó đủ tương phản (5.9:1)
 */
export const lightColors: ColorPalette = {
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#EDF1F6',

  text: '#0F1B2D',
  textMuted: '#526180',
  textFaint: '#7A8AA3',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  accent: '#DA251D',
  accentText: '#C41E17',    // đỏ ĐẬM hơn cho chữ trên nền sáng (7.1:1)
  accentSoft: '#FDECEA',
  accentFg: '#FFFFFF',

  gold: '#B88700',          // vàng đậm lại, vì #FFCD00 trên nền trắng không đọc được
  goldSoft: '#FFF7DB',

  win: '#15803D',
  draw: '#64748B',
  lose: '#BE123C',
  winSoft: '#DCFCE7',
  drawSoft: '#F1F5F9',
  loseSoft: '#FFE4E9',

  pitch: '#1E7A3E',
  pitchStripe: '#238947',
  pitchLine: 'rgba(255,255,255,0.55)',

  overlay: 'rgba(15, 27, 45, 0.45)',
  skeleton: '#E7EDF4',
};

/**
 * Màu KHÔNG đổi theo chế độ sáng/tối.
 * Ví dụ nền thẻ tỷ số trực tiếp: luôn là dải gradient đỏ đậm để tạo điểm nhấn
 * mạnh nhất trong toàn app, dù người dùng đang ở chế độ nào.
 */
export const staticColors = {
  liveGradient: ['#8E1610', '#DA251D'] as const,
  /**
   * Vàng dùng TRÊN nền gradient đỏ của thẻ trận đang đá.
   * Không dùng colors.gold vì ở chế độ sáng nó là vàng sẫm #B88700 — đặt
   * lên nền đỏ thì gần như không đọc được (phát hiện qua ảnh chụp chế độ
   * sáng). Nền cố định thì chữ trên nó cũng phải cố định.
   */
  liveGold: '#FFCD00',
  heroGradient: ['#0B1220', '#16233A'] as const,
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};
