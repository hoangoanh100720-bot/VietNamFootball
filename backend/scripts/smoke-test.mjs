/**
 * ============================================================================
 * SCRIPTS/SMOKE-TEST.MJS — KIỂM TRA NHANH TOÀN BỘ API
 * ============================================================================
 *
 * "Smoke test" (kiểm tra khói) là thuật ngữ từ ngành điện tử: cắm điện lên,
 * nếu KHÔNG bốc khói thì coi như mạch cơ bản ổn. Ở đây cũng vậy: gọi lần lượt
 * mọi endpoint, xem có cái nào "bốc khói" không.
 *
 * Chạy:  node scripts/smoke-test.mjs
 * (server phải đang chạy ở cổng 5000)
 */

const BASE = process.env.API_URL ?? 'http://localhost:5000/api/v1';

let passed = 0;
let failed = 0;

/** Gọi một endpoint và in kết quả tóm tắt */
async function check(label, path, summarize) {
  try {
    const res = await fetch(BASE + path);
    const json = await res.json();

    if (!res.ok || json.success === false) {
      console.log(`  ✗ ${label}  [HTTP ${res.status}] ${json.error?.message ?? ''}`);
      failed++;
      return null;
    }

    console.log(`  ✓ ${label}  ${summarize ? summarize(json.data, json.meta) : ''}`);
    passed++;
    return json.data;
  } catch (err) {
    console.log(`  ✗ ${label}  ${err.message}`);
    failed++;
    return null;
  }
}

const vnd = (n) => new Intl.NumberFormat('vi-VN').format(n);

console.log('\n═══ KIỂM TRA API BÓNG ĐÁ VIỆT NAM ═══\n');

console.log('■ TRẬN ĐẤU');
const latest = await check('GET /matches/latest', '/matches/latest', (d) => {
  const m = d.match;
  return `${m.home_team.name} ${m.home_score}-${m.away_score} ${m.away_team.name} (${m.status}${m.minute ? `, phút ${m.minute}` : ''})`;
});

await check('GET /matches/upcoming', '/matches/upcoming?limit=3', (d, meta) =>
  `${d.matches.length} trận sắp tới / tổng ${meta.total}`
);
await check('GET /matches/results', '/matches/results?limit=3', (d, meta) =>
  `${d.matches.length} kết quả / tổng ${meta.total}`
);

const matchId = latest?.match?.id;
if (matchId) {
  await check(`GET /matches/${matchId}`, `/matches/${matchId}`, (d) =>
    `${d.events.length} sự kiện tại ${d.match.venue}`
  );
  await check(`GET /matches/${matchId}/live`, `/matches/${matchId}/live`, (d) =>
    `${d.home_score}-${d.away_score} phút ${d.minute}`
  );
  await check(`GET /matches/${matchId}/h2h`, `/matches/${matchId}/h2h`, (d) =>
    `${d.total} lần gặp: ${d.wins}T ${d.draws}H ${d.losses}B (${d.goals_for}-${d.goals_against})`
  );
}

console.log('\n■ ĐỘI HÌNH');
await check('GET /squad/current', '/squad/current', (d) =>
  `sơ đồ ${d.formation}: ${d.starting.length} chính + ${d.bench.length} dự bị`
);
await check('GET /squad/value', '/squad/value', (d) =>
  `tổng ${vnd(d.total_eur)} EUR / ${d.total_players} cầu thủ — đắt nhất: ${d.most_valuable[0]?.short_name}`
);

console.log('\n■ CẦU THỦ & HLV');
await check('GET /players', '/players?limit=50', (d, meta) => `${meta.total} cầu thủ`);
await check('GET /players?position=FW', '/players?position=FW', (d) =>
  `${d.players.length} tiền đạo: ${d.players.map((p) => p.short_name).join(', ')}`
);
await check('GET /players?search=quang', '/players?search=quang', (d) =>
  d.players.map((p) => `${p.short_name} (${p.age} tuổi)`).join(', ')
);
await check('GET /players/1', '/players/1', (d) =>
  `${d.player.full_name} — ${d.player.hometown} — ${d.clubs.length} CLB`
);
await check('GET /coach', '/coach', (d) =>
  `${d.coach.full_name} (${d.coach.nationality}) — tại vị ${d.coach.tenure_text}`
);

console.log('\n■ BẢNG XẾP HẠNG');
await check('GET /ranking/fifa', '/ranking/fifa?limit=5', (d) =>
  `VN hạng ${d.vietnam.rank} (${d.vietnam.change >= 0 ? '+' : ''}${d.vietnam.change}) — đợt ${d.snapshot_date?.slice(0, 10)}`
);

console.log('\n■ XỬ LÝ LỖI (mong đợi API TỪ CHỐI)');

/** Ngược với check(): lần này API PHẢI trả lỗi thì mới coi là đạt */
async function expectError(label, path, expectedStatus) {
  const res = await fetch(BASE + path);
  const json = await res.json().catch(() => ({}));

  if (res.status === expectedStatus && json.success === false) {
    console.log(`  ✓ ${label}  -> ${json.error.code}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}  nhận HTTP ${res.status}, mong đợi ${expectedStatus}`);
    failed++;
  }
}

await expectError('Trận không tồn tại', '/matches/99999', 404);
await expectError('ID không phải số', '/matches/abc', 400);
await expectError('limit vượt trần 50', '/players?limit=999', 400);
await expectError('Vị trí không hợp lệ', '/players?position=XX', 400);

console.log(`\n═══ KẾT QUẢ: ${passed} đạt, ${failed} lỗi ═══\n`);
process.exit(failed > 0 ? 1 : 0);
