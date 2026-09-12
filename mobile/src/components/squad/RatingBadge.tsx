/**
 * ============================================================================
 * COMPONENTS/SQUAD/RATINGBADGE.TSX — HUY HIỆU ĐIỂM & THẺ PHẠT TRÊN ĐẦU CẦU THỦ
 * ============================================================================
 *
 * Đặc tả: ARCHITECTURE.md mục 5.3 — đây là tính năng ⭐ của app.
 *
 * Vẽ đúng ba thứ lên sơ đồ sân:
 *
 *                 ┌─────┐
 *                 │ 8.8★│  ← RatingBadge: điểm + sao nếu là MOTM
 *                 └─────┘
 *                  ⚽⚽     ← GoalMarks: số bàn thắng
 *                 ╭───╮ ▮   ← CardMarks: thẻ vàng / thẻ đỏ
 *                 │ 9 │ C
 *                 ╰───╯
 *
 * ----------------------------------------------------------------------------
 * ♿ QUY TẮC TIẾP CẬN QUAN TRỌNG NHẤT Ở ĐÂY
 *
 * Màu badge thay đổi theo thang điểm (xanh = giỏi, đỏ = kém), NHƯNG con số
 * LUÔN hiện ra. Người mù màu đỏ-lục (khoảng 8% nam giới) vẫn đọc được "5.4"
 * dù không phân biệt được màu nền.
 *
 * Thẻ phạt cũng vậy: ngoài màu, thẻ đỏ còn làm áo số MỜ ĐI 50% (cầu thủ đã
 * rời sân) — một tín hiệu thứ hai không phụ thuộc màu sắc.
 *
 * ----------------------------------------------------------------------------
 * 📐 VÌ SAO DÙNG position:'absolute' VỚI top ÂM?
 *
 * Badge phải "ghim" phía trên áo số, nhưng KHÔNG được đẩy áo số xuống hay làm
 * xô lệch các cầu thủ khác trên sân. Vị trí tuyệt đối với top âm cho phép nó
 * "nổi" ra ngoài khung cha mà không chiếm chỗ trong bố cục.
 *
 * Đây là một trong số ít trường hợp position:'absolute' là lựa chọn ĐÚNG chứ
 * không phải cách lười — xem docs/DESIGN-SYSTEM.md.
 */

import { View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';

// ---------------------------------------------------------------------------
// HUY HIỆU ĐIỂM
// ---------------------------------------------------------------------------

interface RatingBadgeProps {
  /** Điểm 0–10. null = chưa đủ 10 phút thi đấu -> hiện "–" */
  rating: number | null;
  /** Cầu thủ xuất sắc nhất trận -> badge vàng + dấu sao */
  isMotm?: boolean;
  /** Chế độ người lớn tuổi: badge to hơn, chữ lớn hơn */
  senior?: boolean;
}

/**
 * ⭐ HUY HIỆU ĐIỂM.
 *
 * Bốn bậc màu theo ARCHITECTURE.md mục 5.3:
 *   ≥ 8.0  xuất sắc · 7.0–7.9 tốt · 6.0–6.9 trung bình · < 6.0 kém
 */
export function RatingBadge({ rating, isMotm = false, senior = false }: RatingBadgeProps) {
  const t = useTheme();

  /**
   * Chọn màu theo bậc điểm.
   *
   * Viết bằng chuỗi if thay vì bảng tra vì đây là so sánh KHOẢNG (>= 8.0),
   * không phải tra theo khoá cố định. Bảng tra chỉ hợp khi khoá rời rạc.
   */
  const background =
    rating === null
      ? t.colors.surfaceRaised
      : isMotm
        ? t.colors.gold
        : rating >= 8.0
          ? t.colors.ratingExcellent
          : rating >= 7.0
            ? t.colors.ratingGood
            : rating >= 6.0
              ? t.colors.ratingAverage
              : t.colors.ratingPoor;

  /**
   * ⚠️ MÀU CHỮ PHẢI ĐỔI THEO NỀN, KHÔNG ĐƯỢC CỐ ĐỊNH.
   *
   * Nền badge là màu đặc (xanh lá sáng, vàng, đỏ cam) chứ không theo theme.
   * Ở chế độ SÁNG, các màu nền này sẫm lại (xem colors.ts), nên chữ phải
   * chuyển sang trắng để còn đọc được.
   *
   * Dùng `t.isDark` để quyết định: nền tối -> chữ tối trên nền sáng;
   * nền sáng -> chữ trắng trên nền sẫm.
   */
  const textColor =
    rating === null
      ? t.colors.textFaint
      : t.isDark
        ? t.static.black
        : t.static.white;

  // Kích thước theo đặc tả: thường 32×18, senior 44×24
  const width = senior ? 44 : isMotm ? 36 : 32;
  const height = senior ? 24 : 18;
  const fontSize = senior ? 15 : 11;

  return (
    <View
      style={{
        position: 'absolute',
        // Ghim phía trên áo số: chiều cao badge + 4px khoảng thở
        top: -(height + 4),
        alignSelf: 'center',
        minWidth: width,
        height,
        borderRadius: t.radius.sm,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        /**
         * Viền mảnh cùng màu nền sân: tách badge khỏi mặt cỏ khi hai màu
         * lỡ gần nhau. Không có nó, badge xanh lá trên cỏ xanh sẽ chìm nghỉm.
         */
        borderWidth: 1.5,
        borderColor: t.colors.pitch,
      }}
      // Trình đọc màn hình đọc thành "Điểm 8.8, cầu thủ xuất sắc nhất trận"
      accessibilityLabel={
        rating === null
          ? 'Chưa đủ thời gian thi đấu để chấm điểm'
          : `Điểm ${rating}${isMotm ? ', cầu thủ xuất sắc nhất trận' : ''}`
      }
    >
      <AppText
        tabular
        style={{
          fontSize,
          fontWeight: t.fontWeight.bold,
          color: textColor,
          // lineHeight bằng đúng cỡ chữ -> chữ căn giữa khít trong badge thấp
          lineHeight: fontSize + 1,
        }}
      >
        {/* toFixed(1) để 8 hiện thành "8.0" — cột điểm mới thẳng hàng nhau */}
        {rating === null ? '–' : rating.toFixed(1)}
        {isMotm ? '★' : ''}
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// THẺ PHẠT
// ---------------------------------------------------------------------------

interface CardMarksProps {
  yellowCards: number;
  redCards: number;
  senior?: boolean;
}

/**
 * 🟨🟥 THẺ PHẠT — hình chữ nhật đứng ở góc trên-phải của áo số.
 *
 * Ba trường hợp theo đặc tả:
 *   1 thẻ vàng          -> một hình vàng
 *   thẻ đỏ trực tiếp    -> một hình đỏ
 *   2 thẻ vàng -> đỏ    -> hai hình chồng LỆCH nhau: vàng sau, đỏ trước
 *
 * 📐 Vì sao chồng lệch chứ không xếp cạnh nhau? Vì xếp cạnh chiếm gấp đôi bề
 * ngang, và trên sơ đồ sân chật chội thì hai cầu thủ đứng gần nhau sẽ bị đè
 * lên nhau. Chồng lệch giữ nguyên bề ngang mà vẫn thấy rõ là hai thẻ.
 */
export function CardMarks({ yellowCards, redCards, senior = false }: CardMarksProps) {
  const t = useTheme();

  if (yellowCards === 0 && redCards === 0) return null;

  const w = senior ? 10 : 8;
  const h = senior ? 14 : 11;

  /** Thẻ đỏ do nhận hai thẻ vàng — hiện cả hai để người xem hiểu vì sao bị đuổi */
  const isSecondYellow = redCards > 0 && yellowCards >= 2;

  return (
    <View
      style={{
        position: 'absolute',
        top: -2,
        right: -6,
        flexDirection: 'row',
      }}
      accessibilityLabel={
        redCards > 0
          ? isSecondYellow
            ? 'Thẻ đỏ do hai thẻ vàng'
            : 'Thẻ đỏ'
          : `${yellowCards} thẻ vàng`
      }
    >
      {/* Thẻ vàng nằm SAU (vẽ trước) khi có thẻ đỏ do 2 vàng */}
      {(yellowCards > 0 && redCards === 0) || isSecondYellow ? (
        <View
          style={{
            width: w,
            height: h,
            borderRadius: 1.5,
            backgroundColor: t.static.card.yellow,
            borderWidth: 0.5,
            borderColor: t.static.onDark.border,
            // Đẩy sang phải để lộ ra từ sau thẻ đỏ
            marginRight: isSecondYellow ? -w / 2 : 0,
          }}
        />
      ) : null}

      {redCards > 0 && (
        <View
          style={{
            width: w,
            height: h,
            borderRadius: 1.5,
            backgroundColor: t.static.card.red,
            borderWidth: 0.5,
            borderColor: t.static.onDark.border,
          }}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// BÀN THẮNG
// ---------------------------------------------------------------------------

/**
 * ⚽ SỐ BÀN THẮNG — hiện dưới badge điểm.
 *
 * 📏 Tối đa vẽ 3 quả bóng; từ 4 trở lên chuyển sang "⚽×4".
 *
 * Vì sao? Một cầu thủ ghi 5 bàn mà vẽ 5 quả bóng thì hàng bóng rộng hơn cả
 * áo số và đè lên cầu thủ bên cạnh. Đây là kiểu lỗi chỉ lộ ra khi gặp dữ liệu
 * bất thường — nên phải chặn ngay từ lúc viết, đừng đợi tới lúc có người ghi
 * poker rồi mới sửa.
 */
export function GoalMarks({ goals, senior = false }: { goals: number; senior?: boolean }) {
  const t = useTheme();

  if (goals <= 0) return null;

  const size = senior ? 13 : 10;

  return (
    <View
      style={{ position: 'absolute', top: -16, alignSelf: 'center', flexDirection: 'row', gap: 1 }}
      accessibilityLabel={`Ghi ${goals} bàn`}
    >
      {goals <= 3 ? (
        Array.from({ length: goals }).map((_, i) => (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: t.static.white,
              borderWidth: 1.5,
              borderColor: t.static.black,
            }}
          />
        ))
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: t.static.white,
              borderWidth: 1.5,
              borderColor: t.static.black,
            }}
          />
          <AppText
            tabular
            style={{
              fontSize: senior ? 12 : 9,
              fontWeight: t.fontWeight.bold,
              color: t.static.white,
            }}
          >
            ×{goals}
          </AppText>
        </View>
      )}
    </View>
  );
}
