/**
 * ============================================================================
 * MODULES/SEARCH/SEARCH.SERVICE.TS — TÌM KIẾM LAI (HYBRID SEARCH)
 * ============================================================================
 *
 * 🎯 VÌ SAO PHẢI "LAI" HAI CÁCH TÌM?
 *
 * Mỗi cách đều giỏi một kiểu và dốt kiểu còn lại:
 *
 *   ┌───────────────────┬──────────────────────────┬──────────────────────────┐
 *   │                   │ TÌM THEO TỪ KHOÁ         │ TÌM THEO VECTOR          │
 *   ├───────────────────┼──────────────────────────┼──────────────────────────┤
 *   │ "Nguyễn Tiến Linh"│ ✅ khớp chính xác tên     │ ⚠️ dễ lẫn với cầu thủ   │
 *   │                   │                          │    khác cùng vị trí      │
 *   │ "ai đá tiền đạo?" │ ❌ trong bài không hề có  │ ✅ hiểu đúng ý, tìm ra   │
 *   │                   │    chữ "ai đá"           │    đoạn nói về tiền đạo  │
 *   │ "AFF Cup 2008"    │ ✅ khớp đúng con số       │ ⚠️ có thể lẫn sang 2018  │
 *   └───────────────────┴──────────────────────────┴──────────────────────────┘
 *
 * => Chạy CẢ HAI rồi trộn điểm lại. Tên riêng và con số do từ khoá lo,
 *    ý nghĩa và cách diễn đạt khác do vector lo. Đây là cách mà mọi hệ thống
 *    RAG nghiêm túc đang dùng.
 *
 * ----------------------------------------------------------------------------
 * 🗄️ CHẠY ĐƯỢC TRÊN CẢ HAI LOẠI DATABASE
 *
 *   DB_DRIVER=postgres : có pgvector -> so sánh vector NGAY TRONG database
 *                        bằng toán tử `<=>` + index HNSW. Nhanh, không giới
 *                        hạn số lượng tài liệu.
 *
 *   DB_DRIVER=pglite   : không có pgvector -> đọc embedding_json lên RAM rồi
 *                        tính cosine bằng JavaScript. Chậm hơn nhưng KHÔNG
 *                        cần cài gì, đủ tốt cho vài nghìn đoạn khi dev.
 *
 * Người gọi API không cần biết mình đang ở nhánh nào — kết quả trả về giống hệt.
 *
 * ----------------------------------------------------------------------------
 * 🛟 LUÔN CÓ ĐƯỜNG LÙI
 * Không có key Gemini -> không tạo được vector cho câu hỏi -> tự động lùi về
 * tìm kiếm từ khoá thuần. Tính năng KHÔNG BAO GIỜ chết hẳn, chỉ kém thông
 * minh đi. Đây là nguyên tắc "suy giảm nhẹ nhàng" (graceful degradation).
 * ============================================================================
 */

import { env } from '@/config/env';
import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import {
  embedText,
  parseEmbedding,
  cosineSimilarity,
  toPgVector,
  type Embedding,
} from '@/services/embedding.service';
import { removeAccents, tokenizeQuery } from '@/utils/text';

// ---------------------------------------------------------------------------
// KIỂU DỮ LIỆU
// ---------------------------------------------------------------------------

/** Một kết quả tìm kiếm trả về cho app */
export interface SearchHit {
  chunk_id: number;
  document_id: number;
  /** Tiêu đề tài liệu chứa đoạn này */
  title: string;
  /** Nội dung đoạn văn bản khớp */
  content: string;
  /** Nguồn: 'history' | 'crawl' | 'ocr' | 'news' ... */
  source: string;
  /** URL gốc, null với tài liệu nhập tay */
  source_url: string | null;
  /** Điểm cuối cùng sau khi trộn (0-1, càng cao càng liên quan) */
  score: number;
  /** Điểm riêng của từng cách tìm — hiển thị khi debug=true, rất đáng để soi */
  vector_score: number;
  keyword_score: number;
}

export interface SearchOptions {
  /** Số kết quả tối đa */
  limit?: number;
  /** Lọc theo nguồn, ví dụ chỉ tìm trong 'crawl' */
  source?: string;
  /** Trả về cả điểm thành phần để gỡ lỗi */
  debug?: boolean;
}

/** Dòng thô đọc từ database, trước khi tính điểm */
interface ChunkRow {
  chunk_id: number;
  document_id: number;
  title: string;
  content: string;
  content_norm: string | null;
  source: string;
  source_url: string | null;
  embedding_json: string | null;
}

// ---------------------------------------------------------------------------
// TRỌNG SỐ TRỘN ĐIỂM
// ---------------------------------------------------------------------------

/**
 * ⚖️ 70% vector + 30% từ khoá.
 *
 * VÌ SAO NGHIÊNG VỀ VECTOR? Vì phần lớn câu hỏi người dùng gõ vào là ngôn ngữ
 * tự nhiên ("đội mình vô địch AFF mấy lần rồi?"), nơi vector áp đảo. 30% dành
 * cho từ khoá vừa đủ để KÉO LÊN những đoạn có chứa đúng tên riêng/con số mà
 * người dùng gõ — thứ vector hay bỏ sót.
 *
 * Hai con số này đáng để bạn tự tinh chỉnh: tăng KEYWORD_WEIGHT nếu người
 * dùng của bạn hay tra cứu tên cầu thủ; tăng VECTOR_WEIGHT nếu họ hay hỏi
 * câu dài.
 */
const VECTOR_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 0.3;

// ---------------------------------------------------------------------------
// TÍNH ĐIỂM TỪ KHOÁ
// ---------------------------------------------------------------------------

/**
 * Chấm điểm mức khớp từ khoá của một đoạn văn, kết quả 0-1.
 *
 * CÔNG THỨC (đơn giản có chủ đích — dễ hiểu, dễ sửa, không cần thư viện):
 *   • Mỗi từ khoá xuất hiện trong đoạn  -> +1 điểm
 *   • Cả CỤM từ xuất hiện nguyên vẹn    -> +2 điểm thưởng
 *     ("tiến linh ghi bàn" đứng liền nhau đáng giá hơn ba từ nằm rải rác)
 *   • Chia cho điểm tối đa có thể đạt   -> đưa về thang 0-1 để trộn được
 *     với điểm cosine (vốn cũng nằm trong 0-1).
 *
 * ⚠️ Chuẩn hoá về cùng thang đo là bước BẮT BUỘC khi trộn hai loại điểm.
 * Cộng thẳng một điểm 0-1 với một điểm 0-15 thì loại điểm lớn sẽ nuốt chửng
 * loại kia, và trọng số 70/30 ở trên trở nên vô nghĩa.
 */
function scoreKeywords(contentNorm: string, keywords: string[], normalizedQuery: string): number {
  if (keywords.length === 0) return 0;

  let score = 0;
  for (const word of keywords) {
    if (contentNorm.includes(word)) score += 1;
  }

  // Thưởng khi cả cụm xuất hiện nguyên vẹn
  if (keywords.length > 1 && contentNorm.includes(normalizedQuery)) {
    score += 2;
  }

  const maxPossible = keywords.length + (keywords.length > 1 ? 2 : 0);
  return Math.min(1, score / maxPossible);
}

// ---------------------------------------------------------------------------
// NHÁNH A — POSTGRESQL THẬT (có pgvector)
// ---------------------------------------------------------------------------

/**
 * Tìm kiếm bằng pgvector: mọi phép so sánh diễn ra NGAY TRONG database.
 *
 * 🔑 Toán tử `<=>` là "khoảng cách cosine" của pgvector. Lưu ý nó là KHOẢNG
 * CÁCH chứ không phải độ tương đồng:
 *     khoảng cách 0   = giống hệt
 *     khoảng cách 1   = không liên quan
 * Nên phải đổi dấu: similarity = 1 - distance.
 *
 * ORDER BY ... LIMIT k trên cột có index HNSW là cách duy nhất để pgvector
 * dùng được index. Viết kiểu khác (lọc bằng WHERE trên khoảng cách) sẽ khiến
 * Postgres quét toàn bảng — chậm gấp hàng trăm lần khi dữ liệu lớn.
 */
async function searchWithPgvector(
  queryVector: Embedding,
  keywords: string[],
  normalizedQuery: string,
  limit: number,
  source?: string
): Promise<SearchHit[]> {
  /**
   * Lấy dư gấp 4 lần số cần (candidate pool) rồi mới trộn điểm từ khoá.
   *
   * Vì sao lấy dư? Vì thứ hạng theo vector CHƯA phải thứ hạng cuối cùng.
   * Một đoạn xếp thứ 20 theo vector có thể vọt lên top 3 sau khi cộng điểm
   * từ khoá. Chỉ lấy đúng `limit` là ta đã vô tình vứt nó đi trước khi chấm.
   */
  const poolSize = Math.max(limit * 4, 30);

  const sql = `
    SELECT
      c.id            AS chunk_id,
      c.document_id,
      d.title,
      c.content,
      c.content_norm,
      d.source,
      d.source_url,
      -- pgvector trả KHOẢNG CÁCH; đổi thành ĐỘ TƯƠNG ĐỒNG cho dễ hiểu
      1 - (c.embedding <=> $1::vector) AS vector_score
    FROM kb_chunks c
    JOIN kb_documents d ON d.id = c.document_id
    WHERE c.embedding IS NOT NULL
      AND d.is_active = TRUE
      ${source ? 'AND d.source = $3' : ''}
    ORDER BY c.embedding <=> $1::vector
    LIMIT $2
  `;

  const params: unknown[] = [toPgVector(queryVector), poolSize];
  if (source) params.push(source);

  const { rows } = await query<ChunkRow & { vector_score: number }>(sql, params);

  return rows
    .map((row) => {
      const keywordScore = scoreKeywords(
        row.content_norm ?? removeAccents(row.content),
        keywords,
        normalizedQuery
      );
      return {
        chunk_id: row.chunk_id,
        document_id: row.document_id,
        title: row.title,
        content: row.content,
        source: row.source,
        source_url: row.source_url,
        vector_score: row.vector_score,
        keyword_score: keywordScore,
        score: VECTOR_WEIGHT * row.vector_score + KEYWORD_WEIGHT * keywordScore,
      };
    })
    .sort((a, b) => b.score - a.score);
  // ⚠️ CỐ TÌNH KHÔNG cắt còn `limit` ở đây — hybridSearch() cắt sau khi đã
  //    đa dạng hoá nguồn. Xem giải thích đầy đủ ở hàm diversify().
}

// ---------------------------------------------------------------------------
// NHÁNH B — PGLITE (tính cosine bằng JavaScript)
// ---------------------------------------------------------------------------

/**
 * Tìm kiếm khi không có pgvector.
 *
 * CÁCH LÀM: đọc các đoạn đã có vector lên RAM, tính cosine trong JavaScript.
 *
 * ----------------------------------------------------------------------------
 * 📊 SỐ ĐO THẬT — VÀ NÓ BÁC BỎ MỘT GIẢ ĐỊNH RẤT TỰ NHIÊN
 *
 * Đo trên kho 903 đoạn, mỗi vector 768 chiều:
 *
 *     Nhúng câu hỏi (gọi Gemini) :  736ms   83%   ← nút thắt thật sự
 *     Đọc từ database            :  101ms   11%
 *     Parse JSON thành mảng số   :   47ms    5%
 *     Tính cosine                :    2ms    0%   ← gần như miễn phí!
 *
 * Ai cũng dễ nghĩ "tính vector bằng JavaScript chắc chậm lắm". Không hề:
 * 693.000 phép nhân chỉ mất 2 mili-giây. Phần chậm nằm ở CHUYẾN ĐI MẠNG
 * tới Google, và ở việc ĐỌC dữ liệu khỏi database.
 *
 * 👉 Vì thế tối ưu đúng chỗ là CACHE VECTOR CÂU HỎI (xem embedQueryCached),
 *    không phải đi tối ưu phép nhân vector.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ VẬY KHI NÀO PHẢI CHUYỂN SANG POSTGRESQL + pgvector?
 *
 * Không phải vì phép tính cosine, mà vì bước ĐỌC DỮ LIỆU: nhánh này kéo TOÀN
 * BỘ đoạn văn bản lên RAM mỗi lần tìm kiếm. 903 đoạn tốn 101ms; 5.000 đoạn sẽ
 * tốn khoảng nửa giây, và lượng RAM cũng tăng theo.
 *
 * pgvector thì ngược lại: index HNSW giúp database chỉ chạm vào vài chục dòng
 * gần nhất, không quan tâm bảng có 5 nghìn hay 5 triệu đoạn.
 *
 * MAX_SCAN dưới đây là chốt chặn: quét nhiều nhất 5.000 đoạn. Chạm trần nghĩa
 * là đã đến lúc đổi DB_DRIVER=postgres — và log sẽ nhắc bạn đúng điều đó.
 */
const MAX_SCAN = 5000;

async function searchInJavaScript(
  queryVector: Embedding | null,
  keywords: string[],
  normalizedQuery: string,
  limit: number,
  source?: string
): Promise<SearchHit[]> {
  const sql = `
    SELECT
      c.id AS chunk_id,
      c.document_id,
      d.title,
      c.content,
      c.content_norm,
      d.source,
      d.source_url,
      c.embedding_json
    FROM kb_chunks c
    JOIN kb_documents d ON d.id = c.document_id
    WHERE d.is_active = TRUE
      ${source ? 'AND d.source = $2' : ''}
    ORDER BY c.id
    LIMIT $1
  `;

  const params: unknown[] = [MAX_SCAN];
  if (source) params.push(source);

  const { rows } = await query<ChunkRow>(sql, params);

  if (rows.length >= MAX_SCAN) {
    logger.warn(
      '[Search] Đã chạm trần quét ' +
        MAX_SCAN +
        ' đoạn trên PGlite. Kết quả có thể thiếu. ' +
        'Đã đến lúc chuyển DB_DRIVER=postgres để dùng pgvector.'
    );
  }

  const hits: SearchHit[] = rows.map((row) => {
    const contentNorm = row.content_norm ?? removeAccents(row.content);
    const keywordScore = scoreKeywords(contentNorm, keywords, normalizedQuery);

    // Không có vector câu hỏi (thiếu key Gemini) HOẶC đoạn này chưa được
    // nhúng -> điểm vector bằng 0, kết quả hoàn toàn dựa vào từ khoá.
    let vectorScore = 0;
    if (queryVector) {
      const chunkVector = parseEmbedding(row.embedding_json);
      if (chunkVector) vectorScore = cosineSimilarity(queryVector, chunkVector);
    }

    return {
      chunk_id: row.chunk_id,
      document_id: row.document_id,
      title: row.title,
      content: row.content,
      source: row.source,
      source_url: row.source_url,
      vector_score: vectorScore,
      keyword_score: keywordScore,
      score: VECTOR_WEIGHT * vectorScore + KEYWORD_WEIGHT * keywordScore,
    };
  });

  // ⚠️ CỐ TÌNH KHÔNG cắt còn `limit` ở đây — hybridSearch() cắt sau khi đã
  //    đa dạng hoá nguồn. Xem giải thích đầy đủ ở hàm diversify().
  return hits.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// CACHE VECTOR CÂU HỎI
// ---------------------------------------------------------------------------

/**
 * ⭐ NHỚ LẠI VECTOR CỦA NHỮNG CÂU HỎI ĐÃ GẶP.
 *
 * 📊 VÌ SAO ĐÂY LÀ TỐI ƯU ĐÁNG GIÁ NHẤT — SỐ ĐO THẬT, KHÔNG PHẢI PHỎNG ĐOÁN:
 *
 * Đo một lượt tìm kiếm trên kho 903 đoạn:
 *
 *     1. Nhúng câu hỏi (gọi Gemini)  :  736ms   83%   ← nút thắt thật sự
 *     2. Đọc từ database             :  101ms   11%
 *     3. Parse JSON thành mảng số    :   47ms    5%
 *     4. Tính cosine 768 chiều       :    2ms    0%
 *
 * Kết quả này BÁC BỎ một giả định rất tự nhiên: "tính vector bằng JavaScript
 * chắc chậm lắm". Thực tế 903 phép nhân vector 768 chiều chỉ mất 2 mili-giây.
 * Toàn bộ độ trễ nằm ở CHUYẾN ĐI MẠNG tới Google.
 *
 * 👉 Bài học chung: đo trước, tối ưu sau. Nếu cứ theo trực giác mà đi tối ưu
 *    phép tính cosine, ta sẽ tốn cả buổi để cải thiện đúng 2ms trên tổng 886ms.
 *
 * 💰 LỢI ÍCH KÉP: mỗi lần trúng cache vừa tiết kiệm ~736ms, vừa BỚT MỘT LƯỢT
 * gọi quota Gemini. Với hai người cùng hỏi một câu, hoặc một người bấm tìm lại,
 * lượt thứ hai gần như miễn phí.
 *
 * ⚠️ VÌ SAO CHỈ GIỮ 200 CÂU VÀ TRONG RAM?
 *   • 200 câu × 768 số × 8 byte ≈ 1,2MB — không đáng kể.
 *   • Trong RAM nên mất khi khởi động lại: chấp nhận được, vì cache chỉ để
 *     tăng tốc, không phải nguồn dữ liệu. Cần bền vững thì chuyển sang Redis.
 *   • Vượt 200 thì xoá mục CŨ NHẤT (Map của JavaScript giữ đúng thứ tự chèn,
 *     nên phần tử đầu tiên chính là cái cũ nhất — không cần thư viện LRU).
 */
const queryVectorCache = new Map<string, Embedding>();
const QUERY_CACHE_MAX = 200;

async function embedQueryCached(rawQuery: string): Promise<Embedding | null> {
  /**
   * Khoá cache đã BỎ DẤU và viết thường, nên "Đội tuyển" và "doi tuyen" dùng
   * chung một mục. Hai cách gõ đó cho ra kết quả gần như y hệt, không đáng
   * tốn hai lượt gọi API.
   */
  const key = removeAccents(rawQuery).replace(/\s+/g, ' ').trim();

  const cached = queryVectorCache.get(key);
  if (cached) {
    logger.debug('[Search] Trúng cache vector câu hỏi — tiết kiệm một lượt gọi Gemini.');
    return cached;
  }

  const vector = await embedText(rawQuery, 'RETRIEVAL_QUERY');
  if (!vector) return null;

  // Chạm trần -> bỏ mục cũ nhất (phần tử đầu tiên của Map)
  if (queryVectorCache.size >= QUERY_CACHE_MAX) {
    const oldest = queryVectorCache.keys().next().value;
    if (oldest !== undefined) queryVectorCache.delete(oldest);
  }
  queryVectorCache.set(key, vector);

  return vector;
}

// ---------------------------------------------------------------------------
// HÀM CÔNG KHAI
// ---------------------------------------------------------------------------

/**
 * ⭐ TÌM KIẾM LAI — hàm chính của module này.
 *
 * Trình tự:
 *   1. Tách câu hỏi thành từ khoá đã bỏ dấu
 *   2. Nhúng câu hỏi thành vector (taskType = RETRIEVAL_QUERY)
 *   3. Chọn nhánh tìm kiếm theo DB_DRIVER
 *   4. Lọc bỏ kết quả dưới ngưỡng SEARCH_MIN_SCORE
 *
 * @param userQuery Câu hỏi người dùng gõ vào, tiếng Việt có dấu hay không đều được
 */
export async function hybridSearch(
  userQuery: string,
  options: SearchOptions = {}
): Promise<SearchHit[]> {
  const limit = options.limit ?? env.SEARCH_TOP_K;
  const trimmed = userQuery.trim();

  if (trimmed.length === 0) return [];

  const keywords = tokenizeQuery(trimmed);
  const normalizedQuery = removeAccents(trimmed);

  /**
   * Nhúng câu hỏi. Chú ý taskType là RETRIEVAL_QUERY, KHÁC với lúc nhúng
   * tài liệu (RETRIEVAL_DOCUMENT) — xem giải thích trong embedding.service.ts.
   * Dùng sai taskType vẫn chạy, nhưng chất lượng kết quả tụt thấy rõ.
   *
   * ⭐ CÓ CACHE — xem embedQueryCached() để biết vì sao đây là tối ưu đáng giá nhất.
   */
  const queryVector = await embedQueryCached(trimmed);

  if (!queryVector) {
    logger.info('[Search] Không tạo được vector cho câu hỏi -> lùi về tìm theo từ khoá.');
  }

  const usePgvector = env.DB_DRIVER === 'postgres' && queryVector !== null;

  let hits: SearchHit[];
  try {
    hits = usePgvector
      ? await searchWithPgvector(queryVector!, keywords, normalizedQuery, limit, options.source)
      : await searchInJavaScript(queryVector, keywords, normalizedQuery, limit, options.source);
  } catch (err) {
    /**
     * Nhánh pgvector có thể lỗi nếu extension chưa được cài trên máy chủ
     * PostgreSQL (ví dụ Neon/Supabase chưa bật). Không để cả API sập:
     * lùi về nhánh JavaScript, ghi log rõ nguyên nhân để còn biết đường sửa.
     */
    logger.error(
      '[Search] Truy vấn pgvector thất bại, lùi về tính bằng JavaScript: ' +
        (err instanceof Error ? err.message : String(err))
    );
    hits = await searchInJavaScript(queryVector, keywords, normalizedQuery, limit, options.source);
  }

  /**
   * Lọc rác. Không lọc thì mọi câu hỏi đều trả về đủ `limit` kết quả, kể cả
   * khi chẳng có gì liên quan — và AI sẽ lấy đúng mấy đoạn rác đó làm căn cứ
   * trả lời. Thà trả về mảng rỗng và nói "chưa có dữ liệu" còn hơn.
   */
  const filtered = hits.filter((h) => h.score >= env.SEARCH_MIN_SCORE);

  // Đa dạng hoá nguồn trước khi trả về — xem giải thích ở diversify()
  const diversified = diversify(filtered, limit);

  // Không debug thì giấu điểm thành phần đi cho gọn payload gửi xuống app
  if (!options.debug) {
    return diversified.map((h) => ({ ...h, vector_score: 0, keyword_score: 0 }));
  }

  return diversified;
}

/**
 * ⭐ ĐA DẠNG HOÁ NGUỒN — mỗi tài liệu góp tối đa 2 đoạn vào kết quả.
 *
 * 🐛 VẤN ĐỀ CÓ THẬT ĐÃ QUAN SÁT ĐƯỢC khi kho tri thức lên 139 tài liệu:
 * hỏi "Doi tuyen U17 quoc gia" thì cả hai kết quả đầu đều là hai đoạn NẰM
 * CẠNH NHAU của cùng một bài. Chuyện này hoàn toàn hợp lý về mặt toán học —
 * hai đoạn liền kề nói cùng một chủ đề nên điểm gần bằng nhau — nhưng với
 * người dùng thì đó là "hai kết quả giống hệt", và họ mất luôn cơ hội thấy
 * bài thứ hai cũng liên quan.
 *
 * Hậu quả còn nặng hơn khi kết quả được nạp vào prompt cho AI (buildContextBlock):
 * prompt bị lấp đầy bằng một nguồn duy nhất, AI trả lời phiến diện dù trong kho
 * có sẵn nhiều góc nhìn khác.
 *
 * 💡 CÁCH GIẢI: duyệt danh sách theo thứ tự điểm giảm dần, đếm số đoạn đã lấy
 * của mỗi tài liệu. Chạm trần thì bỏ qua, nhường chỗ cho tài liệu khác.
 *
 * 📐 VÌ SAO TRẦN CO GIÃN THEO `limit` CHỨ KHÔNG CỐ ĐỊNH?
 *
 * Trần cố định bằng 2 nghe hợp lý, nhưng thử với limit = 2 thì nó vô tác dụng:
 * 2 đoạn của cùng một bài vẫn lọt đủ, người dùng chẳng thấy đa dạng gì hơn.
 * (Đây là điều phát hiện được khi chạy thử — trần cứng trông đúng trên giấy
 * nhưng không làm gì cả ở đúng trường hợp cần nó nhất.)
 *
 * Công thức `ceil(limit / 3)` bảo đảm luôn có ÍT NHẤT 3 nguồn khác nhau:
 *
 *     limit = 2  ->  trần 1   ->  2 tài liệu khác nhau
 *     limit = 5  ->  trần 2   ->  ít nhất 3 tài liệu
 *     limit = 8  ->  trần 3   ->  ít nhất 3 tài liệu
 *
 * Vẫn cho phép một bài dài góp nhiều đoạn (vì nó có thể chứa nhiều ý cùng
 * liên quan), nhưng không bao giờ để nó chiếm trọn kết quả.
 *
 * ⚠️ Phải chạy SAU bước lọc theo ngưỡng điểm. Chạy trước thì ta sẽ loại bỏ
 * một đoạn tốt để nhường chỗ cho đoạn rác của tài liệu khác.
 */
function diversify(hits: SearchHit[], limit: number): SearchHit[] {
  const maxPerDocument = Math.max(1, Math.ceil(limit / 3));
  const perDocument = new Map<number, number>();
  const picked: SearchHit[] = [];

  // hits đã được sắp theo điểm giảm dần từ hai nhánh tìm kiếm phía trên
  for (const hit of hits) {
    if (picked.length >= limit) break;

    const taken = perDocument.get(hit.document_id) ?? 0;
    if (taken >= maxPerDocument) continue;

    perDocument.set(hit.document_id, taken + 1);
    picked.push(hit);
  }

  /**
   * Kho chỉ có vài tài liệu -> sau khi áp trần vẫn chưa đủ số kết quả yêu cầu.
   * Lúc đó thà trả về đoạn thứ 3, thứ 4 của cùng một bài còn hơn trả về thiếu.
   */
  if (picked.length < limit) {
    const chosen = new Set(picked.map((h) => h.chunk_id));
    for (const hit of hits) {
      if (picked.length >= limit) break;
      if (!chosen.has(hit.chunk_id)) picked.push(hit);
    }

    /**
     * 🐛 PHẢI SẮP XẾP LẠI SAU KHI BỔ SUNG — lỗi này đã xảy ra thật.
     *
     * Các đoạn bổ sung được nối vào CUỐI mảng, nên chúng đứng sau cả những
     * đoạn có điểm thấp hơn. Kết quả quan sát được khi chạy thử:
     *
     *     3. [0.744] VFF - Đại hội khóa IX
     *     4. [0.732] VFF - Đại hội ban chấp hành
     *     5. [0.746] VFF - Tin tức        ← điểm CAO HƠN mục 4!
     *
     * Người dùng nhìn vào chỉ thấy "bảng xếp hạng sai", và niềm tin vào toàn
     * bộ kết quả tìm kiếm mất theo. Sắp xếp lại là bắt buộc.
     *
     * Sắp lại KHÔNG làm hỏng tính đa dạng: việc CHỌN đoạn nào đã xong ở vòng
     * lặp trên; ở đây ta chỉ sửa lại THỨ TỰ hiển thị cho trung thực.
     */
    picked.sort((a, b) => b.score - a.score);
  }

  return picked;
}

/**
 * Gom các đoạn tìm được thành MỘT khối văn bản để nhét vào prompt của AI.
 *
 * 📌 Đây chính là chữ "A" (Augmented) trong RAG: ta "bổ sung" kiến thức thật
 * vào prompt, thay vì để model tự bịa từ trí nhớ mơ hồ của nó.
 *
 * Có đánh số [1] [2] [3] để model trích dẫn được nguồn, và để người dùng
 * kiểm chứng. Câu trả lời AI không dẫn nguồn thì không kiểm chứng được —
 * mà không kiểm chứng được thì không nên tin.
 *
 * @param maxChars Trần ký tự. Prompt càng dài càng tốn tiền và càng dễ khiến
 *                 model "lạc trôi" giữa đống thông tin. 6000 ký tự ≈ 2000
 *                 token là mức cân bằng hợp lý.
 */
export function buildContextBlock(hits: SearchHit[], maxChars = 6000): string {
  if (hits.length === 0) return '';

  const parts: string[] = [];
  let total = 0;

  for (let i = 0; i < hits.length; i += 1) {
    const hit = hits[i];
    if (!hit) continue;
    const block =
      '[' + (i + 1) + '] ' + hit.title + '\n' + hit.content + '\n' +
      (hit.source_url ? 'Nguồn: ' + hit.source_url + '\n' : '');

    // Dừng khi thêm đoạn nữa là vượt trần — cắt ở ranh giới đoạn,
    // không cắt giữa chừng làm câu văn cụt lủn khiến model hiểu sai.
    if (total + block.length > maxChars) break;

    parts.push(block);
    total += block.length;
  }

  return parts.join('\n---\n');
}

/**
 * Thống kê kho tri thức — phục vụ GET /search/stats.
 * Nhìn vào đây biết ngay: đã cào được bao nhiêu, đã nhúng xong chưa.
 */
export async function getIndexStats() {
  const { rows } = await query<{
    documents: string;
    chunks: string;
    embedded: string;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM kb_documents WHERE is_active = TRUE)      AS documents,
      (SELECT COUNT(*) FROM kb_chunks)                                AS chunks,
      (SELECT COUNT(*) FROM kb_chunks WHERE embedding_json IS NOT NULL) AS embedded
  `);

  const row = rows[0];
  const chunks = Number(row?.chunks ?? 0);
  const embedded = Number(row?.embedded ?? 0);

  return {
    documents: Number(row?.documents ?? 0),
    chunks,
    embedded,
    /** Số đoạn còn chờ nhúng — chạy `npm run index` để xử lý nốt */
    pending: chunks - embedded,
    driver: env.DB_DRIVER,
    /** true = đang dùng pgvector (nhanh), false = tính bằng JavaScript */
    vector_engine: env.DB_DRIVER === 'postgres' ? 'pgvector' : 'javascript',
    embedding_model: env.EMBEDDING_MODEL,
    embedding_dim: env.EMBEDDING_DIM,
  };
}
