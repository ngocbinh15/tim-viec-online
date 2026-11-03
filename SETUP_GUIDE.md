# TÀI LIỆU HƯỚNG DẪN SETUP DỰ ÁN & PHÂN CÔNG THÀNH VIÊN

## MỤC LỤC
1. [Yêu cầu Môi trường & Công cụ Cài đặt](#1-yêu-cầu-môi-trường--công-cụ-cài-đặt)
2. [Quy tắc Phân nhánh Git & Quy trình Làm việc](#2-quy-tắc-phân-nhánh-git--quy-trình-làm-việc)
3. [Cài đặt & Khởi chạy Backend (Laravel 11 API)](#3-cài-đặt--khởi-chạy-backend-laravel-11-api)
   - [3.1. Khởi tạo mới từ đầu (Nếu thư mục /backend chưa có)](#31-khởi-tạo-mới-từ-đầu-nếu-thư-mục-backend-chưa-có)
   - [3.2. Khởi chạy dự án (Khi đã có thư mục /backend từ Git)](#32-khởi-chạy-dự-án-khi-đã-có-thư-mục-backend-từ-git)
4. [Cài đặt & Khởi chạy Frontend (Next.js 14 App Router)](#4-cài-đặt--khởi-chạy-frontend-nextjs-14-app-router)
   - [4.1. Khởi tạo mới từ đầu (Nếu thư mục /frontend chưa có)](#41-khởi-tạo-mới-từ-đầu-nếu-thư-mục-frontend-chưa-có)
   - [4.2. Khởi chạy dự án (Khi đã có thư mục /frontend từ Git)](#42-khởi-chạy-dự-án-khi-đã-có-thư-mục-frontend-từ-git)
5. [Hướng dẫn Chi tiết & Checklist Từng Thành viên](#5-hướng-dẫn-chi-tiết--checklist-từng-thành-viên)
   - [Member 1: Backend Lead (Auth, System & AI CV Analysis)](#member-1--backend-lead-auth-system--ai-cv-analysis)
   - [Member 2: Backend Core (Job Core, Application & Realtime Chat)](#member-2--backend-core-job-core-application--realtime-chat)
   - [Member 3: Frontend (Candidate UI, Job Flow & AI Results)](#member-3--frontend-candidate-ui-job-flow--ai-results)
   - [Member 4: Frontend (Auth, Employer Portal & Realtime Chatbox)](#member-4--frontend-auth-employer-portal--realtime-chatbox)
6. [Quy chuẩn Phối hợp & Tiêu chuẩn API](#6-quy-chuẩn-phối-hợp--tiêu-chuẩn-api)
7. [Xử lý Các Lỗi Thường Gặp (Troubleshooting)](#7-xử-lý-các-lỗi-thường-gặp-troubleshooting)

---

## 1. Yêu cầu Môi trường & Công cụ Cài đặt

Trước khi bắt đầu, mọi thành viên trong nhóm bắt buộc phải cài đặt các công cụ sau trên máy cá nhân:

| Công cụ | Phiên bản yêu cầu | Mục đích | Cách kiểm tra trên Terminal |
|---|---|---|---|
| **Git** | >= 2.30 | Quản lý mã nguồn | `git --version` |
| **PHP** | >= 8.2 (Khuyên dùng PHP 8.2 hoặc 8.3) | Chạy Laravel 11 | `php -v` |
| **Composer** | >= 2.5 | Quản lý gói thư viện PHP | `composer -v` |
| **Node.js** | >= 18.17 (LTS khuyên dùng: v20.x hoặc v22.x) | Chạy Next.js | `node -v` |
| **NPM** | >= 9.x | Quản lý package Node | `npm -v` |
| **MySQL** | >= 8.0 (hoặc MariaDB >= 10.4) | Cơ sở dữ liệu | Đi kèm trong Laragon hoặc XAMPP |
| **Môi trường Web Server** | **Laragon** (Khuyên dùng) hoặc **XAMPP** | Chạy Apache, MySQL, phpMyAdmin | Bật Service MySQL & Apache |


---

## 2. Quy tắc Phân nhánh Git & Quy trình Làm việc

### 2.1. Quy tắc Phân nhánh (Branching Strategy)
- **Tuyệt đối KHÔNG commit và push trực tiếp lên nhánh `main`**.
- Nhánh phát triển chính của nhóm là `develop`.
- Mỗi thành viên khi làm tính năng mới phải tạo nhánh riêng từ `develop`:
  ```bash
  # Chuyển sang develop và cập nhật mới nhất
  git switch develop
  git pull origin develop

  # Tạo nhánh tính năng mới theo quy ước
  git switch -c feature/<tên-tính-năng>
  ```
  *Ví dụ:*
  -  `git switch -c feature/auth-sanctum`
  -  `git switch -c feature/job-crud-api`
  -  `git switch -c feature/candidate-ui`
  -  `git switch -c feature/chat-websocket`

### 2.2. Quy trình Commit & Tạo Pull Request (PR)
1. Thường xuyên commit các thay đổi có ý nghĩa:
   ```bash
   git add .
   git commit -m "feat(auth): hoàn thành API đăng ký và đăng nhập Sanctum"
   git push origin feature/<tên-nhánh>
   ```
2. Vào GitHub tạo **Pull Request** trỏ vào nhánh `develop`.

---

## 3. Cài đặt & Khởi chạy Backend (Laravel 11 API)

### 3.1. Khởi tạo mới từ đầu

1. **Mở Terminal tại thư mục gốc của repository (`tim-viec-online`):**
   ```bash
   composer config --global policy.advisories.block false
   composer create-project laravel/laravel:^11.0 backend
   ```
2. **Di chuyển vào thư mục backend và cài các gói thư viện quan trọng:**
   ```bash
   cd backend
   composer require laravel/sanctum
   composer require laravel/reverb
   ```
3. **Cấu hình file `.env` kết nối MySQL trước khi cài API:**
   > Mở file `backend/.env`, đổi `DB_CONNECTION=sqlite` thành `DB_CONNECTION=mysql`, bổ sung `DB_COLLATION`
   ```ini
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=tim_viec_online
   DB_USERNAME=root
   DB_PASSWORD=
   DB_COLLATION=utf8mb4_unicode_ci
   DB_QUEUE_TABLE=queue_jobs
   ```
4. **Cài đặt cấu hình API & Sanctum:**
   ```bash
   php artisan install:api
   ```
5. **Cài đặt Reverb WebSocket:**
   ```bash
   php artisan reverb:install
   ```
6. **Tạo Application Key và liên kết Symbolic Link:**
   ```bash
   php artisan key:generate
   php artisan storage:link
   ```
7. **Commit và đẩy thư mục `backend` lên nhánh `develop`:**
   ```bash
   git add backend
   git commit -m "chore(backend): khởi tạo project Laravel 11 API, Sanctum và Reverb"
   git push origin develop
   ```

---

### 3.2. Khởi chạy dự án (Khi đã có thư mục `/backend` từ Git)
> **Dành cho các thành viên còn lại** sau khi đã kéo (pull) thư mục `backend` về máy:

1. **Di chuyển vào thư mục backend & Cài đặt dependencies:**
   ```bash
   cd backend
   composer install
   ```

2. **Thiết lập file môi trường `.env`:**
   ```bash
   # Trên Git Bash / Linux / macOS
   cp .env.example .env

   # Hoặc trên PowerShell Windows
   copy .env.example .env
   ```

3. **Tạo Application Key:**
   ```bash
   php artisan key:generate
   ```

4. **Cấu hình các thông số trong file `.env`:**
   Mở file `.env` và cập nhật các dòng sau:
   ```ini
   APP_NAME="TimViecOnline"
   APP_ENV=local
   APP_DEBUG=true
   APP_URL=http://localhost:8000

   # Kết nối MySQL (Đảm bảo Laragon/XAMPP đã Start MySQL)
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=tim_viec_online
   DB_USERNAME=root
   DB_PASSWORD=

   # File Storage (Để xem được ảnh đại diện và CV PDF)
   FILESYSTEM_DISK=public

   # WebSocket Reverb
   BROADCAST_CONNECTION=reverb
   REVERB_APP_ID=timviec_app
   REVERB_APP_KEY=timviec_key
   REVERB_APP_SECRET=timviec_secret
   REVERB_HOST="localhost"
   REVERB_PORT=8080
   REVERB_SCHEME=http

   # Khóa Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. **Tạo liên kết Symbolic Link lưu trữ file:**
   ```bash
   php artisan storage:link
   ```

6. **Khởi chạy Server Backend:**
   ```bash
   php artisan serve --port=8000
   ```
   API Backend sẽ chạy tại: **`http://localhost:8000`**.

---

## 4. Cài đặt & Khởi chạy Frontend (Next.js 14 App Router)

### 4.1. Khởi tạo mới từ đầu (Nếu thư mục `/frontend` chưa có)

1. **Mở Terminal tại thư mục gốc của repository (`tim-viec-online`):**
   ```bash
   npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   ```
2. **Di chuyển vào thư mục frontend và cài đặt các thư viện cần thiết:**
   ```bash
   cd frontend
   npm install axios lucide-react sonner clsx tailwind-merge
   npm install laravel-echo pusher-js
   ```

   > [!NOTE]
   > **Nếu gặp cảnh báo `high severity vulnerabilities` khi chạy npm install:**  
   > - Đây chỉ là cảnh báo công cụ kiểm tra cú pháp dev (gói `braces` trong ESLint), hoàn toàn không ảnh hưởng đến website.  
   > - ⚠️ **TUYỆT ĐỐI KHÔNG chạy `npm audit fix --force`** vì sẽ làm hạ cấp phiên bản Next.js và gây lỗi xung đột hệ thống!  
   > - Hãy cấu hình `"overrides": {"fast-glob": "^3.3.3", "micromatch": "^4.0.8", "braces": "^3.0.3" }` trong `frontend/package.json` để vá an toàn. Bạn có thể bỏ qua và tiếp tục làm bước 3.

3. **Cài đặt thư viện giao diện shadcn/ui:**
   ```bash
   npx shadcn@latest init
   ```
   *(Chọn Nova, Style: Default, Base color: Slate, CSS variables: Yes)*
4. **Tạo file `.env.example` trong thư mục frontend:**
   Tạo file `frontend/.env.example` với nội dung:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   NEXT_PUBLIC_STORAGE_URL=http://localhost:8000/storage
   NEXT_PUBLIC_REVERB_APP_KEY=timviec_key
   NEXT_PUBLIC_REVERB_HOST=localhost
   NEXT_PUBLIC_REVERB_PORT=8080
   NEXT_PUBLIC_REVERB_SCHEME=http
   ```
5. **Commit và đẩy thư mục `frontend` lên nhánh `develop`:**
   ```bash
   git add frontend
   git commit -m "chore(frontend): khởi tạo project Next.js 14 App Router, Tailwind, Axios và Echo"
   git push origin develop
   ```

---

### 4.2. Khởi chạy dự án (Khi đã có thư mục `/frontend` từ Git)
> **Dành cho các thành viên còn lại** sau khi đã kéo (pull) thư mục `frontend` về máy:

1. **Di chuyển vào thư mục frontend & Cài đặt dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Thiết lập file môi trường `.env.local`:**
   ```bash
   # Trên Git Bash / Linux / macOS
   cp .env.example .env.local

   # Hoặc trên PowerShell Windows
   copy .env.example .env.local
   ```

3. **Kiểm tra thông số cấu hình trong file `.env.local`:**
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   NEXT_PUBLIC_STORAGE_URL=http://localhost:8000/storage

   NEXT_PUBLIC_REVERB_APP_KEY=timviec_key
   NEXT_PUBLIC_REVERB_HOST=localhost
   NEXT_PUBLIC_REVERB_PORT=8080
   NEXT_PUBLIC_REVERB_SCHEME=http
   ```

4. **Khởi chạy Frontend Dev Server:**
   ```bash
   npm run dev
   ```
   Mở trình duyệt truy cập: **`http://localhost:3000`**.

---

## 5. Hướng dẫn Chi tiết & Checklist Từng Thành viên

---

### Member 1 — Backend Lead (Auth, System & AI CV Analysis)

* **Vai trò:** Trưởng nhóm kỹ thuật Backend, phụ trách xác thực, bảo mật, hồ sơ người dùng và lõi AI.
* **Thư mục làm việc chính:** `/backend/app/`, `/backend/routes/api.php`, `/backend/app/Services/`.

#### Công việc cụ thể theo tuần:
* **Tuần 1 (Auth & Base System):**
  - Khởi tạo project Laravel 11 API, cấu hình CORS (`config/cors.php`) cho phép `http://localhost:3000`.
  - Cài đặt & cấu hình **Laravel Sanctum**.
  - Viết các FormRequest validate dữ liệu đăng ký/đăng nhập (Họ tên 2-100 ký tự, mật khẩu mạnh 8-32 ký tự, email chuẩn RFC).
  - Viết Controller & Service cho Authentication:
    - `POST /api/register`: Tự động tạo bản ghi `candidate_profiles` hoặc `companies` tương ứng.
    - `POST /api/login`: Kiểm tra mật khẩu (Bcrypt), xử lý đếm số lần sai `failed_attempts` (khóa sau 5 lần), cấp phát Sanctum Token.
    - `POST /api/logout`: Hủy token hiện tại.
    - `GET /api/user`: Lấy thông tin user đăng nhập.
* **Tuần 2 (Profile & Gemini AI Service):**
  - Viết API cập nhật hồ sơ cá nhân:
    - `PUT /api/candidate/profile`: Upload CV PDF (<= 5MB, validate mime `application/pdf`), lưu vào private storage; chỉ tải qua endpoint có authorization.
    - `PUT /api/employer/company`: Cập nhật thông tin công ty, logo, website, quy mô.
  - Tích hợp Google Gemini API qua model cấu hình `GEMINI_MODEL` (model mặc định trong `.env.example` hiện tại):
    - Tạo `app/Services/GeminiService.php`.
    - Truyền nội dung CV PDF và JD công việc vào Gemini Prompt với định dạng trả về **Structured JSON Output** (khớp 100% với các cột trong bảng `ai_cv_analyses`):
      ```json
      {
        "match_score": 85,
        "summary": "Ứng viên có kỹ năng backend tốt, phù hợp cao với vị trí.",
        "matched_skills": [
          "PHP",
          "Laravel",
          "MySQL"
        ],
        "missing_skills": [
          "Docker",
          "Redis"
        ],
        "strengths": [
          "Đúng khung công nghệ",
          "2 năm kinh nghiệm thực chiến"
        ],
        "recommendations": [
          "Cần bổ sung kiến thức về Caching và containerization"
        ]
      }
      ```
    - Lưu kết quả vào bảng `ai_cv_analyses` (lưu vĩnh viễn, không tính toán lại theo FR-07.5).
* **Tuần 3 (Admin API & Nghiệm thu):**
  - Viết API cho Admin:
    - `GET /api/admin/stats`: Thống kê tổng số Ứng viên, NTD, Jobs, Lượt nộp.
    - `GET /api/admin/users`: Danh sách người dùng, tìm kiếm & lọc theo role.
    - `PATCH /api/admin/users/{id}/status`: Khóa (`locked`) hoặc mở khóa (`active`).
  - Tối ưu hiệu năng, kiểm tra bảo mật (SQL Injection, XSS, MIME Sniffing).

#### Checklist hoàn thành của Member 1:
- [ ] Đăng ký / Đăng nhập hoạt động mượt mà, trả token chuẩn Sanctum.
- [ ] Upload CV file PDF thành công, có link xem trực tiếp trên browser.
- [ ] Gọi Google Gemini API thành công, trả về điểm số Match Score và mảng kỹ năng đúng format JSON.
- [ ] Admin khóa tài khoản thành công, tài khoản bị khóa không đăng nhập được.

---

### Member 2 — Backend Core (Job Core, Application & Realtime Chat)

* **Vai trò:** Phụ trách toàn bộ nghiệp vụ cốt lõi về Việc làm, Nộp hồ sơ và Hạ tầng Tin nhắn Thời gian thực.
* **Thư mục làm việc chính:** `/backend/app/Http/Controllers/`, `/backend/app/Events/`, `/backend/routes/api.php`.

#### Công việc cụ thể theo tuần:
* **Tuần 1 (Danh mục & Master Data):**
  - Viết Controller & Service quản lý Danh mục & Kỹ năng:
    - `GET /api/categories`, `GET /api/skills` (Public).
    - `POST / PUT / DELETE` cho Admin quản lý danh mục.
  - Viết Database Seeder cho 5 ngành nghề và 10+ kỹ năng phổ biến.
* **Tuần 2 (Job Core & Nộp hồ sơ):**
  - Viết API Quản lý Tin tuyển dụng:
    - `GET /api/jobs`: Tìm kiếm & Lọc đa tiêu chí (keyword, category_id, city, khoảng lương, job_type). Sắp xếp theo thời gian đẩy bài gần nhất (`ORDER BY updated_at DESC` theo cơ chế bump tin FR-05.4). Phân trang (Pagination 10 jobs/trang).
    - `GET /api/jobs/{id}`: Chi tiết việc làm (tăng `views_count`).
    - `POST /api/employer/jobs`: NTD đăng tin mới (validate deadline > today, lương min <= lương max, status mặc định `active`).
    - `PATCH /api/employer/jobs/{id}/status`: Đóng/Mở lại tin tuyển dụng (`active` / `closed`).
  - Viết API Nộp đơn ứng tuyển (Application Flow):
    - `POST /api/jobs/{id}/apply`: Ứng viên nộp hồ sơ. Ràng buộc: Mỗi ứng viên chỉ được nộp **1 lần** vào 1 job đang mở. Sau khi lưu thành công, tự động cập nhật thời gian tin (`$job->touch()` - cơ chế bump_at theo FR-05.4 để đẩy tin lên đầu) và kích hoạt Event/Service gọi AI phân tích của Member 1.
    - `DELETE /api/candidate/applications/{id}/withdraw`: Rút hồ sơ (chỉ cho phép khi hồ sơ còn ở trạng thái `applied`).
    - `GET /api/employer/jobs/{id}/applications`: NTD xem danh sách đơn nộp kèm điểm số AI.
    - `PATCH /api/employer/applications/{id}/status`: Đổi trạng thái (`waiting`, `accepted`, `rejected`).
* **Tuần 3 (Realtime Chat & WebSocket):**
  - Setup **Laravel Reverb** (hoặc Pusher Channels).
  - Viết API Chat 1-1 giữa NTD và Ứng viên đã nộp đơn:
    - `GET /api/conversations`: Danh sách phòng chat kèm tin nhắn mới nhất.
    - `GET /api/conversations/{id}/messages`: Lịch sử chat (phân trang).
    - `POST /api/conversations/{id}/messages`: Gửi tin nhắn mới.
  - Tạo Broadcast Event `MessageSent implements ShouldBroadcast` để bắn dữ liệu qua WebSocket tức thì dưới 1 giây.
  - Viết API Thông báo In-App (`/api/notifications`).

#### Checklist hoàn thành của Member 2:
- [ ] API lọc việc làm theo đa tiêu chí (ngành, tỉnh thành, khoảng lương) trả kết quả chính xác.
- [ ] Nộp đơn ứng tuyển chặn được tình trạng nộp trùng lặp 2 lần.
- [ ] NTD đổi trạng thái đơn nộp thành công và cập nhật `reviewed_at` khi mở CV.
- [ ] Broadcast Event `MessageSent` hoạt động, tin nhắn bắn qua Reverb/Pusher thành công.

---

### Member 3 — Frontend (Candidate UI, Job Flow & AI Results)

* **Vai trò:** Xây dựng giao diện công khai và trải nghiệm người tìm việc (Candidate Portal) với Next.js 14 App Router và Tailwind CSS.
* **Thư mục làm việc chính:** `/frontend/src/app/(public)/`, `/frontend/src/app/(candidate)/`, `/frontend/src/components/`.

#### Công việc cụ thể theo tuần:
* **Tuần 1 (Khung giao diện & Layout):**
  - Thiết lập Next.js 14 App Router, cài đặt `shadcn/ui`, `lucide-react`, `axios`, `sonner`.
  - Thiết lập Design System: Màu sắc chuyên nghiệp (Slate/Zinc, Emerald/Indigo nhấn), typography Font Inter.
  - Dựng Layout dùng chung:
    - `Header`: Logo, menu điều hướng, thanh tìm kiếm nhanh, nút Đăng nhập/Đăng ký / User Dropdown.
    - `Footer`: Thông tin sàn việc làm, liên kết chính sách, bản quyền.
* **Tuần 2 (Trang chủ, Tìm kiếm & Chi tiết Job):**
  - **Trang chủ (`/`):**
    - Hero banner tìm kiếm lớn (nhập từ khóa, chọn địa điểm).
    - Danh mục ngành nghề nổi bật (icon sinh động).
    - Danh sách việc làm mới nhất (Job card hiển thị mức lương badge xanh, địa điểm, hạn nộp).
    - Danh sách công ty tuyển dụng hàng đầu.
  - **Trang Tìm kiếm & Lọc việc làm (`/jobs`):**
    - Cột trái: Bộ lọc đa tiêu chí (Ngành nghề checkbox, Tỉnh thành dropdown, mức lương slider/radio, hình thức làm việc).
    - Cột phải: Danh sách tin tuyển dụng, phân trang, trạng thái Empty State khi không có kết quả.
  - **Trang Chi tiết việc làm (`/jobs/[id]`):**
    - Nội dung JD chi tiết, thông tin công ty, nút "Ứng tuyển ngay" và "Lưu tin".
    - **Modal Nộp hồ sơ:** Cho phép chọn "Dùng CV mặc định" hoặc "Tải file CV mới" (kèm thư giới thiệu).
* **Tuần 3 (Kết quả AI Match Score & Lịch sử nộp đơn):**
  - **Widget AI CV Analysis:**
    - Hiển thị điểm số Match Score trực quan (vòng tròn tiến trình màu sắc: Xanh lá >= 80%, Xanh dương 60-79%, Đỏ < 60%).
    - Danh sách Badge kỹ năng đáp ứng (Xanh) và Kỹ năng còn thiếu (Cam/Đỏ).
    - Đoạn đánh giá tổng quan của AI.
  - **Trang Hồ sơ ứng viên (`/candidate/profile`):** Cập nhật thông tin, chọn tối đa 10 kỹ năng, upload CV cá nhân mặc định (kèm PDF Preview).
  - **Trang Lịch sử ứng tuyển (`/candidate/applications`):** Danh sách việc đã nộp kèm trạng thái (Đã nộp, Đang xem xét, Trúng tuyển, Từ chối), nút Rút đơn hồ sơ.

#### Checklist hoàn thành của Member 3:
- [ ] Giao diện responsive tốt trên màn hình máy tính và điện thoại di động (tối thiểu 360px).
- [ ] Bộ lọc việc làm hoạt động mượt mà, phản hồi dưới 1.5 giây.
- [ ] Modal ứng tuyển gửi dữ liệu kèm file PDF lên API thành công.
- [ ] Widget AI hiển thị kết quả phân tích trực quan, không bị "mùi AI", hiệu ứng Skeleton loading khi chờ kết quả.

---

### Member 4 — Frontend (Auth, Employer Portal & Realtime Chatbox)

* **Vai trò:** Phụ trách xác thực người dùng, Cổng quản lý tuyển dụng cho Doanh nghiệp (Employer Portal), Giao diện Admin và Chatbox Realtime qua WebSocket.
* **Thư mục làm việc chính:** `/frontend/src/app/(auth)/`, `/frontend/src/app/(employer)/`, `/frontend/src/app/(admin)/`, `/frontend/src/components/chat/`.

#### Công việc cụ thể theo tuần:
* **Tuần 1 (Auth UI & State Management):**
  - Dựng giao diện trang Đăng nhập (`/login`) và Đăng ký (`/register`):
    - Cho phép chọn vai trò rõ ràng: **Ứng viên** hoặc **Nhà tuyển dụng**.
    - Form validate trực quan bằng `react-hook-form` + `zod` (báo lỗi tiếng Việt).
  - Quản lý trạng thái xác thực (Auth Context / Zustand / LocalStorage):
    - Tự động gắn Token vào header Axios: `Authorization: Bearer <token>`.
    - Bảo vệ route (Middleware Protected Routes): Ứng viên không được vào trang Employer/Admin, Khách bấm nộp đơn tự chuyển về trang Login.
* **Tuần 2 (Employer Portal):**
  - **Trang Cập nhật thông tin công ty (`/employer/company`):** Logo, tên, website, địa chỉ, quy mô, giới thiệu.
  - **Trang Đăng tin tuyển dụng mới (`/employer/jobs/create`):**
    - Form đăng tin chuyên nghiệp: Tiêu đề, ngành nghề, cấp bậc, số lượng tuyển, mức lương (dropdown: khoảng cụ thể, từ X triệu, thỏa thuận), hạn chót nộp hồ sơ, mô tả JD.
  - **Trang Quản lý tin tuyển dụng (`/employer/jobs`):**
    - Bảng danh sách tin đã đăng, số lượng hồ sơ nộp, nút Đóng/Mở tin.
  - **Trang Quản lý ứng viên theo Job (`/employer/jobs/[id]/applicants`):**
    - Danh sách ứng viên nộp hồ sơ, xem điểm AI Match Score để lọc nhanh ứng viên tiềm năng.
    - Xem trực tiếp CV PDF (Modal PDF Viewer).
    - Nút cập nhật trạng thái hồ sơ (Chấp nhận, Từ chối).
* **Tuần 3 (Realtime Chatbox & Admin Dashboard):**
  - **Tích hợp WebSocket (Laravel Echo + Pusher-js):**
    - Kết nối tới Laravel Reverb (`ws://localhost:8080`).
    - Lắng nghe kênh riêng tư `private-chat.{conversationId}` sự kiện `MessageSent`.
  - **Giao diện Chatbox 1-1 Realtime (`/messages`):**
    - Cột trái: Danh sách cuộc hội thoại, hiển thị tin nhắn mới nhất và badge chưa đọc.
    - Cột phải: Cửa sổ chat, tin nhắn gửi/nhận tức thì không cần F5, hiển thị thời gian `HH:mm` và avatar hai bên.
  - **Trang Admin tinh gọn (`/admin`):**
    - Dashboard thống kê 4 thẻ số liệu tổng quan.
    - Bảng quản lý người dùng: Tìm kiếm, nút Khóa/Mở khóa tài khoản.
    - Bảng kiểm tra tin tuyển dụng bị báo cáo (Report).

#### Checklist hoàn thành của Member 4:
- [ ] Đăng ký / Đăng nhập hoạt động chuẩn, chuyển hướng đúng role sau khi đăng nhập.
- [ ] Nhà tuyển dụng tạo và quản lý tin tuyển dụng thành công.
- [ ] Cửa sổ chat nhận tin nhắn thời gian thực qua WebSocket dưới 1 giây.
- [ ] Giao diện Admin xem được thống kê và thao tác khóa tài khoản hoạt động chuẩn xác.

---

## 6. Quy chuẩn Phối hợp & Tiêu chuẩn API

### 6.1. Định dạng JSON Response thống nhất giữa BE và FE
Mọi API trả về bắt buộc tuân thủ đúng định dạng chuẩn:

* **Khi thành công (HTTP 200, 201):**
```json
{
  "success": true,
  "message": "Nộp hồ sơ ứng tuyển thành công!",
  "data": { ... },
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "total": 50
  }
}
```

* **Khi thất bại / Lỗi Validate (HTTP 400, 401, 403, 422, 500):**
```json
{
  "success": false,
  "message": "Dữ liệu nhập vào không hợp lệ",
  "errors": {
    "email": ["Email này đã được sử dụng"],
    "password": ["Mật khẩu phải chứa ít nhất 8 ký tự"]
  }
}
```

### 6.2. Quy tắc Họp nhanh (Daily Standup)
Mỗi tối lúc **21:30 - 22:00**, tất cả thành viên dành 10 phút nhắn tin vào nhóm:
1. **Hôm nay tôi đã làm được gì?** (Gửi kèm link PR hoặc ảnh chụp màn hình demo).
2. **Ngày mai tôi sẽ làm gì?**
3. **Có gặp lỗi hoặc vướng mắc nào cần nhóm hỗ trợ không?**

---

## 7. Xử lý Các Lỗi Thường Gặp (Troubleshooting)

### Lỗi 1: Bị chặn CORS khi gọi từ Frontend sang Backend
* **Triệu chứng:** Console trình duyệt báo đỏ: `Access to XMLHttpRequest blocked by CORS policy`.
* **Cách sửa:**
  1. Mở file `backend/config/cors.php`.
  2. Đảm bảo cấu hình:
     ```php
     'paths' => ['api/*', 'sanctum/csrf-cookie'],
     'allowed_origins' => ['http://localhost:3000'],
     'allowed_methods' => ['*'],
     'allowed_headers' => ['*'],
     'supports_credentials' => true,
     ```
  3. Chạy lệnh: `php artisan config:clear`.

### Lỗi 2: Không xem được ảnh hoặc file CV PDF (Lỗi 404 Not Found)
* **Triệu chứng:** Link ảnh hoặc CV trả về `http://localhost:8000/storage/...` nhưng báo 404.
* **Cách sửa:**
  1. Trong thư mục `backend`, chạy lệnh:
     ```bash
     php artisan storage:link
     ```
  2. Nếu bị lỗi link đã tồn tại, xóa thư mục `backend/public/storage` rồi chạy lại lệnh trên.

### Lỗi 3: Không kết nối được WebSocket Reverb
* **Triệu chứng:** Console báo lỗi `WebSocket connection to 'ws://localhost:8080/app/timviec_key' failed`.
* **Cách sửa:**
  1. Đảm bảo đã chạy lệnh khởi động server Reverb trên 1 terminal riêng ở backend:
     ```bash
     php artisan reverb:start --debug
     ```
  2. Kiểm tra port `8080` không bị ứng dụng khác chiếm dụng.
  3. Đảm bảo biến `REVERB_APP_KEY` ở backend `.env` trùng khớp với `NEXT_PUBLIC_REVERB_APP_KEY` ở frontend `.env.local`.

### Lỗi 4: Xung đột Port khi chạy server
* **Port 8000 bị chiếm:** Chạy backend với port khác: `php artisan serve --port=8001` (đồng thời sửa `NEXT_PUBLIC_API_URL` ở frontend).
* **Port 3000 bị chiếm:** Next.js sẽ tự động hỏi chuyển sang port `3001` hoặc chạy: `npm run dev -- -p 3001`.

### Lỗi 5: Composer chặn cài đặt Laravel (Security Advisories)
* **Triệu chứng:** Khi chạy `composer create-project` hoặc `composer install`, terminal báo:
  `Root composer.json requires laravel/framework ^11.0... because they are affected by security advisories ("PKSA-...")`.
* **Nguyên nhân:** Composer (phiên bản 2.8+) mặc định kích hoạt tính năng chặn cài đặt các package có cảnh báo bảo mật.
* **Cách sửa:**
  - Tắt chặn trên toàn máy:
    ```bash
    composer config --global policy.advisories.block false
    ```
  - Hoặc nếu thư mục `backend/` đã tạo dở dang:
    ```bash
    cd backend
    composer config policy.advisories.block false
    composer update
    ```

### Lỗi 6: Lỗi SQLite khi chạy `php artisan install:api`
* **Triệu chứng:** Terminal báo đỏ: `Database file at path [...database.sqlite] does not exist. (Connection: sqlite...)`.
* **Nguyên nhân:** Laravel 11 mặc định đặt `DB_CONNECTION=sqlite` trong file `.env`. Khi chạy `install:api`, Laravel cố gắng migrate bảng vào SQLite nhưng file chưa tồn tại.
* **Cách sửa:**
  1. Mở file `backend/.env`.
  2. Đổi kết nối sang MySQL:
     ```ini
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=tim_viec_online
     DB_USERNAME=root
     DB_PASSWORD=
     ```
  3. Đảm bảo MySQL trong Laragon/XAMPP đang bật, sau đó chạy lại:
     ```bash
     php artisan migrate
     ```

### Lỗi 7: NPM báo `high severity vulnerabilities` ở Frontend
* **Triệu chứng:** Khi chạy `npm install`, terminal thông báo:
  `5 high severity vulnerabilities. To address all issues (including breaking changes), run: npm audit fix --force`.
* **Nguyên nhân:** Gói `braces` phụ thuộc sâu trong plugin kiểm tra cú pháp ESLint của Next.js có cảnh báo bảo mật. Đây là công cụ dev, không ảnh hưởng đến mã nguồn ứng dụng hay người dùng cuối.
* **CẢNH BÁO QUAN TRỌNG:**
  ⚠️ **TUYỆT ĐỐI KHÔNG CHẠY `npm audit fix --force`**! Lệnh này sẽ tự động hạ cấp `eslint-config-next` về phiên bản cũ và gây lỗi phá vỡ dự án (Breaking changes).
* **Cách sửa chuẩn:**
  1. Mở file `frontend/package.json`.
  2. Thêm thuộc tính `overrides` để ép NPM dùng bản vá an toàn:
     ```json
     "overrides": {
       "braces": "^3.0.3"
     }
     ```
### Lỗi 8: Unknown collation 'utf8mb4_0900_ai_ci' trên MariaDB / XAMPP
* **Triệu chứng:** Khi chạy `php artisan install:api` hoặc `php artisan migrate`, terminal báo lỗi:
  `SQLSTATE[HY000]: General error: 1273 Unknown collation: 'utf8mb4_0900_ai_ci'`.
* **Nguyên nhân:** Laravel 11 mặc định sử dụng bộ mã hóa collation `utf8mb4_0900_ai_ci` của MySQL 8.0+. Trong khi đó, phần mềm XAMPP chạy cơ sở dữ liệu **MariaDB** (thường là bản 10.4.x) chưa hỗ trợ collation này.
* **Cách sửa:**
  1. Mở file `backend/.env`, thêm dòng cấu hình:
     ```ini
     DB_COLLATION=utf8mb4_unicode_ci
     ```
  2. Trong file `backend/config/database.php`, đảm bảo collation mặc định của mysql là `utf8mb4_unicode_ci`:
     ```php
     'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
     ```
  3. Chạy lại lệnh bình thường:
     ```bash
     php artisan migrate
     ```

---
*Chúc cả nhóm phối hợp hiệu quả và hoàn thành xuất sắc đồ án!*
