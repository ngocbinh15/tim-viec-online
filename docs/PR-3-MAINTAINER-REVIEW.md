# Review tiếp nhận backend — PR #3

> Cập nhật sau review: maintainer đã bổ sung bản sửa cho các lỗi bên dưới, kèm 37 test / 185 assertions đạt cục bộ, Composer audit sạch và CI cho PR từ fork. Nội dung còn lại lưu bằng chứng review bản gốc `c5ce29b`; [kế hoạch và kết quả sửa được giữ trong lịch sử Git](https://github.com/ngocbinh15/tim-viec-online/blob/0093c26d89c30f7192aeff27a541c1360b434104/docs/plans/backend-pr-3-fixes.md). Chưa coi kết quả test fake là đã nghiệm thu Gemini/SMTP/realtime thật.

Đã review commit `c5ce29b9a817e973d5408b40441fa06565caa333` của `VoChiDanh:vcd-dev-api`.

Backend đã có phạm vi đáng kể: API xác thực, hồ sơ/CV riêng tư, tuyển dụng, ứng tuyển, chat, thông báo, quản trị, migrations và tài liệu kiểm thử. Cần sửa các điểm bên dưới trước khi nhận vào nhánh tích hợp. Review này giữ PR mở để tác giả cập nhật trực tiếp trên fork; không squash hoặc chép code làm mất lịch sử đóng góp.

**Kết luận: Request changes — chưa merge bản hiện tại.**

Đã đăng [review chính thức trên PR #3](https://github.com/ngocbinh15/tim-viec-online/pull/3#pullrequestreview-5647899907), gồm 7 inline comment và mục môi trường test trong nội dung review. Các probe trong `backend/tests/Feature/Pr3ReviewRegressionTest.php` chỉ lưu ở nhánh review cục bộ để tái hiện lỗi, chưa push vào fork hoặc nhánh tích hợp; chúng cố ý yêu cầu hành vi đúng và đang đỏ trên bản được review.

## Kiểm chứng

- Composer validate và cài đặt đúng lock file: đạt. Đã đọc scripts trước khi cài; cài với `--no-scripts --no-plugins`.
- PHP 8.2.12, Laravel 11.57.0; kiểm tra cú pháp 77 file PHP thuộc app/routes/database/tests: đạt.
- 75 API routes được load thành công.
- 12 test sẵn có: **đạt, 53 assertions**, chạy trên instance MariaDB 10.4 riêng, cổng 33063, database thử nghiệm riêng. Không sử dụng database đang phát triển hoặc gửi email/Gemini thật.
- 8 regression probe bổ sung ở môi trường review: **đều thất bại theo đúng lỗi bên dưới**, 45 assertions. Đây là kiểm tra bổ sung của maintainer, không phải 8 test vốn có của PR. Chỉ thêm test, không sửa application code để tạo kết quả.
- SQLite không chạy được migration hiện tại vì collation MySQL `utf8mb4_unicode_ci`; không coi lỗi môi trường này là bằng chứng các luồng MySQL hỏng.
- `composer audit`: exit 1, báo **5 advisory records cho laravel/framework** (có bản ghi trùng cùng advisory). Cần phân loại phạm vi ảnh hưởng và chọn bản vá/nhánh framework còn hỗ trợ, cập nhật lock rồi kiểm thử lại; không suy ra mọi advisory đều khai thác được trong cấu hình Sanctum hiện tại. Tham chiếu: [TokenGuard](https://github.com/advisories/GHSA-f9x3-7vq9-cph6), [email validation](https://github.com/laravel/framework/security/advisories/GHSA-5vg9-5847-vvmq).

## Các mục cần sửa

1. **P0 — Không trả token khôi phục mật khẩu qua API công khai.** `Api/AuthController.php:215` trả `data.token`. Kiểm tra với tài khoản giả đã xác nhận mật khẩu bị đổi từ phản hồi API mà không cần đọc email. Chỉ gửi token qua email; phản hồi chung cho email tồn tại/không tồn tại và không trả token/link reset. Thêm test mail fake, token hết hạn/dùng lại và thu hồi phiên.
2. **P1 — Giữ CV nguyên bản của từng đơn ứng tuyển.** `Api/ApplicationController.php:81` dùng chung đường dẫn CV cá nhân; thay/xóa CV cá nhân xóa file mà đơn đã nộp vẫn tham chiếu. Sau apply bằng CV hồ sơ rồi xóa CV cá nhân, employer nhận 404 khi xem CV của đơn. Cần snapshot riêng hoặc quản lý vòng đời tham chiếu; test cả replace/delete và so sánh nội dung CV gốc.
3. **P1 — Đồng bộ quyết định mới về quyền xem AI.** Hiện endpoint GET/POST AI cho phép chính ứng viên; lịch sử ứng tuyển cũng trả `ai_analysis`. Quyết định sản phẩm mới của maintainer là **chỉ bên tuyển dụng được xem đánh giá**, ứng viên không được nhận dữ liệu này. Đây là yêu cầu cần đồng bộ thêm vì SRS trong PR vẫn ghi ứng viên được xem. Chặn ở API/resource, giữ quyền của employer sở hữu đơn và admin; cập nhật SRS/tài liệu liên quan.
4. **P2 — Đưa phân tích AI vào queue thật.** `Api/ApplicationController.php:156` gọi `dispatchSync`, nên request apply chờ phân tích thay vì trả trạng thái pending để worker xử lý. Thay bằng dispatch sau commit; test `assertNotDispatchedSync` và queued job, bao gồm lỗi dispatch/retry.
5. **P2 — Xem CV trực tiếp phải cập nhật trạng thái đã xem.** `downloadCv()` stream file nhưng giữ `applied`/`reviewed_at=null`; ứng viên vẫn rút đơn được sau khi employer đã đọc CV qua URL API. Thực hiện chuyển trạng thái nguyên tử cho employer đúng chủ sở hữu; ứng viên tự xem CV không được gây chuyển trạng thái.
6. **P2 — Không hồi sinh đơn đã rút.** `updateStatus()` đang cho đổi `withdrawn` thành `accepted`. Cần xác thực chuyển trạng thái hiện tại và bảo vệ cạnh tranh giữa rút đơn/xét duyệt; trả lỗi, không tạo thông báo trúng tuyển cho đơn đã rút.
7. **P2 — Không ghi phân tích thành công khi CV không đọc được.** PDF giả không có nội dung đọc được vẫn nhận fallback và trạng thái `completed`. FR-03.6 yêu cầu thông báo lỗi rõ; giữ trạng thái failed/unavailable, không trình bày điểm dự phòng như phân tích CV thành công. Nếu cần demo fallback, phải tách chế độ và nhãn rõ ràng.
8. **P1 — Cô lập mặc định môi trường test.** `phpunit.xml` chưa chọn database test trong khi suite dùng `RefreshDatabase`; lệnh test theo tài liệu có thể reset DB từ `.env` thông thường. Cấu hình MySQL test dùng một lần và guard chạy trước migrations. Fake cả public/private storage vì test legacy đang ghi file vào public storage.

## Điều kiện nhận lại

- Push commit sửa lên cùng nhánh fork `vcd-dev-api`; không cần mở PR mới hoặc force-push làm mất lịch sử review.
- Bổ sung mô tả PR: phạm vi, hướng dẫn setup/migration, thay đổi hợp đồng API, kết quả test và phần chưa kiểm chứng.
- Thêm CI cho PR từ fork: Composer validate/install và test trên database dùng một lần, không cần secrets vận hành. Không dùng `pull_request_target` để chạy code từ fork cùng token ghi hoặc secrets.
- Test sẵn có và test hồi quy tương ứng đều xanh; xử lý/giải thích kết quả dependency audit; maintainer review lại đúng SHA mới trước khi merge.
- Maintainer đã chốt và đổi nhánh đích từ `main` sang `develop`. Diff hiện còn 16 commit / 98 file so với `develop`; chưa merge vì các lỗi chặn nêu trên.
- Khi đạt, dùng merge commit để giữ commit/tác giả của contributor. Không xóa nhánh trên fork của tác giả.

Việc nhận backend không đồng nghĩa đã ghép frontend xong: candidate/employer đang còn mock adapter. Notification URL và hợp đồng dữ liệu cần kiểm tra riêng trong bước tích hợp; không ghi hoàn tất realtime/email/Gemini thật chỉ dựa vào test fake.
