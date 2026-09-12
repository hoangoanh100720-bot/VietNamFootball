-- ===========================================================================
-- MIGRATION 003 — THEO KẾ HOẠCH 5 DEV
-- Đăng nhập mạng xã hội · Giải đấu & BXH bảng đấu · Đợt triệu tập
-- Engine chấm điểm cầu thủ · Giá trị cầu thủ · Trợ lý AI · Nhật ký quản trị
-- ---------------------------------------------------------------------------
-- Tài liệu: ARCHITECTURE.md mục 9.3
-- ⚠️ Phần RAG cần extension pgvector nằm ở file riêng 004_rag_vector.pg.sql
--    (PGlite nhúng không có extension này nên bộ chạy migration sẽ bỏ qua).
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- A. ĐĂNG NHẬP MẠNG XÃ HỘI (DEV 4)
-- ---------------------------------------------------------------------------

-- Tài khoản chỉ đăng nhập bằng Google/Facebook thì không có mật khẩu.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Tăng số này là vô hiệu hoá mọi access token đã cấp trước đó (đăng xuất mọi máy).
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_identities (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider       VARCHAR(12) NOT NULL
                 CHECK (provider IN ('password','google','facebook','apple','zalo')),
  -- 'sub' của Google/Apple, id của Facebook — KHÔNG dùng email làm khoá,
  -- vì người dùng đổi được email ở nhà cung cấp.
  provider_uid   VARCHAR(191) NOT NULL,
  email          VARCHAR(255),
  -- Chỉ gộp vào tài khoản email có sẵn khi nhà cung cấp xác nhận email đã xác thực,
  -- nếu không sẽ thành lỗ hổng chiếm tài khoản.
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (provider, provider_uid)
);

CREATE INDEX IF NOT EXISTS idx_identities_user ON user_identities(user_id);

ALTER TABLE refresh_tokens
  -- Chuỗi token xoay vòng. Token cũ bị dùng lại -> thu hồi CẢ chuỗi,
  -- vì đó là dấu hiệu token đã bị đánh cắp.
  ADD COLUMN IF NOT EXISTS family_id UUID,
  ADD COLUMN IF NOT EXISTS used_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);


-- ---------------------------------------------------------------------------
-- B. GIẢI ĐẤU ("Leagues") · BXH BẢNG ĐẤU · ĐỢT TRIỆU TẬP ("Squads")
--    DEV 4 thiết kế · DEV 2 ghi dữ liệu · DEV 5 viết API
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS competitions (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(40) NOT NULL UNIQUE,   -- 'asean-cup', 'asian-cup', 'wcq-afc', 'friendly'
  name          VARCHAR(120) NOT NULL,
  type          VARCHAR(20) NOT NULL
                CHECK (type IN ('friendly','regional','continental','world','multi_sport')),
  confederation VARCHAR(10),                   -- 'AFF', 'AFC', 'FIFA'
  logo_url      TEXT
);

CREATE TABLE IF NOT EXISTS seasons (
  id             SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name           VARCHAR(40) NOT NULL,         -- '2026', '2027 vòng loại'
  start_date     DATE,
  end_date       DATE,
  is_current     BOOLEAN NOT NULL DEFAULT FALSE,

  UNIQUE (competition_id, name)
);

-- Bảng xếp hạng bảng đấu: "Việt Nam đang đứng thứ mấy bảng B?"
CREATE TABLE IF NOT EXISTS competition_standings (
  season_id     INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  group_name    VARCHAR(20) NOT NULL DEFAULT '',   -- 'Bảng B'; giải không có vòng bảng thì để ''
  team_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  position      SMALLINT NOT NULL,
  played        SMALLINT NOT NULL DEFAULT 0,
  won           SMALLINT NOT NULL DEFAULT 0,
  drawn         SMALLINT NOT NULL DEFAULT 0,
  lost          SMALLINT NOT NULL DEFAULT 0,
  goals_for     SMALLINT NOT NULL DEFAULT 0,
  goals_against SMALLINT NOT NULL DEFAULT 0,
  points        SMALLINT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (season_id, group_name, team_id)
);

-- Một đợt tập trung / triệu tập ĐTQG
CREATE TABLE IF NOT EXISTS squads (
  id           SERIAL PRIMARY KEY,
  team_id      INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id    INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
  title        VARCHAR(160) NOT NULL,          -- 'Đợt tập trung tháng 10/2026'
  gather_from  DATE,
  gather_to    DATE,
  announced_at TIMESTAMPTZ,                    -- NULL = chưa công bố
  source_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_squads_team_date ON squads(team_id, gather_from DESC);

CREATE TABLE IF NOT EXISTS squad_members (
  squad_id   INTEGER NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- called = có trong danh sách · added = bổ sung sau · withdrawn = rút lui (chấn thương…)
  status     VARCHAR(12) NOT NULL DEFAULT 'called'
             CHECK (status IN ('called','added','withdrawn')),
  note       VARCHAR(160),                     -- 'Chấn thương cơ đùi'

  PRIMARY KEY (squad_id, player_id)
);

-- Gắn trận đấu với mùa giải + phiên bản dữ liệu cho luồng ingest 1 phút/lần
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS season_id      INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
  -- Tăng 1 mỗi lần dữ liệu trận thay đổi. Job chấm điểm bỏ qua sự kiện có
  -- data_version cũ hơn -> job đến trễ hoặc sai thứ tự không làm hỏng điểm.
  ADD COLUMN IF NOT EXISTS data_version   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_polled_at TIMESTAMPTZ;

ALTER TABLE match_events
  -- ID sự kiện bên nhà cung cấp: để nhận ra sự kiện nào vừa bị họ XOÁ (VAR huỷ bàn)
  ADD COLUMN IF NOT EXISTS provider_event_id VARCHAR(64),
  -- Xoá mềm: giữ lại để còn giải thích "điểm đã cập nhật vì VAR huỷ bàn phút 67"
  ADD COLUMN IF NOT EXISTS is_deleted        BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_events_provider
  ON match_events(match_id, provider_event_id);

-- Ánh xạ ID của nhà cung cấp sang ID nội bộ -> đổi nhà cung cấp không đổi ID trong app
CREATE TABLE IF NOT EXISTS external_refs (
  entity_type VARCHAR(20) NOT NULL,            -- 'team','player','match','competition'
  provider    VARCHAR(20) NOT NULL,            -- 'apifootball','sportmonks'
  external_id VARCHAR(64) NOT NULL,
  internal_id INTEGER NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (entity_type, provider, external_id)
);


-- ---------------------------------------------------------------------------
-- C. ENGINE CHẤM ĐIỂM CẦU THỦ (DEV 3) — mục 12
-- ---------------------------------------------------------------------------

ALTER TABLE player_match_stats
  -- Điểm của nhà cung cấp: giữ lại để đối chiếu và hiệu chỉnh hệ số của engine
  ADD COLUMN IF NOT EXISTS provider_rating  NUMERIC(3,1) CHECK (provider_rating BETWEEN 0 AND 10),
  -- Bảng cộng/trừ điểm, để app trả lời "Vì sao 8.3?":
  -- [{"rule":"goal","count":2,"points":2.0}, {"rule":"yellow_card","count":1,"points":-0.5}]
  ADD COLUMN IF NOT EXISTS rating_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ruleset_version  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS data_version     INTEGER NOT NULL DEFAULT 0;

-- Bộ quy tắc quy đổi sự kiện -> điểm, lưu dạng JSON có phiên bản:
-- sửa hệ số không cần deploy lại code, và luôn biết điểm cũ tính bằng bộ nào.
CREATE TABLE IF NOT EXISTS rating_rulesets (
  version     VARCHAR(20) PRIMARY KEY,         -- '2026.1'
  rules       JSONB NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ MỘT bộ quy tắc được bật tại một thời điểm
CREATE UNIQUE INDEX IF NOT EXISTS uq_ruleset_active ON rating_rulesets(is_active) WHERE is_active;

-- Mỗi lần chấm điểm một trận -> một dòng, để truy được "ai/cái gì đã đổi điểm"
CREATE TABLE IF NOT EXISTS rating_runs (
  id              SERIAL PRIMARY KEY,
  match_id        INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  trigger         VARCHAR(12) NOT NULL
                  CHECK (trigger IN ('live','finalize','correction','manual','ruleset')),
  data_version    INTEGER NOT NULL,
  ruleset_version VARCHAR(20) NOT NULL,
  changed_players SMALLINT NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rating_runs_match ON rating_runs(match_id, started_at DESC);

-- Vết đính chính điểm (VAR huỷ bàn, nhà cung cấp sửa số liệu, admin sửa tay)
CREATE TABLE IF NOT EXISTS rating_audit (
  id         BIGSERIAL PRIMARY KEY,
  run_id     INTEGER NOT NULL REFERENCES rating_runs(id) ON DELETE CASCADE,
  match_id   INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  old_rating NUMERIC(3,1),
  new_rating NUMERIC(3,1),
  reason     TEXT,                             -- 'VAR huỷ bàn thắng phút 67'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rating_audit_match ON rating_audit(match_id);

-- Bảng tổng hợp phục vụ BXH CẦU THỦ (mục 12.5).
-- Tính sẵn thay vì GROUP BY lúc có request -> giữ được mục tiêu < 50ms.
CREATE TABLE IF NOT EXISTS player_rating_stats (
  period_type  VARCHAR(12) NOT NULL
               CHECK (period_type IN ('week','month','year','competition','squad')),
  period_key   VARCHAR(30) NOT NULL,           -- '2026-W38', '2026-09', '2026', 'season:12', 'squad:7'
  player_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  matches      SMALLINT NOT NULL DEFAULT 0,
  minutes      SMALLINT NOT NULL DEFAULT 0,
  avg_rating   NUMERIC(4,2),                   -- NULL khi chưa đủ số phút tối thiểu
  goals        SMALLINT NOT NULL DEFAULT 0,
  assists      SMALLINT NOT NULL DEFAULT 0,
  motm_count   SMALLINT NOT NULL DEFAULT 0,
  yellow_cards SMALLINT NOT NULL DEFAULT 0,
  red_cards    SMALLINT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (period_type, period_key, player_id)
);

CREATE INDEX IF NOT EXISTS idx_prs_rating ON player_rating_stats(period_type, period_key, avg_rating DESC);


-- ---------------------------------------------------------------------------
-- D. GIÁ TRỊ CẦU THỦ (DEV 2) — mục 11.5
-- ---------------------------------------------------------------------------
-- players.market_value_eur đã có ở 001 (giá trị thị trường thật).
-- Thêm giá trị ƯỚC TÍNH theo phong độ — luôn hiển thị tách biệt và ghi rõ
-- "ước tính của app", không phải giá chuyển nhượng chính thức.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS estimated_value_eur BIGINT CHECK (estimated_value_eur >= 0),
  ADD COLUMN IF NOT EXISTS value_updated_at    TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS player_value_history (
  player_id           INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  recorded_on         DATE NOT NULL,
  market_value_eur    BIGINT,
  estimated_value_eur BIGINT,
  form_rating         NUMERIC(4,2),            -- điểm phong độ dùng để tính
  reason              JSONB,                   -- giải thích biến động cho người dùng

  PRIMARY KEY (player_id, recorded_on)
);


-- ---------------------------------------------------------------------------
-- E. TRỢ LÝ AI — HỘI THOẠI & HẠN MỨC (DEV 1) — mục 10
--    (phần vector cho RAG: xem 004_rag_vector.pg.sql)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_conversations (
  id         UUID PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(120),
  -- Tóm tắt phần hội thoại cũ: prompt không phình to theo độ dài hội thoại
  summary    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            VARCHAR(10) NOT NULL CHECK (role IN ('user','assistant','tool')),
  content         TEXT NOT NULL,
  tool_name       VARCHAR(60),                 -- tool nào được gọi (role = 'tool')
  tokens_in       INTEGER NOT NULL DEFAULT 0,
  tokens_out      INTEGER NOT NULL DEFAULT 0,
  feedback        SMALLINT CHECK (feedback IN (-1, 1)),   -- 👍 / 👎
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id, id);

-- Hạn mức token theo người/ngày + theo dõi chi phí (mục 10.5)
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        DATE NOT NULL,
  tokens_in  INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_usd   NUMERIC(8,4) NOT NULL DEFAULT 0,

  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS kb_documents (
  id         SERIAL PRIMARY KEY,
  source     VARCHAR(40) NOT NULL             -- nguồn tri thức cho RAG
             CHECK (source IN ('history','achievement','player_bio','coach_bio','faq','rules')),
  title      VARCHAR(200) NOT NULL,
  body       TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- F. NHẬT KÝ QUẢN TRỊ (DEV 4)
-- ---------------------------------------------------------------------------
-- Mọi thao tác /admin/* và mọi lần sửa điểm tay đều ghi lại: ai, lúc nào, sửa gì.
CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(60) NOT NULL,             -- 'rating.manual_edit', 'theme.create'
  entity     VARCHAR(60) NOT NULL,
  entity_id  VARCHAR(64),
  before     JSONB,
  after      JSONB,
  ip         VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
