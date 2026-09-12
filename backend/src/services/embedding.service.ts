/**
 * ============================================================================
 * SERVICES/EMBEDDING.SERVICE.TS — BIẾN VĂN BẢN THÀNH VECTOR Ý NGHĨA
 * ============================================================================
 *
 * 🧠 EMBEDDING LÀ GÌ? (giải thích không dùng toán)
 *
 * Hãy tưởng tượng một tấm bản đồ khổng lồ, mỗi câu văn là một CHẤM trên đó.
 * Hai câu nói cùng một chuyện thì hai chấm nằm SÁT nhau, dù dùng từ khác hẳn:
 *
 *     "Ai là thủ môn số 1 của đội tuyển?"     ●
 *     "Người gác đền chính thức là ai?"        ● ← sát ngay cạnh
 *     "Giá vé xem trận chung kết"                          ● ← rất xa
 *
 * Embedding chính là TOẠ ĐỘ của chấm đó. Model gemini-embedding-001 trả về
 * toạ độ gồm 768 con số (768 chiều — nhiều hơn 2 chiều của bản đồ giấy rất
 * nhiều, nhưng ý tưởng y hệt).
 *
 * 👉 Nhờ vậy máy tìm được theo Ý NGHĨA, không chỉ khớp từ khoá. Đây là điều
 *    mà tìm kiếm LIKE '%...%' truyền thống không bao giờ làm được.
 *
 * ----------------------------------------------------------------------------
 * 💰 BA CÁCH TIẾT KIỆM QUOTA ĐƯỢC ÁP DỤNG Ở ĐÂY
 *
 *   1. GỘP LÔ (batch)      : gửi EMBEDDING_BATCH_SIZE đoạn trong MỘT request
 *                            thay vì gọi 16 lần riêng lẻ.
 *   2. XOAY VÒNG KEY       : mọi lời gọi đi qua runWithKeyRotation().
 *   3. KHÔNG NHÚNG LẠI     : tài liệu không đổi nội dung (so bằng content_hash)
 *                            thì bỏ qua hoàn toàn — xem crawler.service.ts.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ MỘT QUY TẮC SỐNG CÒN
 * Vector của model A và model B KHÔNG so sánh được với nhau, dù cùng số chiều.
 * Đổi EMBEDDING_MODEL = phải nhúng lại TOÀN BỘ kb_chunks. Vì thế mỗi đoạn đều
 * lưu kèm `embedding_model` — để biết đoạn nào cần làm lại.
 * ============================================================================
 */

import { env } from '@/config/env';
import { runWithKeyRotation, isGeminiEnabled } from '@/config/gemini';
import { logger } from '@/utils/logger';

/** Một vector = mảng số thực. Đặt tên riêng cho dễ đọc chữ ký hàm. */
export type Embedding = number[];

// ---------------------------------------------------------------------------
// 1. TẠO VECTOR
// ---------------------------------------------------------------------------

/**
 * Nhúng MỘT đoạn văn bản.
 *
 * @param text     Nội dung cần nhúng
 * @param taskType Loại tác vụ — ⭐ tham số quan trọng mà nhiều người bỏ qua:
 *
 *   RETRIEVAL_DOCUMENT : dùng khi nhúng TÀI LIỆU để cất vào kho
 *   RETRIEVAL_QUERY    : dùng khi nhúng CÂU HỎI của người dùng
 *
 * Vì sao phải phân biệt? Vì câu hỏi và tài liệu có hình dạng ngôn ngữ khác
 * nhau: câu hỏi ngắn, dạng nghi vấn; tài liệu dài, dạng tường thuật. Model
 * được huấn luyện để đẩy hai loại này về cùng một vùng khi chúng nói về cùng
 * một chủ đề — nhưng chỉ khi ta khai báo đúng taskType. Khai báo sai làm
 * chất lượng tìm kiếm giảm thấy rõ.
 *
 * @returns Vector, hoặc null nếu không có key / mọi key đều hết lượt
 */
export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'
): Promise<Embedding | null> {
  const results = await embedBatch([text], taskType);
  return results?.[0] ?? null;
}

/**
 * ⭐ Nhúng NHIỀU đoạn trong một lượt gọi API.
 *
 * Đây là hàm nên dùng ở mọi chỗ có thể. Nhúng 100 đoạn:
 *   • gọi lẻ  : 100 lượt  -> hết quota gói miễn phí trong vài phút
 *   • gộp lô  : 7 lượt    -> thoải mái
 *
 * @returns Mảng vector THEO ĐÚNG THỨ TỰ đầu vào, hoặc null nếu thất bại.
 *          Thứ tự là điều kiện bắt buộc: nơi gọi ghép kết quả về đúng đoạn
 *          của nó bằng chỉ số mảng.
 */
export async function embedBatch(
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'
): Promise<Embedding[] | null> {
  if (texts.length === 0) return [];

  if (!isGeminiEnabled()) {
    logger.warn(
      '[Embedding] Chưa có key Gemini. Tìm kiếm sẽ lùi về chế độ khớp từ khoá ' +
        '(vẫn chạy được, chỉ kém thông minh hơn).'
    );
    return null;
  }

  const vectors = await runWithKeyRotation('embedding', async (client) => {
    const response = await client.models.embedContent({
      model: env.EMBEDDING_MODEL,
      contents: texts,
      config: {
        taskType,
        /**
         * outputDimensionality cắt bớt số chiều của vector.
         * 768 chiều là điểm cân bằng tốt: chính xác gần bằng 1536 chiều
         * nhưng tốn một nửa dung lượng lưu trữ và so sánh nhanh gấp đôi.
         * ⚠️ Con số này PHẢI trùng với vector(768) trong 004_rag_vector.pg.sql.
         */
        outputDimensionality: env.EMBEDDING_DIM,
      },
    });

    const list = response.embeddings ?? [];
    return list.map((e) => e.values ?? []);
  });

  if (!vectors) return null;

  // Kiểm tra chống lỗi âm thầm: API trả thiếu/thừa vector là dữ liệu hỏng.
  // Ghép sai vector vào sai đoạn còn tệ hơn không có vector — vì kết quả
  // tìm kiếm sẽ sai mà không ai biết tại sao.
  if (vectors.length !== texts.length) {
    logger.error(
      '[Embedding] Số vector trả về (' +
        vectors.length +
        ') không khớp số đoạn gửi đi (' +
        texts.length +
        '). Bỏ qua cả lô để tránh ghép nhầm.'
    );
    return null;
  }

  return vectors;
}

/**
 * Nhúng một danh sách dài, TỰ ĐỘNG chia thành nhiều lô nhỏ.
 *
 * API có giới hạn số đoạn mỗi request; hàm này che giấu chuyện đó đi.
 * Nơi gọi chỉ cần đưa 500 đoạn vào và nhận 500 vector ra.
 *
 * @param onProgress Hàm gọi lại sau mỗi lô — để in thanh tiến trình ra terminal.
 *                   Nhúng 500 đoạn mất vài phút; không có phản hồi thì người
 *                   dùng sẽ tưởng chương trình bị treo.
 */
export async function embedMany(
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT',
  onProgress?: (done: number, total: number) => void
): Promise<(Embedding | null)[]> {
  const out: (Embedding | null)[] = [];
  const batchSize = env.EMBEDDING_BATCH_SIZE;

  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize);
    const vectors = await embedBatch(slice, taskType);

    if (vectors) {
      out.push(...vectors);
    } else {
      /**
       * Lô này hỏng -> điền null cho đúng số phần tử, KHÔNG dừng cả tiến trình.
       * Giữ đúng độ dài mảng là bắt buộc: nơi gọi ghép kết quả theo chỉ số,
       * thiếu một phần tử là lệch toàn bộ phần còn lại.
       * Những đoạn null sẽ được thử lại ở lần chạy `npm run index` kế tiếp.
       */
      out.push(...slice.map(() => null));
    }

    onProgress?.(Math.min(i + batchSize, texts.length), texts.length);
  }

  return out;
}

// ---------------------------------------------------------------------------
// 2. SO SÁNH VECTOR
// ---------------------------------------------------------------------------

/**
 * ⭐ COSINE SIMILARITY — độ tương đồng giữa hai vector.
 *
 * Kết quả nằm trong khoảng -1 đến 1:
 *    1.0  = hai đoạn nói y hệt một chuyện
 *    0.5  = có liên quan
 *    0.0  = chẳng liên quan gì
 *   -1.0  = trái ngược nhau
 *
 * 📐 VÌ SAO DÙNG COSINE MÀ KHÔNG DÙNG KHOẢNG CÁCH THÔNG THƯỜNG?
 * Cosine đo GÓC giữa hai vector, không đo ĐỘ DÀI. Một bài 3000 chữ và một
 * câu 10 chữ nói cùng chủ đề sẽ có vector cùng HƯỚNG nhưng độ dài khác nhau.
 * Đo bằng khoảng cách thì chúng "xa nhau"; đo bằng góc thì chúng trùng hướng
 * — đúng với điều ta muốn.
 *
 * ⚙️ Hàm này chỉ dùng khi chạy PGlite (dev). Trên PostgreSQL thật, pgvector
 * làm việc này ngay trong database bằng toán tử `<=>`, nhanh hơn nhiều vì có
 * index HNSW hỗ trợ.
 */
export function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;   // tích vô hướng
  let normA = 0; // độ dài vector a (bình phương)
  let normB = 0; // độ dài vector b (bình phương)

  // Gộp cả ba phép tính vào MỘT vòng lặp. Với 768 chiều nhân vài nghìn đoạn,
  // ba vòng lặp riêng sẽ chậm thấy rõ.
  for (let i = 0; i < a.length; i += 1) {
    // Gán ra biến cục bộ: vừa để TypeScript biết chắc giá trị không undefined,
    // vừa tránh truy cập mảng ba lần cho mỗi chiều (nhanh hơn thấy rõ ở 768 chiều).
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  // Vector rỗng (toàn số 0) -> mẫu số bằng 0 -> chia cho 0 ra NaN.
  // NaN lan vào bảng xếp hạng kết quả sẽ làm hàm sort() cho ra thứ tự ngẫu nhiên.
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dot / denominator;
}

/**
 * Chuyển vector thành chuỗi để lưu vào cột TEXT (embedding_json).
 * Dùng JSON.stringify cho gọn và chuẩn — đọc lại bằng JSON.parse.
 */
export function serializeEmbedding(vector: Embedding): string {
  return JSON.stringify(vector);
}

/**
 * Đọc vector từ chuỗi trong database.
 * Trả null nếu dữ liệu hỏng — thà bỏ qua một đoạn còn hơn làm sập cả API tìm kiếm.
 */
export function parseEmbedding(raw: string | null): Embedding | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Embedding) : null;
  } catch {
    return null;
  }
}

/**
 * Định dạng vector theo cú pháp pgvector: '[0.1,0.2,0.3]'
 *
 * Trông giống hệt JSON, nhưng đây là kiểu dữ liệu riêng của pgvector —
 * dùng khi chạy PostgreSQL thật để ghi vào cột `embedding vector(768)`.
 */
export function toPgVector(vector: Embedding): string {
  return '[' + vector.join(',') + ']';
}
