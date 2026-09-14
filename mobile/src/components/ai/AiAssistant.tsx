/**
 * ============================================================================
 * COMPONENTS/AI/AIASSISTANT.TSX — TRỢ LÝ AI "HỎI ĐÁP ĐỘI TUYỂN"
 * ============================================================================
 *
 * Đây là KHUNG ② của tab Thống kê (đặc tả mục 5.7). Người dùng gõ câu hỏi
 * bằng tiếng Việt bình thường, trợ lý tự tra cơ sở dữ liệu rồi trả lời.
 *
 * ----------------------------------------------------------------------------
 * 🧠 TRƯỚC KHI ĐỌC CODE: CHUYỆN GÌ XẢY RA KHI BẤM "GỬI"?
 *
 * Một câu hỏi đi qua SÁU chặng. Hiểu chuỗi này rồi thì mọi dòng code bên dưới
 * đều có lý do rõ ràng:
 *
 *   ① App gửi POST /chat { message, conversationId? }
 *
 *   ② Backend chặn câu cá cược NGAY, không gọi model
 *      -> xem isBettingQuestion() trong backend/src/services/chat/chat.service.ts
 *      -> trả lời tức thì, toolsUsed = [], rounds = 0, KHÔNG tốn một xu nào
 *
 *   ③ Backend nạp 8 lượt hội thoại gần nhất làm ngữ cảnh
 *      -> nhờ vậy hỏi "còn cậu ấy ghi mấy bàn?" thì trợ lý biết "cậu ấy" là ai
 *
 *   ④ Gemini đọc câu hỏi và TỰ QUYẾT ĐỊNH cần công cụ nào
 *      -> ví dụ "ai hay nhất trận vừa rồi?" -> gọi get_player_ratings
 *      -> backend chạy công cụ (một câu SQL đã viết sẵn) và đưa kết quả lại
 *
 *   ⑤ Gemini đọc kết quả rồi viết câu trả lời tiếng Việt
 *      -> lặp lại ④⑤ tối đa vài vòng nếu cần nhiều dữ liệu
 *
 *   ⑥ Backend lưu cả câu hỏi lẫn câu trả lời vào bảng ai_messages rồi trả về
 *      { conversationId, answer, toolsUsed, rounds }
 *
 * 👉 HỆ QUẢ CHO GIAO DIỆN — ba điều bắt buộc, không được bỏ:
 *
 *   1. ⏱️ CHẬM: 2–6 giây, chứ không phải 200ms như các API khác trong app.
 *      Phải có trạng thái "đang suy nghĩ" thật rõ, nếu không người dùng tưởng
 *      app treo và bấm gửi liên tục — mỗi lần bấm là một lần tốn tiền thật.
 *
 *   2. 💰 TỐN TIỀN: mỗi câu hỏi tiêu 1–3 lượt gọi model. Nên ở đây KHÔNG có
 *      gợi ý tự động, KHÔNG debounce, KHÔNG gọi lại khi component render lại.
 *      Chỉ gõ xong và chủ động bấm gửi mới tốn tiền.
 *
 *   3. 🔐 CẦN ĐĂNG NHẬP: lịch sử hội thoại là dữ liệu cá nhân, và hạn mức phải
 *      tính theo tài khoản. Khách phải thấy lời mời đăng nhập TRƯỚC KHI gõ,
 *      chứ không phải gõ xong cả câu rồi mới bị chặn.
 *
 * ----------------------------------------------------------------------------
 * 🗂️ VÌ SAO LỊCH SỬ NẰM TRONG useState CHỨ KHÔNG PHẢI REACT QUERY?
 *
 * React Query giỏi ở việc ĐỒNG BỘ dữ liệu từ server: nó tự tải lại, tự coi dữ
 * liệu là cũ sau một khoảng thời gian, tự gọi lại khi app quay lại foreground.
 *
 * Với hội thoại, tất cả những hành vi đó đều SAI:
 *   • "Tải lại" một cuộc hội thoại = gọi model lần nữa = mất tiền lần nữa
 *   • Dữ liệu hội thoại không bao giờ "cũ" — nó là thứ ta vừa tự tạo ra
 *   • Nguồn sự thật là chuỗi tin nhắn đang hiện, không phải một endpoint
 *
 * 👉 Nên: useMutation để GỬI (một hành động, chạy đúng khi được gọi), và
 *    useState để GIỮ danh sách tin nhắn. Đây đúng là ranh giới giữa hai công
 *    cụ: query = đọc dữ liệu có sẵn, mutation = gây ra một thay đổi.
 *
 * ----------------------------------------------------------------------------
 * ♿ TIẾP CẬN
 *   • Vùng tin nhắn là accessibilityLiveRegion="polite" -> trình đọc màn hình
 *     tự đọc câu trả lời mới mà không cần người dùng đi tìm.
 *   • Nút "Đọc to" dùng expo-speech, giọng vi-VN. Ở senior mode nút này LUÔN
 *     hiện (đặc tả 5.7) vì mắt kém đọc đoạn dài rất mệt.
 *   • Mọi nút đều cao ít nhất t.touchTarget (44pt, senior mode 56pt).
 * ============================================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { useAuthStore } from '@/store/authStore';
import { chatApi } from '@/api/endpoints';
import type { ChatAnswer } from '@/types';

// ===========================================================================
// HẰNG SỐ
// ===========================================================================

/**
 * Câu hỏi gợi ý — lấy gần đúng từ đặc tả mục 5.7.
 *
 * Đây KHÔNG phải trang trí. Ba lý do thật sự:
 *
 *   1. Ô nhập trống không nói cho ai biết trợ lý này làm được gì. Người dùng
 *      hoặc hỏi lung tung rồi thất vọng, hoặc bỏ đi luôn.
 *   2. Mỗi gợi ý ngầm dạy một NHÓM năng lực khác nhau: điểm cầu thủ, lịch thi
 *      đấu, thành tích, thứ hạng. Đọc bốn dòng là hiểu phạm vi.
 *   3. Bấm một gợi ý gửi luôn, không phải gõ — trên điện thoại, gõ tiếng Việt
 *      có dấu là rào cản thật sự.
 *
 * ⚠️ Đừng đặt gợi ý mà trợ lý KHÔNG trả lời được. Câu gợi ý hỏng là cách nhanh
 * nhất để người dùng kết luận "AI này dở" ngay ở lần chạm đầu tiên.
 */
const SUGGESTIONS = [
  'Ai chơi hay nhất trận vừa rồi?',
  'Bao giờ đội tuyển đá tiếp?',
  'Việt Nam đứng thứ mấy bảng?',
  'Đội tuyển Việt Nam vô địch mấy lần?',
];

/**
 * Tên công cụ -> câu tiếng Việt hiện cho người dùng.
 *
 * ⭐ VÌ SAO PHẢI DỊCH? Vì minh bạch mà viết bằng tiếng máy thì không phải là
 * minh bạch. Dòng "get_player_ratings" chẳng nói gì với người hâm mộ; dòng
 * "đã tra bảng điểm cầu thủ" thì nói rõ câu trả lời dựa trên cái gì —
 * người đọc tự đánh giá được mức đáng tin (đặc tả mục 10.6).
 *
 * Công cụ nào chưa có trong bảng này thì phần hiển thị tự bỏ qua, chứ không
 * hiện tên thô ra màn hình.
 */
const TOOL_LABELS: Record<string, string> = {
  get_live_matches: 'trận đang diễn ra',
  get_fixtures: 'lịch thi đấu',
  get_recent_matches: 'kết quả gần đây',
  search_player: 'hồ sơ cầu thủ',
  get_player_ratings: 'bảng điểm cầu thủ',
  get_fifa_ranking: 'bảng xếp hạng FIFA',
  get_team_achievements: 'thành tích đội tuyển',
  get_head_to_head: 'lịch sử đối đầu',
  search_knowledge: 'kho tri thức',
  get_competition_standings: 'bảng xếp hạng bảng đấu',
  get_current_squad: 'danh sách triệu tập',
  get_player_leaderboard: 'bảng xếp hạng cầu thủ',
};

/** Giới hạn ký tự — khớp ĐÚNG với chatBodySchema ở backend (mục 10.6) */
const MAX_LENGTH = 1000;

// ===========================================================================
// KIỂU DỮ LIỆU NỘI BỘ
// ===========================================================================

/**
 * Một dòng trong khung chat.
 *
 * ⚠️ KHÁC với `ChatMessage` trong types/index.ts. `ChatMessage` là thứ backend
 * đã LƯU vào cơ sở dữ liệu; `Bubble` là thứ đang HIỆN trên màn hình — nó còn
 * mang cả trạng thái chỉ tồn tại ở phía app:
 *
 *   • `pending`  : câu hỏi đã hiện lên nhưng trợ lý chưa trả lời xong
 *   • `failed`   : gọi API hỏng, cần cho phép thử lại
 *   • `toolsUsed`: dùng để hiện dòng "đã tra: …"
 *
 * Trộn hai khái niệm này làm một là cái bẫy kinh điển: dữ liệu server và trạng
 * thái giao diện có vòng đời khác nhau, ghép chung sẽ kẹt ngay ở lần đầu gặp
 * lỗi mạng.
 */
interface Bubble {
  /** Khoá cho React — dùng số tăng dần, KHÔNG dùng index mảng (xem ghi chú ở render) */
  id: number;
  role: 'user' | 'assistant';
  text: string;
  toolsUsed?: string[];
  /** true = câu trả lời hỏng, hiện nút "thử lại" */
  failed?: boolean;
}

// ===========================================================================
// HÀM THUẦN — tách ra ngoài component để test được và không tạo lại mỗi render
// ===========================================================================

/**
 * Bỏ dấu Markdown trước khi đưa cho bộ đọc giọng nói.
 *
 * Gemini hay viết **Tiến Linh** để nhấn mạnh. Trên màn hình ta chấp nhận được,
 * nhưng đưa nguyên văn cho expo-speech thì máy đọc thành "sao sao Tiến Linh
 * sao sao" — nghe rất kỳ.
 *
 * Chỉ xử lý `**đậm**` và `*nghiêng*` vì đó là tất cả những gì mô hình thực tế
 * sinh ra ở đây. Kéo cả một thư viện Markdown về chỉ để làm việc này là thừa.
 */
export function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
}

/**
 * Dựng câu "đã tra: …" từ danh sách công cụ.
 *
 * Trả về chuỗi rỗng khi không có công cụ nào dịch được — phía render dựa vào
 * đó để bỏ hẳn dòng chú thích, thay vì hiện một dòng "Đã tra:" cụt lủn.
 *
 * `new Set` để khử trùng lặp: trợ lý có thể gọi cùng một công cụ hai lần trong
 * hai vòng khác nhau, nhưng người đọc không cần biết chi tiết đó.
 */
export function describeTools(tools: string[] | undefined): string {
  if (!tools || tools.length === 0) return '';

  const labels = [...new Set(tools)]
    .map((name) => TOOL_LABELS[name])
    .filter((label): label is string => Boolean(label));

  return labels.length === 0 ? '' : `Đã tra: ${labels.join(' · ')}`;
}

// ===========================================================================
// COMPONENT CHÍNH
// ===========================================================================

interface AiAssistantProps {
  /**
   * Chiều cao cố định của khung.
   *
   * ⚠️ BẮT BUỘC phải truyền khi component nằm trong khung kéo ngang.
   *
   * Lý do: khung ② nằm trong một ScrollView NGANG. Bên trong nó lại có một
   * ScrollView DỌC (danh sách tin nhắn). ScrollView lồng nhau mà không ai có
   * chiều cao xác định thì React Native để danh sách tin nhắn cao vô hạn —
   * ô nhập liệu bị đẩy ra khỏi màn hình và không ai gõ được gì.
   */
  height?: number;
}

export function AiAssistant({ height }: AiAssistantProps) {
  const t = useTheme();
  const router = useRouter();

  /**
   * ⚠️ CHỌN TỪNG TRƯỜNG MỘT, không viết `const { isAuthenticated } = useAuthStore()`.
   *
   * Zustand so sánh giá trị trả về để quyết định có render lại không. Lấy cả
   * object thì MỌI thay đổi trong store đều làm component này render lại — kể
   * cả những thay đổi chẳng liên quan gì (ví dụ isSubmitting lúc đăng nhập).
   * Với khung chat đang có mấy chục bong bóng thì đó là lãng phí thấy rõ.
   */
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // -------------------------------------------------------------------------
  // TRẠNG THÁI
  // -------------------------------------------------------------------------

  /** Chữ đang gõ trong ô nhập */
  const [draft, setDraft] = useState('');

  /** Toàn bộ bong bóng đang hiện, theo thứ tự thời gian */
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  /**
   * Id cuộc hội thoại hiện tại.
   *
   * ⭐ ĐÂY LÀ BỘ NHỚ CỦA TRỢ LÝ. Lượt đầu để `undefined` -> backend tạo cuộc
   * mới và trả id về. Từ lượt sau ta gửi kèm id đó, nhờ vậy trợ lý đọc lại
   * được ngữ cảnh và hiểu "cậu ấy", "trận đó", "sao lại thế".
   *
   * 🐛 Quên gửi id là lỗi nhìn rất khó hiểu: trợ lý vẫn trả lời trơn tru, chỉ
   * là câu nào cũng như hỏi lần đầu. Không có thông báo lỗi nào cả.
   */
  const [conversationId, setConversationId] = useState<string | undefined>();

  /** Câu vừa bị lỗi — giữ lại để nút "Thử lại" gửi đúng câu đó */
  const [lastFailed, setLastFailed] = useState<string | null>(null);

  /** Id của bong bóng đang được đọc to (null = không đọc gì) */
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  /**
   * Bộ đếm sinh id cho bong bóng.
   *
   * Dùng useRef chứ không useState vì hai lý do:
   *   1. Tăng bộ đếm KHÔNG cần render lại — giá trị mới chỉ dùng ngay lúc đó
   *   2. useRef cho giá trị mới NGAY LẬP TỨC. Với useState, trong cùng một
   *      hàm xử lý ta vẫn đọc ra giá trị cũ -> hai bong bóng trùng id ->
   *      React cảnh báo "hai phần tử cùng key" và render sai.
   */
  const nextId = useRef(1);

  /** Tham chiếu tới danh sách tin nhắn, để tự cuộn xuống đáy */
  const scrollRef = useRef<ScrollView>(null);

  // -------------------------------------------------------------------------
  // GỬI CÂU HỎI
  // -------------------------------------------------------------------------

  /**
   * useMutation — KHÔNG PHẢI useQuery. Đây là khác biệt quan trọng:
   *
   *   useQuery  : "lấy dữ liệu này về cho tôi" -> React Query tự gọi, tự gọi
   *               lại, tự làm mới. Đọc dữ liệu thì tuyệt vời.
   *   useMutation: "khi nào tôi bảo thì hãy làm việc này" -> chỉ chạy đúng lúc
   *               gọi .mutate(), không bao giờ tự chạy.
   *
   * Dùng nhầm useQuery ở đây thì React Query sẽ tự gửi lại câu hỏi mỗi lần app
   * quay lại foreground hay mạng chập chờn — mỗi lần là một lần mất tiền và
   * một câu trả lời trùng lặp hiện ra giữa cuộc trò chuyện.
   */
  const mutation = useMutation({
    mutationFn: ({ text }: { text: string }) => chatApi.ask(text, conversationId),

    onSuccess: (data: ChatAnswer) => {
      /**
       * Ghi nhớ id cuộc hội thoại NGAY LẦN ĐẦU.
       *
       * Backend trả về cùng một id ở mọi lượt sau, nên gán lại cũng vô hại;
       * viết thẳng như thế này đơn giản hơn là đi kiểm tra "đã có chưa".
       */
      setConversationId(data.conversationId);
      setLastFailed(null);

      setBubbles((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: 'assistant',
          text: data.answer,
          toolsUsed: data.toolsUsed,
        },
      ]);
    },

    onError: (error: unknown) => {
      /**
       * ⭐ HIỆN THÔNG BÁO LỖI CỦA BACKEND NGUYÊN VĂN, ĐỪNG TỰ VIẾT LẠI.
       *
       * client.ts đã dịch sẵn lỗi mạng sang tiếng Việt dễ hiểu, và backend gửi
       * kèm những thông điệp mà chỉ nó mới biết:
       *
       *   • 429 -> "Hôm nay bạn đã hỏi đủ số lượt, mai hỏi tiếp nhé"
       *            (chỉ backend biết hạn mức còn bao nhiêu và reset lúc nào)
       *   • 503 -> "Trợ lý đang bận, thử lại sau ít phút"
       *
       * Thay hết bằng một câu "Có lỗi xảy ra" là vứt đi đúng phần thông tin
       * hữu ích nhất — người dùng không còn biết nên chờ hay nên thử lại.
       */
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Không gửi được câu hỏi. Kiểm tra kết nối mạng rồi thử lại nhé.';

      setBubbles((prev) => [
        ...prev,
        { id: nextId.current++, role: 'assistant', text: message, failed: true },
      ]);
    },
  });

  /**
   * Gửi một câu hỏi: đẩy bong bóng người dùng lên trước, rồi mới gọi API.
   *
   * ⭐ VÌ SAO HIỆN CÂU HỎI TRƯỚC KHI CÓ TRẢ LỜI? Vì phản hồi tức thì. Trợ lý
   * mất 2–6 giây mới trả lời; nếu câu hỏi chỉ hiện ra SAU khi có kết quả thì
   * suốt mấy giây đó màn hình y như lúc chưa bấm — người dùng tưởng hụt nút
   * và bấm thêm lần nữa.
   *
   * useCallback ở đây có lý do thật (không phải tối ưu vu vơ): hàm này được
   * truyền cho nhiều nút gợi ý, và được dùng trong useEffect bên dưới.
   */
  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();

      /**
       * BA LỚP CHẶN TRƯỚC KHI TỐN TIỀN — kiểm ở app, backend kiểm lại lần nữa.
       * Kiểm hai nơi không phải là thừa: app chặn để đỡ tốn một vòng mạng,
       * backend chặn vì không bao giờ được tin dữ liệu gửi lên từ máy khách.
       */
      if (text.length < 2) return;                 // quá ngắn, chắc chắn vô nghĩa
      if (text.length > MAX_LENGTH) return;        // quá dài, backend sẽ từ chối
      if (mutation.isPending) return;              // ⭐ đang chờ trả lời -> chặn
                                                   //    bấm liên tục (chống đốt quota)

      setBubbles((prev) => [...prev, { id: nextId.current++, role: 'user', text }]);
      setDraft('');
      setLastFailed(text);
      mutation.mutate({ text });
    },
    [mutation]
  );

  // -------------------------------------------------------------------------
  // TỰ CUỘN XUỐNG ĐÁY KHI CÓ TIN NHẮN MỚI
  // -------------------------------------------------------------------------
  useEffect(() => {
    /**
     * requestAnimationFrame: chờ React vẽ xong bong bóng mới rồi mới cuộn.
     *
     * Cuộn ngay trong effect thì ScrollView vẫn đang dùng chiều cao CŨ (chưa
     * tính bong bóng vừa thêm), nên nó cuộn tới đáy cũ — tức là dừng lại ngay
     * phía trên tin nhắn mới. Nhìn như bị kẹt.
     */
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [bubbles.length, mutation.isPending]);

  // -------------------------------------------------------------------------
  // DỌN DẸP: TẮT GIỌNG ĐỌC KHI RỜI KHỎI MÀN HÌNH
  // -------------------------------------------------------------------------
  useEffect(() => {
    /**
     * 🐛 KHÔNG CÓ DÒNG NÀY LÀ CÓ LỖI THẬT: người dùng bấm "Đọc to" rồi chuyển
     * sang tab khác — giọng đọc vẫn tiếp tục vang lên từ một màn hình không
     * còn tồn tại, và không có nút nào để tắt.
     *
     * Quy tắc chung: thứ gì component BẬT LÊN mà sống ngoài React (âm thanh,
     * bộ đếm giờ, kết nối socket) thì component đó phải TỰ TẮT khi bị gỡ bỏ.
     */
    return () => {
      void Speech.stop();
    };
  }, []);

  /**
   * Bật/tắt đọc to một câu trả lời.
   *
   * Bấm lần nữa vào chính câu đang đọc = dừng. Đây là hành vi người dùng mong
   * đợi ở mọi nút phát: nút phát mà không tắt được là một cái bẫy.
   */
  const toggleSpeak = (bubble: Bubble) => {
    if (speakingId === bubble.id) {
      void Speech.stop();
      setSpeakingId(null);
      return;
    }

    void Speech.stop(); // dừng câu đang đọc dở trước khi đọc câu mới
    setSpeakingId(bubble.id);

    Speech.speak(stripMarkdown(bubble.text), {
      language: 'vi-VN',
      /**
       * Chậm hơn mặc định một chút. Tên riêng tiếng Việt ("Nguyễn Xuân Son",
       * "Nguyễn Filip") đọc ở tốc độ 1.0 rất khó nghe, nhất là với người lớn
       * tuổi — vốn là nhóm dùng nút này nhiều nhất.
       */
      rate: t.isSenior ? 0.85 : 0.95,
      // Dọn trạng thái ở CẢ BA lối thoát, nếu không nút sẽ kẹt ở hình "dừng"
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  /** Bắt đầu lại từ đầu — bỏ luôn ngữ cảnh cũ để trợ lý không hiểu nhầm */
  const resetConversation = () => {
    void Speech.stop();
    setSpeakingId(null);
    setBubbles([]);
    setConversationId(undefined);
    setLastFailed(null);
    setDraft('');
  };

  // =========================================================================
  // GIAO DIỆN: KHÁCH CHƯA ĐĂNG NHẬP
  // =========================================================================
  /**
   * ⭐ CHẶN Ở ĐÂY, TRƯỚC KHI NGƯỜI DÙNG GÕ MỘT CHỮ NÀO.
   *
   * Cách làm sai mà rất hay gặp: cho gõ thoải mái, bấm gửi mới báo 401. Người
   * dùng vừa gõ xong một câu dài có dấu trên bàn phím điện thoại, và mất trắng.
   *
   * Màn hình này nói rõ BA điều: cần đăng nhập, ĐỂ LÀM GÌ, và trợ lý làm được
   * gì (danh sách gợi ý ngay bên dưới) — để người ta có lý do mà đăng nhập.
   */
  if (!isAuthenticated) {
    return (
      <View
        style={{
          height,
          justifyContent: 'center',
          alignItems: 'center',
          padding: t.spacing.xl,
          gap: t.spacing.md,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: t.colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="sparkles" size={26} color={t.colors.accentText} />
        </View>

        <AppText variant="h3" center>
          Hỏi đáp Đội tuyển
        </AppText>

        <AppText variant="body" tone="muted" center>
          Đăng nhập để hỏi trợ lý AI về trận đấu, điểm cầu thủ, lịch thi đấu và thành tích của đội
          tuyển. Lịch sử hội thoại được lưu riêng cho tài khoản của bạn.
        </AppText>

        <Pressable
          onPress={() => router.push('/login')}
          accessibilityRole="button"
          accessibilityLabel="Đăng nhập để dùng trợ lý AI"
          style={({ pressed }) => ({
            marginTop: t.spacing.sm,
            minHeight: t.touchTarget,
            justifyContent: 'center',
            paddingHorizontal: t.spacing.xl,
            borderRadius: t.radius.md,
            backgroundColor: t.colors.accent,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <AppText variant="label" style={{ color: t.static.white }}>
            Đăng nhập
          </AppText>
        </Pressable>

        {/* Cho khách xem trước trợ lý trả lời được những gì — lý do để đăng nhập */}
        <View style={{ marginTop: t.spacing.md, gap: 4, alignItems: 'center' }}>
          <AppText variant="overline" tone="faint">
            Trợ lý trả lời được
          </AppText>
          {SUGGESTIONS.map((s) => (
            <AppText key={s} variant="caption" tone="faint" center>
              “{s}”
            </AppText>
          ))}
        </View>
      </View>
    );
  }

  // =========================================================================
  // GIAO DIỆN CHÍNH
  // =========================================================================
  const isEmpty = bubbles.length === 0;

  return (
    /**
     * KeyboardAvoidingView — đẩy ô nhập lên khi bàn phím bật.
     *
     * Hai nền tảng xử lý bàn phím khác nhau về bản chất:
     *   • iOS     : bàn phím TRƯỢT ĐÈ lên giao diện -> phải tự chừa chỗ ('padding')
     *   • Android : hệ điều hành đã tự thu nhỏ cửa sổ -> thêm padding nữa là
     *               dư ra một mảng trống. Nên để undefined.
     *
     * Đây là lý do gần như mọi app React Native đều có đúng dòng ba ngôi này.
     */
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ height, flex: height === undefined ? 1 : undefined }}
    >
      {/* ---------------- THANH TIÊU ĐỀ ---------------- */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          paddingBottom: t.spacing.md,
        }}
      >
        <Ionicons name="sparkles" size={18} color={t.colors.goldText} />
        <AppText variant="h3" style={{ flex: 1 }}>
          Hỏi đáp Đội tuyển
        </AppText>

        {/* Nút "cuộc mới" chỉ xuất hiện khi đã có gì đó để xoá */}
        {!isEmpty && (
          <Pressable
            onPress={resetConversation}
            accessibilityRole="button"
            accessibilityLabel="Bắt đầu cuộc hội thoại mới"
            hitSlop={10}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="refresh" size={14} color={t.colors.textFaint} />
            <AppText variant="caption" tone="faint">
              Cuộc mới
            </AppText>
          </Pressable>
        )}
      </View>

      {/* ---------------- DANH SÁCH TIN NHẮN ---------------- */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: t.spacing.md, paddingBottom: t.spacing.md }}
        showsVerticalScrollIndicator={false}
        /**
         * ♿ Trình đọc màn hình tự đọc nội dung mới xuất hiện ở đây.
         * "polite" = đọc khi người dùng ngơi tay, không cắt ngang họ giữa chừng.
         */
        accessibilityLiveRegion="polite"
        /** Cho phép bấm nút gợi ý ngay lần chạm đầu khi bàn phím đang mở */
        keyboardShouldPersistTaps="handled"
      >
        {isEmpty ? (
          // ------- MÀN HÌNH TRỐNG: GIỚI THIỆU + GỢI Ý -------
          <View style={{ gap: t.spacing.md, paddingTop: t.spacing.sm }}>
            <AppText variant="body" tone="muted">
              Hỏi mình bất cứ điều gì về Đội tuyển Việt Nam. Mình sẽ tra dữ liệu thật trong app rồi
              mới trả lời, kèm cho bạn biết đã tra từ đâu.
            </AppText>

            <AppText variant="overline" tone="faint">
              Gợi ý
            </AppText>

            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => send(s)}
                accessibilityRole="button"
                accessibilityLabel={`Hỏi: ${s}`}
                style={({ pressed }) => ({
                  minHeight: t.touchTarget,
                  justifyContent: 'center',
                  paddingHorizontal: t.spacing.md,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent',
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color={t.colors.bambooText} />
                  <AppText variant="body" style={{ flex: 1 }}>
                    {s}
                  </AppText>
                </View>
              </Pressable>
            ))}

            {/* ⚖️ Nói trước giới hạn, đừng để người dùng tự phát hiện (mục 10.6) */}
            <AppText variant="caption" tone="faint" style={{ marginTop: t.spacing.sm }}>
              Trợ lý chỉ trả lời về bóng đá Việt Nam và không cung cấp thông tin cá cược. Dữ liệu
              lấy trực tiếp từ cơ sở dữ liệu của app.
            </AppText>
          </View>
        ) : (
          /**
           * ⚠️ key={b.id} CHỨ KHÔNG PHẢI key={index}.
           *
           * Ở đây danh sách chỉ thêm vào cuối nên dùng index tình cờ vẫn chạy —
           * nhưng đó là loại code "đúng vì may mắn". Ngay khi có thêm tính năng
           * xoá một tin nhắn hay chèn tin nhắn hệ thống, React sẽ dùng lại nhầm
           * component: nút "đang đọc" nhảy sang bong bóng khác, trạng thái lỗi
           * dính vào câu không liên quan. Dùng id ổn định thì miễn nhiễm.
           */
          bubbles.map((b) => <BubbleRow key={b.id} bubble={b} speakingId={speakingId} onSpeak={toggleSpeak} />)
        )}

        {/* ------- TRẠNG THÁI "ĐANG SUY NGHĨ" ------- */}
        {mutation.isPending && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.sm,
              alignSelf: 'flex-start',
              backgroundColor: t.colors.surface,
              borderRadius: t.radius.lg,
              borderWidth: 1,
              borderColor: t.colors.border,
              paddingHorizontal: t.spacing.md,
              paddingVertical: t.spacing.md,
            }}
          >
            <ActivityIndicator size="small" color={t.colors.bambooText} />
            {/*
              "đang tra dữ liệu" chứ không phải "đang tải".
              Câu này nói ĐÚNG việc đang diễn ra ở chặng ③④ đầu file, và nó giải
              thích luôn vì sao phải chờ lâu hơn các màn hình khác — người dùng
              biết là hệ thống đang làm việc thật, chứ không phải mạng chậm.
            */}
            <ThinkingText />
          </View>
        )}

        {/* ------- NÚT THỬ LẠI ------- */}
        {mutation.isError && lastFailed && !mutation.isPending && (
          <Pressable
            onPress={() => {
              /**
               * Gỡ bong bóng lỗi ra rồi mới gửi lại.
               *
               * Nếu để lại, cuộc trò chuyện sẽ đầy những dòng "Không gửi được…"
               * xen giữa các câu trả lời thật — vừa rối, vừa khiến người dùng
               * tưởng trợ lý đang trả lời lung tung.
               */
              setBubbles((prev) => {
                const withoutError = prev.filter((b) => !b.failed);
                /**
                 * Gỡ luôn bong bóng CÂU HỎI cũ ở cuối danh sách.
                 *
                 * 🐛 LỖI ĐÃ GẶP THẬT trên máy ảo Android: send() bên dưới tự thêm
                 * lại bong bóng câu hỏi, nên bản trước (chỉ gỡ bong bóng lỗi) làm
                 * câu "Bao giờ đội tuyển đá tiếp?" hiện HAI LẦN liền nhau — trông
                 * như người dùng gửi trùng, hoặc app bị lỗi nhân đôi tin nhắn.
                 */
                const last = withoutError[withoutError.length - 1];
                return last && last.role === 'user' && last.text === lastFailed
                  ? withoutError.slice(0, -1)
                  : withoutError;
              });
              send(lastFailed);
            }}
            accessibilityRole="button"
            accessibilityLabel="Thử gửi lại câu hỏi"
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: t.touchTarget,
              paddingHorizontal: t.spacing.md,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.colors.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="refresh" size={15} color={t.colors.accentText} />
            <AppText variant="label" tone="accent">
              Thử lại
            </AppText>
          </Pressable>
        )}
      </ScrollView>

      {/* ---------------- Ô NHẬP ---------------- */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: t.spacing.sm,
          paddingTop: t.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: t.colors.border,
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Nhập câu hỏi…"
          placeholderTextColor={t.colors.textFaint}
          /**
           * multiline: câu hỏi tiếng Việt có dấu thường dài hơn ta tưởng. Ô một
           * dòng khiến người dùng không đọc lại được câu mình vừa gõ.
           */
          multiline
          maxLength={MAX_LENGTH}
          /**
           * Gửi bằng phím Enter trên bàn phím ảo.
           *
           * ⚠️ submitBehavior="submit" — KHÔNG dùng blurOnSubmit={false}.
           *
           * 🐛 LỖI ĐÃ GẶP THẬT trên máy ảo Android: với ô nhập NHIỀU DÒNG, bấm
           * phím Gửi/Enter chỉ XUỐNG DÒNG, không gửi câu hỏi — onSubmitEditing
           * không bao giờ chạy. Người dùng gõ xong bấm Enter, thấy ô nhập cao
           * thêm một dòng, tưởng app đơ. (Trên web thì chạy, nên không phát hiện
           * được khi chỉ thử bằng trình duyệt.)
           *
           * "submit" = Enter thì GỬI và GIỮ bàn phím mở. Giữ bàn phím vì hội
           * thoại là chuỗi nhiều lượt: bắt bật lại bàn phím sau mỗi câu là thêm
           * một cú chạm thừa cho mỗi lượt hỏi. (blurOnSubmit đã bị React Native
           * thay bằng submitBehavior.)
           */
          onSubmitEditing={() => send(draft)}
          submitBehavior="submit"
          returnKeyType="send"
          accessibilityLabel="Ô nhập câu hỏi cho trợ lý AI"
          style={{
            flex: 1,
            minHeight: t.touchTarget,
            maxHeight: 120, // gõ 20 dòng cũng không được nuốt hết màn hình
            paddingHorizontal: t.spacing.md,
            paddingTop: 12,
            paddingBottom: 12,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.colors.border,
            backgroundColor: t.colors.surfaceSunken,
            color: t.colors.text,
            fontSize: t.fontSize.base,
          }}
        />

        {/* ------- NÚT GỬI ------- */}
        {(() => {
          /**
           * Tách điều kiện ra biến có tên, đừng nhồi vào JSX.
           *
           * `canSend` được dùng ở BA chỗ (màu nền, màu icon, cờ disabled). Viết
           * lặp ba lần thì chỉ cần sửa sót một chỗ là nút trông sáng như bấm
           * được nhưng bấm không ăn — kiểu lỗi khiến người dùng bấm hoài.
           */
          const canSend = draft.trim().length >= 2 && !mutation.isPending;

          return (
            <Pressable
              onPress={() => send(draft)}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Gửi câu hỏi"
              accessibilityState={{ disabled: !canSend }}
              style={({ pressed }) => ({
                width: t.touchTarget,
                height: t.touchTarget,
                borderRadius: t.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: canSend ? t.colors.accent : t.colors.surfaceSunken,
                opacity: pressed && canSend ? 0.85 : 1,
              })}
            >
              <Ionicons
                name="send"
                size={18}
                color={canSend ? t.static.white : t.colors.textFaint}
              />
            </Pressable>
          );
        })()}
      </View>
    </KeyboardAvoidingView>
  );
}

// ===========================================================================
// LỜI CHỜ ĐỔI THEO THỜI GIAN
// ===========================================================================

/**
 * Chữ hiện cạnh vòng xoay, đổi dần khi chờ lâu.
 *
 * ⭐ VÌ SAO KHÔNG ĐỂ MÃI MỘT CÂU "Đang tra dữ liệu…"?
 *
 * Sau khoảng 8 giây nhìn cùng một dòng chữ đứng im, người dùng bắt đầu nghĩ
 * app đã treo — và bấm thoát, hoặc gửi lại câu hỏi (tốn thêm tiền). Lời chờ
 * đổi theo thời gian là tín hiệu "vẫn đang làm việc", kèm luôn lý do vì sao
 * lâu. Đây là cách rẻ nhất để một thao tác 15 giây KHÔNG có cảm giác hỏng.
 *
 * Component riêng, tự chạy đồng hồ: bộ đếm giây chỉ làm render lại dòng chữ
 * này, KHÔNG làm render lại cả danh sách tin nhắn mỗi giây.
 */
function ThinkingText() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    // Có câu trả lời -> component bị gỡ -> BẮT BUỘC dừng đồng hồ, không thì chạy ngầm mãi
    return () => clearInterval(timer);
  }, []);

  const text =
    seconds < 4
      ? 'Đang tra dữ liệu…'
      : seconds < 10
        ? 'Đang tổng hợp câu trả lời…'
        : seconds < 20
          ? 'Câu này cần tra nhiều nguồn, chờ mình chút nhé…'
          : `Máy chủ AI đang chậm, mình vẫn đang chờ (${seconds} giây)…`;

  return (
    <AppText variant="body" tone="muted" accessibilityLiveRegion="polite">
      {text}
    </AppText>
  );
}

// ===========================================================================
// MỘT BONG BÓNG TIN NHẮN
// ===========================================================================

/**
 * Tách thành component riêng vì hai lý do:
 *   1. Hàm AiAssistant đã đủ dài; nhồi thêm 100 dòng render bong bóng vào giữa
 *      thì không ai còn đọc ra luồng chính nữa.
 *   2. Mỗi bong bóng có logic riêng (căn trái/phải, nút đọc to, dòng "đã tra"),
 *      để riêng thì sửa một thứ không sợ đụng thứ khác.
 */
function BubbleRow({
  bubble,
  speakingId,
  onSpeak,
}: {
  bubble: Bubble;
  speakingId: number | null;
  onSpeak: (b: Bubble) => void;
}) {
  const t = useTheme();

  const isUser = bubble.role === 'user';
  const isSpeaking = speakingId === bubble.id;
  const toolsLine = describeTools(bubble.toolsUsed);

  /**
   * ⭐ NÚT "ĐỌC TO" HIỆN KHI NÀO?
   *
   *   • Senior mode : LUÔN hiện (đặc tả 5.7) — người lớn tuổi đọc đoạn dài rất
   *                   mệt, và họ không đi tìm nút ẩn.
   *   • Bình thường : chỉ hiện với câu trả lời dài hơn 120 ký tự. Gắn nút loa
   *                   vào một câu một dòng là bày biện thừa.
   *
   * Không bao giờ hiện ở bong bóng người dùng (họ tự viết ra, đọc lại làm gì)
   * và ở bong bóng lỗi.
   */
  const showSpeak = !isUser && !bubble.failed && (t.isSenior || bubble.text.length > 120);

  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', gap: 4 }}>
      <View
        style={{
          /**
           * 88% chứ không phải 100%: chừa lại một dải hở ở phía đối diện.
           * Chính dải hở đó là thứ cho mắt biết ngay ai đang nói, mà không cần
           * đọc chữ. Bong bóng chạm hai mép thì cuộc trò chuyện trông như một
           * khối văn bản liền.
           */
          maxWidth: '88%',
          backgroundColor: isUser
            ? t.colors.accent
            : bubble.failed
              ? t.colors.accentSoft
              : t.colors.surface,
          borderRadius: t.radius.lg,
          borderWidth: isUser ? 0 : 1,
          borderColor: t.colors.border,
          paddingHorizontal: t.spacing.md,
          paddingVertical: t.spacing.md,
        }}
      >
        <AppText
          variant="body"
          /**
           * ⚠️ Bong bóng người dùng có nền ĐỎ ở CẢ chế độ sáng lẫn tối, nên màu
           * chữ phải lấy từ `static` (bảng màu cố định cho nền tối), không lấy
           * từ `colors.text` — ở chế độ sáng `colors.text` là màu gần đen, đặt
           * lên nền đỏ thì gần như không đọc nổi.
           */
          style={{ color: isUser ? t.static.white : t.colors.text }}
        >
          {stripMarkdown(bubble.text)}
        </AppText>
      </View>

      {/* ------- DÒNG "ĐÃ TRA: …" — MINH BẠCH VỀ NGUỒN ------- */}
      {toolsLine !== '' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="server-outline" size={11} color={t.colors.textFaint} />
          <AppText variant="caption" tone="faint">
            {toolsLine}
          </AppText>
        </View>
      )}

      {/* ------- NÚT ĐỌC TO ------- */}
      {showSpeak && (
        <Pressable
          onPress={() => onSpeak(bubble)}
          accessibilityRole="button"
          accessibilityLabel={isSpeaking ? 'Dừng đọc' : 'Đọc to câu trả lời'}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            minHeight: t.isSenior ? t.touchTarget : 30,
            paddingHorizontal: t.spacing.sm,
            borderRadius: t.radius.sm,
            borderWidth: 1,
            borderColor: t.colors.border,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons
            name={isSpeaking ? 'stop-circle-outline' : 'volume-high-outline'}
            size={14}
            color={t.colors.bambooText}
          />
          <AppText variant="caption" tone="muted">
            {isSpeaking ? 'Dừng' : 'Đọc to'}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}
