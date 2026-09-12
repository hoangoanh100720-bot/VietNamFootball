/**
 * ============================================================================
 * SERVICES/CRAWL/CRAWLER.TS — BỘ ĐIỀU PHỐI TOÀN BỘ QUÁ TRÌNH CÀO DỮ LIỆU
 * ============================================================================
 *
 * 🗺️ TOÀN CẢNH MỘT LẦN CRAWL:
 *
 *    URL hạt giống
 *         │
 *         ▼
 *    ┌─────────────────┐   robots.txt cấm?  ──► ghi log 'blocked', bỏ qua
 *    │ robots.isAllowed│
 *    └────────┬────────┘
 *             ▼
 *    ┌─────────────────┐   nghỉ đúng nhịp, thử lại khi lỗi tạm thời
 *    │ fetcher.fetchUrl│
 *    └────────┬────────┘
 *             ▼
 *    ┌─────────────────┐   ảnh/PDF ──► ocr.service (Gemini đọc chữ)
 *    │  Là loại gì?    │
 *    └────────┬────────┘   HTML ──► extract.extractPage (cheerio + Gemini)
 *             ▼
 *    ┌─────────────────┐   hash giống lần trước? ──► 'skipped', khỏi nhúng lại
 *    │ So content_hash │
 *    └────────┬────────┘
 *             ▼
 *    ┌─────────────────┐
 *    │ Lưu kb_documents│──► cắt đoạn ──► nhúng vector theo lô ──► kb_chunks
 *    └────────┬────────┘
 *             ▼
 *    Lấy link trong trang, thêm vào hàng đợi (nếu chưa chạm giới hạn)
 *
 * ----------------------------------------------------------------------------
 * 🔍 DUYỆT THEO LỚP (BFS) CHỨ KHÔNG ĐÀO SÂU (DFS) — VÌ SAO?
 *
 * BFS = "Breadth-First Search", duyệt hết các trang ở độ sâu 1 rồi mới sang
 * độ sâu 2. Với crawler, điều này rất quan trọng: trang càng gần URL hạt
 * giống thì càng liên quan tới chủ đề. Đào sâu (DFS) sẽ lao thẳng xuống đáy
 * theo một nhánh ngẫu nhiên và mang về toàn thứ lạc đề.
 *
 * ----------------------------------------------------------------------------
 * 🛑 BA CÁI PHANH, THIẾU MỘT LÀ CRAWLER CHẠY MÃI KHÔNG DỪNG:
 *   1. CRAWLER_MAX_PAGES  — trần số trang
 *   2. CRAWLER_MAX_DEPTH  — trần độ sâu
 *   3. Set `visited`      — không bao giờ cào lại URL đã đi qua
 *
 * Thiếu cái thứ 3 là nguy hiểm nhất: hai trang trỏ qua lại lẫn nhau sẽ tạo
 * vòng lặp vô tận mà không có dấu hiệu gì bất thường trong log.
 * ============================================================================
 */

import { env } from '@/config/env';
import { query, queryOne } from '@/config/database';
import { logger } from '@/utils/logger';
import { chunkText, hashContent, removeAccents, estimateTokens } from '@/utils/text';
import { embedMany, serializeEmbedding } from '@/services/embedding.service';
import { ocrBuffer } from '@/services/ocr.service';
import { isAllowed } from './robots';
import { fetchUrl } from './fetcher';
import { extractPage } from './extract';

// ---------------------------------------------------------------------------
// KIỂU DỮ LIỆU
// ---------------------------------------------------------------------------

export interface CrawlOptions {
  /** Danh sách URL bắt đầu */
  seedUrls: string[];
  /** Trần số trang (mặc định lấy từ .env) */
  maxPages?: number;
  /** Trần độ sâu (mặc định lấy từ .env) */
  maxDepth?: number;
  /**
   * Chỉ đi tiếp vào link CÙNG tên miền với URL hạt giống.
   * Mặc định true — tắt đi là crawler sẽ lang thang khắp Internet.
   */
  sameDomainOnly?: boolean;
  /** Dùng Gemini để làm sạch nội dung. Tắt = không tốn quota, chất lượng thấp hơn. */
  useAi?: boolean;
  /** Nhúng vector ngay sau khi cào. Tắt thì chạy `npm run index` sau. */
  embed?: boolean;
  /** Chỉ nhận URL khớp mẫu này (chuỗi con hoặc biểu thức chính quy) */
  urlPattern?: RegExp;
}

export interface CrawlReport {
  pagesVisited: number;
  documentsSaved: number;
  documentsSkipped: number;
  blocked: number;
  errors: number;
  chunksCreated: number;
  chunksEmbedded: number;
  durationMs: number;
}

/** Một mục trong hàng đợi BFS */
interface QueueItem {
  url: string;
  depth: number;
}

// ---------------------------------------------------------------------------
// GHI NHẬT KÝ
// ---------------------------------------------------------------------------

/**
 * Ghi một dòng vào bảng crawl_logs.
 *
 * ⚠️ Bọc try/catch và NUỐT lỗi: việc ghi nhật ký không bao giờ được phép làm
 * hỏng công việc chính. Mất một dòng log thì tiếc, nhưng mất cả phiên crawl
 * 50 trang chỉ vì database bận thì tệ hơn nhiều.
 */
async function logCrawl(
  url: string,
  status: 'ok' | 'skipped' | 'blocked' | 'error',
  extra: { httpStatus?: number; message?: string; chars?: number; durationMs?: number } = {}
): Promise<void> {
  try {
    await query(
      `INSERT INTO crawl_logs (url, status, http_status, message, chars, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        url.slice(0, 2000),
        status,
        extra.httpStatus ?? null,
        extra.message?.slice(0, 1000) ?? null,
        extra.chars ?? null,
        extra.durationMs ?? null,
      ]
    );
  } catch {
    // cố tình im lặng — xem giải thích ở khối chú thích phía trên
  }
}

// ---------------------------------------------------------------------------
// LƯU TÀI LIỆU + CẮT ĐOẠN + NHÚNG VECTOR
// ---------------------------------------------------------------------------

/**
 * Lưu một tài liệu vào kho tri thức, rồi cắt đoạn và nhúng vector.
 *
 * ⭐ TỐI ƯU QUAN TRỌNG NHẤT CỦA CẢ PIPELINE nằm ở đây:
 * So `content_hash` với lần cào trước. Nội dung không đổi -> thoát ngay,
 * KHÔNG cắt đoạn, KHÔNG gọi API nhúng. Crawl lại 50 trang mà chỉ 2 trang
 * thay đổi thì chỉ tốn quota cho đúng 2 trang.
 *
 * @returns Số đoạn đã tạo và số đoạn đã nhúng thành công
 */
async function saveDocument(
  params: {
    url: string;
    title: string;
    summary: string;
    content: string;
    publishedAt: string;
    tags: string[];
    source: 'crawl' | 'ocr' | 'news';
  },
  shouldEmbed: boolean
): Promise<{ chunks: number; embedded: number; skipped: boolean }> {
  const hash = hashContent(params.content);

  // --- B1: nội dung có thay đổi so với lần trước không? ---
  const existing = await queryOne<{ id: number; content_hash: string | null }>(
    'SELECT id, content_hash FROM kb_documents WHERE source_url = $1',
    [params.url]
  );

  if (existing && existing.content_hash === hash) {
    logger.debug('[crawl] Nội dung không đổi, bỏ qua: ' + params.url);
    return { chunks: 0, embedded: 0, skipped: true };
  }

  // --- B2: UPSERT tài liệu ---
  /**
   * ON CONFLICT (source_url) DO UPDATE = "chưa có thì thêm, có rồi thì cập nhật".
   * Cách này giữ nguyên `id` của tài liệu — cực kỳ quan trọng vì kb_chunks
   * tham chiếu tới id đó. Xoá rồi thêm lại sẽ sinh id mới và làm đứt liên kết.
   *
   * `version = kb_documents.version + 1` để biết tài liệu đã được cập nhật
   * bao nhiêu lần — thông tin hữu ích khi cần truy vết.
   */
  const saved = await queryOne<{ id: number }>(
    `INSERT INTO kb_documents
       (source, title, body, summary, source_url, content_hash, published_at, tags, crawled_at, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), TRUE)
     -- ⚠️ idx_kb_documents_url là INDEX MỘT PHẦN (có mệnh đề WHERE). Postgres bắt buộc
     -- ON CONFLICT phải LẶP LẠI ĐÚNG mệnh đề WHERE đó thì mới nhận ra được index nào cần dùng.
     -- Thiếu dòng WHERE này, Postgres báo: "there is no unique or exclusion constraint
     -- matching the ON CONFLICT specification".
     ON CONFLICT (source_url) WHERE source_url IS NOT NULL DO UPDATE SET
       title        = EXCLUDED.title,
       body         = EXCLUDED.body,
       summary      = EXCLUDED.summary,
       content_hash = EXCLUDED.content_hash,
       published_at = EXCLUDED.published_at,
       tags         = EXCLUDED.tags,
       crawled_at   = NOW(),
       version      = kb_documents.version + 1,
       updated_at   = NOW()
     RETURNING id`,
    [
      params.source,
      params.title.slice(0, 200),
      params.content,
      params.summary.slice(0, 1000) || null,
      params.url,
      hash,
      params.publishedAt || null,
      params.tags.join(', ') || null,
    ]
  );

  if (!saved) {
    logger.error('[crawl] Không lưu được tài liệu: ' + params.url);
    return { chunks: 0, embedded: 0, skipped: false };
  }

  // --- B3: xoá đoạn cũ ---
  /**
   * Nội dung đã đổi nên các đoạn cũ không còn đúng nữa. Xoá sạch rồi tạo lại.
   * Đây là trường hợp HIẾM HOI mà "xoá rồi thêm" đúng hơn "cập nhật": số đoạn
   * có thể thay đổi (bài dài thêm ra), và không có cách nào ghép đoạn cũ với
   * đoạn mới một cách đáng tin cậy.
   */
  await query('DELETE FROM kb_chunks WHERE document_id = $1', [saved.id]);

  // --- B4: cắt đoạn ---
  const pieces = chunkText(params.content, env.RAG_CHUNK_SIZE, env.RAG_CHUNK_OVERLAP);
  if (pieces.length === 0) return { chunks: 0, embedded: 0, skipped: false };

  // --- B5: nhúng vector theo lô ---
  const vectors = shouldEmbed
    ? await embedMany(pieces, 'RETRIEVAL_DOCUMENT')
    : pieces.map(() => null);

  // --- B6: ghi các đoạn xuống database ---
  let embeddedCount = 0;

  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i];
    if (!piece) continue; // không xảy ra trong thực tế, nhưng TypeScript cần bằng chứng
    const vector = vectors[i];

    await query(
      `INSERT INTO kb_chunks
         (document_id, chunk_index, content, content_norm, embedding_json, embedding_model, embedding_dim, token_estimate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (document_id, chunk_index) DO UPDATE SET
         content        = EXCLUDED.content,
         content_norm   = EXCLUDED.content_norm,
         embedding_json = EXCLUDED.embedding_json,
         embedding_model= EXCLUDED.embedding_model,
         embedding_dim  = EXCLUDED.embedding_dim,
         token_estimate = EXCLUDED.token_estimate`,
      [
        saved.id,
        i,
        piece,
        // Bỏ dấu sẵn và lưu lại -> tìm kiếm không phải tính lại mỗi lần truy vấn
        removeAccents(piece),
        vector ? serializeEmbedding(vector) : null,
        vector ? env.EMBEDDING_MODEL : null,
        vector ? env.EMBEDDING_DIM : null,
        estimateTokens(piece),
      ]
    );

    if (vector) embeddedCount += 1;
  }

  return { chunks: pieces.length, embedded: embeddedCount, skipped: false };
}

// ---------------------------------------------------------------------------
// VÒNG CRAWL CHÍNH
// ---------------------------------------------------------------------------

/**
 * ⭐ Chạy một phiên crawl hoàn chỉnh.
 *
 * Ví dụ dùng:
 *
 *   await crawl({
 *     seedUrls: ['https://vff.org.vn/tin-tuc/'],
 *     maxPages: 30,
 *     maxDepth: 2,
 *     useAi: true,
 *     embed: true,
 *   });
 */
export async function crawl(options: CrawlOptions): Promise<CrawlReport> {
  const startedAt = Date.now();

  const maxPages = options.maxPages ?? env.CRAWLER_MAX_PAGES;
  const maxDepth = options.maxDepth ?? env.CRAWLER_MAX_DEPTH;
  const sameDomainOnly = options.sameDomainOnly ?? true;
  const useAi = options.useAi ?? true;
  const shouldEmbed = options.embed ?? true;

  const report: CrawlReport = {
    pagesVisited: 0,
    documentsSaved: 0,
    documentsSkipped: 0,
    blocked: 0,
    errors: 0,
    chunksCreated: 0,
    chunksEmbedded: 0,
    durationMs: 0,
  };

  /**
   * Set các URL đã xử lý. Đây là thứ ngăn crawler chạy vòng tròn vô tận —
   * xem lại phần "ba cái phanh" ở đầu file.
   */
  const visited = new Set<string>();

  /** Hàng đợi BFS: lấy từ đầu (shift), thêm vào cuối (push) */
  const queue: QueueItem[] = options.seedUrls.map((url) => ({ url, depth: 0 }));

  /** Các tên miền được phép, lấy từ chính danh sách hạt giống */
  const allowedHosts = new Set(
    options.seedUrls
      .map((u) => {
        try {
          return new URL(u).hostname;
        } catch {
          return '';
        }
      })
      .filter(Boolean)
  );

  logger.info(
    '[crawl] Bắt đầu — ' + options.seedUrls.length + ' URL hạt giống, ' +
      'tối đa ' + maxPages + ' trang, sâu ' + maxDepth + ' lớp, ' +
      'AI: ' + (useAi ? 'bật' : 'tắt') + ', nhúng vector: ' + (shouldEmbed ? 'bật' : 'tắt')
  );

  while (queue.length > 0 && report.pagesVisited < maxPages) {
    const item = queue.shift();
    if (!item) break;

    // Chuẩn hoá URL trước khi so trùng: bỏ phần #neo để "/a" và "/a#top"
    // không bị coi là hai trang khác nhau.
    let normalizedUrl: string;
    try {
      const parsed = new URL(item.url);
      parsed.hash = '';
      normalizedUrl = parsed.toString();
    } catch {
      continue; // URL hỏng -> bỏ qua lặng lẽ
    }

    if (visited.has(normalizedUrl)) continue;
    visited.add(normalizedUrl);

    const pageStarted = Date.now();

    // --- Cổng 1: robots.txt ---
    if (!(await isAllowed(normalizedUrl))) {
      report.blocked += 1;
      logger.warn('[crawl] robots.txt CẤM: ' + normalizedUrl);
      await logCrawl(normalizedUrl, 'blocked', { message: 'robots.txt disallow' });
      continue;
    }

    // --- Cổng 2: tải trang ---
    const fetched = await fetchUrl(normalizedUrl);
    report.pagesVisited += 1;

    if (!fetched || fetched.status >= 400) {
      report.errors += 1;
      await logCrawl(normalizedUrl, 'error', {
        httpStatus: fetched?.status,
        message: 'Không tải được',
        durationMs: Date.now() - pageStarted,
      });
      continue;
    }

    try {
      // =====================================================================
      // NHÁNH A — ẢNH / PDF: dùng OCR
      // =====================================================================
      if (fetched.binary && (fetched.contentType.includes('image/') || fetched.contentType.includes('pdf'))) {
        const ocr = await ocrBuffer(
          fetched.binary,
          (fetched.contentType.split(';')[0] ?? '').trim(),
          'Tài liệu lấy từ ' + normalizedUrl + ', chủ đề bóng đá Việt Nam'
        );

        if (!ocr || ocr.text.length < 50) {
          report.documentsSkipped += 1;
          await logCrawl(normalizedUrl, 'skipped', { message: 'OCR không đọc được chữ' });
          continue;
        }

        const result = await saveDocument(
          {
            url: normalizedUrl,
            // Ảnh không có tiêu đề -> lấy tên file, hoặc dòng đầu của phần chữ OCR
            title: decodeURIComponent(new URL(normalizedUrl).pathname.split('/').pop() || 'Tài liệu OCR'),
            summary: ocr.text.slice(0, 300),
            content: ocr.text,
            publishedAt: '',
            tags: ['ocr'],
            source: 'ocr',
          },
          shouldEmbed
        );

        if (result.skipped) report.documentsSkipped += 1;
        else report.documentsSaved += 1;
        report.chunksCreated += result.chunks;
        report.chunksEmbedded += result.embedded;

        await logCrawl(normalizedUrl, result.skipped ? 'skipped' : 'ok', {
          httpStatus: fetched.status,
          chars: ocr.charCount,
          durationMs: Date.now() - pageStarted,
        });
        continue;
      }

      // =====================================================================
      // NHÁNH B — HTML: bóc tách nội dung
      // =====================================================================
      if (!fetched.html) {
        report.documentsSkipped += 1;
        await logCrawl(normalizedUrl, 'skipped', { message: 'Không phải HTML, cũng không phải ảnh/PDF' });
        continue;
      }

      const page = await extractPage(fetched.html, fetched.finalUrl, useAi);

      // --- Thêm link tìm được vào hàng đợi ---
      if (item.depth < maxDepth) {
        for (const link of page.links) {
          if (visited.has(link)) continue;

          try {
            const linkHost = new URL(link).hostname;
            if (sameDomainOnly && !allowedHosts.has(linkHost)) continue;
            if (options.urlPattern && !options.urlPattern.test(link)) continue;
          } catch {
            continue;
          }

          queue.push({ url: link, depth: item.depth + 1 });
        }
      }

      // --- Lọc trang không dùng được ---
      if (!page.isRelevant) {
        report.documentsSkipped += 1;
        logger.debug('[crawl] AI đánh giá lạc đề, bỏ qua: ' + normalizedUrl);
        await logCrawl(normalizedUrl, 'skipped', { message: 'AI đánh giá không liên quan' });
        continue;
      }

      /**
       * Ngưỡng 200 ký tự loại bỏ trang mục lục, trang chuyển hướng và trang
       * lỗi — những trang tuy tải được nhưng chẳng có nội dung gì để học.
       * Chú ý: link của chúng VẪN đã được thêm vào hàng đợi ở trên, vì trang
       * mục lục chính là nơi dẫn tới các bài viết thật.
       */
      if (page.content.length < 200) {
        report.documentsSkipped += 1;
        await logCrawl(normalizedUrl, 'skipped', {
          message: 'Nội dung quá ngắn (' + page.content.length + ' ký tự)',
        });
        continue;
      }

      const result = await saveDocument(
        {
          url: normalizedUrl,
          title: page.title,
          summary: page.summary,
          content: page.content,
          publishedAt: page.publishedAt,
          tags: page.tags,
          source: 'crawl',
        },
        shouldEmbed
      );

      if (result.skipped) {
        report.documentsSkipped += 1;
      } else {
        report.documentsSaved += 1;
        logger.info(
          '[crawl] ✓ ' + page.title.slice(0, 60) +
            ' (' + page.content.length + ' ký tự, ' + result.chunks + ' đoạn, ' +
            result.embedded + ' đã nhúng)'
        );
      }

      report.chunksCreated += result.chunks;
      report.chunksEmbedded += result.embedded;

      await logCrawl(normalizedUrl, result.skipped ? 'skipped' : 'ok', {
        httpStatus: fetched.status,
        chars: page.content.length,
        durationMs: Date.now() - pageStarted,
      });
    } catch (err) {
      /**
       * Một trang hỏng KHÔNG được phép làm chết cả phiên crawl. Ghi lỗi,
       * đi tiếp. Sau 50 trang, vài trang lỗi là chuyện bình thường.
       */
      report.errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[crawl] Lỗi khi xử lý ' + normalizedUrl + ': ' + message);
      await logCrawl(normalizedUrl, 'error', { message, durationMs: Date.now() - pageStarted });
    }
  }

  report.durationMs = Date.now() - startedAt;

  logger.info(
    '[crawl] XONG sau ' + Math.round(report.durationMs / 1000) + 's — ' +
      report.pagesVisited + ' trang, ' +
      report.documentsSaved + ' tài liệu mới/cập nhật, ' +
      report.documentsSkipped + ' bỏ qua, ' +
      report.blocked + ' bị robots.txt chặn, ' +
      report.errors + ' lỗi, ' +
      report.chunksEmbedded + '/' + report.chunksCreated + ' đoạn đã nhúng vector'
  );

  return report;
}

// ---------------------------------------------------------------------------
// NHÚNG BÙ — XỬ LÝ NỐT CÁC ĐOẠN CÒN THIẾU VECTOR
// ---------------------------------------------------------------------------

/**
 * Tìm các đoạn chưa có vector rồi nhúng bù.
 *
 * KHI NÀO CẦN?
 *   • Lần crawl trước chạy với embed: false (cào nhanh, nhúng sau)
 *   • Lần trước hết sạch quota giữa chừng, còn sót lại một mớ đoạn null
 *   • Bạn vừa thêm key Gemini mới vào .env và muốn xử lý nốt phần tồn đọng
 *
 * Chạy bằng lệnh: npm run index
 *
 * @param limit Số đoạn xử lý tối đa trong một lần chạy. Chia nhỏ ra nhiều
 *              lần giúp bạn kiểm soát được lượng quota tiêu thụ mỗi lần.
 */
export async function embedPendingChunks(limit = 500): Promise<{ processed: number; embedded: number }> {
  const { rows } = await query<{ id: number; content: string }>(
    `SELECT id, content
     FROM kb_chunks
     WHERE embedding_json IS NULL
     ORDER BY id
     LIMIT $1`,
    [limit]
  );

  if (rows.length === 0) {
    logger.info('[index] Mọi đoạn đều đã có vector — không còn gì để làm.');
    return { processed: 0, embedded: 0 };
  }

  logger.info('[index] Đang nhúng ' + rows.length + ' đoạn còn thiếu vector...');

  const vectors = await embedMany(
    rows.map((r) => r.content),
    'RETRIEVAL_DOCUMENT',
    (done, total) => logger.info('[index] Tiến độ ' + done + '/' + total)
  );

  let embedded = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const vector = vectors[i];
    if (!row || !vector) continue; // lô này hỏng -> để dành cho lần chạy sau

    await query(
      `UPDATE kb_chunks
       SET embedding_json = $1, embedding_model = $2, embedding_dim = $3
       WHERE id = $4`,
      [serializeEmbedding(vector), env.EMBEDDING_MODEL, env.EMBEDDING_DIM, row.id]
    );
    embedded += 1;
  }

  logger.info('[index] Xong: nhúng thành công ' + embedded + '/' + rows.length + ' đoạn.');
  return { processed: rows.length, embedded };
}
