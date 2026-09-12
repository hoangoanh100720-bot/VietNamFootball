/**
 * ============================================================================
 * CLI/OCR.TS — ĐỌC CHỮ TỪ ẢNH/PDF BẰNG DÒNG LỆNH
 * ============================================================================
 *
 * 🚀 CÁCH DÙNG
 *
 *   # Đọc chữ trong một file trên máy, in ra màn hình
 *   npm run ocr -- ./tai-lieu/bang-xep-hang.png
 *
 *   # Đọc chữ từ một ảnh trên mạng
 *   npm run ocr -- https://example.com/lich-thi-dau.jpg
 *
 *   # Đọc rồi LƯU LUÔN vào kho tri thức (để trợ lý AI tra cứu được)
 *   npm run ocr -- ./bien-ban-tran-dau.pdf --save
 *
 *   # Cho model biết nó đang nhìn cái gì -> kết quả chính xác hơn hẳn
 *   npm run ocr -- ./anh.png --hint="bảng xếp hạng vòng loại World Cup 2026"
 *
 * ----------------------------------------------------------------------------
 * 💡 VÌ SAO --hint TẠO KHÁC BIỆT LỚN?
 * Một bảng số chụp mờ có thể là bảng xếp hạng, cũng có thể là lịch thi đấu.
 * Nói trước cho model biết bối cảnh, nó sẽ đọc các con số theo đúng khuôn mẫu
 * mà nó đã biết, thay vì đoán mò. Chỉ một câu ngắn mà cải thiện đáng kể.
 * ============================================================================
 */

import fs from 'fs/promises';
import path from 'path';
import { connectDatabase, closeDatabase, queryOne, query } from '@/config/database';
import { env } from '@/config/env';
import { getKeyCount } from '@/config/gemini';
import { logger } from '@/utils/logger';
import { ocrFile, ocrUrl, ocrStructured } from '@/services/ocr.service';
import { chunkText, hashContent, removeAccents, estimateTokens } from '@/utils/text';
import { embedMany, serializeEmbedding } from '@/services/embedding.service';

function parseArgs(argv: string[]) {
  const targets: string[] = [];
  const flags = new Map<string, string>();

  for (const arg of argv) {
    if (arg.startsWith('--')) {
      // split('=') luôn trả về ít nhất một phần tử, nhưng TypeScript ở chế độ
      // nghiêm ngặt vẫn coi phần tử mảng là có thể undefined -> chốt lại bằng ?? ''
      const [key, value] = arg.slice(2).split('=');
      if (key) flags.set(key, value ?? 'true');
    } else {
      targets.push(arg);
    }
  }
  return { targets, flags };
}

/**
 * Lưu kết quả OCR vào kho tri thức, cắt đoạn và nhúng vector.
 *
 * Sau bước này, nội dung trong ảnh trở thành thứ mà API /search và trợ lý AI
 * tra cứu được — đó chính là mục đích của toàn bộ việc OCR.
 */
async function saveToKnowledgeBase(
  sourceKey: string,
  title: string,
  content: string,
  summary: string
): Promise<void> {
  const hash = hashContent(content);

  const doc = await queryOne<{ id: number }>(
    `INSERT INTO kb_documents
       (source, title, body, summary, source_url, content_hash, crawled_at, is_active)
     VALUES ('ocr', $1, $2, $3, $4, $5, NOW(), TRUE)
     -- ⚠️ idx_kb_documents_url là INDEX MỘT PHẦN (có mệnh đề WHERE). Postgres bắt buộc
     -- ON CONFLICT phải LẶP LẠI ĐÚNG mệnh đề WHERE đó thì mới nhận ra được index nào cần dùng.
     -- Thiếu dòng WHERE này, Postgres báo: "there is no unique or exclusion constraint
     -- matching the ON CONFLICT specification".
     ON CONFLICT (source_url) WHERE source_url IS NOT NULL DO UPDATE SET
       title = EXCLUDED.title, body = EXCLUDED.body, summary = EXCLUDED.summary,
       content_hash = EXCLUDED.content_hash, crawled_at = NOW(),
       version = kb_documents.version + 1, updated_at = NOW()
     RETURNING id`,
    [title.slice(0, 200), content, summary.slice(0, 1000), sourceKey, hash]
  );

  if (!doc) {
    console.error('❌ Không lưu được vào database.');
    return;
  }

  // Nội dung đã đổi -> đoạn cũ vô giá trị, xoá đi làm lại
  await query('DELETE FROM kb_chunks WHERE document_id = $1', [doc.id]);

  const pieces = chunkText(content, env.RAG_CHUNK_SIZE, env.RAG_CHUNK_OVERLAP);
  const vectors = await embedMany(pieces, 'RETRIEVAL_DOCUMENT');

  let embedded = 0;
  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i];
    if (!piece) continue; // không xảy ra trong thực tế, nhưng TypeScript cần bằng chứng
    const vector = vectors[i];
    await query(
      `INSERT INTO kb_chunks
         (document_id, chunk_index, content, content_norm, embedding_json, embedding_model, embedding_dim, token_estimate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        doc.id, i, piece, removeAccents(piece),
        vector ? serializeEmbedding(vector) : null,
        vector ? env.EMBEDDING_MODEL : null,
        vector ? env.EMBEDDING_DIM : null,
        estimateTokens(piece),
      ]
    );
    if (vector) embedded += 1;
  }

  console.log(
    '\n💾 Đã lưu vào kho tri thức: tài liệu #' + doc.id +
      ', ' + pieces.length + ' đoạn, ' + embedded + ' đoạn đã nhúng vector.'
  );
  console.log('   Thử tìm: curl "http://localhost:' + env.PORT + env.API_PREFIX + '/search?q=..."');
}

async function main() {
  const { targets, flags } = parseArgs(process.argv.slice(2));

  if (targets.length === 0) {
    console.error('\n❌ Chưa chỉ định file hoặc URL.\n');
    console.error('   npm run ocr -- ./anh.png');
    console.error('   npm run ocr -- https://example.com/anh.jpg --save\n');
    process.exit(1);
  }

  if (getKeyCount() === 0) {
    console.error('\n❌ Chưa có key Gemini. OCR bắt buộc phải có key.\n');
    console.error('   Điền vào .env ở gốc repo:  GEMINI_API_KEYS=key1,key2,key3\n');
    process.exit(1);
  }

  const hint = flags.get('hint');
  const shouldSave = flags.get('save') === 'true';
  // --structured bắt AI trả về JSON có cấu trúc thay vì chữ thuần
  const structured = flags.get('structured') === 'true' || shouldSave;

  // Chỉ mở database khi thật sự cần lưu — đọc chữ ra xem thì không cần
  if (shouldSave) await connectDatabase();

  try {
    for (const target of targets) {
      const isUrl = /^https?:\/\//i.test(target);
      console.log('\n📄 Đang xử lý: ' + target + (hint ? '  (bối cảnh: ' + hint + ')' : ''));

      if (structured) {
        // --- Nhánh có cấu trúc: cần buffer để gọi ocrStructured ---
        let buffer: Buffer;
        let mimeType: string;

        if (isUrl) {
          // Với URL, ocrUrl đã lo hết; ở đây ta gọi lại bản thô rồi tự phân tích
          const result = await ocrUrl(target, hint);
          if (!result) {
            console.error('   ❌ Không đọc được.');
            continue;
          }
          console.log('   ✅ Đọc được ' + result.charCount + ' ký tự.');
          if (shouldSave) {
            await saveToKnowledgeBase(
              target,
              decodeURIComponent(new URL(target).pathname.split('/').pop() || 'Tài liệu OCR'),
              result.text,
              result.text.slice(0, 300)
            );
          } else {
            console.log('\n' + result.text);
          }
          continue;
        }

        buffer = await fs.readFile(target);
        const ext = path.extname(target).toLowerCase();
        mimeType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';

        const result = await ocrStructured(buffer, mimeType, hint);
        if (!result) {
          console.error('   ❌ Không đọc được.');
          continue;
        }

        console.log('   ✅ Tiêu đề : ' + result.title);
        console.log('      Tóm tắt : ' + result.summary);
        console.log('      Ngày    : ' + (result.published_at || '(không có)'));
        console.log('      Từ khoá : ' + result.tags.join(', '));
        console.log('      Liên quan bóng đá VN: ' + (result.is_relevant ? 'có' : 'KHÔNG'));

        if (shouldSave) {
          if (!result.is_relevant) {
            console.log('   ⏭️  AI đánh giá tài liệu lạc đề — không lưu vào kho tri thức.');
          } else {
            await saveToKnowledgeBase(
              path.resolve(target),
              result.title,
              result.content,
              result.summary
            );
          }
        } else {
          console.log('\n--- NỘI DUNG ---\n' + result.content);
        }
      } else {
        // --- Nhánh thô: chỉ in chữ ra màn hình ---
        const result = isUrl ? await ocrUrl(target, hint) : await ocrFile(target, hint);
        if (!result) {
          console.error('   ❌ Không đọc được.');
          continue;
        }
        console.log('   ✅ ' + result.charCount + ' ký tự (model: ' + result.model + ')\n');
        console.log(result.text);
      }
    }
  } finally {
    if (shouldSave) await closeDatabase();
  }

  console.log('');
}

main().catch((err) => {
  logger.error('[ocr] Lỗi nghiêm trọng: ' + (err instanceof Error ? err.stack : String(err)));
  process.exit(1);
});
