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
      h2h_records, matches, player_clubs, players, coaches,
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
