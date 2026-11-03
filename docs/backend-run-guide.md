# Hướng dẫn chạy backend từng bước — Windows / XAMPP

Trình tạo CV có worker `cv` và Node renderer riêng; xem [hướng dẫn cấu hình trình tạo CV](cv-builder-setup.md) sau khi cài bản có chức năng này.

Áp dụng cho dự án tại `F:\Soure_Code\tim-viec-online`, Laravel 12, PHP 8.2 trở lên và MySQL. Các lệnh bên dưới dùng **PowerShell**.

**Với máy và database hiện tại của bạn:** thực hiện phần 1 để chạy hằng ngày. Không cần tạo lại `.env`, tạo lại database hoặc seed lại dữ liệu. Phần 2 chỉ dành cho cài đặt lần đầu hay khi có cập nhật cần cài đặt thêm.

## 1. Cách chạy hằng ngày

### Bước 1 — Bật MySQL

Mở **XAMPP Control Panel**, bật **MySQL**, đợi trạng thái Running.

- Database dự án: `tim_viec_online`.
- Cổng MySQL: `3306`, theo `backend/.env`.
- API dùng PHP server ở bước sau, nên không cần bật Apache để chạy API. Nếu muốn mở phpMyAdmin của XAMPP thì bật thêm Apache.
- Nếu MySQL đã chạy, dùng tiến trình hiện có; không khởi động thêm một MySQL khác trên cùng cổng.

### Bước 2 — Mở terminal số 1: API Laravel

```powershell
cd F:\Soure_Code\tim-viec-online\backend
php artisan config:clear
php scripts/serve-local.php --port=8000
```

Giữ terminal này mở. Khi chạy được sẽ thấy địa chỉ `http://127.0.0.1:8000`.

Script `serve-local.php` bật OPcache nếu có và kiểm tra thay đổi source ở mỗi request, phù hợp với việc phát triển local của dự án.

Để kiểm tra, mở trình duyệt tại:

```text
http://127.0.0.1:8000/up
http://127.0.0.1:8000/api/categories
```

`/up` trả HTTP 200 khi ứng dụng khởi động được; `/api/categories` kiểm tra thêm việc đọc API và database. Chỉ mở `/up` chưa đủ xác nhận MySQL, email hoặc AI đã hoạt động.

Nếu muốn dùng lệnh Laravel thông thường, có thể dùng lệnh sau **thay cho** script trên, không chạy cả hai cùng cổng:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

### Bước 3 — Mở terminal số 2: Reverb cho chat và thông báo trực tiếp

```powershell
cd F:\Soure_Code\tim-viec-online\backend
php artisan reverb:start --host=127.0.0.1 --port=8080
```

Giữ terminal này mở. Reverb dùng cổng `8080`; API vẫn ở cổng `8000`.

Nếu không chạy Reverb, tin nhắn vẫn có thể được lưu qua API nhưng người nhận không có cập nhật WebSocket trực tiếp như khi chạy đầy đủ.

### Bước 4 — Mở terminal số 3: worker phân tích CV bằng AI

```powershell
cd F:\Soure_Code\tim-viec-online\backend
php artisan queue:work database --queue=ai --sleep=1 --tries=3 --timeout=60
```

Giữ terminal này mở. Worker ít hoặc không in nội dung khi không có tác vụ là bình thường.

- Cần `AI_ANALYSIS_ENABLED=true`, key và model hợp lệ trong `.env`.
- Mỗi đơn mới có CV thật tự được đưa vào queue ngay sau khi lưu, kể cả CV tải trực tiếp hoặc CV đã lưu trong tài khoản; không cần bấm nút phân tích ở nhà tuyển dụng.
- CV mẫu thuộc bộ seed bị bỏ qua, kể cả bản sao của CV mẫu; không gửi chúng sang provider để tốn quota.
- CV thật tải lên bằng tài khoản demo và nộp trong đơn mới vẫn được xử lý.
- Không chạy worker thì hồ sơ mới có thể ở trạng thái chờ phân tích.

### Bước 5 — Mở terminal số 4: worker email thông báo

```powershell
cd F:\Soure_Code\tim-viec-online\backend
php artisan queue:work database --queue=emails --sleep=1 --tries=3 --timeout=30
```

Giữ terminal này mở. Worker này xử lý thông báo email như cập nhật trạng thái ứng tuyển và tin nhắn mới, theo cài đặt nhận email của người dùng.

**Worker `ai` và worker `emails` là hai tiến trình riêng.** Chạy `php artisan queue:work` không chỉ định queue sẽ không tự xử lý hai queue này.

Email xác thực đăng ký, khôi phục và xác nhận đổi mật khẩu hiện gửi đồng bộ qua SMTP; chúng vẫn cần cấu hình SMTP đúng. Worker email không thay thế cấu hình SMTP.

### Bước 6 — Chạy frontend để sử dụng web

Mở terminal khác:

```powershell
cd F:\Soure_Code\tim-viec-online\frontend
npm run dev
```

Mở `http://localhost:3000`.

Khi muốn kiểm tra tốc độ của bản đã build, dừng `npm run dev` bằng `Ctrl+C`, rồi dùng:

```powershell
npm run build
npm start
```

Chọn một cách chạy frontend tại một thời điểm. Sau khi sửa source, bản `npm start` cần build lại và khởi động lại để nhận thay đổi.

### Bước 7 — Nếu cần tự động cập nhật tin hết hạn

Dự án có lịch chạy `jobs:expire` lúc `00:05` theo múi giờ cấu hình Laravel. Để lịch này hoạt động khi máy đang mở, chạy thêm một terminal:

```powershell
cd F:\Soure_Code\tim-viec-online\backend
php artisan schedule:work
```

Đây là tiến trình lịch, tách biệt với các queue worker. Kiểm tra lịch bằng `php artisan schedule:list`. Không cần terminal này chỉ để thử đăng nhập, chat hoặc phân tích CV.

### Các tiến trình cần giữ mở

Khi dùng **CV của tôi → Tạo CV mới**, cần thêm `RESUME_BUILDER_ENABLED=true` trong `backend/.env`, chạy `php artisan config:clear` và giữ worker xuất PDF riêng:

```powershell
cd F:\Soure_Code\tim-viec-online\backend
php artisan queue:work database --queue=cv --sleep=1 --tries=2 --timeout=45
```

Thiếu flag thì giao diện báo bảo trì; thiếu worker thì PDF ở trạng thái chờ. Worker `ai` hoặc `emails` không xử lý queue `cv`. Cách build renderer và chuẩn bị lần đầu nằm trong [hướng dẫn trình tạo CV](cv-builder-setup.md).

| Thành phần | Cổng / queue | Chức năng |
| --- | --- | --- |
| MySQL của XAMPP | `3306` | Lưu dữ liệu |
| API Laravel | `8000` | Xử lý API |
| Reverb | `8080` | Chat, thông báo trực tiếp |
| Worker AI | queue `ai` | Phân tích CV thật |
| Worker email | queue `emails` | Giao email thông báo |
| Worker CV | queue `cv` | Xuất PDF từ trình tạo CV |
| Frontend | `3000` | Giao diện web |
| Scheduler, khi cần | Không có cổng HTTP riêng | Chạy lịch tin hết hạn |

## 2. Cài đặt lần đầu hoặc khi chuyển sang máy mới

Bỏ qua phần này nếu dependencies, `.env` và database của bạn đã hoạt động.

### Bước 1 — Kiểm tra PHP và Composer

```powershell
cd F:\Soure_Code\tim-viec-online\backend
php -v
composer --version
php --ini
```

Backend yêu cầu PHP **8.2 trở lên**. `php --ini` cho biết file `php.ini` mà PHP dòng lệnh đang dùng; đây có thể khác PHP của Apache.

Nếu PowerShell chưa nhận `php`, thêm thư mục PHP của XAMPP vào PATH của terminal hiện tại:

```powershell
$env:Path = "F:\ACode\xampp\php;$env:Path"
php -v
```

Điều chỉnh đường dẫn nếu cài XAMPP ở nơi khác. Mỗi terminal mới cần PATH hợp lệ. Composer cũng cần được cài và có trong PATH.

### Bước 2 — Cài thư viện backend

```powershell
composer install
composer check-platform-reqs
```

Giữ nguyên `composer.lock`; không dùng `composer update` chỉ để khởi chạy dự án. Nếu thiếu extension, bật extension tương ứng trong file PHP CLI vừa kiểm tra, rồi chạy lại lệnh kiểm tra.

### Bước 3 — Chuẩn bị `.env`

Chỉ sao chép khi chưa có `.env`:

```powershell
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
}
```

Nếu `.env` đã có key, mật khẩu và kết nối đúng thì giữ nguyên. Các nhóm cấu hình cần kiểm tra:

```dotenv
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tim_viec_online
DB_USERNAME=root
DB_PASSWORD=

CACHE_STORE=database
QUEUE_CONNECTION=database
DB_QUEUE_TABLE=queue_jobs
DB_QUEUE_RETRY_AFTER=90

BROADCAST_CONNECTION=reverb
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_ALLOWED_ORIGINS=localhost,127.0.0.1

AI_ANALYSIS_ENABLED=true
AI_PROVIDER=groq
GROQ_MODEL=openai/gpt-oss-20b
```

`DB_USERNAME=root` và mật khẩu trống chỉ là ví dụ local XAMPP; dùng đúng thông tin MySQL của bạn. Queue lưu ở **`queue_jobs`**, còn bảng **`jobs`** là tin tuyển dụng, không đổi lẫn hai tên này.

Giữ hoặc điền riêng các giá trị `GROQ_API_KEY`, `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` và cấu hình SMTP của bạn. Không sao chép secrets vào frontend hoặc commit `.env`.

Chỉ khi **`APP_KEY` đang trống trên cài đặt mới**, chạy:

```powershell
php artisan key:generate
```

Không tạo lại `APP_KEY` mỗi lần bật backend. Sau khi chỉnh `.env`:

```powershell
php artisan config:clear
```

Chi tiết cấu hình SMTP và AI: [email](mail-setup.md), [AI](ai-setup.md).

### Bước 4 — Chuẩn bị database

**Database mới, rỗng:** tạo database `tim_viec_online` với collation `utf8mb4_unicode_ci` trong MySQL/phpMyAdmin, rồi tạo các bảng bằng migration:

```powershell
php artisan migrate
```

Chỉ khi cần dữ liệu danh mục và tài khoản admin ban đầu, đặt `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env`, xóa cache cấu hình rồi chạy:

```powershell
php artisan config:clear
php artisan db:seed
```

`DatabaseSeeder` hiện tạo danh mục, kỹ năng và admin theo cấu hình; không tự tạo bộ demo đồ sộ. Với database đang dùng thì không cần seed lại để khởi động.

**Database đã có dữ liệu hoặc import SQL:** kiểm tra trước:

```powershell
php artisan migrate:status
```

Nếu `2026_10_23_000001_create_domain_tables` còn Pending nhưng bảng nghiệp vụ đã tồn tại, không chạy lại migration tạo bảng đó. Chỉ chạy migration bổ sung chưa có bằng `--path`. Ví dụ hai migration AI:

```powershell
php artisan migrate --path=database/migrations/2026_10_27_000007_add_ai_application_requests.php --path=database/migrations/2026_10_27_000008_add_ai_assessment_provenance.php
```

Nếu hai migration đã Ran thì không cần chạy lại. Các migration email nằm trong [hướng dẫn email](mail-setup.md). Sao lưu database trước khi cập nhật schema có dữ liệu cần giữ.

Không dùng `migrate:fresh`, `migrate:refresh`, `db:wipe` hoặc import SQL đè lên database hiện tại chỉ để bật ứng dụng.

### Bước 5 — Tạo đường dẫn ảnh công khai

```powershell
php artisan storage:link
```

Nếu báo liên kết đã tồn tại thì không cần tạo lại. Trên Windows, nếu thiếu quyền tạo symbolic link, bật Developer Mode hoặc chạy terminal có quyền phù hợp rồi thử lại.

- Ảnh đại diện/logo công khai: `backend/storage/app/public`, truy cập qua `/storage/...`.
- CV và ảnh chat riêng tư: `backend/storage/app/private`, truy cập qua API có xác thực; không đưa thư mục private vào public/storage.

### Bước 6 — Kiểm tra frontend kết nối đúng backend

Trong `frontend/.env.local`:

```dotenv
AUTH_MODE=api
AUTH_API_URL=http://127.0.0.1:8000/api
AUTH_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_STORAGE_URL=http://127.0.0.1:8000/storage
NEXT_PUBLIC_REVERB_HOST=127.0.0.1
NEXT_PUBLIC_REVERB_PORT=8080
NEXT_PUBLIC_REVERB_SCHEME=http
```

Đặt `NEXT_PUBLIC_REVERB_APP_KEY` bằng **`REVERB_APP_KEY`** trong backend. Đây là app key công khai cho kết nối WebSocket; không đưa `REVERB_APP_SECRET`, Groq key hay SMTP password sang frontend.

Nếu frontend chưa có dependencies thì chạy `npm ci` tại thư mục `frontend`. Sau khi đổi `.env.local`, khởi động lại frontend; với `npm start` cần build lại trước.

Sau đó quay lại phần 1 để mở các terminal chạy dịch vụ.

## 3. Sau khi thay `.env` hoặc cập nhật code

1. Dừng các terminal API, Reverb và queue đang mở bằng `Ctrl+C`.
2. Chạy `composer install` nếu dependencies PHP có thay đổi; áp dụng đúng migration mới nếu có.
3. Tại `backend`, chạy `php artisan config:clear`.
4. Mở lại API, Reverb, worker AI, worker email và worker `cv` (nếu dùng trình tạo CV) theo phần 1.
5. Nếu sửa frontend, để dev server cập nhật hoặc build lại bản `npm start`.

Queue worker giữ code và cấu hình trong bộ nhớ; đổi key/model/mật khẩu SMTP mà không khởi động lại worker có thể khiến nó vẫn dùng cấu hình cũ.

`php artisan queue:restart` yêu cầu worker thoát sau tác vụ hiện tại, **không tự mở lại worker** khi bạn chạy bằng terminal. Phải chạy lại lệnh worker, hoặc dùng trình quản lý tiến trình khi triển khai.

## 4. Kiểm tra nhanh khi có lỗi

### Cổng 8000, 8080 hoặc 3000 đã được dùng

Xem tiến trình đang giữ cổng:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 8000,8080,3000 -ErrorAction SilentlyContinue |
    Select-Object LocalAddress, LocalPort, OwningProcess
```

Nếu đó là dịch vụ của dự án đang hoạt động đúng, dùng tiến trình đó. Nếu cần khởi động lại, ưu tiên quay về terminal cũ và bấm `Ctrl+C`.

Nếu không còn terminal cũ, kiểm tra đúng tiến trình trước khi dừng. Thay `12345` bằng `OwningProcess` vừa tìm được:

```powershell
$serviceProcessId = 12345
Get-CimInstance Win32_Process -Filter "ProcessId=$serviceProcessId" |
    Select-Object ProcessId, Name, CommandLine
```

Chỉ khi đã xác nhận đúng dịch vụ cần khởi động lại:

```powershell
Stop-Process -Id $serviceProcessId
```

Không dừng toàn bộ `php.exe` hoặc `node.exe` vì có thể làm tắt các terminal khác. Giữ các cổng thống nhất với `.env`; nếu đổi cổng frontend, phải cập nhật cả `AUTH_APP_URL` và `FRONTEND_URL` tương ứng.

### MySQL không kết nối được

Kiểm tra MySQL Running trong XAMPP, đúng cổng, tên database và tài khoản. API có thể mở được `/up` nhưng vẫn lỗi khi đọc danh mục nếu MySQL chưa chạy.

### Email không tới hoặc vẫn dùng địa chỉ gửi cũ

```powershell
cd F:\Soure_Code\tim-viec-online\backend
php artisan mail:check
```

Lệnh chỉ kiểm tra cấu hình, không gửi thư. Kiểm tra `MAIL_MAILER=smtp`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`; Gmail dùng mật khẩu ứng dụng. Khởi động lại worker email sau khi đổi cấu hình. Xem thêm [hướng dẫn email](mail-setup.md).

### AI chờ lâu hoặc chưa có kết quả

Kiểm tra worker `--queue=ai` đang chạy, `AI_ANALYSIS_ENABLED=true`, key/model đúng và provider còn quota. CV mẫu bị loại trừ là đúng thiết kế. Với CV thật bị lỗi, mở hồ sơ ở nhà tuyển dụng/admin và dùng nút thử lại sau khi xử lý nguyên nhân.

Xem tác vụ lỗi:

```powershell
php artisan queue:failed
```

Không retry toàn bộ hàng đợi chỉ để thử; chọn đúng tác vụ cần xử lý để tránh gửi lặp email hoặc gọi lại AI ngoài ý muốn.

### CV ở trạng thái “Đang tạo PDF…” và chưa tải xuống được

Xuất PDF dùng queue `cv`, tách riêng AI và email. Khi worker này tắt, yêu cầu vẫn được lưu nhưng chưa có file để tải. Từ thư mục `backend`, mở một terminal riêng và giữ lệnh sau chạy:

```powershell
php artisan queue:work database --queue=cv --sleep=1 --tries=2 --timeout=45
```

Worker sẽ nhận các yêu cầu đang chờ. Quay lại CV, bấm **Kiểm tra lại** hoặc tải lại trang; khi báo **sẵn sàng**, chọn **Tải PDF**. Nếu yêu cầu đã báo thất bại, chọn **Tạo bản PDF** sau khi worker chạy. Không cần tạo lại CV hoặc reset database.

Kiểm tra tác vụ bị chờ quá hai phút bằng `php artisan resumes:health`. Lệnh báo không có tác vụ treo không có nghĩa worker đang chạy: yêu cầu mới hoặc hàng đợi rỗng vẫn có thể cho kết quả đó. Nếu worker thoát sau `queue:restart` hoặc khi đóng terminal, cần chạy lại lệnh trên. Kiểm tra renderer theo [hướng dẫn trình tạo CV](cv-builder-setup.md) nếu worker chạy mà export vẫn thất bại.

### Xem log Laravel

```powershell
Get-Content .\storage\logs\laravel.log -Tail 80 -Wait
```

Chạy từ `backend`, bấm `Ctrl+C` để thoát theo dõi log. Không chia sẻ nguyên log chứa dữ liệu cá nhân hoặc secrets.

## 5. Dừng ứng dụng

Bấm `Ctrl+C` trong từng terminal API, Reverb, worker, scheduler và frontend. Sau khi các tiến trình dùng database đã dừng, có thể tắt MySQL trong XAMPP.

Hướng dẫn này dành cho **local**. Khi đưa lên server thật, dùng web server như Apache/Nginx với cấu hình PHP phù hợp, HTTPS, `APP_DEBUG=false`, trình quản lý queue/Reverb và lịch hệ thống; không dùng PHP development server làm máy chủ production.
