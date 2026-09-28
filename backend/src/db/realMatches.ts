/**
 * ============================================================================
 * DB/REALMATCHES.TS — ÁP DỮ LIỆU TRẬN ĐẤU THẬT VÀO DATABASE
 * ============================================================================
 *
 * Thay toàn bộ dữ liệu TRẬN MẪU (lịch tự đặt, trận "đang đá" giả, điểm cầu thủ
 * bịa) bằng dữ liệu thật trong seeds/realMatches.ts. Các bước:
 *
 *   1. Đội tuyển: thêm/cập nhật mọi đối thủ (tên tiếng Việt, cờ).
 *   2. Xoá trận mẫu của Việt Nam. Diễn biến, thông số, đội hình theo trận, dự
 *      đoán AI… tự xoá theo (ON DELETE CASCADE). Bảng tổng hợp điểm cầu thủ
 *      (player_rating_stats) KHÔNG nối khoá ngoại với trận nên phải xoá riêng.
 *   3. Giải đấu, mùa giải, bảng xếp hạng: thay bằng bản thật.
 *   4. Trận thật + bàn thắng. 8 trận ASEAN Cup 2026 có thêm đội hình, số phút,
 *      thẻ phạt, thay người (từ biên bản).
 *   5. Bảng xếp hạng cầu thủ theo năm: CHỈ số bàn thắng (có đủ, chính xác).
 *   6. Xếp hạng FIFA + hạng cao nhất lịch sử.
 *
 * Chạy trong MỘT transaction. Gọi lại nhiều lần vẫn cho cùng kết quả.
 * ============================================================================
 */

import type { DbExecutor } from '@/config/database';
import {
  BEST_FIFA_RANK,
  FIFA_RANKING_SNAPSHOT,
  REAL_FIFA_RANKINGS,
  REAL_MATCHES,
  REAL_SEASONS,
  REAL_TEAMS,
  type RealLineupPlayer,
} from '@/db/seeds/realMatches';

/** Toạ độ trên sơ đồ sân theo vị trí trong biên bản (x: trái -> phải, y: khung thành nhà -> đối phương) */
const SLOT: Record<string, Array<[number, number]>> = {
  GK: [[50, 6]],
  CB: [[27, 26], [50, 24], [73, 26]],
  LB: [[14, 30]], RB: [[86, 30]],
  LWB: [[12, 52]], RWB: [[88, 52]],
  LM: [[12, 55]], RM: [[88, 55]],
  DM: [[50, 40]],
  CM: [[38, 50], [62, 50]],
  AM: [[50, 64]],
  LW: [[20, 78]], RW: [[80, 78]], LF: [[22, 80]], RF: [[78, 80]],
  CF: [[50, 88]], ST: [[50, 88]],
};

function formationOf(starters: RealLineupPlayer[]): string {
  const def = starters.filter((p) => ['CB', 'LB', 'RB'].includes(p.pos)).length;
  const fwd = starters.filter((p) => ['CF', 'ST', 'LF', 'RF', 'LW', 'RW'].includes(p.pos)).length;
  const mid = starters.length - 1 - def - fwd;
  return `${def}-${mid}-${fwd}`;
}

export async function applyRealMatches(db: DbExecutor): Promise<{ matches: number; events: number; lineups: number }> {
  // ---- 1. Đội tuyển ----
  for (const t of REAL_TEAMS) {
    await db.query(
      `INSERT INTO teams (name, country, logo_url, fifa_code) VALUES ($1, $1, $2, $3)
       ON CONFLICT (fifa_code) DO UPDATE SET name = EXCLUDED.name, country = EXCLUDED.country, logo_url = EXCLUDED.logo_url`,
      [t.name, t.logo_url, t.fifa_code]
    );
  }
  const { rows: teamRows } = await db.query<{ id: number; fifa_code: string }>(`SELECT id, fifa_code FROM teams`);
  const teamId = new Map(teamRows.map((r) => [r.fifa_code, r.id]));
  const VIE = teamId.get('VIE')!;

  // Cầu thủ Việt Nam tra theo họ tên (gồm cả người không còn hoạt động — họ vẫn ghi bàn ở trận cũ)
  const { rows: playerRows } = await db.query<{ id: number; full_name: string }>(
    `SELECT id, full_name FROM players WHERE team_id = $1`, [VIE]
  );
  const playerId = new Map(playerRows.map((r) => [r.full_name, r.id]));

  // ---- 2. Xoá dữ liệu mẫu ----
  await db.query(`DELETE FROM matches WHERE home_team_id = $1 OR away_team_id = $1`, [VIE]);
  await db.query(`DELETE FROM h2h_records WHERE team_a_id = $1 OR team_b_id = $1`, [VIE]);
  await db.query(`DELETE FROM player_rating_stats`);
  await db.query(`DELETE FROM competition_standings`);
  await db.query(`DELETE FROM seasons`);
  await db.query(`DELETE FROM competitions`);

  // ---- 3. Giải đấu, mùa giải, bảng xếp hạng ----
  const compId = new Map<string, number>();
  const seasonByCompetition = new Map<string, number>();
  for (const s of REAL_SEASONS) {
    if (!compId.has(s.competition_code)) {
      const { rows } = await db.query<{ id: number }>(
        `INSERT INTO competitions (code, name, type, confederation) VALUES ($1,$2,$3,$4) RETURNING id`,
        [s.competition_code, s.competition_name, s.competition_type, s.confederation]
      );
      compId.set(s.competition_code, rows[0]!.id);
    }
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO seasons (competition_id, name, start_date, end_date, is_current) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [compId.get(s.competition_code), s.name, s.start_date, s.end_date, s.is_current]
    );
    seasonByCompetition.set(s.match_competition, rows[0]!.id);
    for (const r of s.standings) {
      await db.query(
        `INSERT INTO competition_standings
           (season_id, group_name, team_id, position, played, won, drawn, lost, goals_for, goals_against, points)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [rows[0]!.id, s.group_name, teamId.get(r.fifa_code), r.position, r.played, r.won, r.drawn, r.lost,
         r.goals_for, r.goals_against, r.points]
      );
    }
  }
  // Friendlies không thuộc mùa giải nào — vẫn cần có giải để lọc được
  if (!compId.has('friendly')) {
    await db.query(`INSERT INTO competitions (code, name, type, confederation) VALUES ('friendly','Giao hữu quốc tế','friendly',NULL)`);
  }

  // ---- 4. Trận đấu + diễn biến + đội hình ----
  let events = 0;
  let lineups = 0;
  const addEvent = async (matchId: number, team: number | null, player: number | null, label: string | null,
                          minute: number, extra: number | null, type: string, detail: string | null) => {
    await db.query(
      `INSERT INTO match_events (match_id, team_id, player_id, player_label, minute, extra_minute, type, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [matchId, team, player, label, minute, extra, type, detail]
    );
    events++;
  };

  for (const m of REAL_MATCHES) {
    const finished = m.status === 'finished';
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO matches
         (competition, round, home_team_id, away_team_id, kickoff_at, kickoff_time_tbd, venue, city, status,
          home_score, away_score, attendance, is_final, finished_at, note, season_id, tv_channels, ratings_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'[]'::jsonb,'none')
       RETURNING id`,
      [m.competition, m.round, teamId.get(m.home), teamId.get(m.away), m.kickoff_at, m.kickoff_time_tbd ?? false,
       m.venue, m.city, m.status, finished ? m.home_score : 0, finished ? m.away_score : 0, m.attendance ?? null,
       m.is_final ?? false, finished ? new Date(new Date(m.kickoff_at).getTime() + 2 * 3600_000).toISOString() : null,
       m.note ?? null, seasonByCompetition.get(m.competition) ?? null]
    );
    const matchId = rows[0]!.id;

    // Bàn thắng
    for (const g of m.goals ?? []) {
      const own = g.type === 'own_goal';
      const pid = g.team === 'VIE' && !own ? playerId.get(g.player) ?? null : null;
      await addEvent(matchId, teamId.get(g.team) ?? null, pid, pid ? null : g.player,
        g.minute, g.extra ?? null, g.type,
        // Phản lưới: ghi đội HƯỞNG bàn, vì team_id là đội của người đá phản lưới
        own ? `Bàn cho ${REAL_TEAMS.find((t) => t.fifa_code === (g.team === m.home ? m.away : m.home))?.name}` : null);
    }

    if (!m.lineup) continue;

    // Thẻ phạt + thay người của Việt Nam (từ biên bản)
    for (const p of m.lineup) {
      const pid = playerId.get(p.name) ?? null;
      const label = pid ? null : p.name;
      for (const y of p.yellow ?? []) await addEvent(matchId, VIE, pid, label, y, null, 'yellow_card', null);
      for (const r of p.red ?? []) await addEvent(matchId, VIE, pid, label, r, null, 'red_card', null);
      if (p.on != null) {
        const outs = m.lineup.filter((o) => o.off === p.on);
        const ins = m.lineup.filter((o) => o.on === p.on);
        // Chỉ ghi "thay ai" khi ghép cặp chắc chắn (đúng 1 ra, 1 vào cùng phút)
        const detail = outs.length === 1 && ins.length === 1 ? `Vào thay ${outs[0]!.name}` : 'Vào sân';
        await addEvent(matchId, VIE, pid, label, p.on, null, 'substitution', detail);
      }
    }

    // Đội hình của trận + số phút thi đấu
    const starters = m.lineup.filter((p) => p.starting);
    const { rows: lu } = await db.query<{ id: number }>(
      `INSERT INTO lineups (match_id, team_id, formation, is_current) VALUES ($1,$2,$3,FALSE) RETURNING id`,
      [matchId, VIE, formationOf(starters)]
    );
    lineups++;
    const used = new Map<string, number>();
    for (const p of m.lineup) {
      const pid = playerId.get(p.name);
      if (!pid) continue; // cầu thủ không có trong DB: vẫn có sự kiện (theo tên), bỏ qua sơ đồ
      let x: number | null = null;
      let y: number | null = null;
      if (p.starting) {
        const slots = SLOT[p.pos] ?? [[50, 50]];
        const i = used.get(p.pos) ?? 0;
        used.set(p.pos, i + 1);
        [x, y] = slots[Math.min(i, slots.length - 1)]!;
      }
      await db.query(
        `INSERT INTO lineup_players (lineup_id, player_id, is_starting, position_x, position_y, shirt_number, is_captain)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [lu[0]!.id, pid, p.starting, x, y, p.shirt, p.captain ?? false]
      );
      if (p.minutes > 0) {
        // Chỉ ghi SỐ PHÚT — mọi chỉ số khác để NULL (không có nguồn), không để mặc định 0
        await db.query(
          `INSERT INTO player_match_stats
             (match_id, player_id, team_id, minutes_played, rating, rating_source, is_motm,
              shots, shots_on_target, key_passes, passes, pass_accuracy_pct, tackles, interceptions, saves, goals_conceded)
           VALUES ($1,$2,$3,$4,NULL,NULL,FALSE,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)`,
          [matchId, pid, VIE, p.minutes]
        );
      }
    }
  }

  // ---- 5. Vua phá lưới theo năm (chỉ bàn thắng — dữ liệu đầy đủ, chính xác) ----
  await db.query(
    `INSERT INTO player_rating_stats (period_type, period_key, player_id, matches, minutes, avg_rating, goals)
     SELECT 'year', EXTRACT(YEAR FROM m.kickoff_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int::text, e.player_id, 0, 0, NULL, COUNT(*)
     FROM match_events e
     JOIN matches m ON m.id = e.match_id
     WHERE e.type IN ('goal','penalty') AND e.player_id IS NOT NULL AND e.team_id = $1
     GROUP BY 2, e.player_id`,
    [VIE]
  );

  // ---- 6. Xếp hạng FIFA ----
  await db.query(`DELETE FROM fifa_rankings`);
  for (const r of REAL_FIFA_RANKINGS) {
    const tid = teamId.get(r.fifa_code);
    if (!tid) continue;
    await db.query(
      `INSERT INTO fifa_rankings (team_id, rank, points, previous_rank, confederation, snapshot_date)
       VALUES ($1,$2,$3,$4,'AFC',$5)`,
      [tid, r.rank, r.points, r.previous_rank, FIFA_RANKING_SNAPSHOT]
    );
  }
  await db.query(
    `UPDATE team_profiles SET best_fifa_rank = $1, best_fifa_rank_date = $2 WHERE team_id = $3`,
    [BEST_FIFA_RANK.rank, BEST_FIFA_RANK.date, VIE]
  );

  return { matches: REAL_MATCHES.length, events, lineups };
}
