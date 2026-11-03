# Bộ dữ liệu demo tuyển dụng quy mô lớn

Bộ seed đối chiếu SRS và migrations hiện hành, phục vụ phát triển, nghiệm thu và thử giao diện với nhiều dữ liệu. Tên người, doanh nghiệp, hồ sơ và hội thoại đều là dữ liệu tổng hợp. Không gửi email, broadcast, gọi AI hoặc tải tài nguyên bên ngoài khi seed.

## Chạy bộ seed

Chạy trong `backend/`, trên database local dành cho demo. Kiểm tra `DB_DATABASE` trước khi chạy. Lệnh bổ sung dữ liệu, không xóa/reset database và không thay `DatabaseSeeder` hiện có.

1. Đặt `APP_ENV=local` và `DEMO_SEED_PASSWORD` trong `backend/.env`. Tự chọn mật khẩu 12–32 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt. Không commit `.env` hay truyền mật khẩu qua dòng lệnh.
2. Chuẩn bị schema và liên kết ảnh public:

   ```bash
   php artisan config:clear
   php artisan migrate
   php artisan storage:link
   ```

3. Xem trước quy mô, rồi chạy:

   ```bash
   php artisan demo:seed --dry-run
   php artisan demo:seed
   ```

Mặc định là preset `large`: đầy đủ bảng nghiệp vụ, chưa có kết quả AI và fixtures hạ tầng. Để có dữ liệu ở **tất cả các bảng**, chọn ngay từ lần chạy đầu:

```bash
php artisan demo:seed --with-ai-fixtures --with-runtime
```

`--with-ai-fixtures` chỉ thêm kết quả ghi rõ **MINH HỌA SEED, KHÔNG PHẢI AI THẬT**. Không bật tính năng phân tích AI, không dùng kết quả minh họa để quyết định tuyển dụng. Ứng viên vẫn không nhận dữ liệu đánh giá AI từ API.

`--with-runtime` thêm session, token, reset token và cache đã hết hạn; queue riêng `demo-fixtures` chỉ chứa job no-op, được hẹn trong tương lai. Failed jobs và batches cũng là fixtures no-op. Chúng không gửi mail hoặc phân tích CV, kể cả khi retry. Các tác vụ dọn session/token/cache có thể tự xóa những fixtures hết hạn này sau đó.

Chỉ chạy được ở môi trường `local` hoặc `testing`. Dry-run không ghi database/file và không yêu cầu mật khẩu. Bảng `migrations` do Laravel quản lý; seed không tự giả lập lịch sử migration.

## Quy mô

| Preset | Ứng viên | Công ty | Tin tuyển dụng | Đơn ứng tuyển |
| --- | ---: | ---: | ---: | ---: |
| `tiny` | 12 | 6 | 36 | 60 |
| `medium` | 300 | 40 | 400 | 3.000 |
| `large` (mặc định) | 1.500 | 120 | 1.440 | 22.500 |
| `huge` | 5.000 | 400 | 6.000 | 100.000 |

Ví dụ: `php artisan demo:seed --preset=medium --dry-run`. Preset `large` đã được chạy kiểm chứng đầy đủ; `huge` cung cấp tùy chọn tăng quy mô, chưa được benchmark trong đợt này.

Số liệu preset `large` trên database kiểm thử ban đầu rỗng, bật cả hai tùy chọn:

| Bảng / nhóm | Số bản ghi |
| --- | ---: |
| `users` | 1.623 (1.500 ứng viên, 120 nhà tuyển dụng, 3 admin) |
| `candidate_profiles` / `companies` | 1.500 / 120 |
| `categories` / `skills` | 24 / 148 |
| `candidate_skills` / `job_skills` | 9.555 / 8.640 |
| `jobs` / `applications` | 1.440 / 22.500 |
| `saved_jobs` | 12.000 |
| `conversations` / `messages` | 6.000 / 60.000 |
| `notifications` | 57.000 |
| `job_reports` | 360 |
| `ai_cv_analyses` (tùy chọn) | 7.500 |
| `personal_access_tokens` / `sessions` (tùy chọn) | 1.623 / 1.623 |
| `password_reset_tokens` (tùy chọn) | 1.500 |
| `cache` / `cache_locks` (tùy chọn) | 120 / 120 |
| `queue_jobs` / `failed_jobs` / `job_batches` (tùy chọn) | 30 / 30 / 30 |
| `demo_seed_runs` | 1 |

Danh mục/kỹ năng đã tồn tại cùng tên được dùng lại, không ghi đè. Vì vậy số bản ghi **mới tạo** ở hai bảng này có thể ít hơn khi database đã có dữ liệu. Các bảng hạ tầng được tạo với số lượng đủ kiểm tra chức năng của chúng, không tăng giả tạo theo số đơn ứng tuyển.

## Tài khoản đăng nhập

Mật khẩu chung là giá trị `DEMO_SEED_PASSWORD` bạn đặt trước lần seed đầu.

| Vai trò | Tài khoản đầu tiên |
| --- | --- |
| Ứng viên | `candidate.00001@demo.timviec.test` |
| Nhà tuyển dụng | `employer.00001@demo.timviec.test` |
| Admin | `admin@demo.timviec.test` |

Các tài khoản tiếp theo tăng số đệm 5 chữ số: `candidate.00002@demo.timviec.test`, `employer.00002@demo.timviec.test`. Hai admin còn lại dùng `admin.00002@demo.timviec.test` và `admin.00003@demo.timviec.test`. Một phần tài khoản phía sau được khóa để kiểm thử quản trị; tài khoản đầu tiên của mỗi vai trò luôn hoạt động. Email dùng miền `.test`, không phải địa chỉ nhận thư thật.

## Nội dung và quan hệ dữ liệu

- 24 ngành với chức danh, kỹ năng, mô tả công việc, yêu cầu và quyền lợi theo ngành; nhiều tỉnh/thành, cấp bậc, hình thức làm việc, khoảng lương và lương thỏa thuận.
- Tin đang tuyển, đã đóng và hết hạn; đủ trạng thái đơn `applied`, `waiting`, `accepted`, `rejected`, `withdrawn`. Thời điểm nộp nằm trong thời hạn tin; hồ sơ đã rút không có `reviewed_at`.
- Hội thoại liên kết đúng ứng viên, doanh nghiệp sở hữu tin và đơn ứng tuyển. Có tin nhắn đã đọc/chưa đọc, ảnh chat riêng tư, thông báo và báo cáo kiểm duyệt ở nhiều trạng thái.
- Mỗi ứng viên có PDF hồ sơ; mỗi đơn có **bản CV riêng đường dẫn**, giữ độc lập khi hồ sơ cá nhân thay đổi. PDF có text trích xuất được, dùng chữ Latin chuyển tự để không phụ thuộc font ngoài. Nội dung database vẫn là tiếng Việt có dấu.
- Avatar/logo PNG là hình đại diện tạo local. Không dùng logo doanh nghiệp hoặc CV cá nhân thật. Assets nằm trong `demo-seed/recruitment-demo-v1/` trên disk tương ứng; CV và ảnh chat ở disk private, avatar/logo ở disk public.

## Chạy lại và xử lý sự cố

### Database đã import từ SQL cũ

Nếu `migrate` báo `candidate_profiles already exists`, database có thể đã import các bảng nghiệp vụ nhưng chưa có lịch sử migration domain. Không chạy `migrate:fresh` và không tự đánh dấu migration cũ đã chạy. Sao lưu, đối chiếu schema trước; với bản import thiếu các cột AI của applications, ảnh/read_at của messages và bảng job_reports, có thể áp dụng migration bổ sung riêng:

```bash
php artisan migrate --path=database/migrations/2026_10_26_000002_complete_imported_domain_schema.php
php artisan migrate --path=database/migrations/2026_10_26_000001_create_demo_seed_runs_table.php
```

Migration bổ sung giữ nguyên dữ liệu, chỉ thêm các thành phần còn thiếu nêu trên; không phải công cụ chuyển đổi mọi schema cũ. Đây là migration chỉ nâng cấp: rollback không xóa cột/bảng có thể đang chứa dữ liệu. Migration domain ban đầu vẫn có thể hiện pending trong lịch sử của database import; không chạy lệnh migrate tổng quát trên database đó cho đến khi hoàn tất đối chiếu/baseline lịch sử. Database tạo mới bằng migrations không cần hai lệnh chọn đường dẫn này.

### Chạy lại bộ dữ liệu

`demo_seed_runs` lưu cấu hình và số lượng lúc tạo. Chạy lại **cùng preset và tùy chọn** trả về kết quả cũ, không tạo trùng hoặc ghi đè dữ liệu bạn đã sửa. Đổi mật khẩu trong `.env` rồi chạy lại cũng không đổi mật khẩu các tài khoản đã tạo.

Đổi preset hoặc thêm/bỏ tùy chọn sau lần seed đầu sẽ bị từ chối. Dùng database demo riêng nếu muốn thử một bộ khác. Seeder cũng dừng nếu phát hiện tài khoản thuộc `demo.timviec.test` nhưng không có manifest, tránh chiếm dụng tài khoản đã tồn tại. Không xóa manifest để ép chạy lại.

Dữ liệu database được ghi trong transaction và có khóa chống hai lần seed đồng thời. File storage không nằm trong transaction: nếu seed lỗi giữa chừng, có thể còn file trong namespace demo. Sửa nguyên nhân rồi chạy lại cùng cấu hình; seed sẽ sử dụng lại đường dẫn của nó. Một manifest thành công không tự sửa file hoặc bản ghi bị xóa thủ công về sau.

## Kiểm chứng

Đợt kiểm tra 26/10/2026 chạy trên MariaDB và storage riêng, không áp dụng bộ seed vào database phát triển của người dùng. Preset `large` với hai tùy chọn hoàn thành khoảng 119 giây, PHP peak memory 58 MB trên máy kiểm thử. Đây là thời gian tạo dữ liệu, không phải kết quả kiểm thử tải ứng dụng.

Bộ kiểm thử backend sau thay đổi đạt **64 tests, 375 assertions**, bao gồm migration bổ sung cho SQL import cũ. Regression kiểm tra quy mô, chạy lại, giữ dữ liệu có sẵn, ownership CV, đăng nhập, phân quyền AI, fixtures vận hành, từ chối cấu hình không hợp lệ và không gọi dịch vụ ngoài. Kiểm tra trực tiếp bộ large không thiếu CV/avatar/logo; các API jobs, companies, candidate applications, employer applications và admin stats đều trả 200. Hướng dẫn kiểm thử backend và cấu hình database riêng tại [Backend Testing Guide](../BACKEND_TESTING_GUIDE.md).

| Vai trò | Email |
|---|---|
| Ứng viên | `candidate.00001@demo.timviec.test` |
| Nhà tuyển dụng | `employer.00001@demo.timviec.test` |
| Admin | `admin@demo.timviec.test` |
|Mật khẩu chung:| `Demo!071daf6c9f2ff75cfb34Aa7`|