/**
 * ============================================================================
 * DB/SEEDS/REALSQUAD.TS — ĐỘI HÌNH THẬT: ĐỘI TUYỂN VIỆT NAM DỰ ASEAN CUP 2026
 * ============================================================================
 *
 * ⚠️ FILE NÀY ĐƯỢC SINH TỰ ĐỘNG từ dữ liệu đã đối chiếu — sửa tay được, nhưng
 *    mỗi con số đều có nguồn, đừng "làm tròn" hay đoán thêm.
 *
 * 📚 NGUỒN
 *   • Danh sách triệu tập: VFF công bố 15/06/2026 (source_url bên dưới),
 *     đối chiếu bảng "Current squad" trên en.wikipedia (Vietnam national football team).
 *   • Số trận / bàn thắng ĐTQG, số áo, CLB: bảng đó, cập nhật tới 26/08/2026
 *     (sau trận gặp Thái Lan).
 *   • Ngày sinh, nơi sinh, chiều cao, lịch sử CLB: infobox en.wikipedia + vi.wikipedia.
 *     Ngày sinh lệch giữa các nguồn -> lấy theo số đông, ghi chú ngay tại cầu thủ đó.
 *   • Ảnh: Wikimedia Commons (xem backend/public/players/CREDITS.json).
 *
 * ❓ CỐ Ý ĐỂ TRỐNG (không có nguồn mở đáng tin — thà trống còn hơn bịa):
 *   • weight_kg, preferred_foot -> null (app hiện "—")
 *   • market_value_eur -> 0 (app hiện "—"). Giá trị chuyển nhượng là ước tính
 *     của Transfermarkt, dữ liệu có bản quyền, không được thu thập tự động.
 *   • hometown là NƠI SINH theo Wikipedia (không phải quê gốc).
 *   • Lịch sử CLB chỉ có NĂM; from = 01/01, to = 31/12 là quy ước, app chỉ hiện năm.
 *     Số trận/bàn ở CLB là số trận giải VĐQG theo infobox.
 * ============================================================================
 */

export interface RealClub {
  club: string;
  from: string;
  to: string | null;
  apps: number;
  goals: number;
  is_loan: boolean;
}

export interface RealPlayer {
  full_name: string;
  short_name: string;
  birth_date: string;
  hometown: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  detailed_position: string;
  shirt_number: number | null;
  preferred_foot: 'left' | 'right' | 'both' | null;
  market_value_eur: number;
  current_club: string;
  caps: number;
  goals: number;
  /** 'Đội trưởng' | 'Phó đội trưởng' */
  role?: string;
  withdrawn_note?: string;
  photo: { file: string; credit: string; source: string } | null;
  clubs: RealClub[];
}

export const REAL_SQUAD = {
  title: 'Đội tuyển Việt Nam dự ASEAN Cup 2026',
  announced_at: '2026-06-15T03:00:00Z',
  gather_from: '2026-06-15',
  gather_to: null as string | null,
  source_url: 'https://vff.org.vn/doi-tuyen-viet-nam-quy-tu-luc-luong-manh-chuan-bi-cho-asean-cup-2026/',
  stats_as_of: '2026-08-26',

  /** 25 cầu thủ đang tập trung */
  players: [
  {
    // Q13230786 · en.wikipedia.org/wiki/Lê_Giang_Patrik
    full_name: 'Lê Giang Patrik', short_name: 'Patrik', birth_date: '1992-09-08',
    hometown: 'Lučenec, Slovakia', height_cm: 188, weight_kg: null,
    position: 'GK', detailed_position: 'Thủ môn', shirt_number: 1, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an TP.HCM',
    caps: 9, goals: 0,
    photo: { file: 'le-giang-patrik.jpg', credit: 'IQual · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Patrik_Le_Giang.jpg' },
    clubs: [
      { club: 'Žilina', from: '2011-01-01', to: '2016-12-31', apps: 7, goals: 0, is_loan: false },
      { club: 'Zemplín Michalovce', from: '2011-01-01', to: '2012-12-31', apps: 15, goals: 0, is_loan: true },
      { club: 'Žilina B', from: '2014-01-01', to: '2016-12-31', apps: 39, goals: 0, is_loan: false },
      { club: 'Sellier & Bellot Vlašim', from: '2016-01-01', to: '2019-12-31', apps: 14, goals: 0, is_loan: false },
      { club: 'Karviná', from: '2017-01-01', to: '2018-12-31', apps: 17, goals: 0, is_loan: true },
      { club: 'Prostějov', from: '2019-01-01', to: '2019-12-31', apps: 12, goals: 0, is_loan: true },
      { club: 'Bohemians 1905', from: '2019-01-01', to: '2021-12-31', apps: 50, goals: 0, is_loan: false },
      { club: 'Pohronie', from: '2022-01-01', to: '2022-12-31', apps: 14, goals: 0, is_loan: false },
      { club: 'Công an Hà Nội', from: '2023-01-01', to: '2024-12-31', apps: 8, goals: 0, is_loan: false },
      { club: 'TP. Hồ Chí Minh', from: '2023-01-01', to: '2024-12-31', apps: 30, goals: 0, is_loan: true },
      { club: 'Công an TP.HCM', from: '2024-01-01', to: null, apps: 43, goals: 0, is_loan: false },
    ],
  },
  {
    // Q121547778 · en.wikipedia.org/wiki/Trần_Trung_Kiên
    full_name: 'Trần Trung Kiên', short_name: 'Trung Kiên', birth_date: '2003-02-09',
    hometown: 'Pleiku, Gia Lai', height_cm: 191, weight_kg: null,
    position: 'GK', detailed_position: 'Thủ môn', shirt_number: 21, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Hoàng Anh Gia Lai',
    caps: 1, goals: 0,
    photo: { file: 'tran-trung-kien.jpg', credit: 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Tran_Trung_Kien_2025.png' },
    clubs: [
      { club: 'Hoàng Anh Gia Lai', from: '2022-01-01', to: null, apps: 56, goals: 0, is_loan: false },
      { club: 'Công an Nhân dân', from: '2022-01-01', to: '2022-12-31', apps: 0, goals: 0, is_loan: true },
      { club: 'Đồng Nai', from: '2022-01-01', to: '2022-12-31', apps: 6, goals: 0, is_loan: true },
    ],
  },
  {
    // Q5215950 · en.wikipedia.org/wiki/Đặng_Văn_Lâm
    full_name: 'Đặng Văn Lâm', short_name: 'Văn Lâm', birth_date: '1993-08-13',
    hometown: 'Moskva, Nga', height_cm: 188, weight_kg: null,
    position: 'GK', detailed_position: 'Thủ môn', shirt_number: 23, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Ninh Bình',
    caps: 48, goals: 0,
    photo: { file: 'dang-van-lam.jpg', credit: 'El Loko Foto · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:%C4%90%E1%BA%B7ng_V%C4%83n_L%C3%A2m_20191201_(cropped).jpg' },
    clubs: [
      { club: 'Hoàng Anh Gia Lai', from: '2011-01-01', to: '2013-12-31', apps: 0, goals: 0, is_loan: false },
      { club: 'Hoàng Anh Attapeu', from: '2012-01-01', to: '2012-12-31', apps: 21, goals: 0, is_loan: true },
      { club: 'Duslar Moscow', from: '2013-01-01', to: '2014-12-31', apps: 12, goals: 0, is_loan: false },
      { club: 'Rodina Moskva', from: '2014-01-01', to: '2015-12-31', apps: 12, goals: 0, is_loan: false },
      { club: 'Hải Phòng', from: '2015-01-01', to: '2019-12-31', apps: 76, goals: 0, is_loan: false },
      { club: 'Muangthong United', from: '2019-01-01', to: '2021-12-31', apps: 42, goals: 0, is_loan: false },
      { club: 'Cerezo Osaka', from: '2021-01-01', to: '2022-12-31', apps: 2, goals: 0, is_loan: false },
      { club: 'Quy Nhơn Bình Định', from: '2022-01-01', to: '2024-12-31', apps: 46, goals: 0, is_loan: false },
      { club: 'Ninh Bình', from: '2024-01-01', to: null, apps: 44, goals: 0, is_loan: false },
    ],
  },
  {
    // Q111536450 · en.wikipedia.org/wiki/Nguyễn_Văn_Vĩ
    full_name: 'Nguyễn Văn Vĩ', short_name: 'Văn Vĩ', birth_date: '1998-02-12',
    hometown: 'Yên Phong, Bắc Ninh', height_cm: 170, weight_kg: null,
    position: 'DF', detailed_position: 'Hậu vệ trái', shirt_number: 3, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Thép Xanh Nam Định',
    caps: 25, goals: 6,
    photo: { file: 'nguyen-van-vi.jpg', credit: 'Sao Thể Thao · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguyen_Van_Vi.png' },
    clubs: [
      { club: 'Hồng Lĩnh Hà Tĩnh', from: '2018-01-01', to: '2022-12-31', apps: 59, goals: 4, is_loan: false },
      { club: 'Hà Nội', from: '2022-01-01', to: '2023-12-31', apps: 23, goals: 1, is_loan: false },
      { club: 'Thép Xanh Nam Định', from: '2023-01-01', to: null, apps: 69, goals: 6, is_loan: false },
    ],
  },
  {
    // Q130752146 · en.wikipedia.org/wiki/Đinh_Quang_Kiệt
    full_name: 'Đinh Quang Kiệt', short_name: 'Quang Kiệt', birth_date: '2007-07-16',
    hometown: 'Long Hải, Bà Rịa – Vũng Tàu', height_cm: 195, weight_kg: null,
    position: 'DF', detailed_position: 'Trung vệ', shirt_number: 4, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an TP.HCM',
    caps: 1, goals: 0,
    photo: null,
    clubs: [
      { club: 'Hoàng Anh Gia Lai', from: '2024-01-01', to: '2026-12-31', apps: 33, goals: 1, is_loan: false },
      { club: 'Kon Tum', from: '2024-01-01', to: '2024-12-31', apps: 0, goals: 0, is_loan: true },
      { club: 'Long An', from: '2024-01-01', to: '2025-12-31', apps: 5, goals: 0, is_loan: true },
      { club: 'Công an TP.HCM', from: '2026-01-01', to: null, apps: 0, goals: 0, is_loan: false },
    ],
  },
  {
    // Q29311086 · en.wikipedia.org/wiki/Đoàn_Văn_Hậu
    full_name: 'Đoàn Văn Hậu', short_name: 'Văn Hậu', birth_date: '1999-04-19',
    hometown: 'Hưng Hà, Thái Bình', height_cm: 185, weight_kg: null,
    position: 'DF', detailed_position: 'Hậu vệ trái', shirt_number: 5, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an Hà Nội',
    caps: 47, goals: 2,
    photo: { file: 'doan-van-hau.jpg', credit: 'Amir Ostovari · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:DOAN_VAN_HAU_-_VIE_vs_JPN_-_AFC_ASIAN_CUP_2019.jpg' },
    clubs: [
      { club: 'Hà Nội B', from: '2015-01-01', to: '2016-12-31', apps: 17, goals: 2, is_loan: false },
      { club: 'Hà Nội', from: '2017-01-01', to: '2023-12-31', apps: 70, goals: 8, is_loan: false },
      { club: 'Heerenveen', from: '2019-01-01', to: '2020-12-31', apps: 0, goals: 0, is_loan: true },
      { club: 'Công an Hà Nội', from: '2023-01-01', to: null, apps: 32, goals: 1, is_loan: false },
    ],
  },
  {
    // Q130261393 · en.wikipedia.org/wiki/Nguyễn_Nhật_Minh
    // ⚠️ Ngày sinh: Wikidata ghi 01/01 (giá trị giữ chỗ) — lấy theo infobox en/vi và bảng đội hình
    full_name: 'Nguyễn Nhật Minh', short_name: 'Nhật Minh', birth_date: '2003-07-27',
    hometown: 'Hải Phòng', height_cm: 178, weight_kg: null,
    position: 'DF', detailed_position: 'Trung vệ', shirt_number: 6, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an TP.HCM',
    caps: 4, goals: 0,
    photo: { file: 'nguyen-nhat-minh.jpg', credit: 'Sao Thể Thao · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguyen_Nhat_Minh_in_2025.png' },
    clubs: [
      { club: 'Hoàng Anh Gia Lai', from: '2022-01-01', to: '2022-12-31', apps: 1, goals: 0, is_loan: false },
      { club: 'Hải Phòng', from: '2023-01-01', to: '2026-12-31', apps: 59, goals: 0, is_loan: false },
      { club: 'Long An', from: '2023-01-01', to: '2023-12-31', apps: 7, goals: 1, is_loan: true },
      { club: 'Công an TP.HCM', from: '2026-01-01', to: null, apps: 2, goals: 0, is_loan: false },
    ],
  },
  {
    // Q24450637 · en.wikipedia.org/wiki/Phạm_Xuân_Mạnh
    // ⚠️ Ngày sinh: Bảng đội hình ghi 27/03, Wikidata 02/03 — infobox en, vi và Flashscore cùng ghi 09/02
    full_name: 'Phạm Xuân Mạnh', short_name: 'Xuân Mạnh', birth_date: '1996-02-09',
    hometown: 'Yên Thành, Nghệ An', height_cm: 175, weight_kg: null,
    position: 'DF', detailed_position: 'Hậu vệ phải', shirt_number: 7, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Hà Nội',
    caps: 34, goals: 3,
    photo: { file: 'pham-xuan-manh.jpg', credit: 'Sông Lam Nghệ An FC · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Pham_Xuan_Manh.png' },
    clubs: [
      { club: 'Sông Lam Nghệ An', from: '2015-01-01', to: '2023-12-31', apps: 127, goals: 5, is_loan: false },
      { club: 'Công an Nhân dân', from: '2015-01-01', to: '2015-12-31', apps: 13, goals: 3, is_loan: true },
      { club: 'Hà Nội', from: '2023-01-01', to: null, apps: 71, goals: 8, is_loan: false },
    ],
  },
  {
    // Q136717942 · en.wikipedia.org/wiki/Khổng_Minh_Gia_Bảo
    full_name: 'Khổng Minh Gia Bảo', short_name: 'Gia Bảo', birth_date: '2000-07-26',
    hometown: 'Ba Đình, Hà Nội', height_cm: 175, weight_kg: null,
    position: 'DF', detailed_position: 'Trung vệ', shirt_number: 11, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an TP.HCM',
    caps: 1, goals: 0,
    photo: null,
    clubs: [
      { club: 'Công an Nhân dân', from: '2018-01-01', to: '2021-12-31', apps: 8, goals: 0, is_loan: false },
      { club: 'Phù Đổng Ninh Bình', from: '2022-01-01', to: '2024-12-31', apps: 36, goals: 1, is_loan: false },
      { club: 'Quảng Nam', from: '2024-01-01', to: '2025-12-31', apps: 20, goals: 0, is_loan: false },
      { club: 'Công an TP.HCM', from: '2025-01-01', to: null, apps: 23, goals: 0, is_loan: false },
    ],
  },
  {
    // Q120400674 · en.wikipedia.org/wiki/Trương_Tiến_Anh
    full_name: 'Trương Tiến Anh', short_name: 'Tiến Anh', birth_date: '1999-04-25',
    hometown: 'Thanh Miện, Hải Dương', height_cm: 168, weight_kg: null,
    position: 'DF', detailed_position: 'Hậu vệ cánh phải', shirt_number: 15, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Ninh Bình',
    caps: 29, goals: 1,
    photo: { file: 'truong-tien-anh.jpg', credit: 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Truong_Tien_Anh_2025_(3).png' },
    clubs: [
      { club: 'Viettel B', from: '2016-01-01', to: '2017-12-31', apps: 0, goals: 0, is_loan: false },
      { club: 'Thể Công – Viettel', from: '2018-01-01', to: '2026-12-31', apps: 127, goals: 4, is_loan: false },
      { club: 'Ninh Bình', from: '2026-01-01', to: null, apps: 17, goals: 0, is_loan: false },
    ],
  },
  {
    // Q27049059 · en.wikipedia.org/wiki/Nguyễn_Thành_Chung
    full_name: 'Nguyễn Thành Chung', short_name: 'Thành Chung', birth_date: '1997-09-08',
    hometown: 'Yên Sơn, Tuyên Quang', height_cm: 181, weight_kg: null,
    position: 'DF', detailed_position: 'Trung vệ', shirt_number: 16, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Hà Nội',
    caps: 44, goals: 0,
    photo: { file: 'nguyen-thanh-chung.jpg', credit: 'Vietnam Today Tv - Việt Nam Hôm Nay · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Thanh_Chung.png' },
    clubs: [
      { club: 'Công an Nhân dân', from: '2015-01-01', to: '2015-12-31', apps: 0, goals: 0, is_loan: true },
      { club: 'Hà Nội', from: '2016-01-01', to: null, apps: 184, goals: 8, is_loan: false },
    ],
  },
  {
    // Q97159587 · en.wikipedia.org/wiki/Bùi_Hoàng_Việt_Anh
    full_name: 'Bùi Hoàng Việt Anh', short_name: 'Việt Anh', birth_date: '1999-01-01',
    hometown: 'Đông Hưng, Thái Bình', height_cm: 184, weight_kg: null,
    position: 'DF', detailed_position: 'Trung vệ', shirt_number: 20, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an Hà Nội',
    caps: 30, goals: 1,
    photo: { file: 'bui-hoang-viet-anh.jpg', credit: 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Bui_Hoang_Viet_Anh.png' },
    clubs: [
      { club: 'Hà Nội', from: '2018-01-01', to: '2023-12-31', apps: 68, goals: 7, is_loan: false },
      { club: 'Hồng Lĩnh Hà Tĩnh', from: '2018-01-01', to: '2019-12-31', apps: 33, goals: 3, is_loan: true },
      { club: 'Công an Hà Nội', from: '2023-01-01', to: null, apps: 59, goals: 6, is_loan: false },
    ],
  },
  {
    // Q111854038 · en.wikipedia.org/wiki/Phan_Tuấn_Tài
    full_name: 'Phan Tuấn Tài', short_name: 'Tuấn Tài', birth_date: '2001-01-07',
    hometown: 'Buôn Ma Thuột, Đắk Lắk', height_cm: 176, weight_kg: null,
    position: 'DF', detailed_position: 'Hậu vệ trái', shirt_number: 24, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Thể Công – Viettel',
    caps: 22, goals: 0,
    photo: { file: 'phan-tuan-tai.jpg', credit: 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Phan_Tuan_Tai.png' },
    clubs: [
      { club: 'Thể Công – Viettel', from: '2021-01-01', to: null, apps: 105, goals: 1, is_loan: false },
      { club: 'Đắk Lắk', from: '2021-01-01', to: '2022-12-31', apps: 10, goals: 0, is_loan: true },
    ],
  },
  {
    // Q121365794 · en.wikipedia.org/wiki/Lê_Phạm_Thành_Long
    full_name: 'Lê Phạm Thành Long', short_name: 'Thành Long', birth_date: '1996-06-05',
    hometown: 'Nghĩa Hành, Quảng Ngãi', height_cm: 165, weight_kg: null,
    position: 'MF', detailed_position: 'Tiền vệ phòng ngự', shirt_number: 8, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an Hà Nội',
    caps: 21, goals: 0,
    photo: { file: 'le-pham-thanh-long.jpg', credit: 'AxitTDTbenzoic · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Le_Pham_Thanh_Long_2026.jpg' },
    clubs: [
      { club: 'Hoàng Anh Gia Lai', from: '2014-01-01', to: '2020-12-31', apps: 4, goals: 0, is_loan: false },
      { club: 'Phú Yên', from: '2014-01-01', to: '2015-12-31', apps: 2, goals: 0, is_loan: true },
      { club: 'Đắk Lắk', from: '2016-01-01', to: '2017-12-31', apps: 18, goals: 0, is_loan: true },
      { club: 'Long An', from: '2017-01-01', to: '2017-12-31', apps: 13, goals: 1, is_loan: true },
      { club: 'Hải Phòng', from: '2018-01-01', to: '2019-12-31', apps: 39, goals: 4, is_loan: true },
      { club: 'Thanh Hóa', from: '2020-01-01', to: '2020-12-31', apps: 14, goals: 1, is_loan: true },
      { club: 'Thanh Hóa', from: '2021-01-01', to: '2023-12-31', apps: 53, goals: 1, is_loan: false },
      { club: 'Công an Hà Nội', from: '2023-01-01', to: null, apps: 74, goals: 4, is_loan: false },
    ],
  },
  {
    // Q60218139 · en.wikipedia.org/wiki/Đỗ_Hoàng_Hên
    full_name: 'Đỗ Hoàng Hên', short_name: 'Hoàng Hên', birth_date: '1994-05-16',
    hometown: 'São Paulo, Brasil', height_cm: 181, weight_kg: null,
    position: 'MF', detailed_position: 'Tiền vệ tấn công', shirt_number: 10, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Hà Nội',
    caps: 10, goals: 3,
    photo: { file: 'do-hoang-hen.jpg', credit: 'Thplam2004 · CC BY-SA 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:H%C3%AAndrio_with_Nam_Dinh.jpg' },
    clubs: [
      { club: 'Atlético Onubense', from: '2013-01-01', to: '2014-12-31', apps: 16, goals: 2, is_loan: false },
      { club: 'Sioni Bolnisi', from: '2015-01-01', to: '2015-12-31', apps: 9, goals: 0, is_loan: false },
      { club: 'Varzim B', from: '2017-01-01', to: '2017-12-31', apps: 11, goals: 5, is_loan: false },
      { club: 'Paços de Ferreira', from: '2017-01-01', to: '2018-12-31', apps: 5, goals: 0, is_loan: false },
      { club: 'Atlético Onubense', from: '2018-01-01', to: '2018-12-31', apps: 5, goals: 0, is_loan: false },
      { club: 'Fafe', from: '2019-01-01', to: '2019-12-31', apps: 8, goals: 0, is_loan: false },
      { club: 'Don Benito', from: '2019-01-01', to: '2020-12-31', apps: 15, goals: 0, is_loan: false },
      { club: 'Moralo', from: '2020-01-01', to: '2020-12-31', apps: 5, goals: 0, is_loan: false },
      { club: 'Calvo Sotelo', from: '2020-01-01', to: '2020-12-31', apps: 8, goals: 1, is_loan: false },
      { club: 'Topenland Bình Định', from: '2021-01-01', to: '2022-12-31', apps: 35, goals: 9, is_loan: false },
      { club: 'Thép Xanh Nam Định', from: '2023-01-01', to: '2025-12-31', apps: 48, goals: 16, is_loan: false },
      { club: 'Hà Nội', from: '2025-01-01', to: null, apps: 21, goals: 11, is_loan: false },
    ],
  },
  {
    // Q61613045 · en.wikipedia.org/wiki/Nguyễn_Hoàng_Đức
    full_name: 'Nguyễn Hoàng Đức', short_name: 'Hoàng Đức', birth_date: '1998-01-11',
    hometown: 'Cẩm Giàng, Hải Dương', height_cm: 184, weight_kg: null,
    position: 'MF', detailed_position: 'Tiền vệ trung tâm', shirt_number: 14, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Ninh Bình',
    caps: 65, goals: 2, role: 'Phó đội trưởng',
    photo: { file: 'nguyen-hoang-duc.jpg', credit: 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguyen_Hoang_Duc_in_2025.png' },
    clubs: [
      { club: 'Viettel B', from: '2015-01-01', to: '2015-12-31', apps: 5, goals: 2, is_loan: false },
      { club: 'Thể Công – Viettel', from: '2016-01-01', to: '2024-12-31', apps: 152, goals: 26, is_loan: false },
      { club: 'Ninh Bình', from: '2024-01-01', to: null, apps: 41, goals: 10, is_loan: false },
    ],
  },
  {
    // Q98073771 · en.wikipedia.org/wiki/Nguyễn_Hai_Long
    // ⚠️ Ngày sinh: Wikidata ghi 17/08 — infobox en, vi và bảng đội hình cùng ghi 27/08
    full_name: 'Nguyễn Hai Long', short_name: 'Hai Long', birth_date: '2000-08-27',
    hometown: 'Tiên Yên, Quảng Ninh', height_cm: null, weight_kg: null,
    position: 'MF', detailed_position: 'Tiền vệ trung tâm', shirt_number: 18, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Hà Nội',
    caps: 25, goals: 7,
    photo: { file: 'nguyen-hai-long.jpg', credit: 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Hai_Long.png' },
    clubs: [
      { club: 'Than Quảng Ninh', from: '2020-01-01', to: '2021-12-31', apps: 18, goals: 2, is_loan: false },
      { club: 'Hà Nội', from: '2021-01-01', to: null, apps: 103, goals: 15, is_loan: false },
    ],
  },
  {
    // Q24689101 · en.wikipedia.org/wiki/Nguyễn_Quang_Hải
    full_name: 'Nguyễn Quang Hải', short_name: 'Quang Hải', birth_date: '1997-04-12',
    hometown: 'Đông Anh, Hà Nội', height_cm: 168, weight_kg: null,
    position: 'MF', detailed_position: 'Tiền vệ tấn công', shirt_number: 19, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an Hà Nội',
    caps: 88, goals: 16, role: 'Đội trưởng',
    photo: { file: 'nguyen-quang-hai.jpg', credit: 'LOTTE MART Vietnam · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:NGUYEN_QUANG_HAI.jpg' },
    clubs: [
      { club: 'Hà Nội', from: '2014-01-01', to: '2022-12-31', apps: 127, goals: 31, is_loan: false },
      { club: 'Hà Nội (2011)', from: '2015-01-01', to: '2015-12-31', apps: 13, goals: 4, is_loan: true },
      { club: 'Pau', from: '2022-01-01', to: '2023-12-31', apps: 13, goals: 1, is_loan: false },
      { club: 'Pau B', from: '2023-01-01', to: '2023-12-31', apps: 7, goals: 0, is_loan: false },
      { club: 'Công an Hà Nội', from: '2023-01-01', to: null, apps: 81, goals: 15, is_loan: false },
    ],
  },
  {
    // Q124799272 · en.wikipedia.org/wiki/Nguyễn_Ngọc_Mỹ
    // ⚠️ Ngày sinh: Bảng đội hình ghi 20/04 — infobox en, vi và Wikidata cùng ghi 20/02
    full_name: 'Nguyễn Ngọc Mỹ', short_name: 'Ngọc Mỹ', birth_date: '2004-02-20',
    hometown: 'Nghi Sơn, Thanh Hóa', height_cm: 177, weight_kg: null,
    position: 'MF', detailed_position: 'Tiền vệ cánh', shirt_number: 25, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Ninh Bình',
    caps: 0, goals: 0,
    photo: { file: 'nguyen-ngoc-my.jpg', credit: 'AxitTDTbenzoic · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguyen_Ngoc_My.jpg' },
    clubs: [
      { club: 'Đông Á Thanh Hóa', from: '2022-01-01', to: '2026-12-31', apps: 38, goals: 6, is_loan: false },
      { club: 'Phú Thọ', from: '2023-01-01', to: '2023-12-31', apps: 9, goals: 1, is_loan: true },
      { club: 'Trường Tươi Bình Phước', from: '2023-01-01', to: '2024-12-31', apps: 16, goals: 0, is_loan: true },
      { club: 'Ninh Bình', from: '2026-01-01', to: null, apps: 2, goals: 1, is_loan: false },
    ],
  },
  {
    // Q109430363 · en.wikipedia.org/wiki/Lê_Văn_Đô
    full_name: 'Lê Văn Đô', short_name: 'Văn Đô', birth_date: '2001-08-07',
    hometown: 'Tam Kỳ, Quảng Nam', height_cm: 173, weight_kg: null,
    position: 'MF', detailed_position: 'Tiền vệ cánh', shirt_number: 26, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an Hà Nội',
    caps: 3, goals: 0,
    photo: { file: 'le-van-do.jpg', credit: 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Le_Van_Do.png' },
    clubs: [
      { club: 'PVF-CAND', from: '2019-01-01', to: '2024-12-31', apps: 40, goals: 5, is_loan: false },
      { club: 'SHB Đà Nẵng', from: '2021-01-01', to: '2022-12-31', apps: 3, goals: 0, is_loan: true },
      { club: 'Công an Hà Nội', from: '2023-01-01', to: '2023-12-31', apps: 16, goals: 3, is_loan: true },
      { club: 'Công an Hà Nội', from: '2024-01-01', to: null, apps: 48, goals: 5, is_loan: false },
    ],
  },
  {
    // Q121608659 · en.wikipedia.org/wiki/Nguyễn_Đình_Bắc
    full_name: 'Nguyễn Đình Bắc', short_name: 'Đình Bắc', birth_date: '2004-08-19',
    hometown: 'Hưng Nguyên, Nghệ An', height_cm: 179, weight_kg: null,
    position: 'FW', detailed_position: 'Tiền đạo cánh', shirt_number: 9, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an Hà Nội',
    caps: 22, goals: 8,
    photo: { file: 'nguyen-dinh-bac.jpg', credit: 'Sao Thể Thao · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguy%E1%BB%85n_%C4%90%C3%ACnh_B%E1%BA%AFc.png' },
    clubs: [
      { club: 'Quảng Nam B', from: '2022-01-01', to: '2022-12-31', apps: 9, goals: 6, is_loan: false },
      { club: 'Quảng Nam', from: '2022-01-01', to: '2024-12-31', apps: 25, goals: 10, is_loan: false },
      { club: 'Công an Hà Nội', from: '2024-01-01', to: null, apps: 40, goals: 11, is_loan: false },
    ],
  },
  {
    // Q27881412 · en.wikipedia.org/wiki/Nguyễn_Xuân_Son
    full_name: 'Nguyễn Xuân Son', short_name: 'Xuân Son', birth_date: '1997-03-30',
    hometown: 'Pirapemas, Brasil', height_cm: 185, weight_kg: null,
    position: 'FW', detailed_position: 'Tiền đạo cắm', shirt_number: 12, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Thép Xanh Nam Định',
    caps: 17, goals: 16, role: 'Phó đội trưởng',
    photo: { file: 'nguyen-xuan-son.jpg', credit: 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguyen_Xuan_Son_vs_Singapore_2024.png' },
    clubs: [
      { club: 'Vitória', from: '2015-01-01', to: '2018-12-31', apps: 12, goals: 1, is_loan: false },
      { club: 'Vegalta Sendai', from: '2018-01-01', to: '2018-12-31', apps: 0, goals: 0, is_loan: true },
      { club: 'Vegalta Sendai', from: '2018-01-01', to: '2019-12-31', apps: 0, goals: 0, is_loan: false },
      { club: 'Næstved', from: '2019-01-01', to: '2020-12-31', apps: 24, goals: 5, is_loan: false },
      { club: 'Nam Định', from: '2020-01-01', to: '2020-12-31', apps: 18, goals: 6, is_loan: false },
      { club: 'SHB Đà Nẵng', from: '2020-01-01', to: '2021-12-31', apps: 12, goals: 6, is_loan: false },
      { club: 'Bình Định', from: '2021-01-01', to: '2023-12-31', apps: 39, goals: 21, is_loan: false },
      { club: 'Nam Định', from: '2023-01-01', to: null, apps: 45, goals: 45, is_loan: false },
    ],
  },
  {
    // Q101989106 · en.wikipedia.org/wiki/Nguyễn_Tài_Lộc
    full_name: 'Nguyễn Tài Lộc', short_name: 'Tài Lộc', birth_date: '1994-04-14',
    hometown: 'Governador Valadares, Brasil', height_cm: 188, weight_kg: null,
    position: 'FW', detailed_position: 'Tiền đạo', shirt_number: 13, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Ninh Bình',
    caps: 8, goals: 0,
    photo: null,
    clubs: [
      { club: 'Primavera', from: '2014-01-01', to: '2016-12-31', apps: 23, goals: 3, is_loan: false },
      { club: 'Grêmio Prudente', from: '2016-01-01', to: '2016-12-31', apps: 17, goals: 3, is_loan: false },
      { club: 'Matonense', from: '2017-01-01', to: '2017-12-31', apps: 15, goals: 1, is_loan: false },
      { club: 'Primavera', from: '2017-01-01', to: '2017-12-31', apps: 5, goals: 1, is_loan: false },
      { club: 'São Carlos', from: '2018-01-01', to: '2018-12-31', apps: 12, goals: 3, is_loan: false },
      { club: 'Penapolense', from: '2018-01-01', to: '2018-12-31', apps: 0, goals: 0, is_loan: false },
      { club: 'Maringá', from: '2019-01-01', to: '2019-12-31', apps: 12, goals: 1, is_loan: false },
      { club: 'Sài Gòn', from: '2019-01-01', to: '2020-12-31', apps: 33, goals: 12, is_loan: false },
      { club: 'Hà Nội', from: '2020-01-01', to: '2021-12-31', apps: 11, goals: 6, is_loan: false },
      { club: 'Thể Công – Viettel', from: '2021-01-01', to: '2023-12-31', apps: 25, goals: 9, is_loan: false },
      { club: 'Công an Hà Nội', from: '2023-01-01', to: '2024-12-31', apps: 24, goals: 2, is_loan: false },
      { club: 'Hồng Lĩnh Hà Tĩnh', from: '2024-01-01', to: '2025-12-31', apps: 20, goals: 6, is_loan: false },
      { club: 'Ninh Bình', from: '2025-01-01', to: null, apps: 23, goals: 9, is_loan: false },
    ],
  },
  {
    // Q135967241 · en.wikipedia.org/wiki/Phạm_Gia_Hưng
    full_name: 'Phạm Gia Hưng', short_name: 'Gia Hưng', birth_date: '2000-04-26',
    hometown: 'Đắk Lắk', height_cm: 181, weight_kg: null,
    position: 'FW', detailed_position: 'Tiền đạo cắm', shirt_number: 17, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Ninh Bình',
    caps: 6, goals: 0,
    photo: null,
    clubs: [
      { club: 'Đắk Lắk', from: '2020-01-01', to: '2022-12-31', apps: 23, goals: 5, is_loan: false },
      { club: 'Kon Tum', from: '2020-01-01', to: '2020-12-31', apps: 11, goals: 4, is_loan: true },
      { club: 'Công an Hà Nội', from: '2023-01-01', to: '2024-12-31', apps: 9, goals: 0, is_loan: false },
      { club: 'PVF-CAND', from: '2023-01-01', to: '2023-12-31', apps: 4, goals: 0, is_loan: true },
      { club: 'Ninh Bình', from: '2025-01-01', to: null, apps: 36, goals: 11, is_loan: false },
    ],
  },
  {
    // Q109441331 · en.wikipedia.org/wiki/Nguyễn_Trần_Việt_Cường
    // ⚠️ Ngày sinh: Wikidata ghi 01/01 (giá trị giữ chỗ) — lấy theo infobox en/vi và bảng đội hình
    full_name: 'Nguyễn Trần Việt Cường', short_name: 'Việt Cường', birth_date: '2000-12-27',
    hometown: 'Tân Uyên, Bình Dương', height_cm: 180, weight_kg: null,
    position: 'FW', detailed_position: 'Tiền đạo cánh', shirt_number: 22, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Becamex TP.HCM',
    caps: 5, goals: 0,
    photo: { file: 'nguyen-tran-viet-cuong.jpg', credit: 'Báo Sài Gòn Giải Phóng · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Tran_viet_cuong.png' },
    clubs: [
      { club: 'Becamex TP.HCM', from: '2017-01-01', to: null, apps: 103, goals: 15, is_loan: false },
    ],
  },
  ] as RealPlayer[],

  /** Có tên trong danh sách 28 người ban đầu nhưng rút lui vì chấn thương */
  withdrawn: [
  {
    // Q19281994 · en.wikipedia.org/wiki/Đỗ_Duy_Mạnh
    full_name: 'Đỗ Duy Mạnh', short_name: 'Duy Mạnh', birth_date: '1996-09-29',
    hometown: 'Đông Anh, Hà Nội, Việt Nam', height_cm: 180, weight_kg: null,
    position: 'DF', detailed_position: 'Trung vệ', shirt_number: null, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Hà Nội',
    caps: 73, goals: 2, withdrawn_note: 'Rút lui vì chấn thương',
    photo: { file: 'do-duy-manh.jpg', credit: 'El Loko Foto · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:%C4%90%E1%BB%97_Duy_M%E1%BA%A1nh_20191201_(cropped).jpg' },
    clubs: [
      { club: 'Hà Nội', from: '2015-01-01', to: null, apps: 194, goals: 8, is_loan: false },
    ],
  },
  {
    // Q86009149 · en.wikipedia.org/wiki/Lê_Ngọc_Bảo
    // ⚠️ Ngày sinh: vi.wikipedia ghi 29/03 — infobox en và bảng gọi gần đây cùng ghi 27/03
    full_name: 'Lê Ngọc Bảo', short_name: 'Ngọc Bảo', birth_date: '1998-03-27',
    hometown: 'Tuy Hòa, Phú Yên', height_cm: 178, weight_kg: null,
    position: 'DF', detailed_position: 'Trung vệ', shirt_number: null, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Ninh Bình',
    caps: 4, goals: 0, withdrawn_note: 'Rút lui vì chấn thương',
    photo: { file: 'le-ngoc-bao.jpg', credit: 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Le_Ngoc_Bao.png' },
    clubs: [
      { club: 'Than Quảng Ninh', from: '2016-01-01', to: '2017-12-31', apps: 0, goals: 0, is_loan: false },
      { club: 'Cần Thơ', from: '2017-01-01', to: '2018-12-31', apps: 25, goals: 0, is_loan: false },
      { club: 'Phố Hiến', from: '2019-01-01', to: '2021-12-31', apps: 28, goals: 0, is_loan: false },
      { club: 'Quy Nhơn Bình Định', from: '2022-01-01', to: '2024-12-31', apps: 38, goals: 1, is_loan: false },
      { club: 'Thép Xanh Nam Định', from: '2024-01-01', to: '2024-12-31', apps: 9, goals: 0, is_loan: true },
      { club: 'Ninh Bình', from: '2024-01-01', to: null, apps: 17, goals: 0, is_loan: false },
      { club: 'PVF-CAND', from: '2024-01-01', to: '2025-12-31', apps: 14, goals: 0, is_loan: true },
    ],
  },
  {
    // Q113005949 · en.wikipedia.org/wiki/Khuất_Văn_Khang
    full_name: 'Khuất Văn Khang', short_name: 'Văn Khang', birth_date: '2003-05-11',
    hometown: 'Phúc Thọ, Hà Nội', height_cm: 168, weight_kg: null,
    position: 'MF', detailed_position: 'Tiền vệ cánh', shirt_number: null, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Thể Công – Viettel',
    caps: 23, goals: 1, withdrawn_note: 'Rút lui vì chấn thương',
    photo: { file: 'khuat-van-khang.jpg', credit: 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Khuat_Van_Khang_2025.png' },
    clubs: [
      { club: 'Thể Công – Viettel', from: '2022-01-01', to: null, apps: 79, goals: 12, is_loan: false },
    ],
  },
  {
    // Q125643750 · en.wikipedia.org/wiki/Ngô_Đăng_Khoa
    full_name: 'Ngô Đăng Khoa', short_name: 'Đăng Khoa', birth_date: '2006-06-30',
    hometown: 'Perth, Úc', height_cm: 165, weight_kg: null,
    position: 'MF', detailed_position: 'Tiền đạo cánh', shirt_number: null, preferred_foot: null,
    market_value_eur: 0, current_club: 'CLB Công an TP.HCM',
    caps: 0, goals: 0, withdrawn_note: 'Rút lui vì chấn thương',
    photo: { file: 'ngo-dang-khoa.jpg', credit: 'AxitTDTbenzoic · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Khoa_Ngo.jpg' },
    clubs: [
      { club: 'Perth Glory NPL', from: '2022-01-01', to: '2024-12-31', apps: 45, goals: 13, is_loan: false },
      { club: 'Perth Glory', from: '2024-01-01', to: '2026-12-31', apps: 26, goals: 1, is_loan: false },
      { club: 'Công an TP.HCM', from: '2026-01-01', to: '2026-12-31', apps: 11, goals: 3, is_loan: true },
      { club: 'Công an TP.HCM', from: '2026-01-01', to: null, apps: 2, goals: 0, is_loan: false },
    ],
  },
  ] as RealPlayer[],

  lineup: {
    /**
     * Đội hình RA SÂN gần nhất: chung kết lượt về ASEAN Cup 2026, Việt Nam 2–2 Thái Lan
     * (Mỹ Đình, 26/08/2026 — Việt Nam vô địch, tổng tỷ số 4–2). Nguồn: en.wikipedia
     * "2026 ASEAN Championship final", trích biên bản chiến thuật của AFF.
     * Toạ độ: x 0 (cánh trái) -> 100 (cánh phải), y 0 (khung thành nhà) -> 100.
     */
    source: 'Chung kết lượt về ASEAN Cup 2026 · Việt Nam 2–2 Thái Lan · 26/08/2026',
    formation: '3-4-3',
    starting: [
      { full_name: 'Lê Giang Patrik', x: 50, y: 6 },
      { full_name: 'Đoàn Văn Hậu', x: 27, y: 26 },
      { full_name: 'Nguyễn Thành Chung', x: 50, y: 24 },
      { full_name: 'Phạm Xuân Mạnh', x: 73, y: 26 },
      { full_name: 'Nguyễn Văn Vĩ', x: 12, y: 55 },
      { full_name: 'Nguyễn Hoàng Đức', x: 38, y: 50, captain: true },
      { full_name: 'Lê Phạm Thành Long', x: 62, y: 50 },
      { full_name: 'Trương Tiến Anh', x: 88, y: 55 },
      { full_name: 'Nguyễn Đình Bắc', x: 22, y: 80 },
      { full_name: 'Nguyễn Xuân Son', x: 50, y: 88 },
      { full_name: 'Đỗ Hoàng Hên', x: 78, y: 80 },
    ] as Array<{ full_name: string; x: number; y: number; captain?: boolean }>,
  },
};
