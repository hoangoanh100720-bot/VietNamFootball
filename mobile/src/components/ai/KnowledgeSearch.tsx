/**
 * ============================================================================
 * COMPONENTS/AI/KNOWLEDGESEARCH.TSX — Ô HỎI ĐÁP KHO TRI THỨC
 * ============================================================================
 *
 * 🔍 ĐÂY LÀ GIAO DIỆN CỦA API /search — TÌM KIẾM LAI (hybrid search).
 *
 * Người dùng gõ một câu hỏi bằng tiếng Việt bình thường, app tìm trong kho
 * tri thức (các bài đã cào về từ VFF, tài liệu đã OCR) rồi trả về những đoạn
 * văn bản liên quan nhất, kèm liên kết tới nguồn gốc.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ BA ĐIỂM KHÁC BIỆT SO VỚI Ô TÌM KIẾM CẦU THỦ Ở TAB "CẦU THỦ"
 *
 *   1. 💰 MỖI LẦN TÌM ĐỀU TỐN TIỀN
 *      Câu hỏi phải được nhúng thành vector -> một lượt gọi Gemini.
 *      => KHÔNG dùng debounce tự động gọi như ô tìm cầu thủ. Người dùng phải
 *         chủ động bấm "Tìm" hoặc nhấn Enter. Gõ 20 ký tự mà tự gọi 20 lần
 *         thì hết quota trong vài phút.
 *
 *   2. 🐢 CHẬM HƠN NHIỀU (500-900ms so với ~30ms)
 *      Vì phải gọi API bên ngoài. => Bắt buộc có trạng thái "đang tìm" rõ ràng,
 *      nếu không người dùng tưởng app đơ và bấm liên tục.
 *
 *   3. 📚 CÓ THỂ KHÔNG CÓ DỮ LIỆU
 *      Kho tri thức chỉ có nội dung sau khi chạy `npm run crawl`. Kho trống
 *      thì phải nói thẳng ra, chứ không để người dùng tưởng app hỏng.
 *
 * ----------------------------------------------------------------------------
 * ♿ VỀ TIẾP CẬN: kết quả tìm kiếm được bọc trong vùng `aria-live` tương đương
 * (accessibilityLiveRegion) để trình đọc màn hình tự đọc lên khi có kết quả mới.
 * ============================================================================
 */

import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Card } from '@/components/common/Card';
import { searchApi } from '@/api/endpoints';

/** Vài câu hỏi mẫu — giúp người dùng hiểu ngay ô này dùng để làm gì */
const SUGGESTIONS = [
  'Đội tuyển Việt Nam vô địch giải nào?',
  'Liên đoàn bóng đá Việt Nam làm những gì?',
  'lich thi dau doi tuyen quoc gia',
];

export function KnowledgeSearch() {
  const t = useTheme();

  /** Chữ đang gõ trong ô nhập */
  const [draft, setDraft] = useState('');

  /**
   * Câu hỏi ĐÃ GỬI ĐI. Tách riêng khỏi `draft` là điểm mấu chốt:
   * React Query chỉ chạy khi `submitted` đổi, nên gõ phím không hề gọi API.
   * Đây chính là cách chặn việc đốt quota nói ở đầu file.
   */
  const [submitted, setSubmitted] = useState('');

  // Sức khoẻ kho tri thức — để biết có dữ liệu hay chưa
  const statsQuery = useQuery({
    queryKey: ['search', 'stats'],
    queryFn: searchApi.stats,
    staleTime: 5 * 60 * 1000,
  });

  const searchQuery = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => searchApi.query(submitted, 5),
    // enabled: chỉ chạy khi đã thật sự có câu hỏi được gửi
    enabled: submitted.trim().length >= 2,
    // Kết quả tìm kiếm gần như không đổi -> giữ cache 10 phút, hỏi lại
    // cùng câu là trả lời tức thì, không tốn thêm lượt gọi nào
    staleTime: 10 * 60 * 1000,
  });

  const submit = (text: string) => {
    const q = text.trim();
    if (q.length < 2) return;
    setDraft(q);
    setSubmitted(q);
  };

  const hits = searchQuery.data?.hits ?? [];

  /**
   * ⚠️ CHỈ coi là "kho trống" khi ĐÃ BIẾT CHẮC, tức là truy vấn stats đã xong.
   *
   * Viết `(statsQuery.data?.chunks ?? 0) === 0` không thôi sẽ cho ra `true`
   * ngay trong lúc đang tải — khiến các gợi ý câu hỏi biến mất rồi lại hiện ra
   * sau vài trăm mili-giây. Cú nhấp nháy đó nhìn như lỗi.
   *
   * Đây là cái bẫy kinh điển của toán tử `??` với giá trị 0: "chưa biết" và
   * "biết chắc là 0" bị trộn làm một. Luôn tách hai trạng thái đó ra.
   */
  const isEmpty = statsQuery.isSuccess && statsQuery.data.chunks === 0;

  return (
    <View style={{ gap: t.spacing.md }}>
      {/* ---------------- Ô NHẬP ---------------- */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          backgroundColor: t.colors.surfaceSunken,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.border,
          paddingLeft: t.spacing.md,
          paddingRight: 4,
          height: 46,
        }}
      >
        <Ionicons name="sparkles-outline" size={17} color={t.colors.bambooText} />

        <TextInput
          value={draft}
          onChangeText={setDraft}
          // onSubmitEditing = người dùng nhấn phím "Tìm" trên bàn phím ảo.
          // Đây là cách gửi tự nhiên nhất trên di động, đừng bắt họ phải
          // đóng bàn phím rồi mới bấm được nút.
          onSubmitEditing={() => submit(draft)}
          returnKeyType="search"
          placeholder="Hỏi về đội tuyển Việt Nam..."
          placeholderTextColor={t.colors.textFaint}
          accessibilityLabel="Ô hỏi đáp kho tri thức"
          style={{
            flex: 1,
            color: t.colors.text,
            fontSize: t.fontSize.base,
            paddingVertical: 0, // bỏ padding mặc định của Android
          }}
        />

        {/* Nút xoá — chỉ hiện khi có chữ, tránh làm rối ô nhập lúc trống */}
        {draft.length > 0 && (
          <Pressable
            onPress={() => {
              setDraft('');
              setSubmitted('');
            }}
            hitSlop={8}
            accessibilityLabel="Xoá câu hỏi"
          >
            <Ionicons name="close-circle" size={18} color={t.colors.textFaint} />
          </Pressable>
        )}

        <Pressable
          onPress={() => submit(draft)}
          disabled={draft.trim().length < 2 || searchQuery.isFetching}
          accessibilityLabel="Tìm trong kho tri thức"
          style={{
            backgroundColor:
              draft.trim().length < 2 ? t.colors.surfaceRaised : t.colors.accent,
            borderRadius: t.radius.sm,
            width: 38,
            height: 38,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {searchQuery.isFetching ? (
            <ActivityIndicator size="small" color={t.colors.accentFg} />
          ) : (
            <Ionicons
              name="search"
              size={17}
              color={draft.trim().length < 2 ? t.colors.textFaint : t.colors.accentFg}
            />
          )}
        </Pressable>
      </View>

      {/* ---------------- KHO TRỐNG ---------------- */}
      {isEmpty && (
        <Card>
          <View style={{ flexDirection: 'row', gap: t.spacing.sm, alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={17} color={t.colors.gold} />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="label">Kho tri thức đang trống</AppText>
              <AppText variant="caption" tone="muted">
                Chạy lệnh sau ở máy chủ để nạp dữ liệu:{'\n'}
                <AppText variant="caption" style={{ color: t.colors.bambooText }}>
                  npm run crawl -- https://vff.org.vn/
                </AppText>
              </AppText>
            </View>
          </View>
        </Card>
      )}

      {/* ---------------- GỢI Ý CÂU HỎI ---------------- */}
      {/*
        Chỉ hiện khi CHƯA hỏi gì. Sau khi có kết quả thì ẩn đi — giữ lại chỉ
        làm màn hình rối và đẩy kết quả thật xuống dưới tầm nhìn.
      */}
      {!submitted && !isEmpty && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => submit(s)}
              style={{
                backgroundColor: t.colors.bambooSoft,
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.pill, // 'pill' là token dành riêng cho chip/badge, 'full' dành cho avatar tròn
                paddingVertical: 7,
                paddingHorizontal: t.spacing.md,
              }}
            >
              <AppText variant="caption" style={{ color: t.colors.bambooText }}>
                {s}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      {/* ---------------- KẾT QUẢ ---------------- */}
      {/*
        accessibilityLiveRegion="polite": khi vùng này đổi nội dung, trình đọc
        màn hình tự đọc lên mà không cắt ngang thứ đang đọc dở. Thiếu nó,
        người khiếm thị bấm "Tìm" xong sẽ không biết là đã có kết quả hay chưa.
      */}
      <View accessibilityLiveRegion="polite" style={{ gap: t.spacing.sm }}>
        {searchQuery.isError && (
          <Card>
            <AppText variant="caption" style={{ color: t.colors.accentText }}>
              Không tìm được lúc này.{' '}
              {searchQuery.error instanceof Error ? searchQuery.error.message : ''}
            </AppText>
          </Card>
        )}

        {/*
          ⚠️ "submitted !== ''" CHỨ KHÔNG PHẢI "submitted &&".

          🐛 LỖI ĐÃ GẶP THẬT khi chạy app trên trình duyệt: submitted mặc định là
          chuỗi RỖNG. Viết "{submitted && <Card/>}" thì biểu thức trả về chính
          chuỗi '' — và React render '' ra như một nút chữ nằm trần trong <View>.
          Trên web hiện thông báo đỏ "Unexpected text node: . A text node cannot
          be a child of a <View>", trên điện thoại có thể làm app văng lỗi.

          Quy tắc: vế trái của && trong JSX phải là BOOLEAN thật. Với chuỗi và
          số (số 0 cũng bị render ra y hệt!) hãy so sánh tường minh.
        */}
        {submitted !== '' && !searchQuery.isFetching && !searchQuery.isError && hits.length === 0 && (
          <Card>
            <AppText variant="caption" tone="muted">
              Chưa tìm thấy nội dung liên quan tới “{submitted}”. Thử hỏi cách khác, hoặc
              cào thêm dữ liệu về kho tri thức.
            </AppText>
          </Card>
        )}

        {hits.map((hit, i) => (
          <Card key={hit.chunk_id}>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                {/* Số thứ tự — giúp người dùng đối chiếu khi có nhiều kết quả */}
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: t.colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText
                    tabular
                    style={{
                      fontSize: t.fontSize.xs,
                      fontWeight: t.fontWeight.bold,
                      color: t.colors.accentText,
                    }}
                  >
                    {i + 1}
                  </AppText>
                </View>

                <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>
                  {hit.title}
                </AppText>
              </View>

              {/*
                Cắt còn 4 dòng. Đoạn văn bản gốc dài 1400 ký tự — hiện hết thì
                mỗi kết quả chiếm trọn màn hình và người dùng không so sánh
                được các kết quả với nhau.
              */}
              <AppText variant="caption" tone="muted" numberOfLines={4}>
                {hit.content}
              </AppText>

              {/* Ba ngôi thay cho &&: source_url có thể là '' -> && sẽ render chuỗi rỗng trần trong View */}
              {hit.source_url ? (
                <Pressable
                  onPress={() => void Linking.openURL(hit.source_url!)}
                  accessibilityLabel={'Mở nguồn: ' + hit.title}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name="open-outline" size={12} color={t.colors.bambooText} />
                  <AppText
                    variant="caption"
                    numberOfLines={1}
                    style={{ color: t.colors.bambooText, flex: 1 }}
                  >
                    {/* Chỉ hiện tên miền — URL đầy đủ dài loằng ngoằng, vô dụng với người đọc */}
                    Xem nguồn · {safeHost(hit.source_url)}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}

/**
 * Lấy tên miền từ URL, an toàn với chuỗi hỏng.
 *
 * `new URL()` NÉM LỖI khi chuỗi không hợp lệ. Dữ liệu này đến từ crawler nên
 * về lý thuyết luôn đúng — nhưng một URL hỏng làm sập cả màn hình thì không
 * đáng. Bọc try/catch, hỏng thì trả lại nguyên chuỗi.
 */
function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
