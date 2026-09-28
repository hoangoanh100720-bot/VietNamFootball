/**
 * ============================================================================
 * MODULES/MATCHES/MATCHES.SERVICE.TS — NGHIỆP VỤ TRẬN ĐẤU
 * ============================================================================
 *
 * BÀI HỌC SQL QUAN TRỌNG NHẤT CỦA FILE NÀY: JOIN
 *
 * Bảng `matches` chỉ lưu home_team_id = 1, away_team_id = 3. App cần TÊN đội
 * và LOGO. Hai lựa chọn:
 *
 *   CÁCH DỞ (N+1 query):
 *     1 câu lấy 20 trận, rồi mỗi trận 2 câu lấy tên đội -> 41 câu truy vấn!
 *
 *   CÁCH ĐÚNG (JOIN):
 *     1 câu duy nhất, để Postgres ghép bảng giúp.
 *
 * Vì bảng matches tham chiếu bảng teams HAI LẦN (đội nhà + đội khách), ta phải
 * JOIN bảng teams hai lần với hai BÍ DANH khác nhau: ht (home team) và at (away team).
 */

import { query } from '@/config/database';
import { cached, cacheDel } from '@/utils/cache';
import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import type { H2HSummary, MatchEvent, MatchWithTeams } from '@/types';

/**
 * Đoạn SELECT dùng chung cho mọi truy vấn trận đấu.
 * Viết một lần, dùng lại nhiều nơi -> sửa cấu trúc chỉ sửa một chỗ.
 *
 * json_build_object() gom nhiều cột thành MỘT đối tượng JSON. Nhờ đó kết quả
 * trả về đã có sẵn dạng lồng nhau { home_team: { id, name, logo_url } },
 * app mobile dùng luôn, không phải ghép tay.
 */
const MATCH_SELECT = `
  SELECT
    m.id, m.competition, m.round, m.home_team_id, m.away_team_id,
    m.kickoff_at, m.kickoff_time_tbd, m.venue, m.city, m.status, m.note,
    m.home_score, m.away_score, m.minute, m.attendance,
    m.tv_channels,  -- ['VTV5','FPT Play'] — Senior mode hiện nổi bật "Xem kênh nào?" (mục 7.3)
    json_build_object(
      'id', ht.id, 'name', ht.name, 'country', ht.country,
      'logo_url', ht.logo_url, 'fifa_code', ht.fifa_code
    ) AS home_team,
    json_build_object(
      'id', at.id, 'name', at.name, 'country', at.country,
      'logo_url', at.logo_url, 'fifa_code', at.fifa_code
    ) AS away_team
  FROM matches m
  JOIN teams ht ON ht.id = m.home_team_id
  JOIN teams at ON at.id = m.away_team_id
`;

/** Lấy id đội tuyển Việt Nam (cache 24h vì gần như không bao giờ đổi) */
export async function getVietnamTeamId(): Promise<number> {
  return cached('team:vie:id', env.CACHE_TTL_STATIC, async () => {
    const { rows } = await query<{ id: number }>(
      "SELECT id FROM teams WHERE fifa_code = 'VIE' LIMIT 1"
    );
    if (!rows[0]) throw AppError.notFound('Chưa có dữ liệu đội tuyển Việt Nam. Hãy chạy: npm run seed');
    return rows[0].id;
  });
}

/**
 * TRẬN MỚI NHẤT — ưu tiên theo thứ tự:
 *   1. Trận đang diễn ra (live)
 *   2. Trận sắp đá gần nhất
 *   3. Trận vừa đá xong gần nhất
 *
 * Đây là dữ liệu cho tấm thẻ lớn ở đầu Tab 1.
 *
 * MẸO SQL: ORDER BY dùng CASE để tự đặt "độ ưu tiên" cho từng trạng thái.
 */
export async function getLatestMatch(): Promise<MatchWithTeams | null> {
  const vie = await getVietnamTeamId();

  // TTL chỉ 15 giây vì trận live thay đổi liên tục
  return cached('match:latest', env.CACHE_TTL_LIVE, async () => {
    const { rows } = await query<MatchWithTeams>(
      `${MATCH_SELECT}
       WHERE (m.home_team_id = $1 OR m.away_team_id = $1)
       ORDER BY
         CASE m.status
           WHEN 'live' THEN 0
           WHEN 'scheduled' THEN 1
           ELSE 2
         END,
         -- Trận sắp tới: gần nhất trước. Trận đã đá: mới nhất trước.
         CASE WHEN m.status = 'scheduled' THEN m.kickoff_at END ASC,
         CASE WHEN m.status = 'finished' THEN m.kickoff_at END DESC
       LIMIT 1`,
      [vie]
    );
    return rows[0] ?? null;
  });
}

/** LỊCH THI ĐẤU SẮP TỚI (có phân trang) */
export async function getUpcomingMatches(page = 1, limit = 10) {
  const vie = await getVietnamTeamId();
  const offset = (page - 1) * limit;

  return cached(`matches:upcoming:${page}:${limit}`, 300, async () => {
    const { rows } = await query<MatchWithTeams>(
      `${MATCH_SELECT}
       WHERE (m.home_team_id = $1 OR m.away_team_id = $1)
         AND m.status IN ('scheduled', 'live')
       ORDER BY m.kickoff_at ASC
       LIMIT $2 OFFSET $3`,
      [vie, limit, offset]
    );

    // Đếm tổng để app biết còn bao nhiêu trang nữa
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM matches
       WHERE (home_team_id = $1 OR away_team_id = $1)
         AND status IN ('scheduled', 'live')`,
      [vie]
    );

    // COUNT(*) của Postgres trả kiểu BIGINT -> driver đưa về CHUỖI để không
    // mất chính xác với số cực lớn. Phải Number() thủ công.
    return { items: rows, total: Number(countRows[0]?.count ?? 0) };
  });
}

/** KẾT QUẢ CÁC TRẬN ĐÃ ĐẤU */
export async function getFinishedMatches(page = 1, limit = 10) {
  const vie = await getVietnamTeamId();
  const offset = (page - 1) * limit;

  return cached(`matches:finished:${page}:${limit}`, 600, async () => {
    const { rows } = await query<MatchWithTeams>(
      `${MATCH_SELECT}
       WHERE (m.home_team_id = $1 OR m.away_team_id = $1)
         AND m.status = 'finished'
       ORDER BY m.kickoff_at DESC
       LIMIT $2 OFFSET $3`,
      [vie, limit, offset]
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM matches
       WHERE (home_team_id = $1 OR away_team_id = $1) AND status = 'finished'`,
      [vie]
    );

    return { items: rows, total: Number(countRows[0]?.count ?? 0) };
  });
}

/** CHI TIẾT MỘT TRẬN */
export async function getMatchById(id: number): Promise<MatchWithTeams> {
  const { rows } = await query<MatchWithTeams>(`${MATCH_SELECT} WHERE m.id = $1`, [id]);
  const match = rows[0];
  if (!match) throw AppError.notFound('Không tìm thấy trận đấu này');
  return match;
}

/** DIỄN BIẾN TRẬN ĐẤU (bàn thắng, thẻ phạt, thay người) */
export async function getMatchEvents(matchId: number): Promise<MatchEvent[]> {
  const { rows } = await query<MatchEvent>(
    `SELECT e.id, e.match_id, e.team_id, e.player_id, e.minute, e.extra_minute,
            e.type, e.detail,
            -- Cầu thủ không có trong bảng players (đối thủ, người đá phản lưới)
            -- được lưu tên ở player_label — thiếu nó thì bàn của đối thủ hiện trơ
            -- trọi "Bàn thắng", không biết ai ghi, của đội nào.
            COALESCE(p.short_name, e.player_label) AS player_name,
            t.name AS team_name
     FROM match_events e
     -- LEFT JOIN: giữ lại sự kiện kể cả khi không gắn với cầu thủ nào
     -- (vd: sự kiện VAR). Nếu dùng JOIN thường thì các dòng đó bị loại bỏ.
     LEFT JOIN players p ON p.id = e.player_id
     LEFT JOIN teams t ON t.id = e.team_id
     WHERE e.match_id = $1
     -- phút bù giờ (45+2) phải đứng SAU phút 45 và TRƯỚC phút 46
     ORDER BY e.minute ASC, COALESCE(e.extra_minute, 0) ASC, e.id ASC`,
    [matchId]
  );
  return rows;
}

/** TỶ SỐ TRỰC TIẾP — dữ liệu nhẹ nhất có thể, gọi 15 giây/lần */
export async function getLiveScore(matchId: number) {
  return cached(`match:${matchId}:live`, env.CACHE_TTL_LIVE, async () => {
    const { rows } = await query<{
      id: number; status: string; home_score: number; away_score: number;
      minute: number | null; updated_at: Date;
    }>(
      `SELECT id, status, home_score, away_score, minute, updated_at
       FROM matches WHERE id = $1`,
      [matchId]
    );
    const m = rows[0];
    if (!m) throw AppError.notFound('Không tìm thấy trận đấu này');

    const events = await getMatchEvents(matchId);
    return { ...m, events };
  });
}

/**
 * LỊCH SỬ ĐỐI ĐẦU (Head-to-Head)
 *
 * Trả về thống kê THEO GÓC NHÌN CỦA ĐỘI VIỆT NAM (hoặc đội nhà nếu trận
 * không có Việt Nam).
 *
 * SQL hay ở chỗ: cùng một trận, "thắng" hay "thua" phụ thuộc ta đang đứng ở
 * đội nhà hay đội khách -> phải dùng CASE WHEN để xét cả hai chiều.
 */
export async function getHeadToHead(matchId: number): Promise<H2HSummary> {
  const match = await getMatchById(matchId);
  const vie = await getVietnamTeamId();

  // Xác định "đội ta" và "đội đối thủ"
  const teamA = match.home_team_id === vie || match.away_team_id === vie ? vie : match.home_team_id;
  const teamB = teamA === match.home_team_id ? match.away_team_id : match.home_team_id;

  return cached(`h2h:${teamA}:${teamB}`, env.CACHE_TTL_STATIC, async () => {
    const { rows: stats } = await query<{
      total: string; wins: string; draws: string; losses: string;
      goals_for: string; goals_against: string;
    }>(
      `SELECT
         COUNT(*) AS total,
         -- Thắng: (là đội nhà VÀ ghi nhiều hơn) HOẶC (là đội khách VÀ ghi nhiều hơn)
         COUNT(*) FILTER (
           WHERE (home_team_id = $1 AND home_score > away_score)
              OR (away_team_id = $1 AND away_score > home_score)
         ) AS wins,
         COUNT(*) FILTER (WHERE home_score = away_score) AS draws,
         COUNT(*) FILTER (
           WHERE (home_team_id = $1 AND home_score < away_score)
              OR (away_team_id = $1 AND away_score < home_score)
         ) AS losses,
         -- Bàn thắng ghi được: lấy cột điểm tương ứng với vị trí của đội ta
         COALESCE(SUM(CASE WHEN home_team_id = $1 THEN home_score ELSE away_score END), 0) AS goals_for,
         COALESCE(SUM(CASE WHEN home_team_id = $1 THEN away_score ELSE home_score END), 0) AS goals_against
       FROM matches
       WHERE status = 'finished'
         AND ((home_team_id = $1 AND away_team_id = $2)
           OR (home_team_id = $2 AND away_team_id = $1))`,
      [teamA, teamB]
    );

    // 5 lần gặp gần nhất, để hiển thị danh sách bên dưới phần thống kê
    const { rows: recent } = await query<MatchWithTeams>(
      `${MATCH_SELECT}
       WHERE m.status = 'finished'
         AND ((m.home_team_id = $1 AND m.away_team_id = $2)
           OR (m.home_team_id = $2 AND m.away_team_id = $1))
       ORDER BY m.kickoff_at DESC
       LIMIT 5`,
      [teamA, teamB]
    );

    const s = stats[0];
    return {
      total: Number(s?.total ?? 0),
      wins: Number(s?.wins ?? 0),
      draws: Number(s?.draws ?? 0),
      losses: Number(s?.losses ?? 0),
      goals_for: Number(s?.goals_for ?? 0),
      goals_against: Number(s?.goals_against ?? 0),
      recent,
    };
  });
}

/**
 * PHONG ĐỘ GẦN ĐÂY của một đội — dữ liệu đầu vào quan trọng cho AI dự đoán.
 * Trả về mảng dạng ['W','D','L','W','W'] (Win/Draw/Lose) và thống kê tóm tắt.
 */
export async function getRecentForm(teamId: number, limit = 5) {
  const { rows } = await query<{
    result: string; goals_for: number; goals_against: number;
    opponent: string; kickoff_at: Date; competition: string;
  }>(
    `SELECT
       CASE
         WHEN (m.home_team_id = $1 AND m.home_score > m.away_score)
           OR (m.away_team_id = $1 AND m.away_score > m.home_score) THEN 'W'
         WHEN m.home_score = m.away_score THEN 'D'
         ELSE 'L'
       END AS result,
       CASE WHEN m.home_team_id = $1 THEN m.home_score ELSE m.away_score END AS goals_for,
       CASE WHEN m.home_team_id = $1 THEN m.away_score ELSE m.home_score END AS goals_against,
       CASE WHEN m.home_team_id = $1 THEN at.name ELSE ht.name END AS opponent,
       m.kickoff_at, m.competition
     FROM matches m
     JOIN teams ht ON ht.id = m.home_team_id
     JOIN teams at ON at.id = m.away_team_id
     WHERE m.status = 'finished' AND (m.home_team_id = $1 OR m.away_team_id = $1)
     ORDER BY m.kickoff_at DESC
     LIMIT $2`,
    [teamId, limit]
  );

  return {
    form: rows.map((r) => r.result), // ['W','W','D',...] mới nhất trước
    matches: rows,
    wins: rows.filter((r) => r.result === 'W').length,
    draws: rows.filter((r) => r.result === 'D').length,
    losses: rows.filter((r) => r.result === 'L').length,
  };
}

/**
 * CẬP NHẬT TỶ SỐ — dùng bởi job polling live và socket.
 * Sau khi ghi, PHẢI xoá cache, nếu không người dùng vẫn thấy tỷ số cũ.
 */
export async function updateScore(
  matchId: number,
  data: { home_score: number; away_score: number; minute?: number; status?: string }
) {
  await query(
    `UPDATE matches
     SET home_score = $2, away_score = $3,
         minute = COALESCE($4, minute),
         status = COALESCE($5, status),
         updated_at = NOW()
     WHERE id = $1`,
    [matchId, data.home_score, data.away_score, data.minute ?? null, data.status ?? null]
  );

  await cacheDel(`match:${matchId}:*`);
  await cacheDel('match:latest');
  await cacheDel('matches:*');
}
