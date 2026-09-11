/**
 * ============================================================================
 * HOOKS/USEDEBOUNCE.TS — HOÃN CẬP NHẬT GIÁ TRỊ
 * ============================================================================
 *
 * VẤN ĐỀ: người dùng gõ "quang hải" vào ô tìm kiếm.
 * Mỗi ký tự làm state đổi -> 9 lần gọi API cho 9 ký tự.
 * Tốn băng thông, tốn pin, và server phải chịu tải vô ích.
 *
 * DEBOUNCE nghĩa là: "chỉ báo kết quả khi người dùng đã NGỪNG gõ X mili giây".
 *
 *   Gõ:      q  u  a  n  g     h  a  i
 *   Đồng hồ: ↻  ↻  ↻  ↻  ↻     ↻  ↻  ↻ ....350ms.... ✓ gọi API 1 lần
 *
 * Mỗi ký tự mới lại ĐẶT LẠI đồng hồ. Chỉ khi im lặng đủ lâu nó mới chạy.
 *
 * CÁCH HOẠT ĐỘNG TRONG REACT:
 * useEffect có phần dọn dẹp (return). Khi `value` đổi, React chạy phần dọn
 * dẹp của lần trước TRƯỚC -> clearTimeout huỷ đồng hồ cũ. Đúng hành vi ta cần.
 */

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    // Dọn dẹp: huỷ đồng hồ cũ mỗi khi value đổi
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
