-- ============================================================================
-- 010 — CỘT PHỤC VỤ DỮ LIỆU TRẬN ĐẤU THẬT
-- ============================================================================
--
-- Dữ liệu trận mẫu cũ không bao giờ gặp ba tình huống dưới đây. Trận thật thì có:
--
-- 1. matches.note — thông tin mà tỷ số một mình KỂ SAI.
--    Ví dụ Malaysia – Việt Nam 10/06/2025: tỷ số chính thức 0-3 (AFC xử thua vì
--    Malaysia dùng cầu thủ nhập tịch giả giấy tờ), nhưng trên sân Malaysia thắng
--    4-0. Không có ghi chú, người xem tưởng Việt Nam thắng trận đó.
--
-- 2. matches.kickoff_time_tbd — đã có NGÀY nhưng chưa công bố GIỜ.
--    Các trận VCK Asian Cup 2027 mới có lịch ngày. Lưu một giờ tạm thì app sẽ
--    hiện "00:00" hay "12:00" như thật — sai. Cờ này bảo app hiện "chưa có giờ".
--    Khi cờ bật, kickoff_at để 12:00 giờ VN để NGÀY không lệch theo múi giờ.
--
-- 3. match_events.player_label — người ghi bàn KHÔNG có trong bảng players
--    (cầu thủ đối thủ, cầu thủ đá phản lưới nhà). Trước đây sự kiện chỉ hiện tên
--    khi gắn player_id, nên bàn của đối thủ hiện trơ trọi "Bàn thắng".
-- ============================================================================

ALTER TABLE matches ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS kickoff_time_tbd BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS player_label VARCHAR(120);
