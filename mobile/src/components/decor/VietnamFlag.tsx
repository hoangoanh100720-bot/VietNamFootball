/**
 * ============================================================================
 * COMPONENTS/DECOR/VIETNAMFLAG.TSX — LÁ CỜ ĐỎ SAO VÀNG
 * ============================================================================
 *
 * 🎨 VÌ SAO VẼ BẰNG SVG MÀ KHÔNG DÙNG ẢNH PNG?
 *
 *   | Tiêu chí          | Ảnh PNG                  | SVG (cách này)          |
 *   |-------------------|--------------------------|-------------------------|
 *   | Phóng to          | vỡ hạt, mờ               | luôn sắc nét            |
 *   | Dung lượng        | 20-80KB mỗi kích cỡ      | ~1KB, dùng cho mọi cỡ   |
 *   | Đổi màu           | phải xuất lại file       | đổi một thuộc tính      |
 *   | Hoạt hoạ từng phần| không làm được           | xoay riêng ngôi sao ✅   |
 *
 * ----------------------------------------------------------------------------
 * ⭐ NGÔI SAO NĂM CÁNH ĐƯỢC TÍNH RA SAO? (phần toán đáng hiểu)
 *
 * Một ngôi sao năm cánh = 10 điểm nối lại: 5 ĐỈNH ngoài xen kẽ 5 ĐÁY trong.
 *
 *            ●  ← đỉnh ngoài (bán kính R)
 *           ╱ ╲
 *      ○───     ───○   ← đáy trong (bán kính r ≈ 0.382 × R)
 *
 * • Năm đỉnh cách đều nhau 360° / 5 = 72°.
 * • Các đáy nằm CHÍNH GIỮA hai đỉnh, tức lệch thêm 36°.
 * • Tỷ lệ r/R = 0.381966… chính là nghịch đảo bình phương tỷ lệ vàng.
 *   Đây là tỷ lệ của ngôi sao trên quốc kỳ Việt Nam và hầu hết quốc kỳ khác.
 *   Lệch khỏi con số này, ngôi sao trông "sai sai" mà khó chỉ ra vì sao.
 *
 * • Bắt đầu từ -90° để một đỉnh chĩa thẳng LÊN TRÊN. Không trừ 90°, ngôi sao
 *   sẽ nằm nghiêng — lỗi kinh điển khi tự vẽ sao bằng công thức.
 * ============================================================================
 */

import Svg, { Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { staticColors } from '@/theme/colors';

/**
 * Sinh chuỗi toạ độ đa giác cho một ngôi sao n cánh.
 *
 * @param cx      Tâm theo trục ngang
 * @param cy      Tâm theo trục dọc
 * @param outer   Bán kính tới ĐỈNH
 * @param inner   Bán kính tới ĐÁY (thường = outer × 0.382)
 * @param points  Số cánh (quốc kỳ Việt Nam: 5)
 * @returns       Chuỗi path SVG, ví dụ "M 50 10 L 56 30 ... Z"
 */
export function buildStarPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points = 5
): string {
  const coords: string[] = [];

  // Mỗi cánh cần 2 điểm (1 đỉnh + 1 đáy) -> tổng points × 2 điểm
  for (let i = 0; i < points * 2; i += 1) {
    // Chẵn = đỉnh ngoài, lẻ = đáy trong
    const radius = i % 2 === 0 ? outer : inner;

    /**
     * Góc của điểm thứ i:
     *   (i × 180° / points)  — mỗi bước nửa cánh
     *   − 90°                — xoay để đỉnh đầu tiên chĩa thẳng lên
     *   × π/180              — đổi độ sang radian cho Math.cos/sin
     */
    const angle = ((i * 180) / points - 90) * (Math.PI / 180);

    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    // Điểm đầu dùng lệnh M (moveTo), các điểm sau dùng L (lineTo)
    coords.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return coords.join(' ') + ' Z'; // Z = đóng kín hình
}

/** Tỷ lệ bán kính trong/ngoài chuẩn của ngôi sao năm cánh */
export const STAR_INNER_RATIO = 0.382;

interface VietnamFlagProps {
  /** Chiều rộng lá cờ (chiều cao tự tính theo tỷ lệ 3:2 của quốc kỳ) */
  size?: number;
  /** Bo góc — dùng khi đặt cờ làm huy hiệu tròn trịa */
  radius?: number;
  /** true = chỉ vẽ ngôi sao, bỏ nền đỏ. Dùng khi đặt sao lên nền đỏ sẵn có. */
  starOnly?: boolean;
  /** Độ mờ — dùng khi làm hoạ tiết nền chìm */
  opacity?: number;
}

/**
 * ⭐ Lá cờ đỏ sao vàng.
 *
 * TỶ LỆ CHÍNH THỨC của quốc kỳ Việt Nam là 3:2 (rộng : cao) và ngôi sao có
 * đường kính bằng 1/5 chiều rộng lá cờ. Code dưới đây tuân thủ đúng hai con
 * số đó — vẽ đúng tỷ lệ là cách tôn trọng biểu tượng quốc gia.
 *
 * Cách dùng:
 *   <VietnamFlag size={40} />                  // huy hiệu ở thanh tiêu đề
 *   <VietnamFlag size={160} opacity={0.08} />  // hoạ tiết nền chìm
 *   <VietnamFlag size={24} starOnly />         // chỉ ngôi sao
 */
export function VietnamFlag({
  size = 32,
  radius = 4,
  starOnly = false,
  opacity = 1,
}: VietnamFlagProps) {
  // Tỷ lệ chính thức 3:2
  const width = size;
  const height = (size * 2) / 3;

  // Ngôi sao: đường kính = 1/5 chiều rộng cờ -> bán kính = 1/10
  const starOuter = width / 5;
  const starInner = starOuter * STAR_INNER_RATIO;

  const starPath = buildStarPath(width / 2, height / 2, starOuter, starInner);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} opacity={opacity}>
      {!starOnly && (
        <>
          <Defs>
            {/*
              Dải màu rất nhẹ từ đỏ sẫm sang đỏ tươi.
              Cờ phẳng một màu trông như hình dán; chút chuyển màu tạo cảm giác
              vải đang bắt sáng — đúng tinh thần "như tranh vẽ".
            */}
            <LinearGradient id="flagBg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={staticColors.flagGradient[0]} />
              <Stop offset="0.55" stopColor={staticColors.flagGradient[1]} />
              <Stop offset="1" stopColor={staticColors.flagGradient[2]} />
            </LinearGradient>
          </Defs>

          <Rect x="0" y="0" width={width} height={height} rx={radius} fill="url(#flagBg)" />
        </>
      )}

      <Path d={starPath} fill={staticColors.decor.starYellow} />
    </Svg>
  );
}

/**
 * Ngôi sao vàng đứng một mình — dùng làm dấu đánh giá, huy hiệu đội trưởng,
 * hoặc rải làm hoạ tiết nền.
 *
 * @param filled false = chỉ vẽ đường viền (dùng cho thang đánh giá "3/5 sao")
 */
export function GoldStar({
  size = 16,
  color = staticColors.decor.starYellow,
  filled = true,
  opacity = 1,
}: {
  size?: number;
  color?: string;
  filled?: boolean;
  opacity?: number;
}) {
  const outer = size / 2;
  const path = buildStarPath(outer, outer, outer, outer * STAR_INNER_RATIO);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
      <Path
        d={path}
        fill={filled ? color : 'none'}
        stroke={color}
        // Viền mảnh theo cỡ sao: sao nhỏ mà viền dày sẽ bít kín phần rỗng bên trong
        strokeWidth={filled ? 0 : Math.max(1, size / 14)}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
