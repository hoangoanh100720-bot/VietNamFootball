/**
 * ============================================================================
 * COMPONENTS/COMMON/SEGMENTEDCONTROL.TSX — THANH CHỌN PHÂN ĐOẠN
 * ============================================================================
 *
 * Dùng ở Tab Trận đấu (Đang đá / Sắp tới / Kết quả) và Tab Đội hình
 * (Dự kiến / Trận vừa đá / Triệu tập) — ARCHITECTURE.md mục 5.2 và 5.3.
 *
 * ----------------------------------------------------------------------------
 * 🤔 KHI NÀO DÙNG SEGMENTED CONTROL, KHI NÀO DÙNG TAB?
 *
 *   Segmented control → chuyển giữa các CÁCH NHÌN của CÙNG một chủ đề
 *                       (cùng là "trận đấu", chỉ khác lát cắt thời gian)
 *   Tab dưới màn hình → chuyển giữa các CHỦ ĐỀ khác hẳn nhau
 *
 * Dùng sai chỗ sẽ khiến người dùng lạc: nếu "Kết quả" là một tab riêng ở
 * thanh dưới, họ sẽ không nghĩ nó liên quan tới "Trận đấu".
 *
 * ⚠️ TRẦN 3-4 PHÂN ĐOẠN. Nhiều hơn thì mỗi ô quá hẹp, chữ bị cắt — lúc đó
 * nên dùng danh sách chip cuộn ngang thay vì nhồi thêm.
 *
 * ----------------------------------------------------------------------------
 * ♿ TIẾP CẬN
 *
 * Mỗi ô là một `<Pressable>` có `accessibilityRole="tab"` và
 * `accessibilityState={{ selected }}` — trình đọc màn hình sẽ đọc đúng
 * "tab Kết quả, đã chọn, 3 trong 3" thay vì chỉ đọc chữ trơ trọi.
 */

import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';

export interface Segment<T extends string> {
  value: T;
  label: string;
  /**
   * Chấm đỏ "Mới" ở góc trên-phải nhãn.
   *
   * Theo đặc tả: phân đoạn "Trận vừa đá" có chấm đỏ trong 48 giờ sau trận,
   * "Triệu tập" có chấm trong 72 giờ sau khi công bố danh sách.
   */
  showDot?: boolean;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const t = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: t.colors.surfaceSunken,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.colors.border,
        // Đệm 3px quanh viền để ô đang chọn "lọt thỏm" bên trong, trông có chiều sâu
        padding: 3,
        gap: 3,
      }}
    >
      {segments.map((seg) => {
        const selected = seg.value === value;

        return (
          <Pressable
            key={seg.value}
            onPress={() => onChange(seg.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={seg.label + (seg.showDot ? ', có nội dung mới' : '')}
            style={{
              flex: 1,
              // 38px + 6px đệm = 44px, đúng vùng chạm tối thiểu của di động
              height: 38,
              borderRadius: t.radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 5,
              /**
               * Ô đang chọn: nền ĐẶC MÀU ĐỎ CỜ, chữ trắng.
               * Ô không chọn: trong suốt, lộ nền lõm phía sau.
               *
               * Bản trước dùng nền surface (trắng/xám) cho ô đang chọn — đúng
               * nguyên tắc "càng nổi càng sáng" nhưng cả thanh gần như không có
               * màu. Đây là nút điều hướng chính của màn hình, đúng loại việc
               * mà đỏ cờ được dành cho (xem tỷ lệ 80/15/5 trong theme/colors.ts).
               */
              backgroundColor: selected ? t.colors.accent : t.static.transparent,
            }}
          >
            <AppText
              numberOfLines={1}
              style={{
                fontSize: t.fontSize.sm,
                /**
                 * Đổi CẢ độ đậm LẪN màu, không chỉ màu.
                 * Hai tín hiệu song song thì người mù màu vẫn nhận ra ô nào
                 * đang được chọn.
                 */
                fontWeight: selected ? t.fontWeight.bold : t.fontWeight.medium,
                color: selected ? t.colors.accentFg : t.colors.textMuted,
              }}
            >
              {seg.label}
            </AppText>

            {/*
              Chấm "Mới" — đỏ trên ô thường, nhưng VÀNG SAO trên ô đang chọn:
              chấm đỏ đặt trên nền đỏ thì biến mất.
            */}
            {seg.showDot && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: selected ? t.colors.gold : t.colors.accent,
                }}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
