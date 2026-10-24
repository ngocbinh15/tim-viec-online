# Hướng dẫn backend — TimViecOnline

Tài liệu này mô tả mã backend hiện tại và đối chiếu với [SRS](docs/SRS.md). “Đã có mã” chưa đồng nghĩa đã chứng minh hệ thống chạy trên môi trường vận hành: MySQL, mail, Gemini, Reverb, di trú tệp cũ và tải thực cần môi trường tích hợp.

## 1. Kết luận A–Z

- Laravel 11 / PHP 8.2+, Sanctum, MySQL, hàng đợi lưu trong cơ sở dữ liệu và Reverb tùy cấu hình. Các tuyến API nằm tại `backend/routes/api.php`; kiểm tra dữ liệu tại `app/Http/Requests`; xử lý nghiệp vụ tại `app/Http/Controllers/Api`; mô hình/tài nguyên phản hồi tại `app/Models` và `app/Http/Resources`.
- Migrations tạo schema nghiệp vụ; hàng đợi dùng `queue_jobs`, tách bảng `jobs` tuyển dụng. SQL dump bao gồm `job_reports`, trạng thái AI và chat ảnh/đọc columns.
- CV và chat ảnh mới lưu riêng tư. Ứng viên CV, hồ sơ ứng tuyển CV và chat ảnh được stream qua endpoint có quyền truy cập. CV/chat ảnh cũ còn trong công khai cần chạy lệnh chuyển đổi rồi mới xóa công khai source.
- Đã có submit/review báo cáo, async AI, xác thực giới hạn tần suất, đặt lại-mật khẩu anti-enumeration. Đã chạy migration/seed trên MySQL thử nghiệm riêng; còn cần xác minh email SMTP thật, Gemini thật, dữ liệu tệp trên môi trường vận hành, tải/hiệu năng triển khai và quy trình sao lưu/khôi phục. Reverb đã được kiểm tra phát sự kiện đầu-cuối trên loopback.
- Môi trường rà soát có PDO MySQL nhưng không có `pdo_sqlite`. Không chạy migration/đặt lại cơ sở dữ liệu mặc định: các migration của cơ sở dữ liệu mặc định chưa được chạy và cơ sở dữ liệu có thể chứa dữ liệu cần giữ.
- giao diện hiện là trang mặc định Next.js, chưa triển khai các màn hình SRS. Vì vậy dự án hiện chưa phải website tuyển dụng hoàn chỉnh dù có backend API tương đối rộng.

## 2. Cấu trúc dữ liệu và quan hệ

Bảng chính: `users`, `candidate_profiles`, `companies`, `categories`, `skills`, `candidate_skills`, `jobs`, `job_skills`, `saved_jobs`, `applications`, `ai_cv_analyses`, `conversations`, `messages`, `notifications`, `job_reports`, Sanctum/mật khẩu đặt lại, cache/session và hàng đợi tables. Foreign keys/unique constraints bảo vệ quan hệ; hồ sơ ứng tuyển duy nhất `(job_id,candidate_id)`; báo cáo duy nhất `(job_id,reporter_id)`. `messages.message` nullable để hỗ trợ ảnh-chỉ.

Thứ tự migration: users → cache → hàng đợi/Sanctum → domain. Index chính được đối chiếu với SQL dump. Migrations được thiết kế để tạo schema mới; khi schema đổi phải cập nhật cả migrations và `db/tim_viec_online.sql`. Với DB cũ, backup và so sánh schema/migration ledger trước khi migrate; không tự đánh dấu migration đã chạy.

## 3. Cài đặt và khởi chạy

Yêu cầu: PHP 8.2+, Composer, MySQL/MariaDB tương thích Laravel, PDO MySQL, fileinfo và thư viện phụ thuộc trong `composer.json`.

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Cấu hình `DB_*`, `APP_URL`, `FRONTEND_URL`, mail, Reverb và Gemini. `.env.example` dùng `utf8mb4_unicode_ci`, hàng đợi lưu trong cơ sở dữ liệu `queue_jobs`, mail log, Sanctum 7 ngày, ổ lưu trữ công khai mặc định cho avatar/logo và ổ lưu trữ riêng tư riêng cho CV/chat ảnh. Không đưa `.env`/secret.

Để tạo tài khoản admin cục bộ khi nạp dữ liệu mẫu, đặt `ADMIN_EMAIL` và `ADMIN_PASSWORD` (tối thiểu 12 ký tự); seeder không đổi vai trò của tài khoản tồn tại. Không dùng thông tin đăng nhập mẫu hoặc tài khoản admin cục bộ trên vận hành.

Chỉ trên cơ sở dữ liệu dev/kiểm tra rỗng:

```powershell
php artisan migrate --seed
php artisan storage:link
```

`migrate:fresh --seed` xóa schema/dữ liệu, chỉ dùng cơ sở dữ liệu thử nghiệm có thể xóa. Tệp SQL dump có dữ liệu mẫu riêng; không import vào DB cần giữ.

```powershell
php artisan serve --host=127.0.0.1 --port=8000
php artisan queue:work --tries=2 --timeout=60
php artisan reverb:start
php artisan schedule:work
```

tiến trình xử lý nền cần chạy để AI xử lý nền (hàng đợi lưu trong cơ sở dữ liệu); scheduler cần chạy để `jobs:expire` đổi tin quá hạn sang `expired` lúc 00:05. Môi trường vận hành cần trình quản lý tiến trình/bộ lập lịch cron, HTTPS, `APP_DEBUG=false`, giới hạn nguồn CORS, mail transport thật, sao lưu cơ sở dữ liệu/kho tệp và giám sát. Nếu `QUEUE_CONNECTION=sync`, hàng đợi chạy chạy trong tiến trình hiện tại.

## 4. Xác thực và phân quyền

Sanctum bearer token; middleware phân vai ứng viên/nhà tuyển dụng/quản trị viên. Register tạo user + hồ sơ/công ty trong transaction, gửi email cố gắng gửi nhưng không làm hỏng yêu cầu chính, trả 201 không tự login/token; client điều hướng `/login`. Đăng nhập bị khóa tạm thời 5 lần sai/15 phút. Giới hạn tần suất: register 5/phút, login 10/phút, forgot 3/15 phút, xác minh 20/phút, đặt lại 10/phút. Forgot trả cùng thông điệp dù email tồn tại; token đặt lại chỉ lưu giá trị băm và chỉ gửi qua email; đặt lại thành công thu hồi Sanctum tokens. Đổi mật khẩu thu hồi token khác, giữ token hiện tại. Thời hạn cấu hình `SANCTUM_EXPIRATION`.

email cảnh báo khóa tài khoản trong SRS được ghi “để sau”, chưa triển khai. Lỗi email được ghi vào nhật ký; email thực tế cần được kiểm thử riêng.

## 5. Nghiệp vụ chính

### Tin tuyển dụng, tìm kiếm và ứng tuyển

Tin tuyển dụng yêu cầu thông tin công ty đầy đủ, danh mục hợp lệ, lương hợp lệ, hạn nộp sau hôm nay khi tạo/sửa. Danh sách công khai chỉ gồm tin đang hoạt động và còn hạn; ngày hạn nộp được tính hết ngày. Tìm kiếm kiểm tra hợp lệ danh mục, kỹ năng, type, lương band và phân trang tối đa 100. Collation của MySQL hỗ trợ so sánh cơ bản không phân biệt dấu/hoa thường; không có chuyển tự/tìm kiếm xếp hạng gần đúng riêng.

Ứng tuyển chỉ dành cho ứng viên, tin tuyển dụng đang hoạt động/trong hạn, chặn mọi lần nộp thứ hai kể cả đã rút. CV tải lên được lưu riêng tư. hồ sơ ứng tuyển tạo, thông báo và tác vụ AI được đưa vào hàng đợi; ràng buộc duy nhất trong cơ sở dữ liệu ngăn hồ sơ trùng. Nhà tuyển dụng chỉ xem hồ sơ ứng tuyển thuộc công ty của mình; lần xem đầu chuyển `applied` thành `waiting`; chỉ `applied`, chưa review mới rút được.

### AI

`AnalyzeApplicationCv` chạy qua hàng đợi và cập nhật `ai_analysis_status=pending|completed|failed`. GET analysis: `202` đang chờ xử lý, `422` thất bại, `200` hoàn tất. Gemini cấu hình `GEMINI_API_KEY`/`GEMINI_MODEL`, có timeout. Khi khóa API/nhà cung cấp gặp lỗi, cơ chế dự phòng dựa trên heuristic dùng văn bản trích xuất từ PDF và thông tin kỹ năng/kinh nghiệm; đây là gợi ý, không phải quyết định tuyển dụng. PDF dạng ảnh/không trích xuất được sẽ báo lỗi. Cần kiểm thử chất lượng, quota và độ trễ riêng.

### Bảo vệ quyền riêng tư CV và ảnh trò chuyện

Ứng viên CV: `GET /api/candidate/cv/file`; hồ sơ ứng tuyển CV: `GET /api/applications/{id}/cv`; chat ảnh: `GET /api/conversations/{conversationId}/messages/{messageId}/image`. Chỉ ứng viên, nhà tuyển dụng sở hữu tin, admin (hồ sơ ứng tuyển CV), hoặc thành viên cuộc trò chuyện (chat ảnh) được tải xuống. Tệp được trả với tiêu đề `private, no-store`. Avatar/logo vẫn công khai.

CV/chat ảnh cũ: `php artisan storage:secure-legacy-cvs` chuyển `cvs/`, `application_cvs/` và `chat_images/` từ công khai sang riêng tư, xác thực SHA-256. Theo mặc định lệnh không xóa tệp nguồn; chỉ dùng `--delete-source` chỉ sau khi sao lưu và xác nhận bản sao và kiểm tra bộ nhớ đệm/CDN. Trước khi chạy vận hành cần kế hoạch bảo trì/khôi phục.

### Trò chuyện, báo cáo và thông báo

Chỉ tạo cuộc trò chuyện từ hồ sơ ứng tuyển hợp lệ; chỉ thành viên được đọc/ghi/tham gia kênh riêng tư. Tin nhắn có thể là văn bản hoặc ảnh; cho phép chỉ gửi ảnh. Tin nhắn/trạng thái đã đọc/thông báo dùng phát sự kiện tức thời; tuyến xác thực `/api/broadcasting/auth`. Tin nhắn vẫn có thể được lưu dù Reverb gặp lỗi; cần giám sát cơ sở dữ liệu và dịch vụ thời gian thực riêng.

Người dùng đã đăng nhập gửi báo cáo tin tại `POST /api/jobs/{id}/report`, mỗi người dùng chỉ báo cáo một lần cho mỗi tin; nhà tuyển dụng không được báo cáo tin của chính mình. Quản trị viên xem `GET /api/admin/jobs/reported` và xử lý `PATCH /api/admin/jobs/{id}/report` với trạng thái `resolved|dismissed`.

## 6. Đối chiếu FR/SRS và đánh giá

| FR/NFR | Tình trạng mã nguồn | Phần còn thiếu/cần xác nhận |
|---|---|---|
| FR-01 | Kiểm tra đăng ký/giao dịch/email/201; không tự cấp token | Mail thật; màn hình đăng ký/login chưa có ở giao diện |
| FR-02 | khóa tạm thời, giới hạn tần suất, băm token đặt lại/chống dò email, thu hồi token | email cảnh báo khóa được hoãn triển khai; giao diện đặt lại/login chưa có |
| FR-03 | hồ sơ/kỹ năng, kiểm tra PDF, CV riêng tư | giao diện hồ sơ/CV chưa có; migration tệp cũ; PDF scan/storage kiểm tra |
| FR-04 | thêm/xem/sửa/xóa công ty/tin, quyền sở hữu, lương/hạn nộp | giao diện nhà tuyển dụng chưa có; đã hết hạn mở lại cần hạn nộp mới |
| FR-05 | bộ lọc, nhóm lương, API lưu/bỏ lưu tin | UI/tìm kiếm page chưa có; thiếu chuyển tự chuyên biệt/đo hiệu năng |
| FR-06 | API ứng tuyển/chống trùng/rút hồ sơ/xem xét/trạng thái/thông báo | giao diện flow chưa có; kiểm thử đồng thời/hàng đợi |
| FR-07 | hàng đợi analysis/result/fallback | giao diện loading/result giao diện chưa có; Gemini thật/chất lượng/độ trễ |
| FR-08 | xác thực thành viên, văn bản/ảnh/xác nhận đã đọc | giao diện chat chưa có; chưa kiểm thử đầu-cuối Reverb/chưa đo mốc dưới 1 giây |
| FR-09 | API kiểm duyệt/danh mục/báo cáo dành cho admin | giao diện admin chưa có; phiên bản này xử lý báo cáo, không duyệt trước khi đăng |
| FR-10 | thêm/xem/sửa/xóa thông báo/đánh dấu đã đọc/phát sự kiện | giao diện bell/list chưa có; chưa kiểm thử mức bao phủ Reverb/sự kiện |
| NFR | kiểm tra dữ liệu, xác thực, tệp riêng tư, ràng buộc cơ sở dữ liệu | giao diện ở độ rộng 360px/chống XSS, p95 50 users, AI <4s, chat <1s, uptime 99% chưa chứng minh |

SRS đã được chỉnh để ghi đúng 5 trạng thái ứng tuyển, làm rõ một ứng viên không nộp lại sau khi rút, quy tắc hạn nộp khi mở lại tin đã hết hạn, và mô tả quản trị báo cáo thay vì approval đang chờ xử lý.

## 7. Đánh giá mức đồ án / website thực tế

Backend đã có cấu trúc API, migration và một số biện pháp bảo mật phù hợp cho đồ án; đã chạy 10 kiểm thử chức năng cốt lõi trên MySQL riêng. Chưa có bộ nghiệm thu bao phủ toàn bộ FR; SMTP/Gemini chưa kết nối dịch vụ thật; Reverb đã được xác nhận qua luồng cục bộ; kiểm tra tải cục bộ chưa thay thế phép đo trên hạ tầng triển khai. Giao diện vẫn là trang mẫu Next.js, chưa có màn hình cho các vai trò. Vì vậy sản phẩm vẫn **chưa đạt mức website tuyển dụng hoàn chỉnh theo SRS**.
## 8. Kết quả kiểm tra trong môi trường cô lập

Đã chạy đủ 5 migration và nạp dữ liệu mẫu trên MySQL thử nghiệm riêng `tim_viec_online_fr_test_20261023_144851`; cơ sở dữ liệu mặc định không bị thay đổi. Bộ kiểm thử mới gồm 10 trường hợp nghiệp vụ và 53 assertions, không có lỗi. `php artisan test` cũng chạy bài mẫu đơn vị thành công; có 11 cảnh báo deprecated PHP 8.5 từ cấu hình PDO/Laravel/vendor.

Postman CLI kiểm tra `GET /api/categories` đạt 200 với một assertion. Gọi trực tiếp API đăng ký hợp lệ trả 201; API hồ sơ ứng viên không xác thực trả 401. Reverb: xác thực kênh riêng, ứng tuyển trả 201 và client WebSocket nhận sự kiện thông báo. Chạy 50 yêu cầu đọc đồng thời qua máy chủ `artisan serve`: 0 lỗi, p95 1.970 giây; kết quả chỉ phản ánh máy chủ phát triển đơn luồng, chưa chứng minh NFR triển khai. Kiểm thử chuyển CV cũ với tệp giả lập xác nhận SHA-256; lệnh mặc định giữ tệp công khai.

Tích hợp SMTP chưa được gửi thật vì cấu hình hiện dùng `MAIL_MAILER=log`; Gemini chưa chạy vì chưa có `GEMINI_API_KEY`; Chưa chuyển CV/ảnh chat thật trên môi trường vận hành hoặc đo độ trễ AI/chat và thời gian hoạt động. Các phần này cần credential/dịch vụ/hạ tầng phù hợp.
