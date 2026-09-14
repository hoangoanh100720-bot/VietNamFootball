/**
 * ============================================================================
 * COMPONENTS/STATS/STATCOMPAREBAR.TSX — THANH SO SÁNH THÔNG SỐ HAI ĐỘI
 * ============================================================================
 *
 *   Kiểm soát bóng
 *   58%  ████████████░░░░░░░░  42%
 *   ▲ đội nhà (trái)          ▲ đội khách (phải) — cùng thứ tự với tỷ số
 *
 * ----------------------------------------------------------------------------
 * 🎨 QUYẾT ĐỊNH VỀ MÀU — màu chỉ để MÃ HOÁ Ý NGHĨA, không để trang trí
 *
 * Phía VIỆT NAM tô màu nhấn (đỏ), phía đối thủ tô màu trung tính. KHÔNG tô
 * "bên nào nhiều hơn thì màu xanh" — vì với số lỗi hay số thẻ, NHIỀU HƠN là
 * TỆ HƠN, và một thanh xanh cho "phạm lỗi nhiều hơn" sẽ nói sai sự thật.
 * Người hâm mộ chỉ cần biết bên nào là đội mình; con số tự nói phần còn lại.
 *
 * ⚠️ Màu không bao giờ là kênh DUY NHẤT: con số luôn in rõ hai đầu thanh, và
 * trình đọc màn hình đọc cả câu "Kiểm soát bóng: Việt Nam 58, Indonesia 42".
 *
 * ----------------------------------------------------------------------------
 * 📐 VÌ SAO DÙNG flex CHỨ KHÔNG TÍNH PHẦN TRĂM?
 *
 * `flex: home` và `flex: away` tự chia tỷ lệ theo tổng hai số — 14 sút vs 9
 * sút ra đúng 61% / 39% mà không cần một phép chia nào. Không có phép chia thì
 * không có lỗi CHIA CHO 0 khi cả hai đội đều 0 (xử lý riêng bên dưới).
 * ============================================================================
 */

import { View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';

interface StatCompareBarProps {
  label: string;
  home: number | null;
  away: number | null;
  /** Việt Nam đá sân nhà? Quyết định bên nào được tô màu nhấn */
  vietnamIsHome: boolean;
  homeName: string;
  awayName: string;
  /** Hậu tố hiển thị: '%' cho kiểm soát bóng */
  suffix?: string;
  /** Số chữ số thập phân — xG cần 1–2 chữ số, số cú sút thì không */
  decimals?: number;
}

export function StatCompareBar({
  label,
  home,
  away,
  vietnamIsHome,
  homeName,
  awayName,
  suffix = '',
  decimals = 0,
}: StatCompareBarProps) {
  const t = useTheme();

  /**
   * Thiếu dữ liệu một bên -> KHÔNG vẽ thanh.
   *
   * Vẽ "58% ████ —" sẽ khiến thanh bên có số chiếm trọn 100%, trông như đội đó
   * áp đảo tuyệt đối. Thà ẩn dòng này còn hơn hiện một hình ảnh sai.
   */
  if (home === null || away === null) return null;

  const fmt = (n: number) => `${n.toFixed(decimals)}${suffix}`;
  const bothZero = home === 0 && away === 0;

  const vieColor = t.colors.accent;
  const oppColor = t.colors.borderStrong;

  return (
    <View
      style={{ gap: 6 }}
      accessible
      accessibilityLabel={`${label}: ${homeName} ${fmt(home)}, ${awayName} ${fmt(away)}`}
    >
      {/* Hàng chữ: số nhà — nhãn — số khách */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <AppText
          variant="label"
          tabular
          style={{ width: 52, color: vietnamIsHome ? t.colors.accentText : t.colors.text }}
        >
          {fmt(home)}
        </AppText>
        <AppText variant="caption" tone="muted" center style={{ flex: 1 }}>
          {label}
        </AppText>
        <AppText
          variant="label"
          tabular
          style={{ width: 52, textAlign: 'right', color: vietnamIsHome ? t.colors.text : t.colors.accentText }}
        >
          {fmt(away)}
        </AppText>
      </View>

      {/* Thanh tỷ lệ — hai đoạn nối nhau, khe hở 2px để tách rõ hai bên */}
      <View style={{ flexDirection: 'row', height: 6, gap: 2 }}>
        {bothZero ? (
          // Cả hai 0 -> một thanh trung tính đều, không đội nào "hơn"
          <View style={{ flex: 1, borderRadius: 3, backgroundColor: t.colors.surfaceSunken }} />
        ) : (
          <>
            <View
              style={{
                flex: home,
                borderRadius: 3,
                backgroundColor: vietnamIsHome ? vieColor : oppColor,
              }}
            />
            <View
              style={{
                flex: away,
                borderRadius: 3,
                backgroundColor: vietnamIsHome ? oppColor : vieColor,
              }}
            />
          </>
        )}
      </View>
    </View>
  );
}
