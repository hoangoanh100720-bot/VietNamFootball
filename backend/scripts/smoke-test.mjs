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

console.log('\n■ ĐIỂM CẦU THỦ (Tab Đội hình, mục 5.3)');

await check('GET /squad/last-match', '/squad/last-match', (d) => {
  const m = d.match;
  const rated = d.starting.filter((p) => p.rating !== null).length;
  const motm = d.starting.find((p) => p.is_motm);
  return `${m.home_name} ${m.home_score}-${m.away_score} ${m.away_name} — ${rated}/${d.starting.length} có điểm` +
    (motm ? `, MOTM: ${motm.short_name} (${motm.rating})` : '');
});

await check('GET /ratings/match/11', '/ratings/match/11', (d, meta) => {
  const top = d.ratings[0];
  return `${meta.count} cầu thủ, cao nhất ${top?.rating} (${top?.short_name ?? top?.full_name})`;
});

/**
 * ⭐ PHÉP THỬ QUAN TRỌNG NHẤT CỦA ENGINE CHẤM ĐIỂM.
 *
 * Bảng giải thích "Vì sao 8.8?" chỉ đáng tin khi TỔNG CÁC DÒNG đúng bằng điểm
 * cuối cùng. Lệch một chút thôi là người dùng cộng tay lại ra số khác, và mất
 * niềm tin vào toàn bộ tính năng.
 *
 * Đây cũng là thứ FotMob/SofaScore không có — nên càng phải đúng.
 */
{
  const res = await fetch(BASE + '/ratings/match/11');
  const json = await res.json().catch(() => ({}));
  const withBreakdown = (json?.data?.ratings ?? []).filter((r) => r.breakdown?.length > 0);

  const lech = withBreakdown.filter((r) => {
    const tong = Math.round(r.breakdown.reduce((s, b) => s + b.points, 0) * 10) / 10;
    // Điểm bị kẹp vào [3,10] thì tổng có thể khác — bỏ qua hai biên đó
    return r.rating > 3 && r.rating < 10 && tong !== r.rating;
  });

  if (withBreakdown.length > 0 && lech.length === 0) {
    console.log(`  ✓ Bảng giải thích khớp điểm ở cả ${withBreakdown.length} cầu thủ`);
    passed++;
  } else if (withBreakdown.length === 0) {
    console.log('  ✗ Không cầu thủ nào có bảng giải thích — engine chưa chạy?');
    failed++;
  } else {
    console.log(`  ✗ ${lech.length} cầu thủ có tổng các dòng KHÁC điểm cuối cùng`);
    failed++;
  }
}

console.log('\n■ GIỚI THIỆU & THÀNH TÍCH (Tab 1)');

await check('GET /team/overview', '/team/overview', (d) => {
  const { profile, trophies, achievements } = d;
  return `${profile.name} "${profile.nickname}" — ${trophies.champion} vô địch, ${achievements.length} mốc thành tích`;
});

await check('GET /team/achievements (lọc nổi bật)', '/team/achievements?highlight=true', (d, meta) =>
  `${meta.count} thành tích nổi bật, mới nhất: ${d.achievements[0]?.title ?? '—'}`
);

/**
 * ⚠️ PHÉP THỬ CHỐNG LỖI ĐÃ XẢY RA THẬT.
 *
 * Bản đầu của team.service.ts truy vấn bảng `teams` bằng env.VIETNAM_TEAM_ID
 * (= 26, id bên api-football) trong khi id thật trong database là 1.
 * Kết quả: API trả 404 dù dữ liệu có đủ.
 *
 * Phép thử này khoá lại điều kiện: hồ sơ phải có mã FIFA đúng là 'VIE'.
 * Nếu ai đó lỡ tay quay về cách tra bằng id, phép thử sẽ bắt được ngay.
 */
{
  const res = await fetch(BASE + '/team/overview');
  const json = await res.json().catch(() => ({}));
  const code = json?.data?.profile?.fifa_code;

  if (code === 'VIE') {
    console.log('  ✓ Tra đội theo mã FIFA (không phụ thuộc id tự sinh)');
    passed++;
  } else {
    console.log(`  ✗ Hồ sơ trả về mã FIFA "${code}", mong đợi "VIE"`);
    failed++;
  }
}

console.log('\n■ TRỢ LÝ AI & HỒ KEY GEMINI');

// Endpoint này vừa báo AI có bật hay không, vừa cho biết còn bao nhiêu key
// khả dụng. Với dự án dùng nhiều key xoay vòng, đây là chỗ chẩn đoán ĐẦU TIÊN
// khi thấy tính năng AI đột nhiên im lặng.
await check('GET /ai/status', '/ai/status', (d) => {
  const pool = d.key_pool;
  // Hiện cả số key BỊ LOẠI (403/401) chứ không chỉ số key sẵn sàng —
  // một key hỏng nằm im trong hồ là thứ rất dễ bị bỏ quên.
  const dead = pool?.disabled ?? 0;
  const keys = pool
    ? `${pool.available}/${pool.total} key sẵn sàng` + (dead > 0 ? `, ${dead} BỊ LOẠI` : '')
    : 'chưa có hồ key';
  const mode = d.gemini_enabled ? 'Gemini BẬT' : 'dùng mô hình Elo dự phòng';
  return `${mode} — ${d.model} — ${keys}`;
});

/**
 * 🔐 PHÉP THỬ BẢO MẬT — quan trọng hơn vẻ ngoài của nó.
 *
 * /ai/status là endpoint CÔNG KHAI. Nó báo tình trạng các key Gemini, nên
 * tuyệt đối không được để lọt key nguyên văn ra ngoài. Mọi key phải hiện
 * dưới dạng đã che: "AQ.Ab8…ztiw".
 *
 * Cách kiểm: key Gemini thật dài trên 30 ký tự và KHÔNG chứa dấu "…".
 * Nên nếu bắt gặp một label dài mà không có dấu ba chấm -> chắc chắn đã lộ.
 */
{
  const res = await fetch(BASE + '/ai/status');
  const raw = await res.text();
  const leaked = /"label"\s*:\s*"[^"…]{25,}"/.test(raw);

  if (leaked) {
    console.log('  ✗ Key Gemini BỊ LỘ nguyên văn trong /ai/status');
    failed++;
  } else {
    console.log('  ✓ Key Gemini được che đúng cách (không lộ nguyên văn)');
    passed++;
  }
}

console.log('\n■ TÌM KIẾM AI (hybrid search)');

await check('GET /search/stats', '/search/stats', (d) =>
  `${d.documents} tài liệu, ${d.chunks} đoạn (${d.embedded} đã nhúng, ${d.pending} chờ) — máy vector: ${d.vector_engine}`
);

/**
 * ⭐ TÌM BẰNG CHUỖI KHÔNG DẤU — phép thử quan trọng nhất của tìm kiếm tiếng Việt.
 *
 * Gõ "doi tuyen quoc gia" phải ra được "Đội tuyển Quốc gia". Trượt phép thử
 * này nghĩa là hàm removeAccents hoặc cột content_norm đang có vấn đề —
 * và người dùng Việt Nam gõ không dấu rất nhiều.
 */
await check('GET /search (gõ không dấu)', '/search?q=doi%20tuyen%20quoc%20gia&limit=3&debug=true', (d, meta) => {
  if (!d.hits.length) return '⚠️ kho tri thức trống — chạy: npm run crawl -- <url>';
  const top = d.hits[0];
  return `${meta.count} kết quả trong ${meta.took_ms}ms — cao nhất: "${top.title.slice(0, 38)}" (điểm ${top.score.toFixed(2)})`;
});

console.log('\n■ THỐNG KÊ SAU TRẬN (Tab 5, mục 5.6)');
await check('GET /stats/overview', '/stats/overview', (d) => {
  const m = d.lastMatch;
  const top = d.leaderboard?.rows?.[0];
  return (m ? `trận vừa đá: ${m.home_team.name} ${m.home_score}-${m.away_score} ${m.away_team.name} (${m.result})` : 'chưa có trận') +
    (top ? ` · top BXH: ${top.full_name} ${top.value}` : '');
});
{
  // Trang 2 dùng cursor của trang 1 -> KHÔNG được trùng trận nào với trang 1
  const page1 = await check('GET /stats/matches (trang 1)', '/stats/matches?limit=2', (d, meta) =>
    `${d.matches.length} trận · còn trang sau: ${meta.nextCursor ? 'có' : 'không'}`
  );
  const res1 = await fetch(BASE + '/stats/matches?limit=2').then((r) => r.json());
  if (page1 && res1.meta?.nextCursor) {
    await check('GET /stats/matches (trang 2, cursor)', '/stats/matches?limit=2&cursor=' + res1.meta.nextCursor, (d) => {
      const ids1 = new Set(res1.data.matches.map((m) => m.id));
      const dup = d.matches.filter((m) => ids1.has(m.id));
      return dup.length ? '⚠️ TRÙNG trận giữa hai trang: ' + dup.map((m) => m.id).join(',') : d.matches.length + ' trận, không trùng trang 1';
    });
  }
}
await check('GET /stats/players/leaderboard (bàn thắng)', '/stats/players/leaderboard?metric=goals&limit=5', (d) =>
  'năm ' + d.period_key + ': ' + d.rows.map((r) => '#' + r.rank + ' ' + (r.short_name ?? r.full_name) + ' ' + r.value).join(', ')
);

console.log('\n■ BXH BẢNG ĐẤU & TRIỆU TẬP (mục 5.8)');
await check('GET /competitions', '/competitions', (d) => d.seasons.length + ' mùa giải');
await check('GET /competitions/standings', '/competitions/standings', (d) => d.vietnam_summary ?? 'không có giải vòng bảng');
await check('GET /squads/current', '/squads/current', (d) =>
  d ? d.squad.title + ' · ' + d.squad.player_count + ' cầu thủ · ' + d.new_count + ' mới' : 'chưa công bố đợt nào'
);
await check('GET /squads', '/squads', (d) => d.squads.length + ' đợt đã công bố');

console.log('\n■ THEME THEO SỰ KIỆN (mục 6)');
await check('GET /themes', '/themes', (d) => d.themes.map((t) => t.code).join(', '));
await check('GET /themes/active (tự động)', '/themes/active', (d) => d.theme.name + ' (' + d.reason + ')');
await check('GET /themes/active (khách cố định Tết)', '/themes/active?mode=fixed&code=tet', (d) => {
  const allowed = ['accent', 'accentText', 'accentSoft', 'accentFg', 'gold', 'goldSoft', 'pitch', 'pitchStripe'];
  const bad = Object.keys(d.theme.palette_dark).filter((k) => !allowed.includes(k));
  if (d.theme.code !== 'tet') return '⚠️ mong đợi tet, nhận ' + d.theme.code;
  return bad.length ? '⚠️ palette lọt token cấm: ' + bad.join(',') : d.theme.name + ', palette chỉ gồm token trong danh sách trắng';
});

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
await expectError('Chỉ số BXH lạ (chống chèn SQL)', '/stats/players/leaderboard?metric=salary', 400);
await expectError('Khoá kỳ chứa ký tự lạ', "/stats/players/leaderboard?key=2026';--", 400);
await expectError('Đợt triệu tập không tồn tại', '/squads/99999', 404);
await expectError('Mùa giải không hợp lệ', '/competitions/abc/standings', 400);

console.log(`\n═══ KẾT QUẢ: ${passed} đạt, ${failed} lỗi ═══\n`);
process.exit(failed > 0 ? 1 : 0);
