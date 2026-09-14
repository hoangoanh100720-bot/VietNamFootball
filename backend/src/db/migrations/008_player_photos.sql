-- ============================================================================
-- 008 — ẢNH CHÂN DUNG THẬT CỦA CẦU THỦ & HLV
-- ============================================================================
--
-- Trước đây photo_url toàn bộ là NULL -> app chỉ hiện chữ viết tắt "NH", "VL".
-- Người xem chưa biết mặt cầu thủ thì không có lý do gì để bấm vào hồ sơ.
--
-- 📷 NGUỒN ẢNH: Wikimedia Commons, giấy phép tự do (CC BY / CC BY-SA).
--    KHÔNG dùng ảnh báo chí hay ảnh VFF — có bản quyền, dùng trong app là vi phạm.
--
-- 🎯 VÌ SAO CHẮC ĐÚNG NGƯỜI?
--    Ảnh lấy từ thuộc tính "hình ảnh" (P18) của CHÍNH hồ sơ Wikidata cầu thủ
--    đó, không tìm ảnh theo tên (tên trùng rất nhiều: có hai "Nguyễn Quang Hải"
--    cùng là cầu thủ). Hồ sơ được chọn khi khớp tên + ngày sinh, hoặc tên +
--    năm sinh khi ngày sinh trong DB bị lệch (xem backend/public/players/CREDITS.json).
--
-- ⚖️ CC BY bắt buộc GHI TÊN TÁC GIẢ -> lưu photo_credit và hiện dưới ảnh ở màn
--    hồ sơ; photo_source_url dẫn về trang gốc của ảnh trên Commons.
--
-- Ảnh đã được cắt vuông lấy khuôn mặt làm tâm, lưu ở backend/public/players
-- và phục vụ qua /static (xem app.ts) — không tải thẳng từ Wikimedia vì máy
-- chủ của họ giới hạn tốc độ (HTTP 429), ảnh trong app sẽ lúc có lúc không.
--
-- 7 cầu thủ chưa có ảnh tự do nào trên Commons (Đình Triệu, Tấn Tài, Minh Trọng,
-- Ngọc Quang, Thái Sơn, Tuấn Hải, Vĩ Hào) giữ NULL -> app hiện chữ viết tắt.
-- Đoán bừa một ảnh cho họ còn tệ hơn: người xem sẽ nhận nhầm mặt.
-- ============================================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_credit TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_source_url TEXT;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS photo_credit TEXT;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS photo_source_url TEXT;

UPDATE players SET photo_url = '/static/players/nguyen-filip.jpg', photo_credit = 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Nguyen_Filip_in_2025.png' WHERE full_name = 'Nguyễn Filip';
UPDATE players SET photo_url = '/static/players/dang-van-lam.jpg', photo_credit = 'El Loko Foto · CC BY 4.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:%C4%90%E1%BA%B7ng_V%C4%83n_L%C3%A2m_20191201_(cropped).jpg' WHERE full_name = 'Đặng Văn Lâm';
UPDATE players SET photo_url = '/static/players/do-duy-manh.jpg', photo_credit = 'El Loko Foto · CC BY 4.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:%C4%90%E1%BB%97_Duy_M%E1%BA%A1nh_20191201_(cropped).jpg' WHERE full_name = 'Đỗ Duy Mạnh';
UPDATE players SET photo_url = '/static/players/nguyen-thanh-binh.jpg', photo_credit = 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Nguyen_Thanh_Binh.png' WHERE full_name = 'Nguyễn Thanh Bình';
UPDATE players SET photo_url = '/static/players/bui-hoang-viet-anh.jpg', photo_credit = 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Bui_Hoang_Viet_Anh.png' WHERE full_name = 'Bùi Hoàng Việt Anh';
UPDATE players SET photo_url = '/static/players/bui-tien-dung.jpg', photo_credit = 'Viettel Telecom · CC BY 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Bui_tien_dung_1995.png' WHERE full_name = 'Bùi Tiến Dũng';
UPDATE players SET photo_url = '/static/players/nguyen-thanh-chung.jpg', photo_credit = 'Vietnam Today Tv - Việt Nam Hôm Nay · CC BY 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Thanh_Chung.png' WHERE full_name = 'Nguyễn Thành Chung';
UPDATE players SET photo_url = '/static/players/phan-tuan-tai.jpg', photo_credit = 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Phan_Tuan_Tai.png' WHERE full_name = 'Phan Tuấn Tài';
UPDATE players SET photo_url = '/static/players/vu-van-thanh.jpg', photo_credit = 'BEE Entertainment · CC BY 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Vu_Van_Thanh_2021.png' WHERE full_name = 'Vũ Văn Thanh';
UPDATE players SET photo_url = '/static/players/khuat-van-khang.jpg', photo_credit = 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Khuat_Van_Khang_2025.png' WHERE full_name = 'Khuất Văn Khang';
UPDATE players SET photo_url = '/static/players/do-hung-dung.jpg', photo_credit = 'Timnas Indonesia · CC BY-SA 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Do_Hung_Dung_2024.png' WHERE full_name = 'Đỗ Hùng Dũng';
UPDATE players SET photo_url = '/static/players/doan-ngoc-tan.jpg', photo_credit = 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Doan_Ngoc_Tan_in_March_2025.png' WHERE full_name = 'Doãn Ngọc Tân';
UPDATE players SET photo_url = '/static/players/nguyen-hoang-duc.jpg', photo_credit = 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Nguyen_Hoang_Duc_in_2025.png' WHERE full_name = 'Nguyễn Hoàng Đức';
UPDATE players SET photo_url = '/static/players/nguyen-hai-long.jpg', photo_credit = 'Tuấn Hữu · CC BY 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Hai_Long.png' WHERE full_name = 'Nguyễn Hai Long';
UPDATE players SET photo_url = '/static/players/nguyen-quang-hai.jpg', photo_credit = 'LOTTE MART Vietnam · CC BY 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:NGUYEN_QUANG_HAI.jpg' WHERE full_name = 'Nguyễn Quang Hải';
UPDATE players SET photo_url = '/static/players/nguyen-xuan-son.jpg', photo_credit = 'Sao Thể Thao · CC BY-SA 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Nguyen_Xuan_Son_vs_Singapore_2024.png' WHERE full_name = 'Nguyễn Xuân Son';
UPDATE players SET photo_url = '/static/players/nguyen-van-toan.jpg', photo_credit = 'HACOM · CC BY 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Nguyen_Van_Toan_1996.png' WHERE full_name = 'Nguyễn Văn Toàn';
UPDATE players SET photo_url = '/static/players/nguyen-tien-linh.jpg', photo_credit = 'AxitTDTbenzoic · CC BY 4.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Nguy%E1%BB%85n_Ti%E1%BA%BFn_Linh.jpg' WHERE full_name = 'Nguyễn Tiến Linh';
UPDATE players SET photo_url = '/static/players/nguyen-dinh-bac.jpg', photo_credit = 'Sao Thể Thao · CC BY 4.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:Nguy%E1%BB%85n_%C4%90%C3%ACnh_B%E1%BA%AFc.png' WHERE full_name = 'Nguyễn Đình Bắc';
UPDATE coaches SET photo_url = '/static/players/kim-sang-sik.jpg', photo_credit = 'OSEN SPORTS · CC BY 3.0 · Wikimedia Commons', photo_source_url = 'https://commons.wikimedia.org/wiki/File:%EA%B9%80%EC%83%81%EC%8B%9D.jpg' WHERE full_name = 'Kim Sang-sik';
