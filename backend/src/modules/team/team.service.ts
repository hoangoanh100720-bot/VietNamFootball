/**
 * ============================================================================
 * MODULES/TEAM/TEAM.SERVICE.TS — HỒ SƠ ĐỘI TUYỂN & TỦ DANH HIỆU
 * ============================================================================
 *
 * Cấp dữ liệu cho TAB 1 "GIỚI THIỆU & THÀNH TÍCH" (mục 5.1 ARCHITECTURE.md):
 *
 *   • Hồ sơ đội     — biệt danh, liên đoàn, sân nhà, đoạn giới thiệu
 *   • Tủ danh hiệu  — đếm số lần vô địch / á quân / thành tích châu lục
 *   • Dòng thời gian— danh sách thành tích xếp theo năm giảm dần
 *
 * ----------------------------------------------------------------------------
 * 🗄️ DỮ LIỆU ĐẾN TỪ ĐÂU?
 *   bảng `team_profiles` (1-1 với teams)  — migration 002, mục C1
 *   bảng `achievements`  (1-n với teams)  — migration 002, mục C2
 * Cả hai đã có dữ liệu mẫu sau khi chạy `npm run db:reset`.
 *
 * ----------------------------------------------------------------------------
 * ⚡ MỘT REQUEST, KHÔNG PHẢI BA
 *
 * Tab Giới thiệu cần ba khối dữ liệu. Có thể làm ba endpoint riêng, nhưng như
 * vậy app phải gọi ba lần và màn hình sẽ hiện ra lắp ghép từng mảnh.
 *
 * Ở đây gộp thành MỘT endpoint trả đủ cả ba. Đánh đổi: payload lớn hơn một
 * chút, nhưng màn hình hiện ra trọn vẹn trong một nhịp. Với một tab mà người
 * dùng mở rồi đọc từ trên xuống, đó là đánh đổi đúng.
 *
 * ⚠️ Nguyên tắc chung: gộp khi dữ liệu LUÔN được dùng CÙNG NHAU trên một màn
 * hình. Đừng gộp những thứ chỉ thỉnh thoảng mới cần tới nhau.
 */

import { query, queryOne } from '@/config/database';
import { AppError } from '@/utils/AppError';
import { env } from '@/config/env';
import { cacheGet, cacheSet } from '@/utils/cache';

// ---------------------------------------------------------------------------
// KIỂU DỮ LIỆU
// ---------------------------------------------------------------------------

/** Các mức thành tích, khớp đúng ràng buộc CHECK của cột achievements.result */
export type AchievementResult =
  | 'champion'
  | 'runner_up'
  | 'third_place'
  | 'semi_final'
  | 'quarter_final'
  | 'round_of_16'
  | 'group_stage'
  | 'qualified';

export interface Achievement {
  id: number;
  competition: string;
  edition_year: number;
  result: AchievementResult;
  title: string;
  description: string | null;
  host: string | null;
  image_url: string | null;
  /** true = hiện ở "Tủ danh hiệu" nổi bật trên đầu tab */
  is_highlight: boolean;
}

export interface TeamProfile {
  team_id: number;
  name: string;
  fifa_code: string | null;
  logo_url: string | null;
  nickname: string | null;
  federation: string | null;
  /** ['AFC', 'AFF'] — các liên đoàn mà đội là thành viên */
  confederations: string[];
  home_stadium: string | null;
  intro_text: string;
  cover_image_url: string | null;
  /** Thứ hạng FIFA CAO NHẤT từng đạt (số càng nhỏ càng giỏi) */
  best_fifa_rank: number | null;
  best_fifa_rank_date: string | null;
}

/** Bảng đếm cho "Tủ danh hiệu" — mỗi ô là một con số to trên giao diện */
export interface TrophyCabinet {
  champion: number;
  runner_up: number;
  third_place: number;
  /** Gộp mọi thành tích từ bán kết trở xuống ở đấu trường CHÂU LỤC */
  continental_best: number;
  total: number;
}

// ---------------------------------------------------------------------------
// XÁC ĐỊNH ĐỘI TUYỂN VIỆT NAM
// ---------------------------------------------------------------------------

/**
 * ⚠️ CÁI BẪY ĐÃ SẬP THẬT — ĐỌC KỸ ĐOẠN NÀY TRƯỚC KHI DÙNG env.VIETNAM_TEAM_ID
 *
 * Trong dự án có HAI con số cùng tên "id đội tuyển Việt Nam", và chúng KHÁC NHAU:
 *
 *   env.VIETNAM_TEAM_ID = 26   ← id bên NHÀ CUNG CẤP api-football
 *   teams.id            = 1    ← id trong DATABASE CỦA TA (do SERIAL tự sinh)
 *
 * 🐛 Bản đầu của file này dùng thẳng env.VIETNAM_TEAM_ID để truy vấn bảng
 * `teams`, và API trả về 404 "Không tìm thấy đội tuyển" — dù dữ liệu có đủ.
 * Lỗi kiểu này rất khó đoán vì cái tên biến nghe hoàn toàn hợp lý.
 *
 * 💡 CÁCH SỬA BỀN VỮNG: tra theo MÃ FIFA ('VIE') thay vì tin vào con số.
 * Mã FIFA là chuẩn quốc tế, không đổi, và không phụ thuộc vào việc ai đánh số.
 * Dù bạn xoá sạch database rồi seed lại (id tự sinh sẽ khác), code vẫn chạy đúng.
 *
 * 📌 env.VIETNAM_TEAM_ID vẫn giữ nguyên công dụng của nó: truyền cho
 * api-football khi gọi API bên ngoài (xem services/crawler.service.ts).
 */
const VIETNAM_FIFA_CODE = 'VIE';

/** Nhớ lại id sau lần tra đầu tiên — id của một đội không bao giờ đổi khi server đang chạy */
let cachedVietnamTeamId: number | null = null;

/**
 * Tra id nội bộ của đội tuyển Việt Nam theo mã FIFA.
 *
 * @param teamId Truyền vào để tra một đội CỤ THỂ (dùng khi mở rộng cho đội
 *               khác sau này). Bỏ trống thì mặc định là Việt Nam.
 */
async function resolveTeamId(teamId?: number): Promise<number> {
  if (teamId !== undefined) return teamId;
  if (cachedVietnamTeamId !== null) return cachedVietnamTeamId;

  const row = await queryOne<{ id: number }>('SELECT id FROM teams WHERE fifa_code = $1', [
    VIETNAM_FIFA_CODE,
  ]);

  if (!row) {
    throw AppError.notFound(
      'Chưa có đội tuyển Việt Nam trong database. Chạy: cd backend && npm run db:reset'
    );
  }

  cachedVietnamTeamId = row.id;
  return row.id;
}

// ---------------------------------------------------------------------------
// TRUY VẤN
// ---------------------------------------------------------------------------

/**
 * Đọc hồ sơ đội tuyển Việt Nam.
 *
 * 🔗 JOIN `teams` với `team_profiles`: bảng teams giữ tên và logo (thứ mọi
 * module đều cần), còn team_profiles giữ phần giới thiệu dài dòng chỉ tab này
 * dùng tới. Tách hai bảng để các truy vấn khác không phải kéo theo một đoạn
 * text dài vô ích.
 *
 * ⚠️ Dùng LEFT JOIN chứ không phải INNER JOIN: đội có thể chưa có hồ sơ giới
 * thiệu (ví dụ đội đối thủ mới thêm vào). INNER JOIN sẽ làm biến mất luôn cả
 * dòng team, khiến API trả 404 dù đội tồn tại.
 */
export async function getTeamProfile(teamId?: number): Promise<TeamProfile> {
  const id = await resolveTeamId(teamId);

  const row = await queryOne<TeamProfile & { confederations: unknown }>(
    `SELECT
       t.id            AS team_id,
       t.name,
       t.fifa_code,
       t.logo_url,
       p.nickname,
       p.federation,
       p.confederations,
       p.home_stadium,
       COALESCE(p.intro_text, '') AS intro_text,
       p.cover_image_url,
       p.best_fifa_rank,
       p.best_fifa_rank_date
     FROM teams t
     LEFT JOIN team_profiles p ON p.team_id = t.id
     WHERE t.id = $1`,
    [id]
  );

  if (!row) {
    throw AppError.notFound('Không tìm thấy đội tuyển');
  }

  /**
   * Cột `confederations` là JSONB. Tuỳ driver (PGlite hay pg) mà nó về dưới
   * dạng mảng đã parse hoặc chuỗi JSON thô. Chuẩn hoá một lần ở đây để phần
   * còn lại của hệ thống luôn nhận đúng một mảng chuỗi.
   */
  return { ...row, confederations: normalizeJsonArray(row.confederations) };
}

/**
 * Ép một giá trị JSONB về mảng chuỗi, dù nó đến dưới dạng nào.
 *
 * Ba dạng có thể gặp:
 *   ['AFC','AFF']     — driver đã parse sẵn
 *   '["AFC","AFF"]'   — chuỗi JSON thô
 *   null              — cột trống
 *
 * Bọc try/catch vì chuỗi hỏng sẽ làm JSON.parse ném lỗi và kéo sập cả API.
 * Mất một nhãn liên đoàn thì không sao; sập tab Giới thiệu thì có sao.
 */
function normalizeJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Đọc danh sách thành tích, mới nhất lên đầu.
 *
 * @param onlyHighlight true = chỉ lấy thành tích nổi bật (cho "Tủ danh hiệu")
 * @param limit         Số bản ghi tối đa. Dòng thời gian ở tab chỉ hiện 5 mục,
 *                      màn hình "Xem tất cả" mới lấy hết.
 */
export async function getAchievements(
  teamId?: number,
  onlyHighlight = false,
  limit = 50
): Promise<Achievement[]> {
  const id = await resolveTeamId(teamId);

  const { rows } = await query<Achievement>(
    `SELECT id, competition, edition_year, result, title, description, host, image_url, is_highlight
     FROM achievements
     WHERE team_id = $1
       ${onlyHighlight ? 'AND is_highlight = TRUE' : ''}
     ORDER BY edition_year DESC, id DESC
     LIMIT $2`,
    [id, limit]
  );
  return rows;
}

/**
 * ⭐ ĐẾM SỐ DANH HIỆU CHO "TỦ DANH HIỆU".
 *
 * 💡 VÌ SAO ĐẾM BẰNG SQL MÀ KHÔNG ĐẾM TRONG JAVASCRIPT?
 * Vì database làm việc này nhanh hơn nhiều và chỉ trả về 4 con số thay vì cả
 * danh sách. Với 6 bản ghi thì không khác gì, nhưng khi đội có 200 thành tích
 * thì khác biệt rất rõ — và thói quen đúng nên hình thành từ lúc dữ liệu còn nhỏ.
 *
 * `FILTER (WHERE ...)` là cú pháp riêng của PostgreSQL, gọn và dễ đọc hơn hẳn
 * so với `SUM(CASE WHEN ... THEN 1 ELSE 0 END)`.
 */
export async function getTrophyCabinet(teamId?: number): Promise<TrophyCabinet> {
  const id = await resolveTeamId(teamId);

  const row = await queryOne<{
    champion: string;
    runner_up: string;
    third_place: string;
    continental_best: string;
    total: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE result = 'champion')    AS champion,
       COUNT(*) FILTER (WHERE result = 'runner_up')   AS runner_up,
       COUNT(*) FILTER (WHERE result = 'third_place') AS third_place,
       -- "Thành tích châu lục" = lọt sâu ở Asian Cup / World Cup,
       -- nơi mà vào tới tứ kết đã là cột mốc lịch sử.
       COUNT(*) FILTER (
         WHERE result IN ('semi_final','quarter_final','round_of_16')
           AND competition NOT ILIKE '%AFF%'
           AND competition NOT ILIKE '%ASEAN%'
       ) AS continental_best,
       COUNT(*) AS total
     FROM achievements
     WHERE team_id = $1`,
    [id]
  );

  /**
   * ⚠️ COUNT() CỦA POSTGRES TRẢ VỀ CHUỖI, KHÔNG PHẢI SỐ.
   *
   * Lý do: COUNT trả kiểu BIGINT (64 bit), mà số nguyên của JavaScript chỉ an
   * toàn tới 53 bit. Driver chọn cách trả chuỗi để không âm thầm làm sai số.
   *
   * 🐛 Quên Number() ở đây thì `"3" + 1` ra `"31"` chứ không phải `4` — một
   * lỗi rất khó nhìn ra vì trên giao diện con số vẫn hiện bình thường.
   */
  return {
    champion: Number(row?.champion ?? 0),
    runner_up: Number(row?.runner_up ?? 0),
    third_place: Number(row?.third_place ?? 0),
    continental_best: Number(row?.continental_best ?? 0),
    total: Number(row?.total ?? 0),
  };
}

/**
 * ⭐ HÀM CHÍNH — gom cả ba khối dữ liệu cho Tab Giới thiệu.
 *
 * 🚀 `Promise.all` chạy ba truy vấn SONG SONG, không nối đuôi nhau.
 * Ba truy vấn mỗi cái 15ms: chạy tuần tự mất 45ms, chạy song song mất 15ms.
 * Chúng độc lập với nhau (không cái nào cần kết quả của cái kia) nên không có
 * lý do gì phải xếp hàng.
 *
 * 💾 Có cache 24 giờ: hồ sơ đội tuyển và tủ danh hiệu gần như không đổi —
 * một chức vô địch mới thì cả năm mới có một lần. Cache giúp tab này mở ra
 * tức thì kể cả khi mạng chậm.
 */
export async function getTeamOverview(teamId?: number) {
  const id = await resolveTeamId(teamId);
  const cacheKey = `team:overview:${id}`;

  const cached = await cacheGet<{
    profile: TeamProfile;
    trophies: TrophyCabinet;
    achievements: Achievement[];
  }>(cacheKey);
  if (cached) return cached;

  const [profile, trophies, achievements] = await Promise.all([
    getTeamProfile(id),
    getTrophyCabinet(id),
    getAchievements(id, false, 20),
  ]);

  const result = { profile, trophies, achievements };
  await cacheSet(cacheKey, result, env.CACHE_TTL_STATIC);

  return result;
}
