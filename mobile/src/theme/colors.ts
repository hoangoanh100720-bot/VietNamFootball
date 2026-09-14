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
 * ============================================================================
 * 🎨 BẢNG MÀU: BA MÀU CHỦ ĐẠO LẤY TỪ HÌNH ẢNH VIỆT NAM
 * ============================================================================
 *
 *   ① ĐỎ CỜ      #DA251D  — nền lá quốc kỳ
 *   ② VÀNG SAO   #FFCD00  — ngôi sao năm cánh & bông lúa chín
 *   ③ XANH TRE   #0A1A12 → #3E7D52  — thân tre già, luỹ tre làng
 *
 * Ba màu này không đứng ngang hàng nhau — đó là điều quan trọng nhất cần hiểu:
 *
 *   XANH TRE là NỀN (chiếm ~80% diện tích màn hình)
 *   ĐỎ CỜ   là NHẤN (~15% — nút chính, tab đang chọn, tỷ số trực tiếp)
 *   VÀNG SAO là ĐIỂM XUYẾT (~5% — huy chương, đội trưởng, thành tích)
 *
 * ⚠️ Ba màu mạnh chia đều diện tích sẽ thành biển quảng cáo, không phải thiết kế.
 * Tỷ lệ 80/15/5 là thứ tạo nên cảm giác có chủ đích.
 *
 * ----------------------------------------------------------------------------
 * 📐 NHỮNG QUYẾT ĐỊNH THIẾT KẾ (mỗi màu đều có LÝ DO, không chọn bừa)
 *
 * 1. TỐI LÀM GỐC (dark-first)
 *    Bóng đá Việt Nam đá 19h30. Người dùng mở app buổi tối, thường trong
 *    phòng thiếu sáng. Nền tối đỡ chói mắt, đồng thời làm màu đỏ cờ và
 *    màu vàng sao nổi bật hơn hẳn.
 *
 * 2. ⭐ MÀU TRUNG TÍNH MANG SẮC XANH TRE (hue 150-155)
 *    Đây là thay đổi lớn nhất so với bản trước (vốn dùng xanh navy).
 *    Xám thuần (#888888) trông chết chóc, rẻ tiền. Xám pha xanh tre gợi
 *    ngay hình ảnh luỹ tre làng và mặt cỏ sân bóng — vừa đúng chủ đề,
 *    vừa khiến giao diện trông có chủ đích.
 *
 *    👉 Và nó biến màu thứ ba (xanh tre) thành MỘT HỆ THỐNG NỀN hoàn chỉnh
 *       thay vì chỉ là một màu nhấn lẻ loi. Đó là cách dùng ba màu chủ đạo
 *       mà không làm giao diện loè loẹt.
 *
 * 3. ĐỎ CỜ #DA251D CHỈ DÙNG CHO MẢNG LỚN
 *    Trên nền tối, #DA251D chỉ đạt tương phản ~4:1 với chữ nhỏ -> KHÔNG
 *    đạt chuẩn tiếp cận WCAG (yêu cầu 4.5:1).
 *    -> Giải pháp: giữ #DA251D cho MẢNG LỚN (nút bấm, nền), dùng bản
 *       SÁNG HƠN #FF5F52 cho CHỮ và ICON ở chế độ tối (đo được 6.0:1).
 *
 * 4. VÀNG SAO #FFCD00 CHỈ DÙNG CHO ĐÚNG BỐN VIỆC
 *    Trận ĐANG ĐÁ · đội trưởng · danh hiệu/thành tích · hoạ tiết bông lúa.
 *    Dùng bừa là mất hẳn tác dụng đánh dấu.
 *    ⚠️ Trên nền SÁNG, #FFCD00 gần như không đọc được (1.7:1) -> chế độ sáng
 *       phải đổi sang vàng lúa sẫm #A87900 cho chữ.
 *
 * 5. NỀN SÁNG DẦN KHI NỔI LÊN (elevation)
 *    Ở chế độ tối, vật thể càng "nổi" thì nền càng SÁNG (không phải tối đi
 *    như nhiều người lầm tưởng). Bóng đổ gần như vô hình trên nền tối,
 *    nên ta dùng VIỀN 1px thay cho bóng.
 *
 * 6. CHẾ ĐỘ SÁNG DÙNG NỀN "LÁ MẠ" #EDF5EE, KHÔNG PHẢI TRẮNG XÁM
 *    Bản đầu dùng giấy dó #F7F6EF và bị nhận xét "chưa thấy dùng màu": cả
 *    màn hình be/trắng, ba màu chủ đạo chỉ còn vài chấm nhỏ. Nền xanh lá
 *    rất nhạt giữ xanh tre làm NỀN ở cả chế độ sáng, đúng tỷ lệ 80/15/5.
 *    Trắng ngả xanh dương (#F5F7FA) là mặc định của mọi app công nghệ, vô hồn.
 *
 * 7. KHÔNG BAO GIỜ TRUYỀN TIN CHỈ BẰNG MÀU
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

  // --- ① Màu nhấn: ĐỎ CỜ ---
  accent: string;        // đỏ cờ — nút chính, thanh chọn
  accentText: string;    // bản sáng hơn, dùng cho CHỮ/ICON để đủ tương phản
  accentSoft: string;    // nền nhạt của màu nhấn (badge, vùng chọn)
  accentFg: string;      // chữ ĐẶT TRÊN nền accent

  // --- ② Màu phụ: VÀNG SAO / BÔNG LÚA ---
  gold: string;          // vàng sao — LIVE, đội trưởng, danh hiệu
  goldSoft: string;      // nền nhạt của vàng
  goldText: string;      // ⭐ vàng ĐỦ TƯƠNG PHẢN để làm màu CHỮ

  // --- ③ Màu chủ đạo thứ ba: XANH TRE ---
  bamboo: string;        // xanh lá tre — hoạ tiết, nhãn phụ, biểu đồ
  bambooText: string;    // bản đủ tương phản để làm màu chữ
  bambooSoft: string;    // nền nhạt xanh tre (badge, vùng nổi bật nhẹ)
  bambooDeep: string;    // xanh tre sẫm nhất — dải gradient, chân trang

  // --- Màu ngữ nghĩa ---
  win: string;           // thắng
  draw: string;          // hoà
  lose: string;          // thua
  winSoft: string;
  drawSoft: string;
  loseSoft: string;

  /**
   * --- ⭐ THANG ĐIỂM CẦU THỦ (ARCHITECTURE.md mục 5.3) ---
   *
   *   ≥ 8.0  xuất sắc    7.0–7.9  tốt    6.0–6.9  trung bình    < 6.0  kém
   *
   * ⚠️ Màu CHỈ LÀ TÍN HIỆU PHỤ. Badge luôn hiện CON SỐ, nên người mù màu vẫn
   * đọc được. Đây là quy tắc bắt buộc của dự án: không bao giờ truyền tin chỉ
   * bằng màu.
   *
   * Bốn màu này cố ý KHÔNG trùng với win/draw/lose: điểm 5.5 không có nghĩa là
   * "thua trận", và dùng chung màu sẽ khiến người dùng đọc nhầm ý nghĩa.
   */
  ratingExcellent: string;
  ratingGood: string;
  ratingAverage: string;
  ratingPoor: string;

  // --- Sân cỏ (dùng vẽ sơ đồ chiến thuật) ---
  pitch: string;         // mặt cỏ
  pitchStripe: string;   // vạch cỏ xen kẽ
  pitchLine: string;     // vạch vôi

  // --- Khác ---
  overlay: string;       // lớp phủ mờ sau modal
  skeleton: string;      // khối xám nhấp nháy khi đang tải
}

/**
 * CHẾ ĐỘ TỐI — bảng màu chính của app. "Luỹ tre về đêm".
 *
 * Các giá trị nền đi từ tối nhất (bg) tới sáng nhất (surfaceRaised),
 * đúng nguyên tắc "càng nổi càng sáng".
 *
 * Toàn bộ dải trung tính đều nằm ở sắc độ xanh tre (hue ~152) — đó là thứ
 * khiến giao diện "có mùi tre" mà không cần tô xanh lá lên bất cứ đâu.
 */
export const darkColors: ColorPalette = {
  bg: '#0A1A12',            // xanh tre gần đen — thân tre già trong bóng tối
  surface: '#102418',       // sáng hơn nền một bậc
  surfaceRaised: '#173020', // sáng hơn nữa
  surfaceSunken: '#06120B', // tối hơn nền -> cảm giác lõm xuống

  text: '#F2F7F3',          // không dùng #FFFFFF thuần: trắng tinh trên nền tối
                            // gây "chói mờ" (halation), đọc lâu mỏi mắt
  textMuted: '#9DB4A5',     // tương phản 8.1:1 trên bg — vẫn đọc rất tốt
  textFaint: '#6F8A78',     // 4.8:1 — đạt chuẩn, chỉ dùng cho chữ ≥ 13px
  textInverse: '#0A1A12',

  border: '#1F3C2B',        // vừa đủ thấy, không cắt vụn giao diện
  borderStrong: '#2D5440',

  accent: '#DA251D',        // ① đỏ cờ — dùng cho MẢNG LỚN
  accentText: '#FF5F52',    // đỏ sáng hơn — dùng cho CHỮ và ICON (6.0:1)
  accentSoft: '#3A1814',    // nền badge đỏ — đủ ấm để nhận ra là đỏ trên nền tre
  accentFg: '#FFFFFF',

  gold: '#FFCD00',          // ② vàng sao — mảng lớn và hoạ tiết
  goldSoft: '#3A3212',
  goldText: '#FFCD00',      // trên nền tối, vàng gốc đã đạt 12:1 — dùng thẳng

  bamboo: '#3E7D52',        // ③ xanh lá tre — hoạ tiết, đường viền trang trí
  bambooText: '#6FBF8A',    // bản sáng để làm chữ trên nền tối (8.1:1)
  bambooSoft: '#173F28',
  bambooDeep: '#061009',

  win: '#22C55E',
  draw: '#9DB4A5',          // dùng luôn màu chữ phụ -> hoà = "không màu"
  lose: '#F43F5E',          // hồng-đỏ, KHÁC hẳn đỏ cờ để không nhầm lẫn
  winSoft: '#0D2A19',
  drawSoft: '#1A2E21',
  loseSoft: '#2C1420',

  // Thang điểm cầu thủ — bốn bậc phân biệt rõ trên nền xanh tre sẫm
  ratingExcellent: '#3DDC84',   // xanh lá sáng, nổi bật nhất
  ratingGood: '#7ED957',        // xanh vàng
  ratingAverage: '#FFC53D',     // vàng cam
  ratingPoor: '#FF7A6B',        // đỏ cam nhạt (KHÔNG dùng đỏ cờ để khỏi nhầm)

  pitch: '#123322',         // xanh cỏ tối, không chói
  pitchStripe: '#163A28',
  pitchLine: 'rgba(255,255,255,0.22)',

  overlay: 'rgba(4, 12, 8, 0.74)',
  skeleton: '#173020',
};

/**
 * CHẾ ĐỘ SÁNG — "giấy dó & nắng vàng". KHÔNG phải bản "đảo ngược" chế độ tối!
 *
 * Đây là lỗi phổ biến nhất khi làm dark mode. Ở chế độ sáng:
 *   - Nền chuyển sang trắng ngả VÀNG (gợi giấy dó, hạt lúa), không trắng xanh
 *   - Bóng đổ NHÌN THẤY được -> dùng bóng nhẹ thay vì chỉ viền
 *   - Vàng sao PHẢI sẫm lại thành vàng lúa chín, nếu không sẽ không đọc được
 */
export const lightColors: ColorPalette = {
  /**
   * ⭐ NỀN "LÁ MẠ" #EDF5EE — xanh lá rất nhạt, thay cho giấy dó #F7F6EF.
   * Bản giấy dó bị chê là "chưa thấy màu": cả màn hình be/trắng, xanh lá
   * gần như vắng mặt. Nhuộm nhẹ nền và viền sang xanh lá thì màu chủ đạo
   * thứ ba hiện diện ở MỌI màn hình, trong khi thẻ trắng vẫn nổi rõ trên nền.
   * ⚠️ Đổi giá trị này thì sửa luôn BASE_BG ở backend themes.service.ts.
   */
  bg: '#EDF5EE',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#DFEDE2',

  text: '#11271A',          // xanh tre rất sẫm, không dùng đen thuần
  textMuted: '#40594A',     // 6.9:1 trên nền lá mạ
  textFaint: '#5A7563',     // 4.5:1 — vừa đủ chuẩn
  textInverse: '#FFFFFF',

  border: '#CFE2D3',        // viền ngả xanh lá, không xám
  borderStrong: '#A9C8B1',

  accent: '#DA251D',        // ① giữ nguyên đỏ cờ: trên nền sáng đủ tương phản
  accentText: '#B81811',    // đỏ ĐẬM hơn cho chữ trên nền sáng (6.0:1)
  accentSoft: '#FDE2DE',    // hồng đỏ đủ đậm để NHÌN THẤY là màu đỏ
  accentFg: '#FFFFFF',

  gold: '#FFCD00',          // ② mảng vàng vẫn dùng vàng sao thật
  goldSoft: '#FFF0B8',
  goldText: '#8A6300',      // ⚠️ vàng lúa chín — #FFCD00 làm chữ trên nền
                            //    sáng chỉ đạt 1.7:1, hoàn toàn không đọc được
                            //    (4.8:1 cả trên nền goldSoft)

  bamboo: '#2E7048',        // ③ xanh tre cho mảng và hoạ tiết
  bambooText: '#1B5E3A',    // đủ tương phản làm chữ (7.0:1)
  bambooSoft: '#D3EADA',
  bambooDeep: '#0F3D25',

  win: '#15803D',
  draw: '#64766B',
  lose: '#BE123C',
  winSoft: '#DCFCE7',
  drawSoft: '#E2ECE4',
  loseSoft: '#FFE4E9',

  // Cùng bốn bậc, nhưng SẪM lại để đọc được trên nền giấy dó
  ratingExcellent: '#0E7A3D',
  ratingGood: '#3F7D20',
  ratingAverage: '#9A6700',
  ratingPoor: '#C2410C',

  pitch: '#1E7A3E',
  pitchStripe: '#238947',
  pitchLine: 'rgba(255,255,255,0.55)',

  overlay: 'rgba(17, 39, 26, 0.45)',
  skeleton: '#DCEADF',
};

/**
 * ============================================================================
 * MÀU KHÔNG ĐỔI THEO CHẾ ĐỘ SÁNG/TỐI
 * ============================================================================
 *
 * Dùng cho những mảng luôn có nền màu cố định. Nguyên tắc:
 *
 *   ⭐ NỀN CỐ ĐỊNH THÌ CHỮ TRÊN NÓ CŨNG PHẢI CỐ ĐỊNH.
 *
 * Ví dụ có thật đã gặp: thẻ trận đang đá luôn có nền gradient ĐỎ. Nếu chữ
 * trên đó dùng colors.gold, thì ở chế độ sáng gold biến thành #A87900 —
 * vàng sẫm đặt trên nền đỏ, gần như không đọc nổi. Lỗi này chỉ lộ ra khi
 * chụp màn hình ở chế độ sáng, rất dễ lọt qua khâu kiểm thử.
 */
export const staticColors = {
  /**
   * Dải đỏ của thẻ trận ĐANG ĐÁ — điểm nhấn mạnh nhất toàn app.
   * Đi từ đỏ sẫm sang đỏ cờ để tạo chiều sâu, không phẳng bẹt.
   */
  liveGradient: ['#8E1610', '#DA251D'] as const,

  /** Vàng dùng TRÊN nền gradient đỏ. Luôn là vàng sao thật, không đổi theo theme. */
  liveGold: '#FFCD00',

  /**
   * Dải xanh tre của khối hero (đầu màn hình Giới thiệu).
   * Từ xanh tre sẫm nhất lên xanh tre trung — như ánh sáng xuyên qua bụi tre.
   */
  heroGradient: ['#061009', '#123322'] as const,

  /**
   * ⭐ DẢI CỜ TỔ QUỐC — đỏ sang đỏ tươi, nền cho ngôi sao vàng.
   * Dùng ở huy hiệu, khối thành tích và các mảng mang tính nghi lễ.
   */
  flagGradient: ['#B81811', '#DA251D', '#F03A2F'] as const,

  /**
   * ⭐ DẢI BÔNG LÚA — vàng lúa non sang vàng lúa chín.
   * Dùng cho khối danh hiệu, huy chương, cột mốc thành tích.
   */
  riceGradient: ['#FFE68A', '#FFCD00', '#E0A800'] as const,

  /**
   * ⭐ DẢI THÂN TRE — dùng vẽ hoạ tiết cây tre trong components/decor.
   * Ba chặng: phần tối trong bóng · thân tre · phần bắt nắng.
   */
  bambooGradient: ['#0F3D25', '#2E7048', '#5FA872'] as const,

  /**
   * ⭐ THANH TIÊU ĐỀ — nền xanh tre sẫm, chữ trắng, điểm vàng sao.
   * Cố định ở cả hai chế độ: thanh tiêu đề là "vỏ thương hiệu", nhìn một cái
   * là biết app của đội tuyển. Nền cố định nên chữ trên nó cũng cố định.
   * Tương phản: trắng 12.3:1, vàng sao 8.2:1.
   */
  brandBar: { bg: '#0F3D25', text: '#FFFFFF', gold: '#FFCD00' },

  /**
   * ⭐ DẢI BA MÀU CHỦ ĐẠO — đỏ cờ · vàng sao · xanh tre, dùng làm vạch mảnh
   * (mép trên thanh tab, dưới tiêu đề nhóm). Là hoạ tiết, không mang thông tin.
   */
  tricolor: ['#DA251D', '#FFCD00', '#2E7048'] as const,

  /** Màu tuyệt đối — chỉ dùng khi thật sự cần, ưu tiên token theo theme */
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  /**
   * ⭐ BỘ MÀU DÙNG TRÊN NỀN TỐI CỐ ĐỊNH (hero, thẻ trận đang đá, ảnh bìa).
   *
   * Trước khi có nhóm này, các màn hình phải viết thẳng 'rgba(255,255,255,0.7)'
   * vào component — đúng thứ mà quy tắc "không viết mã màu thô" cấm. Tệ hơn,
   * mỗi màn hình chọn một mức độ mờ khác nhau (0.6, 0.7, 0.75), khiến chữ phụ
   * ở các màn hình đậm nhạt không đều nhau.
   *
   * Ba mức dưới đây tương ứng với ba cấp chữ của giao diện thường
   * (text · textMuted · textFaint), nhưng dành cho nền tối cố định.
   */
  onDark: {
    /** Chữ chính trên nền tối */
    text: '#FFFFFF',
    /** Chữ phụ — 72% độ đục, tương phản ~7:1 trên nền xanh tre sẫm */
    textMuted: 'rgba(255,255,255,0.72)',
    /** Chú thích rất nhẹ — chỉ dùng cho chữ từ 13px trở lên */
    textFaint: 'rgba(255,255,255,0.55)',
    /** Đường kẻ phân tách trên nền tối */
    border: 'rgba(255,255,255,0.14)',
    /** Viền trắng quanh chấm cầu thủ trên sơ đồ sân — tách khỏi mặt cỏ */
    jerseyRing: 'rgba(255,255,255,0.9)',
    /**
     * Tăng/giảm bậc trên nền hero TỐI CỐ ĐỊNH. Không dùng colors.win/lose vì ở
     * chế độ sáng chúng là xanh/đỏ SẪM (#15803D) — đặt lên nền gần đen thì chìm mất.
     */
    win: '#22C55E',
    lose: '#F43F5E',
    /** Nền đặc cho thẻ số liệu nằm đè lên hoạ tiết (lá cờ) ở banner — chữ luôn đủ tương phản */
    chipBg: 'rgba(6,16,9,0.78)',
  },

  /**
   * ⭐ MÀU CỦA VẬT THỂ CÓ THẬT TRONG BÓNG ĐÁ — KHÔNG ĐỔI THEO CHẾ ĐỘ SÁNG/TỐI.
   *
   * Thẻ vàng của trọng tài là một tấm bìa màu vàng. Nó vàng ở ngoài nắng cũng
   * như dưới đèn sân vận động. Đổi nó theo theme sẽ vô lý y như đổi màu quả
   * bóng — người xem bóng đá nhận ra tấm thẻ NHỜ MÀU của nó.
   *
   * ⚠️ Đây cũng là lý do KHÔNG dùng colors.gold cho thẻ vàng: gold là vàng
   * NGÔI SAO trên quốc kỳ (#FFCD00), và ở chế độ sáng nó sẫm lại thành
   * #A87900 — lúc đó "thẻ vàng" trông như thẻ nâu.
   */
  card: {
    /** Thẻ vàng — cảnh cáo */
    yellow: '#EAB308',
    /** Thẻ đỏ — truất quyền thi đấu */
    red: '#DC2626',
  },

  /**
   * ⭐ MÀU ÁO THEO TUYẾN — dùng vẽ chấm cầu thủ trên sơ đồ chiến thuật.
   *
   * 📐 Bốn màu tách bạch rõ để chỉ liếc mắt là nhận ra cấu trúc đội hình
   * (3 hậu vệ? 4 tiền vệ?) mà không cần đọc tên ai.
   *
   * ⚠️ KHÔNG đổi theo chế độ sáng/tối: chấm cầu thủ luôn nằm trên MẶT CỎ, và
   * mặt cỏ thì xanh ở cả hai chế độ. Đổi màu áo theo theme sẽ làm tương phản
   * với cỏ thay đổi bất thường.
   *
   * 🥅 Thủ môn màu cam — đúng luật bóng đá thật: thủ môn phải mặc áo khác màu
   * với đồng đội và với cầu thủ đối phương.
   */
  jersey: {
    GK: '#F59E0B',
    DF: '#3B82F6',
    MF: '#10B981',
    FW: '#DA251D',
    /** Chữ số áo — luôn trắng vì bốn màu áo trên đều đủ sẫm */
    text: '#FFFFFF',
  },

  /**
   * Màu vẽ hoạ tiết trang trí (cờ, bông lúa, cây tre) — xem components/decor.
   * Tách riêng khỏi ColorPalette vì đây là màu của MINH HOẠ, không phải màu
   * của giao diện: chúng phải giữ đúng sắc thái ở cả hai chế độ, y như một
   * bức tranh treo tường không đổi màu khi ta bật hay tắt đèn.
   */
  decor: {
    flagRed: '#DA251D',
    starYellow: '#FFCD00',
    riceGold: '#E8B22A',
    riceGrain: '#FFD84D',
    bambooCulm: '#2E7048',
    bambooLeaf: '#4E9B62',
    bambooNode: '#1B5E3A',
    inkOutline: '#0A1A12',
  },
};
