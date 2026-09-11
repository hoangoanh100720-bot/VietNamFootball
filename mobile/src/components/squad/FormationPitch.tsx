/**
 * ============================================================================
 * COMPONENTS/SQUAD/FORMATIONPITCH.TSX — SƠ ĐỒ CHIẾN THUẬT TRÊN SÂN
 * ============================================================================
 *
 * Đây là thành phần "khoe" nhất của app: vẽ mặt sân rồi đặt 11 cầu thủ lên
 * đúng vị trí chiến thuật.
 *
 * ----------------------------------------------------------------------------
 * CÁCH ĐỊNH VỊ CẦU THỦ — DÙNG PHẦN TRĂM, KHÔNG DÙNG PIXEL
 *
 * Database lưu position_x và position_y trong khoảng 0-100 (xem migration 001).
 * Ta chuyển thẳng thành phần trăm của khung sân:
 *
 *   left = position_x %      (0 = biên trái, 100 = biên phải)
 *   top  = (100 - y) %       (⚠️ ĐẢO NGƯỢC! xem giải thích bên dưới)
 *
 * VÌ SAO PHẢI ĐẢO TRỤC Y?
 * Trong bóng đá, ta quen nghĩ "tiến lên phía trước" là y TĂNG.
 * Nhưng trên màn hình, toạ độ y=0 nằm ở TRÊN CÙNG và tăng dần XUỐNG DƯỚI.
 * Nên cầu thủ có y=88 (tiền đạo, gần khung thành đối phương) phải được đặt
 * ở top = 12% — tức gần đỉnh màn hình.
 *
 *   Bóng đá:  y=95 (tấn công)          Màn hình: top=5%
 *             y=50 (giữa sân)     ->             top=50%
 *             y=6  (thủ môn)                     top=94%
 *
 * Dùng phần trăm thay vì pixel để sơ đồ TỰ CO GIÃN đúng trên mọi kích thước
 * màn hình, từ iPhone SE nhỏ xíu tới máy tính bảng.
 */

import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { shortenName } from '@/utils/format';
import type { LineupPlayer } from '@/types';

/** Tỷ lệ khung sân: cao gấp 1.45 lần rộng — gần đúng tỷ lệ sân thật (105x68m) */
const PITCH_ASPECT = 1.45;

export function FormationPitch({
  players,
  formation,
  onPlayerPress,
}: {
  players: LineupPlayer[];
  formation: string;
  onPlayerPress?: (playerId: number) => void;
}) {
  const t = useTheme();

  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 1 / PITCH_ASPECT, // rộng : cao = 1 : 1.45
        backgroundColor: t.colors.pitch,
        borderRadius: t.radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: t.colors.border,
      }}
    >
      {/* ================= LỚP 1: VẠCH CỎ SỌC ================= */}
      <PitchStripes />

      {/* ================= LỚP 2: VẠCH VÔI ================= */}
      <PitchLines />

      {/* ================= LỚP 3: NHÃN SƠ ĐỒ ================= */}
      <View
        style={{
          position: 'absolute',
          top: t.spacing.sm,
          left: t.spacing.sm,
          backgroundColor: 'rgba(0,0,0,0.35)',
          paddingHorizontal: t.spacing.sm,
          paddingVertical: 3,
          borderRadius: t.radius.sm,
        }}
      >
        <AppText
          tabular
          style={{ fontSize: t.fontSize.xs, fontWeight: t.fontWeight.bold, color: '#FFFFFF', letterSpacing: 1 }}
        >
          {formation}
        </AppText>
      </View>

      {/* ================= LỚP 4: CẦU THỦ ================= */}
      {players.map((player) => (
        <PitchPlayer
          key={player.id}
          player={player}
          onPress={onPlayerPress ? () => onPlayerPress(player.player_id) : undefined}
        />
      ))}
    </View>
  );
}

/**
 * VẠCH CỎ SỌC — 8 dải ngang xen kẽ hai sắc xanh.
 * Chi tiết nhỏ này khiến mặt sân trông thật thay vì một mảng màu phẳng.
 */
function PitchStripes() {
  const t = useTheme();

  return (
    <View style={{ ...StyleSheetAbsoluteFill }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            // Dải chẵn dùng màu sọc, dải lẻ để trong suốt (lộ màu nền)
            backgroundColor: i % 2 === 0 ? t.colors.pitchStripe : 'transparent',
          }}
        />
      ))}
    </View>
  );
}

/**
 * VẠCH VÔI — vẽ bằng View có viền, không cần thư viện đồ hoạ.
 *
 * Tất cả đều dùng % nên tự co giãn theo khung sân.
 */
function PitchLines() {
  const t = useTheme();
  const line = { borderColor: t.colors.pitchLine, borderWidth: 1.5 } as const;

  return (
    <View style={{ ...StyleSheetAbsoluteFill }} pointerEvents="none">
      {/* Đường biên ngoài cùng */}
      <View style={{ ...StyleSheetAbsoluteFill, margin: 6, ...line, borderRadius: 2 }} />

      {/* Đường giữa sân */}
      <View
        style={{
          position: 'absolute',
          left: 6, right: 6, top: '50%',
          borderTopWidth: 1.5,
          borderColor: t.colors.pitchLine,
        }}
      />

      {/* Vòng tròn giữa sân — borderRadius = nửa cạnh thì thành hình tròn */}
      <View
        style={{
          position: 'absolute',
          width: '30%',
          aspectRatio: 1,
          left: '35%',
          top: '50%',
          transform: [{ translateY: -0.15 * 100 }], // dịch lên nửa chiều cao
          marginTop: -28,
          borderRadius: 999,
          ...line,
        }}
      />

      {/* Vòng cấm khung thành đối phương (phía trên) */}
      <View
        style={{
          position: 'absolute',
          width: '54%', height: '15%',
          left: '23%', top: 6,
          borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomWidth: 1.5,
          borderColor: t.colors.pitchLine,
        }}
      />
      {/* Vòng 5m50 phía trên */}
      <View
        style={{
          position: 'absolute',
          width: '26%', height: '6.5%',
          left: '37%', top: 6,
          borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomWidth: 1.5,
          borderColor: t.colors.pitchLine,
        }}
      />

      {/* Vòng cấm khung thành nhà (phía dưới) */}
      <View
        style={{
          position: 'absolute',
          width: '54%', height: '15%',
          left: '23%', bottom: 6,
          borderLeftWidth: 1.5, borderRightWidth: 1.5, borderTopWidth: 1.5,
          borderColor: t.colors.pitchLine,
        }}
      />
      {/* Vòng 5m50 phía dưới */}
      <View
        style={{
          position: 'absolute',
          width: '26%', height: '6.5%',
          left: '37%', bottom: 6,
          borderLeftWidth: 1.5, borderRightWidth: 1.5, borderTopWidth: 1.5,
          borderColor: t.colors.pitchLine,
        }}
      />
    </View>
  );
}

/**
 * MỘT CẦU THỦ TRÊN SÂN: áo số tròn + tên bên dưới.
 *
 * position: 'absolute' + left/top theo % chính là cách "ghim" phần tử
 * vào đúng toạ độ trong khung cha.
 */
function PitchPlayer({
  player,
  onPress,
}: {
  player: LineupPlayer;
  onPress?: () => void;
}) {
  const t = useTheme();

  const x = player.position_x ?? 50;
  const y = player.position_y ?? 50;

  /** Màu áo theo tuyến — giúp nhận ra cấu trúc đội hình chỉ bằng liếc mắt */
  const positionColors: Record<string, string> = {
    GK: '#F59E0B', // thủ môn mặc áo khác màu, đúng luật bóng đá
    DF: '#3B82F6',
    MF: '#10B981',
    FW: t.colors.accent,
  };

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${player.full_name}, số ${player.shirt_number ?? '?'}`}
      style={{
        position: 'absolute',
        left: `${x}%`,
        // ⚠️ ĐẢO TRỤC Y: xem giải thích ở đầu file
        top: `${100 - y}%`,
        // Dịch ngược nửa kích thước để TÂM của áo số nằm đúng toạ độ,
        // thay vì góc trên-trái nằm ở đó
        marginLeft: -21,
        marginTop: -21,
        alignItems: 'center',
        width: 42,
      }}
    >
      {/* --- Áo số --- */}
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: positionColors[player.position] ?? t.colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.9)',
          // Bóng đổ ở đây là HỢP LÝ: cầu thủ thật sự "nổi" trên mặt sân
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.35,
          shadowRadius: 3,
          elevation: 4,
        }}
      >
        <AppText
          tabular
          style={{ fontSize: 14, fontWeight: t.fontWeight.bold, color: '#FFFFFF' }}
        >
          {player.shirt_number ?? '-'}
        </AppText>
      </View>

      {/* --- Băng đội trưởng --- */}
      {player.is_captain && (
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: 1,
            width: 15,
            height: 15,
            borderRadius: 8,
            backgroundColor: t.colors.gold,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 9, fontWeight: t.fontWeight.black, color: '#000' }}>
            C
          </AppText>
        </View>
      )}

      {/* --- Tên cầu thủ --- */}
      <View
        style={{
          marginTop: 3,
          backgroundColor: 'rgba(0,0,0,0.55)',
          paddingHorizontal: 4,
          paddingVertical: 1,
          borderRadius: 4,
        }}
      >
        <AppText
          numberOfLines={1}
          style={{ fontSize: 9, fontWeight: t.fontWeight.semibold, color: '#FFFFFF' }}
        >
          {shortenName(player.full_name, player.short_name)}
        </AppText>
      </View>
    </Wrapper>
  );
}

/** Rút gọn cho StyleSheet.absoluteFillObject — dùng nhiều lần ở trên */
const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

/**
 * CHÚ THÍCH MÀU ÁO — bắt buộc phải có!
 * Không có bảng chú thích thì màu sắc chỉ là trang trí, không truyền tin được.
 */
export function PitchLegend() {
  const t = useTheme();

  const items = [
    { color: '#F59E0B', label: 'Thủ môn' },
    { color: '#3B82F6', label: 'Hậu vệ' },
    { color: '#10B981', label: 'Tiền vệ' },
    { color: t.colors.accent, label: 'Tiền đạo' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: t.spacing.md,
        marginTop: t.spacing.md,
        justifyContent: 'center',
      }}
    >
      {items.map((item) => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View
            style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: item.color }}
          />
          <AppText variant="caption" tone="muted">
            {item.label}
          </AppText>
        </View>
      ))}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Ionicons name="ellipse" size={9} color={t.colors.gold} />
        <AppText variant="caption" tone="muted">
          Đội trưởng
        </AppText>
      </View>
    </View>
  );
}
