/**
 * ============================================================================
 * DB/SEEDS/DATA.TS — KHO DỮ LIỆU MẪU
 * ============================================================================
 *
 * ⚠️ ĐÂY LÀ DỮ LIỆU MẪU (demo/seed data) để app có nội dung hiển thị ngay
 *    khi bạn mới clone dự án. Các con số (giá trị chuyển nhượng, số trận,
 *    thứ hạng FIFA...) mang tính MINH HOẠ, không đảm bảo chính xác tuyệt đối.
 *
 *    Ở Bước 6 ta sẽ viết crawler + cron job để GHI ĐÈ toàn bộ bằng dữ liệu
 *    thật lấy từ API bóng đá. Cấu trúc dữ liệu thì giống hệt nhau.
 *
 * Tách riêng file này khỏi seed.ts để:
 *   - seed.ts chỉ lo LOGIC ghi vào database
 *   - data.ts chỉ lo NỘI DUNG
 * Sau này muốn đổi dữ liệu chỉ sửa một file, không đụng tới logic.
 */

// ---------------------------------------------------------------------------
// 1. ĐỘI TUYỂN
// ---------------------------------------------------------------------------
/**
 * BÀI HỌC TỪ MỘT LỖI THẬT: bản đầu tiên dùng ảnh của api-sports.io với mã đội
 * ĐOÁN MÒ (26, 2382...). Kết quả khi chạy thử: Việt Nam hiện cờ Argentina,
 * Indonesia hiện cờ Jamaica. Mã nội bộ của dịch vụ ngoài KHÔNG được đoán —
 * phải tra từ chính API đó (crawler sẽ làm ở Bước 6).
 *
 * Giờ dùng flagcdn.com theo mã quốc gia ISO 3166 (vn, th, id...). Mã ISO là
 * chuẩn quốc tế, cố định, không phụ thuộc nhà cung cấp nào -> không thể sai.
 */
const flag = (iso2: string) => `https://flagcdn.com/w160/${iso2}.png`;

export const TEAMS = [
  { fifa_code: 'VIE', name: 'Việt Nam', country: 'Việt Nam', logo_url: flag('vn') },
  { fifa_code: 'THA', name: 'Thái Lan', country: 'Thái Lan', logo_url: flag('th') },
  { fifa_code: 'IDN', name: 'Indonesia', country: 'Indonesia', logo_url: flag('id') },
  { fifa_code: 'MAS', name: 'Malaysia', country: 'Malaysia', logo_url: flag('my') },
  { fifa_code: 'SGP', name: 'Singapore', country: 'Singapore', logo_url: flag('sg') },
  { fifa_code: 'PHI', name: 'Philippines', country: 'Philippines', logo_url: flag('ph') },
  { fifa_code: 'LAO', name: 'Lào', country: 'Lào', logo_url: flag('la') },
  { fifa_code: 'NEP', name: 'Nepal', country: 'Nepal', logo_url: flag('np') },
  { fifa_code: 'JPN', name: 'Nhật Bản', country: 'Nhật Bản', logo_url: flag('jp') },
  { fifa_code: 'KOR', name: 'Hàn Quốc', country: 'Hàn Quốc', logo_url: flag('kr') },
];

// ---------------------------------------------------------------------------
// 2. HUẤN LUYỆN VIÊN TRƯỞNG
// ---------------------------------------------------------------------------
export const COACH = {
  full_name: 'Kim Sang-sik',
  nationality: 'Hàn Quốc',
  birth_date: '1976-12-17',
  start_date: '2024-05-03',
  contract_end: '2026-05-02',
  photo_url: null,
  biography:
    'Cựu tiền vệ phòng ngự đội tuyển Hàn Quốc với hơn 50 lần khoác áo ĐTQG, ' +
    'từng vô địch K-League cùng Jeonbuk Hyundai Motors trên cương vị cầu thủ lẫn HLV. ' +
    'Nhậm chức HLV trưởng đội tuyển Việt Nam tháng 5/2024, nổi bật với lối chơi ' +
    'kỷ luật, phòng ngự chắc và chuyển trạng thái nhanh.',
  achievements: [
    'Vô địch ASEAN Cup 2024 cùng đội tuyển Việt Nam',
    'Vô địch K-League 1 (2021) cùng Jeonbuk Hyundai Motors',
    'Cúp FA Hàn Quốc 2020',
  ],
};

// ---------------------------------------------------------------------------
// 3. DANH SÁCH CẦU THỦ
// ---------------------------------------------------------------------------
// position: GK thủ môn | DF hậu vệ | MF tiền vệ | FW tiền đạo
export interface SeedPlayer {
  full_name: string;
  short_name: string;
  birth_date: string;
  hometown: string;
  height_cm: number;
  weight_kg: number;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  detailed_position: string;
  shirt_number: number;
  preferred_foot: 'left' | 'right' | 'both';
  market_value_eur: number;
  current_club: string;
  caps: number;
  goals: number;
}

export const PLAYERS: SeedPlayer[] = [
  // ---------------------------- THỦ MÔN ----------------------------
  { full_name: 'Nguyễn Filip', short_name: 'Filip', birth_date: '1992-11-08', hometown: 'Praha, CH Séc', height_cm: 191, weight_kg: 85, position: 'GK', detailed_position: 'Thủ môn', shirt_number: 1, preferred_foot: 'right', market_value_eur: 400_000, current_club: 'CLB Công an Hà Nội', caps: 18, goals: 0 },
  { full_name: 'Đặng Văn Lâm', short_name: 'Văn Lâm', birth_date: '1993-08-13', hometown: 'Moskva, Nga', height_cm: 188, weight_kg: 80, position: 'GK', detailed_position: 'Thủ môn', shirt_number: 23, preferred_foot: 'right', market_value_eur: 300_000, current_club: 'CLB Bình Định', caps: 42, goals: 0 },
  { full_name: 'Nguyễn Đình Triệu', short_name: 'Đình Triệu', birth_date: '1991-11-01', hometown: 'Hải Phòng', height_cm: 182, weight_kg: 76, position: 'GK', detailed_position: 'Thủ môn', shirt_number: 26, preferred_foot: 'right', market_value_eur: 175_000, current_club: 'CLB Hải Phòng', caps: 9, goals: 0 },

  // ---------------------------- HẬU VỆ -----------------------------
  { full_name: 'Đỗ Duy Mạnh', short_name: 'Duy Mạnh', birth_date: '1996-09-29', hometown: 'Đông Anh, Hà Nội', height_cm: 180, weight_kg: 74, position: 'DF', detailed_position: 'Trung vệ', shirt_number: 2, preferred_foot: 'right', market_value_eur: 350_000, current_club: 'CLB Hà Nội', caps: 58, goals: 2 },
  { full_name: 'Nguyễn Thanh Bình', short_name: 'Thanh Bình', birth_date: '2000-08-27', hometown: 'Thái Bình', height_cm: 184, weight_kg: 76, position: 'DF', detailed_position: 'Trung vệ', shirt_number: 3, preferred_foot: 'right', market_value_eur: 325_000, current_club: 'CLB Thể Công Viettel', caps: 26, goals: 1 },
  { full_name: 'Bùi Hoàng Việt Anh', short_name: 'Việt Anh', birth_date: '1999-01-01', hometown: 'Thái Nguyên', height_cm: 184, weight_kg: 78, position: 'DF', detailed_position: 'Trung vệ', shirt_number: 4, preferred_foot: 'right', market_value_eur: 400_000, current_club: 'CLB Công an Hà Nội', caps: 31, goals: 2 },
  { full_name: 'Bùi Tiến Dũng', short_name: 'Tiến Dũng', birth_date: '1995-10-02', hometown: 'Ngọc Lặc, Thanh Hoá', height_cm: 181, weight_kg: 75, position: 'DF', detailed_position: 'Trung vệ', shirt_number: 5, preferred_foot: 'right', market_value_eur: 275_000, current_club: 'CLB Thanh Hoá', caps: 46, goals: 3 },
  { full_name: 'Nguyễn Thành Chung', short_name: 'Thành Chung', birth_date: '1997-09-08', hometown: 'Sóc Sơn, Hà Nội', height_cm: 182, weight_kg: 75, position: 'DF', detailed_position: 'Trung vệ', shirt_number: 6, preferred_foot: 'right', market_value_eur: 350_000, current_club: 'CLB Hà Nội', caps: 33, goals: 3 },
  { full_name: 'Phan Tuấn Tài', short_name: 'Tuấn Tài', birth_date: '2001-03-04', hometown: 'Đắk Lắk', height_cm: 175, weight_kg: 68, position: 'DF', detailed_position: 'Hậu vệ trái', shirt_number: 12, preferred_foot: 'left', market_value_eur: 400_000, current_club: 'CLB Thể Công Viettel', caps: 24, goals: 1 },
  { full_name: 'Vũ Văn Thanh', short_name: 'Văn Thanh', birth_date: '1996-04-14', hometown: 'Hải Dương', height_cm: 174, weight_kg: 68, position: 'DF', detailed_position: 'Hậu vệ phải', shirt_number: 20, preferred_foot: 'right', market_value_eur: 300_000, current_club: 'CLB Công an Hà Nội', caps: 51, goals: 3 },
  { full_name: 'Võ Minh Trọng', short_name: 'Minh Trọng', birth_date: '2000-02-15', hometown: 'Đồng Tháp', height_cm: 172, weight_kg: 66, position: 'DF', detailed_position: 'Hậu vệ trái', shirt_number: 17, preferred_foot: 'left', market_value_eur: 250_000, current_club: 'CLB Becamex Bình Dương', caps: 12, goals: 0 },
  { full_name: 'Hồ Tấn Tài', short_name: 'Tấn Tài', birth_date: '1997-11-06', hometown: 'Bình Định', height_cm: 178, weight_kg: 72, position: 'DF', detailed_position: 'Hậu vệ phải', shirt_number: 21, preferred_foot: 'right', market_value_eur: 300_000, current_club: 'CLB Bình Dương', caps: 34, goals: 2 },

  // ---------------------------- TIỀN VỆ ----------------------------
  { full_name: 'Khuất Văn Khang', short_name: 'Văn Khang', birth_date: '2003-03-15', hometown: 'Thạch Thất, Hà Nội', height_cm: 172, weight_kg: 65, position: 'MF', detailed_position: 'Tiền vệ cánh', shirt_number: 7, preferred_foot: 'left', market_value_eur: 400_000, current_club: 'CLB Thể Công Viettel', caps: 21, goals: 2 },
  { full_name: 'Đỗ Hùng Dũng', short_name: 'Hùng Dũng', birth_date: '1993-09-08', hometown: 'Hà Nội', height_cm: 173, weight_kg: 68, position: 'MF', detailed_position: 'Tiền vệ trung tâm', shirt_number: 8, preferred_foot: 'right', market_value_eur: 300_000, current_club: 'CLB Hà Nội', caps: 55, goals: 5 },
  { full_name: 'Châu Ngọc Quang', short_name: 'Ngọc Quang', birth_date: '1996-01-14', hometown: 'Quảng Nam', height_cm: 170, weight_kg: 64, position: 'MF', detailed_position: 'Tiền vệ tấn công', shirt_number: 10, preferred_foot: 'right', market_value_eur: 275_000, current_club: 'CLB Hồng Lĩnh Hà Tĩnh', caps: 20, goals: 3 },
  { full_name: 'Doãn Ngọc Tân', short_name: 'Ngọc Tân', birth_date: '1994-02-12', hometown: 'Hà Nội', height_cm: 173, weight_kg: 70, position: 'MF', detailed_position: 'Tiền vệ con thoi', shirt_number: 11, preferred_foot: 'right', market_value_eur: 250_000, current_club: 'CLB Đông Á Thanh Hoá', caps: 15, goals: 2 },
  { full_name: 'Nguyễn Hoàng Đức', short_name: 'Hoàng Đức', birth_date: '1998-01-11', hometown: 'Văn Giang, Hưng Yên', height_cm: 183, weight_kg: 76, position: 'MF', detailed_position: 'Tiền vệ trung tâm', shirt_number: 14, preferred_foot: 'right', market_value_eur: 600_000, current_club: 'CLB Ninh Bình', caps: 44, goals: 6 },
  { full_name: 'Nguyễn Thái Sơn', short_name: 'Thái Sơn', birth_date: '2003-05-06', hometown: 'Thanh Hoá', height_cm: 170, weight_kg: 64, position: 'MF', detailed_position: 'Tiền vệ phòng ngự', shirt_number: 15, preferred_foot: 'right', market_value_eur: 300_000, current_club: 'CLB Đông Á Thanh Hoá', caps: 18, goals: 1 },
  { full_name: 'Nguyễn Hai Long', short_name: 'Hai Long', birth_date: '2000-04-05', hometown: 'Quảng Ninh', height_cm: 172, weight_kg: 66, position: 'MF', detailed_position: 'Tiền vệ tấn công', shirt_number: 16, preferred_foot: 'right', market_value_eur: 350_000, current_club: 'CLB Hà Nội', caps: 17, goals: 3 },
  { full_name: 'Nguyễn Quang Hải', short_name: 'Quang Hải', birth_date: '1997-04-12', hometown: 'Đông Anh, Hà Nội', height_cm: 168, weight_kg: 62, position: 'MF', detailed_position: 'Tiền vệ tấn công', shirt_number: 19, preferred_foot: 'left', market_value_eur: 500_000, current_club: 'CLB Công an Hà Nội', caps: 62, goals: 14 },

  // ---------------------------- TIỀN ĐẠO ---------------------------
  { full_name: 'Nguyễn Xuân Son', short_name: 'Xuân Son', birth_date: '1997-06-27', hometown: 'Bahia, Brazil', height_cm: 183, weight_kg: 79, position: 'FW', detailed_position: 'Tiền đạo cắm', shirt_number: 9, preferred_foot: 'right', market_value_eur: 700_000, current_club: 'CLB Nam Định', caps: 8, goals: 7 },
  { full_name: 'Nguyễn Văn Toàn', short_name: 'Văn Toàn', birth_date: '1996-04-12', hometown: 'Hải Dương', height_cm: 170, weight_kg: 65, position: 'FW', detailed_position: 'Tiền đạo cánh', shirt_number: 13, preferred_foot: 'right', market_value_eur: 300_000, current_club: 'CLB Nam Định', caps: 58, goals: 8 },
  { full_name: 'Phạm Tuấn Hải', short_name: 'Tuấn Hải', birth_date: '1998-05-19', hometown: 'Hà Nam', height_cm: 176, weight_kg: 70, position: 'FW', detailed_position: 'Tiền đạo cánh', shirt_number: 18, preferred_foot: 'right', market_value_eur: 450_000, current_club: 'CLB Hà Nội', caps: 38, goals: 12 },
  { full_name: 'Nguyễn Tiến Linh', short_name: 'Tiến Linh', birth_date: '1997-10-20', hometown: 'Hải Dương', height_cm: 182, weight_kg: 76, position: 'FW', detailed_position: 'Tiền đạo cắm', shirt_number: 22, preferred_foot: 'right', market_value_eur: 450_000, current_club: 'CLB Becamex Bình Dương', caps: 61, goals: 24 },
  { full_name: 'Nguyễn Đình Bắc', short_name: 'Đình Bắc', birth_date: '2004-09-04', hometown: 'Nghệ An', height_cm: 178, weight_kg: 70, position: 'FW', detailed_position: 'Tiền đạo cánh', shirt_number: 24, preferred_foot: 'left', market_value_eur: 350_000, current_club: 'CLB Công an Hà Nội', caps: 14, goals: 2 },
  { full_name: 'Bùi Vĩ Hào', short_name: 'Vĩ Hào', birth_date: '2003-01-25', hometown: 'Bình Dương', height_cm: 176, weight_kg: 68, position: 'FW', detailed_position: 'Tiền đạo cánh', shirt_number: 25, preferred_foot: 'right', market_value_eur: 300_000, current_club: 'CLB Becamex Bình Dương', caps: 16, goals: 3 },
];

// ---------------------------------------------------------------------------
// 4. ĐỘI HÌNH RA SÂN — sơ đồ 3-4-3
// ---------------------------------------------------------------------------
/**
 * TOẠ ĐỘ TRÊN SÂN (x, y) tính theo phần trăm:
 *   x = 0   -> sát biên trái        |  x = 100 -> sát biên phải
 *   y = 5   -> khung thành đội nhà  |  y = 95  -> khung thành đối phương
 *
 * Vẽ ra giấy sơ đồ 3-4-3 sẽ thấy ngay:
 *
 *        95 |      Xuân Son(9)                      <- 3 tiền đạo
 *        80 | Tuấn Hải(18)        Quang Hải(19)
 *        58 | V.Khang(7) H.Đức(14) H.Dũng(8) V.Thanh(20)  <- 4 tiền vệ
 *        30 |   Tiến Dũng(5) Việt Anh(4) Duy Mạnh(2)      <- 3 trung vệ
 *         6 |            Filip(1)                         <- thủ môn
 *           +--------------------------------------
 *            0        25       50       75      100  (x)
 */
export const STARTING_XI: Array<{ shirt: number; x: number; y: number; captain?: boolean }> = [
  { shirt: 1, x: 50, y: 6 },                    // Nguyễn Filip — thủ môn
  { shirt: 5, x: 27, y: 26 },                   // Bùi Tiến Dũng — trung vệ lệch trái
  { shirt: 4, x: 50, y: 24, captain: true },    // Việt Anh — trung vệ giữa (đội trưởng)
  { shirt: 2, x: 73, y: 26 },                   // Duy Mạnh — trung vệ lệch phải
  { shirt: 7, x: 12, y: 55 },                   // Văn Khang — chạy cánh trái
  { shirt: 14, x: 38, y: 50 },                  // Hoàng Đức — tiền vệ trung tâm
  { shirt: 8, x: 62, y: 50 },                   // Hùng Dũng — tiền vệ trung tâm
  { shirt: 20, x: 88, y: 55 },                  // Văn Thanh — chạy cánh phải
  { shirt: 18, x: 22, y: 80 },                  // Tuấn Hải — tiền đạo cánh trái
  { shirt: 9, x: 50, y: 88 },                   // Xuân Son — tiền đạo cắm
  { shirt: 19, x: 78, y: 80 },                  // Quang Hải — tiền đạo cánh phải
];

/** Cầu thủ dự bị — không cần toạ độ vì ngồi ngoài sân */
export const BENCH_SHIRTS = [23, 26, 3, 6, 12, 17, 21, 11, 15, 16, 10, 13, 22, 24, 25];

export const FORMATION = '3-4-3';

// ---------------------------------------------------------------------------
// 5. TRẬN ĐẤU
// ---------------------------------------------------------------------------
/**
 * kickoff_at ghi theo giờ UTC (chuẩn quốc tế).
 * Giờ Việt Nam = UTC + 7. Ví dụ 19:30 giờ VN -> 12:30 UTC.
 * Luôn lưu UTC trong database, đổi sang giờ địa phương ở app -> không bao giờ sai.
 */
export interface SeedMatch {
  competition: string;
  round: string;
  home: string;   // fifa_code
  away: string;
  kickoff_at: string;
  venue: string;
  city: string;
  status: 'scheduled' | 'live' | 'finished';
  home_score?: number;
  away_score?: number;
  minute?: number;
  attendance?: number;
}

export const MATCHES: SeedMatch[] = [
  // ---- ĐÃ ĐẤU (dùng cho lịch sử đối đầu + phân tích phong độ của AI) ----
  { competition: 'ASEAN Cup 2024', round: 'Chung kết - Lượt đi', home: 'VIE', away: 'THA', kickoff_at: '2025-01-02T12:30:00Z', venue: 'SVĐ Việt Trì', city: 'Phú Thọ', status: 'finished', home_score: 2, away_score: 1, attendance: 20000 },
  { competition: 'ASEAN Cup 2024', round: 'Chung kết - Lượt về', home: 'THA', away: 'VIE', kickoff_at: '2025-01-05T12:30:00Z', venue: 'SVĐ Rajamangala', city: 'Bangkok', status: 'finished', home_score: 2, away_score: 3, attendance: 48000 },
  { competition: 'Vòng loại Asian Cup 2027', round: 'Bảng F - Lượt 1', home: 'VIE', away: 'LAO', kickoff_at: '2025-03-25T12:00:00Z', venue: 'SVĐ Thiên Trường', city: 'Nam Định', status: 'finished', home_score: 5, away_score: 0, attendance: 21000 },
  { competition: 'Vòng loại Asian Cup 2027', round: 'Bảng F - Lượt 2', home: 'MAS', away: 'VIE', kickoff_at: '2025-06-10T12:45:00Z', venue: 'SVĐ Bukit Jalil', city: 'Kuala Lumpur', status: 'finished', home_score: 1, away_score: 2, attendance: 62000 },
  { competition: 'Giao hữu quốc tế', round: 'FIFA Days', home: 'VIE', away: 'SGP', kickoff_at: '2026-03-26T12:30:00Z', venue: 'SVĐ Mỹ Đình', city: 'Hà Nội', status: 'finished', home_score: 3, away_score: 0, attendance: 30000 },
  // Vài lần gặp Indonesia và Malaysia trước đây — để phần "Lịch sử đối đầu"
  // trong app có dữ liệu thật mà hiển thị
  { competition: 'Vòng loại World Cup 2026', round: 'Bảng F - Lượt 3', home: 'VIE', away: 'IDN', kickoff_at: '2024-03-26T12:30:00Z', venue: 'SVĐ Mỹ Đình', city: 'Hà Nội', status: 'finished', home_score: 0, away_score: 3, attendance: 28000 },
  { competition: 'Vòng loại World Cup 2026', round: 'Bảng F - Lượt 2', home: 'IDN', away: 'VIE', kickoff_at: '2024-03-21T09:00:00Z', venue: 'SVĐ Gelora Bung Karno', city: 'Jakarta', status: 'finished', home_score: 1, away_score: 0, attendance: 65000 },
  { competition: 'ASEAN Cup 2022', round: 'Bán kết - Lượt về', home: 'VIE', away: 'IDN', kickoff_at: '2023-01-09T12:30:00Z', venue: 'SVĐ Mỹ Đình', city: 'Hà Nội', status: 'finished', home_score: 2, away_score: 0, attendance: 40000 },
  { competition: 'ASEAN Cup 2024', round: 'Bán kết - Lượt về', home: 'VIE', away: 'MAS', kickoff_at: '2024-12-29T12:30:00Z', venue: 'SVĐ Việt Trì', city: 'Phú Thọ', status: 'finished', home_score: 3, away_score: 1, attendance: 19000 },
  { competition: 'Vòng loại Asian Cup 2027', round: 'Bảng F - Lượt 2', home: 'MAS', away: 'VIE', kickoff_at: '2023-06-10T12:45:00Z', venue: 'SVĐ Bukit Jalil', city: 'Kuala Lumpur', status: 'finished', home_score: 2, away_score: 2, attendance: 58000 },
  { competition: 'Vòng loại Asian Cup 2027', round: 'Bảng F - Lượt 3', home: 'VIE', away: 'NEP', kickoff_at: '2026-06-09T12:30:00Z', venue: 'SVĐ Mỹ Đình', city: 'Hà Nội', status: 'finished', home_score: 4, away_score: 0, attendance: 25000 },

  // ---- ĐANG DIỄN RA (để bạn thấy giao diện LIVE hoạt động ngay) ----
  { competition: 'Giao hữu quốc tế', round: 'FIFA Days', home: 'VIE', away: 'IDN', kickoff_at: '2026-09-09T12:30:00Z', venue: 'SVĐ Mỹ Đình', city: 'Hà Nội', status: 'live', home_score: 1, away_score: 0, minute: 67, attendance: 34000 },

  // ---- SẮP DIỄN RA ----
  { competition: 'Vòng loại Asian Cup 2027', round: 'Bảng F - Lượt 4', home: 'VIE', away: 'MAS', kickoff_at: '2026-10-08T12:30:00Z', venue: 'SVĐ Mỹ Đình', city: 'Hà Nội', status: 'scheduled' },
  { competition: 'Vòng loại Asian Cup 2027', round: 'Bảng F - Lượt 5', home: 'NEP', away: 'VIE', kickoff_at: '2026-11-12T09:00:00Z', venue: 'SVĐ Dasharath', city: 'Kathmandu', status: 'scheduled' },
  { competition: 'Vòng loại Asian Cup 2027', round: 'Bảng F - Lượt 6', home: 'LAO', away: 'VIE', kickoff_at: '2026-12-15T11:00:00Z', venue: 'SVĐ Quốc gia Lào', city: 'Viêng Chăn', status: 'scheduled' },
  { competition: 'Giao hữu quốc tế', round: 'FIFA Days', home: 'VIE', away: 'JPN', kickoff_at: '2027-01-20T10:00:00Z', venue: 'SVĐ Mỹ Đình', city: 'Hà Nội', status: 'scheduled' },
];

// ---------------------------------------------------------------------------
// 6. DIỄN BIẾN TRẬN ĐANG ĐÁ (Việt Nam vs Indonesia)
// ---------------------------------------------------------------------------
export const LIVE_EVENTS = [
  { minute: 12, type: 'yellow_card' as const, shirt: 8, detail: 'Phạm lỗi chiến thuật giữa sân' },
  { minute: 34, type: 'goal' as const, shirt: 9, detail: 'Đánh đầu cận thành sau quả tạt của Quang Hải' },
  { minute: 58, type: 'substitution' as const, shirt: 22, detail: 'Vào sân thay Phạm Tuấn Hải' },
];

// ---------------------------------------------------------------------------
// 7. BẢNG XẾP HẠNG FIFA
// ---------------------------------------------------------------------------
export const FIFA_RANKING_DATE = '2026-07-16';

export const FIFA_RANKINGS = [
  { fifa_code: 'JPN', rank: 15, points: 1652.64, previous_rank: 15, confederation: 'AFC' },
  { fifa_code: 'KOR', rank: 23, points: 1571.28, previous_rank: 22, confederation: 'AFC' },
  { fifa_code: 'THA', rank: 98, points: 1216.4, previous_rank: 99, confederation: 'AFC' },
  { fifa_code: 'VIE', rank: 109, points: 1178.5, previous_rank: 113, confederation: 'AFC' },
  { fifa_code: 'IDN', rank: 121, points: 1132.9, previous_rank: 118, confederation: 'AFC' },
  { fifa_code: 'MAS', rank: 129, points: 1104.2, previous_rank: 131, confederation: 'AFC' },
  { fifa_code: 'PHI', rank: 148, points: 1032.7, previous_rank: 147, confederation: 'AFC' },
  { fifa_code: 'SGP', rank: 161, points: 963.1, previous_rank: 160, confederation: 'AFC' },
  { fifa_code: 'LAO', rank: 186, points: 858.4, previous_rank: 185, confederation: 'AFC' },
  { fifa_code: 'NEP', rank: 176, points: 899.6, previous_rank: 177, confederation: 'AFC' },
];

// ---------------------------------------------------------------------------
// 8. LỊCH SỬ CLB (làm mẫu cho vài cầu thủ tiêu biểu)
// ---------------------------------------------------------------------------
export const PLAYER_CLUBS: Record<number, Array<{ club: string; from: string; to: string | null; apps: number; goals: number }>> = {
  // key = số áo
  19: [
    { club: 'CLB Hà Nội', from: '2015-01-01', to: '2022-06-30', apps: 145, goals: 41 },
    { club: 'Pau FC (Pháp)', from: '2022-07-01', to: '2023-06-30', apps: 12, goals: 0 },
    { club: 'CLB Công an Hà Nội', from: '2023-07-01', to: null, apps: 78, goals: 19 },
  ],
  9: [
    { club: 'CLB Nam Định', from: '2020-01-01', to: null, apps: 132, goals: 89 },
  ],
  14: [
    { club: 'CLB Thể Công Viettel', from: '2017-01-01', to: '2025-06-30', apps: 168, goals: 27 },
    { club: 'CLB Ninh Bình', from: '2025-07-01', to: null, apps: 24, goals: 8 },
  ],
  22: [
    { club: 'CLB Becamex Bình Dương', from: '2017-01-01', to: null, apps: 187, goals: 71 },
  ],
  1: [
    { club: 'Slavia Praha B (CH Séc)', from: '2011-01-01', to: '2014-06-30', apps: 34, goals: 0 },
    { club: 'FK Pardubice (CH Séc)', from: '2014-07-01', to: '2023-12-31', apps: 156, goals: 0 },
    { club: 'CLB Công an Hà Nội', from: '2024-01-01', to: null, apps: 52, goals: 0 },
  ],
};
