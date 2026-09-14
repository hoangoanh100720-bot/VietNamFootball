-- ============================================================================
-- 007 — SỬA ĐỘ TƯƠNG PHẢN THEME "QUỐC KHÁNH 2/9" (chế độ tối)
-- ============================================================================
--
-- 🐛 PHÁT HIỆN BỞI: backend/src/scripts/feature-test.ts
--    (chạy luật kiểm tra tương phản mục 6.5 lên chính dữ liệu seed)
--
-- Màu nhấn tối cũ #E8291F: chữ trắng trên nút chỉ đạt 4.40:1, dưới chuẩn
-- WCAG AA 4.5:1. Theme seed được nhập tay, không đi qua POST /themes, nên
-- chưa từng bị kiểm tra — đúng loại lỗi mà "kiểm tra ở một cửa" bỏ sót.
--
-- Màu mới #E3241B đạt 4.63:1 (cùng màu nhấn tối của theme mặc định).
--
-- ⚠️ VÌ SAO LÀ MIGRATION MÀ KHÔNG CHỈ SỬA SEED?
-- Sửa seed chỉ có tác dụng với database dựng MỚI. Database đang chạy (có kho
-- tri thức đã cào, tài khoản người dùng) không bao giờ chạy lại seed. Migration
-- là con đường duy nhất để sửa dữ liệu mà không phải xoá làm lại.
--
-- jsonb_set chỉ đổi ĐÚNG MỘT khoá, giữ nguyên các màu khác trong palette.
-- Điều kiện WHERE kèm giá trị cũ: nếu admin đã tự chỉnh màu khác thì KHÔNG đè.
-- ============================================================================

UPDATE themes
SET palette_dark = jsonb_set(palette_dark, '{accent}', '"#E3241B"'),
    updated_at   = NOW()
WHERE code = 'national-day'
  AND palette_dark->>'accent' = '#E8291F';
