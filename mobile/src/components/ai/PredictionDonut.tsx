/**
 * ============================================================================
 * COMPONENTS/AI/PREDICTIONDONUT.TSX — BIỂU ĐỒ TỶ LỆ THẮNG/HOÀ/THUA
 * ============================================================================
 *
 * VẼ BIỂU ĐỒ VÒNG BẰNG SVG — GIẢI THÍCH TỪ ĐẦU
 *
 * Ta không vẽ 3 hình quạt riêng biệt (rất khó tính toán đường cong).
 * Thay vào đó dùng một mẹo kinh điển: vẽ 3 ĐƯỜNG TRÒN chồng lên nhau, mỗi
 * đường chỉ "hiện" một đoạn nhờ thuộc tính nét đứt.
 *
 *   strokeDasharray  = "độ dài nét vẽ, độ dài khoảng trống"
 *   strokeDashoffset = "xoay điểm bắt đầu đi bao nhiêu"
 *
 * Chu vi đường tròn C = 2 × π × r.
 * Muốn hiện 45% vòng -> nét vẽ dài 0.45 × C, khoảng trống là phần còn lại.
 *
 *   Vòng 1 (Thắng 45%): vẽ 0.45C, bắt đầu từ 0
 *   Vòng 2 (Hoà 30%)  : vẽ 0.30C, xoay đi 0.45C
 *   Vòng 3 (Thua 25%) : vẽ 0.25C, xoay đi 0.75C
 *
 * Ghép lại thành một vòng tròn liền mạch.
 *
 * ----------------------------------------------------------------------------
 * VÌ SAO PHẢI XOAY -90 ĐỘ?
 * SVG bắt đầu vẽ đường tròn từ vị trí "3 giờ" (bên phải). Người xem quen
 * đọc biểu đồ từ vị trí "12 giờ" (trên cùng). Xoay -90° để chỉnh lại.
 *
 * ----------------------------------------------------------------------------
 * ⭐ NGUYÊN TẮC TIẾP CẬN: biểu đồ LUÔN đi kèm bảng chú thích có SỐ và CHỮ.
 * Người mù màu, người dùng trình đọc màn hình vẫn phải nắm được thông tin.
 */

import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';

interface PredictionDonutProps {
  winPct: number;
  drawPct: number;
  losePct: number;
  size?: number;
  strokeWidth?: number;
}

export function PredictionDonut({
  winPct,
  drawPct,
  losePct,
  size = 168,
  strokeWidth = 20,
}: PredictionDonutProps) {
  const t = useTheme();

  // Bán kính phải trừ đi nửa độ dày nét, nếu không nét sẽ tràn ra ngoài khung
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  /** Tính hai thông số nét đứt cho một phần */
  const segment = (percent: number, offsetPercent: number) => ({
    strokeDasharray: `${(percent / 100) * circumference} ${circumference}`,
    // Số ÂM để xoay theo chiều kim đồng hồ
    strokeDashoffset: -((offsetPercent / 100) * circumference),
  });

  return (
    <View style={{ alignItems: 'center', gap: t.spacing.lg }}>
      {/* ================= VÒNG TRÒN ================= */}
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/*
          Xoay -90° CẢ KHUNG Svg bằng style transform (chuẩn React Native),
          thay vì dùng thuộc tính rotation/origin của <G>. Bản đầu dùng
          <G rotation origin> và trên web nó sinh ra lỗi console
          "Invalid DOM property transform-origin". style transform chạy
          giống hệt nhau trên iOS, Android và web.
        */}
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <G>
            {/* Vòng nền — phần "rãnh" xám phía dưới */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={t.colors.surfaceSunken}
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* THẮNG — bắt đầu từ 0% */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={t.colors.win}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
              {...segment(winPct, 0)}
            />

            {/* HOÀ — bắt đầu ngay sau phần Thắng */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={t.colors.draw}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
              {...segment(drawPct, winPct)}
            />

            {/* THUA — bắt đầu sau Thắng + Hoà */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={t.colors.lose}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
              {...segment(losePct, winPct + drawPct)}
            />
          </G>
        </Svg>

        {/*
          PHẦN GIỮA VÒNG TRÒN — đặt chồng lên bằng position absolute.
          Hiện tỷ lệ CAO NHẤT vì đó là thông tin người dùng muốn biết nhất:
          "khả năng cao nhất là gì?"
        */}
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <AppText variant="h1" tabular>
            {Math.max(winPct, drawPct, losePct)}%
          </AppText>
          <AppText variant="caption" tone="muted">
            {winPct >= drawPct && winPct >= losePct
              ? 'Thắng'
              : drawPct >= losePct
                ? 'Hoà'
                : 'Thua'}
          </AppText>
        </View>
      </View>

      {/* ================= CHÚ THÍCH ================= */}
      <View style={{ flexDirection: 'row', gap: t.spacing.xl }}>
        <LegendItem color={t.colors.win} label="Thắng" value={winPct} />
        <LegendItem color={t.colors.draw} label="Hoà" value={drawPct} />
        <LegendItem color={t.colors.lose} label="Thua" value={losePct} />
      </View>
    </View>
  );
}

/** Một mục chú thích: chấm màu + nhãn chữ + số phần trăm */
function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  const t = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
      </View>
      <AppText variant="h3" tabular>
        {value}%
      </AppText>
    </View>
  );
}
