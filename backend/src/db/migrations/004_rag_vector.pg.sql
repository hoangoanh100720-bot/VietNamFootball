-- ===========================================================================
-- MIGRATION 004 — TÌM KIẾM TRI THỨC CHO TRỢ LÝ AI (RAG)
-- ===========================================================================
--
-- VÌ SAO TÊN FILE CÓ ".pg."?
-- File này cần extension của PostgreSQL thật:
--   • pgvector  — lưu và so sánh "embedding" (vector ý nghĩa của đoạn văn bản)
--   • unaccent  — bỏ dấu tiếng Việt, để gõ "tien linh" vẫn tìm ra "Tiến Linh"
-- PGlite nhúng (DB_DRIVER=pglite) không nạp sẵn hai extension này, nên
-- db/migrate.ts sẽ BỎ QUA mọi file ".pg.sql" khi đang chạy PGlite.
-- Khi chuyển sang PostgreSQL thật, chạy `npm run migrate` là file này được áp dụng.
--
-- Trợ lý AI vẫn hoạt động khi chưa có file này: phần dữ liệu có cấu trúc
-- (tỷ số, thông số, BXH) đi qua Function Calling, không cần vector.
-- Thiếu bảng này thì chỉ mất phần tra cứu văn bản (lịch sử, luật, FAQ).
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Mỗi tài liệu (kb_documents, tạo ở 003) được cắt thành nhiều đoạn 500–800 token.
-- Cắt nhỏ để khi tìm kiếm chỉ nạp đúng đoạn liên quan vào prompt -> tiết kiệm token.
CREATE TABLE IF NOT EXISTS kb_chunks (
  id          BIGSERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  chunk_index SMALLINT NOT NULL DEFAULT 0,
  content     TEXT NOT NULL,

  -- 768 chiều = cấu hình EMBEDDING_DIM trong .env.
  -- ⚠️ Đổi EMBEDDING_MODEL hoặc số chiều thì phải index lại TOÀN BỘ bảng này,
  -- vì vector của hai model khác nhau không so sánh được với nhau.
  embedding   vector(768) NOT NULL,

  -- Tìm kiếm LAI: vector (hiểu ý nghĩa) + full-text (khớp đúng từ khoá, tên riêng).
  -- Gộp hai kết quả lại cho câu trả lời chính xác hơn dùng một cách.
  tsv         tsvector,

  UNIQUE (document_id, chunk_index)
);

-- HNSW: tìm vector gần nhất rất nhanh, chính xác xấp xỉ (đủ tốt cho tìm tài liệu)
CREATE INDEX IF NOT EXISTS idx_kb_embedding ON kb_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_kb_tsv       ON kb_chunks USING gin (tsv);
