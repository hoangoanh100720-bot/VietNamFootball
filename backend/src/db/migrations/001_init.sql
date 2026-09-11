-- ===========================================================================
-- MIGRATION 001 — KHỞI TẠO TOÀN BỘ SCHEMA
-- ===========================================================================
--
-- MIGRATION LÀ GÌ?
-- Là một file SQL mô tả MỘT thay đổi cấu trúc database, chạy đúng MỘT LẦN,
-- theo thứ tự tên file (001, 002, 003...). Nhờ vậy:
--   - Máy bạn, máy đồng đội, server production đều có cấu trúc GIỐNG NHAU.
--   - Lịch sử thay đổi database nằm trong Git, xem lại được.
--   - Không ai phải "vào pgAdmin bấm tay" -> không sai sót.
--
-- QUY ƯỚC ĐẶT TÊN TRONG FILE NÀY:
--   - Tên bảng: số nhiều, chữ thường  (users, players, matches)
--   - Tên cột : snake_case            (full_name, kickoff_at)
--   - Khoá ngoại: <tên bảng số ít>_id (team_id, match_id)
--   - Thời gian: hậu tố _at, kiểu TIMESTAMPTZ (có múi giờ)
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. USERS — người dùng app
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,

  -- CITEXT sẽ hay hơn nhưng cần extension; ta chuẩn hoá email về chữ thường
  -- ở tầng ứng dụng trước khi lưu, rồi đặt UNIQUE ở đây.
  email         VARCHAR(255) NOT NULL UNIQUE,

  -- ⚠️ CHỈ lưu chuỗi băm bcrypt, KHÔNG BAO GIỜ lưu mật khẩu gốc.
  -- Độ dài 60 ký tự là chuẩn của bcrypt, để 255 cho chắc.
  password_hash VARCHAR(255) NOT NULL,

  full_name     VARCHAR(120) NOT NULL,
  avatar_url    TEXT,

  -- CHECK ràng buộc giá trị hợp lệ ngay ở tầng database.
  -- Kể cả code có bug thì dữ liệu rác cũng không lọt vào được.
  role          VARCHAR(20) NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'admin')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- 2. REFRESH_TOKENS — phiên đăng nhập dài hạn
-- ---------------------------------------------------------------------------
-- VÌ SAO PHẢI LƯU DATABASE?
-- Access token (15 phút) không lưu, hết hạn là xong.
-- Refresh token (7 ngày) phải lưu để có thể THU HỒI: khi người dùng bấm
-- "đăng xuất", hoặc khi ta phát hiện token bị đánh cắp.
--
-- VÌ SAO LƯU token_hash CHỨ KHÔNG LƯU TOKEN?
-- Giống hệt lý do với mật khẩu: nếu kẻ xấu đọc trộm được database,
-- hắn vẫn không thể đăng nhập vì hash không đảo ngược được.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,

  -- ON DELETE CASCADE: xoá user thì token của họ tự bị xoá theo,
  -- không để lại "rác mồ côi" trong database.
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  token_hash  VARCHAR(128) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,                 -- NULL = còn hiệu lực
  user_agent  VARCHAR(255),                -- thiết bị nào đăng nhập
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user   ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry ON refresh_tokens(expires_at);


-- ---------------------------------------------------------------------------
-- 3. TEAMS — đội tuyển quốc gia
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  country     VARCHAR(120) NOT NULL,
  logo_url    TEXT,
  fifa_code   VARCHAR(3) UNIQUE,           -- VIE, THA, IDN, JPN...
  external_id INTEGER,                     -- id bên API bóng đá, để đồng bộ
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- 4. COACHES — huấn luyện viên trưởng
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coaches (
  id            SERIAL PRIMARY KEY,
  team_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  full_name     VARCHAR(120) NOT NULL,
  nationality   VARCHAR(80),
  birth_date    DATE,
  photo_url     TEXT,
  start_date    DATE,                      -- ngày nhậm chức
  contract_end  DATE,
  biography     TEXT,
  -- Thành tích lưu dạng JSONB: mềm dẻo, mỗi HLV một kiểu danh hiệu khác nhau
  achievements  JSONB DEFAULT '[]'::jsonb,
  is_current    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaches_team ON coaches(team_id);


-- ---------------------------------------------------------------------------
-- 5. PLAYERS — cầu thủ
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id               SERIAL PRIMARY KEY,
  team_id          INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  full_name        VARCHAR(120) NOT NULL,
  short_name       VARCHAR(60),            -- tên hiển thị gọn trên sơ đồ sân
  birth_date       DATE,
  hometown         VARCHAR(120),           -- quê quán
  height_cm        SMALLINT CHECK (height_cm BETWEEN 140 AND 220),
  weight_kg        SMALLINT CHECK (weight_kg BETWEEN 40 AND 130),

  -- GK thủ môn | DF hậu vệ | MF tiền vệ | FW tiền đạo
  position         VARCHAR(2) NOT NULL CHECK (position IN ('GK','DF','MF','FW')),
  detailed_position VARCHAR(40),           -- "Trung vệ", "Tiền vệ phòng ngự"...
  shirt_number     SMALLINT CHECK (shirt_number BETWEEN 1 AND 99),
  preferred_foot   VARCHAR(10) CHECK (preferred_foot IN ('left','right','both')),

  -- Giá trị chuyển nhượng theo EUR. Dùng BIGINT (số nguyên) thay vì số thực
  -- để tránh sai số dấu chấm động khi cộng tổng giá trị đội hình.
  market_value_eur BIGINT DEFAULT 0 CHECK (market_value_eur >= 0),

  current_club     VARCHAR(120),
  photo_url        TEXT,
  caps             SMALLINT DEFAULT 0,     -- số trận khoác áo ĐTQG
  goals            SMALLINT DEFAULT 0,     -- số bàn cho ĐTQG
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  external_id      INTEGER,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_team     ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);


-- ---------------------------------------------------------------------------
-- 6. PLAYER_CLUBS — lịch sử thi đấu CLB của cầu thủ
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_clubs (
  id         SERIAL PRIMARY KEY,
  player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  club_name  VARCHAR(120) NOT NULL,
  club_logo  TEXT,
  from_date  DATE,
  to_date    DATE,                         -- NULL = đang thi đấu ở đây
  apps       SMALLINT DEFAULT 0,           -- số lần ra sân
  goals      SMALLINT DEFAULT 0,
  is_loan    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_player_clubs_player ON player_clubs(player_id);


-- ---------------------------------------------------------------------------
-- 7. MATCHES — trận đấu
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id            SERIAL PRIMARY KEY,
  competition   VARCHAR(120) NOT NULL,     -- "Vòng loại World Cup 2026"
  round         VARCHAR(80),               -- "Bảng F - Lượt 3"

  home_team_id  INTEGER NOT NULL REFERENCES teams(id),
  away_team_id  INTEGER NOT NULL REFERENCES teams(id),

  kickoff_at    TIMESTAMPTZ NOT NULL,      -- LƯU THEO UTC, đổi múi giờ ở client
  venue         VARCHAR(160),
  city          VARCHAR(80),

  status        VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','live','finished','postponed','cancelled')),

  home_score    SMALLINT DEFAULT 0 CHECK (home_score >= 0),
  away_score    SMALLINT DEFAULT 0 CHECK (away_score >= 0),
  minute        SMALLINT,                  -- phút hiện tại khi status = live
  attendance    INTEGER,
  external_id   INTEGER UNIQUE,            -- chống nhập trùng khi đồng bộ
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Một đội không thể đá với chính mình
  CONSTRAINT chk_different_teams CHECK (home_team_id <> away_team_id)
);

-- INDEX LÀ GÌ? Giống mục lục của cuốn sách. Không có index, Postgres phải
-- đọc TỪNG DÒNG để tìm (Sequential Scan). Có index, nó tra thẳng.
-- Với 100 trận thì không khác biệt, với 100.000 trận thì nhanh gấp hàng nghìn lần.
-- Ta đánh index đúng những cột hay dùng trong WHERE và ORDER BY:
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_matches_status  ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_home    ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away    ON matches(away_team_id);


-- ---------------------------------------------------------------------------
-- 8. MATCH_EVENTS — diễn biến trận đấu (bàn thắng, thẻ, thay người)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_events (
  id         SERIAL PRIMARY KEY,
  match_id   INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id    INTEGER REFERENCES teams(id),
  player_id  INTEGER REFERENCES players(id) ON DELETE SET NULL,

  minute     SMALLINT NOT NULL,
  extra_minute SMALLINT,                   -- phút bù giờ: 45+2 -> minute=45, extra=2

  type       VARCHAR(24) NOT NULL
             CHECK (type IN ('goal','own_goal','penalty','missed_penalty',
                             'yellow_card','red_card','substitution','var')),

  detail     VARCHAR(255),                 -- "Đánh đầu", "Vào thay Quang Hải"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id);


-- ---------------------------------------------------------------------------
-- 9. LINEUPS + LINEUP_PLAYERS — đội hình ra sân
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lineups (
  id         SERIAL PRIMARY KEY,
  match_id   INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  formation  VARCHAR(20) NOT NULL,         -- "3-4-3", "4-2-3-1"

  -- Đội hình dự kiến hiện tại (chưa gắn với trận nào) thì match_id = NULL.
  -- Cột này đánh dấu đâu là đội hình "đang dùng" để hiển thị ở Tab Đội Hình.
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lineup_players (
  id          SERIAL PRIMARY KEY,
  lineup_id   INTEGER NOT NULL REFERENCES lineups(id) ON DELETE CASCADE,
  player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  is_starting BOOLEAN NOT NULL DEFAULT TRUE,   -- TRUE = đá chính, FALSE = dự bị

  -- TOẠ ĐỘ TRÊN SÂN, thang 0-100 (%), để app vẽ sơ đồ chiến thuật:
  --   position_x: 0 = biên trái, 100 = biên phải
  --   position_y: 0 = khung thành nhà, 100 = khung thành đối phương
  -- Dùng % thay vì pixel để sơ đồ tự co giãn theo mọi kích thước màn hình.
  position_x  SMALLINT CHECK (position_x BETWEEN 0 AND 100),
  position_y  SMALLINT CHECK (position_y BETWEEN 0 AND 100),

  shirt_number SMALLINT,
  is_captain   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Một cầu thủ chỉ xuất hiện một lần trong một đội hình
  UNIQUE (lineup_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_lineups_match         ON lineups(match_id);
CREATE INDEX IF NOT EXISTS idx_lineup_players_lineup ON lineup_players(lineup_id);


-- ---------------------------------------------------------------------------
-- 10. H2H_RECORDS — lịch sử đối đầu nhập từ nguồn ngoài
-- ---------------------------------------------------------------------------
-- GHI CHÚ THIẾT KẾ: API /matches/:id/h2h sẽ tính trực tiếp từ bảng `matches`
-- (nguồn dữ liệu duy nhất, luôn chính xác). Bảng này dành cho các trận đấu
-- LỊCH SỬ mà ta chỉ có kết quả tóm tắt, không có bản ghi trận đầy đủ.
CREATE TABLE IF NOT EXISTS h2h_records (
  id         SERIAL PRIMARY KEY,
  team_a_id  INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_b_id  INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  match_id   INTEGER REFERENCES matches(id) ON DELETE SET NULL,
  score_a    SMALLINT,
  score_b    SMALLINT,
  result     VARCHAR(10) CHECK (result IN ('win','draw','lose')), -- theo góc nhìn team_a
  competition VARCHAR(120),
  played_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_h2h_teams ON h2h_records(team_a_id, team_b_id);


-- ---------------------------------------------------------------------------
-- 11. AI_PREDICTIONS — kết quả dự đoán từ Gemini
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_predictions (
  id             SERIAL PRIMARY KEY,

  -- UNIQUE: mỗi trận chỉ giữ MỘT bản dự đoán mới nhất.
  -- Nhờ đó dùng được "INSERT ... ON CONFLICT (match_id) DO UPDATE"
  -- (gọi là upsert: chưa có thì thêm, có rồi thì cập nhật).
  match_id       INTEGER NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,

  win_pct        SMALLINT NOT NULL CHECK (win_pct BETWEEN 0 AND 100),
  draw_pct       SMALLINT NOT NULL CHECK (draw_pct BETWEEN 0 AND 100),
  lose_pct       SMALLINT NOT NULL CHECK (lose_pct BETWEEN 0 AND 100),

  -- Ràng buộc quan trọng: ba tỷ lệ PHẢI cộng lại đúng 100%.
  -- AI đôi khi trả 45+30+24=99 -> database chặn ngay, không cho lưu dữ liệu sai.
  CONSTRAINT chk_pct_sum CHECK (win_pct + draw_pct + lose_pct = 100),

  analysis_text  TEXT NOT NULL,
  key_factors    JSONB DEFAULT '[]'::jsonb,
  predicted_score VARCHAR(10),
  confidence     VARCHAR(10) CHECK (confidence IN ('low','medium','high')),

  -- Ghi lại phiên bản model để sau này đối chiếu: model nào dự đoán chuẩn hơn
  model_version  VARCHAR(60) NOT NULL,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_predictions_match ON ai_predictions(match_id);


-- ---------------------------------------------------------------------------
-- 12. FIFA_RANKINGS — bảng xếp hạng FIFA theo mốc thời gian
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fifa_rankings (
  id            SERIAL PRIMARY KEY,
  team_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rank          SMALLINT NOT NULL CHECK (rank > 0),
  points        NUMERIC(7,2) NOT NULL,
  previous_rank SMALLINT,                  -- để hiển thị mũi tên tăng/giảm
  confederation VARCHAR(10),               -- AFC, UEFA, CONMEBOL...
  snapshot_date DATE NOT NULL,             -- FIFA công bố theo đợt

  -- Mỗi đội chỉ có một thứ hạng trong một đợt công bố
  UNIQUE (team_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_fifa_rankings_date ON fifa_rankings(snapshot_date);


-- ---------------------------------------------------------------------------
-- 13. DEVICE_TOKENS — token thiết bị để gửi push notification (FCM)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token  TEXT NOT NULL UNIQUE,
  platform   VARCHAR(10) CHECK (platform IN ('ios','android','web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
