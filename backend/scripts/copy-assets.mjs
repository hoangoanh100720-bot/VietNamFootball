/**
 * ============================================================================
 * SCRIPTS/COPY-ASSETS.MJS — CHÉP FILE KHÔNG PHẢI .TS SANG THƯ MỤC DIST
 * ============================================================================
 *
 * VẤN ĐỀ: `tsc` chỉ biên dịch file .ts. Các file .sql trong src/db/migrations
 * bị bỏ lại -> chạy `npm start` ở production sẽ báo "không tìm thấy migration".
 *
 * Script này chép chúng sang dist, giữ nguyên cấu trúc thư mục.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src';
const DIST = 'dist';
const EXTENSIONS = ['.sql', '.json'];

let copied = 0;

/** Duyệt đệ quy toàn bộ cây thư mục */
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!EXTENSIONS.includes(path.extname(entry.name))) continue;

    // src/db/migrations/001.sql  ->  dist/db/migrations/001.sql
    const target = fullPath.replace(SRC, DIST);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(fullPath, target);
    copied++;
  }
}

walk(SRC);
console.log(`Đã chép ${copied} file tài nguyên sang ${DIST}/`);
