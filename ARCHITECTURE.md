# KIẾN TRÚC HỆ THỐNG — ỨNG DỤNG "ĐỘI TUYỂN VIỆT NAM"

> Tài liệu kiến trúc kỹ thuật (Technical Architecture Document)
> Phiên bản: **3.2 — bản gộp toàn bộ yêu cầu + kế hoạch phân công đã bổ sung** — Cập nhật: 11/09/2026
> Tên app hiển thị: **Đội tuyển Việt Nam** (`mobile/app.json` → `expo.name`)
> **Đây là ỨNG DỤNG THÔNG TIN cho người hâm mộ Đội tuyển Bóng đá Quốc gia Việt Nam, KHÔNG phải game.** App không có đội hình ảo, ngân sách, chuyển nhượng hay xếp hạng người chơi.
> Bản 2.0 (trước khi có kế hoạch 5 dev) lưu tại [docs/archive/ARCHITECTURE-v2.0.md](docs/archive/ARCHITECTURE-v2.0.md).

**Cách đọc tài liệu**

- **Phần A** (đọc trước): tổng hợp những gì bạn đã yêu cầu, những gì bạn đã chọn thêm, kế hoạch 5 dev của bạn được đưa vào app thế nào, và **những gì Claude đề nghị thêm hoặc thấy còn thiếu**.
- **Phần B**: thiết kế chi tiết — kiến trúc, giao diện từng màn, API, cơ sở dữ liệu, phần việc của từng dev, biến môi trường, lộ trình, so sánh đối thủ.

Ký hiệu: ✅ đã có trong code · ⏳ đã thiết kế, chưa code · 🆕 theo yêu cầu của bạn · 💡 đề xuất của Claude (**chờ bạn duyệt**) · ➕ đề xuất bạn **đã duyệt**, đã đưa vào kế hoạch · ⚠️ rủi ro / cần xác minh.

---

# PHẦN A — TỔNG HỢP YÊU CẦU

## A1. Định hướng sản phẩm

**"Đội tuyển Việt Nam"** là app di động (Android + iOS) cho người hâm mộ ĐTQG: giới thiệu và thành tích đội tuyển, trận đấu trực tiếp, đội hình, hồ sơ và giá trị cầu thủ, thông số sau trận, **điểm cầu thủ hiện ngay trên sơ đồ đội hình**, trợ lý AI hỏi đáp, theme theo sự kiện và giao diện cho người lớn tuổi.

Các lần bạn gửi yêu cầu, tất cả đã được gộp vào tài liệu này:

| Lần | Ngày | Nội dung bạn gửi | Chi tiết |
|---|---|---|---|
| 0 | 09/09 | File kiến trúc bản 1.0 + "code toàn diện, dạy tôi React Native fullstack từ từ" | Đã code xong bản 1.0 (README) |
| 1 | 11/09 | Danh sách giao diện & chức năng + "gợi ý thêm chức năng", "so sánh với app/web hiện có, đưa tính năng đặc biệt hơn đối thủ" | A2 |
| 2 | 11/09 | Chọn thêm: điểm + thẻ trên đầu cầu thủ, Theme, giao diện người lớn tuổi, mở đầu có tên app + giới thiệu, tab dưới giống App Store | A3 |
| 3 | 11/09 | Kế hoạch phân công 5 dev | A4 |
| 4 | 11/09 | Tên app là **"Đội tuyển Việt Nam"**; **không làm game**; gộp tất cả thành một app | Toàn bộ tài liệu |
| 5 | 11/09 | Duyệt bổ sung vào kế hoạch: **dev mobile + 7 việc chưa có người nhận**, **BXH bảng đấu**, **danh sách triệu tập** | A4.1, 2.1–2.2, 5.8 |
| 6 | 12/09 | Chốt giao diện: **phần giới thiệu tự chuyển sau 5–7 giây**; **cả 5 tab nằm ở thanh dưới**; **Trợ lý AI nằm trong tab Thống kê** dạng khung kéo ngang | 4.1, 4.2, 5.6–5.7 |

## A2. Yêu cầu gốc của bạn (lần 1)

| # | Bạn yêu cầu | Trong app | Mục | Code |
|---|---|---|---|---|
| 1 | Giao diện Start app | Splash có tên app "ĐỘI TUYỂN VIỆT NAM" → giới thiệu chung về đội tuyển | 4.1 | ⏳ |
| 2 | Giao diện Đăng nhập & đăng ký | Email + mật khẩu; thêm Google, Facebook (A4), quên mật khẩu, chế độ khách | 5.5, 13 | ✅ email · ⏳ phần còn lại |
| 3 | Tab giới thiệu, thành tích | **Tab 1 — Giới thiệu**: giới thiệu, tủ danh hiệu, dòng thời gian thành tích, BXH FIFA, trận tiếp theo | 5.1 | ⏳ |
| 4 | Tab trận đấu đang diễn ra – thông tin trong trận, sắp diễn ra | **Tab 2 — Trận đấu** (Đang diễn ra · Sắp diễn ra · Kết quả) + màn chi tiết trận | 5.2 | ✅ một phần |
| 5 | Tab đội hình cầu thủ | **Tab 3 — Đội hình**: sơ đồ ra sân, điểm + thẻ trên đầu cầu thủ | 5.3 | ✅ sơ đồ · ⏳ điểm |
| 6 | Tab thông tin cầu thủ | **Tab 4 — Cầu thủ**: danh sách, hồ sơ, giá trị, phong độ | 5.4 | ✅ một phần |
| 7 | Tab thông số sau trận đấu | **Tab 5 — Thống kê** + tab con "Thống kê" trong chi tiết trận | 5.6, 5.2 | ⏳ |
| 8 | Cài đặt → Thông tin (chỉnh sửa hồ sơ) | Cài đặt (mở từ ảnh đại diện góc phải) → Thông tin cá nhân, ảnh đại diện | 5.5 | ⏳ |
| 9 | Cài đặt → Giao diện theo sự kiện (themes) | Theme Tết, 30/4, 2/9, mùa giải đấu + "Đi bão"/"Tiếp lửa" | 6 | ⏳ |
| 10 | Dùng DBMS để lưu trữ dữ liệu | PostgreSQL | 9 | ✅ |
| 11 | Đăng ký & đăng nhập lưu database | `users`, `refresh_tokens` | 9, 13 | ✅ |
| 12 | Cập nhật trận đấu 1 phút/lần | Job 1 phút/lần trong khung giờ thi đấu | 1.3, 11 | ⏳ (hiện có polling tỷ số live) |
| 13 | Cập nhật đội hình 1 phút/lần | 1 phút/lần từ 90 phút trước trận tới khi hết trận | 1.3, 11 | ⏳ |
| 14 | Thông tin cầu thủ (giá trị cầu thủ…) | Giá trị thị trường + **giá trị ước tính biến động theo phong độ** | 11.5 | ✅ giá trị tĩnh · ⏳ biến động |

## A3. Những gì bạn chọn thêm (lần 2)

| # | Bạn chọn | Trong app | Mục | Code |
|---|---|---|---|---|
| 1 | **Điểm cầu thủ hiện ngay trên đầu** ở hình đội hình ra sân, **kèm thẻ vàng/đỏ**, sau khi vừa kết thúc trận | `RatingBadge` + `CardBadge` trên sơ đồ; điểm do **engine chấm điểm** (DEV 3) tính | 5.3, 12 | ⏳ |
| 2 | **Theme** như Claude gợi ý | 4 lớp: bảng màu gốc → theme sự kiện → theme phản ứng (Đi bão khi thắng / Tiếp lửa khi thua) → Senior mode | 6 | ⏳ |
| 3 | **Giao diện cho người lớn tuổi** | Chữ to (15 → 20), 3 tab, nút to 56pt, đọc to tỷ số | 7 | ⏳ |
| 4 | Mở đầu: **tên app trước**, sau đó **giới thiệu chung về đội tuyển** | Splash có tên app → 4 slide giới thiệu (lần đầu mở app) | 4.1 | ⏳ |
| 5 | **Thanh tab ở dưới giống App Store**, dễ nhấn | 5 tab icon + chữ, nền mờ, chạm lại để cuộn lên đầu, chấm đỏ khi có trận live | 4.2 | ✅ tab bar · ⏳ bố cục mới |
| 6 | Bổ sung đầy đủ vào ARCHITECTURE.md **gồm schema cơ sở dữ liệu và API** | Migration `002` + `003`, danh sách API, ví dụ dữ liệu trả về | 8, 9 | ⏳ |

## A4. Kế hoạch 5 dev của bạn (lần 3) — được đưa vào app thế nào

⚠️ **Chỗ cần lưu ý**: phần DEV 3 trong kế hoạch dùng các cụm từ của game Fantasy ("Fantasy Rules Engine", "hàng triệu người dùng/đội hình ảo", "xếp hạng người dùng"). Vì app **không phải game**, tài liệu này hiểu phần DEV 3 là **engine chấm điểm cầu thủ thật**. Đây chính là điểm hiện trên đầu cầu thủ mà bạn đã chọn ở A3. 💡 Nên sửa tên vai trò DEV 3 trong bảng phân công thành *"Engine chấm điểm cầu thủ & Nghiệp vụ"* để nhóm không hiểu nhầm.

| Dev | Việc trong kế hoạch của bạn | Trong app "Đội tuyển Việt Nam" | Mục |
|---|---|---|---|
| **DEV 1** | Kiến trúc & DevOps: Microservices hoặc Modular Monolith, CI/CD, Docker, AWS/GCP, API Gateway | **Modular Monolith** (1 codebase, tách worker), Docker, GitHub Actions, GCP (hoặc AWS), Load Balancer + WAF làm gateway | 3 |
| | Trợ lý AI: Gemini/OpenAI, RAG hoặc Function Calling truy vấn DB (kết quả, thông số cầu thủ, BXH), bộ nhớ hội thoại, tối ưu token | **Trợ lý "Hỏi đáp Đội tuyển"** tiếng Việt: function calling vào DB + RAG cho lịch sử/luật; giữ tính năng dự đoán Thắng/Hòa/Thua ✅ | 5.7, 10 |
| **DEV 2** | Gọi API Sportmonks, RapidAPI: trận đấu, đội hình, giá trị cầu thủ | Adapter nhà cung cấp + chuẩn hoá dữ liệu | 11.1 |
| | Polling 1 phút/lần bằng Cronjob/Worker Queue (BullMQ/Celery) | **BullMQ**, mỗi 60 giây, chỉ gọi API khi đang trong khung giờ thi đấu | 11.2–11.3 |
| | Redis cache dữ liệu live, tránh tốn tiền API và ghi DB quá nhiều | Redis `live:*`, **chỉ ghi DB khi dữ liệu thật sự đổi** | 11.4 |
| | Tự cập nhật giá trị cầu thủ theo phong độ/thời gian | **Giá trị ước tính** (tách khỏi giá trị thị trường gốc), lịch sử biến động | 11.5 |
| **DEV 3** | Rules engine: quy đổi bàn thắng, kiến tạo, thẻ, cứu thua, giữ sạch lưới… thành điểm **theo vị trí** | **Engine chấm điểm cầu thủ**: thang 0–10, bảng quy đổi riêng cho Thủ môn / Hậu vệ / Tiền vệ / Tiền đạo | 12.1–12.2 |
| | Xử lý hàng loạt: nghe sự kiện từ DEV 2 mỗi lần cập nhật 1 phút, tính lại cho "hàng triệu người dùng/đội hình ảo" | Mỗi lần dữ liệu trận đổi: tính lại điểm **mọi cầu thủ của trận**, cập nhật số liệu tổng hợp, rồi **đẩy kết quả tới hàng triệu người đang xem** (cache + socket + thông báo) | 12.3 |
| | Đính chính điểm: VAR huỷ bàn, phạt đền bị huỷ, nhà cung cấp sửa dữ liệu | Tính lại có kiểm soát, lưu vết, báo cho người xem | 12.4 |
| | Leaderboards: tổng điểm, xếp hạng **người dùng** theo tuần/mùa | **Bảng xếp hạng CẦU THỦ** (điểm trung bình, bàn thắng, kiến tạo, số lần xuất sắc nhất trận) theo đợt tập trung / giải / năm | 12.5 |
| **DEV 4** | Schema Users, Players, Teams, Matches, Squads, Leagues; index để truy vấn < 50ms | Squads = **đợt triệu tập**; Leagues = **giải đấu** (ASEAN Cup, Asian Cup, vòng loại World Cup, SEA Games, giao hữu) + BXH bảng đấu | 9 |
| | Đăng ký, đăng nhập (JWT, Refresh Token), Google OAuth2, Facebook SDK, quên mật khẩu (OTP/link qua email) | Như kế hoạch + gộp tài khoản an toàn | 13 |
| | API hồ sơ + lưu cấu hình `is_senior_mode`, `theme_id` | Đúng tên cột theo kế hoạch | 13.2 |
| **DEV 5** | REST/GraphQL cho 5 tab chính | **REST**, mỗi màn một endpoint gộp; 5 tab theo danh sách lần 1 | 14.1–14.2 |
| | Nén JSON, phân trang | Brotli/gzip, ETag/304, phân trang cursor | 14.3 |
| | Unit test, Swagger/Postman | Vitest + Supertest; OpenAPI sinh tự động từ `zod` | 14.4–14.5 |
| | Stress test khi trận hot | k6: 20.000 người dùng ảo, đỉnh bàn thắng, gửi thông báo hàng loạt | 14.6 |

### A4.1. ➕ Bảng kế hoạch phân công sau khi bổ sung — bản chốt để gửi nhóm

> Giữ nguyên định dạng kế hoạch của bạn. **➕ = việc bổ sung bạn đã duyệt ngày 11/09/2026.** DEV 3 đổi tên theo đúng nội dung (không làm game). Chi tiết kỹ thuật của từng việc nằm ở cột "Mục" trong bảng A4 và mục 2.1–2.2.

👤 **DEV 1: Tech Lead & AI Specialist** (Trưởng nhóm & Lập trình AI) — Mức độ tải: 100%
1. Kiến trúc hệ thống & DevOps: Modular Monolith, CI/CD, Docker, Cloud (GCP/AWS), API Gateway.
2. Trợ lý AI (RAG / Function Calling): AI tự truy vấn DB (kết quả trận, thông số cầu thủ, bảng xếp hạng) trước khi trả lời; bộ nhớ hội thoại; tối ưu chi phí token.
3. ➕ Build EAS và phát hành lên App Store / Google Play (cùng DEV 6).

👤 **DEV 2: Data Ingestion & Integration Developer** (Xử lý dữ liệu bóng đá 1 phút/lần) — Mức độ tải: 100%
1. Tích hợp API bên thứ 3 (Sportmonks, RapidAPI…): trận đấu, đội hình, giá trị cầu thủ.
2. Hệ thống polling tự làm mới 1 phút/lần (BullMQ) cho trận đấu & đội hình.
3. Tầng cache Redis cho dữ liệu trận đang diễn ra.
4. Cập nhật biến động giá trị cầu thủ theo phong độ/thời gian.
5. ➕ Dữ liệu **BXH bảng đấu** của các giải (ASEAN Cup, vòng loại Asian Cup/World Cup, SEA Games…) và **danh sách triệu tập** từng đợt (tự lấy từ API; admin nhập khi API thiếu).

👤 **DEV 3: Engine chấm điểm cầu thủ & Nghiệp vụ** (tên cũ trong kế hoạch: "Scoring & Business Logic — Fantasy") — Mức độ tải: 100%
1. Bộ quy tắc quy đổi sự kiện (bàn thắng, kiến tạo, thẻ phạt, cứu thua, giữ sạch lưới…) thành điểm theo vị trí (Thủ môn, Hậu vệ, Tiền vệ, Tiền đạo).
2. Chấm lại điểm mỗi khi DEV 2 cập nhật dữ liệu trận, phát kết quả tới người xem.
3. Đính chính điểm: VAR huỷ bàn, phạt đền bị huỷ, nhà cung cấp sửa dữ liệu.
4. Bảng xếp hạng **cầu thủ** theo đợt tập trung / giải / năm.
5. ➕ **Theme phía server**: chọn theme đang áp dụng, tự bật "Đi bão" / "Tiếp lửa" sau trận, kiểm tra độ tương phản khi admin tạo theme.
6. ➕ **Trang quản trị** (phần nội dung): sửa điểm tay, nhập liệu khi API thiếu, quản lý theme, slide giới thiệu, thành tích, danh sách triệu tập.

👤 **DEV 4: Core Database & Auth Developer** (Cơ sở dữ liệu & Xác thực) — Mức độ tải: 90% → **100%**
1. Thiết kế schema PostgreSQL (Users, Players, Teams, Matches, Squads = đợt triệu tập, Leagues = giải đấu + BXH bảng đấu); index để truy vấn dưới 50ms.
2. Auth: đăng ký, đăng nhập (JWT, Refresh Token), Google OAuth2, Facebook SDK, quên mật khẩu (OTP qua email).
3. API hồ sơ + cấu hình người dùng `is_senior_mode`, `theme_id`.
4. ➕ **Sign in with Apple** (điều kiện để qua duyệt App Store khi có đăng nhập Google/Facebook).
5. ➕ **Xoá tài khoản** (bắt buộc để lên store), ảnh đại diện, `/app/bootstrap`, slide giới thiệu.
6. ➕ **Phân quyền trang quản trị** (chỉ admin mới vào được, ghi nhật ký mọi thao tác).

👤 **DEV 5: Read-APIs, Realtime & Testing Developer** (API hiển thị & kiểm thử) — Mức độ tải: 90% → **100%**
1. API cho 5 tab: Giới thiệu & Thành tích · Trận đấu · Đội hình · Cầu thủ · Thống kê sau trận.
2. Tối ưu payload: nén JSON, phân trang.
3. Unit test, tài liệu Swagger / Postman.
4. Stress test khi trận hot.
5. ➕ **Realtime Socket.IO**: tỷ số, diễn biến, điểm cầu thủ, theme, danh sách triệu tập mới.
6. ➕ **Thông báo đẩy** (FCM): bàn thắng, đội hình ra sân, điểm cầu thủ, triệu tập… bật/tắt theo cài đặt.
7. ➕ API **BXH bảng đấu** và **danh sách triệu tập**.

👤 ➕ **DEV 6: Mobile Developer** (React Native / Expo) — Mức độ tải: 100% (1–2 người)
1. Mở app: splash có tên app → giới thiệu chung về đội tuyển; đăng nhập / đăng ký (email, Google, Facebook, Apple), quên mật khẩu.
2. Thanh 5 tab kiểu App Store và các màn: Giới thiệu & Thành tích, Trận đấu + chi tiết trận, Đội hình (điểm + thẻ trên đầu cầu thủ), Cầu thủ, Thống kê; ➕ BXH bảng đấu, danh sách triệu tập.
3. Cài đặt: hồ sơ, ảnh đại diện, theme sự kiện, giao diện người lớn tuổi, thông báo, xoá tài khoản.
4. Theme phía app (hiệu ứng Đi bão, Tết…), Senior mode (chữ to, 3 tab, đọc to tỷ số), màn chat Trợ lý AI.
5. Kết nối API bằng client sinh từ Swagger, realtime, nhận thông báo đẩy; build EAS cùng DEV 1.

> Nếu chỉ tuyển được 1 dev mobile: làm theo thứ tự lộ trình ở mục 18. Nếu chưa tuyển được: DEV 5 kiêm khoảng 50% phần mobile trong thời gian đầu.

## A5. Claude đề nghị thêm / thấy còn thiếu 💡

### A5.1. Còn thiếu trong kế hoạch phân công — nên xử lý trước khi bắt đầu (P0)

> ✅ **Bạn đã duyệt #1–#8 ngày 11/09/2026** (dev mobile, 7 việc chưa có người nhận, gồm BXH bảng đấu và danh sách triệu tập) → đã đưa vào bảng kế hoạch **A4.1** và phân công **mục 2.1–2.2**. Mục #9 (pháp lý) vẫn cần luật sư xác nhận.

| # | Việc còn thiếu | Vì sao quan trọng | Đề xuất |
|---|---|---|---|
| 1 | **Không có dev làm app mobile** — cả 5 người đều làm backend | Phần lớn khối lượng nằm ở giao diện: splash, giới thiệu, 5 tab, chi tiết trận, sơ đồ có điểm, theme, Senior mode, chat AI | Thêm 1–2 dev React Native. Nếu không thể: DEV 5 chuyển khoảng 50% sang mobile |
| 2 | Theme phía backend (chọn theme đang áp dụng, tự bật "Đi bão/Tiếp lửa", kiểm tra độ tương phản) | Tính năng bạn đã chọn nhưng chưa ai nhận | DEV 3 (engine chấm điểm không chiếm đủ 100% tải) |
| 3 | Trang quản trị: sửa điểm tay, nhập liệu khi API thiếu, quản lý theme, slide giới thiệu, thành tích | Dữ liệu ĐTVN trên API quốc tế thường thiếu → phải có công cụ nhập tay | DEV 3 + DEV 4 (phân quyền admin) |
| 4 | Realtime Socket.IO + thông báo đẩy | Tỷ số live, "đội hình đã công bố", "điểm cầu thủ đã có" | DEV 5 |
| 5 | `/app/bootstrap`, slide giới thiệu, ảnh đại diện, **xoá tài khoản** | Xoá tài khoản là **bắt buộc** để lên App Store / Google Play | DEV 4 |
| 6 | **BXH bảng đấu của giải** (VN đứng thứ mấy ở bảng) và **danh sách triệu tập** | Kế hoạch có nhắc "bảng xếp hạng" và "Squads/Leagues" nhưng chưa có màn hình | DEV 2 (dữ liệu) + DEV 5 (API) |
| 7 | Build EAS và phát hành lên store | Không ai phụ trách | DEV 1 |
| 8 | **Sign in with Apple** | App iOS có đăng nhập Google/Facebook thì theo App Store Guideline 4.8 phải có thêm lựa chọn đăng nhập bảo vệ quyền riêng tư | DEV 4 |
| 9 | Pháp lý: Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 (hiệu lực 01/01/2026), bản quyền video/logo, điều khoản cấm cào dữ liệu của Transfermarkt | Tránh bị gỡ app hoặc bị phạt | Mục 17 |

### A5.2. Đề xuất mới từ lần so sánh đối thủ này (P1)

| # | Đề xuất | Lý do |
|---|---|---|
| 1 | **"Vì sao được 8.3 điểm?"** — chạm vào điểm của cầu thủ để xem bảng cộng/trừ | FotMob, SofaScore đều chấm điểm cầu thủ nhưng không giải thích từng điểm cộng/trừ. Engine của DEV 3 làm được việc này → **điểm khác biệt thật** |
| 2 | **Kênh phát sóng** cho từng trận (VTV, FPT Play, TV360…) | Người Việt rất cần; đã có trong thiết kế (`matches.tv_channels`) |
| 3 | **Chấn thương & treo giò** (cảnh báo khi cầu thủ đã có 1 thẻ vàng trong giải) | Đã có một phần ở hồ sơ cầu thủ (5.4); nên thêm vào trợ lý AI và màn trận sắp đá |
| 4 | **Theo dõi cầu thủ yêu thích** + thông báo riêng (cầu thủ được triệu tập, ghi bàn, được điểm cao) | Cá nhân hoá — lý do để người dùng giữ app |
| 5 | **Radar phong độ cầu thủ ĐTVN tại CLB** (V.League và nước ngoài) | Khớp với "BXH theo tuần/mùa" (DEV 3) và "giá trị theo phong độ" (DEV 2). Phụ thuộc dữ liệu CLB → giai đoạn 2 |
| 6 | **Điểm tạm tính trong lúc trận đang đá** | FotMob, SofaScore đều có; engine tính được vì dữ liệu về mỗi phút |
| 7 | Widget màn hình chính / Live Activity (iOS) cho tỷ số | Xem tỷ số không cần mở app — rất hợp người lớn tuổi |

### A5.3. Các đề xuất Claude đã gửi ở lần 1 mà bạn **chưa chọn** (để bạn chọn tiếp)

| Đề xuất | Loại | Ghi chú |
|---|---|---|
| Chống spoil: giữ thông báo bàn thắng cho khớp độ trễ của TV/stream | Khác biệt | Ít công sức, chưa đối thủ nào có |
| Bản đồ cổ vũ 34 tỉnh thành trong lúc trận diễn ra | Khác biệt, cộng đồng | Dùng Socket.IO sẵn có |
| Bình chọn cầu thủ xuất sắc nhất trận (người hâm mộ bầu) | Cộng đồng | Là bình chọn, không phải game |
| So sánh 2 cầu thủ cạnh nhau | Thông tin | Ít công sức |
| Chọn đội tuyển: ĐTQG nam, U23, U20, nữ | Mở rộng | Schema đã hỗ trợ nhiều `teams` |
| Tin tức tổng hợp (RSS từ VFF và báo thể thao) | Nội dung | Cần kiểm tra bản quyền |
| Cỗ máy thời gian: xem lại AFF 2008, Thường Châu 2018… như trực tiếp | Nội dung hoài niệm | Nhập dữ liệu tay |
| Tìm điểm xem bóng / fan zone gần bạn | Cộng đồng | Cần đối tác |
| Nút "Thêm vào lịch" cho trận đấu | Tiện ích | `expo-calendar` |
| Ngôn ngữ Việt/Anh | Mở rộng | Cho Việt kiều, người nước ngoài |
| Dự đoán tỷ số, "Hợp ý HLV bao nhiêu %", Hộ chiếu CĐV | ⚠️ Mang tính trò chơi | **Đề xuất bỏ** vì bạn không muốn app thành game |

## A6. Câu hỏi cần bạn chốt

1. **DEV 6 (Mobile)**: tuyển 1 hay 2 người? Nếu chưa tuyển được thì DEV 5 kiêm khoảng 50% trong thời gian đầu (A4.1).
2. ✅ **Đã chốt 12/09** — không cần trả lời nữa: cả **5 tab nằm ở thanh dưới** (Giới thiệu · Trận đấu · Đội hình · Cầu thủ · Thống kê), **Cài đặt** mở từ ảnh đại diện góc phải, **Trợ lý AI** nằm trong tab Thống kê (mục 4.2, 5.6).
3. **Điểm hiển thị** trên đầu cầu thủ: dùng điểm do **engine của app tính** (giải thích được từng điểm) hay điểm của **nhà cung cấp dữ liệu**? Tài liệu đang chọn engine (`RATING_PRIMARY_SOURCE=engine`).
4. **Tỷ số khi đang đá**: giữ **1 phút/lần** như kế hoạch, hay nhanh hơn (12–15 giây) cho bằng đối thủ?
5. Cloud **GCP hay AWS**?
6. Bạn chọn thêm những đề xuất nào ở A5.2 và A5.3?

---

# PHẦN B — THIẾT KẾ CHI TIẾT

## 1. TỔNG QUAN

### 1.1. Sản phẩm

Ứng dụng di động cung cấp thông tin chi tiết, tỷ số trực tiếp, đội hình, thông số sau trận, điểm cầu thủ và trợ lý AI về Đội tuyển Bóng đá Quốc gia Việt Nam. Toàn bộ dữ liệu lưu trong **PostgreSQL**. Google Gemini dùng cho trợ lý hỏi đáp và dự đoán tỷ lệ Thắng / Hòa / Thua.

### 1.2. Công nghệ

| Thành phần | Công nghệ | Chủ sở hữu |
|---|---|---|
| Mobile | React Native + Expo SDK (TypeScript), Expo Router, React Query, Zustand ✅ | ➕ **DEV 6** |
| Backend | Node.js 22 + Express + TypeScript — **Modular Monolith** ✅ | DEV 1 (khung) · mọi dev (module) |
| Database | **PostgreSQL 16** — nguồn dữ liệu duy nhất; `pgvector` cho trợ lý AI | DEV 4 |
| Cache / hàng đợi | **Redis ×2**: cache (`allkeys-lru`) và queue (`noeviction`, bắt buộc với BullMQ) | DEV 2 |
| Job định kỳ | **BullMQ** (lịch lặp + job hẹn giờ), múi giờ `Asia/Ho_Chi_Minh` | DEV 2 · DEV 3 |
| Realtime | Socket.IO + `@socket.io/redis-adapter` ✅ | DEV 5 |
| Thông báo đẩy | Firebase Cloud Messaging qua `expo-notifications` ✅ | DEV 5 |
| Lưu file (ảnh đại diện, tài nguyên theme) | Object storage (Cloud Storage / S3) + CDN | DEV 4 |
| Email (mã OTP) | Resend / SMTP | DEV 4 |
| AI | Google Gemini (mặc định) / OpenAI (dự phòng) qua adapter chung ✅ | DEV 1 |
| Dữ liệu bóng đá | API-Football (trực tiếp hoặc qua RapidAPI) / Sportmonks | DEV 2 |
| Tài liệu API · kiểm thử | OpenAPI 3.1 từ `zod` → Swagger UI + Postman · Vitest, Supertest, k6 | DEV 5 |
| Hạ tầng | Docker · GitHub Actions · GCP (đề xuất) hoặc AWS | DEV 1 |

### 1.3. Tần suất cập nhật dữ liệu

| Dữ liệu | Yêu cầu | Cách hiện thực | Mục |
|---|---|---|---|
| Trận đấu (giờ, sân, trạng thái, kênh phát sóng) | **1 phút/lần** | 1 phút/lần trong khung **3 giờ trước → 3 giờ sau** giờ bóng lăn; ngoài khung 1 lần/ngày (01:20) | 11.3 |
| Tỷ số & diễn biến khi đang đá | 1 phút/lần | 1 phút/lần theo kế hoạch (`INGEST_LIVE_INTERVAL_SEC=60`). 💡 Đề xuất 12–15 giây cho bằng đối thủ | 11.3 |
| Đội hình | **1 phút/lần** | 1 phút/lần từ **90 phút trước trận** tới khi hết trận; ngoài khung 1 lần/ngày (01:00) | 11.3 |
| Thông tin cầu thủ (CLB, chiều cao, số trận, bàn ĐTQG) | Định kỳ | 1 lần/ngày (01:10) | 11.2 |
| Giá trị cầu thủ | Biến động theo phong độ/thời gian | Giá trị gốc 1 lần/ngày; **giá trị ước tính** cập nhật sau mỗi trận đã chốt điểm + 03:00 hằng ngày | 11.5 |
| Điểm cầu thủ & thông số sau trận | Ngay sau trận | Tạm tính lúc hết trận → cập nhật sau 15 phút → **chốt sau 60 phút** | 12.3 |
| BXH cầu thủ | Theo tuần / mùa | Tính lại sau mỗi lần chốt hoặc đính chính điểm | 12.5 |
| BXH FIFA · BXH bảng đấu | – | 1 lần/ngày · sau mỗi trận của giải | 11.2 |

> **Vì sao không gọi API 1 phút/lần suốt 24 giờ?** Mỗi loại dữ liệu sẽ tốn 1.440 lượt/ngày, vượt xa hạn mức gói miễn phí (thường khoảng 100 lượt/ngày), trong khi phần lớn thời gian không có gì thay đổi. Job vẫn **chạy mỗi phút** nhưng chỉ gọi API ngoài khi đang trong khung giờ thi đấu; ngoài khung, nó chỉ chạy một câu truy vấn DB rất nhẹ rồi thoát.

### 1.4. Mục tiêu phi chức năng & giả định quy mô

| Hạng mục | Mục tiêu | Chủ |
|---|---|---|
| Truy vấn DB (p95) | **< 50ms** | DEV 4 |
| Read API (p95) | < 150ms khi có cache, < 300ms khi không | DEV 5 |
| Độ trễ dữ liệu trận (nhà cung cấp → app) | ≤ 60 giây theo kế hoạch | DEV 2 |
| Điểm cầu thủ sau khi có dữ liệu mới | ≤ 30 giây | DEV 3 |
| Thông báo "điểm cầu thủ đã có" tới toàn bộ thiết bị | ≤ 2 phút | DEV 5 |
| Trợ lý AI | Hiện chữ đầu tiên < 2 giây (streaming) | DEV 1 |
| Khả dụng | 99,5%/tháng; trận hot không sập | DEV 1 · DEV 5 |

Giả định định cỡ (cần xác nhận): **1 triệu** lượt cài đặt, **50.000** người mở app cùng lúc trong trận hot, đỉnh **5.000 request/giây**.

---

## 2. TỔ CHỨC NHÓM & PHÂN CÔNG

### 2.1. Phân công theo kế hoạch của bạn (đã bổ sung 11/09/2026)

Bảng kế hoạch đầy đủ theo định dạng của bạn: **A4.1**.

| Dev | Vai trò | Module / phần việc | Bảng DB được ghi | Tiến trình / queue | Nhóm `.env` |
|---|---|---|---|---|---|
| **DEV 1** (100%) | Tech Lead & AI | `shared/*` (khung app), `modules/ai`; ➕ build EAS & phát hành store | `ai_*`, `kb_*`, `ai_predictions` | `api` (khung), `ai.kb-index` | 1, 2, 9, 15 |
| **DEV 2** (100%) | Data Ingestion 1 phút/lần | `modules/ingestion`; ➕ dữ liệu BXH bảng đấu & danh sách triệu tập | `matches`, `match_events`, `lineups*`, `match_stats`, `player_match_stats` (phần số liệu), ➕ `competition_standings`, ➕ `squads*`, `external_refs`, `player_value_history` | `worker-ingest`, `scheduler` | 4, 10, 11 |
| **DEV 3** (100%) | **Engine chấm điểm cầu thủ** & nghiệp vụ | `modules/rating`; ➕ `modules/themes` (theme phía server); ➕ `modules/admin` (phần nội dung) | `player_match_stats` (các cột điểm), `rating_*`, `player_rating_stats`; ➕ `themes`, `theme_schedules`, `team_profiles`, `achievements`, `onboarding_slides` | `worker-rating`, ➕ `theme.schedule` | 12 |
| **DEV 4** (90% → **100%**) | Database & Auth | `db/migrations`, `modules/auth`, `modules/users`; ➕ `modules/app` (`/app/bootstrap`, slide giới thiệu); ➕ Sign in with Apple, xoá tài khoản, ảnh đại diện, phân quyền admin | `users`, `user_identities`, `refresh_tokens`, `password_reset_codes`, `user_settings`, ➕ `audit_logs` + **duyệt mọi migration** | – | 3, 5, 6, 7 |
| **DEV 5** (90% → **100%**) | Read-API, Realtime & Test | `modules/{team,matches,players,squad,stats,ranking}` (đọc) + ➕ `/competitions`, `/squads`; ➕ `realtime`, ➕ `notifications` (FCM); OpenAPI, test | `device_tokens` | `api` (route đọc), ➕ `notify.push`, k6 | 8, 13, 14, 16 |
| ➕ **DEV 6** (100%, 1–2 người) | **Mobile** (React Native / Expo) | Toàn bộ `mobile/` — mục 4–7 | – | EAS Build (cùng DEV 1) | 17 |

### 2.2. ➕ Việc bổ sung đã giao (bạn duyệt 11/09/2026)

| # | Việc | Người nhận | Thiết kế ở mục |
|---|---|---|---|
| 1 | **App mobile** (toàn bộ giao diện) | **DEV 6** (1–2 người); chưa tuyển được thì DEV 5 kiêm khoảng 50% | 4–7 |
| 2 | Theme phía server (chọn theme, tự bật Đi bão/Tiếp lửa, kiểm tra tương phản) | DEV 3 | 6.3, 6.5 |
| 3 | Trang quản trị `/admin/*` | DEV 3 (nội dung, sửa điểm, nhập liệu) + DEV 4 (phân quyền, nhật ký) | 8.2, 8.5 |
| 4 | Realtime Socket.IO + thông báo đẩy | DEV 5 | 8.4, 8.6, 15 |
| 5 | `/app/bootstrap`, slide giới thiệu, ảnh đại diện, **xoá tài khoản** | DEV 4 | 4.1, 5.5, 13 |
| 6 | **BXH bảng đấu** + **danh sách triệu tập** | DEV 2 (dữ liệu) + DEV 5 (API) + DEV 6 (màn hình) | 5.8, 8.5, 9.3, 11.2 |
| 7 | Build EAS & phát hành store | DEV 1 + DEV 6 | 3.9 |
| 8 | Sign in with Apple | DEV 4 | 13.1 |

### 2.3. Hợp đồng giao tiếp giữa các dev

Mỗi hợp đồng có **một chủ sở hữu**, được viết thành code (type/schema) và có test. Muốn đổi hợp đồng phải qua PR được bên sử dụng duyệt.

| Mã | Hợp đồng | Chủ | Bên dùng | Hình thức |
|---|---|---|---|---|
| **C1** | Schema DB & migration | DEV 4 | Tất cả | `db/migrations/*.sql` |
| **C2** | Sự kiện `match.updated` (dữ liệu trận vừa đổi) | DEV 2 | DEV 3, DEV 5, DEV 1 | zod schema `shared/events/match-updated.ts` (mục 11.6) |
| **C3** | Khoá Redis dữ liệu live `live:*` | DEV 2 | DEV 5, DEV 1 | `shared/cache/keys.ts` (mục 11.4) |
| **C4** | Điểm cầu thủ & BXH cầu thủ | DEV 3 | DEV 5, DEV 1 | cột `rating*` của `player_match_stats`, bảng `player_rating_stats` (mục 12) |
| **C5** | Middleware xác thực `requireAuth / optionalAuth / requireRole` | DEV 4 | Tất cả | `shared/http/auth.ts` |
| **C6** | OpenAPI cho mobile | DEV 5 | DEV 6 (Mobile) | `openapi.json` + client TypeScript sinh tự động |
| **C7** | Tool của trợ lý AI | DEV 1 | – | Tool **gọi service đọc** của DEV 5/DEV 3, **không tự viết SQL** |

### 2.4. Quy tắc chung

- **Ranh giới module**: module khác chỉ được gọi qua `modules/<x>/index.ts` hoặc qua sự kiện; cấm đọc/ghi thẳng bảng của module khác (CI kiểm tra bằng `dependency-cruiser`). Nhờ vậy sau này tách microservice không phải viết lại.
- Ai viết module nào thì **viết migration và unit test** cho module đó; DEV 4 giữ quy ước và review mọi migration.
- Mọi thời gian lưu `TIMESTAMPTZ` (UTC), chỉ đổi sang giờ Việt Nam khi hiển thị.

---

## 3. KIẾN TRÚC HỆ THỐNG & DEVOPS (DEV 1)

### 3.1. Quyết định: Modular Monolith (không phải Microservices)

| Tiêu chí | Modular Monolith | Microservices |
|---|---|---|
| Nhóm 5 người | 1 repo, 1 image, 1 pipeline | 5+ service, 5+ pipeline, cần người lo hạ tầng toàn thời gian |
| Giao dịch (chốt điểm + cập nhật BXH, đổi mật khẩu + thu hồi phiên) | Transaction PostgreSQL thường | Giao dịch phân tán |
| Chịu tải lúc trận hot | Scale **theo vai trò tiến trình** (`api`, `worker-rating`) độc lập | Scale theo service |
| Tách sau này | Được, nhờ ranh giới module + sự kiện (2.4) | – |

→ **Một codebase, một Docker image, chạy nhiều vai trò** qua biến `APP_ROLE`. Phần nặng (gọi API ngoài, tính điểm, gửi thông báo hàng loạt) chạy ở worker riêng nên không làm chậm API.

### 3.2. Sơ đồ tổng thể

```
┌──────────────────────────────────────────────────────────────────────┐
│                  MOBILE APP — "Đội tuyển Việt Nam"                   │
│  Splash ─► Giới thiệu đội tuyển ─► (Đăng nhập | Khách) ─► 5 tab      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      [👤] │
│  │Giới thiệu│ Trận đấu │ Đội hình │ Cầu thủ  │ Thống kê │   Cài đặt │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘           │
│                       tab Thống kê: ① Thống kê ↔ ② Trợ lý AI        │
│  ThemeProvider (sáng/tối + theme sự kiện + Senior mode)              │
└───────────────┬───────────────────────────────┬──────────────────────┘
          HTTPS REST /api/v1               WSS Socket.IO · SSE (chat AI)
┌───────────────▼───────────────────────────────▼──────────────────────┐
│  GATEWAY: HTTPS Load Balancer + WAF (Cloud Armor) + CDN (GET công khai)│
└───────────────┬──────────────────────────────────────────────────────┘
┌───────────────▼──────────────────────────────────────────────────────┐
│ api (N instance)                                      APP_ROLE=api   │
│ auth · users · team · matches · squad · players · stats · rating(đọc)│
│ themes · app · ai (chat SSE) · realtime · notifications · admin      │
└──────┬────────────────────┬───────────────────────┬──────────────────┘
       │                    │ enqueue               │ đọc live, BXH
┌──────▼──────┐   ┌─────────▼────────┐    ┌─────────▼──────────┐
│ PostgreSQL  │   │ Redis QUEUE      │    │ Redis CACHE        │
│ primary +   │   │ BullMQ,noeviction│    │ live:* cache:* lb:*│
│ read replica│   └──┬────────────┬──┘    │ socket adapter     │
│ + pgvector  │      │            │       └─────▲─────────▲────┘
└──▲──────▲───┘ ┌────▼──────┐ ┌───▼─────────┐   │         │
   │      └─────┤ worker-   │ │ worker-     ├───┘         │
   │            │ ingest    │ │ rating      │             │
   │            │ (DEV 2)   │ │ (DEV 3)     │             │
   │            └────┬──────┘ └─────────────┘             │
   │                 │ mỗi 60 giây                        │
   │  ┌──────────────▼──────────────┐   ┌─────────────────┴─────┐
   │  │ API bóng đá: API-Football / │   │ scheduler (đúng 1 bản)│
   │  │ Sportmonks (/RapidAPI)      │   │ lịch lặp BullMQ       │
   │  └─────────────────────────────┘   └───────────────────────┘
   │  Dịch vụ ngoài khác: Gemini/OpenAI · FCM · Email OTP · Object storage
   └── migration job (chạy 1 lần mỗi lần deploy)
```

### 3.3. Vai trò tiến trình (`APP_ROLE`)

| Vai trò | Chạy gì | Số bản | Ghi chú |
|---|---|---|---|
| `api` | REST + Socket.IO + SSE chat AI | 2 → N (tự scale) | Không giữ trạng thái; Socket.IO cần sticky session + redis-adapter |
| `worker-ingest` | Queue `ingest.*`, `player.value` | 1–2 | Giới hạn song song để không vượt hạn mức API |
| `worker-rating` | Queue `rating.*`, `leaderboard.*`, `notify.push` | 1 → N | Scale lên trong giờ thi đấu |
| `scheduler` | Đăng ký lịch lặp của BullMQ | **Đúng 1** | Thay `CRON_ENABLED` của bản cũ |
| `all` | Tất cả trong 1 tiến trình | 1 | Chỉ dùng khi dev trên máy cá nhân |

### 3.4. Cấu trúc thư mục backend

```
backend/src/
├── entrypoints/            # 🆕 api.ts · worker-ingest.ts · worker-rating.ts · scheduler.ts
├── shared/                 # DEV 1 — dùng chung, không chứa nghiệp vụ
│   ├── config/env.ts       # ✅ đọc .env ở gốc repo (mục 16)
│   ├── db/  cache/  queue/ # pool primary + replica · Redis + keys.ts (C3) · BullMQ
│   ├── events/             # zod schema sự kiện (C2)
│   ├── http/               # auth (C5), validate, error, rateLimit, compression, etag
│   └── observability/      # logger, metrics, tracing
├── modules/
│   ├── auth/ users/        # DEV 4 — đăng nhập, Google/Facebook, OTP, hồ sơ, cài đặt, ảnh đại diện
│   ├── ingestion/          # DEV 2 — providers/{apiFootball,sportmonks}.adapter.ts · normalizer · poller · value
│   ├── rating/             # DEV 3 — rules/ · engine.ts (hàm thuần) · finalize · corrections · leaderboard
│   ├── team/ matches/ squad/ players/ stats/ ranking/   # DEV 5 (đọc)
│   ├── ai/                 # DEV 1 — chat/ · tools/ · rag/ · memory/ · prediction/ (dự đoán ✅)
│   ├── themes/ app/        # Theme sự kiện, /app/bootstrap, slide giới thiệu
│   ├── realtime/ notifications/ devices/   # DEV 5
│   └── admin/              # CRUD nội dung, sửa điểm tay, nhập liệu
└── db/migrations/          # ✅ 001_init · 002_features (9.2) · 003_team_plan (9.3)
                            #   004_rag_vector.pg.sql (chỉ PostgreSQL thật) · 005_summary_view_soft_delete
```

### 3.5. Luồng dữ liệu trong một trận

```
[API bóng đá] ──(1) mỗi 60 giây──► worker-ingest (DEV 2)
                                    │ (2) chuẩn hoá + so hash từng phần (tỷ số, sự kiện, đội hình, thống kê)
                                    │     không đổi → dừng, không ghi DB
                                    ▼ có thay đổi
                  (3) ghi Redis live:* ─┬─ (4) upsert PostgreSQL (1 transaction), tăng data_version
                                        └─ (5) phát sự kiện match.updated
                                                   │
         ┌─────────────────────────────────────────┼─────────────────────────────┐
         ▼                                         ▼                             ▼
 realtime (DEV 5): emit          worker-rating (DEV 3):                  xoá cache:* liên quan
 score:update, match:event       (6) chấm lại điểm mọi cầu thủ của trận
                                 (7) hết trận: tạm tính → T+15′ → chốt T+60′
                                 (8) cập nhật BXH cầu thủ, giá trị ước tính
                                 (9) emit match:ratings + thông báo "Điểm cầu thủ đã có"
```

Đường đọc: App → CDN (GET công khai, cache 5–300 giây) → `api` → Redis → PostgreSQL replica.

### 3.6. API Gateway

| Việc | Đặt ở đâu |
|---|---|
| TLS, định tuyến, chống DDoS, WAF, rate-limit theo IP | **Load Balancer + Cloud Armor** (GCP) / **ALB + AWS WAF** (AWS) |
| Cache GET công khai (`/matches/live`, `/team/*`, `/stats/*`…) | **CDN** trước LB, theo `Cache-Control: s-maxage` do API trả về |
| Xác thực JWT, phân quyền, rate-limit theo người dùng | **Trong app** (middleware C5) |
| WebSocket / SSE | Qua LB, bật session affinity |

Không dùng Google API Gateway vì dịch vụ này không hỗ trợ WebSocket. Khi nào tách microservice thì mới cân nhắc Kong hoặc Envoy.

### 3.7. Hạ tầng Cloud (đề xuất GCP, kèm bảng tương đương AWS)

| Thành phần | GCP (đề xuất) | AWS tương đương |
|---|---|---|
| `api` | Cloud Run (min 2 instance, session affinity) | ECS Fargate + ALB |
| Worker, scheduler | Cloud Run (CPU always allocated) hoặc GKE Autopilot | ECS Fargate |
| PostgreSQL | Cloud SQL for PostgreSQL 16 (HA, read replica, PITR) | RDS / Aurora PostgreSQL |
| Redis ×2 | Memorystore | ElastiCache |
| Ảnh, tài nguyên theme | Cloud Storage + Cloud CDN | S3 + CloudFront |
| Bí mật | Secret Manager (cùng tên biến với `.env`) | Secrets Manager |
| Log / metrics | Cloud Logging + Monitoring + OpenTelemetry | CloudWatch |

Lý do chọn GCP: Gemini chung hoá đơn và IAM; region `asia-southeast1` (Singapore) gần Việt Nam.
⚠️ Nếu công ty là doanh nghiệp trong nước, quy định về lưu trữ dữ liệu người dùng tại Việt Nam (Luật An ninh mạng + Nghị định 53/2022) có thể bắt buộc đặt DB người dùng tại Việt Nam (Viettel IDC, VNG Cloud, FPT Cloud…). **Cần luật sư xác nhận trước khi chọn region.**

### 3.8. Docker & môi trường local

`docker-compose.yml` ở gốc repo đọc chung file `.env` (mục 16).

| Service | Image | Ghi chú |
|---|---|---|
| `postgres` | `pgvector/pgvector:pg16` | Dùng `DB_USER/DB_PASSWORD/DB_NAME` của `.env` |
| `redis-cache` | `redis:7` `--maxmemory-policy allkeys-lru` | cổng 6379 |
| `redis-queue` | `redis:7` `--maxmemory-policy noeviction --appendonly yes` | cổng 6380 |
| `api`, `worker-ingest`, `worker-rating`, `scheduler` | build từ `backend/Dockerfile` (multi-stage, user non-root) | cùng image, khác `APP_ROLE` |

`DB_DRIVER=pglite` (không cần cài gì) vẫn dùng được cho học tập và unit test ✅.
⚠️ Thư mục `backend/data/pgdata/` (file dữ liệu PGlite) **đang bị commit vào git** → cần `git rm -r --cached backend/data` và thêm `data/` vào `.gitignore`.

### 3.9. CI/CD (GitHub Actions)

```
Pull request: lint → typecheck → unit test → integration test (PostgreSQL + Redis thật)
              → chạy migration trên DB trống + rollback → kiểm tra khoá .env.example khớp env.ts
              → OpenAPI diff (cảnh báo thay đổi phá vỡ tương thích) → docker build
main:         build image → push registry → migration staging → deploy staging
              → smoke test + bộ đánh giá AI → duyệt tay → production (chuyển dần 10% → 100%)
Mobile:       EAS Build (preview / production) · EAS Update theo channel
```

Migration theo nguyên tắc **expand → migrate → contract** để deploy không phải dừng hệ thống.

### 3.10. Giám sát & cảnh báo

| Chỉ số | Ngưỡng cảnh báo | Chủ |
|---|---|---|
| Độ trễ ingest trong trận | > 120 giây | DEV 2 |
| Hạn mức API bóng đá đã dùng | > 80% ngân sách ngày | DEV 2 |
| Hàng đợi `rating.*` / `notify.push` tồn | > 5 phút | DEV 3 · DEV 5 |
| API p95 / lỗi 5xx | > 300ms / > 1% | DEV 5 |
| Truy vấn chậm (> 50ms) | > 20 lần/phút | DEV 4 |
| Chi phí AI trong ngày | > 80% ngân sách | DEV 1 |

---

## 4. KIẾN TRÚC FRONTEND (React Native / Expo) — DEV 6

### 4.1. Luồng mở app: Splash → Giới thiệu đội tuyển → Vào app

```
 Người dùng chạm icon
        │
        ▼
┌──────────────────────┐  (1) SPLASH GỐC — expo-splash-screen
│   [logo]             │      Ảnh tĩnh, nền #0B1220, hiện trong lúc JS đang tải.
└──────────┬───────────┘      Giữ lại bằng SplashScreen.preventAutoHideAsync()
           ▼
┌──────────────────────┐  (2) BRAND SPLASH — component <BrandSplash />
│      ★ (sao vàng)    │      • Tên app "ĐỘI TUYỂN VIỆT NAM" + khẩu hiệu
│ ĐỘI TUYỂN VIỆT NAM   │        "Tự hào Sao Vàng"
│  Tự hào Sao Vàng     │      • Hoạt ảnh: ngôi sao phóng to + chữ hiện dần (opacity/transform)
│  ▂▂▂▂ (thanh tải)    │      • Song song chạy bootstrap (bên dưới)
└──────────┬───────────┘      • Tối thiểu 1,2 giây, tối đa 2,5 giây rồi đi tiếp dù chưa xong
           │
           │   Chạy song song khi splash hiển thị:
           │     a. authStore.bootstrap()  — khôi phục phiên từ secure-store
           │     b. GET /app/bootstrap     — theme đang áp dụng, trận live, phiên bản
           │     c. settingsStore.hydrate()— chế độ hiển thị, theme người dùng chọn
           ▼
   Đã xem giới thiệu phiên bản hiện tại?  (AsyncStorage: onboarding_seen_version)
        │ chưa                                    │ rồi
        ▼                                         │
┌──────────────────────┐  (3) GIỚI THIỆU CHUNG    │
│ Slide 1: Đội tuyển   │      VỀ ĐỘI TUYỂN        │
│ Slide 2: Thành tích  │      (app/onboarding.tsx)│
│ Slide 3: HLV & ĐH    │                          │
│ Slide 4: Bắt đầu     │                          │
│  • • • ○   [Bỏ qua]  │                          │
└──────────┬───────────┘                          │
           ▼                                      ▼
   Có phiên đăng nhập?  ──── có ────►  (tabs) — Tab Giới thiệu
        │ không
        ▼
   (auth)/login   ── nút "Xem không cần đăng nhập" ──►  (tabs) chế độ khách
```

**Nội dung 4 slide giới thiệu** (lấy từ `GET /onboarding/slides`, có bản dự phòng đóng gói sẵn trong app để dùng khi mất mạng):

| Slide | Tiêu đề | Nội dung | Hình |
|---|---|---|---|
| 1 | Những chiến binh Sao Vàng | Biệt danh, liên đoàn quản lý (VFF), sân nhà Mỹ Đình, liên đoàn châu lục (AFC/AFF) | Ảnh toàn đội |
| 2 | Hành trình vinh quang | 3 lần vô địch Đông Nam Á (2008, 2018, 2024), 2 lần vào tứ kết Asian Cup (2007, 2019) | Cúp + dòng thời gian |
| 3 | Ban huấn luyện & đội hình | HLV trưởng, số cầu thủ, tổng giá trị đội hình | Ảnh HLV |
| 4 | Sẵn sàng cổ vũ! | Nút **Bắt đầu**, kèm lựa chọn nhanh **"Dùng chữ to, dễ đọc"** (bật Senior mode ngay) | Cờ đỏ sao vàng |

Quy tắc:

- 🆕 **Tự chuyển slide sau 5–7 giây** (mặc định 6 giây), có thanh tiến trình mảnh chạy ở đầu màn để người dùng biết sắp chuyển. Chạm hoặc vuốt là **dừng tự chuyển** ngay — người dùng đang tự điều khiển thì app không giành quyền. Slide cuối không tự chuyển, chờ bấm **Bắt đầu**.
- Có nút **Bỏ qua** ở mọi slide; vuốt ngang **và** nút "Tiếp" (không bắt người dùng chỉ vuốt).
- Khi admin đổi nội dung, backend tăng `version` → app hiện lại giới thiệu một lần.
- Tôn trọng "Giảm chuyển động" của hệ điều hành (`AccessibilityInfo.isReduceMotionEnabled`): tắt hoạt ảnh splash, chuyển slide không trượt.
- Xem lại được bất cứ lúc nào: Cài đặt → "Giới thiệu đội tuyển".

### 4.2. Thanh tab dưới kiểu App Store

```
┌──────────────────────────────────────────────────────────────────┐
│ Giới thiệu (Large Title)                                [👤]      │ ◄ Cài đặt (ảnh đại diện)
│                          (nội dung tab)                          │
├────────────┬────────────┬────────────┬────────────┬──────────────┤
│    🛡️      │   ⚽ •     │    ▦       │    👥      │     📊       │
│ Giới thiệu │ Trận đấu   │ Đội hình   │ Cầu thủ    │  Thống kê    │
└────────────┴────────────┴────────────┴────────────┴──────────────┘
   đang chọn: icon tô đặc + màu nhấn + chữ đậm      • = chấm đỏ khi có trận LIVE
```

✅ **Đã chốt 12/09**: cả **5 tab nằm ở thanh dưới**, đúng danh sách bạn gửi ở lần 1 (A2). **Cài đặt** mở từ **ảnh đại diện góc phải**, giống nút tài khoản của App Store (component `AccountButton` đã có ✅). **Trợ lý AI** không còn là nút riêng trên header mà là **khung thứ hai trong tab Thống kê** (mục 5.6).

| Tab / nút | Route | Icon (Ionicons, chọn / thường) | Nội dung |
|---|---|---|---|
| 1. Giới thiệu | `(tabs)/index` | `shield` / `shield-outline` | Giới thiệu đội tuyển, tủ danh hiệu, dòng thời gian thành tích, BXH FIFA, trận tiếp theo |
| 2. Trận đấu | `(tabs)/matches` | `football` / `football-outline` | Đang diễn ra · Sắp diễn ra · Kết quả |
| 3. Đội hình | `(tabs)/squad` | `grid` / `grid-outline` | Sơ đồ ra sân, **điểm + thẻ trên đầu cầu thủ** sau trận, danh sách triệu tập |
| 4. Cầu thủ | `(tabs)/players` | `people` / `people-outline` | Danh sách, tìm kiếm, lọc theo vị trí, hồ sơ, giá trị |
| 5. Thống kê | `(tabs)/stats` | `stats-chart` / `stats-chart-outline` | **Hai khung kéo ngang**: ① Thống kê sau trận · ② Trợ lý AI (mục 5.6–5.7) |
| Cài đặt | `settings/index` | ảnh đại diện, góc phải header | Hồ sơ, theme, người lớn tuổi, thông báo, tài khoản (mục 5.5) |

Đặc điểm "giống App Store":

1. **Icon + nhãn chữ bên dưới**, 5 tab chia đều chiều ngang, vùng chạm cả ô tab (≥ 44×44 pt; Senior mode ≥ 56 pt).
2. **Nền mờ trong suốt** (iOS: `expo-blur` `BlurView` làm `tabBarBackground`; Android: nền `surface` đặc + viền trên 1px).
3. **Tiêu đề lớn** ở đầu mỗi tab (Large Title 28–34pt), thu nhỏ khi cuộn — giống "Today / Apps" của App Store.
4. **Chạm lại tab đang mở → cuộn lên đầu** (`useScrollToTop` của React Navigation).
5. **Rung nhẹ khi chuyển tab** (`expo-haptics` `selectionAsync`).
6. **Chấm đỏ trên tab Trận đấu** khi có trận đang live (`tabBarBadge` rỗng + `tabBarBadgeStyle`).
7. Thanh tab luôn hiển thị, **không ẩn khi cuộn** — người lớn tuổi không phải "tìm lại" thanh điều hướng.
8. ⚠️ **Không ghi đè `height`/`paddingBottom` của `tabBarStyle`** (bài học ở `mobile/app/(tabs)/_layout.tsx`): muốn tab to hơn thì tăng `tabBarIconStyle.height` + `tabBarLabelStyle.fontSize/lineHeight`, để thư viện tự tính chiều cao.

Senior mode dùng bố cục tab riêng (mục 7.3): **3 tab to** — Trận đấu · Đội hình · Cài đặt; các tab còn lại ẩn bằng `href: null`.

### 4.3. Cấu trúc thư mục

```
mobile/
├── app/                              # Expo Router (định tuyến theo file)
│   ├── _layout.tsx                   # Providers + <BrandSplash/> + điều hướng lần đầu
│   ├── onboarding.tsx                # 🆕 Giới thiệu chung về đội tuyển
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx       # 🆕 Nhập email → nhập mã OTP → mật khẩu mới
│   ├── (tabs)/
│   │   ├── _layout.tsx               # 🔄 5 tab kiểu App Store (3 tab khi Senior mode)
│   │   ├── index.tsx                 # 🆕 Tab 1 — Giới thiệu & Thành tích
│   │   ├── matches.tsx               # 🔄 Tab 2 — Trận đấu (chuyển từ index.tsx cũ)
│   │   ├── squad.tsx                 # 🔄 Tab 3 — Đội hình + điểm cầu thủ sau trận
│   │   ├── players.tsx               # Tab 4 — Cầu thủ
│   │   └── stats.tsx                 # 🆕 Tab 5 — 2 khung kéo ngang: ① Thống kê · ② Trợ lý AI (5.6)
│   │   # Cài đặt không còn là tab: app/settings/index.tsx, mở từ ảnh đại diện góc phải
│   ├── match/[id].tsx                # 🔄 Chi tiết trận: 5 tab con (mục 5.2)
│   ├── player/[id].tsx               # Hồ sơ cầu thủ
│   ├── achievements.tsx              # 🆕 Toàn bộ dòng thời gian thành tích
│   └── settings/
│       ├── profile.tsx               # 🆕 Chỉnh sửa hồ sơ
│       ├── password.tsx              # 🆕 Đổi mật khẩu
│       ├── themes.tsx                # 🆕 Chọn theme theo sự kiện
│       ├── display.tsx               # 🆕 Sáng/Tối + Giao diện người lớn tuổi
│       ├── notifications.tsx         # 🆕 Bật/tắt từng loại thông báo
│       └── delete-account.tsx        # 🆕 Xoá tài khoản (yêu cầu của App Store/Google Play)
│   # ❌ (tabs)/ai.tsx bị bỏ: dự đoán AI chuyển vào match/[id], BXH FIFA chuyển vào Tab Giới thiệu, chat AI là khung ② của tab Thống kê
├── src/
│   ├── api/                          # axios instance + endpoints (thêm team, themes, users)
│   ├── components/
│   │   ├── common/                   # AppText, Button, Card, States, Screen, LargeTitleHeader 🆕
│   │   ├── brand/                    # 🆕 BrandSplash, OnboardingSlide, PageDots
│   │   ├── home/                     # 🆕 TeamHero, TrophyCabinet, AchievementTimeline, NextMatchCard
│   │   ├── match/                    # LiveScoreCard, FixtureItem, EventTimeline 🆕, StatCompareBar 🆕
│   │   ├── squad/                    # FormationPitch 🔄, RatingBadge 🆕, CardBadge 🆕, BenchList
│   │   ├── ai/                       # PredictionDonut, FifaRankTable, AssistantFrame 🆕, SuggestionChips 🆕
│   │   ├── settings/                 # 🆕 SettingsRow, ThemeCard, AvatarPicker, DisplayModeSwitch
│   │   └── effects/                  # 🆕 Fireworks, FallingBlossoms, Confetti (theme sự kiện)
│   ├── hooks/
│   │   ├── useLiveScore.ts           # WebSocket + polling dự phòng
│   │   ├── useMatchdayRefetch.ts     # 🆕 Bật refetch 60s trong khung ngày thi đấu
│   │   ├── useActiveTheme.ts         # 🆕 Lấy theme từ server + lắng nghe theme:changed
│   │   └── useSpeakScore.ts          # 🆕 Đọc to tỷ số (expo-speech, vi-VN)
│   ├── store/
│   │   ├── authStore.ts
│   │   └── settingsStore.ts          # 🆕 Zustand + persist: themeId, colorScheme, isSeniorMode
│   ├── theme/
│   │   ├── colors.ts                 # 🔄 Thêm token rating*/card*
│   │   ├── tokens.ts                 # 🔄 Thêm bảng tỷ lệ Senior mode
│   │   ├── themes.ts                 # 🆕 Gộp palette gốc + ghi đè của theme sự kiện
│   │   └── index.tsx                 # 🔄 ThemeProvider nhận colorScheme + eventTheme + isSeniorMode
│   └── ...
└── assets/
    ├── splash-icon.png
    └── onboarding/                   # 🆕 Ảnh dự phòng cho 4 slide giới thiệu
```

### 4.4. Chiến lược dữ liệu phía client

| Loại dữ liệu | Cơ chế | Làm mới |
|---|---|---|
| Tỷ số live, sự kiện trận | WebSocket `score:update`, `match:event`; mất socket > 20 giây → polling `/matches/:id/live` mỗi 15 giây | Realtime |
| Danh sách trận (live/sắp tới) | React Query; **`refetchInterval: 60_000` trong khung ngày thi đấu** (`useMatchdayRefetch`), ngoài khung `staleTime` 5 phút | **1 phút** / 5 phút |
| Đội hình | React Query; **`refetchInterval: 60_000` từ T−90′ tới khi hết trận** + socket `lineup:announced` | **1 phút** / 24 giờ |
| Điểm cầu thủ & thông số sau trận | React Query + socket `match:ratings`, `match:stats` | Khi server phát sự kiện |
| Cầu thủ, thành tích, giới thiệu | React Query + persist AsyncStorage | 24 giờ |
| Theme đang áp dụng | `GET /themes/active` lúc mở app + socket `theme:changed` | Khi đổi |
| Cài đặt người dùng | Zustand persist (máy) + đồng bộ `PUT /users/me/settings` khi đã đăng nhập | Khi đổi |
| Dự đoán AI | React Query | Tới giờ bóng lăn |

> `refetchInterval` tự dừng khi app chạy nền (`refetchIntervalInBackground: false`) → không tốn pin và dữ liệu di động.

---

## 5. ĐẶC TẢ MÀN HÌNH

### 5.1. Tab 1 — Giới thiệu & Thành tích

```
┌───────────────────────────────────┐
│ Giới thiệu                 (large)│
│ ┌───────────────────────────────┐ │  TeamHero: logo, biệt danh,
│ │ [logo] ĐT Việt Nam            │ │  hạng FIFA + mũi tên tăng/giảm
│ │ Những chiến binh Sao Vàng     │ │
│ │ FIFA #xx ▲2   AFC · AFF       │ │
│ └───────────────────────────────┘ │
│ ┌ TRẬN TIẾP THEO ───────────────┐ │  NextMatchCard: đếm ngược,
│ │ VIE vs THA · 19:30 T7 · Mỹ Đình│ │  kênh phát sóng, chạm → chi tiết
│ │ ⏱ 2 ngày 04:12  📺 VTV5       │ │  (đang live → hiện tỷ số đỏ)
│ └───────────────────────────────┘ │
│ GIỚI THIỆU                  Xem thêm│  intro_text 3 dòng, mở rộng được
│ TỦ DANH HIỆU                       │  TrophyCabinet: 🏆×3 Vô địch ĐNA
│ [🏆 3] [🥈 x] [⭐ Tứ kết Asian Cup] │  🥈 Á quân · ⭐ thành tích châu lục
│ DÒNG THỜI GIAN            Tất cả › │  AchievementTimeline (5 mục mới nhất)
│ ● 2024  Vô địch ASEAN Cup          │  → app/achievements.tsx
│ ● 2019  Tứ kết Asian Cup           │
│ ● 2018  Vô địch AFF Cup            │
│ BẢNG XẾP HẠNG FIFA        Tất cả › │  FifaRankTable (chuyển từ tab AI cũ)
│ BAN HUẤN LUYỆN                     │  Thẻ HLV trưởng → coaches
└───────────────────────────────────┘
```

Lọc thành tích theo loại: `champion` · `runner_up` · `third_place` · `semi_final` · `quarter_final` · `group_stage` · `qualified`.

### 5.2. Tab 2 — Trận đấu và màn Chi tiết trận

**Tab Trận đấu** có thanh chọn phân đoạn (segmented control) ở đầu:

| Phân đoạn | Nguồn | Hiển thị |
|---|---|---|
| **Đang diễn ra** | `GET /matches/live` + socket | `LiveScoreCard` nền gradient đỏ, phút thi đấu nhấp nháy, sự kiện mới nhất |
| **Sắp diễn ra** | `GET /matches/upcoming` | `FixtureItem`: giờ (giờ VN), sân, giải, kênh phát sóng, đếm ngược khi < 24 giờ |
| **Kết quả** | `GET /matches/results` | Tỷ số, nhãn T/H/B (chữ + màu), chạm → Chi tiết trận ở tab "Thống kê" |
| ➕ **Bảng xếp hạng** | `GET /competitions/:id/standings` | BXH bảng đấu của giải VN đang dự; chỉ hiện khi giải có vòng bảng (mục 5.8) |

Không có trận live → phân đoạn "Đang diễn ra" tự ẩn và mở mặc định "Sắp diễn ra".

**Màn `match/[id]`** — phần đầu là bảng tỷ số, bên dưới là 5 tab con cuộn ngang:

```
┌───────────────────────────────────┐
│  VIE  2 – 1  THA     Hết giờ      │
│  Tiến Linh 23' 67'   Supachok 55' │
├─────┬────────┬───────────┬────┬───┤
│Diễn │Thống kê│Đội hình & │Đối │Dự │
│biến │        │   điểm    │đầu │đoán│
└─────┴────────┴───────────┴────┴───┘
```

| Tab con | API | Nội dung |
|---|---|---|
| **Diễn biến** | `/matches/:id/live` + socket | `EventTimeline`: ⚽ bàn thắng (kèm kiến tạo), 🟨 🟥 thẻ, 🔁 thay người, VAR — theo phút |
| **Thống kê** (thông số sau trận) | `/matches/:id/stats` | `StatCompareBar` hai phía: kiểm soát bóng %, dứt điểm, trúng đích, xG, phạt góc, việt vị, phạm lỗi, thẻ vàng, thẻ đỏ, cứu thua, số đường chuyền, chuyền chính xác % |
| **Đội hình & điểm** | `/matches/:id/lineups` | Sơ đồ 2 đội với điểm + thẻ trên đầu (mục 5.3) |
| **Đối đầu** | `/matches/:id/h2h` | Tổng T/H/B + 10 trận gần nhất |
| **Dự đoán** | `/ai/predict/:matchId` | `PredictionDonut` + nhận định; chỉ hiện với trận chưa đá |

Mặc định mở: trận live → "Diễn biến"; trận đã kết thúc → "Thống kê"; trận sắp đá → "Dự đoán".

### 5.3. ⭐ Tab 3 — Đội hình: điểm cầu thủ + thẻ vàng/đỏ ngay trên đầu

Thanh chọn phân đoạn ở đầu tab:

- **Đội hình dự kiến** — `GET /squad/current` (như hiện tại).
- **Trận vừa đá: VIE 2–1 THA** — `GET /squad/last-match`. Phân đoạn này **tự được chọn trong 48 giờ sau khi trận kết thúc**, và có chấm đỏ "Mới".
- ➕ **Triệu tập** — danh sách đợt tập trung hiện tại, `GET /squads/current` (mục 5.8). Có chấm đỏ "Mới" trong 72 giờ sau khi danh sách được công bố.

```
                 ┌─────┐
                 │ 8.4★│  ◄ RatingBadge: điểm 1 chữ số thập phân,
                 └─────┘     ★ = cầu thủ xuất sắc nhất trận (MOTM)
                  ⚽⚽        ◄ số bàn thắng (tối đa hiện 3, sau đó "⚽×4")
                 ╭───╮ ▮     ◄ CardBadge: 🟨 thẻ vàng / 🟥 thẻ đỏ / 🟨🟥 2 thẻ vàng
                 │ 9 │ C     ◄ áo số (màu theo tuyến) + băng đội trưởng
                 ╰───╯ ↓67'  ◄ bị thay ra phút 67
               Tiến Linh     ◄ tên rút gọn
```

**Quy tắc hiển thị**

| Thành phần | Quy tắc |
|---|---|
| Vị trí RatingBadge | Ghim **phía trên đầu** áo số, căn giữa theo trục x; `top = -(chiều cao badge + 4)` |
| Kích thước | Standard: badge 32×18, chữ 11pt đậm, `tabular-nums`. Senior: 44×24, chữ 15pt |
| Màu theo thang điểm (luôn kèm con số, không truyền tin chỉ bằng màu) | ≥ 8.0 `ratingExcellent` · 7.0–7.9 `ratingGood` · 6.0–6.9 `ratingAverage` · < 6.0 `ratingPoor` |
| MOTM | Badge nền `gold`, thêm ★, cỡ lớn hơn 1 bậc |
| Chưa đủ 10 phút thi đấu | Hiện "–" thay vì điểm (quá ít dữ liệu để chấm) |
| Thẻ vàng | Hình chữ nhật đứng 8×11 màu `cardYellow`, góc trên-phải của áo |
| Thẻ đỏ trực tiếp | Hình chữ nhật `cardRed`; áo số mờ 50% (cầu thủ đã rời sân) |
| 2 thẻ vàng → đỏ | Hai thẻ chồng lệch nhau: vàng phía sau, đỏ phía trước |
| Thay người | Cầu thủ bị thay ra: mũi tên ↓ + phút. Cầu thủ vào sân hiện ở `BenchList` bên dưới sơ đồ, **cũng có điểm và thẻ** |
| Chạm vào cầu thủ | Bottom sheet: điểm, số phút, bàn, kiến tạo, dứt điểm, chuyền chính xác, tắc bóng, thẻ kèm phút → nút "Xem hồ sơ" |
| Trạng thái điểm | `ratings_status = provisional` → dòng chú thích "Điểm tạm tính — chốt sau 60 phút"; `final` → ẩn chú thích |
| Nguồn điểm | Điểm do **engine chấm điểm** của app tính (mục 12). Chạm vào badge → **"Vì sao 8.3?"**: bảng cộng/trừ từng điểm. `rating_source = manual` → chú thích "Điểm đã được hiệu chỉnh" |
| Điểm bị đính chính | Nhận socket `ratings:corrected` → badge nháy nhẹ + dòng "Đã cập nhật: VAR huỷ bàn thắng phút 67′" (mục 12.4) |

**Hoạt ảnh khi điểm vừa về** (socket `match:ratings`): các badge lần lượt hiện từ thủ môn lên tiền đạo, mỗi badge trễ 40ms, phóng 0.6 → 1.0 (chỉ dùng transform + opacity). Bỏ hoạt ảnh khi bật "Giảm chuyển động".

**Thông báo đẩy**: "⭐ Điểm cầu thủ trận VIE 2–1 THA đã có — Tiến Linh 8.4 xuất sắc nhất trận" → mở thẳng Tab Đội hình ở phân đoạn "Trận vừa đá".

### 5.4. Tab 4 — Cầu thủ

- Danh sách: tìm theo tên (debounce 300ms), lọc GK/DF/MF/FW, sắp xếp theo giá trị · số trận · bàn thắng.
- Mỗi hàng: ảnh, tên, số áo, vị trí, CLB, **giá trị thị trường** (€), **điểm trung bình 5 trận ĐTQG gần nhất**.
- Hồ sơ có thêm **giá trị ước tính theo phong độ** + biểu đồ biến động (`GET /players/:id/value-history`, mục 11.5), luôn ghi rõ "ước tính của app".
- Hồ sơ `player/[id]`: quê quán, tuổi, chiều cao, cân nặng, chân thuận, CLB hiện tại, giá trị, số trận/bàn cho ĐTQG, lịch sử CLB, **biểu đồ điểm 10 trận gần nhất** (`GET /players/:id/ratings`), **thống kê thẻ phạt** (cảnh báo nguy cơ treo giò khi đã có 1 thẻ vàng trong giải).

### 5.5. Cài đặt (mở từ ảnh đại diện góc phải — giống nút tài khoản của App Store)

Ở Senior mode, Cài đặt là 1 trong 3 tab (mục 7.3) để người lớn tuổi dễ tìm.

```
┌───────────────────────────────────┐
│ Cài đặt                           │
│ ┌───────────────────────────────┐ │
│ │ [avatar] Nguyễn Văn A       › │ │  → settings/profile (khách: nút Đăng nhập)
│ │ a@gmail.com                   │ │
│ └───────────────────────────────┘ │
│ TÀI KHOẢN                         │
│  Thông tin cá nhân              › │  → settings/profile
│  Đổi mật khẩu                   › │  → settings/password
│  Tài khoản liên kết             › │  → settings/accounts 🆕 Google, Facebook
│ GIAO DIỆN                         │
│  Theme theo sự kiện   Tự động   › │  → settings/themes
│  Sáng / Tối           Hệ thống  › │  → settings/display
│  Giao diện người lớn tuổi   [ ○ ] │  bật/tắt ngay tại chỗ
│ THÔNG BÁO                       › │  → settings/notifications
│ KHÁC                              │
│  Giới thiệu đội tuyển           › │  → onboarding (xem lại)
│  Điều khoản · Quyền riêng tư    › │
│  Đăng xuất                        │
│  Xoá tài khoản                  › │  chữ đỏ, → settings/delete-account
│ Phiên bản 2.0.0                   │
└───────────────────────────────────┘
```

**Chỉnh sửa hồ sơ** (`settings/profile`)

| Trường | Ràng buộc | Ghi chú |
|---|---|---|
| Ảnh đại diện | JPG/PNG/WebP, ≤ 5MB trước khi nén | `expo-image-picker` → cắt vuông → nén 512×512 WebP ở client → `POST /users/me/avatar` |
| Họ tên | 2–120 ký tự | Bắt buộc |
| Tên hiển thị | 2–40 ký tự | Tuỳ chọn |
| Ngày sinh | Tuổi 6–120 | Tuỳ chọn |
| Tỉnh/thành | Chọn từ danh sách 34 tỉnh thành | Tuỳ chọn |
| Cầu thủ yêu thích | Chọn từ danh sách cầu thủ | Tuỳ chọn |
| Email | Chỉ đọc | Đổi email để giai đoạn sau |

Nút "Lưu" chỉ sáng khi có thay đổi; rời màn khi chưa lưu → hộp thoại xác nhận.

**Thông báo** (`settings/notifications`): bàn thắng · bắt đầu trận / nhắc trước 1 giờ · công bố đội hình · điểm cầu thủ sau trận · kết quả chung cuộc · danh sách triệu tập mới · theme sự kiện mới.

**Xoá tài khoản**: nhập lại mật khẩu (tài khoản Google/Facebook: mã OTP) → xác nhận 2 bước → xoá vĩnh viễn (CASCADE: token, thiết bị, cài đặt, ảnh đại diện, lịch sử chat AI).

### 5.6. 🆕 Tab 5 — Thống kê & Trợ lý AI (hai khung kéo ngang)

Tab này gồm **hai khung xếp cạnh nhau, vuốt ngang để đổi** — kiểu thẻ kéo ngang của App Store: khung ① **Thống kê sau trận**, khung ② **Trợ lý AI**. Mép khung bên cạnh **ló ra một chút** để người dùng biết còn khung nữa, dưới cùng có **chấm chỉ trang** chạm được.

```
        ← vuốt ngang để đổi khung →
┌────────────────────────────────┐ ┌──
│ ① THỐNG KÊ                     │ │ ②   ◄ khung kế bên ló ~16px
│   (nội dung bên dưới)          │ │ ✨
└────────────────────────────────┘ └──
               ● ○                      ◄ chấm chỉ trang, chạm được
```

**Khung ① — Thống kê sau trận**

```
┌───────────────────────────────────┐
│ Thống kê                   (large)│
│ TRẬN VỪA ĐÁ                       │  chạm → Chi tiết trận, tab con "Thống kê"
│ VIE 2–1 THA · ASEAN Cup · 20/9    │
│ Kiểm soát bóng 58% ██████░░░░ 42% │  StatCompareBar
│ Dứt điểm (trúng)  14 (6) · 9 (3)  │
│ ⭐ Xuất sắc nhất: Tiến Linh 8.3   │  chạm → "Vì sao 8.3?"
├───────────────────────────────────┤
│ BẢNG XẾP HẠNG CẦU THỦ  [Năm 2026▾]│  kỳ: đợt tập trung · giải · năm
│ [Điểm TB] [Bàn] [Kiến tạo] [MOTM] │  chọn chỉ số
│ 1. Tiến Linh     7.9 · 6 trận     │
│ 2. Hoàng Đức     7.6 · 7 trận     │
│ 3. Văn Hậu       7.4 · 5 trận     │
├───────────────────────────────────┤
│ CÁC TRẬN ĐÃ ĐÁ                    │  cuộn vô hạn (cursor)
│ 15/9  VIE 3–0 LAO · 62% · 18 sút  │
└───────────────────────────────────┘
```

| Thành phần | Quy tắc |
|---|---|
| Nguồn | `/stats/overview`, `/stats/players/leaderboard`, `/stats/matches` (mục 8.5) |
| "Vì sao 8.3?" | Bottom sheet đọc `rating_breakdown`: "Khởi đầu 6,0 · 2 bàn thắng +2,0 · 1 đường chuyền quyết định +0,2 · 3 sút trúng đích +0,3 · Đội thắng +0,3 · Thẻ vàng −0,5 = **8,3**" |
| Trạng thái điểm | Nhãn "Tạm tính" khi `ratings_status = provisional`; nhãn "Đã cập nhật" khi bị đính chính |
| BXH cầu thủ | Chỉ xếp hạng điểm trung bình khi đá ≥ 90 phút trong kỳ; bằng điểm thì ngang hạng (mục 12.5) |
| Kéo khung | `react-native-pager-view` (hoặc `FlatList` ngang `pagingEnabled`): mỗi khung giữ nguyên trạng thái khi vuốt qua lại, không tải lại dữ liệu |
| Vào thẳng khung ② | Đường dẫn sâu `(tabs)/stats?frame=assistant`; nút "Hỏi AI về trận này" ở Chi tiết trận mở đúng khung này (mục 5.7) |
| Senior mode | Tab này ẩn (3 tab); thông số chính xem trong chi tiết trận dưới dạng câu: "Việt Nam kiểm soát bóng 58%, sút 14 lần" |

### 5.7. 🆕 Khung ② — Trợ lý AI "Hỏi đáp Đội tuyển"

Nằm ngay trong tab Thống kê (mục 5.6): từ khung Thống kê vuốt sang trái là tới, không phải màn hình riêng.

```
┌───────────────────────────────────┐
│ ✨ Hỏi đáp Đội tuyển              │
│ Gợi ý: [Tỷ số trận gần nhất?]     │
│        [Ai ghi nhiều bàn nhất?]   │
│        [VN đứng thứ mấy bảng?]    │
│                                   │
│      Vì sao Tiến Linh được 8.3? 👤│
│ ✨ Tiến Linh (tiền đạo) được 8,3  │  chữ hiện dần (streaming)
│    vì ghi 2 bàn (+2,0), đội thắng │
│    (+0,3) nhưng bị 1 thẻ vàng…    │
│    Dữ liệu cập nhật lúc 21:47     │
│    [🔊 Đọc to]  [👍] [👎]          │
│ ┌─────────────────────────┐  [➤] │
│ │ Nhập câu hỏi…           │       │
│ └─────────────────────────┘       │
└───────────────────────────────────┘
```

- Vào bằng cách **vuốt sang khung ②** trong tab Thống kê, hoặc nút **"Hỏi AI về trận này"** ở Chi tiết trận (mở tab Thống kê đúng khung ②, gửi kèm `matchId`).
- Vuốt qua khung khác rồi quay lại: hội thoại **giữ nguyên**, không mất câu đang gõ, không tải lại lịch sử.
- Cần đăng nhập để lưu lịch sử và tính hạn mức; khách thấy màn mời đăng nhập. Hết hạn mức ngày → báo rõ "Hôm nay bạn đã hỏi đủ, mai hỏi tiếp nhé".
- Câu trả lời luôn kèm thời điểm cập nhật dữ liệu; không trả lời về kèo cá cược (mục 10.6).
- Senior mode: chữ to, câu trả lời ngắn, nút "Đọc to" luôn hiện.

### 5.8. ➕ Bảng xếp hạng bảng đấu & Danh sách triệu tập

**BXH bảng đấu** hiện ở 2 chỗ: Tab Trận đấu → phân đoạn "Bảng xếp hạng" (chỉ hiện khi Việt Nam đang dự một giải có vòng bảng), và tab con "BXH" trong chi tiết trận thuộc giải đó.

```
┌───────────────────────────────────┐
│ ASEAN Cup 2026 · Bảng B      [▾]  │  chọn giải / bảng
│ #  Đội          Tr  T-H-B  HS  Đ  │
│ 1  Đội A         3  2-1-0  +4  7  │
│ 2  Việt Nam      3  2-0-1  +3  6  │ ◄ hàng Việt Nam tô nền accentSoft + chữ đậm
│ 3  Đội C         3  1-1-1   0  4  │
│ 4  Đội D         3  0-0-3  -7  0  │
│ ── 2 đội đầu vào bán kết ──       │  vạch + chữ (không chỉ dùng màu)
└───────────────────────────────────┘
```

| Thành phần | Quy tắc |
|---|---|
| Nguồn | `/competitions`, `/competitions/:id/standings` (mục 8.5); DEV 2 cập nhật sau mỗi trận của giải + 1 lần/ngày (mục 11.2) |
| Số liệu | `tabular-nums`, căn phải; hiệu số có dấu +/− |
| Senior mode | Thay bảng bằng một câu: "Việt Nam đang đứng thứ 2 bảng B với 6 điểm" |
| Trợ lý AI | Trả lời qua tool `get_competition_standings` (mục 10.3) |

**Danh sách triệu tập** — Tab Đội hình → phân đoạn thứ 3 "Triệu tập".

```
┌───────────────────────────────────┐
│ Đợt tập trung tháng 10/2026       │
│ Công bố 01/10 · 28 cầu thủ        │
│ THỦ MÔN (3)                       │
│  Cầu thủ A · CLB X            ›   │
│ HẬU VỆ (9)                        │
│  Cầu thủ B · CLB Y   [Mới]    ›   │ ◄ lần đầu được gọi lên ĐTQG
│  …                                │
│ Bổ sung: Cầu thủ C                │
│ Rút lui: Cầu thủ D (chấn thương)  │
│ Các đợt trước                  ›  │
└───────────────────────────────────┘
```

| Thành phần | Quy tắc |
|---|---|
| Nguồn | `/squads/current`, `/squads?cursor` (mục 8.5); DEV 2 lấy từ API nếu có, admin nhập khi thiếu (`/admin/squads`) |
| Nhãn "Mới" | Cầu thủ chưa có trong đợt triệu tập nào trước đó (so với `squad_members`) |
| Bổ sung / rút lui | Theo `squad_members.status` = `added` / `withdrawn`, luôn kèm chữ, không chỉ dùng màu |
| Khi có danh sách mới | Socket `squad:announced` + thông báo đẩy topic `squad`: "Danh sách triệu tập đợt tháng 10 đã công bố" (mục 15) |
| Chạm vào cầu thủ | Mở hồ sơ cầu thủ (mục 5.4) |

---

## 6. ⭐ HỆ THỐNG THEME (GIAO DIỆN THEO SỰ KIỆN)

Chủ sở hữu: ➕ **DEV 3** phía server (mục 6.3, 6.5: chọn theme, tự bật Đi bão/Tiếp lửa, kiểm tra tương phản) · **DEV 6** phía app (mục 6.4).

### 6.1. Bốn lớp chồng lên nhau

```
  Lớp 4  Senior mode        → phóng cỡ chữ, khoảng cách, vùng chạm   (độc lập với màu)
  Lớp 3  Theme phản ứng     → "Đi bão" (thắng) / "Tiếp lửa" (thua)   ưu tiên 80–100
  Lớp 2  Theme sự kiện      → Tết, 30/4, 2/9, ASEAN Cup, SEA Games    ưu tiên 50
  Lớp 1  Bảng màu gốc       → darkColors / lightColors (colors.ts)    ưu tiên 0
         └─ chọn theo Sáng / Tối / Theo hệ thống
```

**Theme chỉ được ghi đè một nhóm token nhất định** (danh sách trắng):

| Được ghi đè | Không bao giờ ghi đè |
|---|---|
| `accent`, `accentText`, `accentSoft`, `accentFg`, `gold`, `goldSoft`, `pitch`, `pitchStripe`, `staticColors.liveGradient`, `staticColors.heroGradient` + tài nguyên (banner, hiệu ứng, lời chào, ảnh splash) | `bg`, `surface*`, `text*`, `border*`, `win/draw/lose`, `rating*`, `card*` |

→ Dù admin chọn màu kiểu gì, **chữ vẫn luôn đọc được** và ý nghĩa Thắng/Hòa/Thua, thẻ vàng/đỏ không bị đổi.

### 6.2. Danh mục theme

| Mã (`code`) | Tên | Loại (`kind`) | Khi nào | Màu nhấn | Hiệu ứng / tài nguyên |
|---|---|---|---|---|---|
| `default` | Đỏ cờ | `default` | Mặc định | `#DA251D` | — |
| `tet` | Tết Nguyên Đán | `event` | ~7 ngày trước tới 7 ngày sau mùng 1 | Đỏ son + vàng kim | Hoa mai rơi, banner "Chúc mừng năm mới", lì xì trên splash |
| `reunification` | Thống nhất 30/4 | `event` | 28/4 – 1/5 | Đỏ cờ | Cờ đỏ sao vàng tung bay trên banner |
| `national-day` | Quốc khánh 2/9 | `event` | 31/8 – 3/9 | Đỏ cờ + vàng sao | Pháo hoa nhẹ khi mở app lần đầu trong ngày |
| `asean-cup` | Mùa ASEAN Cup | `event` | Suốt giải | Đỏ + xanh navy | Banner lịch thi đấu (chỉ dùng màu, **không dùng logo giải** vì bản quyền) |
| `sea-games` | Mùa SEA Games | `event` | Suốt giải bóng đá nam | Đỏ + vàng | Banner đếm ngược |
| `victory` | Đi bão | `result_win` | 24 giờ sau khi VN **thắng** (72 giờ nếu vô địch) | Đỏ rực + vàng | Pháo hoa + confetti khi mở app, lời chào "VIỆT NAM VÔ ĐỊCH!" |
| `keep-fire` | Tiếp lửa | `result_lose` | 12 giờ sau khi VN **thua** | Navy dịu | Lời động viên "Luôn bên nhau, Việt Nam ơi!", không hiệu ứng |
| *(hòa)* | — | — | Không đổi theme | — | — |

### 6.3. Thuật toán chọn theme (backend `themes.service.resolveActive`)

```
resolveActive(user?):
  prefs = user ? user_settings : cài đặt gửi từ máy (chế độ khách)

  if prefs.theme_id == id của theme 'default' → return 'default'          (Tắt theme sự kiện)
  if prefs.theme_id != null                   → return prefs.theme_id     (Cố định, nếu theme còn is_active)

  // prefs.theme_id == null → Tự động theo sự kiện
  SELECT t.* FROM theme_schedules s JOIN themes t ON t.id = s.theme_id
  WHERE now() >= s.start_at AND now() < s.end_at AND t.is_active
  ORDER BY s.priority DESC, s.start_at DESC
  LIMIT 1
  → không có dòng nào → 'default'
```

- Kết quả tuỳ theo lịch được cache Redis key `theme:active` (TTL = thời điểm lịch gần nhất bắt đầu/kết thúc, tối đa 5 phút).
- Theme phản ứng được **tạo tự động**: khi `livePoll` phát hiện trận của VN chuyển `finished`, backend `INSERT theme_schedules (source='auto_result', match_id, priority=80 hoặc 100 nếu là trận chung kết)`, xoá cache và phát socket `theme:changed` tới **mọi** client.
- Người dùng chọn chế độ "Cố định" vẫn thấy bảng màu mình chọn, không bị "Đi bão" ghi đè.

### 6.4. Phía app

```ts
// src/theme/themes.ts — gộp palette (giản lược)
export function buildPalette(base: ColorPalette, override?: ThemeOverride): ColorPalette {
  if (!override) return base;
  const safe = pick(override, THEMABLE_KEYS);      // chỉ lấy token nằm trong danh sách trắng
  return { ...base, ...safe };
}
```

- `ThemeProvider` nhận thêm `eventTheme` (từ `useActiveTheme`) và `isSeniorMode` (từ `settingsStore`); `useTheme()` giữ nguyên chữ ký → **mọi component hiện có tự đổi theo theme mà không cần sửa** (lợi ích của quy tắc "không dùng mã màu thô").
- Palette từ server gồm cả bản sáng (`palette_light`) và bản tối (`palette_dark`); thiếu khoá nào thì lấy của bảng gốc.
- Hiệu ứng (`components/effects/*`) chỉ chạy **một lần mỗi phiên mở app**, tối đa 3 giây, lớp phủ `pointerEvents="none"` (không chặn chạm), tắt khi bật "Giảm chuyển động" hoặc Senior mode.
- Màn `settings/themes`: lưới thẻ xem trước (mini mockup màu nhấn + banner) · 3 lựa chọn **Tự động theo sự kiện** (mặc định) / **Cố định một theme** / **Tắt** — lưu vào một cột `theme_id`: `null` = Tự động, id theme `default` = Tắt, id khác = Cố định.

### 6.5. Kiểm soát chất lượng theme (khi admin tạo theme)

- Validate bằng zod: mọi màu là HEX hợp lệ, có đủ `palette_light` + `palette_dark`.
- **Kiểm tra độ tương phản ở backend**: `accentText` trên `bg` ≥ 4.5:1 và `accentFg` trên `accent` ≥ 4.5:1 cho cả hai chế độ — không đạt thì từ chối lưu (trả lỗi 422 kèm tỷ lệ đo được).
- Tài nguyên ảnh ≤ 300KB, tải trước (prefetch bằng `expo-image`) khi lịch còn 24 giờ nữa mới bắt đầu.

---

## 7. ⭐ GIAO DIỆN CHO NGƯỜI LỚN TUỔI (SENIOR MODE)

### 7.1. Mục tiêu

Ông bà, cha mẹ là những người hâm mộ trung thành nhưng thường thấy app bóng đá **chữ nhỏ, quá nhiều số liệu, nhiều thao tác vuốt**. Senior mode ưu tiên đúng 3 câu hỏi: **Mấy giờ đá? Xem kênh nào? Tỷ số bao nhiêu?**

Cách bật: Cài đặt → "Giao diện người lớn tuổi"; slide cuối phần giới thiệu ("Dùng chữ to, dễ đọc"); hoặc app **gợi ý bật** khi phát hiện cỡ chữ hệ thống ≥ 130% (`PixelRatio.getFontScale()`).

### 7.2. Thông số thiết kế

| Hạng mục | Tiêu chuẩn | Người lớn tuổi |
|---|---|---|
| Chữ nội dung (`fontSize.base`) | 15 | **20** |
| Chữ nhỏ nhất cho phép | 11 | **16** (bỏ hẳn cỡ xs/sm) |
| Tỷ số live (`fontSize.display`) | 40 | **56** |
| Nhãn tab | 11 | **15** |
| Icon tab | 22 | **30** |
| Vùng chạm tối thiểu | 44 pt | **56 pt** |
| Khoảng cách (`spacing`) | ×1 | **×1.25** |
| Màu chữ | `text` / `textMuted` / `textFaint` | Chỉ `text` và `textMuted` (bỏ `textFaint` — độ tương phản thấp) |
| Viền | `border` | `borderStrong` (tách khối rõ hơn) |
| Số tab | 5 | **3**: Trận đấu · Đội hình · Cài đặt |
| Cử chỉ | Vuốt ngang, kéo làm mới | **Mọi thao tác đều có nút bấm**; kéo làm mới vẫn giữ nhưng có thêm nút "Tải lại" |
| Hiệu ứng theme | Có | Tắt (chỉ đổi màu) |
| Cỡ chữ hệ thống (`maxFontSizeMultiplier`) | Giới hạn 1.3 để không vỡ bố cục | Giới hạn 1.6 (bố cục đã thiết kế cho chữ to) |

Hiện thực: `tokens.ts` xuất thêm `seniorScale`; `ThemeProvider` nhân các token với hệ số khi `isSeniorMode === true` và thêm cờ `t.isSenior`. Component chỉ đọc token như cũ → không phải viết lại giao diện.

### 7.3. Màn hình chính rút gọn (Tab "Trận đấu" ở Senior mode)

```
┌───────────────────────────────────┐
│  TRẬN TIẾP THEO                   │
│  Việt Nam  –  Thái Lan            │  chữ 24, không viết tắt tên đội
│  19 giờ 30, Thứ Bảy 20/9          │  giờ viết đầy đủ bằng chữ
│  📺 Kênh VTV5 và FPT Play         │  kênh phát sóng nổi bật
│  [ 🔔  NHẮC TÔI TRƯỚC GIỜ ĐÁ ]     │  nút cao 56pt, rộng cả màn
├───────────────────────────────────┤
│  ĐANG ĐÁ — Phút 67                │  (chỉ hiện khi có trận live)
│  VIỆT NAM   2 – 1   THÁI LAN      │  tỷ số cỡ 56
│  [ 🔊  ĐỌC TỶ SỐ ]                 │  expo-speech, giọng vi-VN
├───────────────────────────────────┤
│  KẾT QUẢ GẦN NHẤT                 │
│  Việt Nam thắng Indonesia 3 – 0   │  câu hoàn chỉnh, có chữ "thắng/hoà/thua"
└───────────────────────────────────┘
```

### 7.4. Tính năng hỗ trợ riêng

- **Đọc to tỷ số** (`useSpeakScore`): "Phút 67, Việt Nam 2, Thái Lan 1. Tiến Linh vừa ghi bàn." Tuỳ chọn tự đọc khi có bàn thắng lúc app đang mở.
- **Thông báo rõ nghĩa**: "Việt Nam ghi bàn! Tỷ số 2–1, phút 67" thay vì "⚽ VIE 2-1 THA 67'".
- **Âm thanh + rung mạnh** khi có bàn thắng (tuỳ chọn).
- **Hộp thoại xác nhận** cho mọi thao tác quan trọng (đăng xuất, xoá).
- **Đội hình ở Senior mode**: sơ đồ sân vẫn giữ, nhưng chỉ hiện tên + điểm (bỏ bàn thắng và mũi tên thay người khỏi sơ đồ, đưa xuống danh sách bên dưới) để đỡ rối.

---

## 8. API BACKEND (`/api/v1`)

### 8.1. Quy ước chung

- REST + JSON, tiền tố `/api/v1`. Mọi phản hồi dùng khuôn `{ success, data, error?, meta? }` ✅ (`utils/apiResponse.ts`).
- Danh sách dùng phân trang cursor `?limit=20&cursor=...` → `meta.nextCursor` (mục 14.3).
- GET công khai có `ETag` và `Cache-Control` để CDN cache được (mục 14.3).
- Schema request/response viết bằng `zod` → sinh OpenAPI/Swagger tự động (mục 14.4).
- Mục 8.2–8.4 giữ từ bản 2.0; mục 8.5–8.6 bổ sung theo kế hoạch 5 dev. Cấu trúc thư mục backend: mục 3.4.

### 8.2. Danh sách API (`/api/v1`)

Ký hiệu Auth: `–` công khai · `○` không bắt buộc (đăng nhập thì cá nhân hoá) · `✔` bắt buộc đăng nhập · `A` chỉ admin.

**Xác thực & tài khoản**

| Method | Endpoint | Auth | Body / Query | Mô tả |
|---|---|---|---|---|
| POST | `/auth/register` | – | `{email, password, fullName}` | Đăng ký (bcrypt) ✅ |
| POST | `/auth/login` | – | `{email, password}` | → access + refresh token ✅ |
| POST | `/auth/refresh` | – | `{refreshToken}` | Cấp lại access token ✅ |
| POST | `/auth/logout` | ✔ | `{refreshToken}` | Thu hồi refresh token ✅ |
| GET | `/auth/me` | ✔ | – | Thông tin người dùng hiện tại ✅ |
| POST | `/auth/forgot-password` | – | `{email}` | 🆕 Gửi mã OTP 6 số qua email. **Luôn trả 200** dù email có tồn tại hay không (chống dò tài khoản) |
| POST | `/auth/reset-password` | – | `{email, code, newPassword}` | 🆕 Kiểm tra mã → đổi mật khẩu → thu hồi **mọi** refresh token |
| PATCH | `/auth/password` | ✔ | `{currentPassword, newPassword}` | 🆕 Đổi mật khẩu, thu hồi các phiên khác |
| DELETE | `/auth/account` | ✔ | `{password}` | 🆕 Xoá vĩnh viễn tài khoản + ảnh đại diện trên storage |

**Người dùng & cài đặt**

| Method | Endpoint | Auth | Body | Mô tả |
|---|---|---|---|---|
| PATCH | `/users/me` | ✔ | `{fullName?, displayName?, birthDate?, province?, favoritePlayerId?}` | 🆕 Chỉnh sửa hồ sơ |
| POST | `/users/me/avatar` | ✔ | `multipart/form-data: avatar` | 🆕 Tải ảnh đại diện → trả `avatarUrl` |
| DELETE | `/users/me/avatar` | ✔ | – | 🆕 Xoá ảnh đại diện |
| GET | `/users/me/settings` | ✔ | – | 🆕 Theme, sáng/tối, Senior mode, thông báo |
| PUT | `/users/me/settings` | ✔ | xem ví dụ 8.3 | 🆕 Lưu cài đặt (đồng bộ nhiều máy) |

**Khởi động app & đội tuyển**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/app/bootstrap` | ○ | 🆕 Một lần gọi lúc splash: theme đang áp dụng, trận live, phiên bản giới thiệu, phiên bản app tối thiểu |
| GET | `/onboarding/slides` | – | 🆕 4 slide giới thiệu đội tuyển + `version` |
| GET | `/team/profile` | – | 🆕 Biệt danh, liên đoàn, sân nhà, giới thiệu, thứ hạng FIFA cao nhất |
| GET | `/team/achievements` | – | 🆕 `?result=champion&competition=...` — dòng thời gian thành tích |
| GET | `/coach` | – | HLV trưởng ✅ |
| GET | `/ranking/fifa` | – | BXH FIFA ✅ |

**Trận đấu, đội hình, cầu thủ**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/matches/latest` | – | Trận gần nhất / đang diễn ra ✅ |
| GET | `/matches/live` | – | 🆕 Các trận đang live |
| GET | `/matches/upcoming` | – | Lịch sắp tới (phân trang) ✅ — 🔄 thêm `tvChannels` |
| GET | `/matches/results` | – | Kết quả đã đấu ✅ |
| GET | `/matches/:id` | – | Chi tiết trận ✅ |
| GET | `/matches/:id/live` | – | Tỷ số + sự kiện realtime ✅ |
| GET | `/matches/:id/h2h` | – | Lịch sử đối đầu ✅ |
| GET | `/matches/:id/stats` | – | 🆕 Thông số sau trận của 2 đội |
| GET | `/matches/:id/lineups` | – | 🆕 Đội hình 2 đội + **điểm, thẻ, bàn thắng, thay người** của từng cầu thủ |
| GET | `/squad/current` | – | Đội hình dự kiến ✅ |
| GET | `/squad/last-match` | – | 🆕 Đội hình VN ở trận vừa kết thúc, kèm điểm + thẻ (định dạng giống `/matches/:id/lineups`, chỉ phía VN) |
| GET | `/squad/value` | – | Tổng giá trị đội hình ✅ |
| GET | `/players` | – | Danh sách ✅ — 🔄 thêm `avgRating5` |
| GET | `/players/:id` | – | Hồ sơ ✅ |
| GET | `/players/:id/clubs` | – | Lịch sử CLB ✅ |
| GET | `/players/:id/ratings` | – | 🆕 `?limit=10` — điểm các trận gần nhất (biểu đồ phong độ) |
| GET | `/ai/predict/:matchId` | – | Dự đoán Thắng/Hòa/Thua ✅ |
| GET | `/ai/status` | – | Trạng thái AI ✅ |

**Theme & thiết bị**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/themes` | – | 🆕 Danh mục theme cho màn chọn theme (bỏ qua theme `result_*`) |
| GET | `/themes/active` | ○ | 🆕 Theme đang áp dụng theo thuật toán 6.3. Có `ETag` → app gửi `If-None-Match`, không đổi thì nhận 304 |
| POST | `/devices/token` | ✔ | Đăng ký FCM token ✅ |
| DELETE | `/devices/token` | ✔ | Huỷ token ✅ |
| GET | `/devices` | ✔ | Danh sách thiết bị ✅ |

**Quản trị (admin)** — tất cả `A`, đều ghi log người sửa. ➕ DEV 3 làm phần nội dung (theme, thành tích, slide, sửa điểm, nhập liệu); DEV 4 làm phân quyền và nhật ký

| Method | Endpoint | Mô tả |
|---|---|---|
| GET/POST | `/admin/themes` | Danh sách / tạo theme (kiểm tra độ tương phản 6.5) |
| PUT/DELETE | `/admin/themes/:id` | Sửa / tắt theme (`is_active=false`, không xoá cứng) |
| GET/POST | `/admin/theme-schedules` | Lịch áp dụng theme |
| DELETE | `/admin/theme-schedules/:id` | Huỷ lịch (kể cả lịch "Đi bão" tự tạo) |
| PUT | `/admin/team-profile` | Sửa giới thiệu đội tuyển |
| POST/PUT/DELETE | `/admin/achievements[/:id]` | Quản lý thành tích |
| POST/PUT/DELETE | `/admin/onboarding-slides[/:id]` | Quản lý slide giới thiệu (tự tăng `version`) |
| PUT | `/admin/matches/:id/ratings` | Sửa tay điểm cầu thủ (`rating_source='manual'`) |
| PUT | `/admin/matches/:id/stats` | Nhập tay thông số trận khi nguồn dữ liệu thiếu |
| POST | `/admin/notifications` | Gửi thông báo đẩy thủ công |

### 8.3. Ví dụ dữ liệu trả về

Mọi phản hồi dùng khuôn chung `{ success, data, error?, meta? }` (`utils/apiResponse.ts`).

**`GET /app/bootstrap`**

```json
{
  "success": true,
  "data": {
    "theme": {
      "code": "victory",
      "name": "Đi bão",
      "kind": "result_win",
      "paletteLight": { "accent": "#D0121B", "accentText": "#B80F17", "gold": "#B88700" },
      "paletteDark":  { "accent": "#E3241B", "accentText": "#FF5A4F", "gold": "#FFCD00" },
      "assets": { "effect": "fireworks", "greeting": "VIỆT NAM CHIẾN THẮNG!", "bannerUrl": "https://.../victory.webp" },
      "endsAt": "2026-09-21T12:30:00Z"
    },
    "liveMatchId": null,
    "onboardingVersion": 3,
    "minAppVersion": "2.0.0",
    "serverTime": "2026-09-20T15:02:11Z"
  }
}
```

**`GET /matches/:id/lineups`** (dùng cho sơ đồ có điểm + thẻ)

```json
{
  "success": true,
  "data": {
    "matchId": 42,
    "status": "finished",
    "ratingsStatus": "final",
    "ratingSource": "provider",
    "motmPlayerId": 9,
    "teams": [
      {
        "teamId": 1, "fifaCode": "VIE", "formation": "3-4-3",
        "starters": [
          {
            "playerId": 9, "fullName": "Nguyễn Tiến Linh", "shortName": "Tiến Linh",
            "shirtNumber": 22, "position": "FW", "positionX": 50, "positionY": 88,
            "isCaptain": false,
            "rating": 8.4, "isMotm": true, "minutesPlayed": 67,
            "goals": 2, "assists": 0,
            "cards": [ { "type": "yellow_card", "minute": 41 } ],
            "subbedOutAt": 67, "subbedInAt": null
          }
        ],
        "bench": [
          {
            "playerId": 17, "fullName": "Nguyễn Văn Toàn", "shirtNumber": 9, "position": "FW",
            "rating": null, "minutesPlayed": 8, "goals": 0, "assists": 0,
            "cards": [], "subbedInAt": 82
          }
        ]
      }
    ]
  }
}
```

`rating: null` + `minutesPlayed < 10` → app hiện "–". `cards[].type` ∈ `yellow_card` · `second_yellow` · `red_card`.

**`PUT /users/me/settings`**

```json
{
  "isSeniorMode": true,
  "themeId": null,
  "colorScheme": "system",
  "ttsEnabled": true,
  "notify": { "goals": true, "kickoff": true, "lineup": true, "ratings": true, "result": true, "squad": true, "themes": false }
}
```

### 8.4. Sự kiện WebSocket

| Sự kiện | Hướng | Room | Payload |
|---|---|---|---|
| `match:subscribe` / `match:unsubscribe` | client → server | – | `{ matchId }` ✅ |
| `score:update` | server → client | `match:{id}` | `{ matchId, home, away, minute }` ✅ |
| `match:event` | server → client | `match:{id}` | `{ type, playerId, minute, detail }` ✅ |
| `match:finished` | server → client | `match:{id}` | `{ matchId, finalScore }` ✅ |
| `lineup:announced` | server → client | `global` | 🆕 `{ matchId, teamId }` — đội hình chính thức vừa công bố |
| `match:stats` | server → client | `match:{id}` | 🆕 `{ matchId, stats: [...] }` |
| `match:ratings` | server → client | `match:{id}` + `global` | 🆕 `{ matchId, status: 'provisional'\|'final', motmPlayerId, players: [{ playerId, rating }] }` |
| `theme:changed` | server → client | `global` | 🆕 `{ code, endsAt }` — app gọi lại `/themes/active` |

Mọi socket tự vào room `global` khi kết nối; room `match:{id}` chỉ vào khi mở màn trận.

### 8.5. API bổ sung theo kế hoạch 5 dev

**Đăng nhập mạng xã hội & tài khoản (DEV 4)**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/google` | – | 🆕 `{ idToken }` → xác minh với Google → access + refresh token |
| POST | `/auth/facebook` | – | 🆕 `{ accessToken }` → xác minh qua Graph API → access + refresh token |
| POST | `/auth/apple` | – | 💡 Sign in with Apple (mục 13.1) |
| GET | `/auth/identities` | ✔ | 🆕 Các cách đăng nhập đã liên kết |
| POST / DELETE | `/auth/identities/:provider` | ✔ | 🆕 Liên kết / huỷ liên kết (phải còn ít nhất 1 cách đăng nhập) |

**Tab 5 — Thống kê, điểm & bảng xếp hạng cầu thủ (DEV 3 + DEV 5)**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/stats/overview` | – | 🆕 Trận vừa đá (tỷ số, thông số chính, cầu thủ xuất sắc nhất) + top 5 BXH cầu thủ |
| GET | `/stats/matches?cursor` | – | 🆕 Các trận đã đá kèm thông số chính (kiểm soát bóng, dứt điểm, xG nếu có) |
| GET | `/stats/players/leaderboard` | – | 🆕 `?period=squad\|competition\|year\|week&key=...&metric=avg_rating\|goals\|assists\|motm\|cards&cursor` — BXH cầu thủ |
| GET | `/matches/:id/ratings` | – | 🆕 Điểm của mọi cầu thủ trong trận + `ratingsStatus` (`live` / `provisional` / `final`) |
| GET | `/matches/:id/ratings/:playerId/explain` | – | 🆕 Bảng cách tính điểm: "Vì sao 8.3?" (mục 12.2) |
| GET | `/competitions` · `/competitions/:id/standings` | – | 🆕 Giải đấu · BXH bảng đấu (VN đứng thứ mấy ở bảng) |
| GET | `/squads/current` · `/squads?cursor` | – | 🆕 Danh sách triệu tập hiện tại · lịch sử các đợt |
| GET | `/players/:id/value-history` | – | 🆕 Lịch sử giá trị thị trường + giá trị ước tính (biểu đồ) |

**Trợ lý AI (DEV 1)** — chi tiết mục 10.8

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/ai/chat` | ✔ | 🆕 Gửi câu hỏi, nhận câu trả lời dạng stream (SSE) |
| GET | `/ai/conversations` · `/ai/conversations/:id/messages` | ✔ | 🆕 Lịch sử hội thoại |
| DELETE | `/ai/conversations/:id` | ✔ | 🆕 Xoá hội thoại |
| POST | `/ai/messages/:id/feedback` | ✔ | 🆕 👍 / 👎 |

**Quản trị bổ sung** (tất cả chỉ admin, đều ghi `audit_logs`)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/admin/matches/:id/ratings/recalculate` | Chấm lại điểm một trận (mục 12.4) |
| GET / POST | `/admin/rating-rulesets` | Xem / tạo phiên bản bộ quy tắc chấm điểm |
| PUT | `/admin/players/:id/market-value` | Nhập giá trị thị trường gốc khi nguồn dữ liệu thiếu |
| POST / PUT | `/admin/squads[/:id]` | Nhập danh sách triệu tập |
| POST | `/admin/kb-documents` | Thêm tài liệu cho trợ lý AI (lịch sử, luật, FAQ) |

### 8.6. Sự kiện WebSocket bổ sung

| Sự kiện | Hướng | Room | Payload |
|---|---|---|---|
| `ratings:corrected` | server → client | `match:{id}` + `global` | 🆕 `{ matchId, changes: [{ playerId, old, new }], reason }` — ví dụ VAR huỷ bàn |
| `squad:announced` | server → client | `global` | 🆕 `{ squadId, title }` — có danh sách triệu tập mới |
| `leaderboard:updated` | server → client | `global` | 🆕 `{ periodType, periodKey }` — app tải lại BXH cầu thủ |

---

## 9. THIẾT KẾ CƠ SỞ DỮ LIỆU (PostgreSQL)

### 9.1. Sơ đồ quan hệ

```
users ─┬─< refresh_tokens
       ├─< password_reset_codes          🆕
       ├── user_settings (1-1)           🆕 ──> themes (theme_id)
       ├─< device_tokens
       └──> players (favorite_player_id) 🆕

teams ─┬── team_profiles (1-1)           🆕
       ├─< achievements                  🆕 ──> matches (final_match_id)
       ├─< coaches
       ├─< players ─< player_clubs
       ├─< fifa_rankings
       └─< lineups ─< lineup_players ──> players

matches ─┬─< match_events ──> players (player_id, assist_player_id 🆕)
         ├─< match_stats (mỗi đội 1 dòng)             🆕
         ├─< player_match_stats ──> players           🆕
         ├── ai_predictions (1-1)
         └─< theme_schedules (theme "Đi bão" tự tạo)  🆕

themes ─< theme_schedules                              🆕
onboarding_slides                                      🆕 (bảng độc lập)
```

Bảng thêm ở migration `003` (mục 9.3), theo kế hoạch 5 dev: `user_identities` (Google/Facebook), `competitions` → `seasons` → `competition_standings` (giải đấu, BXH bảng đấu), `squads` → `squad_members` (đợt triệu tập), `external_refs`, `rating_rulesets` · `rating_runs` · `rating_audit` · `player_rating_stats` (engine chấm điểm, BXH cầu thủ), `player_value_history`, `ai_conversations` · `ai_messages` · `ai_usage` · `kb_documents` · `kb_chunks` (trợ lý AI), `audit_logs`.

**Bảng đã có ở `001_init.sql`** (giữ nguyên): `users`, `refresh_tokens`, `teams`, `coaches`, `players`, `player_clubs`, `matches`, `match_events`, `lineups`, `lineup_players`, `h2h_records`, `ai_predictions`, `fifa_rankings`, `device_tokens`.

### 9.2. Migration `002_features.sql` ✅ đã viết

> Đã hiện thực tại [backend/src/db/migrations/002_features.sql](backend/src/db/migrations/002_features.sql) (12/09/2026) và chạy được trên cả PGlite lẫn PostgreSQL. Khác biệt duy nhất so với bản thiết kế dưới đây: bảng `user_settings` dùng luôn `theme_id` + `is_senior_mode` theo kế hoạch DEV 4, thêm `notify_squad`.

```sql
-- ===========================================================================
-- MIGRATION 002 — TÍNH NĂNG v2.0
-- Giới thiệu & thành tích · Thông số sau trận · Điểm cầu thủ · Theme
-- Senior mode · Hồ sơ người dùng · Quên mật khẩu
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- A. MỞ RỘNG BẢNG CŨ
-- ---------------------------------------------------------------------------

-- A1. USERS — thêm các trường hồ sơ
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name       VARCHAR(40),
  ADD COLUMN IF NOT EXISTS birth_date         DATE,
  ADD COLUMN IF NOT EXISTS province           VARCHAR(80),
  ADD COLUMN IF NOT EXISTS favorite_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avatar_key         TEXT,          -- khoá file trên storage, để xoá được
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;  -- token cấp trước mốc này bị từ chối

-- A2. MATCHES — kênh phát sóng + trạng thái chốt điểm
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS tv_channels     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ["VTV5","FPT Play"]
  ADD COLUMN IF NOT EXISTS is_final        BOOLEAN NOT NULL DEFAULT FALSE,     -- trận chung kết → theme 72h
  ADD COLUMN IF NOT EXISTS finished_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ratings_status  VARCHAR(12) NOT NULL DEFAULT 'none'
        CHECK (ratings_status IN ('none','provisional','final'));

-- A3. MATCH_EVENTS — thêm "thẻ vàng thứ hai" + người kiến tạo
ALTER TABLE match_events DROP CONSTRAINT IF EXISTS match_events_type_check;
ALTER TABLE match_events
  ADD CONSTRAINT match_events_type_check CHECK (type IN (
    'goal','own_goal','penalty','missed_penalty',
    'yellow_card','second_yellow','red_card','substitution','var')),
  ADD COLUMN IF NOT EXISTS assist_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  -- Thay người: player_id = người VÀO, related_player_id = người RA
  ADD COLUMN IF NOT EXISTS related_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_match_events_player ON match_events(player_id);

-- A4. LINEUPS — mốc công bố đội hình chính thức (để gửi thông báo đúng 1 lần)
ALTER TABLE lineups
  ADD COLUMN IF NOT EXISTS announced_at TIMESTAMPTZ;


-- ---------------------------------------------------------------------------
-- B. HỒ SƠ NGƯỜI DÙNG
-- ---------------------------------------------------------------------------

-- B1. PASSWORD_RESET_CODES — mã OTP quên mật khẩu
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   VARCHAR(128) NOT NULL,       -- chỉ lưu hash của mã 6 số, giống mật khẩu
  expires_at  TIMESTAMPTZ NOT NULL,        -- 15 phút
  attempts    SMALLINT NOT NULL DEFAULT 0 CHECK (attempts <= 5),  -- nhập sai 5 lần → huỷ mã
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reset_codes_user ON password_reset_codes(user_id);

-- B2. THEMES (tạo trước vì user_settings tham chiếu tới)
CREATE TABLE IF NOT EXISTS themes (
  id             SERIAL PRIMARY KEY,
  code           VARCHAR(40) NOT NULL UNIQUE,          -- 'tet', 'victory'
  name           VARCHAR(80) NOT NULL,                 -- 'Tết Nguyên Đán'
  kind           VARCHAR(20) NOT NULL
                 CHECK (kind IN ('default','event','result_win','result_lose')),
  -- Chỉ chứa các token nằm trong danh sách trắng (mục 6.1), kiểm tra ở tầng ứng dụng
  palette_light  JSONB NOT NULL DEFAULT '{}'::jsonb,
  palette_dark   JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "effect": "fireworks"|"blossoms"|"confetti"|null, "greeting": "...",
  --   "bannerUrl": "...", "splashImageUrl": "..." }
  assets         JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url    TEXT,                                 -- ảnh xem trước ở màn chọn theme
  is_selectable  BOOLEAN NOT NULL DEFAULT TRUE,        -- người dùng được chọn "cố định" không
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,        -- tắt thay vì xoá
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B3. USER_SETTINGS — cài đặt giao diện & thông báo (1 dòng / người dùng)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- Theo kế hoạch DEV 4: theme_id + is_senior_mode
  -- theme_id NULL = tự động theo sự kiện · id theme 'default' = tắt · id khác = cố định
  theme_id        INTEGER REFERENCES themes(id) ON DELETE SET NULL,
  color_scheme    VARCHAR(10) NOT NULL DEFAULT 'system'
                  CHECK (color_scheme IN ('system','light','dark')),
  is_senior_mode  BOOLEAN NOT NULL DEFAULT FALSE,      -- giao diện người lớn tuổi
  tts_enabled     BOOLEAN NOT NULL DEFAULT FALSE,      -- đọc to tỷ số
  notify_goals    BOOLEAN NOT NULL DEFAULT TRUE,
  notify_kickoff  BOOLEAN NOT NULL DEFAULT TRUE,
  notify_lineup   BOOLEAN NOT NULL DEFAULT TRUE,
  notify_ratings  BOOLEAN NOT NULL DEFAULT TRUE,
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
  priority    SMALLINT NOT NULL DEFAULT 50,      -- event 50 · kết quả 80 · vô địch 100
  source      VARCHAR(12) NOT NULL DEFAULT 'manual'
              CHECK (source IN ('manual','auto_result')),
  match_id    INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_schedule_range CHECK (end_at > start_at),
  -- Theme tự động luôn phải gắn với một trận
  CONSTRAINT chk_auto_has_match CHECK (source <> 'auto_result' OR match_id IS NOT NULL),
  -- Một trận chỉ sinh tối đa một lịch "Đi bão/Tiếp lửa" (chống tạo trùng khi job chạy lại)
  CONSTRAINT uq_schedule_match UNIQUE (match_id)
);
-- Truy vấn "theme nào đang áp dụng lúc này" lọc theo khoảng thời gian
CREATE INDEX IF NOT EXISTS idx_theme_schedules_range ON theme_schedules(start_at, end_at);


-- ---------------------------------------------------------------------------
-- C. GIỚI THIỆU & THÀNH TÍCH
-- ---------------------------------------------------------------------------

-- C1. TEAM_PROFILES — giới thiệu chung đội tuyển (1-1 với teams)
CREATE TABLE IF NOT EXISTS team_profiles (
  team_id            INTEGER PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  nickname           VARCHAR(120),        -- 'Những chiến binh Sao Vàng'
  federation         VARCHAR(160),        -- 'Liên đoàn Bóng đá Việt Nam (VFF)'
  confederations     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ["AFC","AFF"]
  home_stadium       VARCHAR(160),        -- 'Sân vận động Quốc gia Mỹ Đình'
  intro_text         TEXT NOT NULL,       -- đoạn giới thiệu hiển thị ở Tab Giới thiệu
  cover_image_url    TEXT,
  best_fifa_rank     SMALLINT CHECK (best_fifa_rank > 0),
  best_fifa_rank_date DATE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  is_highlight    BOOLEAN NOT NULL DEFAULT FALSE,   -- hiện ở "Tủ danh hiệu" + onboarding
  UNIQUE (team_id, competition, edition_year)
);
CREATE INDEX IF NOT EXISTS idx_achievements_team_year ON achievements(team_id, edition_year DESC);

-- C3. ONBOARDING_SLIDES — nội dung phần "Giới thiệu chung" sau splash
CREATE TABLE IF NOT EXISTS onboarding_slides (
  id          SERIAL PRIMARY KEY,
  sort_order  SMALLINT NOT NULL,
  title       VARCHAR(120) NOT NULL,
  body        TEXT NOT NULL,
  image_url   TEXT,
  version     INTEGER NOT NULL DEFAULT 1,  -- tăng khi admin sửa → app hiện lại giới thiệu
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_order ON onboarding_slides(sort_order) WHERE is_active;


-- ---------------------------------------------------------------------------
-- D. THÔNG SỐ SAU TRẬN & ĐIỂM CẦU THỦ
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
  UNIQUE (match_id, team_id),                       -- cho phép upsert
  CONSTRAINT chk_on_target CHECK (shots_on_target <= shots)
);

-- D2. PLAYER_MATCH_STATS — điểm + chỉ số cá nhân từng trận
CREATE TABLE IF NOT EXISTS player_match_stats (
  id                 SERIAL PRIMARY KEY,
  match_id           INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id          INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id            INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  minutes_played     SMALLINT NOT NULL DEFAULT 0 CHECK (minutes_played BETWEEN 0 AND 130),
  -- NUMERIC(3,1): 0.0 – 10.0, đúng 1 chữ số thập phân như hiển thị. NULL = chưa chấm / đá < 10 phút
  rating             NUMERIC(3,1) CHECK (rating BETWEEN 0 AND 10),
  rating_source      VARCHAR(10) CHECK (rating_source IN ('provider','computed','manual')),
  is_motm            BOOLEAN NOT NULL DEFAULT FALSE,
  shots              SMALLINT DEFAULT 0,
  shots_on_target    SMALLINT DEFAULT 0,
  key_passes         SMALLINT DEFAULT 0,
  passes             SMALLINT DEFAULT 0,
  pass_accuracy_pct  SMALLINT CHECK (pass_accuracy_pct BETWEEN 0 AND 100),
  tackles            SMALLINT DEFAULT 0,
  interceptions      SMALLINT DEFAULT 0,
  saves              SMALLINT DEFAULT 0,          -- thủ môn
  goals_conceded     SMALLINT DEFAULT 0,          -- thủ môn
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_pms_player ON player_match_stats(player_id, match_id DESC);
-- Mỗi trận chỉ có tối đa 1 cầu thủ xuất sắc nhất
CREATE UNIQUE INDEX IF NOT EXISTS uq_pms_motm ON player_match_stats(match_id) WHERE is_motm;


-- ---------------------------------------------------------------------------
-- E. VIEW TỔNG HỢP CHO SƠ ĐỒ ĐỘI HÌNH (điểm + thẻ + bàn + thay người)
-- ---------------------------------------------------------------------------
-- Thẻ, bàn thắng, thay người lấy từ match_events (NGUỒN DUY NHẤT) — không lưu
-- trùng vào player_match_stats, tránh tình trạng hai nơi lệch nhau.
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
  COUNT(*) FILTER (WHERE e.type = 'goal' AND e.assist_player_id = pms.player_id)       AS assists,
  COALESCE(
    jsonb_agg(jsonb_build_object('type', e.type, 'minute', e.minute) ORDER BY e.minute)
      FILTER (WHERE e.type IN ('yellow_card','second_yellow','red_card')
              AND e.player_id = pms.player_id),
    '[]'::jsonb)                                                                       AS cards,
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
```

Rollback (`002_features.down.sql`): `DROP VIEW` → `DROP TABLE` theo thứ tự ngược (D2, D1, C3, C2, C1, B4, B3, B2, B1) → `ALTER TABLE ... DROP COLUMN` các cột ở mục A → khôi phục CHECK cũ của `match_events`.

### 9.3. Migration `003_team_plan.sql` ✅ đã viết (theo kế hoạch 5 dev — không có bảng game)

> Đã hiện thực tại [backend/src/db/migrations/003_team_plan.sql](backend/src/db/migrations/003_team_plan.sql) (12/09/2026). Hai điều chỉnh khi hiện thực:
> - Phần RAG cần `pgvector` tách sang **`004_rag_vector.pg.sql`**. Bộ chạy migration **bỏ qua mọi file `.pg.sql` khi `DB_DRIVER=pglite`** (PGlite nhúng không có extension này); đổi sang PostgreSQL thật rồi chạy `npm run migrate` là file đó được áp dụng.
> - **`005_summary_view_soft_delete.sql`** tạo lại view `v_player_match_summary` để **bỏ qua sự kiện đã xoá mềm** (`is_deleted`) — nếu không, bàn thắng bị VAR huỷ vẫn bị tính vào điểm cầu thủ.
> - Mã OTP quên mật khẩu dùng bảng `password_reset_codes` của `002`, không tạo thêm bảng mới.

```sql
-- ===========================================================================
-- MIGRATION 003 — Đăng nhập mạng xã hội · Giải đấu & triệu tập · Engine chấm điểm
-- Giá trị cầu thủ · Trợ lý AI · Nhật ký quản trị
-- ===========================================================================

-- A. ĐĂNG NHẬP MẠNG XÃ HỘI (DEV 4)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;   -- tài khoản chỉ đăng nhập Google/Facebook
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;  -- tăng lên → mọi access token cũ vô hiệu

CREATE TABLE IF NOT EXISTS user_identities (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider       VARCHAR(12) NOT NULL CHECK (provider IN ('password','google','facebook','apple','zalo')),
  provider_uid   VARCHAR(191) NOT NULL,          -- 'sub' của Google/Apple, id của Facebook
  email          VARCHAR(255),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_uid)
);
CREATE INDEX IF NOT EXISTS idx_identities_user ON user_identities(user_id);

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS family_id  UUID,          -- chuỗi xoay vòng; token cũ bị dùng lại → thu hồi cả chuỗi
  ADD COLUMN IF NOT EXISTS used_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- B. GIẢI ĐẤU ("Leagues"), BXH BẢNG ĐẤU, ĐỢT TRIỆU TẬP ("Squads") — DEV 4 thiết kế, DEV 2 ghi
CREATE TABLE IF NOT EXISTS competitions (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(40) NOT NULL UNIQUE,      -- 'asean-cup', 'asian-cup', 'wcq-afc', 'sea-games', 'friendly'
  name          VARCHAR(120) NOT NULL,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('friendly','regional','continental','world','multi_sport')),
  confederation VARCHAR(10)                        -- 'AFF', 'AFC', 'FIFA'
);
CREATE TABLE IF NOT EXISTS seasons (
  id             SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name           VARCHAR(40) NOT NULL,             -- '2026', '2027 vòng loại'
  start_date     DATE,
  end_date       DATE,
  UNIQUE (competition_id, name)
);
CREATE TABLE IF NOT EXISTS competition_standings (
  season_id     INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  group_name    VARCHAR(20) NOT NULL DEFAULT '',    -- 'Bảng B'
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
CREATE TABLE IF NOT EXISTS squads (                 -- một đợt triệu tập / tập trung
  id            SERIAL PRIMARY KEY,
  team_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id     INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
  title         VARCHAR(160) NOT NULL,             -- 'Đợt tập trung tháng 10/2026'
  gather_from   DATE,
  gather_to     DATE,
  announced_at  TIMESTAMPTZ,
  source_url    TEXT
);
CREATE TABLE IF NOT EXISTS squad_members (
  squad_id      INTEGER NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status        VARCHAR(12) NOT NULL DEFAULT 'called' CHECK (status IN ('called','added','withdrawn')),
  PRIMARY KEY (squad_id, player_id)
);

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS season_id      INTEGER REFERENCES seasons(id),
  ADD COLUMN IF NOT EXISTS data_version   INTEGER NOT NULL DEFAULT 0,     -- tăng mỗi lần dữ liệu trận đổi
  ADD COLUMN IF NOT EXISTS last_polled_at TIMESTAMPTZ;
ALTER TABLE match_events
  ADD COLUMN IF NOT EXISTS provider_event_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS is_deleted        BOOLEAN NOT NULL DEFAULT FALSE;  -- VAR huỷ → xoá mềm
CREATE UNIQUE INDEX IF NOT EXISTS uq_events_provider ON match_events(match_id, provider_event_id);

CREATE TABLE IF NOT EXISTS external_refs (          -- ánh xạ ID nhà cung cấp ↔ ID nội bộ
  entity_type   VARCHAR(20) NOT NULL,              -- 'team','player','match','competition'
  provider      VARCHAR(20) NOT NULL,              -- 'apifootball','sportmonks'
  external_id   VARCHAR(64) NOT NULL,
  internal_id   INTEGER NOT NULL,
  PRIMARY KEY (entity_type, provider, external_id)
);

-- C. ENGINE CHẤM ĐIỂM CẦU THỦ (DEV 3) — mở rộng player_match_stats của 002
ALTER TABLE player_match_stats
  ADD COLUMN IF NOT EXISTS provider_rating  NUMERIC(3,1),                  -- điểm của nhà cung cấp (để đối chiếu)
  ADD COLUMN IF NOT EXISTS rating_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ "rule":"goal", "count":2, "points":2.0 }]
  ADD COLUMN IF NOT EXISTS ruleset_version  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS data_version     INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rating_rulesets (
  version     VARCHAR(20) PRIMARY KEY,              -- '2026.1'
  rules       JSONB NOT NULL,                       -- bảng quy đổi mục 12.2
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ruleset_active ON rating_rulesets(is_active) WHERE is_active;

CREATE TABLE IF NOT EXISTS rating_runs (             -- mỗi lần chấm điểm một trận
  id              SERIAL PRIMARY KEY,
  match_id        INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  trigger         VARCHAR(12) NOT NULL CHECK (trigger IN ('live','finalize','correction','manual','ruleset')),
  data_version    INTEGER NOT NULL,
  ruleset_version VARCHAR(20) NOT NULL,
  changed_players SMALLINT NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS rating_audit (            -- vết đính chính điểm
  id          BIGSERIAL PRIMARY KEY,
  run_id      INTEGER NOT NULL REFERENCES rating_runs(id) ON DELETE CASCADE,
  match_id    INTEGER NOT NULL,
  player_id   INTEGER NOT NULL,
  old_rating  NUMERIC(3,1),
  new_rating  NUMERIC(3,1),
  reason      TEXT,                                 -- 'VAR huỷ bàn thắng phút 67'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS player_rating_stats (     -- bảng tổng hợp phục vụ BXH cầu thủ (mục 12.5)
  period_type  VARCHAR(12) NOT NULL CHECK (period_type IN ('week','month','year','competition','squad')),
  period_key   VARCHAR(30) NOT NULL,                -- '2026-W38', '2026', 'season:12', 'squad:7'
  player_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  matches      SMALLINT NOT NULL DEFAULT 0,
  minutes      SMALLINT NOT NULL DEFAULT 0,
  avg_rating   NUMERIC(4,2),
  goals        SMALLINT NOT NULL DEFAULT 0,
  assists      SMALLINT NOT NULL DEFAULT 0,
  motm_count   SMALLINT NOT NULL DEFAULT 0,
  yellow_cards SMALLINT NOT NULL DEFAULT 0,
  red_cards    SMALLINT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (period_type, period_key, player_id)
);
CREATE INDEX IF NOT EXISTS idx_prs_rating ON player_rating_stats(period_type, period_key, avg_rating DESC);

-- D. GIÁ TRỊ CẦU THỦ (DEV 2)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS market_value_eur    BIGINT,   -- giá trị thị trường gốc (nguồn có bản quyền / nhập tay)
  ADD COLUMN IF NOT EXISTS estimated_value_eur BIGINT,   -- giá trị ước tính theo phong độ (mục 11.5)
  ADD COLUMN IF NOT EXISTS value_updated_at    TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS player_value_history (
  player_id           INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  recorded_on         DATE NOT NULL,
  market_value_eur    BIGINT,
  estimated_value_eur BIGINT,
  form_rating         NUMERIC(4,2),                -- điểm phong độ dùng để tính
  reason              JSONB,                       -- giải thích biến động
  PRIMARY KEY (player_id, recorded_on)
);

-- E. TRỢ LÝ AI (DEV 1)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE TABLE IF NOT EXISTS ai_conversations (
  id          UUID PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(120),
  summary     TEXT,                                -- tóm tắt phần hội thoại cũ (mục 10.5)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ai_messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            VARCHAR(10) NOT NULL CHECK (role IN ('user','assistant','tool')),
  content         TEXT NOT NULL,
  tool_name       VARCHAR(60),
  tokens_in       INTEGER NOT NULL DEFAULT 0,
  tokens_out      INTEGER NOT NULL DEFAULT 0,
  feedback        SMALLINT CHECK (feedback IN (-1, 1)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id, id);
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day         DATE NOT NULL,
  tokens_in   INTEGER NOT NULL DEFAULT 0,
  tokens_out  INTEGER NOT NULL DEFAULT 0,
  cost_usd    NUMERIC(8,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE TABLE IF NOT EXISTS kb_documents (
  id          SERIAL PRIMARY KEY,
  source      VARCHAR(40) NOT NULL,                -- 'history','achievement','player_bio','faq','rules'
  title       VARCHAR(200) NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS kb_chunks (
  id          BIGSERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   vector(768) NOT NULL,
  tsv         tsvector
);
CREATE INDEX IF NOT EXISTS idx_kb_embedding ON kb_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_kb_tsv       ON kb_chunks USING gin (tsv);

-- F. NHẬT KÝ QUẢN TRỊ
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(60) NOT NULL,                -- 'rating.manual_edit', 'theme.create'
  entity      VARCHAR(60) NOT NULL,
  entity_id   VARCHAR(64),
  before      JSONB,
  after       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Mỗi migration có file `.down.sql` tương ứng (xoá theo thứ tự ngược).

### 9.4. Index, tốc độ truy vấn < 50ms & dữ liệu mẫu

| Index | Phục vụ truy vấn |
|---|---|
| `matches(kickoff_at)`, `matches(status)` | Lịch thi đấu, trận live, khung giờ thi đấu của job 1 phút |
| `match_events(match_id, minute)`, `match_events(player_id)` | Diễn biến trận, tổng hợp thẻ/bàn theo cầu thủ |
| `player_match_stats(player_id, match_id DESC)` | Biểu đồ phong độ 10 trận, điểm trung bình 5 trận |
| `uq_pms_motm` (partial unique) | Mỗi trận chỉ 1 cầu thủ xuất sắc nhất |
| `player_rating_stats(period_type, period_key, avg_rating DESC)` | BXH cầu thủ |
| `theme_schedules(start_at, end_at)` | Theme đang áp dụng lúc này |
| `achievements(team_id, edition_year DESC)` | Dòng thời gian thành tích |
| `competition_standings` (khoá chính) | BXH bảng đấu |
| `kb_chunks` HNSW + GIN | Tìm kiếm cho trợ lý AI |

| Biện pháp | Chi tiết |
|---|---|
| Kiểm tra mọi truy vấn mới | PR phải kèm `EXPLAIN (ANALYZE, BUFFERS)` |
| Phân trang keyset | `WHERE (kickoff_at, id) < ($1, $2) ORDER BY kickoff_at DESC, id DESC LIMIT 20` — không dùng `OFFSET` lớn |
| Read replica | API đọc dùng `DATABASE_READ_URL`; ghi và đọc-sau-ghi dùng primary |
| Connection pool | PgBouncer (transaction mode) hoặc pooler có sẵn của nhà cung cấp |
| Bảo vệ | `statement_timeout`; log truy vấn > `DB_SLOW_QUERY_MS` (50ms); `pg_stat_statements`, xem top 10 truy vấn chậm mỗi tuần |
| Tính sẵn | BXH cầu thủ, điểm trung bình, phong độ lưu ở bảng tổng hợp + Redis thay vì `GROUP BY` lúc request |

**Dữ liệu mẫu** ✅ đã hiện thực tại [backend/src/db/seeds/featureData.ts](backend/src/db/seeds/featureData.ts) (chạy bằng `npm run db:reset`), bổ sung:

- `themes`: `default`, `tet`, `reunification`, `national-day`, `asean-cup`, `sea-games`, `victory`, `keep-fire`; `theme_schedules`: các ngày lễ năm nay và năm sau.
- `team_profiles` + `achievements`: vô địch Đông Nam Á 2008 · 2018 · 2024; tứ kết Asian Cup 2007 · 2019.
- `onboarding_slides`: 4 slide ở mục 4.1.
- `competitions`, `seasons`, `competition_standings`: một giải có bảng đấu để thử màn BXH.
- `squads` + `squad_members`: đợt triệu tập hiện tại.
- `rating_rulesets`: bộ `2026.1` (mục 12.2).
- 1 trận đã kết thúc có đủ `match_stats` + `player_match_stats` + thẻ để thử sơ đồ có điểm.

---


## 10. TRỢ LÝ AI — "HỎI ĐÁP ĐỘI TUYỂN" (DEV 1)

### 10.1. Chọn kỹ thuật

| Loại câu hỏi | Ví dụ | Kỹ thuật |
|---|---|---|
| Dữ liệu có cấu trúc, thay đổi từng phút | "Tỷ số Việt Nam – Thái Lan bao nhiêu?", "Tiến Linh năm nay ghi mấy bàn?", "Việt Nam đứng thứ mấy bảng B?" | **Function Calling**: AI gọi tool → tool đọc DB/Redis → số liệu chính xác, mới nhất |
| Kiến thức dạng văn bản | "Việt Nam vô địch AFF Cup 2008 thế nào?", "Việt vị là gì?", "Tiểu sử HLV trưởng" | **RAG** trên `pgvector` (không thêm hạ tầng mới) |
| Kết hợp | "Vì sao Tiến Linh được 8.3 điểm?", "Trận tới Việt Nam nên lo ai?" | Tool (điểm + bảng cách tính, phong độ đối thủ) + RAG (luật, lịch sử) |

Dự đoán Thắng/Hòa/Thua bằng Gemini ✅ (bản 1.0) giữ nguyên và trở thành một tool của trợ lý.

### 10.2. Luồng xử lý `POST /ai/chat` (SSE streaming)

```
App gửi {conversationId?, message}
  │
  ├─(1) Kiểm tra: đăng nhập · hạn mức token/người/ngày · ngân sách toàn hệ thống · lọc prompt injection
  ├─(2) Nạp ngữ cảnh: system prompt (cố định → cache được) + tóm tắt hội thoại cũ
  │      + 8 lượt gần nhất + hồ sơ ngắn (cầu thủ yêu thích, đang bật Senior mode không)
  ├─(3) Gọi LLM (model nhanh, rẻ) kèm danh sách tool
  ├─(4) Vòng lặp tool (tối đa AI_MAX_TOOL_CALLS = 5): server chạy tool, kết quả rút gọn ≤ 2KB
  ├─(5) Stream câu trả lời về app, kèm "Dữ liệu cập nhật lúc HH:mm"
  └─(6) Lưu ai_messages (kết quả tool chỉ lưu bản rút gọn) + ai_usage (token, chi phí)
```

### 10.3. Danh sách tool (chỉ đọc)

| Tool | Tham số | Gọi service của | Cache |
|---|---|---|---|
| `get_live_matches` | – | DEV 5 (Redis `live:*`) | 5 giây |
| `get_match` · `get_match_events` · `get_match_stats` · `get_lineup` | `matchId` hoặc `{đối thủ, ngày}` | DEV 5 | 30 giây |
| `get_player_ratings` | `matchId, playerId?` — kèm bảng cách tính điểm | DEV 3 | 1 phút |
| `search_player` | `name` (gõ không dấu vẫn tìm được) | DEV 5 | 1 giờ |
| `get_player_stats` · `get_player_value` | `playerId, period?` | DEV 5 · DEV 2 | 5 phút |
| `get_player_leaderboard` | `period, metric` | DEV 3 | 5 phút |
| `get_competition_standings` | `competition, season?` | DEV 5 | 5 phút |
| `get_fixtures` | `from, to` | DEV 5 | 10 phút |
| `get_squad_callup` | `squadId?` (mặc định đợt hiện tại) | DEV 5 | 1 giờ |
| `get_head_to_head` | `opponent` | DEV 5 | 1 ngày |
| `get_fifa_ranking` · `get_team_achievements` | – | DEV 5 | 1 ngày |
| `predict_match` | `matchId` | `ai/prediction` ✅ | tới giờ bóng lăn |
| `search_knowledge` | `query` | `ai/rag` | 1 giờ |

Tool chỉ gọi service đọc có sẵn (hợp đồng C7). AI **không bao giờ tự viết SQL**.

### 10.4. RAG

- Kho tài liệu: `kb_documents` → `kb_chunks` (`embedding vector(768)` + `tsvector`), index HNSW + GIN.
- Nguồn: lịch sử đội tuyển, thành tích (`achievements`), tiểu sử cầu thủ/HLV, giải thích luật (việt vị, VAR), FAQ của app. Tin tức chỉ đưa vào khi có bản quyền.
- Nạp: cắt đoạn 500–800 token (chồng lấn 80) → embed → lưu. Job `ai.kb-index` chạy mỗi khi admin sửa nội dung.
- Tìm kiếm **lai**: vector + full-text PostgreSQL có `unaccent` ("tien linh" vẫn khớp "Tiến Linh") → gộp kết quả → lấy 5 đoạn tốt nhất.

### 10.5. Bộ nhớ hội thoại & tối ưu chi phí token

| Kỹ thuật | Chi tiết |
|---|---|
| Cửa sổ trượt + tóm tắt | Giữ nguyên văn 8 lượt gần nhất; từ lượt 12 tóm tắt phần cũ vào `ai_conversations.summary` |
| Cache prompt | System prompt + định nghĩa tool đặt đầu, cố định để dùng context caching của nhà cung cấp |
| Định tuyến model | Mặc định `GEMINI_MODEL` (flash); chỉ dùng `GEMINI_MODEL_PRO` cho câu hỏi phân tích nhiều bước |
| Rút gọn kết quả tool | Chỉ trả trường cần thiết, ≤ 2KB |
| Cache câu trả lời | Câu hỏi chung ("BXH FIFA của Việt Nam"): khoá = câu hỏi chuẩn hoá + `data_version`, TTL 5 phút — trận hot có hàng nghìn câu giống nhau |
| Hạn mức | `AI_DAILY_TOKEN_QUOTA_PER_USER`, `AI_DAILY_BUDGET_USD` (vượt thì tạm tắt chat và báo người dùng), `GEMINI_MAX_OUTPUT_TOKENS` |

Ước tính: `chi phí/ngày ≈ số người dùng AI × số câu hỏi/người × (token vào × giá vào + token ra × giá ra)`. Bảng `ai_usage` ghi đủ dữ liệu để theo dõi hằng ngày.

### 10.6. Rào chắn

- Chỉ trả lời về bóng đá Việt Nam và app; câu ngoài lề thì từ chối lịch sự.
- ⚠️ **Không đưa tỷ lệ cá cược, kèo hay gợi ý cá độ** (vi phạm pháp luật Việt Nam) — có câu kiểm tra bắt buộc trong bộ đánh giá.
- **Không bịa số liệu**: tool không có dữ liệu thì nói "chưa có dữ liệu"; số liệu luôn kèm thời điểm cập nhật.
- Kết quả tool là **dữ liệu, không phải lệnh** (chống prompt injection). Công cụ cá nhân lấy `user_id` từ JWT, không lấy từ tham số của AI.
- Riêng tư: nội dung chat tự xoá sau `AI_CHAT_RETENTION_DAYS`; người dùng xoá được lịch sử; log không ghi nội dung tin nhắn.
- Senior mode: câu trả lời ngắn, chữ to, có nút "Đọc to".

### 10.7. Đánh giá chất lượng

Bộ **150 câu hỏi mẫu tiếng Việt** (tỷ số, BXH, cầu thủ, điểm cầu thủ, lịch sử, câu gõ không dấu, câu bẫy cá độ) chạy tự động trên staging mỗi đêm và mỗi lần đổi prompt/model. Chỉ số đo: chọn đúng tool, đúng số liệu, từ chối đúng lúc, độ trễ, token/câu. Chất lượng tụt quá 5% thì chặn deploy.

### 10.8. API & giao diện

API: mục 8.5. Giao diện: **khung ② của tab Thống kê** và nút "Hỏi AI về trận này" trong chi tiết trận (mục 5.6–5.7).

---

## 11. DATA INGESTION & CẬP NHẬT 1 PHÚT/LẦN (DEV 2)

### 11.1. Adapter nhà cung cấp dữ liệu

```ts
// modules/ingestion/providers/provider.ts
export interface FootballProvider {
  name: 'apifootball' | 'sportmonks';
  getFixtures(q: { teamId: string; from: Date; to: Date }): Promise<FixtureDTO[]>;
  getFixtureFull(id: string): Promise<FixtureFullDTO>;   // tỷ số + sự kiện + đội hình + thống kê trong 1 request
  getSquad(teamId: string): Promise<PlayerDTO[]>;
  getStandings(leagueId: string, season: string): Promise<StandingDTO[]>;
  getPlayer(id: string): Promise<PlayerProfileDTO>;       // CLB, chiều cao, giá trị (nếu có)
}
```

- Mỗi nhà cung cấp một adapter; **normalizer** chuyển về DTO nội bộ, nên phần còn lại của hệ thống không phụ thuộc nguồn.
- `external_refs` ánh xạ ID nhà cung cấp → ID nội bộ; đổi nhà cung cấp không làm đổi ID trong app.
- API-Football gọi trực tiếp (header `x-apisports-key`) hoặc qua RapidAPI (`x-rapidapi-key` + `x-rapidapi-host`) — chọn bằng `APIFOOTBALL_VIA_RAPIDAPI`.
- **Circuit breaker**: lỗi liên tiếp → chuyển sang `FOOTBALL_PROVIDER_FALLBACK` (nếu có) + cảnh báo.
- **Hạn mức**: bộ đếm Redis theo ngày; dùng quá 90% ngân sách thì tự giãn chu kỳ + cảnh báo.
- ⚠️ **Xác minh độ phủ trước khi mua gói**: các trận của ĐTVN (giao hữu, ASEAN Cup, vòng loại Asian Cup/World Cup, SEA Games) có đủ **sự kiện, đội hình, thống kê từng cầu thủ** không. Nếu thiếu thống kê chi tiết, engine chấm điểm vẫn chạy được từ sự kiện chính (mục 12.2), và admin nhập bổ sung khi cần.
- ⚠️ Trang Transfermarkt cấm cào dữ liệu → không dùng. Giá trị thị trường lấy từ nguồn có bản quyền hoặc nhập tay.

### 11.2. Hàng đợi BullMQ & lịch chạy

| Queue | Lịch / kích hoạt | Việc | Chống trùng (`jobId`) |
|---|---|---|---|
| `ingest.plan` | **mỗi 60 giây** | Chọn trận trong khung thi đấu → tạo `ingest.match` | lịch lặp |
| `ingest.match` | từ `ingest.plan` | Gọi API 1 trận: tỷ số, sự kiện, đội hình, thống kê | `match:{id}:{phút}` |
| `ingest.daily` | 01:00 đội hình dự kiến · 01:10 cầu thủ · 01:20 lịch thi đấu + kênh phát sóng · 01:30 BXH FIFA | Dữ liệu tĩnh | `daily:{loại}:{ngày}` |
| `ingest.standings` | sau mỗi trận của giải + 1 lần/ngày | BXH bảng đấu | `standings:{season}:{mốc}` |
| `player.value` | 03:00 hằng ngày + sau mỗi trận đã chốt điểm | Giá trị ước tính (mục 11.5) | `value:{ngày}` |
| `rating.match` · `rating.finalize` | khi dữ liệu trận đổi · job hẹn giờ T+15′, T+60′ | Engine chấm điểm (DEV 3, mục 12) | `rating:{matchId}:{dataVersion}` |
| `notify.push` | theo sự kiện | Thông báo đẩy (DEV 5) | `push:{loại}:{id}` |
| `maintenance.cleanup` · `theme.schedule` | 02:00 · 00:00 | Dọn token/mã OTP hết hạn · làm mới cache theme | theo ngày |

Mặc định: thử lại 3 lần, chờ tăng dần. Job thất bại hết lượt → vào hàng lỗi + cảnh báo. Chọn BullMQ (không phải Celery) vì cả hệ thống dùng Node/TypeScript. **Job hẹn giờ của BullMQ nằm trong Redis nên không mất khi server khởi động lại** (thay cho `setTimeout` của bản 2.0).

### 11.3. Vòng cập nhật 1 phút/lần

```
ingest.plan (mỗi 60 giây):
  1. SELECT các trận của VN có kickoff_at ∈ [now − 3h, now + 3h] hoặc status = 'live'   ← index, < 1ms
  2. Không có trận → thoát (không gọi API ngoài)                                        ← phần lớn thời gian
  3. Mỗi trận → tạo ingest.match (jobId chống trùng nếu lượt trước chưa xong)

ingest.match(matchId):
  a. Khoá Redis lock:ingest:{id} — không để 2 worker xử lý cùng 1 trận
  b. Gọi API → chuẩn hoá → tính hash từng phần: tỷ số | sự kiện | đội hình | thống kê
  c. So với hash lần trước:
       không đổi → chỉ ghi last_polled_at
       có đổi   → (1) ghi Redis live:match:{id}
                  (2) 1 transaction: cập nhật matches, match_events, lineups, match_stats, player_match_stats;
                      data_version + 1
                  (3) sự kiện bị nhà cung cấp xoá (VAR huỷ bàn, phạt đền bị huỷ) → is_deleted = true
                  (4) phát match.updated (C2) + emit socket + xoá cache liên quan
                  (5) trận chuyển 'live' → emit + thông báo "Trận đấu bắt đầu"
  d. ĐỘI HÌNH: từ 90 phút trước trận. Lần đầu có đội hình chính thức → lineups.announced_at,
     emit lineup:announced, thông báo "Đội hình ra sân đã công bố" (đúng 1 lần nhờ announced_at)
```

| Dữ liệu | Ngoài khung thi đấu | Khung T−3h → T+3h | Đang đá |
|---|---|---|---|
| Trận đấu (giờ, trạng thái, kênh) | 1 lần/ngày (01:20) | **1 phút/lần** | **1 phút/lần** (💡 12–15 giây) |
| Đội hình | 1 lần/ngày (01:00) | **1 phút/lần** từ T−90′ | **1 phút/lần** (thay người) |
| Thông tin & giá trị cầu thủ | 1 lần/ngày | không đổi | không đổi |

**Ước tính lượt gọi API** (1 request/lượt nhờ gọi gộp): 1 trận ≈ 6 giờ × 60 = **360 request/ngày có trận**; ngày không có trận ≈ 5 request. Gói miễn phí (~100/ngày) chỉ đủ để phát triển; khi phát hành cần gói trả phí (đặt `PROVIDER_DAILY_REQUEST_BUDGET` theo gói).

**Tỷ lệ ghi DB**: một trận có khoảng 360 lượt gọi nhưng chỉ vài chục lượt có thay đổi → chỉ ghi khi hash đổi, **DB không bị nghẽn** (đúng mục tiêu của kế hoạch).

### 11.4. Thiết kế khoá Redis (hợp đồng C3)

| Khoá | Kiểu | TTL | Ghi | Đọc |
|---|---|---|---|---|
| `live:match:{id}` | JSON snapshot trận | 6 giờ | DEV 2 | DEV 5, DEV 1 |
| `live:match:{id}:hash` | hash từng phần | 6 giờ | DEV 2 | DEV 2 |
| `live:matches:active` | set trận đang live | – | DEV 2 | DEV 5 |
| `provider:quota:{nhà cung cấp}:{ngày}` | bộ đếm | 48 giờ | DEV 2 | giám sát |
| `lock:ingest:{id}` | khoá | 55 giây | DEV 2 | – |
| `rating:match:{id}` | điểm mọi cầu thủ của trận | 7 ngày | DEV 3 | DEV 5, DEV 1 |
| `lb:player:{period}:{metric}` | sorted set BXH cầu thủ | theo kỳ | DEV 3 | DEV 5 |
| `theme:active` | theme đang áp dụng | ≤ 5 phút | Theme | DEV 5 |
| `cache:{route}:{tham số}` | phản hồi API | theo route | DEV 5 | DEV 5 |
| `ai:resp:{hash}` · `ai:quota:{user}:{ngày}` | cache câu trả lời · hạn mức | 5 phút · 48 giờ | DEV 1 | DEV 1 |

`live:*`, `rating:*`, `lb:*`, `cache:*` nằm ở **redis-cache**; mọi thứ của BullMQ nằm ở **redis-queue**.

### 11.5. Giá trị cầu thủ & biến động theo phong độ

Hai con số tách riêng, hiển thị riêng ở hồ sơ cầu thủ:

| | Giá trị thị trường | Giá trị ước tính theo phong độ 🆕 |
|---|---|---|
| Cột | `players.market_value_eur` | `players.estimated_value_eur` |
| Nguồn | Nhà cung cấp có bản quyền hoặc admin nhập | App tự tính (DEV 2) |
| Cập nhật | 1 lần/ngày (thường chỉ đổi vài lần/năm) | Sau mỗi trận đã chốt điểm + 03:00 hằng ngày |
| Hiển thị | "Giá trị thị trường: 350.000 €" + nguồn + ngày | "Ước tính theo phong độ: 384.000 € ▲9,6%" + biểu đồ |

```
form      = điểm trung bình có trọng số của PLAYER_VALUE_FORM_MATCHES (5) trận gần nhất (trận gần nặng hơn)
baseline  = điểm trung bình của cùng vị trí trong đội (≈ 6,5)
minutes   = số phút đã đá / số phút có thể đá trong các trận đó
Δ%        = clamp( 8 × (form − baseline) + 4 × (minutes − 0,5) , −PLAYER_VALUE_MAX_CHANGE_PCT , +PLAYER_VALUE_MAX_CHANGE_PCT )
ước tính  = ước tính cũ × (1 + Δ% / 100)
neo lại   = mỗi đêm: ước tính = 0,7 × ước tính + 0,3 × giá trị thị trường   ← không trôi quá xa giá trị thật
```

Ví dụ: phong độ 7,5 (baseline 6,5) và đá 90% số phút → Δ = 8 × 1,0 + 4 × 0,4 = **+9,6%**.
Mọi lần đổi ghi vào `player_value_history` kèm lý do để app giải thích được. ⚠️ Luôn ghi rõ "ước tính của app, không phải giá chuyển nhượng chính thức".

### 11.6. Sự kiện `match.updated` (hợp đồng C2)

```json
{
  "schema": "match.updated/v1",
  "matchId": 42,
  "dataVersion": 17,
  "status": "live",
  "changed": ["score", "events"],
  "corrections": [ { "type": "event_removed", "providerEventId": "ev_9912", "reason": "var" } ],
  "occurredAt": "2026-09-20T12:47:05Z"
}
```

Bên nhận bỏ qua sự kiện có `dataVersion` cũ hơn bản đã xử lý, nên job đến trễ hoặc sai thứ tự không làm hỏng dữ liệu.

---

## 12. ENGINE CHẤM ĐIỂM CẦU THỦ (DEV 3)

### 12.1. Vai trò

Engine quy đổi **sự kiện thật của trận** (bàn thắng, kiến tạo, thẻ phạt, cứu thua, giữ sạch lưới…) thành **điểm từng cầu thủ** trên thang 0–10, theo từng vị trí. Điểm này được dùng ở:

- **Sơ đồ đội hình**: điểm + thẻ hiện ngay trên đầu cầu thủ sau trận (mục 5.3) — tính năng bạn đã chọn.
- Hồ sơ cầu thủ: biểu đồ phong độ 10 trận, điểm trung bình 5 trận (mục 5.4).
- Tab Thống kê: cầu thủ xuất sắc nhất trận, BXH cầu thủ (mục 5.6, 12.5).
- Giá trị ước tính theo phong độ (mục 11.5) và trợ lý AI (mục 10).

**Nguồn điểm hiển thị**: `manual` (admin sửa) luôn thắng. Còn lại theo `RATING_PRIMARY_SOURCE`: `engine` (mặc định — điểm do app tính, **giải thích được từng điểm cộng/trừ**) hoặc `provider` (điểm của nhà cung cấp). Điểm của nhà cung cấp luôn được lưu ở `provider_rating` để đối chiếu và hiệu chỉnh engine.

### 12.2. Bộ quy tắc quy đổi theo vị trí (ruleset `2026.1`)

| Sự kiện | Thủ môn | Hậu vệ | Tiền vệ | Tiền đạo |
|---|---|---|---|---|
| Điểm khởi đầu (đá ≥ 10 phút) | 6,0 | 6,0 | 6,0 | 6,0 |
| Bàn thắng | +1,5 | +1,3 | +1,1 | +1,0 |
| Kiến tạo | +0,8 | +0,8 | +0,8 | +0,8 |
| Đường chuyền quyết định\* | +0,2 | +0,2 | +0,2 | +0,2 |
| Dứt điểm trúng đích\* | – | +0,1 | +0,1 | +0,1 |
| Mỗi pha tắc bóng / cắt bóng\* | – | +0,15 | +0,1 | +0,05 |
| Mỗi pha cứu thua | +0,3 | – | – | – |
| Cản phạt đền | +1,5 | – | – | – |
| Giữ sạch lưới (đá ≥ 60′) | +1,0 | +0,8 | +0,3 | – |
| Mỗi bàn thua khi đang trên sân | −0,3 | −0,2 | – | – |
| Thẻ vàng | −0,5 | −0,5 | −0,5 | −0,5 |
| Thẻ đỏ (kể cả do 2 thẻ vàng; tổng trừ tối đa −1,5) | −1,5 | −1,5 | −1,5 | −1,5 |
| Phản lưới nhà | −1,0 | −1,0 | −1,0 | −1,0 |
| Đá hỏng phạt đền | −1,0 | −1,0 | −1,0 | −1,0 |
| Đội thắng / đội thua | +0,3 / −0,2 | +0,3 / −0,2 | +0,3 / −0,2 | +0,3 / −0,2 |

\* Chỉ tính khi nhà cung cấp có dữ liệu. Thiếu thì dòng đó bằng 0, engine vẫn chạy với các sự kiện chính (bàn thắng, kiến tạo, thẻ, cứu thua, bàn thua) — những dữ liệu này gần như luôn có.

Quy tắc chung:

- Kết quả giới hạn trong **[3,0 ; 10,0]**, làm tròn 1 chữ số thập phân.
- Đá dưới `RATING_MIN_MINUTES` (10 phút) → không chấm, app hiện "–".
- **Cầu thủ xuất sắc nhất trận (MOTM)** = điểm cao nhất; bằng điểm thì ưu tiên cầu thủ đội thắng, rồi người đá nhiều phút hơn.

**Ví dụ** — Tiến Linh (Tiền đạo, đá 67′, VN thắng 2–1): 6,0 + 2 bàn × 1,0 + 1 đường chuyền quyết định × 0,2 + 3 cú sút trúng đích × 0,1 + thắng 0,3 − thẻ vàng 0,5 = **8,3**.
App lưu bảng này ở `rating_breakdown` và hiện khi người dùng chạm "Vì sao 8.3?" — **FotMob và SofaScore không giải thích được như vậy**.

**Hiện thực**:

- Bộ quy tắc lưu dạng JSON có phiên bản trong `rating_rulesets`, nên chỉnh hệ số không cần deploy lại.
- Engine là **hàm thuần** `rate(stats, events, position, matchContext, ruleset) → { rating, breakdown[] }`: không gọi DB, không gọi mạng, nên chạy lại bao nhiêu lần cũng ra cùng kết quả.
- Mỗi dòng của bảng trên có test riêng (test dạng bảng), độ phủ ≥ 90%.
- Hệ số ban đầu sẽ được **hiệu chỉnh** bằng cách so với điểm nhà cung cấp trên các trận đã có.

### 12.3. Xử lý hàng loạt & chốt điểm

Mỗi khi DEV 2 phát `match.updated` (mỗi lần dữ liệu đổi trong chu kỳ 1 phút), job `rating.match` chạy:

```
1. Đọc thống kê + sự kiện (bỏ sự kiện is_deleted) của trận
2. Chấm lại TOÀN BỘ cầu thủ của trận (~30–40 người) — không cộng dồn, nên luôn đúng kể cả khi dữ liệu bị sửa
3. Chỉ ghi các dòng có điểm thay đổi → rating_runs (+ rating_audit nếu là đính chính)
4. Cập nhật bảng tổng hợp player_rating_stats cho cầu thủ bị ảnh hưởng (1 câu SQL gộp) + Redis lb:*
5. Xoá cache (/matches/:id/lineups, /squad/last-match, /players/:id, BXH) → emit socket match:ratings
```

| Mốc | Việc | `ratings_status` |
|---|---|---|
| Đang đá | Nếu bật `RATING_LIVE_ENABLED`: điểm tạm hiện trong chi tiết trận (💡 A5.2 #6). Sơ đồ đội hình vẫn chỉ hiện điểm sau khi hết trận, đúng yêu cầu | `live` |
| **T+0** (hết trận) | Chấm điểm + thống kê; emit `match:stats`, `match:ratings`; thông báo "⭐ Điểm cầu thủ đã có"; theme "Đi bão/Tiếp lửa" tự bật (mục 6.3) | `provisional` |
| **T+15′** | Job hẹn giờ lấy lại dữ liệu (nhà cung cấp hay chỉnh trong 15–60 phút đầu) → chấm lại | `provisional` |
| **T+60′** | Lần cuối → chốt MOTM, cập nhật số trận/bàn ĐTQG, giá trị ước tính, BXH cầu thủ | `final` |

**"Hàng triệu người dùng" nằm ở phần phát kết quả, không nằm ở phần tính**:

- Tính điểm một trận chỉ mất vài mili-giây.
- Kết quả được cache sẵn và phục vụ qua CDN.
- Socket.IO phát theo room qua redis-adapter.
- Thông báo đẩy dùng **FCM topic**: máy bật "điểm cầu thủ" được đăng ký vào topic `ratings`, nên **một lệnh gửi** tới được mọi máy. Không phải lặp qua từng token.
- Mục tiêu tới toàn bộ thiết bị trong ≤ 2 phút, đo ở stress test (mục 14.6).

### 12.4. Cơ chế đính chính điểm

| Nguồn kích hoạt | Ví dụ | Xử lý |
|---|---|---|
| Nhà cung cấp sửa dữ liệu | VAR huỷ bàn, phạt đền bị huỷ, đổi người kiến tạo, sửa số cứu thua | `match.updated` có `corrections` → chấm lại cả trận → so điểm cũ/mới |
| Admin sửa tay | Nhà cung cấp sai mà không sửa | `rating_source = 'manual'` (**job không bao giờ ghi đè**) |
| Đổi bộ quy tắc | Hiệu chỉnh hệ số | Admin chạy chấm lại có chủ đích, ghi rõ phiên bản |

- **Thời hạn**: tự động đính chính trong `RATING_CORRECTION_WINDOW_HOURS` (72 giờ) sau khi chốt. Sau đó chỉ admin sửa được, có ghi `audit_logs`.
- **Lưu vết**: mỗi thay đổi ghi `rating_audit` (điểm cũ, điểm mới, lý do). MOTM được xét lại; BXH cầu thủ và giá trị ước tính tính lại theo.
- **Chống chạy chồng**: mỗi trận chỉ 1 job chấm điểm tại một thời điểm; sự kiện có `dataVersion` cũ bị bỏ qua.
- **Báo người xem**: socket `ratings:corrected` → app hiện "Điểm đã cập nhật: VAR huỷ bàn thắng phút 67′".

### 12.5. Bảng xếp hạng cầu thủ (Leaderboards)

Thay cho "xếp hạng người dùng" trong kế hoạch, vì app không phải game.

| Kỳ (`period_type`) | Ví dụ `period_key` | Ý nghĩa |
|---|---|---|
| `squad` | `squad:7` | Đợt tập trung / FIFA Days |
| `competition` | `season:12` | Một giải (ASEAN Cup 2026…) |
| `year` · `month` | `2026` · `2026-09` | Theo năm / tháng |
| `week` | `2026-W38` | Theo tuần — có ý nghĩa khi bật 💡 radar phong độ cầu thủ tại CLB (A5.2 #5) |

- **Chỉ số**: điểm trung bình, bàn thắng, kiến tạo, số lần xuất sắc nhất trận, thẻ phạt, phút thi đấu.
- **Điều kiện xếp hạng điểm trung bình**: đá ít nhất `LEADERBOARD_MIN_MINUTES` (90 phút) trong kỳ.
- **Bằng điểm**: xếp ngang hạng.
- **Nơi hiện**: Tab 5 Thống kê (mục 5.6), trợ lý AI, huy hiệu "Cầu thủ xuất sắc nhất năm" trên hồ sơ.

```sql
-- Cập nhật tổng hợp cho các cầu thủ vừa đổi điểm (1 câu, không lặp từng dòng)
INSERT INTO player_rating_stats (period_type, period_key, player_id, matches, minutes, avg_rating,
                                 goals, assists, motm_count, yellow_cards, red_cards, updated_at)
SELECT 'year', to_char(m.kickoff_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY'), s.player_id,
       COUNT(*), SUM(s.minutes_played), AVG(s.rating) FILTER (WHERE s.rating IS NOT NULL),
       SUM(v.goals), SUM(v.assists), COUNT(*) FILTER (WHERE s.is_motm),
       SUM(jsonb_array_length(jsonb_path_query_array(v.cards, '$[*] ? (@.type == "yellow_card")'))),
       SUM(jsonb_array_length(jsonb_path_query_array(v.cards, '$[*] ? (@.type != "yellow_card")'))),
       now()
FROM player_match_stats s
JOIN matches m ON m.id = s.match_id AND m.ratings_status = 'final'
JOIN v_player_match_summary v ON v.match_id = s.match_id AND v.player_id = s.player_id
WHERE s.player_id = ANY($1) AND m.kickoff_at >= date_trunc('year', now())
GROUP BY 1, 2, 3
ON CONFLICT (period_type, period_key, player_id) DO UPDATE SET
  matches = EXCLUDED.matches, minutes = EXCLUDED.minutes, avg_rating = EXCLUDED.avg_rating,
  goals = EXCLUDED.goals, assists = EXCLUDED.assists, motm_count = EXCLUDED.motm_count,
  yellow_cards = EXCLUDED.yellow_cards, red_cards = EXCLUDED.red_cards, updated_at = now();
```

---

## 13. XÁC THỰC & HỒ SƠ NGƯỜI DÙNG (DEV 4)

### 13.1. Luồng xác thực

| Luồng | Thiết kế |
|---|---|
| Đăng ký / đăng nhập email | bcrypt 12 ✅; mật khẩu ≥ 8 ký tự có chữ và số; khoá tạm sau 5 lần sai / 15 phút |
| Access token | JWT 15 phút ✅, claims `sub, role, sv` (`sv` = `users.session_version`: đổi mật khẩu hoặc đăng xuất mọi nơi thì tăng lên) |
| Refresh token | 7 ngày ✅, **xoay vòng** mỗi lần dùng; token cũ bị dùng lại → thu hồi **cả chuỗi** `family_id` (dấu hiệu bị đánh cắp) |
| **Google OAuth2** 🆕 | App lấy `idToken` → `POST /auth/google` → server xác minh chữ ký + `aud ∈ GOOGLE_OAUTH_CLIENT_IDS` + `email_verified` → tìm theo `(google, sub)` → chưa có thì tạo tài khoản |
| **Facebook** 🆕 | App lấy `accessToken` (Facebook SDK) → `POST /auth/facebook` → server xác minh qua Graph API `debug_token` (`app_id` đúng, còn hạn) → lấy `/me?fields=id,name,email`. Facebook có thể **không trả email** → vẫn cho tạo tài khoản, hỏi bổ sung sau |
| Gộp tài khoản | Chỉ tự gộp vào tài khoản email có sẵn khi nhà cung cấp xác nhận `email_verified`; nếu không sẽ lộ lỗ hổng chiếm tài khoản |
| 💡 Sign in with Apple | App iOS có đăng nhập Google/Facebook thì theo App Store Guideline 4.8 cần thêm lựa chọn đăng nhập bảo vệ quyền riêng tư |
| **Quên mật khẩu** 🆕 | Mã OTP 6 số qua email (`password_reset_codes`, mục 9.2): lưu hash, hết hạn 15 phút, tối đa 5 lần sai, dùng 1 lần; **luôn trả 200** (chống dò email); giới hạn 3 lần/giờ/email + 10 lần/giờ/IP |
| Đổi mật khẩu / xoá tài khoản | Nhập lại mật khẩu (tài khoản mạng xã hội: xác nhận bằng OTP); xoá CASCADE toàn bộ dữ liệu cá nhân + ảnh + lịch sử chat AI |

Danh sách endpoint: mục 8.2 (đăng ký, đăng nhập, quên/đổi mật khẩu, xoá tài khoản) và 8.5 (Google, Facebook, liên kết tài khoản).

### 13.2. Hồ sơ & cài đặt (`is_senior_mode`, `theme_id`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET / PATCH | `/users/me` | Họ tên, tên hiển thị, ngày sinh, tỉnh/thành, cầu thủ yêu thích |
| POST / DELETE | `/users/me/avatar` | Ảnh đại diện (≤ 2MB, kiểm tra magic bytes, nén WebP, xoá EXIF) |
| GET / PUT | `/users/me/settings` | Cài đặt, đồng bộ nhiều máy |

```json
PUT /users/me/settings
{
  "isSeniorMode": true,
  "themeId": null,
  "colorScheme": "system",
  "ttsEnabled": true,
  "notify": { "goals": true, "kickoff": true, "lineup": true, "ratings": true,
              "result": true, "squad": true, "themes": false }
}
```

- `themeId`: `null` = tự động theo sự kiện · id theme `default` = tắt theme sự kiện · id khác = cố định một theme (thuật toán mục 6.3).
- Khách chưa đăng nhập: cài đặt chỉ lưu trên máy (Zustand persist), gửi kèm khi gọi `/themes/active`.

---

## 14. READ-API, TỐI ƯU PAYLOAD & KIỂM THỬ (DEV 5)

### 14.1. REST hay GraphQL?

**Chọn REST**, mỗi màn hình có endpoint gộp. Lý do:

- 5 tab cố định.
- Dữ liệu công khai **cache được ở CDN** theo URL; GraphQL gửi qua POST nên khó cache.
- Dễ stress test, dễ viết tài liệu.

### 14.2. API theo 5 tab

Kế hoạch gộp "Đội hình & Thông tin chi tiết cầu thủ" thành một nhóm API, nhưng trên app vẫn là 2 tab như danh sách lần 1 của bạn.

| Tab / màn | Endpoint | Nguồn | `Cache-Control` |
|---|---|---|---|
| Splash + giới thiệu | `/app/bootstrap` · `/onboarding/slides` | PG + Redis | `s-maxage=60` · `300` |
| **1. Giới thiệu & Thành tích** | `/team/profile` · `/team/achievements?cursor` · `/ranking/fifa` · `/coach` · `/matches/latest` | PG replica | `s-maxage=300` |
| **2. Trận đấu** | `/matches/live` · `/matches/upcoming?cursor` · `/matches/results?cursor` · `/matches/:id` · `/matches/:id/live` · `/matches/:id/h2h` · `/competitions/:id/standings` + socket | **Redis `live:*`** → PG | live: `s-maxage=5`; lịch: `60` |
| **3. Đội hình** | `/squad/current` · `/squad/last-match` · `/matches/:id/lineups` · `/squads/current` | PG + `rating:*` | `300`; khi có trận: `30` |
| **4. Cầu thủ** | `/players?position&sort&cursor&fields` · `/players/:id` · `/players/:id/clubs` · `/players/:id/ratings` · `/players/:id/value-history` | PG replica | `300` |
| **5. Thống kê** (khung ①) | `/stats/overview` · `/stats/matches` · `/matches/:id/stats` · `/matches/:id/ratings` · `/matches/:id/ratings/:playerId/explain` · `/stats/players/leaderboard` | PG replica + `lb:*` | chưa chốt: `60`; đã chốt: `86400` + ETag |
| Cài đặt | `/users/me` · `/users/me/settings` · `/themes` · `/themes/active` | PG | `private` |
| Trợ lý AI | `/ai/*` | PG + LLM | `private, no-store` |

### 14.3. Tối ưu payload cho app

| Kỹ thuật | Chi tiết |
|---|---|
| Nén | Brotli/gzip cho phản hồi > 1KB — ở LB/CDN, hoặc middleware `compression` |
| ETag / 304 | Mọi GET công khai có `ETag` (hash nội dung hoặc `data_version`) → không đổi thì trả 304, không có body |
| Phân trang | **Cursor**: `?limit=20&cursor=...` → `{ items, meta: { nextCursor } }`; tối đa 100 |
| Chọn trường | `?fields=id,shortName,shirtNumber,position` cho danh sách; bỏ trường `null` |
| Ảnh | URL CDN có kích cỡ (`?w=64\|128\|256`), định dạng WebP; không nhúng base64 |
| Chống N+1 | 1 truy vấn gộp (JOIN / `jsonb_agg`) mỗi endpoint; test đếm số truy vấn/request |
| Ngân sách kích thước | Danh sách ≤ 30KB, chi tiết ≤ 50KB (sau nén) — test tự động cảnh báo khi vượt |

### 14.4. Tài liệu API (Swagger / Postman)

- Schema viết bằng `zod` (đã dùng để validate ✅) → sinh **OpenAPI 3.1** (`@asteasolutions/zod-to-openapi`), nên tài liệu không lệch khỏi code.
- Swagger UI tại `/docs`, chỉ bật ở dev/staging.
- CI xuất `openapi.json` → Postman collection + **client TypeScript cho mobile** (`openapi-typescript`).
- CI so sánh với nhánh `main`: thay đổi phá vỡ tương thích thì PR bị đánh dấu.

### 14.5. Unit test & kiểm thử tự động

| Tầng | Công cụ | Ai viết | Mục tiêu |
|---|---|---|---|
| Unit | Vitest | Dev của module đó | Engine chấm điểm ≥ 90%; normalizer chạy trên dữ liệu thật đã ghi lại; toàn repo ≥ 70% |
| Integration | Supertest + PostgreSQL/Redis thật (Testcontainers) | DEV 5 dựng khung | Mọi endpoint: 200 / 4xx / 401 / 403, phân trang, ETag |
| Contract | So response với OpenAPI | DEV 5 | 100% endpoint |
| Socket | `scripts/socket-test.mjs` ✅ | DEV 5 | Đúng sự kiện, đúng room |
| Smoke | `scripts/smoke-test.mjs` ✅ | DEV 5 | Sau mỗi lần deploy |
| AI | Bộ 150 câu (mục 10.7) | DEV 1 | Mỗi đêm |

### 14.6. Stress test (k6)

| Kịch bản | Mô phỏng | Tải |
|---|---|---|
| **Trận hot** (VN – Thái Lan, chung kết) | 75% xem trận live + chi tiết trận; 15% giữ kết nối socket; 5% đội hình/thống kê; 5% chat AI (LLM giả lập) | 0 → 20.000 người dùng ảo trong 10 phút, giữ 20 phút |
| **Bàn thắng** | Mọi người dùng ảo mở chi tiết trận trong 30 giây | ×5 tải nền trong 60 giây |
| **Điểm cầu thủ đã có** | Thông báo tới toàn bộ thiết bị → mọi người mở Tab Đội hình cùng lúc | Đỉnh đọc `/squad/last-match` |
| **Mở app đầu ngày thi đấu** | `/app/bootstrap` + Tab Giới thiệu | 5.000 request/giây |

**Đạt khi**: p95 < 300ms, lỗi < 0,5%, CPU DB < 70%, hàng đợi tồn < 60 giây. Chạy trên **staging cùng cấu hình production**, trước mỗi giải lớn. Không bao giờ chạy vào production.

---

## 15. REALTIME & THÔNG BÁO ĐẨY (DEV 5)

- **Socket.IO**: sự kiện ở mục 8.4 + 8.6. Mọi kết nối vào room `global`; room `match:{id}` chỉ vào khi mở màn trận. Nhiều instance `api` → `@socket.io/redis-adapter` + sticky session.
- **Dự phòng**: mất socket quá 20 giây → app chuyển sang gọi `/matches/:id/live` mỗi 15 giây ✅.

**Thông báo đẩy** (FCM ✅), người dùng bật/tắt từng loại trong Cài đặt:

| Loại | Khi nào | Gửi tới |
|---|---|---|
| Trận sắp đá | Trước giờ bóng lăn 1 giờ | topic `kickoff` |
| Đội hình ra sân | Lần đầu có đội hình chính thức | topic `lineup` |
| Bàn thắng, thẻ đỏ, kết thúc trận | Khi xảy ra | topic `goals` · `result` |
| ⭐ Điểm cầu thủ đã có | T+0 | topic `ratings` |
| 🆕 Danh sách triệu tập mới | Khi công bố | topic `squad` |
| Theme sự kiện mới | Khi bắt đầu | topic `themes` |

Dùng **FCM topic** cho thông báo chung, nên một lệnh gửi tới được mọi máy đăng ký. Khi người dùng tắt một loại trong Cài đặt, app huỷ đăng ký topic tương ứng. Senior mode dùng câu rõ nghĩa: "Việt Nam ghi bàn! Tỷ số 2–1, phút 67".
💡 Chống spoil (A5.3): cho người dùng chọn đang xem trên kênh nào để app giữ thông báo bàn thắng lại vài chục giây cho khớp hình trên TV.

---

## 16. BIẾN MÔI TRƯỜNG — MỘT FILE `.env` DUY NHẤT ✅

### 16.1. Quy tắc

1. **Một file `.env` ở gốc repo** cho mọi thành phần (backend, các worker, docker-compose, mobile). Mẫu đầy đủ có chú thích và chủ sở hữu từng nhóm: **[.env.example](.env.example)**.
2. `.env` nằm trong `.gitignore`; chỉ commit `.env.example`. Thêm biến = sửa `.env.example` + `backend/src/config/env.ts` trong **cùng một PR**.
3. Backend **từ chối khởi động** khi thiếu hoặc sai biến (zod, nguyên tắc "hỏng thì hỏng sớm") ✅.
4. **Mobile chỉ thấy biến `EXPO_PUBLIC_*`** (bị nhúng vào app, ai cũng đọc được) → secret không bao giờ mang tiền tố này.
5. staging / production không dùng file: cùng tên biến được bơm từ Secret Manager.

### 16.2. Cách mỗi thành phần đọc cùng một file

| Thành phần | Cách nạp |
|---|---|
| Backend | ✅ `backend/src/config/env.ts`: `loadDotenv({ path: path.resolve(__dirname, '../../../.env') })` |
| Mobile (Expo) | ✅ `mobile/package.json`: `"start": "node --env-file=../.env node_modules/expo/bin/cli start"` (cần Node ≥ 20.6) |
| docker-compose | Tự đọc `.env` cùng thư mục; mỗi service thêm `env_file: .env` |
| EAS Build (cloud) | `.env` không được upload (bị gitignore) → khai báo biến `EXPO_PUBLIC_*` bằng EAS environment variables |

### 16.3. Các nhóm biến

| Nhóm | Nội dung | Chủ |
|---|---|---|
| 1–2 | Chung, `APP_ROLE`, server, CORS | DEV 1 |
| 3 | PostgreSQL (primary, replica, pool, ngưỡng truy vấn chậm 50ms) | DEV 4 |
| 4 | Redis cache / queue | DEV 2 |
| 5–7 | JWT, Google/Facebook/Apple, OTP, email, lưu trữ file | DEV 4 |
| 8 | Rate limit | DEV 5 |
| 9 | Trợ lý AI: LLM, embedding, bộ nhớ hội thoại, hạn mức token | DEV 1 |
| 10–11 | Nhà cung cấp dữ liệu, polling 60 giây, lịch job, giá trị cầu thủ | DEV 2 |
| 12 | **Engine chấm điểm cầu thủ**: phiên bản quy tắc, nguồn điểm, thời hạn đính chính, BXH | DEV 3 |
| 13–14 | Socket.IO, Firebase | DEV 5 |
| 15 | Log, Sentry, OpenTelemetry | DEV 1 |
| 16 | Swagger, nén, phân trang, k6 | DEV 5 |
| 17 | `EXPO_PUBLIC_*` cho mobile | DEV 6 |

### 16.4. Hiện trạng — ✅ đã chuyển đổi (11/09/2026)

- Gộp `backend/.env` và `mobile/.env` thành `.env` ở gốc, **giữ nguyên mọi giá trị đang chạy**. Đã xoá hai file cũ và hai file `.env.example` con.
- Tên biến cũ giữ nguyên để code đang chạy không đổi. Các biến mới (OAuth, BullMQ, AI chat, engine chấm điểm…) đã có trong `.env` nhưng **code chưa đọc**; mỗi dev thêm vào schema zod của `env.ts` khi làm phần của mình.

---

## 17. BẢO MẬT & PHÁP LÝ

| Lớp | Biện pháp |
|---|---|
| Mật khẩu | bcrypt cost 12; tối thiểu 8 ký tự có chữ và số |
| Phiên đăng nhập | Access token 15 phút, refresh token 7 ngày (lưu hash, xoay vòng, thu hồi được); `session_version` vô hiệu mọi token cũ khi đổi mật khẩu |
| Đăng nhập mạng xã hội | Xác minh token **ở server**; kiểm tra `aud` / `app_id`; chỉ gộp tài khoản khi email đã xác minh |
| Quên mật khẩu | OTP lưu hash, 15 phút, 5 lần sai, dùng 1 lần, phản hồi giống nhau cho mọi email, giới hạn theo email + IP |
| Ảnh đại diện | ≤ 2MB, kiểm tra magic bytes, chỉ JPG/PNG/WebP, nén lại bằng `sharp` (xoá EXIF có toạ độ GPS), tên file UUID |
| Phân quyền | `requireRole('admin')`; mọi thao tác `/admin/*` và sửa điểm tay ghi `audit_logs` |
| Dữ liệu cá nhân | Hội thoại AI, cài đặt, thiết bị luôn lọc theo `user_id` từ JWT; test "người A đọc dữ liệu người B → 404" |
| Theme từ server | Chỉ nhận token trong danh sách trắng, kiểm tra màu HEX + độ tương phản (mục 6.5) |
| Trợ lý AI | Tool chỉ đọc; chống prompt injection; không log nội dung chat; hạn mức token |
| Gateway | WAF, chống DDoS, rate-limit theo IP (LB) + theo người dùng (app); 5 lần đăng nhập sai / 15 phút / IP |
| Truyền tải · lưu trên máy | HTTPS/WSS bắt buộc; token trong `expo-secure-store`; AsyncStorage chỉ chứa dữ liệu không nhạy cảm |
| Validate · bí mật | `zod` ở mọi route, parameterized query; secret trong `.env` (dev) / Secret Manager (production); log không ghi mật khẩu, token, OTP, API key |

⚠️ **Pháp lý — cần luật sư xác nhận trước khi phát hành:**

1. **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15** (hiệu lực 01/01/2026): công khai chính sách, xin **đồng ý** khi thu thập; người dùng được **xem / sửa / xoá / rút lại đồng ý**; có quy trình xử lý sự cố lộ lọt; bảo vệ dữ liệu trẻ em. → Cần màn "Quyền riêng tư", API xuất và xoá dữ liệu.
2. **Bản quyền**: không nhúng video trận đấu (dẫn link sang app có bản quyền); logo giải đấu, ảnh cầu thủ cần xin phép hoặc dùng hình minh hoạ.
3. **Nguồn dữ liệu**: chỉ dùng API có giấy phép; Transfermarkt cấm cào dữ liệu.
4. **Nơi lưu trữ dữ liệu người dùng** (mục 3.7).
5. Trợ lý AI **không đưa kèo cá cược** (mục 10.6).

---

## 18. LỘ TRÌNH PHÁT TRIỂN

**Đã xong (bản 1.0) ✅**: repo, schema `001`, đăng ký/đăng nhập (bcrypt + JWT + secure-store), trận đấu (lịch, chi tiết, đối đầu), khung crawler + cron, đội hình & cầu thủ/HLV, realtime Socket.IO + polling dự phòng + thông báo bàn thắng, Gemini dự đoán + cache, app 4 tab + đăng nhập. **Gộp `.env`** ✅ (11/09/2026).

**Tiếp theo** (sprint 2 tuần; ➕ cột DEV 6 = Mobile):

| Sprint | DEV 1 | DEV 2 | DEV 3 | DEV 4 | DEV 5 | DEV 6 (Mobile) |
|---|---|---|---|---|---|---|
| **S0** (1 tuần) | `entrypoints/` + `APP_ROLE`, docker-compose, CI | **Xác minh độ phủ dữ liệu ĐTVN** của nhà cung cấp, chọn gói | Chốt bảng quy tắc chấm điểm (12.2) — ✅ đã lưu thành ruleset `2026.1` trong DB | ✅ **Xong**: migration `002`–`005` + dữ liệu mẫu (12/09/2026) | Khung OpenAPI + test | ✅ Đã chốt 5 tab + vị trí Trợ lý AI (12/09); dựng thanh tab + khung kéo ngang |
| **S1** | BullMQ + Redis ×2 | Adapter + normalizer + dữ liệu mẫu ghi lại | Engine (hàm thuần) + test bảng | Google/Facebook, refresh xoay vòng | API tab 1–2, cache, ETag | Splash + giới thiệu + tab bar 5 tab |
| **S2** | Adapter LLM, tool đọc, chat SSE | **Polling 60 giây** + Redis live + `match.updated` | Nối `match.updated`, chốt T+0 / T+15′ / T+60′ | OTP quên mật khẩu, hồ sơ, cài đặt, ảnh đại diện | API tab 3–4, socket | Tab Giới thiệu, Trận đấu, chi tiết trận |
| **S3** | Bộ nhớ hội thoại, RAG | Đội hình T−90′, VAR, ➕ triệu tập, ➕ BXH bảng đấu | Đính chính + lưu vết; ➕ Theme phía server | ➕ Xoá tài khoản, ➕ Apple, index < 50ms | API tab 5, ➕ API BXH bảng đấu + triệu tập, ➕ FCM topic | Tab Đội hình (điểm + thẻ trên đầu, ➕ Triệu tập), Tab Cầu thủ, ➕ BXH bảng đấu |
| **S4** | Hạn mức token, cache câu trả lời, bộ đánh giá 150 câu | Giá trị ước tính theo phong độ | BXH cầu thủ, admin sửa điểm | Rà soát bảo mật, quyền riêng tư (luật 91/2025) | Stress test k6 | Tab Thống kê, Cài đặt, Theme, màn chat AI |
| **S5** | Cloud staging/production, giám sát, ➕ build EAS & phát hành store | Chịu lỗi: circuit breaker, nhà cung cấp dự phòng | Hiệu chỉnh hệ số điểm với dữ liệu thật | ➕ Trang admin (phân quyền, nhật ký) | Sửa theo kết quả stress test | Senior mode, đọc to tỷ số, build EAS (cùng DEV 1) |
| **S6** | Beta đóng: chạy thử với các trận thật của ĐTVN, so điểm với nguồn gốc, sửa lỗi, phát hành | | | | | |

---

## 19. SO SÁNH ĐỐI THỦ

### 19.1. Các nhóm đối thủ

| Nhóm | Đại diện | Điểm mạnh | Điểm yếu với người hâm mộ ĐTVN |
|---|---|---|---|
| App tỷ số quốc tế | FotMob, SofaScore, FlashScore, 365Scores | Tỷ số nhanh, thống kê sâu, chấm điểm cầu thủ, heatmap | ĐTVN chỉ là 1 trong hàng nghìn đội; không có giới thiệu, thành tích, văn hoá cổ vũ Việt |
| App giải đấu lớn có AI | App Premier League + Premier League Companion (Microsoft Copilot) | Hỏi đáp AI trên hơn 30 mùa dữ liệu, cá nhân hoá | Chỉ Premier League; hình mẫu tốt cho trợ lý AI của mình |
| App xem trực tiếp | FPT Play, TV360, VTV Go | Có bản quyền phát sóng | Ít thống kê, không có điểm cầu thủ |
| Báo thể thao Việt Nam | Bongdaplus, VnExpress, Znews… | Tin nhanh bằng tiếng Việt | Thông tin rời rạc, không có dữ liệu cấu trúc, không cá nhân hoá |
| Kênh chính thức | Website, fanpage VFF | Chính thống | Không cập nhật trực tiếp, không tương tác |

### 19.2. Bảng so sánh tính năng

| Tính năng | **Đội tuyển Việt Nam** | FotMob | SofaScore | App Premier League | FPT Play / TV360 / VTV Go |
|---|---|---|---|---|---|
| Tỷ số trực tiếp | ✔ 1 phút (💡 12–15 giây) | ✔ | ✔ | ✔ | một phần |
| Đội hình trên sơ đồ sân | ✔ | ✔ | ✔ | ✔ | – |
| Điểm cầu thủ + thẻ trên sơ đồ | ✔ | ✔ | ✔ (có điểm live) | chưa rõ | – |
| **Giải thích vì sao được điểm** | ✔ **khác biệt** | – | – | – | – |
| Thông số sau trận | ✔ | ✔ sâu | ✔ sâu | ✔ | – |
| Heatmap, biểu đồ momentum | – (phụ thuộc dữ liệu) | ✔ heatmap | ✔ heatmap + momentum | chưa rõ | – |
| Giá trị cầu thủ + biểu đồ | ✔ + **ước tính theo phong độ** | ✔ biểu đồ giá trị | chưa rõ | – | – |
| **Trợ lý AI hỏi đáp** | ✔ **tiếng Việt, về ĐTVN** | – | – | ✔ (Companion) | – |
| Giới thiệu & thành tích ĐTVN | ✔ | – | – | – | – |
| Danh sách triệu tập, BXH bảng đấu | ✔ | ✔ bảng đấu | ✔ bảng đấu | ✔ (giải của họ) | – |
| Kênh phát sóng từng trận | ✔ | chưa rõ | chưa rõ | – | chính là kênh phát |
| Xem video trận đấu | – (dẫn link sang app có bản quyền) | – | – | video tổng hợp | ✔ |
| **Theme sự kiện / "Đi bão"** | ✔ **khác biệt** | – | – | – | – |
| **Giao diện người lớn tuổi + đọc to tỷ số** | ✔ **khác biệt** | – | – | – | – |

"chưa rõ" = chưa kiểm chứng được trên phiên bản hiện tại. Thông tin về FotMob, SofaScore và Premier League Companion lấy từ nguồn công khai (xem cuối tài liệu); các nhóm còn lại dựa trên hiểu biết chung, cần mở app kiểm tra lại.

### 19.3. Kết luận

- **Phải bằng đối thủ** (thiếu thì người dùng quay về FotMob): tỷ số trực tiếp nhanh, thông báo đẩy, đội hình trên sơ đồ, điểm cầu thủ, thông số sau trận, lịch có kênh phát sóng.
- **Điểm khác biệt của "Đội tuyển Việt Nam"**:
  - Giải thích được điểm cầu thủ.
  - Trợ lý AI tiếng Việt truy vấn dữ liệu thật.
  - Theme sự kiện và "Đi bão".
  - Giao diện người lớn tuổi và đọc to tỷ số.
  - Tập trung hoàn toàn vào ĐTVN: giới thiệu, thành tích, triệu tập.
- **Nên bổ sung**: xem A5.2 và A5.3. Ưu tiên cao nhất là **chống spoil**, **theo dõi cầu thủ yêu thích**, **bình chọn cầu thủ xuất sắc nhất trận** và **tỷ số live nhanh hơn 1 phút**.

---

*Nguồn tham khảo (truy cập 11/09/2026):* [Premier League Companion](https://www.premierleague.com/en/news/4345260/what-is-the-premier-league-companion) · [Premier League × Microsoft](https://news.microsoft.com/source/2025/07/01/premier-league-and-microsoft-announce-five-year-strategic-partnership-to-personalize-the-fan-experience-with-ai-for-1-8-billion-people/) · [FotMob vs SofaScore 2026 — Tiki](https://www.tikitaka.gg/articles/fotmob-vs-sofascore-vs-flashscore-vs-tiki-taka-best-football) · [Sportmonks coverage](https://www.sportmonks.com/football-api/coverage/) · [API-Football documentation](https://www.api-football.com/documentation-v3) · [Luật BVDLCN hiệu lực 1/1/2026 — Báo Chính phủ](https://baochinhphu.vn/luat-bao-ve-du-lieu-ca-nhan-chinh-thuc-co-hieu-luc-tu-ngay-mai-1-1-2026-102251231155609721.htm)
