/**
 * ============================================================================
 * DB/REALSQUAD.TS — ÁP ĐỘI HÌNH THẬT VÀO DATABASE
 * ============================================================================
 *
 * Dữ liệu seed ban đầu (seeds/data.ts) là DỮ LIỆU MẪU dựng giao diện: danh sách
 * 26 cầu thủ không trùng đội tuyển thật, ngày sinh/CLB/số trận sai lệch. Hàm này
 * thay phần CẦU THỦ bằng đội hình thật (seeds/realSquad.ts), theo 4 bước:
 *
 *   1. Cầu thủ VIE KHÔNG có trong đội hình thật -> is_active = FALSE.
 *      KHÔNG xoá: đội hình/chấm điểm các trận mẫu cũ còn tham chiếu tới họ,
 *      xoá đi là CASCADE mất luôn dữ liệu trận.
 *   2. Cầu thủ đội hình thật: có sẵn (khớp full_name) thì UPDATE, chưa có thì INSERT.
 *   3. Lịch sử CLB của 25 người: xoá rồi ghi lại.
 *   4. Đợt triệu tập: thay các đợt mẫu bằng đợt thật (ASEAN Cup 2026) và dựng
 *      lại "đội hình dự kiến" từ chính các cầu thủ thật.
 *
 * Chạy lại bao nhiêu lần cũng cho cùng kết quả (idempotent).
 *   - DB đang chạy:  npm run data:real-squad
 *   - DB dựng mới:   seed.ts tự gọi ở cuối
 * ============================================================================
 */

import type { DbExecutor } from '@/config/database';
import { REAL_SQUAD, type RealPlayer } from '@/db/seeds/realSquad';

export async function applyRealSquad(db: DbExecutor): Promise<{ updated: number; inserted: number; retired: number }> {
  const { rows: vie } = await db.query<{ id: number }>(`SELECT id FROM teams WHERE fifa_code = 'VIE'`);
  const VIE = vie[0]?.id;
  if (!VIE) throw new Error('Chưa có đội VIE trong bảng teams — chạy seed trước');

  const names = [...REAL_SQUAD.players, ...REAL_SQUAD.withdrawn].map((p) => p.full_name);

  // ---- 1. Cho nghỉ những người không thuộc đội hình thật ----
  const retired = await db.query(
    `UPDATE players SET is_active = FALSE, updated_at = NOW()
     WHERE team_id = $1 AND is_active = TRUE AND NOT (full_name = ANY($2::text[]))
     RETURNING id`,
    [VIE, names]
  );

  // ---- 2. Upsert từng cầu thủ ----
  const idByName = new Map<string, number>();
  let updated = 0;
  let inserted = 0;
  for (const p of [...REAL_SQUAD.players, ...REAL_SQUAD.withdrawn]) {
    const isWithdrawn = REAL_SQUAD.withdrawn.includes(p);
    const values = [
      p.short_name, p.birth_date, p.hometown, p.height_cm, p.weight_kg, p.position,
      p.detailed_position, p.shirt_number, p.preferred_foot, p.market_value_eur,
      p.current_club, p.caps, p.goals,
      p.photo ? '/static/players/' + p.photo.file : null, p.photo?.credit ?? null, p.photo?.source ?? null,
      // Người rút lui vì chấn thương vẫn thuộc đội tuyển (được gọi lại ngay khi khoẻ)
      // nhưng không nằm trong danh sách đang tập trung -> không hiện ở tab Cầu thủ
      !isWithdrawn,
    ];
    const existing = await db.query<{ id: number }>(
      `SELECT id FROM players WHERE team_id = $1 AND full_name = $2 ORDER BY id LIMIT 1`,
      [VIE, p.full_name]
    );
    if (existing.rows[0]) {
      const id = existing.rows[0].id;
      await db.query(
        `UPDATE players SET
           short_name=$1, birth_date=$2, hometown=$3, height_cm=$4, weight_kg=$5, position=$6,
           detailed_position=$7, shirt_number=$8, preferred_foot=$9, market_value_eur=$10,
           current_club=$11, caps=$12, goals=$13, photo_url=$14, photo_credit=$15,
           photo_source_url=$16, is_active=$17, updated_at=NOW()
         WHERE id=$18`,
        [...values, id]
      );
      idByName.set(p.full_name, id);
      updated++;
    } else {
      const { rows } = await db.query<{ id: number }>(
        `INSERT INTO players
           (short_name, birth_date, hometown, height_cm, weight_kg, position,
            detailed_position, shirt_number, preferred_foot, market_value_eur,
            current_club, caps, goals, photo_url, photo_credit, photo_source_url,
            is_active, team_id, full_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING id`,
        [...values, VIE, p.full_name]
      );
      idByName.set(p.full_name, rows[0]!.id);
      inserted++;
    }
  }

  // ---- 3. Lịch sử CLB ----
  for (const p of [...REAL_SQUAD.players, ...REAL_SQUAD.withdrawn]) {
    const id = idByName.get(p.full_name)!;
    await db.query(`DELETE FROM player_clubs WHERE player_id = $1`, [id]);
    for (const c of p.clubs) {
      await db.query(
        `INSERT INTO player_clubs (player_id, club_name, from_date, to_date, apps, goals, is_loan)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, c.club, c.from, c.to, c.apps, c.goals, c.is_loan]
      );
    }
  }

  // ---- 4a. Đợt triệu tập thật (thay các đợt mẫu) ----
  await db.query(`DELETE FROM squads WHERE team_id = $1`, [VIE]);
  const { rows: sq } = await db.query<{ id: number }>(
    `INSERT INTO squads (team_id, title, gather_from, gather_to, announced_at, source_url)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [VIE, REAL_SQUAD.title, REAL_SQUAD.gather_from, REAL_SQUAD.gather_to, REAL_SQUAD.announced_at, REAL_SQUAD.source_url]
  );
  const squadId = sq[0]!.id;
  for (const p of REAL_SQUAD.players) {
    await db.query(`INSERT INTO squad_members (squad_id, player_id, status, note) VALUES ($1,$2,'called',$3)`,
      [squadId, idByName.get(p.full_name), p.role ?? null]);
  }
  for (const p of REAL_SQUAD.withdrawn) {
    await db.query(`INSERT INTO squad_members (squad_id, player_id, status, note) VALUES ($1,$2,'withdrawn',$3)`,
      [squadId, idByName.get(p.full_name), p.withdrawn_note ?? 'Rút lui']);
  }

  // ---- 4b. Đội hình dự kiến = đội hình ra sân gần nhất ----
  await db.query(`UPDATE lineups SET is_current = FALSE WHERE team_id = $1`, [VIE]);
  const { rows: lu } = await db.query<{ id: number }>(
    `INSERT INTO lineups (team_id, formation, is_current) VALUES ($1,$2,TRUE) RETURNING id`,
    [VIE, REAL_SQUAD.lineup.formation]
  );
  const lineupId = lu[0]!.id;
  const starters = new Set(REAL_SQUAD.lineup.starting.map((s) => s.full_name));
  for (const s of REAL_SQUAD.lineup.starting) {
    const p = findPlayer(s.full_name);
    await db.query(
      `INSERT INTO lineup_players (lineup_id, player_id, is_starting, position_x, position_y, shirt_number, is_captain)
       VALUES ($1,$2,TRUE,$3,$4,$5,$6)`,
      // Băng đội trưởng theo TRẬN ĐÓ (chung kết: Hoàng Đức), không theo chức danh —
      // Quang Hải là đội trưởng nhưng vào sân từ ghế dự bị
      [lineupId, idByName.get(s.full_name), s.x, s.y, p.shirt_number, s.captain ?? false]
    );
  }
  for (const p of REAL_SQUAD.players.filter((x) => !starters.has(x.full_name))) {
    await db.query(
      `INSERT INTO lineup_players (lineup_id, player_id, is_starting, shirt_number, is_captain)
       VALUES ($1,$2,FALSE,$3,FALSE)`,
      [lineupId, idByName.get(p.full_name), p.shirt_number]
    );
  }

  return { updated, inserted, retired: retired.rows.length };
}

function findPlayer(name: string): RealPlayer {
  const p = REAL_SQUAD.players.find((x) => x.full_name === name);
  if (!p) throw new Error(`Đội hình ra sân có "${name}" nhưng người này không nằm trong danh sách triệu tập`);
  return p;
}
