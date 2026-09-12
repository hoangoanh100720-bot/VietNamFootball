-- ===========================================================================
-- MIGRATION 005 — VIEW TỔNG HỢP BỎ QUA SỰ KIỆN ĐÃ BỊ XOÁ
-- ===========================================================================
--
-- VÌ SAO CẦN FILE NÀY?
-- View v_player_match_summary được tạo ở migration 002, lúc đó bảng match_events
-- chưa có cột is_deleted (cột này thêm ở 003 để xoá MỀM sự kiện khi nhà cung cấp
-- huỷ một bàn thắng sau khi xem VAR).
--
-- Nếu không lọc is_deleted, một bàn thắng đã bị VAR huỷ vẫn được tính vào sơ đồ
-- đội hình và vào điểm cầu thủ -> sai số liệu. Thay vì sửa file 002 (file đã chạy
-- trên máy người khác và trên server, sửa lại là phá nguyên tắc migration),
-- ta thêm một migration mới ghi đè định nghĩa view.
-- ===========================================================================

CREATE OR REPLACE VIEW v_player_match_summary AS
SELECT
  pms.match_id,
  pms.player_id,
  pms.team_id,
  pms.rating,
  pms.rating_source,
  pms.is_motm,
  pms.minutes_played,
  COUNT(*) FILTER (WHERE e.type IN ('goal','penalty') AND e.player_id = pms.player_id)  AS goals,
  COUNT(*) FILTER (WHERE e.type = 'goal' AND e.assist_player_id = pms.player_id)        AS assists,
  COALESCE(
    jsonb_agg(jsonb_build_object('type', e.type, 'minute', e.minute) ORDER BY e.minute)
      FILTER (WHERE e.type IN ('yellow_card','second_yellow','red_card')
              AND e.player_id = pms.player_id),
    '[]'::jsonb)                                                                        AS cards,
  MIN(e.minute) FILTER (WHERE e.type = 'substitution' AND e.player_id = pms.player_id)         AS subbed_in_at,
  MIN(e.minute) FILTER (WHERE e.type = 'substitution' AND e.related_player_id = pms.player_id) AS subbed_out_at
FROM player_match_stats pms
LEFT JOIN match_events e
       ON e.match_id = pms.match_id
      -- ⭐ Điểm khác biệt so với 002: bỏ qua sự kiện đã bị xoá mềm
      AND NOT e.is_deleted
      AND (e.player_id = pms.player_id
           OR e.assist_player_id = pms.player_id
           OR e.related_player_id = pms.player_id)
GROUP BY pms.match_id, pms.player_id, pms.team_id, pms.rating,
         pms.rating_source, pms.is_motm, pms.minutes_played;
