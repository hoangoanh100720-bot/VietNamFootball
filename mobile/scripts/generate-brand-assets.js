/**
 * ============================================================================
 * SCRIPTS/GENERATE-BRAND-ASSETS.JS — VẼ ICON & ẢNH MÀN KHỞI ĐỘNG BẰNG CODE
 * ============================================================================
 *
 * Chạy:  cd mobile && node scripts/generate-brand-assets.js
 *        (cần playwright-core + trình duyệt Edge hoặc Chrome có sẵn trên máy)
 *
 * Sinh ra 6 file trong mobile/assets/:
 *
 *   icon.png                     1024×1024  icon chính (iOS, Expo Go, cửa hàng)
 *   android-icon-background.png  1024×1024  nền đỏ của adaptive icon Android
 *   android-icon-foreground.png  1024×1024  sao vàng + bông lúa, nền trong suốt
 *   android-icon-monochrome.png  1024×1024  bản một màu cho "icon theo chủ đề" Android 13+
 *   splash-icon.png              1024×1024  lá cờ đỏ sao vàng cho màn khởi động
 *   favicon.png                    48×48    icon tab trình duyệt
 *
 * ----------------------------------------------------------------------------
 * ⭐ VÌ SAO VẼ BẰNG CODE THAY VÌ THIẾT KẾ TRONG PHOTOSHOP?
 *
 *   1. Cờ Việt Nam có TỶ LỆ QUY ĐỊNH (Hiến pháp): cờ 2:3, ngôi sao có bán kính
 *      đường tròn ngoại tiếp = 1/5 chiều dài cờ. Code tính đúng tuyệt đối;
 *      kéo tay bằng chuột thì lệch vài pixel là chuyện thường.
 *   2. Đổi màu thương hiệu = sửa một hằng số rồi chạy lại lệnh, 6 file cập nhật
 *      cùng lúc, không sót file nào.
 *   3. Ai trong nhóm cũng tái tạo được, không phụ thuộc file .psd của một người.
 *
 * ----------------------------------------------------------------------------
 * 📐 VÙNG AN TOÀN — LÝ DO MỖI FILE CÓ TỶ LỆ HOẠ TIẾT KHÁC NHAU
 *
 *   • icon.png: iOS tự bo góc ~22%. Hoạ tiết chiếm ~80%, không chạm mép.
 *   • Adaptive icon Android: launcher cắt thành tròn / vuông bo / giọt nước tuỳ
 *     hãng máy. CHỈ vùng tròn đường kính 66% ở giữa là chắc chắn được hiện.
 *   • Splash Android 12+: hệ điều hành ép ảnh vào vòng tròn, vùng nhìn thấy
 *     ~2/3 đường kính. Chữ hay lá cờ quá to sẽ bị cắt góc -> KHÔNG đặt chữ tên
 *     app ở đây; tên app hiện ở màn khởi động phía JavaScript (BrandSplash).
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ASSETS = path.resolve(__dirname, '..', 'assets');

// ---------------------------------------------------------------------------
// MÀU — khớp mobile/src/theme/colors.ts (staticColors)
// ---------------------------------------------------------------------------
const RED_LIGHT = '#F03A2F';
const RED = '#DA251D';
const RED_DEEP = '#A8130D';
const GOLD_LIGHT = '#FFE68A';
const GOLD = '#FFCD00';
const GOLD_DEEP = '#E0A800';

// ---------------------------------------------------------------------------
// HÌNH HỌC
// ---------------------------------------------------------------------------

/** Ngôi sao 5 cánh — cùng công thức với buildStarPath trong VietnamFlag.tsx */
function starPath(cx, cy, outer, inner = outer * 0.382) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((i * 180) / 5 - 90) * (Math.PI / 180);
    pts.push(`${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ') + 'Z';
}

/**
 * Một nhánh bông lúa cong ôm theo cung tròn.
 *
 * Thân lúa là một cung tròn tâm (cx, cy); hạt lúa là các hình elip đặt dọc
 * cung, nghiêng theo tiếp tuyến và chĩa ra ngoài — nhìn như bông lúa chín trĩu
 * hạt. Hạt to dần về phía gốc: đúng hình dáng bông lúa thật.
 *
 * @param side -1 = nhánh trái, 1 = nhánh phải (đối xứng qua trục dọc)
 */
function riceBranch({ cx, cy, radius, from, to, side, grains, grainSize, color }) {
  const toXY = (deg) => {
    const r = (deg * Math.PI) / 180;
    return [cx + side * radius * Math.sin(r), cy + radius * Math.cos(r)];
  };
  const [x0, y0] = toXY(from);
  const [x1, y1] = toXY(to);
  const sweep = side === 1 ? 0 : 1;
  let svg = `<path d="M${x0} ${y0} A${radius} ${radius} 0 0 ${sweep} ${x1} ${y1}" stroke="${color}" stroke-width="${grainSize * 0.28}" fill="none" stroke-linecap="round"/>`;

  for (let i = 0; i < grains; i++) {
    const t = (i + 0.5) / grains;
    const deg = from + (to - from) * t;
    const [gx, gy] = toXY(deg);
    const size = grainSize * (1.15 - t * 0.45); // gốc to, ngọn nhỏ
    // Góc tiếp tuyến của cung + nghiêng thêm 35° ra ngoài -> hạt "xoè" như bông lúa
    const tangent = side === 1 ? 90 - deg : deg - 90;
    for (const out of [-1, 1]) {
      const tilt = tangent + out * 35 * side;
      const ox = gx + Math.cos((tilt * Math.PI) / 180) * size * 0.9 * out;
      const oy = gy + Math.sin((tilt * Math.PI) / 180) * size * 0.9 * out;
      svg += `<ellipse cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" rx="${(size * 0.95).toFixed(1)}" ry="${(size * 0.42).toFixed(1)}" transform="rotate(${tilt.toFixed(1)} ${ox.toFixed(1)} ${oy.toFixed(1)})" fill="${color}"/>`;
    }
  }
  return svg;
}

/**
 * Biểu tượng chính: sao vàng + vòng bông lúa, căn giữa, thu phóng theo `scale`.
 * scale = 1 -> hoạ tiết rộng ~800/1024.
 */
function emblem({ scale = 1, starFill = 'url(#gold)', riceColor = 'url(#gold)', shadow = true }) {
  const s = scale;
  const c = 512;
  const wreath = { cx: c, cy: c + 30 * s, radius: 360 * s, grains: 9, grainSize: 34 * s, color: riceColor };
  return `
    <g ${shadow ? 'filter="url(#soft)"' : ''}>
      ${riceBranch({ ...wreath, from: 18, to: 150, side: -1 })}
      ${riceBranch({ ...wreath, from: 18, to: 150, side: 1 })}
      <path d="${starPath(c, c - 6 * s, 250 * s)}" fill="${starFill}" ${starFill.startsWith('url') ? `stroke="${GOLD_DEEP}" stroke-width="${6 * s}" stroke-linejoin="round"` : ''}/>
    </g>`;
}

const DEFS = `
  <defs>
    <linearGradient id="red" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${RED_LIGHT}"/><stop offset="0.55" stop-color="${RED}"/><stop offset="1" stop-color="${RED_DEEP}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="0.5" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD_DEEP}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.25" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#5A0A06" flood-opacity="0.45"/>
    </filter>
  </defs>`;

const svg = (inner, size = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${DEFS}${inner}</svg>`;

// ---------------------------------------------------------------------------
// TỪNG FILE
// ---------------------------------------------------------------------------

const RED_BACKGROUND = `<rect width="1024" height="1024" fill="url(#red)"/><rect width="1024" height="1024" fill="url(#glow)"/>`;

/**
 * Lá cờ bay nhẹ cho màn khởi động.
 * Rộng 560 trên khung 1024: nửa đường chéo = 337 < bán kính vùng hiện của
 * splash Android 12 (~341) -> không bị cắt góc (xem "Vùng an toàn" ở đầu file).
 */
function wavingFlag() {
  const w = 560, h = (w * 2) / 3, x = 512 - w / 2, y = 512 - h / 2, amp = 16;
  // Mép trên/dưới là đường cong sin: cờ "bay" thay vì tấm thẻ phẳng
  const top = `M${x} ${y} C${x + w * 0.33} ${y - amp}, ${x + w * 0.66} ${y + amp}, ${x + w} ${y}`;
  const right = `L${x + w} ${y + h}`;
  const bottom = `C${x + w * 0.66} ${y + h + amp}, ${x + w * 0.33} ${y + h - amp}, ${x} ${y + h} Z`;
  return `
    <g filter="url(#soft)">
      <path d="${top} ${right} ${bottom}" fill="url(#red)"/>
      <path d="${top} ${right} ${bottom}" fill="url(#glow)"/>
      <path d="${starPath(512, 512, w / 5)}" fill="${GOLD}"/>
    </g>`;
}

const FILES = {
  'icon.png': { size: 1024, body: svg(RED_BACKGROUND + emblem({ scale: 1 })), transparent: false },
  'android-icon-background.png': { size: 1024, body: svg(RED_BACKGROUND), transparent: false },
  // 0.62: hoạ tiết ~500px nằm gọn trong vùng tròn an toàn 66% (676px)
  'android-icon-foreground.png': { size: 1024, body: svg(emblem({ scale: 0.62 })), transparent: true },
  'android-icon-monochrome.png': {
    size: 1024,
    body: svg(emblem({ scale: 0.62, starFill: '#FFFFFF', riceColor: '#FFFFFF', shadow: false })),
    transparent: true,
  },
  'splash-icon.png': { size: 1024, body: svg(wavingFlag()), transparent: true },
  // Favicon 48px: vòng bông lúa quá nhỏ sẽ thành vệt nhoè -> chỉ giữ sao trên nền đỏ
  'favicon.png': {
    size: 48,
    body: svg(`<rect width="1024" height="1024" rx="200" fill="url(#red)"/><path d="${starPath(512, 530, 360)}" fill="${GOLD}"/>`, 48),
    transparent: true,
  },
};

// ---------------------------------------------------------------------------
// XUẤT PNG BẰNG TRÌNH DUYỆT
// ---------------------------------------------------------------------------
(async () => {
  let chromium;
  try {
    ({ chromium } = require('playwright-core'));
  } catch {
    console.error('Thiếu playwright-core. Cài tạm: npm i --no-save playwright-core');
    process.exit(1);
  }

  const browser = await chromium
    .launch({ channel: 'msedge', headless: true })
    .catch(() => chromium.launch({ channel: 'chrome', headless: true }));
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const [name, { size, body, transparent }] of Object.entries(FILES)) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${body}</body></html>`
    );
    const el = await page.$('svg');
    await el.screenshot({ path: path.join(ASSETS, name), omitBackground: transparent });
    console.log('✓', name, `${size}×${size}`, `${Math.round(fs.statSync(path.join(ASSETS, name)).size / 1024)}KB`);
  }

  await browser.close();
})();
