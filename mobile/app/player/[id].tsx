/**
 * ============================================================================
 * APP/PLAYER/[ID].TSX — HỒ SƠ CẦU THỦ
 * ============================================================================
 *
 * Hiển thị đúng những gì mục 4.2 của ARCHITECTURE.md yêu cầu:
 * quê quán, tuổi, chiều cao, vị trí, số áo, giá trị chuyển nhượng,
 * và lịch sử thi đấu ở các câu lạc bộ.
 *
 * ----------------------------------------------------------------------------
 * 🗺️ BỐ CỤC MÀN HÌNH (từ trên xuống)
 *
 *   ┌──────────────────────────────┐
 *   │   ╭───╮                      │  ← PHẦN ĐẦU (hero), nền xanh tre sẫm
 *   │   │ ảnh│  ⑩                  │     • ảnh tròn + số áo
 *   │   ╰───╯                      │     • tên đầy đủ
 *   │   Nguyễn Tiến Linh           │     • huy hiệu vị trí
 *   │   [TIỀN ĐẠO] Trung phong     │
 *   │   ───────────────────────    │
 *   │    42      18      1,2 tr €  │  ← 3 số liệu nổi bật nhất
 *   │   Trận   Bàn thắng  Giá trị  │
 *   ├──────────────────────────────┤
 *   │ THÔNG TIN CÁ NHÂN            │  ← bảng InfoRow, nhãn trái - giá trị phải
 *   │ Quê quán           Hải Dương │
 *   │ Ngày sinh   20/10/1996 (30t) │
 *   ├──────────────────────────────┤
 *   │ LỊCH SỬ THI ĐẤU              │  ← dòng thời gian các CLB
 *   │ ● Bình Dương  2020—nay 89 12 │
 *   │ ○ Than QN     2016—2020 45  8│
 *   └──────────────────────────────┘
 *
 * ----------------------------------------------------------------------------
 * 🎨 QUYẾT ĐỊNH THIẾT KẾ: VÌ SAO ẢNH LỚN CHIẾM TRỌN PHẦN ĐẦU?
 *
 * Đây là màn hình VỀ MỘT CON NGƯỜI. Danh tính phải là thứ đầu tiên và rõ ràng
 * nhất — người dùng mở màn hình này để xem "anh ấy là ai", không phải để đọc
 * bảng số. Số liệu chi tiết vì thế xếp xuống dưới, dạng bảng gọn gàng.
 *
 * Ba số liệu (trận · bàn thắng · giá trị) được kéo LÊN hero vì đó là ba con số
 * mà người hâm mộ hỏi đầu tiên. Phần còn lại cuộn xuống mới thấy.
 *
 * ----------------------------------------------------------------------------
 * 🧩 BA KỸ THUẬT ĐÁNG HỌC Ở FILE NÀY
 *
 *   1. ROUTE ĐỘNG — tên file có ngoặc vuông `[id].tsx` nên nó khớp với
 *      /player/1, /player/26... Lấy id bằng useLocalSearchParams().
 *      ⚠️ Giá trị LUÔN là chuỗi (vì đến từ URL) -> phải Number() trước khi dùng.
 *
 *   2. XỬ LÝ ĐỦ 4 TRẠNG THÁI — đang tải (skeleton) · lỗi · không có dữ liệu ·
 *      có dữ liệu. Màn hình chỉ đẹp ở trạng thái thứ 4 là màn hình chưa xong.
 *
 *   3. MÀU TRÊN NỀN CỐ ĐỊNH — phần hero luôn nền sẫm ở CẢ chế độ sáng lẫn tối,
 *      nên chữ dùng `t.static.onDark.*` chứ KHÔNG dùng `t.colors.text`.
 *      Dùng nhầm thì ở chế độ sáng chữ sẽ là xanh đậm trên nền xanh đậm —
 *      biến mất hoàn toàn. Chi tiết: docs/DESIGN-SYSTEM.md mục 2.
 */

import { Linking, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/Text';
import { Card, SectionHeader, InfoRow, Badge } from '@/components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/States';
import { PlayerAvatar } from '@/components/common/TeamLogo';
import { playersApi } from '@/api/endpoints';
import { formatDate, formatEuro, POSITION_LABEL } from '@/utils/format';
import { Seo } from '@/components/common/Seo';

export default function PlayerDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = Number(id);

  const query = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => playersApi.detail(playerId),
    enabled: Number.isFinite(playerId) && playerId > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });

  if (query.isLoading) {
    return (
      <Screen>
        {/* Thẻ SEO dự phòng cho khuôn trang tĩnh — xem giải thích ở app/match/[id].tsx */}
        <Seo
          title="Hồ sơ cầu thủ"
          description="Thông tin cầu thủ Đội tuyển Việt Nam: vị trí thi đấu, câu lạc bộ, số trận khoác áo đội tuyển và giá trị chuyển nhượng."
          path={`/player/${id ?? ''}`}
        />
        <View style={{ gap: t.spacing.lg, paddingTop: t.spacing.lg }}>
          <Skeleton width="100%" height={190} radius={t.radius.lg} />
          <Skeleton width="100%" height={260} radius={t.radius.lg} />
        </View>
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen>
        {/* noIndex: trang lỗi không được lọt vào kết quả tìm kiếm */}
        <Seo
          title="Không tải được hồ sơ"
          description="Không tìm thấy dữ liệu cầu thủ này."
          path={`/player/${id ?? ''}`}
          noIndex
        />
        <ErrorState
          title="Không tải được hồ sơ"
          message={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const { player, clubs } = query.data;

  /**
   * Chuyển mã chân thuận sang tiếng Việt.
   *
   * 💡 VÌ SAO DATABASE LƯU 'left' MÀ KHÔNG LƯU THẲNG "Chân trái"?
   * Vì database KHÔNG nên biết app đang hiển thị bằng ngôn ngữ gì. Lưu mã
   * tiếng Anh rồi dịch ở tầng giao diện cho ta ba lợi ích:
   *   • Thêm tiếng Anh/tiếng Hàn sau này chỉ phải sửa đúng chỗ này
   *   • Lọc và thống kê trong SQL luôn dựa trên một giá trị cố định
   *   • Đổi cách gọi ("Chân trái" -> "Thuận trái") không cần chạy migration
   *
   * Chuỗi ba tầng ?: đọc hơi rối nhưng gọn hơn switch-case và không đẻ thêm
   * biến trung gian. Dấu "—" (gạch dài) là quy ước của dự án cho "chưa có dữ liệu".
   */
  const footLabel =
    player.preferred_foot === 'left' ? 'Chân trái'
    : player.preferred_foot === 'right' ? 'Chân phải'
    : player.preferred_foot === 'both' ? 'Hai chân'
    : '—';

  return (
    <>
      <Stack.Screen options={{ title: player.short_name ?? 'Cầu thủ' }} />

      {/* SEO động theo hồ sơ cầu thủ — xem giải thích ở app/match/[id].tsx */}
      <Seo
        title={player.full_name}
        description={
          `Hồ sơ cầu thủ ${player.full_name} của Đội tuyển Việt Nam: vị trí thi đấu, ` +
          `câu lạc bộ chủ quản, số trận khoác áo đội tuyển, số bàn thắng và giá trị chuyển nhượng.`
        }
        path={`/player/${player.id}`}
      />

      {/*
        Hai prop này quyết định cả dáng màn hình, đừng đổi nếu chưa hiểu:

        edges={[]}     KHÔNG chừa vùng an toàn nào — để dải màu hero tràn lên
                       tận tai thỏ, trông liền mạch như ảnh bìa. Bù lại, chữ
                       bên trong hero có padding dọc lớn nên không bị che.

        padded={false} Bỏ lề ngang mặc định, vì hero phải chạm sát hai mép.
                       Phần nội dung bên dưới tự thêm lề riêng bằng một
                       <View style={{ paddingHorizontal: t.spacing.lg }}>.
      */}
      <Screen edges={[]} padded={false}>
        {/* ================= PHẦN ĐẦU: ẢNH + TÊN ================= */}
        <LinearGradient
          colors={t.static.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: t.spacing.xxl,
            paddingHorizontal: t.spacing.lg,
            alignItems: 'center',
            gap: t.spacing.md,
          }}
        >
          <PlayerAvatar
            uri={player.photo_url}
            name={player.full_name}
            // Ảnh mặt thật là thứ đầu tiên người xem tìm ở màn này -> đủ to để nhận ra
            size={128}
            shirtNumber={player.shirt_number}
          />

          <View style={{ alignItems: 'center', gap: 4 }}>
            <AppText variant="h2" center style={{ color: t.static.onDark.text }}>
              {player.full_name}
            </AppText>

            <View style={{ flexDirection: 'row', gap: t.spacing.sm, alignItems: 'center' }}>
              <Badge label={POSITION_LABEL[player.position] ?? player.position} tone="accent" size="sm" />
              {/* Thủ môn chỉ có một vị trí -> bỏ dòng trùng "Thủ môn Thủ môn" */}
              {player.detailed_position &&
                player.detailed_position !== POSITION_LABEL[player.position] && (
                <AppText variant="caption" style={{ color: t.static.onDark.textMuted }}>
                  {player.detailed_position}
                </AppText>
              )}
            </View>
          </View>

          {/* Ba số liệu nổi bật nhất — đặt ngay dưới tên để thấy tức thì */}
          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.xl,
              marginTop: t.spacing.sm,
              paddingTop: t.spacing.lg,
              borderTopWidth: 1,
              borderTopColor: t.static.onDark.border,
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <HeroStat label="Trận" value={String(player.caps)} />
            <HeroStat label="Bàn thắng" value={String(player.goals)} />
            <HeroStat label="Giá trị" value={formatEuro(player.market_value_eur)} />
          </View>

          {/*
            ⚖️ GHI CÔNG ẢNH — bắt buộc theo giấy phép CC BY / CC BY-SA của ảnh
            Wikimedia Commons. Chạm để mở trang gốc của ảnh.
          */}
          {player.photo_url && player.photo_credit && (
            <Pressable
              onPress={() => player.photo_source_url && void Linking.openURL(player.photo_source_url)}
              accessibilityRole="link"
              accessibilityLabel={`Nguồn ảnh: ${player.photo_credit}`}
              hitSlop={8}
            >
              <AppText
                variant="caption"
                center
                style={{ color: t.static.onDark.textFaint, fontSize: t.fontSize.xs }}
              >
                Ảnh: {player.photo_credit}
              </AppText>
            </Pressable>
          )}
        </LinearGradient>

        <View style={{ paddingHorizontal: t.spacing.lg }}>
          {/* ================= THÔNG TIN CÁ NHÂN ================= */}
          <SectionHeader title="Thông tin cá nhân" />

          <Card>
            {/* "Nơi sinh" chứ không phải "Quê quán": dữ liệu lấy theo nơi sinh trên Wikipedia
                (Xuân Son sinh ở Brasil, Patrik ở Slovakia — đó không phải quê gốc) */}
            <InfoRow label="Nơi sinh" value={player.hometown ?? '—'} />
            <InfoRow
              label="Ngày sinh"
              value={
                player.birth_date
                  ? `${formatDate(player.birth_date)}${player.age ? ` (${player.age} tuổi)` : ''}`
                  : '—'
              }
              tabular
            />
            <InfoRow
              label="Chiều cao"
              value={player.height_cm ? `${player.height_cm} cm` : '—'}
              tabular
            />
            <InfoRow
              label="Cân nặng"
              value={player.weight_kg ? `${player.weight_kg} kg` : '—'}
              tabular
            />
            <InfoRow label="Chân thuận" value={footLabel} />
            <InfoRow
              label="Số áo"
              value={player.shirt_number ? `Số ${player.shirt_number}` : '—'}
              tabular
            />
            <InfoRow label="CLB hiện tại" value={player.current_club ?? '—'} last />
          </Card>

          {/* ================= LỊCH SỬ CLB ================= */}
          <SectionHeader title="Lịch sử thi đấu" />

          {clubs.length === 0 ? (
            <EmptyState
              icon="shirt-outline"
              title="Chưa có dữ liệu câu lạc bộ"
              message="Thông tin sẽ được bổ sung khi đồng bộ dữ liệu."
            />
          ) : (
            <Card padded={false}>
              {clubs.map((club, i) => {
                /**
                 * `to_date === null` nghĩa là "chưa rời CLB này" -> đang thi đấu ở đó.
                 *
                 * ⚠️ Phải so bằng `=== null`, KHÔNG dùng `!club.to_date`.
                 * Vì chuỗi rỗng '' cũng là giá trị "falsy" — nếu dữ liệu lỡ có
                 * ngày rỗng thay vì null, cách viết tắt kia sẽ báo nhầm một CLB
                 * cũ thành CLB hiện tại. Kiểm tra tường minh thì không bao giờ sai.
                 */
                const isCurrent = club.to_date === null;

                return (
                  <View
                    key={club.id}
                    style={{
                      flexDirection: 'row',
                      gap: t.spacing.md,
                      padding: t.spacing.md,
                      borderBottomWidth: i === clubs.length - 1 ? 0 : 1,
                      borderBottomColor: t.colors.border,
                      alignItems: 'center',
                    }}
                  >
                    {/*
                      Chấm tròn dòng thời gian: CLB hiện tại tô đặc màu nhấn,
                      CLB cũ chỉ có viền rỗng. Khác biệt hình dạng + màu.
                    */}
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: isCurrent ? t.colors.accent : 'transparent',
                        borderWidth: isCurrent ? 0 : 2,
                        borderColor: t.colors.borderStrong,
                      }}
                    />

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                        <AppText variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {club.club_name}
                        </AppText>
                        {isCurrent && <Badge label="HIỆN TẠI" tone="accent" size="sm" />}
                        {club.is_loan && <Badge label="CHO MƯỢN" tone="neutral" size="sm" />}
                      </View>

                      {/*
                        CHỈ HIỆN NĂM: nguồn dữ liệu (infobox Wikipedia) chỉ ghi "2019–2021",
                        ngày 01/01 và 31/12 trong DB là quy ước lưu trữ. In ra "01/01/2019"
                        là khoe một độ chính xác mà dữ liệu không có.
                      */}
                      <AppText variant="caption" tone="faint" tabular>
                        {formatYears(club.from_date, club.to_date)}
                      </AppText>
                    </View>

                    {/* Số liệu ra sân, căn phải */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="label" tabular>
                        {club.apps}
                      </AppText>
                      <AppText variant="caption" tone="faint">
                        trận
                      </AppText>
                    </View>

                    <View style={{ alignItems: 'flex-end', minWidth: 32 }}>
                      <AppText variant="label" tabular tone="accent">
                        {club.goals}
                      </AppText>
                      <AppText variant="caption" tone="faint">
                        bàn
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}

          <View style={{ height: t.spacing.xxxl }} />
        </View>
      </Screen>
    </>
  );
}

/**
 * Khoảng năm ở một CLB: "2019 – 2021", "2025 – nay", hoặc "2020" khi vào và rời
 * trong cùng năm (tránh dòng "2020 – 2020" trông như lỗi).
 */
function formatYears(from: string | null, to: string | null): string {
  const a = from ? new Date(from).getFullYear() : null;
  if (to === null) return `${a ?? '?'} – nay`;
  const b = new Date(to).getFullYear();
  return a === b ? String(b) : `${a ?? '?'} – ${b}`;
}

/** Ô số liệu trong phần đầu (nền tối) */
function HeroStat({ label, value }: { label: string; value: string }) {
  const t = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <AppText variant="h3" tabular style={{ color: t.static.onDark.text }}>
        {value}
      </AppText>
      <AppText variant="caption" style={{ color: t.static.onDark.textFaint }}>
        {label}
      </AppText>
    </View>
  );
}
