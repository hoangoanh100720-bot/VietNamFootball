/**
 * ============================================================================
 * DB/SEED.TS — ĐỔ DỮ LIỆU MẪU VÀO DATABASE
 * ============================================================================
 *
 * Chạy bằng:  npm run seed
 *
 * NGUYÊN TẮC AN TOÀN CỦA FILE NÀY:
 *   1. XOÁ rồi ghi lại dữ liệu THAM CHIẾU (đội, cầu thủ, trận đấu...)
 *      -> chạy lại bao nhiêu lần cũng cho kết quả giống nhau.
 *   2. KHÔNG BAO GIỜ đụng vào bảng `users` và `refresh_tokens`
 *      -> tài khoản bạn đã đăng ký không bị mất.
 *   3. Toàn bộ nằm trong MỘT transaction: lỗi giữa chừng thì rollback sạch,
 *      không để database ở trạng thái nửa vời.
 */

import {
  closeDatabase,
  connectDatabase,
  execScript,
  withTransaction,
  type DbExecutor,
} from '@/config/database';
import { logger } from '@/utils/logger';
import { runMigrations } from '@/db/migrate';
import {
  BENCH_SHIRTS,
  COACH,
  FIFA_RANKINGS,
  FIFA_RANKING_DATE,
  FORMATION,
  LIVE_EVENTS,
  MATCHES,
  PLAYERS,
  PLAYER_CLUBS,
  STARTING_XI,
  TEAMS,
} from '@/db/seeds/data';
import {
  ACHIEVEMENTS,
  COMPETITIONS,
  KB_DOCUMENTS,
  ONBOARDING_SLIDES,
  RATED_MATCH,
  RATED_MATCH_CORRECTION,
  RATED_MATCH_EVENTS,
  RATED_MATCH_PLAYERS,
  RATED_MATCH_TEAM_STATS,
  RATING_RULESET,
  SEASONS,
  SQUADS,
  STANDINGS,
  TEAM_PROFILE,
  THEMES,
  THEME_SCHEDULES,
  TV_CHANNELS,
  VALUE_HISTORY,
} from '@/db/seeds/featureData';

export async function seedDatabase(): Promise<void> {
  /**
   * TRUNCATE ... RESTART IDENTITY CASCADE nghĩa là:
   *   TRUNCATE         : xoá sạch bảng (nhanh hơn DELETE rất nhiều)
   *   RESTART IDENTITY : đặt lại bộ đếm id về 1
   *   CASCADE          : xoá luôn các bảng đang tham chiếu tới nó
   * Thứ tự liệt kê không quan trọng vì đã có CASCADE.
   */
  await execScript(`
    TRUNCATE TABLE
      lineup_players, lineups, match_events, ai_predictions,
      h2h_records, match_stats, player_match_stats,
      rating_audit, rating_runs, player_rating_stats, rating_rulesets,
      squad_members, squads, competition_standings, seasons, competitions,
      theme_schedules, themes, team_profiles, achievements, onboarding_slides,
      player_value_history, kb_documents, external_refs,
      matches, player_clubs, players, coaches,
      fifa_rankings, teams
    RESTART IDENTITY CASCADE;
  `);
  logger.info('Đã dọn sạch dữ liệu tham chiếu cũ');

  await withTransaction(async (tx) => {
    // =====================================================================
    // 1. ĐỘI TUYỂN
    // =====================================================================
    // teamId là "từ điển" tra cứu: 'VIE' -> 1, 'THA' -> 2 ...
    // Cần nó vì các bảng sau tham chiếu bằng id số, còn ta viết bằng mã FIFA.
    const teamId = new Map<string, number>();

    for (const t of TEAMS) {
      // RETURNING id: Postgres trả về id vừa sinh ra, khỏi phải SELECT lại
      const { rows } = await tx.query<{ id: number }>(
        `INSERT INTO teams (name, country, logo_url, fifa_code)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [t.name, t.country, t.logo_url, t.fifa_code]
      );
      teamId.set(t.fifa_code, rows[0]!.id);
    }
    const VIE = teamId.get('VIE')!;
    logger.info('Đã thêm ' + TEAMS.length + ' đội tuyển');

    // =====================================================================
    // 2. HUẤN LUYỆN VIÊN
    // =====================================================================
    await tx.query(
      `INSERT INTO coaches
         (team_id, full_name, nationality, birth_date, photo_url,
          start_date, contract_end, biography, achievements, is_current)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
      [
        VIE,
        COACH.full_name,
        COACH.nationality,
        COACH.birth_date,
        COACH.photo_url,
        COACH.start_date,
        COACH.contract_end,
        COACH.biography,
        // Cột JSONB nhận chuỗi JSON -> phải stringify trước
        JSON.stringify(COACH.achievements),
      ]
    );
    logger.info('Đã thêm HLV trưởng: ' + COACH.full_name);

    // =====================================================================
    // 3. CẦU THỦ
    // =====================================================================
    // playerIdByShirt: 9 -> id của Xuân Son. Dùng để dựng đội hình bên dưới.
    const playerIdByShirt = new Map<number, number>();

    for (const p of PLAYERS) {
      const { rows } = await tx.query<{ id: number }>(
        `INSERT INTO players
           (team_id, full_name, short_name, birth_date, hometown, height_cm,
            weight_kg, position, detailed_position, shirt_number, preferred_foot,
            market_value_eur, current_club, caps, goals, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, TRUE)
         RETURNING id`,
        [
          VIE, p.full_name, p.short_name, p.birth_date, p.hometown, p.height_cm,
          p.weight_kg, p.position, p.detailed_position, p.shirt_number, p.preferred_foot,
          p.market_value_eur, p.current_club, p.caps, p.goals,
        ]
      );
      playerIdByShirt.set(p.shirt_number, rows[0]!.id);
    }
    logger.info('Đã thêm ' + PLAYERS.length + ' cầu thủ');

    // =====================================================================
    // 4. LỊCH SỬ CLB
    // =====================================================================
    let clubRows = 0;
    for (const [shirtStr, clubs] of Object.entries(PLAYER_CLUBS)) {
      const pid = playerIdByShirt.get(Number(shirtStr));
      if (!pid) continue; // dữ liệu lệch thì bỏ qua, không làm sập cả seed

      for (const c of clubs) {
        await tx.query(
          `INSERT INTO player_clubs (player_id, club_name, from_date, to_date, apps, goals)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pid, c.club, c.from, c.to, c.apps, c.goals]
        );
        clubRows++;
      }
    }
    logger.info('Đã thêm ' + clubRows + ' dòng lịch sử CLB');

    // =====================================================================
    // 5. TRẬN ĐẤU
    // =====================================================================
    const matchIds: number[] = [];
    let liveMatchId: number | null = null;
    // Trận đã kết thúc dùng để thử điểm cầu thủ + thông số sau trận (mục 12)
    let ratedMatchId: number | null = null;

    for (const m of MATCHES) {
      const { rows } = await tx.query<{ id: number }>(
        `INSERT INTO matches
           (competition, round, home_team_id, away_team_id, kickoff_at, venue,
            city, status, home_score, away_score, minute, attendance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          m.competition, m.round, teamId.get(m.home)!, teamId.get(m.away)!,
          m.kickoff_at, m.venue, m.city, m.status,
          m.home_score ?? 0, m.away_score ?? 0, m.minute ?? null, m.attendance ?? null,
        ]
      );
      const id = rows[0]!.id;
      matchIds.push(id);
      if (m.status === 'live') liveMatchId = id;
      if (m.status === 'finished' && m.away === RATED_MATCH.away_fifa_code) ratedMatchId = id;
    }
    logger.info('Đã thêm ' + MATCHES.length + ' trận đấu');

    // =====================================================================
    // 6. DIỄN BIẾN TRẬN ĐANG ĐÁ
    // =====================================================================
    if (liveMatchId) {
      for (const e of LIVE_EVENTS) {
        await tx.query(
          `INSERT INTO match_events (match_id, team_id, player_id, minute, type, detail)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [liveMatchId, VIE, playerIdByShirt.get(e.shirt) ?? null, e.minute, e.type, e.detail]
        );
      }
      logger.info('Đã thêm ' + LIVE_EVENTS.length + ' sự kiện cho trận đang diễn ra');
    }

    // =====================================================================
    // 7. ĐỘI HÌNH HIỆN TẠI (3-4-3)
    // =====================================================================
    const { rows: lineupRows } = await tx.query<{ id: number }>(
      `INSERT INTO lineups (match_id, team_id, formation, is_current)
       VALUES (NULL, $1, $2, TRUE)
       RETURNING id`,
      [VIE, FORMATION]
    );
    const lineupId = lineupRows[0]!.id;

    // 11 cầu thủ đá chính — có toạ độ để vẽ sơ đồ sân
    for (const s of STARTING_XI) {
      await tx.query(
        `INSERT INTO lineup_players
           (lineup_id, player_id, is_starting, position_x, position_y, shirt_number, is_captain)
         VALUES ($1, $2, TRUE, $3, $4, $5, $6)`,
        [lineupId, playerIdByShirt.get(s.shirt)!, s.x, s.y, s.shirt, s.captain ?? false]
      );
    }

    // Cầu thủ dự bị — không toạ độ
    for (const shirt of BENCH_SHIRTS) {
      const pid = playerIdByShirt.get(shirt);
      if (!pid) continue;
      await tx.query(
        `INSERT INTO lineup_players
           (lineup_id, player_id, is_starting, shirt_number)
         VALUES ($1, $2, FALSE, $3)`,
        [lineupId, pid, shirt]
      );
    }
    logger.info('Đã dựng đội hình ' + FORMATION + ': 11 đá chính + ' + BENCH_SHIRTS.length + ' dự bị');

    // =====================================================================
    // 8. BẢNG XẾP HẠNG FIFA
    // =====================================================================
    for (const r of FIFA_RANKINGS) {
      const tid = teamId.get(r.fifa_code);
      if (!tid) continue;
      await tx.query(
        `INSERT INTO fifa_rankings
           (team_id, rank, points, previous_rank, confederation, snapshot_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tid, r.rank, r.points, r.previous_rank, r.confederation, FIFA_RANKING_DATE]
      );
    }
    logger.info('Đã thêm BXH FIFA đợt ' + FIFA_RANKING_DATE);

    // =====================================================================
    // 9. GIỚI THIỆU ĐỘI TUYỂN & THÀNH TÍCH (Tab 1 — mục 5.1)
    // =====================================================================
    await tx.query(
      `INSERT INTO team_profiles
         (team_id, nickname, federation, confederations, home_stadium,
          intro_text, best_fifa_rank, best_fifa_rank_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        VIE, TEAM_PROFILE.nickname, TEAM_PROFILE.federation,
        JSON.stringify(TEAM_PROFILE.confederations), TEAM_PROFILE.home_stadium,
        TEAM_PROFILE.intro_text, TEAM_PROFILE.best_fifa_rank, TEAM_PROFILE.best_fifa_rank_date,
      ]
    );

    for (const a of ACHIEVEMENTS) {
      await tx.query(
        `INSERT INTO achievements
           (team_id, competition, edition_year, result, title, description, host, is_highlight)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [VIE, a.competition, a.edition_year, a.result, a.title, a.description, a.host, a.is_highlight]
      );
    }
    logger.info('Đã thêm giới thiệu đội tuyển + ' + ACHIEVEMENTS.length + ' thành tích');

    // =====================================================================
    // 10. SLIDE GIỚI THIỆU SAU SPLASH (mục 4.1)
    // =====================================================================
    for (const s of ONBOARDING_SLIDES) {
      await tx.query(
        `INSERT INTO onboarding_slides (sort_order, title, body, version, is_active)
         VALUES ($1,$2,$3,1,TRUE)`,
        [s.sort_order, s.title, s.body]
      );
    }
    logger.info('Đã thêm ' + ONBOARDING_SLIDES.length + ' slide giới thiệu');

    // =====================================================================
    // 11. THEME THEO SỰ KIỆN + LỊCH ÁP DỤNG (mục 6)
    // =====================================================================
    const themeId = new Map<string, number>();
    for (const t of THEMES) {
      const { rows } = await tx.query<{ id: number }>(
        `INSERT INTO themes
           (code, name, kind, palette_light, palette_dark, assets, is_selectable, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)
         RETURNING id`,
        [
          t.code, t.name, t.kind,
          JSON.stringify(t.palette_light), JSON.stringify(t.palette_dark),
          JSON.stringify(t.assets), t.is_selectable,
        ]
      );
      themeId.set(t.code, rows[0]!.id);
    }

    for (const s of THEME_SCHEDULES) {
      await tx.query(
        `INSERT INTO theme_schedules (theme_id, start_at, end_at, priority, source)
         VALUES ($1,$2,$3,$4,'manual')`,
        [themeId.get(s.code)!, s.start_at, s.end_at, s.priority]
      );
    }
    logger.info('Đã thêm ' + THEMES.length + ' theme + ' + THEME_SCHEDULES.length + ' lịch áp dụng');

    // =====================================================================
    // 12. GIẢI ĐẤU · MÙA GIẢI · BXH BẢNG ĐẤU (mục 5.8)
    // =====================================================================
    const compId = new Map<string, number>();
    for (const c of COMPETITIONS) {
      const { rows } = await tx.query<{ id: number }>(
        `INSERT INTO competitions (code, name, type, confederation)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [c.code, c.name, c.type, c.confederation]
      );
      compId.set(c.code, rows[0]!.id);
    }

    const seasonId = new Map<string, number>();
    for (const s of SEASONS) {
      const { rows } = await tx.query<{ id: number }>(
        `INSERT INTO seasons (competition_id, name, start_date, end_date, is_current)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [compId.get(s.competition_code)!, s.name, s.start_date, s.end_date, s.is_current]
      );
      seasonId.set(s.name, rows[0]!.id);

      // Gắn các trận cùng tên giải vào mùa giải này -> API BXH bảng đấu biết
      // trận nào thuộc giải nào (cột matches.season_id thêm ở migration 003)
      await tx.query('UPDATE matches SET season_id = $1 WHERE competition = $2', [
        rows[0]!.id,
        s.match_competition,
      ]);
    }

    for (const st of STANDINGS) {
      await tx.query(
        `INSERT INTO competition_standings
           (season_id, group_name, team_id, position, played, won, drawn, lost,
            goals_for, goals_against, points)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          seasonId.get(st.season_name)!, st.group_name, teamId.get(st.fifa_code)!,
          st.position, st.played, st.won, st.drawn, st.lost,
          st.goals_for, st.goals_against, st.points,
        ]
      );
    }
    logger.info('Đã thêm ' + COMPETITIONS.length + ' giải đấu + BXH ' + STANDINGS.length + ' đội');

    // =====================================================================
    // 13. ĐỢT TRIỆU TẬP (mục 5.8)
    // =====================================================================
    let memberRows = 0;
    for (const sq of SQUADS) {
      const { rows } = await tx.query<{ id: number }>(
        `INSERT INTO squads (team_id, season_id, title, gather_from, gather_to, announced_at)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [VIE, seasonId.get(sq.season_name) ?? null, sq.title, sq.gather_from, sq.gather_to, sq.announced_at]
      );
      const squadId = rows[0]!.id;

      for (const mem of sq.members) {
        const pid = playerIdByShirt.get(mem.shirt);
        if (!pid) continue;
        await tx.query(
          `INSERT INTO squad_members (squad_id, player_id, status, note)
           VALUES ($1,$2,$3,$4)`,
          [squadId, pid, mem.status, mem.note]
        );
        memberRows++;
      }
    }
    logger.info('Đã thêm ' + SQUADS.length + ' đợt triệu tập (' + memberRows + ' lượt gọi)');

    // =====================================================================
    // 14. KÊNH PHÁT SÓNG cho trận đang đá và trận sắp đá (mục 5.2)
    // =====================================================================
    await tx.query(
      `UPDATE matches SET tv_channels = $1 WHERE status IN ('scheduled','live')`,
      [JSON.stringify(TV_CHANNELS)]
    );

    // =====================================================================
    // 15. BỘ QUY TẮC CHẤM ĐIỂM + TRẬN ĐÃ CHỐT ĐIỂM (mục 12)
    // =====================================================================
    await tx.query(
      `INSERT INTO rating_rulesets (version, rules, description, is_active)
       VALUES ($1,$2,$3,$4)`,
      [
        RATING_RULESET.version, JSON.stringify(RATING_RULESET.rules),
        RATING_RULESET.description, RATING_RULESET.is_active,
      ]
    );

    if (ratedMatchId) {
      const awayTeamId = teamId.get(RATED_MATCH.away_fifa_code)!;

      // --- Thông số cấp đội: mỗi trận 2 dòng (đội nhà, đội khách) ---
      for (const s of RATED_MATCH_TEAM_STATS) {
        await tx.query(
          `INSERT INTO match_stats
             (match_id, team_id, possession_pct, shots, shots_on_target, expected_goals,
              corners, offsides, fouls, yellow_cards, red_cards, saves, passes,
              pass_accuracy_pct, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'provider')`,
          [
            ratedMatchId, s.side === 'home' ? VIE : awayTeamId,
            s.possession_pct, s.shots, s.shots_on_target, s.expected_goals,
            s.corners, s.offsides, s.fouls, s.yellow_cards, s.red_cards,
            s.saves, s.passes, s.pass_accuracy_pct,
          ]
        );
      }

      // --- Diễn biến: bàn thắng (kèm người kiến tạo), thẻ, thay người ---
      let eventNo = 0;
      for (const e of RATED_MATCH_EVENTS) {
        eventNo++;
        await tx.query(
          `INSERT INTO match_events
             (match_id, team_id, player_id, minute, type, detail,
              assist_player_id, related_player_id, provider_event_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            ratedMatchId, VIE, playerIdByShirt.get(e.shirt) ?? null, e.minute, e.type, e.detail,
            e.assist_shirt ? (playerIdByShirt.get(e.assist_shirt) ?? null) : null,
            // Thay người: player_id = người VÀO, related_player_id = người RA
            'out_shirt' in e && e.out_shirt ? (playerIdByShirt.get(e.out_shirt) ?? null) : null,
            'seed-' + ratedMatchId + '-' + eventNo,
          ]
        );
      }

      // --- ĐIỂM từng cầu thủ + bảng giải thích "Vì sao 8.8?" ---
      for (const r of RATED_MATCH_PLAYERS) {
        const pid = playerIdByShirt.get(r.shirt);
        if (!pid) continue;
        await tx.query(
          `INSERT INTO player_match_stats
             (match_id, player_id, team_id, minutes_played, rating, rating_source,
              provider_rating, rating_breakdown, ruleset_version, is_motm,
              shots, shots_on_target, key_passes, passes, pass_accuracy_pct,
              tackles, interceptions, saves, goals_conceded)
           VALUES ($1,$2,$3,$4,$5,'computed',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
          [
            ratedMatchId, pid, VIE, r.minutes, r.rating, r.provider_rating ?? null,
            JSON.stringify(r.breakdown), RATING_RULESET.version, r.is_motm ?? false,
            r.shots ?? 0, r.shots_on_target ?? 0, r.key_passes ?? 0, r.passes ?? 0,
            r.pass_accuracy_pct ?? null, r.tackles ?? 0, r.interceptions ?? 0,
            r.saves ?? 0, r.goals_conceded ?? 0,
          ]
        );
      }

      // Trận đã chốt điểm: finished_at ≈ 115 phút sau giờ bóng lăn
      await tx.query(
        `UPDATE matches
            SET ratings_status = 'final',
                finished_at    = kickoff_at + INTERVAL '115 minutes',
                data_version   = 3
          WHERE id = $1`,
        [ratedMatchId]
      );

      // --- Một lần đính chính điểm mẫu, kèm lưu vết (mục 12.4) ---
      const { rows: runRows } = await tx.query<{ id: number }>(
        `INSERT INTO rating_runs
           (match_id, trigger, data_version, ruleset_version, changed_players, finished_at)
         VALUES ($1,'correction',3,$2,1,NOW())
         RETURNING id`,
        [ratedMatchId, RATING_RULESET.version]
      );
      const correctedPid = playerIdByShirt.get(RATED_MATCH_CORRECTION.shirt);
      if (correctedPid) {
        await tx.query(
          `INSERT INTO rating_audit
             (run_id, match_id, player_id, old_rating, new_rating, reason)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            runRows[0]!.id, ratedMatchId, correctedPid,
            RATED_MATCH_CORRECTION.old_rating, RATED_MATCH_CORRECTION.new_rating,
            RATED_MATCH_CORRECTION.reason,
          ]
        );
      }

      // --- BXH cầu thủ năm 2026: tính sẵn từ điểm vừa đổ (mục 12.5) ---
      // Tính sẵn thay vì GROUP BY lúc có request -> giữ mục tiêu truy vấn < 50ms.
      await tx.query(`
        INSERT INTO player_rating_stats
          (period_type, period_key, player_id, matches, minutes, avg_rating,
           goals, assists, motm_count, yellow_cards, red_cards)
        SELECT 'year',
               to_char(x.kickoff_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY'),
               x.player_id,
               COUNT(*)::smallint,
               SUM(x.minutes_played)::smallint,
               ROUND(AVG(x.rating), 2),
               SUM(x.goals)::smallint,
               SUM(x.assists)::smallint,
               (COUNT(*) FILTER (WHERE x.is_motm))::smallint,
               SUM(x.yellows)::smallint,
               SUM(x.reds)::smallint
          FROM (
            SELECT m.kickoff_at, s.player_id, s.minutes_played, s.rating, s.is_motm,
                   COALESCE(v.goals, 0)   AS goals,
                   COALESCE(v.assists, 0) AS assists,
                   (SELECT COUNT(*) FROM match_events me
                     WHERE me.match_id = s.match_id AND me.player_id = s.player_id
                       AND me.type = 'yellow_card' AND NOT me.is_deleted)             AS yellows,
                   (SELECT COUNT(*) FROM match_events me
                     WHERE me.match_id = s.match_id AND me.player_id = s.player_id
                       AND me.type IN ('red_card','second_yellow') AND NOT me.is_deleted) AS reds
              FROM player_match_stats s
              JOIN matches m ON m.id = s.match_id AND m.ratings_status = 'final'
              LEFT JOIN v_player_match_summary v
                     ON v.match_id = s.match_id AND v.player_id = s.player_id
          ) x
         GROUP BY 1, 2, 3
      `);

      logger.info(
        'Đã chốt điểm trận đã kết thúc: ' + RATED_MATCH_PLAYERS.length +
          ' cầu thủ, ' + RATED_MATCH_EVENTS.length + ' sự kiện, 2 dòng thông số đội'
      );
    }

    // =====================================================================
    // 16. LỊCH SỬ GIÁ TRỊ CẦU THỦ + TÀI LIỆU CHO TRỢ LÝ AI
    // =====================================================================
    let valueRows = 0;
    for (const [shirtStr, history] of Object.entries(VALUE_HISTORY)) {
      const pid = playerIdByShirt.get(Number(shirtStr));
      if (!pid) continue;

      for (const h of history) {
        await tx.query(
          `INSERT INTO player_value_history
             (player_id, recorded_on, market_value_eur, estimated_value_eur, form_rating, reason)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            pid, h.on, h.market, h.estimated, h.form,
            JSON.stringify({ source: 'seed', note: 'Dữ liệu mẫu để vẽ biểu đồ' }),
          ]
        );
        valueRows++;
      }

      // Giá trị ước tính hiện tại = mốc gần nhất trong lịch sử
      const last = history[history.length - 1]!;
      await tx.query(
        `UPDATE players SET estimated_value_eur = $1, value_updated_at = $2 WHERE id = $3`,
        [last.estimated, last.on, pid]
      );
    }

    for (const d of KB_DOCUMENTS) {
      await tx.query(
        `INSERT INTO kb_documents (source, title, body, version, is_active)
         VALUES ($1,$2,$3,1,TRUE)`,
        [d.source, d.title, d.body]
      );
    }
    logger.info(
      'Đã thêm ' + valueRows + ' mốc giá trị cầu thủ + ' + KB_DOCUMENTS.length + ' tài liệu cho trợ lý AI'
    );
  });

  logger.info('===== SEED HOÀN TẤT =====');
}

if (require.main === module) {
  (async () => {
    await connectDatabase();
    await runMigrations(); // đảm bảo bảng đã tồn tại trước khi đổ dữ liệu
    await seedDatabase();
    await closeDatabase();
    process.exit(0);
  })().catch((err: unknown) => {
    logger.error('Seed lỗi: ' + (err instanceof Error ? err.message : String(err)));
    process.exit(1);
  });
}

/** Kiểu này chỉ để nhắc: mọi hàm phụ trợ nếu thêm sau đều nhận DbExecutor */
export type SeedTx = DbExecutor;
