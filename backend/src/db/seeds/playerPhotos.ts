/**
 * ============================================================================
 * DB/SEEDS/PLAYERPHOTOS.TS — ẢNH CHÂN DUNG CẦU THỦ & HLV
 * ============================================================================
 *
 * Nguồn: Wikimedia Commons (giấy phép tự do), khớp đúng người qua hồ sơ
 * Wikidata — xem giải thích đầy đủ ở migrations/008_player_photos.sql và danh
 * sách nguồn gốc từng ảnh ở backend/public/players/CREDITS.json.
 *
 * ⚠️ Giữ KHỚP với migration 008: migration sửa database ĐANG CHẠY, còn file
 * này cho database dựng MỚI (seed chạy sau migration, lúc migration chạy thì
 * bảng còn rỗng nên các câu UPDATE trong đó không chạm được dòng nào).
 *
 * Cầu thủ không có trong danh sách = chưa có ảnh tự do -> app hiện chữ viết tắt.
 * ============================================================================
 */

export interface SeedPhoto {
  table: 'players' | 'coaches';
  full_name: string;
  /** Tên file trong backend/public/players, phục vụ qua /static/players/<file> */
  file: string;
  /** Dòng ghi công bắt buộc của giấy phép CC BY: tác giả · giấy phép · nơi lưu */
  credit: string;
  source: string;
}

export const PLAYER_PHOTOS: SeedPhoto[] = [
  { table: 'players', full_name: 'Nguyễn Filip', file: 'nguyen-filip.jpg', credit: 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguyen_Filip_in_2025.png' },
  { table: 'players', full_name: 'Đặng Văn Lâm', file: 'dang-van-lam.jpg', credit: 'El Loko Foto · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:%C4%90%E1%BA%B7ng_V%C4%83n_L%C3%A2m_20191201_(cropped).jpg' },
  { table: 'players', full_name: 'Đỗ Duy Mạnh', file: 'do-duy-manh.jpg', credit: 'El Loko Foto · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:%C4%90%E1%BB%97_Duy_M%E1%BA%A1nh_20191201_(cropped).jpg' },
  { table: 'players', full_name: 'Nguyễn Thanh Bình', file: 'nguyen-thanh-binh.jpg', credit: 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguyen_Thanh_Binh.png' },
  { table: 'players', full_name: 'Bùi Hoàng Việt Anh', file: 'bui-hoang-viet-anh.jpg', credit: 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Bui_Hoang_Viet_Anh.png' },
  { table: 'players', full_name: 'Bùi Tiến Dũng', file: 'bui-tien-dung.jpg', credit: 'Viettel Telecom · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Bui_tien_dung_1995.png' },
  { table: 'players', full_name: 'Nguyễn Thành Chung', file: 'nguyen-thanh-chung.jpg', credit: 'Vietnam Today Tv - Việt Nam Hôm Nay · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Thanh_Chung.png' },
  { table: 'players', full_name: 'Phan Tuấn Tài', file: 'phan-tuan-tai.jpg', credit: 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Phan_Tuan_Tai.png' },
  { table: 'players', full_name: 'Vũ Văn Thanh', file: 'vu-van-thanh.jpg', credit: 'BEE Entertainment · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Vu_Van_Thanh_2021.png' },
  { table: 'players', full_name: 'Khuất Văn Khang', file: 'khuat-van-khang.jpg', credit: 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Khuat_Van_Khang_2025.png' },
  { table: 'players', full_name: 'Đỗ Hùng Dũng', file: 'do-hung-dung.jpg', credit: 'Timnas Indonesia · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Do_Hung_Dung_2024.png' },
  { table: 'players', full_name: 'Doãn Ngọc Tân', file: 'doan-ngoc-tan.jpg', credit: 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Doan_Ngoc_Tan_in_March_2025.png' },
  { table: 'players', full_name: 'Nguyễn Hoàng Đức', file: 'nguyen-hoang-duc.jpg', credit: 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguyen_Hoang_Duc_in_2025.png' },
  { table: 'players', full_name: 'Nguyễn Hai Long', file: 'nguyen-hai-long.jpg', credit: 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Hai_Long.png' },
  { table: 'players', full_name: 'Nguyễn Quang Hải', file: 'nguyen-quang-hai.jpg', credit: 'LOTTE MART Vietnam · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:NGUYEN_QUANG_HAI.jpg' },
  { table: 'players', full_name: 'Nguyễn Xuân Son', file: 'nguyen-xuan-son.jpg', credit: 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguyen_Xuan_Son_vs_Singapore_2024.png' },
  { table: 'players', full_name: 'Nguyễn Văn Toàn', file: 'nguyen-van-toan.jpg', credit: 'HACOM · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguyen_Van_Toan_1996.png' },
  { table: 'players', full_name: 'Nguyễn Tiến Linh', file: 'nguyen-tien-linh.jpg', credit: 'AxitTDTbenzoic · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguy%E1%BB%85n_Ti%E1%BA%BFn_Linh.jpg' },
  { table: 'players', full_name: 'Nguyễn Đình Bắc', file: 'nguyen-dinh-bac.jpg', credit: 'Sao Thể Thao · CC BY 4.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:Nguy%E1%BB%85n_%C4%90%C3%ACnh_B%E1%BA%AFc.png' },
  { table: 'coaches', full_name: 'Kim Sang-sik', file: 'kim-sang-sik.jpg', credit: 'OSEN SPORTS · CC BY 3.0 · Wikimedia Commons', source: 'https://commons.wikimedia.org/wiki/File:%EA%B9%80%EC%83%81%EC%8B%9D.jpg' },
];
