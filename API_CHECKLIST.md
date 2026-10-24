# Danh sách kiểm tra API — TimViecOnline

Danh sách đối chiếu hợp đồng API được lập từ [backend/routes/api.php](backend/routes/api.php), các lớp FormRequest, bộ điều khiển và tài nguyên phản hồi. `?` là tùy chọn; kiểm tra phản hồi thực tế trước khi phát hành OpenAPI chính thức. Xác thực dùng `Authorization: Bearer <Sanctum token>` và `Accept: application/json`.

## Quy ước chung

- Phản hồi thành công thường có `{success,message?,data?,meta?}`; một số API URL dùng `pagination`, `unread_count`, `conversation`. Lỗi kiểm tra dữ liệu thường trả mã 422; unauthenticated trả 401; wrong vai trò/quyền sở hữu 403 hoặc 404 theo endpoint; hồ sơ ứng tuyển/báo cáo trùng lặp 409; đang chờ xử lý AI 202.
- Dữ liệu JSON dùng `application/json`; tải tệp dùng multipart. Không gửi thông tin bí mật, CV thật hay đặt lại token vào nhật ký.
- Hệ thống tệp: CV/chat ảnh riêng tư, ảnh đại diện/logo công khai. Hàng đợi AI cần tiến trình xử lý nền. Xác thực kênh phát sự kiện: `POST|GET /api/broadcasting/auth` theo channel xác thực.

## Tình trạng kiểm tra

- [x] Nạp được các tuyến API; có 76 tuyến và tuyến xác thực phát sự kiện `api/broadcasting/auth`.
- [x] Cú pháp PHP của các tệp backend đã sửa hợp lệ; `composer validate --no-check-publish` đạt.
- [x] Đã tạo cơ sở dữ liệu MySQL thử nghiệm riêng `tim_viec_online_fr_test_20261023_144851`; chạy đủ 5 migration và nạp danh mục/kỹ năng mẫu thành công. Không chạy migration trên cơ sở dữ liệu mặc định.
- [x] Có 10 kiểm thử chức năng mới cho đăng ký, giới hạn tuổi, khóa đăng nhập, CV riêng tư, báo cáo/quản trị, ứng tuyển/rút đơn, tìm kiếm, phân quyền chat, hết hạn tin và chuyển CV cũ. Toàn bộ đạt: 53 assertions, không có kiểm thử thất bại.
- [x] Gọi API đang chạy cục bộ: danh mục trả 200; đăng ký hợp lệ trả 201; truy cập hồ sơ ứng viên khi chưa xác thực trả 401. Postman CLI xác nhận phản hồi danh mục 200 với 1 assertion đạt.
- [x] Kiểm thử lệnh chuyển CV cũ với tệp giả lập trên đĩa kiểm thử: bản riêng tư khớp SHA-256 và bản công khai được giữ lại theo mặc định.
- [ ] Chưa gửi email thật: `.env` đang dùng `MAIL_MAILER=log`, dịch vụ SMTP thử nghiệm không lắng nghe cổng đã cấu hình. Không gửi thư ra ngoài khi chưa có địa chỉ nhận được chỉ định.
- [ ] Chưa gọi Gemini thật: chưa cấu hình `GEMINI_API_KEY`; không phát sinh yêu cầu có thể tính phí.
- [x] Kiểm thử Reverb đầu-cuối trên loopback: ứng viên ứng tuyển trả 201, nhà tuyển dụng xác thực kênh riêng thành công và client WebSocket nhận `notification.sent`. Máy chủ Reverb tạm thời chỉ bind `127.0.0.1`; danh sách nguồn mở rộng chỉ áp dụng cho tiến trình kiểm thử, không sửa `.env` vận hành.
- [ ] Chưa chuyển dữ liệu CV/ảnh chat đang có trên môi trường vận hành; bài kiểm thử chỉ dùng tệp giả lập trong bộ nhớ.
- [!] Kiểm tra tải chẩn đoán 50 yêu cầu đọc đồng thời vào `/api/categories` qua `artisan serve`: 0 lỗi, p95 1.970 giây, p50 1.093 giây. Đây là máy chủ phát triển đơn luồng, không phải phép đo năng lực triển khai; chưa thể kết luận NFR 1,5 giây đạt. Chưa đo AI/chat và thời gian hoạt động.
- [!] PHPUnit không có lỗi kiểm thử; tuy nhiên PHP 8.5 báo cảnh báo deprecated từ cấu hình PDO của Laravel/vendor ở 11 bài. Cần xử lý nâng cấp cấu hình/framework riêng.
## 1. Tài khoản và xác thực

| Phương thức / đường dẫn | Quyền | yêu cầu | Kết quả mong đợi / nội dung kiểm tra |
|---|---|---|---|
| `POST /api/register` | công khai, 5/phút | JSON `name`, `email`, `dob` (bắt buộc, >=15 tuổi), `password`, `password_confirmation`, `role=candidate/employer`, `phone?` | Trả 201, tạo hồ sơ ứng viên hoặc công ty trong cùng giao dịch; không trả token/mật khẩu. Cố gắng gửi email thông báo nhưng lỗi email không làm hỏng yêu cầu chính; giao diện chuyển người dùng tới trang đăng nhập. Dữ liệu sai/trùng trả 422. |
| `POST /api/login` | công khai, 10/phút | JSON `email`, `password` | 200 token + user; sai thông tin 401, khóa 403; 5 lỗi khóa 15 phút. |
| `POST /api/logout` | Sanctum | không có | 200, revoke token hiện tại. |
| `GET /api/user` | Sanctum | không có | 200 người dùng hiện tại + dữ liệu vai trò/hồ sơ/công ty. |
| `PUT /api/user/change-password` | Sanctum | `current_password`, `new_password`/`password`, confirmation | cập nhật mật khẩu, revoke token khác, giữ token hiện tại; mật khẩu hiện tại sai/new reuse 400. |
| `POST /api/forgot-password`, `/api/password/forgot` | công khai, 3/15 phút | JSON `email` | Cùng thông điệp 200 dù email không tồn tại; token đặt lại chỉ email, DB hash; API không trả raw token/reset_url. |
| `GET/POST /api/verify-reset-token` | công khai, 20/phút | tham số truy vấn/nội dung gửi `email`,`token` | 200 hợp lệ; không hợp lệ/đã hết hạn 400. |
| `POST /api/reset-password`, `/api/password/reset` | công khai, 10/phút | `email`,`token`,`password`/`new_password`, confirmation | đặt lại thành công, xóa đặt lại token và revoke Sanctum tokens; sai/đã hết hạn 400. |

## 2. Danh mục công khai, công ty và tin tuyển dụng

| Phương thức / đường dẫn | Quyền | Dữ liệu đầu vào | Kết quả mong đợi / nội dung kiểm tra |
|---|---|---|---|
| `GET /api/categories` | công khai | không có | Danh sách danh mục và số tin đang hoạt động. |
| `GET /api/categories/{id}` | công khai | ID trên đường dẫn | Chi tiết và số lượng; không tìm thấy thì trả 404. |
| `GET /api/skills` | công khai | `keyword?` | Liệt kê/tìm kiếm kỹ năng. |
| `GET /api/skills/{id}` | công khai | ID | Chi tiết; không tìm thấy thì trả 404. |
| `GET /api/companies` | công khai | `keyword?`,`city?`,`page?`,`per_page?` tối đa 100 | Danh sách công ty có phân trang và số tin đang hoạt động. |
| `GET /api/companies/{id}` | công khai | ID | Thông tin công ty và tin đang hoạt động; không tìm thấy thì trả 404. |
| `GET /api/locations/cities` | công khai | không có | Danh sách thành phố không trùng lặp lấy từ tin đang hoạt động, chưa hết hạn; dùng làm lựa chọn lọc thành phố. |
| `GET /api/jobs` | công khai; Sanctum không bắt buộc | `keyword?`,`category_id?` một giá trị/chuỗi phân tách dấu phẩy/mảng, `city?`,`job_type?`,`salary_range?`,`skill_ids?` chuỗi phân tách dấu phẩy/mảng, `page?`,`per_page?` <=100 | Chỉ lấy tin đang hoạt động và chưa quá hạn; tìm theo tiêu đề/công ty/kỹ năng; sắp xếp theo lần cập nhật; có phân trang và tùy chọn is_saved/is_applied. Bộ lọc sai trả 422. Kiểm tra bí danh và ngưỡng lương. |
| `GET /api/jobs/{id}` | công khai; Sanctum không bắt buộc | ID | Chi tiết tin và lượt xem; kiểm tra quy tắc hiển thị tin đã đóng/đã hết hạn. |
| `POST /api/jobs/{id}/report` | Sanctum | JSON `reason` bắt buộc <=100, `details?` <=2000 | Trả 201 cùng báo cáo chờ xử lý; mỗi người chỉ báo cáo một lần cho mỗi tin; báo cáo trùng trả 409; nhà tuyển dụng sở hữu tin không được tự báo cáo. |

Các nhóm lương được bộ điều khiển chấp nhận gồm `under_10`/`under_10m`, `10_20`/`10m_20m`, `over_20`/`above_20m`/`above_20`, `negotiable`. Kiểm tra các trường hợp min/max và giá trị rỗng bằng dữ liệu mẫu thực tế. Collation của MySQL hỗ trợ so sánh cơ bản không phân biệt hoa thường/dấu; chưa có chuyển tự hoặc tìm kiếm gần đúng chuyên biệt.

## 3. Hồ sơ và tệp của ứng viên

| Phương thức / đường dẫn | Quyền | Dữ liệu đầu vào | Kết quả mong đợi / nội dung kiểm tra |
|---|---|---|---|
| `GET /api/candidate/profile` | Ứng viên | không có | User/hồ sơ/kỹ năng; có thể tạo hồ sơ trống nếu chưa có. CV trả về API URL có bảo vệ, không phải đường dẫn công khai. |
| `POST/PUT /api/candidate/profile` | Ứng viên | multipart/JSON: `name?`,`phone?`,`email?`,`dob?`,`title?`,`experience_years?` 0–50, `bio?` <=2000, `address?`,`city?`,`social_links?`, `skills[]` or `skill_ids[]` <=10, `cv_file?` PDF <=5MB, `avatar?` ảnh <=2MB | Trả 200 cùng hồ sơ đã cập nhật; kiểm tra email/ngày sinh, ID và tệp. |
| `POST /api/candidate/cv` | Ứng viên | multipart `cv_file` PDF <=5MB | tải lên riêng tư; phản hồi has protected `cv_url`. |
| `GET /api/candidate/cv` | Ứng viên | không có | Trả JSON có đường dẫn được bảo vệ; 404 nếu chưa có CV. |
| `GET /api/candidate/cv/file` | Ứng viên | không có | Trả nội dung PDF của chính người dùng dưới dạng riêng tư, không lưu bộ nhớ đệm; 404 nếu thiếu tệp. |
| `DELETE /api/candidate/cv` | Ứng viên | không có | Xóa tệp riêng tư và bản sao công khai cũ cùng đường dẫn; gọi lặp lại vẫn an toàn. |
| `POST/DELETE /api/candidate/avatar` | Ứng viên | multipart ảnh / không có | Tải lên/xóa ảnh đại diện công khai. |
| `GET /api/candidate/saved-jobs` | Ứng viên | `page?` | Danh sách tin đã lưu có phân trang. |
| `POST/DELETE /api/jobs/{id}/save` | Ứng viên | ID | Lưu/bỏ lưu tin đang hoạt động; thao tác lưu lặp lại an toàn. |

Legacy CV/chat ảnh conversion: `php artisan storage:secure-legacy-cvs` copies `cvs/`, `application_cvs/`, and `chat_images/` and verifies SHA-256; `--delete-source` removes công khai copies chỉ after backup/verification. Do not treat returned URLs as công khai.

## 4. Hồ sơ ứng tuyển và AI

| Phương thức / đường dẫn | Quyền | Dữ liệu đầu vào | Kết quả mong đợi / nội dung kiểm tra |
|---|---|---|---|
| `POST /api/jobs/{id}/apply` | Sanctum ứng viên | multipart `cv_source?=profile|default|new`, `cv_file?` PDF <=5MB when new, `cover_letter?` <=3000 | Trả 201; không có hồ sơ/CV hoặc tự ứng tuyển thì không hợp lệ; tin phải đang hoạt động và chưa quá hạn; gửi lại, kể cả sau khi đã rút, trả 409; đưa tác vụ AI vào hàng đợi. |
| `GET /api/candidate/applications` | Ứng viên | `status?`,`page?`,`per_page?` | Lịch sử của chính người dùng, có phân trang. |
| `DELETE /api/candidate/applications/{id}/withdraw` | Ứng viên chủ sở hữu | ID | Chỉ được rút khi trạng thái là applied và chưa được xem xét; trường hợp khác trả 400. |
| `GET /api/employer/jobs/{id}/applications` | Nhà tuyển dụng chủ sở hữu | `status?`,`page?` | Chỉ trả hồ sơ ứng tuyển vào tin thuộc nhà tuyển dụng. |
| `GET /api/employer/applications/{id}` | Nhà tuyển dụng chủ sở hữu | ID | Chi tiết; lần xem đầu tiên chuyển trạng thái sang waiting và ghi thời điểm xem xét. |
| `PATCH /api/employer/applications/{id}/status` | Nhà tuyển dụng chủ sở hữu | JSON `status=waiting|accepted|rejected` | Cập nhật trạng thái và thông báo cho ứng viên; kiểm tra chuyển trạng thái và tính an toàn khi gọi lặp. |
| `GET /api/applications/{id}/cv` | Ứng viên chủ sở hữu, tin tuyển dụng nhà tuyển dụng, admin | ID | Trả nội dung PDF hồ sơ sau khi kiểm tra quyền; không đủ quyền nhận 403/404. |
| `POST /api/applications/{id}/ai-analyze` | hồ sơ ứng tuyển chủ sở hữu/ứng viên, tin tuyển dụng nhà tuyển dụng, admin | ID | Đưa phân tích vào hàng đợi hoặc dùng lại kết quả; đang chờ xử lý trả 202. |
| `GET /api/applications/{id}/ai-analysis` | giống nhau | ID | 200 hoàn tất; 202 đang chờ xử lý; 422 thất bại; xác minh no nhà cung cấp chi tiết leak. |

`ai_analysis_status=pending|completed|failed`; tiến trình xử lý nền command `php artisan queue:work --tries=2 --timeout=60`. Without tiến trình xử lý nền, hàng đợi lưu trong cơ sở dữ liệu remains đang chờ xử lý. Gemini is external; cơ chế dự phòng dựa trên heuristic must be kiểm traed separately and is not an employment decision.

## 5. Quản lý của nhà tuyển dụng

| Phương thức / đường dẫn | Quyền | Dữ liệu đầu vào | Kết quả mong đợi / nội dung kiểm tra |
|---|---|---|---|
| `GET /api/employer/company` | Nhà tuyển dụng | không có | Thông tin công ty hiện tại (có thể khởi tạo bản ghi trống). |
| `POST /api/employer/company` | Nhà tuyển dụng | `name`,`description`,`address`,`city`, tùy chọn size/site/logo | Cập nhật công ty; kiểm tra giới hạn logo và dọn tệp cũ. |
| `GET /api/employer/my-jobs` | Nhà tuyển dụng | `page?` | Danh sách tin của chính nhà tuyển dụng, có phân trang. |
| `POST /api/employer/jobs` | Nhà tuyển dụng | title/danh mục/level/quantity/type/city/hạn nộp/description/requirements/benefits/lương/kỹ năng | 201 đang hoạt động tin tuyển dụng; complete công ty bắt buộc; boundary/ownership validation. |
| `PUT /api/employer/jobs/{id}` | Nhà tuyển dụng chủ sở hữu | tin tuyển dụng fields | Cập nhật tin thuộc nhà tuyển dụng và danh sách kỹ năng. |
| `PATCH /api/employer/jobs/{id}/status` | Nhà tuyển dụng chủ sở hữu | `status=active|closed`, tùy chọn future `deadline` | Đóng/mở lại tin; xác minh khả năng hiển thị công khai và ứng tuyển. |
| `GET /api/admin/jobs/reported` | Quản trị viên | `page?`,`per_page?` <=100 | Danh sách tin có báo cáo, kèm phân trang và chi tiết báo cáo. |
| `PATCH /api/admin/jobs/{id}/report` | Quản trị viên | `status=resolved|dismissed` | Xử lý/bỏ qua báo cáo đang chờ, lưu người xử lý và thời điểm; chỉ xóa cờ báo cáo của tin khi không còn báo cáo chờ xử lý. |

lương type values and bắt buộc fields are enforced by `JobRequest`; use exact implementation validation when building clients. `salary_min`/`salary_max` are integer amounts in the project’s stored currency unit; confirm UI label is VND.

## 6. Chat, thông báo và quản trị

| Phương thức / đường dẫn | Quyền | Dữ liệu đầu vào | Kết quả mong đợi / nội dung kiểm tra |
|---|---|---|---|
| `GET /api/conversations` | Sanctum | không có | hiện tại user's rooms chỉ. |
| `POST /api/conversations` | Ứng viên/nhà tuyển dụng | `job_id`,`partner_id` | Cuộc trò chuyện gắn với hồ sơ ứng tuyển hợp lệ và chủ tin; quyền thành viên/vai trò được kiểm tra. |
| `GET /api/conversations/{id}/messages` | Thành viên cuộc trò chuyện | `page?`,`per_page?` | Lịch sử có phân trang; xử lý trạng thái đã đọc của tin nhắn nhận được. |
| `POST /api/conversations/{id}/messages` | Thành viên cuộc trò chuyện | JSON/multipart `message?` 1–1000, `image?` JPEG/PNG/GIF/WEBP <=5MB; one bắt buộc | Trả 201; cho phép chỉ gửi ảnh và phát sự kiện/thông báo. Tin nhắn vẫn có thể được lưu trong cơ sở dữ liệu nếu Reverb gửi thất bại. |
| `GET /api/conversations/{conversationId}/messages/{messageId}/image` | Thành viên cuộc trò chuyện | ID trên đường dẫn | Trả ảnh riêng tư sau khi kiểm tra thành viên; người ngoài nhận 403, tệp không tồn tại nhận 404. |
| `PATCH /api/conversations/{id}/read` | Thành viên cuộc trò chuyện | không có | Đánh dấu tin nhắn nhận được là đã đọc; phát sự kiện xác nhận. |
| `GET /api/notifications` | Sanctum | phân trang/lọc query | Thông báo của chính người dùng và số thông báo chưa đọc. |
| `PATCH /api/notifications/{id}/read` | Sanctum chủ sở hữu | ID | Đánh dấu thông báo của chính người dùng là đã đọc. |
| `PATCH /api/notifications/read-all` | Sanctum | không có | Đánh dấu tất cả thông báo của chính người dùng là đã đọc. |
| `DELETE /api/notifications/{id}` | Sanctum chủ sở hữu | ID | Xóa thông báo của chính người dùng. |
| `GET /api/admin/stats` | Quản trị viên | `days?` 1–365 | Số liệu tổng hợp cho trang quản trị. |
| `GET /api/admin/users`, `/api/admin/users/{id}` | Quản trị viên | phân trang/lọc, ID | Danh sách/chi tiết người dùng. |
| `PATCH /api/admin/users/{id}/status`, `/toggle-lock` | Quản trị viên | trạng thái/action | Lock/unlock/trạng thái; xác minh token revocation and self-lock policy. |
| `GET /api/admin/jobs`, `/api/admin/jobs/{id}` | Quản trị viên | query/ID | Danh sách/chi tiết tin tuyển dụng. |
| `DELETE /api/admin/jobs/{id}` | Quản trị viên | ID | Xóa theo quy tắc dây chuyền và gửi thông báo đã cấu hình. |
| `GET/POST /api/admin/categories`, `PUT/DELETE /api/admin/categories/{id}` | Quản trị viên | danh mục data/ID | Thêm/xem/sửa/xóa danh mục; kiểm tra ràng buộc khóa ngoại. |
| `GET/POST /api/admin/skills`, `PUT/DELETE /api/admin/skills/{id}` | Quản trị viên | kỹ năng data/ID | Thêm/xem/sửa/xóa kỹ năng; kiểm tra bảng liên kết. |
| `GET/POST /api/broadcasting/auth` | Sanctum | channel xác thực payload | Xác thực thành viên kênh chat riêng tư; kiểm tra việc từ chối người dùng không thuộc cuộc trò chuyện. |

## 7. Kiểm tra bổ sung

- Nguồn CORS phải khớp với giao diện; Reverb `REVERB_ALLOWED_ORIGINS` không được đặt ký tự đại diện trên môi trường vận hành.
- Với từng API, kiểm tra mã trạng thái, cấu trúc phản hồi, thay đổi trong cơ sở dữ liệu và quyền truy cập. Xem đầy đủ kịch bản FR tại [BACKEND_TESTING_GUIDE.md](BACKEND_TESTING_GUIDE.md).
- Các chỉ tiêu hiệu năng trong SRS (50 kết nối đồng thời, p95 1.5s, chat <1s, uptime 99%) chưa được xác minh cho đến khi đo trên môi trường triển khai đại diện.
