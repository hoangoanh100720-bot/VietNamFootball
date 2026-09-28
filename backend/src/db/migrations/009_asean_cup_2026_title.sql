-- ============================================================================
-- 009 — CHỨC VÔ ĐỊCH ASEAN CUP 2026 (chức vô địch Đông Nam Á thứ TƯ)
-- ============================================================================
--
-- 🐛 PHÁT HIỆN KHI RÀ SOÁT 28/09/2026: app hiện "3 lần vô địch" ở trang chủ và
-- tủ danh hiệu, thành tích mới nhất vẫn là ASEAN Cup 2024 — trong khi danh sách
-- cầu thủ đã là đội hình thật dự ASEAN Cup 2026. Hai phần của app nói ngược nhau.
--
-- 📚 NGUỒN: en.wikipedia "2026 ASEAN Championship final" — chung kết hai lượt:
--   lượt đi 22/08/2026  Thái Lan 0–2 Việt Nam   (SVĐ Rajamangala, Bangkok)
--   lượt về 26/08/2026  Việt Nam 2–2 Thái Lan   (SVĐ Mỹ Đình, Hà Nội)
--   Tổng tỷ số 4–2: chức vô địch thứ tư, lần đầu bảo vệ thành công ngôi vương.
--
-- Số "lần vô địch" trên app được ĐẾM từ bảng achievements (team.service.ts),
-- nên chỉ cần thêm một dòng là huy hiệu, tủ danh hiệu và trợ lý AI (tool
-- get_team_achievements) cùng đúng — không phải sửa số ở từng nơi.
--
-- Mọi câu lệnh đều chạy lại được nhiều lần mà không nhân đôi dữ liệu.
-- ============================================================================

-- 1. Thành tích của đội tuyển
INSERT INTO achievements (team_id, competition, edition_year, result, title, description, host, is_highlight)
SELECT t.id, 'ASEAN Cup', 2026, 'champion', 'Vô địch ASEAN Cup 2026',
       'Thắng Thái Lan với tổng tỷ số 4-2 sau hai lượt chung kết (2-0 tại Bangkok, 2-2 tại Mỹ Đình) — lần đầu bảo vệ thành công ngôi vô địch Đông Nam Á.',
       'Đông Nam Á', TRUE
FROM teams t
WHERE t.fifa_code = 'VIE'
ON CONFLICT (team_id, competition, edition_year) DO NOTHING;

-- 2. Thành tích của HLV Kim Sang-sik (mới nhất đứng đầu danh sách)
UPDATE coaches
SET achievements = '["Vô địch ASEAN Cup 2026 cùng đội tuyển Việt Nam"]'::jsonb || COALESCE(achievements, '[]'::jsonb)
WHERE full_name = 'Kim Sang-sik'
  AND NOT (COALESCE(achievements, '[]'::jsonb) @> '["Vô địch ASEAN Cup 2026 cùng đội tuyển Việt Nam"]'::jsonb);

-- 3. Đoạn giới thiệu ở tab Giới thiệu
UPDATE team_profiles
SET intro_text = REPLACE(intro_text, 'từng ba lần vô địch', 'từng bốn lần vô địch')
WHERE intro_text LIKE '%từng ba lần vô địch%';

-- 4. Slide giới thiệu sau màn khởi động
UPDATE onboarding_slides
SET body = 'Bốn lần vô địch Đông Nam Á (2008, 2018, 2024, 2026) và hai lần vào tứ kết Asian Cup (2007, 2019).'
WHERE body = 'Ba lần vô địch Đông Nam Á (2008, 2018, 2024) và hai lần vào tứ kết Asian Cup (2007, 2019).';

-- 5. Tài liệu lịch sử trong kho tri thức
UPDATE kb_documents
SET title = 'Bốn chức vô địch Đông Nam Á của đội tuyển Việt Nam',
    body  = 'Đội tuyển Việt Nam vô địch Đông Nam Á bốn lần. Năm 2008 là chức vô địch đầu tiên trong lịch sử. '
         || 'Năm 2018, đội tuyển vô địch sau mười năm chờ đợi. Năm 2024, đội tuyển vô địch ASEAN Cup sau khi '
         || 'thắng Thái Lan ở hai lượt chung kết. Năm 2026, đội tuyển bảo vệ thành công ngôi vô địch, lại thắng '
         || 'Thái Lan với tổng tỷ số 4-2. Ngoài ra đội tuyển hai lần vào tứ kết Asian Cup, năm 2007 '
         || 'khi là một trong các nước chủ nhà và năm 2019 tại UAE.'
WHERE title = 'Ba chức vô địch Đông Nam Á của đội tuyển Việt Nam';
