-- ===========================================================================
-- MIGRATION 002 — TÍNH NĂNG v2
-- Giới thiệu & thành tích · Thông số sau trận · Điểm cầu thủ · Theme sự kiện
-- Giao diện người lớn tuổi · Hồ sơ người dùng · Quên mật khẩu
-- ---------------------------------------------------------------------------
-- Tài liệu: ARCHITECTURE.md mục 9.2
-- Quy ước đặt tên giống 001_init.sql (bảng số nhiều, cột snake_case, _at là
-- TIMESTAMPTZ). Mọi câu lệnh đều IF NOT EXISTS để chạy lại nhiều lần vẫn an toàn.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- A. MỞ RỘNG CÁC BẢNG ĐÃ CÓ Ở 001
-- ---------------------------------------------------------------------------

-- A1. USERS — thêm các trường hồ sơ người dùng
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name        VARCHAR(40),
  ADD COLUMN IF NOT EXISTS birth_date          DATE,
  ADD COLUMN IF NOT EXISTS province            VARCHAR(80),
  ADD COLUMN IF NOT EXISTS favorite_player_id  INTEGER REFERENCES players(id) ON DELETE SET NULL,
  -- Khoá file ảnh trên object storage. Lưu riêng avatar_url để còn XOÁ được
  -- file cũ khi người dùng đổi ảnh (chỉ có URL thì không biết xoá cái gì).
  ADD COLUMN IF NOT EXISTS avatar_key          TEXT,
  -- Token cấp TRƯỚC mốc này bị từ chối -> đổi mật khẩu là đăng xuất mọi máy khác.
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;


-- A2. MATCHES — kênh phát sóng + trạng thái chốt điểm cầu thủ
ALTER TABLE matches
  -- ["VTV5","FPT Play"] — người Việt rất cần thông tin này
  ADD COLUMN IF NOT EXISTS tv_channels    JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Trận chung kết: theme "Đi bão" kéo dài 72 giờ thay vì 24 giờ
  ADD COLUMN IF NOT EXISTS is_final       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finished_at    TIMESTAMPTZ,
  -- none = chưa chấm · provisional = điểm tạm · final = đã chốt (mục 12.3)
  ADD COLUMN IF NOT EXISTS ratings_status VARCHAR(12) NOT NULL DEFAULT 'none'
        CHECK (ratings_status IN ('none','provisional','final'));


-- A3. MATCH_EVENTS — thêm "thẻ vàng thứ hai", người kiến tạo, người bị thay ra
-- CHECK tạo inline ở 001 được Postgres tự đặt tên <bảng>_<cột>_check.
ALTER TABLE match_events DROP CONSTRAINT IF EXISTS match_events_type_check;
ALTER TABLE match_events
  ADD CONSTRAINT match_events_type_check CHECK (type IN (
    'goal','own_goal','penalty','missed_penalty',
    'yellow_card','second_yellow','red_card','substitution','var'));

ALTER TABLE match_events
  ADD COLUMN IF NOT EXISTS assist_player_id  INTEGER REFERENCES players(id) ON DELETE SET NULL,
  -- Thay người: player_id = người VÀO sân, related_player_id = người RA sân
  ADD COLUMN IF NOT EXISTS related_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL;

-- Phục vụ thống kê thẻ phạt / bàn thắng theo cầu thủ
CREATE INDEX IF NOT EXISTS idx_match_events_player ON match_events(player_id);


-- A4. LINEUPS — mốc công bố đội hình chính thức
-- Nhờ cột này, thông báo "Đội hình ra sân đã công bố" chỉ gửi ĐÚNG MỘT LẦN,
-- dù job 1 phút/lần chạy lại bao nhiêu lượt.
ALTER TABLE lineups
  ADD COLUMN IF NOT EXISTS announced_at TIMESTAMPTZ;


-- ---------------------------------------------------------------------------
-- B. NGƯỜI DÙNG: QUÊN MẬT KHẨU · THEME · CÀI ĐẶT
-- ---------------------------------------------------------------------------

-- B1. PASSWORD_RESET_CODES — mã OTP quên mật khẩu
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Chỉ lưu HASH của mã 6 số, đúng lý do như với mật khẩu: đọc trộm
  -- được database cũng không dùng được mã.
  code_hash   VARCHAR(128) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,                              -- 15 phút
  attempts    SMALLINT NOT NULL DEFAULT 0 CHECK (attempts <= 5), -- sai 5 lần -> huỷ mã
  used_at     TIMESTAMPTZ,                                       -- NULL = chưa dùng
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_codes_user ON password_reset_codes(user_id);


-- B2. THEMES — danh mục theme (tạo trước vì user_settings tham chiếu tới)
CREATE TABLE IF NOT EXISTS themes (
  id             SERIAL PRIMARY KEY,
  code           VARCHAR(40) NOT NULL UNIQUE,          -- 'tet', 'victory'
  name           VARCHAR(80) NOT NULL,                 -- 'Tết Nguyên Đán'
  kind           VARCHAR(20) NOT NULL
                 CHECK (kind IN ('default','event','result_win','result_lose')),

  -- Chỉ chứa các token nằm trong DANH SÁCH TRẮNG (ARCHITECTURE.md mục 6.1):
  -- accent, gold, pitch... KHÔNG bao giờ chứa màu chữ hay màu thắng/hoà/thua,
  -- nhờ vậy admin chọn màu kiểu gì thì chữ vẫn luôn đọc được.
  -- Kiểm tra danh sách trắng + độ tương phản ở tầng ứng dụng (mục 6.5).
  palette_light  JSONB NOT NULL DEFAULT '{}'::jsonb,
  palette_dark   JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- { "effect": "fireworks"|"blossoms"|"confetti"|null, "greeting": "...",
  --   "bannerUrl": "...", "splashImageUrl": "..." }
  assets         JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url    TEXT,                                 -- ảnh xem trước ở màn chọn theme
  is_selectable  BOOLEAN NOT NULL DEFAULT TRUE,        -- người dùng được chọn "cố định" không
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,        -- tắt thay vì xoá cứng
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- B3. USER_SETTINGS — cài đặt giao diện & thông báo (1 dòng / người dùng)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Đúng tên cột theo kế hoạch DEV 4: theme_id + is_senior_mode
  --   theme_id NULL            = tự động theo sự kiện (mặc định)
  --   theme_id của theme 'default' = tắt theme sự kiện
  --   theme_id khác            = cố định một theme
  theme_id        INTEGER REFERENCES themes(id) ON DELETE SET NULL,

  color_scheme    VARCHAR(10) NOT NULL DEFAULT 'system'
                  CHECK (color_scheme IN ('system','light','dark')),

  is_senior_mode  BOOLEAN NOT NULL DEFAULT FALSE,      -- giao diện người lớn tuổi
  tts_enabled     BOOLEAN NOT NULL DEFAULT FALSE,      -- đọc to tỷ số

  notify_goals    BOOLEAN NOT NULL DEFAULT TRUE,
  notify_kickoff  BOOLEAN NOT NULL DEFAULT TRUE,
  notify_lineup   BOOLEAN NOT NULL DEFAULT TRUE,
  notify_ratings  BOOLEAN NOT NULL DEFAULT TRUE,       -- điểm cầu thủ sau trận
  notify_result   BOOLEAN NOT NULL DEFAULT TRUE,
  notify_squad    BOOLEAN NOT NULL DEFAULT TRUE,       -- danh sách triệu tập mới
  notify_themes   BOOLEAN NOT NULL DEFAULT FALSE,

  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- B4. THEME_SCHEDULES — lịch áp dụng theme
CREATE TABLE IF NOT EXISTS theme_schedules (
  id          SERIAL PRIMARY KEY,
  theme_id    INTEGER NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  -- Sự kiện 50 · kết quả trận 80 · vô địch 100 (lịch ưu tiên cao thắng)
  priority    SMALLINT NOT NULL DEFAULT 50,
  source      VARCHAR(12) NOT NULL DEFAULT 'manual'
              CHECK (source IN ('manual','auto_result')),
  match_id    INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_schedule_range   CHECK (end_at > start_at),
  -- Theme tự sinh sau trận luôn phải gắn với một trận cụ thể
  CONSTRAINT chk_auto_has_match   CHECK (source <> 'auto_result' OR match_id IS NOT NULL),
  -- Một trận chỉ sinh tối đa MỘT lịch "Đi bão/Tiếp lửa" -> job chạy lại không tạo trùng
  CONSTRAINT uq_schedule_match    UNIQUE (match_id)
);

-- Truy vấn "theme nào đang áp dụng lúc này" lọc theo khoảng thời gian
CREATE INDEX IF NOT EXISTS idx_theme_schedules_range ON theme_schedules(start_at, end_at);


-- ---------------------------------------------------------------------------
-- C. GIỚI THIỆU ĐỘI TUYỂN & THÀNH TÍCH (Tab 1)
-- ---------------------------------------------------------------------------

-- C1. TEAM_PROFILES — giới thiệu chung (1-1 với teams)
CREATE TABLE IF NOT EXISTS team_profiles (
  team_id             INTEGER PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  nickname            VARCHAR(120),        -- 'Những chiến binh Sao Vàng'
  federation          VARCHAR(160),        -- 'Liên đoàn Bóng đá Việt Nam (VFF)'
  confederations      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ["AFC","AFF"]
  home_stadium        VARCHAR(160),        -- 'Sân vận động Quốc gia Mỹ Đình'
  intro_text          TEXT NOT NULL,       -- đoạn giới thiệu ở Tab Giới thiệu
  cover_image_url     TEXT,
  best_fifa_rank      SMALLINT CHECK (best_fifa_rank > 0),
  best_fifa_rank_date DATE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- C2. ACHIEVEMENTS — dòng thời gian thành tích
CREATE TABLE IF NOT EXISTS achievements (
  id              SERIAL PRIMARY KEY,
  team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  competition     VARCHAR(120) NOT NULL,   -- 'AFF Cup', 'Asian Cup'
  edition_year    SMALLINT NOT NULL CHECK (edition_year BETWEEN 1900 AND 2100),
  result          VARCHAR(20) NOT NULL CHECK (result IN (
                    'champion','runner_up','third_place','semi_final',
                    'quarter_final','round_of_16','group_stage','qualified')),
  title           VARCHAR(160) NOT NULL,   -- 'Vô địch AFF Cup 2018'
  description     TEXT,
  host            VARCHAR(120),            -- nước chủ nhà
  image_url       TEXT,
  final_match_id  INTEGER REFERENCES matches(id) ON DELETE SET NULL,
  -- Hiện ở "Tủ danh hiệu" trên Tab Giới thiệu và ở slide giới thiệu
  is_highlight    BOOLEAN NOT NULL DEFAULT FALSE,

  UNIQUE (team_id, competition, edition_year)
);

CREATE INDEX IF NOT EXISTS idx_achievements_team_year ON achievements(team_id, edition_year DESC);


-- C3. ONBOARDING_SLIDES — nội dung phần giới thiệu sau splash
CREATE TABLE IF NOT EXISTS onboarding_slides (
  id          SERIAL PRIMARY KEY,
  sort_order  SMALLINT NOT NULL,
  title       VARCHAR(120) NOT NULL,
  body        TEXT NOT NULL,
  image_url   TEXT,
  -- Admin sửa nội dung -> tăng version -> app hiện lại phần giới thiệu MỘT lần
  version     INTEGER NOT NULL DEFAULT 1,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_order ON onboarding_slides(sort_order) WHERE is_active;


-- ---------------------------------------------------------------------------
-- D. THÔNG SỐ SAU TRẬN & ĐIỂM CẦU THỦ (Tab 5 + sơ đồ đội hình)
-- ---------------------------------------------------------------------------

-- D1. MATCH_STATS — thống kê cấp đội (mỗi trận 2 dòng: đội nhà, đội khách)
CREATE TABLE IF NOT EXISTS match_stats (
  id                 SERIAL PRIMARY KEY,
  match_id           INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id            INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  possession_pct     SMALLINT CHECK (possession_pct BETWEEN 0 AND 100),
  shots              SMALLINT CHECK (shots >= 0),
  shots_on_target    SMALLINT CHECK (shots_on_target >= 0),
  expected_goals     NUMERIC(4,2) CHECK (expected_goals >= 0),   -- xG, có thể NULL
  corners            SMALLINT CHECK (corners >= 0),
  offsides           SMALLINT CHECK (offsides >= 0),
  fouls              SMALLINT CHECK (fouls >= 0),
  yellow_cards       SMALLINT CHECK (yellow_cards >= 0),
  red_cards          SMALLINT CHECK (red_cards >= 0),
  saves              SMALLINT CHECK (saves >= 0),
  passes             SMALLINT CHECK (passes >= 0),
  pass_accuracy_pct  SMALLINT CHECK (pass_accuracy_pct BETWEEN 0 AND 100),

  source             VARCHAR(10) NOT NULL DEFAULT 'provider'
                     CHECK (source IN ('provider','manual')),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (match_id, team_id),                            -- cho phép upsert
  CONSTRAINT chk_on_target CHECK (shots_on_target <= shots)
);


-- D2. PLAYER_MATCH_STATS — chỉ số và ĐIỂM của từng cầu thủ trong một trận
CREATE TABLE IF NOT EXISTS player_match_stats (
  id                 SERIAL PRIMARY KEY,
  match_id           INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id          INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id            INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  minutes_played     SMALLINT NOT NULL DEFAULT 0 CHECK (minutes_played BETWEEN 0 AND 130),

  -- NUMERIC(3,1) = 0.0 đến 10.0, đúng một chữ số thập phân như khi hiển thị.
  -- NULL = chưa chấm, hoặc đá dưới 10 phút (app hiện "–").
  rating             NUMERIC(3,1) CHECK (rating BETWEEN 0 AND 10),
  rating_source      VARCHAR(10) CHECK (rating_source IN ('provider','computed','manual')),
  is_motm            BOOLEAN NOT NULL DEFAULT FALSE,   -- cầu thủ xuất sắc nhất trận

  shots              SMALLINT DEFAULT 0,
  shots_on_target    SMALLINT DEFAULT 0,
  key_passes         SMALLINT DEFAULT 0,
  passes             SMALLINT DEFAULT 0,
  pass_accuracy_pct  SMALLINT CHECK (pass_accuracy_pct BETWEEN 0 AND 100),
  tackles            SMALLINT DEFAULT 0,
  interceptions      SMALLINT DEFAULT 0,
  saves              SMALLINT DEFAULT 0,               -- thủ môn
  goals_conceded     SMALLINT DEFAULT 0,               -- thủ môn / hậu vệ

  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (match_id, player_id)
);

-- Biểu đồ phong độ 10 trận gần nhất, điểm trung bình 5 trận
CREATE INDEX IF NOT EXISTS idx_pms_player ON player_match_stats(player_id, match_id DESC);
-- Mỗi trận chỉ có tối đa MỘT cầu thủ xuất sắc nhất (index UNIQUE có điều kiện)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pms_motm ON player_match_stats(match_id) WHERE is_motm;


-- ---------------------------------------------------------------------------
-- E. VIEW TỔNG HỢP CHO SƠ ĐỒ ĐỘI HÌNH (điểm + thẻ + bàn + thay người)
-- ---------------------------------------------------------------------------
-- Thẻ, bàn thắng, thay người lấy từ match_events (NGUỒN DUY NHẤT) thay vì lưu
-- trùng sang player_match_stats — tránh cảnh hai nơi lệch số nhau.
CREATE OR REPLACE VIEW v_player_match_summary AS
SELECT
  pms.match_id,
  pms.player_id,
  pms.team_id,
  pms.rating,
  pms.rating_source,
  pms.is_motm,
  pms.minutes_played,
  COUNT(*) FILTER (WHERE e.type IN ('goal','penalty') AND e.player_id = pms.player_id)  AS goals,
  COUNT(*) FILTER (WHERE e.type = 'goal' AND e.assist_player_id = pms.player_id)        AS assists,
  COALESCE(
    jsonb_agg(jsonb_build_object('type', e.type, 'minute', e.minute) ORDER BY e.minute)
      FILTER (WHERE e.type IN ('yellow_card','second_yellow','red_card')
              AND e.player_id = pms.player_id),
    '[]'::jsonb)                                                                        AS cards,
  MIN(e.minute) FILTER (WHERE e.type = 'substitution' AND e.player_id = pms.player_id)         AS subbed_in_at,
  MIN(e.minute) FILTER (WHERE e.type = 'substitution' AND e.related_player_id = pms.player_id) AS subbed_out_at
FROM player_match_stats pms
LEFT JOIN match_events e
       ON e.match_id = pms.match_id
      AND (e.player_id = pms.player_id
           OR e.assist_player_id = pms.player_id
           OR e.related_player_id = pms.player_id)
GROUP BY pms.match_id, pms.player_id, pms.team_id, pms.rating,
         pms.rating_source, pms.is_motm, pms.minutes_played;
