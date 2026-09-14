/**
 * ============================================================================
 * COMPONENTS/COMMON/TEAMLOGO.TSX — LOGO ĐỘI & ẢNH CẦU THỦ
 * ============================================================================
 *
 * VẤN ĐỀ THỰC TẾ: dữ liệu bóng đá luôn có ảnh bị thiếu hoặc URL chết.
 * Nếu không xử lý, người dùng thấy ô trống hoặc icon "ảnh vỡ" xấu xí.
 *
 * GIẢI PHÁP DỰ PHÒNG: hiện chữ viết tắt trên nền màu.
 *   • Đội tuyển  -> mã FIFA: "VIE", "THA"
 *   • Cầu thủ    -> chữ cái đầu: "QH" (Quang Hải)
 *
 * VÌ SAO DÙNG expo-image THAY VÌ Image CỦA REACT NATIVE?
 *   • Tự lưu cache ra ổ đĩa -> mở app lần sau ảnh hiện tức thì
 *   • Có hiệu ứng mờ dần khi ảnh tải xong -> không bị "nhảy" đột ngột
 *   • Nhẹ RAM hơn khi cuộn danh sách dài
 */

import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { AppText } from './Text';
import { resolveMediaUrl } from '@/utils/media';

/** Logo đội tuyển */
export function TeamLogo({
  uri,
  fifaCode,
  name,
  size = 48,
}: {
  uri?: string | null;
  fifaCode?: string | null;
  name: string;
  size?: number;
}) {
  const t = useTheme();

  // Chữ dự phòng: ưu tiên mã FIFA, không có thì lấy 3 chữ cái đầu của tên
  const fallbackText = fifaCode ?? name.slice(0, 3).toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: t.radius.full,
        backgroundColor: t.colors.surfaceRaised,
        borderWidth: 1,
        borderColor: t.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image
          source={{ uri: resolveMediaUrl(uri) ?? undefined }}
          style={{ width: size * 0.72, height: size * 0.72 }}
          contentFit="contain"
          // Mờ dần trong 200ms khi ảnh tải xong
          transition={200}
          // Ảnh lỗi thì expo-image tự hiện nền trong suốt,
          // để lộ chữ dự phòng nằm dưới
          cachePolicy="memory-disk"
          accessibilityLabel={`Logo ${name}`}
        />
      ) : (
        <AppText
          style={{
            fontSize: size * 0.3,
            fontWeight: t.fontWeight.bold,
            color: t.colors.textMuted,
          }}
        >
          {fallbackText}
        </AppText>
      )}
    </View>
  );
}

/**
 * Ảnh đại diện cầu thủ.
 * Không có ảnh -> hiện chữ cái đầu của họ tên, ví dụ "Nguyễn Quang Hải" -> "NH".
 *
 * Ảnh trong DB là đường dẫn tương đối "/static/players/..." -> ghép với gốc
 * server qua resolveMediaUrl. Ảnh đã được cắt vuông lấy mặt làm tâm từ trước,
 * nhưng vẫn neo contentPosition "top": nếu sau này thêm ảnh dọc chưa cắt, phần
 * bị cắt đi là chân/áo chứ không phải đỉnh đầu.
 */
export function PlayerAvatar({
  uri,
  name,
  size = 48,
  shirtNumber,
}: {
  uri?: string | null;
  name: string;
  size?: number;
  shirtNumber?: number | null;
}) {
  const t = useTheme();

  /** Lấy chữ cái đầu của từ đầu và từ cuối */
  const initials = name
    .trim()
    .split(/\s+/)
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();

  const src = resolveMediaUrl(uri);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: t.radius.full,
          backgroundColor: t.colors.surfaceRaised,
          borderWidth: 1,
          borderColor: t.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {src ? (
          <Image
            source={{ uri: src }}
            style={{ width: size, height: size }}
            contentFit="cover"
            contentPosition="top"
            transition={200}
            cachePolicy="memory-disk"
            accessibilityLabel={`Ảnh ${name}`}
          />
        ) : (
          <AppText
            style={{
              fontSize: size * 0.34,
              fontWeight: t.fontWeight.bold,
              color: t.colors.textMuted,
            }}
          >
            {initials}
          </AppText>
        )}
      </View>

      {/* Số áo gắn ở góc dưới phải, như huy hiệu nhỏ */}
      {shirtNumber != null && (
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            minWidth: size * 0.4,
            height: size * 0.4,
            paddingHorizontal: 3,
            borderRadius: t.radius.full,
            backgroundColor: t.colors.accent,
            borderWidth: 2,
            borderColor: t.colors.bg, // viền cùng màu nền -> tạo cảm giác "tách lớp"
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText
            tabular
            style={{
              fontSize: size * 0.2,
              fontWeight: t.fontWeight.bold,
              color: t.colors.accentFg,
            }}
          >
            {shirtNumber}
          </AppText>
        </View>
      )}
    </View>
  );
}
