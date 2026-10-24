# FR Implementation Audit — TimViecOnline

**Kết luận sản phẩm:** Chưa đạt mức website tuyển dụng hoàn chỉnh hoặc bản nộp cuối kỳ hoàn chỉnh. Backend có nhiều API nghiệp vụ nhưng frontend chỉ còn trang Next starter; chưa có UI cho guest/candidate/employer/admin. Chưa có Feature test cho FR và chưa xác minh DB MySQL thật, mail, Gemini, Reverb hoặc performance. Bảng này phân biệt code tồn tại với yêu cầu đã được chứng minh.

**Quy ước:** `Có code` = route/logic được tìm thấy; `Một phần` = thiếu một điều kiện/đầu nối/UI/bằng chứng; `Chưa có` = chưa thấy triển khai. Không dùng status HTTP route list làm bằng chứng end-to-end.

## FR-01 — Đăng ký

| Mã | Trạng thái | Kiểm tra cụ thể |
|---|---|---|
| FR-01.1 | Có code / UI chưa có | Register nhận name/email/DOB/password/confirmation/phone?/role; role chỉ candidate/employer; DOB bắt buộc vì constraint 15 tuổi. `RegisterRequest`. |
| FR-01.2 | Có code | Regex Unicode cho chữ cái/khoảng trắng/gạch nối; 2–100. Boundary test chưa có. |
| FR-01.3 | Có code / phụ thuộc MySQL | Unique validation + lowercase và collation `utf8mb4_unicode_ci`; case-insensitivity cần xác nhận trên DB triển khai. |
| FR-01.4 | Có code | 8–32, lower/upper/digit/special, confirmed. |
| FR-01.5 | Có code | phone nullable, pattern số Việt Nam 10 digits. |
| FR-01.6 | Một phần | Transaction tạo profile/company, mail best-effort, trả `/login`, không cấp token; frontend chưa có register/login. Inbox thật chưa xác minh. |

## FR-02 — Auth, khóa và mật khẩu

| Mã | Trạng thái | Kiểm tra cụ thể |
|---|---|---|
| FR-02.1–02.2 | Có code / UI chưa có | Login email/password; sai credentials trả 401 với thông báo chung. |
| FR-02.3 | Một phần | Lock sau 5 lần, reset sau login tốt; email cảnh báo lock được SRS ghi deferred, chưa gửi. |
| FR-02.4 | Có code | Chặn login trong 15 phút; login rate limit 10/minute. |
| FR-02.5 | Có code | Admin lock trả 403; admin endpoint thu hồi Sanctum tokens. |
| FR-02.6 | Một phần | API cấp bearer và redirect theo role; frontend chưa có routing/login UI. |
| FR-02.7 | Có code / mail chưa live-test | Token random, chỉ lưu SHA-256, hiệu lực 15 phút, link gửi email; email không tồn tại trả response chung; rate limit. |
| FR-02.8 | Có code / UI chưa có | Verify không trả token hash; reset lock row trong transaction, token dùng một lần, revoke tokens. Mail/reset page chưa test. |
| FR-02.9 | Có code / UI chưa có | Check current password, chặn password reuse, update hash, revoke token khác, notification best-effort. |

## FR-03 — Candidate profile/CV

| Mã | Trạng thái | Kiểm tra cụ thể |
|---|---|---|
| FR-03.1–03.2 | Có API / UI chưa có | Profile, DOB/name/email/phone, social links URL, city, experience, tối đa 10 skills có ID hợp lệ. |
| FR-03.3–03.4 | Có API / UI chưa có | PDF/MIME/5MB, private storage. Storage thật và file adversarial chưa test. |
| FR-03.5 | Một phần | Auth endpoint stream PDF (browser preview-capable); frontend preview chưa có. |
| FR-03.6 | Một phần | Parser text extraction; empty/short PDF bị đánh dấu scan/unreadable. Font corruption không có classifier bảo đảm; cần fixture PDF scan/corrupt. |

## FR-04 — Company/job lifecycle

| Mã | Trạng thái | Kiểm tra cụ thể |
|---|---|---|
| FR-04.1 | Có API / UI chưa có | Tên/description/address/city bắt buộc; job creation gate `Company::isComplete`. |
| FR-04.2 | Có code | Required fields, title 10–200, category, quantity, level, type, city, deadline, description, requirements; address lấy từ company nếu bỏ trống. |
| FR-04.3 | Có code | Deadline sau hôm nay; apply/list coi ngày deadline còn hiệu lực đến hết ngày. |
| FR-04.4 | Có code | Negotiable/range/starting; max không thể đứng một mình; min <= max, >0; currency/display VND. Boundary tests thiếu. |
| FR-04.5 | Có code | Job mới active. Phiên bản này không có approval-pending workflow. |
| FR-04.6 | Có code / UI chưa có | Close ngăn apply, dữ liệu cũ giữ, chat tiếp tục; expired job cần deadline tương lai khi reopen. Scheduler `jobs:expire` chạy 00:05; production scheduler chưa xác minh. |
| FR-04.7 | Có API / UI chưa có | Public company detail trả company + active jobs; employer personal email/phone đã bỏ khỏi public resource. |

## FR-05 — Search/save

| Mã | Trạng thái | Kiểm tra cụ thể |
|---|---|---|
| FR-05.1 | Có code / UI chưa có | Keyword title/company/skills; MySQL collation basic accent/case-insensitive; không có transliteration fuzzy. |
| FR-05.2 | Có code một phần | Multiple category/skills, city/type/salary; city options API `/api/locations/cities`; frontend filters chưa có. |
| FR-05.3 | Có code | Salary bands và min-only/null handling; cần MySQL fixture boundary 10/20 triệu. |
| FR-05.4 | Có code | Sort `updated_at DESC`; application + bump timestamp cùng transaction. |
| FR-05.5 | Chưa có frontend | Backend trả mảng/meta rỗng; empty-state text/clear-filter do UI implement. |
| FR-05.6 | Có API / UI chưa có | Candidate save/unsave/saved list; guest nhận 401; login prompt do frontend. |

## FR-06 — Applications

| Mã | Trạng thái | Kiểm tra cụ thể |
|---|---|---|
| FR-06.1 | Có API / UI chưa có | Candidate-only FormRequest; guest 401, sai role 403; redirect login do frontend. |
| FR-06.2 | Có code | Dùng profile CV hoặc upload CV mới; application CV private. |
| FR-06.4 | Có code | Unique `(job_id,candidate_id)`; duplicate kể cả withdrawn 409; resource đánh dấu đã apply cho mọi status. |
| FR-06.5 | Có code | 5 status `applied/waiting/accepted/rejected/withdrawn`; waiting khi employer mở; withdraw chỉ applied/chưa reviewed. |
| FR-06.7 | Một phần | History API + broadcast notification khi status đổi; frontend subscription/history UI chưa có. |

## FR-07 — AI CV analysis

| Mã | Trạng thái | Kiểm tra cụ thể |
|---|---|---|
| FR-07.1 | Có code một phần | Apply queue job đọc PDF text + JD, không chặn request; worker phải chạy. |
| FR-07.2 | Một phần | Gemini prompt nêu trọng số 40/30/15/15; fallback heuristic không tương đương đánh giá định lượng chuyên sâu. |
| FR-07.3 | Có code | Clamp score 0–100. |
| FR-07.4 | Có code một phần | Normalize strengths 2–4, missing 0–4, summary <=75 words; chất lượng nội dung chưa đánh giá. |
| FR-07.5 | Có code | Một result/application, pending/completed/failed. DB/queue failure tests và backup/retention cần xác minh. |

## FR-08 — Chat

| Mã | Trạng thái | Kiểm tra cụ thể |
|---|---|---|
| FR-08.1 | Có code | Conversation cần application hợp lệ, đúng employer/candidate/job. |
| FR-08.2 | Có code | Text 1–1000 trim; JPEG/PNG/GIF/WEBP <=5MB; image-only supported. |
| FR-08.3 | Chưa xác minh | `ShouldBroadcastNow`/Reverb configured; chưa chạy E2E hai trình duyệt hoặc đo <1s. |
| FR-08.4 | Có code | Sender, `HH:mm`, `is_read/read_at`, read events. |
| FR-08.5 | Có code | Membership check HTTP/private channel; chat image qua protected endpoint. Legacy public image cần chuyển đổi. |
| FR-08.6 | Có code / UI chưa có | Room vẫn đọc/gửi khi job đóng/hết hạn; response có notice. |

## FR-09 — Admin

| Mã | Trạng thái | Kiểm tra cụ thể |
|---|---|---|
| FR-09.1 | Có code / UI chưa có | Auth user report, admin list reports/jobs. |
| FR-09.2 | Có code một phần | Admin resolve/dismiss report; delete job thông báo employer và cascade dữ liệu. Audit UI chưa có. |
| FR-09.4 | Có code / UI chưa có | List/search/filter role/status, lock/unlock, revoke tokens; self-lock/admin lock bị chặn. |
| FR-09.5 | Có code | Category/skill CRUD; category đang dùng không xóa được; skill delete cascade pivot. |

## FR-10 — Notifications

| Mã | Trạng thái | Kiểm tra cụ thể |
|---|---|---|
| FR-10.1–10.2 | Có API | Application status, new application, new message notifications; tạo notification best-effort/log. |
| FR-10.3 | Có API / UI chưa có | Unread count, filter, read one/all, redirect/time labels, broadcast; navbar/list/color/navigation UI chưa có. |

## NFR và mức đồ án

| NFR | Trạng thái |
|---|---|
| NFR-01 50 users / p95 <1.5s | Chưa đo; cần data representative/load test trên staging. |
| NFR-02 AI trung bình <4s | Chưa đo/không bảo đảm: provider timeout 25s, queue backlog/worker ảnh hưởng. Skeleton UI chưa có. |
| NFR-03 Chat <1s | Chưa đo E2E. |
| NFR-04 Uptime 99% | Hạ tầng/monitoring ngoài code; chưa có số liệu. |
| NFR-05 bcrypt | Laravel Hash facade/default hasher; cần kiểm tra production config. |
| NFR-06 SQLi/XSS | Eloquent/bindings/private file gates; XSS output cần audit UI khi frontend tồn tại. |
| NFR-07 360px/browser support | Chưa có các trang UI nên chưa đạt/chưa test. |
| NFR-08 format VN | API trả salary/date display; browser rendering/locale chưa test. |

## Kiểm tra đã thực thi

- PHP syntax trên file backend đã sửa: pass.
- `php artisan route:list --path=api`: 76 routes; route load pass.
- `php artisan migrate --pretend --force`: SQL compile pass, không ghi database.
- `php artisan migrate:status`: toàn bộ 5 migrations pending; không chạy migration thật để tránh ghi/xóa DB mặc định.
- `php artisan test`: 1 example pass, 1 deprecation từ cấu hình vendor Laravel/PHP 8.5; chưa có FR feature suite.
- `composer validate --no-check-publish`: pass.
- Frontend `npm run lint`: pass. `npm run build`: pass sau bỏ Google Fonts network dependency; build hiện chỉ có `/` và `/_not-found`.
