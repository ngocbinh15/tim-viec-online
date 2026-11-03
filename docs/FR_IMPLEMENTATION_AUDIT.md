# FR Implementation Audit — TimViecOnline

Cập nhật 27/10/2026. Tài liệu này thay thế audit ban đầu khi frontend còn là trang starter; đối chiếu với [SRS](SRS.md) và các luồng API/giao diện đã kiểm thử. Chưa dùng kết quả kiểm thử chức năng để kết luận đạt tải production hoặc mọi yêu cầu phi chức năng.

## Chức năng hiện tại

| Nhóm | Đã triển khai | Bằng chứng chính |
|---|---|---|
| FR-01 — Đăng ký/xác nhận email | Form hai role, kiểm tra tên/email/ngày sinh/mật khẩu/điện thoại; tạo hồ sơ theo role. Token xác nhận băm, một lần, 60 phút, xác nhận bằng POST; gửi lại vô hiệu liên kết cũ. Email tự điền, không sửa được. Tài khoản chưa xác nhận vẫn đăng nhập/quản lý hồ sơ; backend chặn nghiệp vụ theo SRS. | FrCoreFlowsTest, EmailVerificationTest; auth.spec.ts, backend-mail.spec.ts. |
| FR-02 — Đăng nhập/khóa | Điều hướng theo role API, phiên HttpOnly, chống giả phiên/vượt role; khóa tạm sau nhập sai và thu hồi phiên khi admin khóa. | FrCoreFlowsTest, AdminAuthSessionSafetyTest; auth.spec.ts, server auth tests. |
| FR-02 — Mật khẩu | Yêu cầu email đã xác nhận; token 15 phút, một lần, ràng buộc tài khoản/email/thông tin xác thực/mục đích. Đổi mật khẩu chờ xác nhận email; GET không đổi mật khẩu; thành công thu hồi phiên và yêu cầu cũ. Không thay thế xác nhận email. | PasswordRecoverySecurityTest, PasswordChangeConfirmationTest, PasswordEmailVerificationGateTest; auth.spec.ts, backend-password-change.spec.ts. |
| FR-03 — Hồ sơ/CV | Hồ sơ, tối đa 10 kỹ năng, ảnh lưu được sau tải lại; PDF tối đa 5 MB, kiểm tra nội dung/dung lượng, lưu riêng tư, endpoint có quyền để xem/tải. | FrCoreFlowsTest, FrontendIntegrationContractTest; backend-integration.spec.ts, unit upload/profile. |
| FR-04 — Công ty/tin | Hồ sơ/logo, tạo/sửa/đóng/mở/gia hạn, kiểm tra ngày/lương; danh sách/chi tiết công ty. Tin mới active, không có duyệt trước khi đăng. | EmployerWorkspaceApiTest, FrCoreFlowsTest; employer.spec.ts, companies.spec.ts, backend-integration.spec.ts. |
| FR-05 — Tìm/lưu việc | Tìm kiếm/bộ lọc/phân trang/empty state; mặc định xen kẽ công ty ổn định trước phân trang, sắp xếp ngày/lương riêng. Lưu/bỏ lưu tồn tại sau tải lại. | JobDiscoveryOrderTest, FrCoreFlowsTest; discovery unit tests, application.spec.ts, backend-integration.spec.ts. |
| FR-06 — Ứng tuyển | CV mặc định/riêng, bản nộp không đổi theo CV hồ sơ; một đơn/tin kể cả sau rút; năm trạng thái và chỉ rút trước khi được xem. Chủ tin xem CV/cập nhật trạng thái; ứng viên theo dõi lịch sử. | FrCoreFlowsTest, EmployerWorkspaceApiTest; application.spec.ts, backend-integration.spec.ts. |
| FR-07 — AI | Tự đưa CV thật vào database queue sau khi lưu đơn, chụp JD/kỹ năng; loại CV demo kể cả bản sao. Điểm backend tính 40/30/15/15; kiểm tra JSON, 2–4 điểm mạnh, 0–4 kỹ năng thiếu, tổng quan dưới 80 từ. Chỉ chủ tin/admin đọc/thử lại; candidate không nhận AI. Chống worker trùng/kết quả cũ, retry có giới hạn và lỗi an toàn; không tạo điểm giả. | AiAssessmentContractTest, GroqAssessmentContractTest, AiLifecycleTest, FrontendIntegrationContractTest; ai.spec.ts và unit AI/BFF. |
| FR-08 — Chat | Text/ảnh riêng tư trực tiếp, trạng thái đọc, tiếp tục khi tin đóng; pending/thử lại, giữ bản nháp/vị trí cuộn, lịch sử 50 tin và cursor. Kiểm tra thành viên tại HTTP/private channel; polling đối soát khi lỡ realtime. | EmployerWorkspaceApiTest, WorkspacePerformanceTest; backend-integration.spec.ts, backend-workspace-sync.spec.ts, unit chat. |
| FR-09 — Admin | Dashboard, tìm/lọc tài khoản/tin bị báo cáo, khóa/mở, xử lý/xóa tin, CRUD ngành/kỹ năng; bảo vệ admin, không xóa ngành đang dùng. Skeleton, chi tiết tải riêng, giữ shell khi chuyển trang. | FrCoreFlowsTest, AdminAuthSessionSafetyTest, WorkspaceBootstrapTest, WorkspacePerformanceTest; admin-*.spec.ts. |
| FR-10 — Thông báo | Web: badge, lọc, đọc một/tất cả, điều hướng, WebSocket/polling. Email: hai lựa chọn mặc định tắt và lưu DB, yêu cầu xác nhận email; queue riêng gom thông báo, kiểm tra lại quyền/lựa chọn/trạng thái đọc. Không gửi SMTP trong request chat hoặc đưa CV/nội dung tin riêng tư vào thư. | EmailNotificationTest, MailDeliveryTest, EmployerWorkspaceApiTest; backend-email-preferences.spec.ts, backend-notification-mail.spec.ts, backend-integration.spec.ts. |

Backend tests: `backend/tests/Feature/`. Browser tests: `frontend/tests/e2e/`. Unit/server frontend: `frontend/tests/`.

## Sửa trong lần rà soát cuối

- Cursor lịch sử chat tách khỏi ID của tin xem trước/WebSocket: quay lại sau hơn 50 tin mới vẫn lấy đủ khoảng bị thiếu; lỗi tải không làm cursor bỏ qua tin chưa nhận.
- Polling ứng viên gộp last_message của hội thoại không hoạt động, cập nhật sidebar khi thiếu Reverb.
- Snapshot nhà tuyển dụng về trễ không ghi đè thay đổi vừa lưu; kết quả đọc/yêu cầu AI vô hiệu snapshot cũ đang tải.
- Ba regression trình duyệt đã tái hiện thất bại trên bản trước sửa, dùng phiên Laravel riêng và phản hồi điều khiển.
- Cập nhật dependency lock trong phạm vi phiên bản cho phép; npm audit không còn cảnh báo. ESLint bỏ qua artifact kiểm thử tự sinh.
- Thêm workflow [Frontend](../.github/workflows/frontend.yml): lint, unit/server tests, build, dependency audit, browser regression và contract auth/AI/admin. Workflow [Backend](../.github/workflows/backend.yml) kiểm thử PHP trên MySQL riêng.
- Cập nhật kiểm thử preview email theo đúng phạm vi state tạm thời; lưu lựa chọn API thật được kiểm tra riêng với Laravel. Kiểm tra accessibility/bố cục chờ nội dung workspace thật và hiệu ứng hoàn tất, không đo skeleton hoặc màu trung gian lúc chuyển trang.

## Phần cần nghiệm thu khi triển khai

Các kiểm tra đã chạy trong đợt rà soát này:

| Bộ kiểm tra | Kết quả |
|---|---|
| Backend MySQL riêng | 174 tests, 1.773 assertions đạt. |
| Frontend unit | 120 tests đạt. |
| Frontend server/auth | 11 tests đạt. |
| Browser giao diện tổng thể | 205 tests đạt, gồm layout/accessibility/menu ở các kích thước màn hình. |
| Browser tích hợp Laravel/Reverb/SMTP giả | 17 tests đạt, gồm ba regression đồng bộ mới. |
| Browser contract xác thực | 28 tests đạt. |
| Browser contract AI | 4 tests đạt. |
| Browser tải/skeleton admin | 4 tests đạt. |
| Production build, TypeScript, ESLint | Đạt. |
| Dependency audit | Composer và npm không có advisory. |

Database kiểm thử tách riêng trên cổng 33063; không reset database phát triển. Không gọi provider AI hoặc gửi email thật trong các bộ hồi quy này.

| Mục | Giới hạn/bước còn lại |
|---|---|
| FR-02.3 — Email cảnh báo khóa tạm | SRS đánh dấu để sau; khóa tạm đã có, chưa gửi email cảnh báo riêng cho sự kiện này. |
| NFR-01 — 50 người đồng thời, P95 <1,5 giây | Chưa có load test staging chứng minh. Số đo local ở performance.md không thay thế P95 dưới tải. |
| NFR-02 — AI trung bình <4 giây | Cần benchmark CV thật theo model/quota/backlog; một lần gọi thành công không chứng minh SLA. |
| NFR-03 — Chat <1 giây | Có E2E Laravel/Reverb hai phiên cho gửi/nhận/ảnh/biên nhận; chưa đo phân vị độ trễ dưới tải production. |
| NFR-04 — Uptime 99% | Cần triển khai, giám sát và số liệu theo thời gian. |
| NFR-05 — Bcrypt | Dùng Laravel Hash; giữ cấu hình hasher phù hợp khi triển khai. |
| NFR-06 — SQLi/XSS/quyền | Có bindings, validation, role/owner, private storage, output React và regression bảo mật. Rà soát tập trung không thay kiểm thử xâm nhập toàn hệ thống. |
| NFR-07 — Trình duyệt/thiết bị | Có regression từ 360px và accessibility trên Chromium; cần Firefox/WebKit và thiết bị thực để nghiệm thu toàn ma trận SRS. |
| NFR-08 — Tiền/ngày | Có formatter và unit/UI tests cho VNĐ, ngày Việt Nam, múi giờ nghiệp vụ. |
| Vận hành | API, Reverb, scheduler, worker AI/email phải chạy đúng cấu hình. Hồi quy tự động dùng SMTP giả/AI HTTP fake, không gửi thư hoặc CV thật ra ngoài. |
| Nâng cấp file public cũ | Kiểm tra và dùng `storage:secure-legacy-cvs` theo hướng dẫn nếu database từng lưu CV/ảnh chat public. |

Hướng dẫn: [backend-run-guide.md](backend-run-guide.md), [mail-setup.md](mail-setup.md), [ai-setup.md](ai-setup.md), [performance.md](performance.md).
