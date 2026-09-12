-- ===========================================================================
-- MIGRATION 006 — KHO TRI THỨC CHO CRAWLER + TÌM KIẾM AI
-- ===========================================================================
--
-- ⭐ VÌ SAO FILE NÀY KHÔNG CÓ ".pg." TRONG TÊN?
-- Vì nó chạy được trên CẢ HAI: PGlite nhúng (dev) và PostgreSQL thật (prod).
-- Mọi thứ ở đây đều là SQL chuẩn, không cần extension nào.
--
-- File 004_rag_vector.pg.sql (chỉ chạy trên PostgreSQL thật) bổ sung thêm
-- cột `embedding vector(768)` + index HNSW để tìm kiếm vector siêu nhanh.
--
-- => KẾT QUẢ: tìm kiếm AI theo ngữ nghĩa hoạt động ở CẢ HAI môi trường:
--
--    | Môi trường          | Cách so sánh vector            | Tốc độ         |
--    |---------------------|--------------------------------|----------------|
--    | PGlite (dev)        | đọc embedding_json, tính trong | đủ nhanh khi   |
--    |                     | JavaScript (cosine similarity) | vài nghìn đoạn |
--    | PostgreSQL + pgvector| toán tử <=> + index HNSW      | rất nhanh      |
--
-- Nhờ vậy bạn code và thử nghiệm ngay trên máy cá nhân mà KHÔNG phải cài
-- PostgreSQL, đến lúc triển khai chỉ cần đổi DB_DRIVER=postgres.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- A. MỞ RỘNG kb_documents ĐỂ CHỨA DỮ LIỆU CÀO VỀ
-- ---------------------------------------------------------------------------
-- Bảng gốc (migration 003) chỉ phục vụ tài liệu nhập tay: source/title/body.
-- Dữ liệu cào về cần thêm: cào từ đâu, lúc nào, nội dung có đổi không.
--
-- ADD COLUMN IF NOT EXISTS: chạy lại migration nhiều lần cũng không lỗi
-- (tính chất "idempotent" — bắt buộc phải có với mọi migration nghiêm túc).

ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS source_url   TEXT;
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS summary      TEXT;
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS tags         TEXT;
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS published_at DATE;
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS crawled_at   TIMESTAMPTZ;
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS lang         VARCHAR(8) NOT NULL DEFAULT 'vi';

-- ⭐ content_hash — CHÌA KHOÁ ĐỂ KHÔNG NHÚNG LẠI VÔ ÍCH
-- Mỗi lần crawl lại một trang, ta băm (hash) nội dung mới rồi so với hash cũ:
--   • Giống nhau  -> trang không đổi -> BỎ QUA, không gọi API nhúng vector.
--   • Khác nhau   -> nội dung đã sửa -> xoá chunk cũ, nhúng lại.
-- Đây là tối ưu tiết kiệm quota lớn nhất của cả pipeline: crawl lại 50 trang
-- mà chỉ 2 trang thay đổi thì chỉ tốn quota cho đúng 2 trang đó.
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

-- Một URL chỉ ứng với một tài liệu. UNIQUE cho phép dùng câu lệnh UPSERT
-- (INSERT ... ON CONFLICT (source_url) DO UPDATE) ở crawler.
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_documents_url
  ON kb_documents (source_url)
  WHERE source_url IS NOT NULL;   -- index một phần: bỏ qua tài liệu nhập tay (URL rỗng)

-- Ràng buộc CHECK cũ chỉ cho 6 giá trị source. Dữ liệu cào về cần thêm
-- 'crawl' (cào web), 'ocr' (đọc từ ảnh/PDF) và 'news' (bài báo).
-- Phải XOÁ ràng buộc cũ rồi tạo lại — Postgres không sửa CHECK tại chỗ được.
ALTER TABLE kb_documents DROP CONSTRAINT IF EXISTS kb_documents_source_check;
ALTER TABLE kb_documents ADD  CONSTRAINT kb_documents_source_check
  CHECK (source IN ('history','achievement','player_bio','coach_bio','faq','rules','crawl','ocr','news'));


-- ---------------------------------------------------------------------------
-- B. BẢNG ĐOẠN VĂN BẢN (CHUNK) — PHIÊN BẢN CHẠY ĐƯỢC MỌI NƠI
-- ---------------------------------------------------------------------------
-- Trên PostgreSQL thật, bảng này đã được 004_rag_vector.pg.sql tạo trước
-- (kèm cột vector). IF NOT EXISTS khiến lệnh dưới trở thành vô hại ở đó,
-- rồi các lệnh ADD COLUMN phía sau bổ sung nốt những cột còn thiếu.
-- Trên PGlite, đây chính là lần tạo bảng đầu tiên.

CREATE TABLE IF NOT EXISTS kb_chunks (
  id          BIGSERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  chunk_index SMALLINT NOT NULL DEFAULT 0,
  content     TEXT NOT NULL,

  UNIQUE (document_id, chunk_index)
);

-- ⭐ VÌ SAO PHẢI CẮT TÀI LIỆU THÀNH ĐOẠN (CHUNK)?
-- Một bài viết 5000 từ mà nhúng thành MỘT vector thì vector đó "trung bình
-- hoá" mọi chủ đề trong bài -> tìm gì cũng ra lờ mờ, không trúng.
-- Cắt thành đoạn ~1400 ký tự: mỗi vector mang đúng một ý -> tìm chính xác,
-- và khi đưa vào prompt cho AI cũng chỉ tốn token cho đúng đoạn cần dùng.

-- Vector dạng JSON — phương án chạy được trên PGlite (không có pgvector).
-- Lưu đúng mảng số: "[0.013,-0.240,...]". Tìm kiếm sẽ đọc cột này rồi tính
-- cosine similarity bằng JavaScript.
ALTER TABLE kb_chunks ADD COLUMN IF NOT EXISTS embedding_json TEXT;

-- Tên model đã sinh ra vector. BẮT BUỘC phải lưu:
-- vector của hai model khác nhau KHÔNG so sánh được với nhau. Có cột này thì
-- sau khi đổi model, ta lọc ra ngay những đoạn cần nhúng lại.
ALTER TABLE kb_chunks ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(60);

-- Số chiều của vector — dùng để phát hiện dữ liệu cũ lẫn dữ liệu mới.
ALTER TABLE kb_chunks ADD COLUMN IF NOT EXISTS embedding_dim SMALLINT;

-- ⭐ content_norm — NỘI DUNG ĐÃ BỎ DẤU, viết thường.
-- Cho phép gõ "tien linh ghi ban" vẫn tìm ra "Tiến Linh ghi bàn".
-- Bản gốc dùng extension `unaccent`; ở đây ta bỏ dấu bằng JavaScript rồi lưu
-- sẵn vào cột này — chạy được cả trên PGlite, và tra cứu còn nhanh hơn vì
-- không phải tính lại mỗi lần truy vấn.
ALTER TABLE kb_chunks ADD COLUMN IF NOT EXISTS content_norm TEXT;

ALTER TABLE kb_chunks ADD COLUMN IF NOT EXISTS token_estimate INTEGER;
ALTER TABLE kb_chunks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Lọc nhanh "đoạn nào chưa có vector" khi chạy lại trình nhúng.
CREATE INDEX IF NOT EXISTS idx_kb_chunks_pending
  ON kb_chunks (document_id)
  WHERE embedding_json IS NULL;

-- Tìm kiếm từ khoá trên chuỗi đã bỏ dấu.
-- text_pattern_ops cho phép index phục vụ được truy vấn LIKE 'abc%'.
CREATE INDEX IF NOT EXISTS idx_kb_chunks_norm
  ON kb_chunks (content_norm text_pattern_ops);


-- ---------------------------------------------------------------------------
-- C. NHẬT KÝ CRAWL — BIẾT ĐƯỢC LẦN CÀO TRƯỚC ĐÃ LÀM GÌ
-- ---------------------------------------------------------------------------
-- Không có bảng này thì mỗi lần crawl xong bạn chỉ còn dòng log trong terminal.
-- Có nó, bạn trả lời được: trang nào hay lỗi? robots.txt chặn những đâu?
-- lần cào gần nhất là khi nào? -- những câu hỏi chắc chắn sẽ cần tới.
CREATE TABLE IF NOT EXISTS crawl_logs (
  id          BIGSERIAL PRIMARY KEY,
  url         TEXT NOT NULL,
  -- ok       : cào và lưu thành công
  -- skipped  : bỏ qua (nội dung không đổi, hoặc AI đánh giá lạc đề)
  -- blocked  : robots.txt không cho phép
  -- error    : lỗi mạng / lỗi phân tích
  status      VARCHAR(20) NOT NULL CHECK (status IN ('ok','skipped','blocked','error')),
  http_status INTEGER,
  message     TEXT,
  chars       INTEGER,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawl_logs_created ON crawl_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_status  ON crawl_logs (status, created_at DESC);


-- ---------------------------------------------------------------------------
-- D. HOÀ GIẢI VỚI MIGRATION 004 (chỉ có tác dụng trên PostgreSQL thật)
-- ---------------------------------------------------------------------------
-- 004_rag_vector.pg.sql khai báo `embedding vector(768) NOT NULL`. Ràng buộc
-- NOT NULL đó khiến ta KHÔNG thể chèn đoạn trước rồi nhúng vector sau —
-- trong khi quy trình của ta là: cắt đoạn -> lưu -> nhúng theo lô (batch).
-- Nhúng theo lô mới gộp được nhiều đoạn vào một lượt gọi API, tiết kiệm quota.
--
-- Nên ở đây ta nới ràng buộc thành cho phép NULL: "chưa có vector" là một
-- trạng thái hợp lệ, và index idx_kb_chunks_pending ở trên tồn tại chính là
-- để tìm nhanh những đoạn đang ở trạng thái đó.
--
-- DO $$ ... $$ là khối lệnh có điều kiện: chỉ chạy ALTER khi cột thật sự
-- tồn tại, nhờ vậy file này vẫn chạy trơn tru trên PGlite (nơi không hề có
-- cột `embedding`).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_chunks' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE kb_chunks ALTER COLUMN embedding DROP NOT NULL;
  END IF;
END $$;
