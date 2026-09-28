-- ============================================================================
-- 011 — PHẢN LƯỚI NHÀ: GHI RÕ "BÀN CHO ĐỘI NÀO"
-- ============================================================================
-- Sự kiện phản lưới nhà gắn team_id = đội của NGƯỜI đá phản lưới (vd Thái Lan).
-- Chi tiết cũ "Phản lưới nhà" vừa lặp nhãn app đã có, vừa khiến dòng
-- "Chatchai · Phản lưới · Thái Lan" dễ bị đọc thành Thái Lan được bàn.
-- Nay ghi đội HƯỞNG bàn: "Bàn cho Việt Nam".
-- (PostgreSQL không cho JOIN trong UPDATE…FROM tham chiếu bảng đang cập nhật,
--  nên điều kiện nối đội hưởng bàn đặt ở WHERE)
UPDATE match_events e
SET detail = 'Bàn cho ' || t.name
FROM matches m, teams t
WHERE e.type = 'own_goal'
  AND e.team_id IS NOT NULL
  AND e.match_id = m.id
  AND t.id = CASE WHEN m.home_team_id = e.team_id THEN m.away_team_id ELSE m.home_team_id END;
