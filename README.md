# KẾ HOẠCH DỰ ÁN CUỐI KỲ: WEB TÌM VIỆC LÀM ONLINE

> **Trạng thái implementation (2026-10):** README này giữ lại yêu cầu/phân công dự án, không phải báo cáo tính năng đã hoàn thành. Backend có các API theo [API Checklist](API_CHECKLIST.md), nhưng frontend hiện vẫn là trang Next.js starter và chưa có màn hình FR-01–FR-10. Vì vậy toàn sản phẩm chưa phải website tuyển dụng hoàn chỉnh. Dùng [FR Implementation Audit](docs/FR_IMPLEMENTATION_AUDIT.md), [Backend Guide](BACKEND_GUIDE.md) và [Backend Testing Guide](BACKEND_TESTING_GUIDE.md) làm nguồn trạng thái hiện hành.

## 1. Công nghệ & Kiến trúc hệ thống

* **Kiến trúc Repository:** **Monorepo** (Backend và Frontend nằm chung trong cùng 1 Git repository):
  * `backend/`: Mã nguồn Laravel 11 RESTful API.
  * `frontend/`: Mã nguồn Next.js 14+ (App Router), TypeScript, Tailwind CSS.
* **Backend:** **Laravel** (RESTful API, Laravel Sanctum, Eloquent ORM, Laravel Queue, Laravel Storage).
* **AI Engine:** Google Gemini API qua `GEMINI_MODEL` (mặc định cấu hình hiện tại `gemini-3.8-flash`); phân tích được đưa vào queue. Cần cấu hình API key và worker để chạy thật.
* **Realtime Communication:** **Laravel Reverb** (hoặc **Pusher**) kết hợp **Laravel Echo** (Nhắn tin thời gian thực giữa Nhà tuyển dụng & Ứng viên).
* **Database:** **MySQL** (Quản lý qua giao diện **phpMyAdmin** / Laragon / XAMPP).
  * *Quy trình chuẩn:* Dùng **Laravel Migration & Seeder** để đồng bộ code trong nhóm; cuối dự án export file `database/database_dump.sql` qua phpMyAdmin để nộp cho Giảng viên.
* **Frontend:** **Next.js** (TypeScript, Tailwind CSS, Axios, Laravel Echo, Pusher-js).

### 1.1. Cấu trúc thư mục Monorepo
```text
tim-viec-online/
├── backend/                  # Laravel API
│   ├── app/                  # Controllers, Models, Services (GeminiService)
│   ├── database/             # Migrations, Seeders
│   ├── routes/api.php        # Danh sách API endpoints
│   ├── .env.example
│   └── composer.json
├── frontend/                 # Next.js Application
│   ├── src/app/              # App Router (Pages, Layouts)
│   ├── src/components/       # Reusable UI Components
│   ├── src/services/         # API Client (Axios)
│   ├── .env.example
│   └── package.json
├── README.md
└── docs/
    └── SRS.md
```

### 1.2. Hướng dẫn cài đặt & Khởi chạy nhanh (Quick Start)
1. **Cấu hình Backend (`/backend`):**
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   # Cấu hình DB_DATABASE, GEMINI_API_KEY, REVERB/PUSHER trong file .env
   php artisan migrate --seed
   php artisan storage:link
   php artisan serve --port=8000
   ```
2. **Cấu hình Frontend (`/frontend`):**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Cấu hình NEXT_PUBLIC_API_URL=http://localhost:8000/api
   npm run dev
   ```

---

## 2. Phân vai người dùng & Ma trận chức năng chi tiết

### 2.1. Khách vãng lai (Guest — Chưa đăng nhập)
* [ ] **Trang chủ:** Xem banner giới thiệu, danh mục ngành nghề nổi bật, việc làm mới nhất, danh sách các công ty tuyển dụng hàng đầu.
* [ ] **Tìm kiếm việc làm:** Tìm kiếm theo từ khóa (tiêu đề, tên công ty, kỹ năng).
* [ ] **Bộ lọc việc làm:** Lọc theo ngành nghề (Category), địa điểm (City), mức lương (Salary), hình thức làm việc (Full-time, Part-time, Remote).
* [ ] **Chi tiết việc làm:** Xem mô tả công việc, yêu cầu, quyền lợi, địa điểm làm việc, hạn nộp hồ sơ, thông tin công ty.
* [ ] **Đăng ký tài khoản:** Chọn loại tài khoản muốn tạo: **Ứng viên** (`candidate`) hoặc **Nhà tuyển dụng** (`employer`).
* [ ] **Đăng nhập:** Đăng nhập vào hệ thống (tự động điều hướng theo Role).
* [ ] **Quên mật khẩu:** Gửi yêu cầu qua email để nhận liên kết đặt lại mật khẩu với token an toàn (hết hạn sau 15 phút).
* *Lưu ý:* Khi bấm "Nộp đơn ứng tuyển" hoặc "Lưu việc làm", hệ thống sẽ nhắc đăng nhập tài khoản Ứng viên.

---

### 2.2. Ứng viên (Candidate / Job Seeker)
Bao gồm tất cả quyền của Khách, kèm theo:
* **Hồ sơ & CV:**
  * [ ] Cập nhật hồ sơ cá nhân: Họ tên, số điện thoại, avatar, chức danh hiện tại, địa chỉ, số năm kinh nghiệm, giới thiệu bản thân.
  * [ ] Quản lý kỹ năng cá nhân (chọn từ danh mục kỹ năng).
  * [ ] Tải lên (Upload) file CV cá nhân định dạng PDF.
* **Tương tác việc làm:**
  * [ ] **Lưu việc làm:** Lưu lại các công việc quan tâm và xem lại trong trang "Việc làm đã lưu".
  * [ ] **Nộp hồ sơ ứng tuyển (Apply):** Chọn CV đã có hoặc upload file CV mới, viết thư giới thiệu (Cover Letter) để ứng tuyển vào công việc.
  * [ ] **Hủy ứng tuyển (Rút hồ sơ):** Chỉ rút hồ sơ `applied` chưa được nhà tuyển dụng xem. Mỗi ứng viên chỉ nộp một lần cho một tin, kể cả sau khi rút.
  * [ ] **Lịch sử ứng tuyển:** Backend hiện dùng `applied`, `waiting`, `accepted`, `rejected`, `withdrawn`; cần hoàn thiện UI để xem và theo dõi.
* **Tính năng AI phân tích:**
  * [ ] **AI CV Match Score:** Xem điểm số đánh giá mức độ phù hợp giữa CV của mình và công việc (thang điểm 0 - 100%).
  * [ ] **Gợi ý từ AI:** Xem danh sách kỹ năng còn thiếu và các khuyến nghị của AI để cải thiện hồ sơ phù hợp hơn với vị trí ứng tuyển.
* **Nhắn tin Realtime (Chat):**
  * [ ] Khung chat trực tiếp 1-1 với Nhà tuyển dụng của các công việc mình đã ứng tuyển để trao đổi thêm thông tin (vẫn duy trì trao đổi ngay cả khi tin đã đóng).
  * [ ] Nhận tin nhắn tức thì từ Nhà tuyển dụng mà không cần tải lại trang.
* **Thông báo (Notifications):**
  * [ ] Nhận thông báo in-app khi Nhà tuyển dụng xem CV, cập nhật trạng thái mời phỏng vấn hoặc có tin nhắn mới.

---

### 2.3. Nhà tuyển dụng (Employer)
* **Hồ sơ doanh nghiệp:**
  * [ ] Khởi tạo & cập nhật thông tin công ty: Tên công ty, Logo, Website, Quy mô nhân sự, Địa chỉ trụ sở, Giới thiệu công ty.
* **Quản lý tin tuyển dụng:**
  * [ ] **Đăng tin tuyển dụng mới:** Nhập tiêu đề, ngành nghề, kỹ năng yêu cầu, mức lương min/max, địa điểm làm việc chi tiết, cấp bậc, số lượng tuyển, hình thức làm việc, hạn nộp hồ sơ, mô tả chi tiết, yêu cầu và quyền lợi.
  * [ ] **Chỉnh sửa tin:** Cập nhật thông tin các tin tuyển dụng đã đăng.
  * [ ] **Đóng / Mở tin:** Thay đổi trạng thái tin tuyển dụng (kết thúc đợt tuyển dụng hoặc đăng lại).
  * [ ] **Quy tắc khi tin Đóng / Hết hạn:** Hệ thống ngừng nhận hồ sơ mới, nhưng **bảo lưu toàn bộ hồ sơ cũ** để Nhà tuyển dụng tiếp tục quy trình duyệt, mời phỏng vấn; các cuộc trò chuyện chat liên quan vẫn hoạt động bình thường.
  * [ ] **Danh sách tin đã đăng:** Xem toàn bộ danh sách các tin mình đã đăng kèm số lượng hồ sơ nộp vào từng tin.
* **Quản lý ứng viên & Đánh giá:**
  * [ ] Xem danh sách ứng viên nộp hồ sơ cho từng công việc.
  * [ ] Xem trước trực tiếp hoặc tải file CV (PDF) của ứng viên về máy.
  * [ ] **Bộ lọc ứng viên theo AI Score:** Xem điểm đánh giá phù hợp do AI tự động chấm để nhanh chóng lọc ra ứng viên tiềm năng.
  * [ ] **Cập nhật trạng thái ứng viên:** Đổi trạng thái xử lý (*Đã xem ➔ Mời phỏng vấn ➔ Chấp nhận / Từ chối*) để ứng viên theo dõi.
* **Nhắn tin Realtime (Chat):**
  * [ ] Chủ động mở cuộc trò chuyện 1-1 với ứng viên đã nộp hồ sơ để hẹn lịch phỏng vấn hoặc phỏng vấn nhanh.
  * [ ] Nhận tin nhắn phản hồi trực tiếp từ ứng viên theo thời gian thực.
* **Thông báo (Notifications):**
  * [ ] Nhận thông báo in-app khi có ứng viên mới nộp hồ sơ, ứng viên rút hồ sơ, hoặc gửi tin nhắn mới.

---

### 2.4. Quản trị viên (Admin)
* **Bảng điều khiển (Dashboard & Thống kê):**
  * [ ] Thống kê số lượng: Tổng người dùng (Ứng viên, Doanh nghiệp), tổng tin tuyển dụng, tổng lượt nộp đơn ứng tuyển.
  * [ ] Biểu đồ thống kê xu hướng tuyển dụng cơ bản.
* **Quản lý người dùng (User Management):**
  * [ ] Xem danh sách toàn bộ tài khoản người dùng và doanh nghiệp.
  * [ ] Khóa (Lock/Ban) hoặc Mở khóa tài khoản khi phát hiện tài khoản có hành vi gian lận hoặc vi phạm quy định.
* **Kiểm duyệt tin tuyển dụng (Job Moderation):**
  * [ ] Backend hiện hỗ trợ danh sách tin bị report và xử lý report, không có trạng thái `pending approval`. Tin tạo mới chuyển `active` theo FR-04.5; quy trình duyệt trước khi đăng cần thống nhất riêng trong SRS nếu muốn bổ sung.
* **Quản lý danh mục hệ thống (Master Data Management):**
  * [ ] Thêm / Sửa / Xóa danh mục ngành nghề (Categories: CNTT, Kinh doanh, Marketing...).
  * [ ] Thêm / Sửa / Xóa danh mục kỹ năng (Skills: PHP, Next.js, Figma, English...).

---

## 3. Thiết kế Cơ sở dữ liệu

Hệ thống gồm các bảng chính:
1. `users`: `id`, `name`, `email`, `password`, `phone`, `role` (*candidate | employer | admin*), `status` (*active | locked*), `created_at`...
2. `password_reset_tokens`: `email`, `token`, `created_at`.
3. `candidate_profiles`: `id`, `user_id`, `title`, `avatar`, `bio`, `city`, `experience_years`, `cv_file_path`.
4. `companies`: `id`, `user_id`, `name`, `logo`, `website`, `address`, `city`, `description`, `size`.
5. `categories`: `id`, `name`, `slug`, `icon`. (CNTT, Marketing, Kế toán...)
6. `skills`: `id`, `name`. (PHP, React, UI/UX...)
7. `candidate_skills`: `candidate_id`, `skill_id`. *(Bảng trung gian N-N giữa ứng viên và kỹ năng — FR-03.2: tối đa 20 kỹ năng/ứng viên)*
8. `jobs`: `id`, `company_id`, `category_id`, `title`, `description`, `requirements`, `benefits`, `salary_min`, `salary_max`, `experience_level`, `quantity`, `job_type`, `city`, `work_location`, `deadline`, `status` (*pending, active, closed*), `created_at`.
9. `job_skills`: `job_id`, `skill_id`.
10. `applications`: `id`, `job_id`, `candidate_id`, `cv_path`, `cover_letter`, `status` (*pending | reviewed | interviewing | rejected | accepted | withdrawn*), `applied_at`.
11. `saved_jobs`: `id`, `candidate_id`, `job_id`, `created_at`.
12. `ai_cv_analyses`: `id`, `application_id`, `match_score` (0-100%), `strengths` (JSON/Text), `missing_skills` (JSON/Text), `suggestions` (Text), `created_at`.
13. `conversations`: `id`, `job_id`, `candidate_id`, `employer_id`, `created_at`, `updated_at`.
14. `messages`: `id`, `conversation_id`, `sender_id`, `message`, `is_read`, `created_at`.
15. `notifications`: `id`, `user_id`, `type`, `title`, `message`, `data` (JSON), `is_read`, `created_at`.

---

## 4. Phân công công việc

### Member 1 — Auth, System & AI CV Analysis
* **Tuần 1:** Setup Laravel API, cấu hình CORS, kết nối MySQL/phpMyAdmin, thiết kế Database Base Migrations + Seeders, viết Authentication API (Sanctum: Register, Login, Logout, Profile cho các role).
* **Tuần 2:** API Candidate Profile, Company Profile, Upload file (Avatar, CV PDF). Tích hợp **Google Gemini API**: Viết Service đọc text từ CV, so sánh với Job Description, trả về JSON điểm số phù hợp + kỹ năng còn thiếu.
* **Tuần 3:** API Admin (Duyệt tin, thống kê), tối ưu bảo mật, export file `database_dump.sql` hoàn chỉnh qua phpMyAdmin.

### Member 2 — Job Core, Application & Realtime Chat
* **Tuần 1:** Database Migrations cho `categories`, `skills`, `jobs`, `job_skills`. Viết CRUD Category & Skill API. Chuẩn bị seed dữ liệu mẫu (10+ công ty, 20+ job).
* **Tuần 2:** API Job Core (Đăng tin, sửa tin, đóng tin). API Tìm kiếm & Lọc Job (theo keyword, category, city, salary). API Nộp đơn ứng tuyển (`POST /jobs/{id}/apply`).
* **Tuần 3:** Setup **Laravel Reverb / Pusher**; viết API tạo cuộc trò chuyện & gửi tin nhắn (`POST /messages`), phát Broadcast Event `MessageSent` realtime.

### Member 3 — Candidate UI, Job Flow & AI Results
* **Tuần 1:** Khởi tạo Next.js (TypeScript, Tailwind CSS), cài Axios, xây dựng Base Layout (Header, Navigation, Footer, Responsive).
* **Tuần 2:** Trang chủ (Hero banner, danh mục, việc làm mới nhất). Trang Tìm kiếm & Bộ lọc việc làm (Filter theo ngành nghề, địa điểm, mức lương). Trang Chi tiết việc làm + Modal Nộp CV.
* **Tuần 3:** Widget hiển thị **Kết quả AI phân tích CV** (Vòng tròn Match Score %, danh sách kỹ năng cần bổ sung, gợi ý cải thiện). Trang Hồ sơ ứng viên & Lịch sử nộp đơn.

### Member 4 — Auth, Employer Portal & Realtime Chatbox
* **Tuần 1:** Trang Đăng nhập, Đăng ký (chọn role Candidate / Employer), Form validation, lưu Token (Auth Context / State), phân quyền Protected Route.
* **Tuần 2:** Giao diện cho Nhà tuyển dụng (Employer Portal): Trang cập nhật công ty, Trang đăng tin tuyển dụng mới, Trang danh sách tin đã đăng.
* **Tuần 3:** Tích hợp `laravel-echo` + `pusher-js`: Xây dựng **Giao diện Chatbox Realtime** (trao đổi 1-1 giữa Nhà tuyển dụng & Ứng viên). Giao diện Employer xem danh sách ứng viên (kèm điểm số AI) và Giao diện Admin tinh gọn.

---

## 5. Lộ trình chi tiết 3 tuần

### Tuần 1: Khởi động, Database & Xác thực
- [ ] **Day 1:** Họp nhóm, chốt các bảng DB, tạo Git repo (`develop`, `feature/*`), phân công rõ ràng.
- [ ] **Day 2:** BE tạo Laravel project, viết migrations kết nối MySQL, kiểm tra hiển thị trên phpMyAdmin. FE khởi tạo Next.js + Tailwind.
- [ ] **Day 3:** BE viết API Register / Login bằng Sanctum (phân biệt role: Candidate, Employer). FE dựng khung Header, Footer, Hero banner.
- [ ] **Day 4:** FE làm trang Đăng nhập / Đăng ký, nối API Auth thành công, lưu token vào LocalStorage/Cookies.
- [ ] **Day 5:** BE viết API Category & Skill + Seeder dữ liệu mẫu. FE làm menu chuyển trang cho Candidate & Employer.
- [ ] **Day 6 - 7:** Merge code tuần 1, kiểm tra kết nối FE gọi BE mượt mà, chốt tag `v0.1-week1`.

### Tuần 2: Việc làm, Nộp hồ sơ & Tích hợp AI
- [ ] **Day 8 - 9:** BE hoàn thành API Đăng bài/Sửa bài tuyển dụng. FE Member 4 làm trang Quản lý tin & Form đăng tin cho Employer.
- [ ] **Day 10 - 11:** BE hoàn thành API Tìm kiếm & Lọc (Search & Filter theo keyword, city, category). FE Member 3 làm trang Tìm việc có thanh search + bộ lọc bên trái.
- [ ] **Day 12 - 13:** 
  - BE xử lý API Upload CV (PDF) & Nộp đơn (`/jobs/{id}/apply`).
  - BE Member 1 tạo Service kết nối **Google Gemini API** để chấm điểm CV so với Job.
  - FE Member 3 làm Modal ứng tuyển & tải file CV.
- [ ] **Day 14:** Test luồng nộp CV và hiển thị kết quả AI chấm điểm. Chốt tag `v0.2-week2`.

### Tuần 3: Chat Realtime, Quản lý ứng viên & Hoàn thiện
- [ ] **Day 15 - 16:** 
  - BE Member 2 cấu hình WebSocket (Reverb / Pusher) + API gửi tin nhắn.
  - FE Member 4 làm giao diện khung Chatbox realtime (gửi nhận tin tức thì không cần reload).
  - Employer Dashboard: Xem danh sách ứng viên nộp cho từng tin tuyển dụng, xem điểm số AI, tải file CV, nút đổi trạng thái hồ sơ.
- [ ] **Day 17:** Làm trang Admin tinh gọn: Xem danh sách tin tuyển dụng, nút Duyệt tin (Approve / Reject), xem danh sách tài khoản.
- [ ] **Day 18:** Test toàn bộ hệ thống từ đầu đến cuối (Happy path + Edge cases). Sửa triệt để các lỗi giao diện, lỗi CORS, validate form.
- [ ] **Day 19:** Seed dữ liệu mẫu chất lượng cao: Tên công ty thực tế, logo rõ nét, mô tả công việc đầy đủ (khoảng 15-20 jobs, 5 companies, kèm mẫu CV demo đẹp).
- [ ] **Day 20:** Dùng phpMyAdmin xuất file `database/database_dump.sql`, kiểm tra import lại hoạt động bình thường.
- [ ] **Day 21:** Đóng gói source code, viết hướng dẫn cài đặt, chuẩn bị slide trình chiếu và kịch bản demo bảo vệ.

---

## 6. Danh sách RESTful API cốt lõi

### 6.1. Authentication & Profile
```text
POST /api/register                  # Đăng ký tài khoản (name, email, password, role)
POST /api/login                     # Đăng nhập -> trả về token & user info
POST /api/logout                    # Đăng xuất (xóa token)
POST /api/forgot-password           # Yêu cầu gửi email đặt lại mật khẩu
POST /api/reset-password            # Đặt lại mật khẩu mới (kèm token xác thực)
PUT  /api/user/change-password      # [Auth] Đổi mật khẩu khi đang đăng nhập (current_password, new_password)
GET  /api/user                      # Lấy thông tin tài khoản hiện tại
PUT  /api/candidate/profile         # Cập nhật hồ sơ ứng viên (multipart/form-data: avatar, bio, skills, cv)
GET  /api/employer/company          # [Employer] Lấy thông tin công ty của mình
PUT  /api/employer/company          # [Employer] Cập nhật thông tin công ty (logo, website, địa chỉ...)
```

### 6.2. Companies (Công khai)
```text
GET  /api/companies                 # Danh sách các công ty nổi bật (hiển thị trang chủ / danh bạ)
GET  /api/companies/{id}            # Chi tiết công ty & danh sách các việc làm đang tuyển
```

### 6.3. Jobs, Categories & Saved Jobs
```text
GET    /api/categories              # Danh sách ngành nghề (Public)
GET    /api/skills                  # Danh sách kỹ năng (Public)
GET    /api/jobs                    # Tìm kiếm & Lọc jobs (?keyword=&category_id=&city=&salary=&experience=)
GET    /api/jobs/{id}               # Chi tiết việc làm
POST   /api/employer/jobs           # [Employer] Đăng tin mới
PUT    /api/employer/jobs/{id}      # [Employer] Cập nhật tin tuyển dụng
PATCH  /api/employer/jobs/{id}/status # [Employer] Đóng hoặc Mở lại tin tuyển dụng (active / closed)
DELETE /api/employer/jobs/{id}      # [Employer] Xóa tin tuyển dụng
GET    /api/employer/my-jobs        # [Employer] Danh sách các tin mình đã đăng
POST   /api/jobs/{id}/save          # [Candidate] Lưu việc làm yêu thích
DELETE /api/jobs/{id}/save          # [Candidate] Bỏ lưu việc làm
GET    /api/candidate/saved-jobs    # [Candidate] Xem danh sách việc làm đã lưu
```

### 6.4. Applications & AI Analysis
```text
POST   /api/jobs/{id}/apply                    # [Candidate] Nộp hồ sơ (kèm file CV PDF & cover letter)
DELETE /api/candidate/applications/{id}/withdraw # [Candidate] Rút hồ sơ ứng tuyển (chỉ khi pending)
GET    /api/candidate/applications             # [Candidate] Xem danh sách việc mình đã ứng tuyển
GET    /api/employer/jobs/{id}/applications    # [Employer] Xem danh sách ứng viên nộp vào job
GET    /api/employer/applications/{id}         # [Employer] Chi tiết đơn ứng tuyển (trigger tự động sang reviewed)
PATCH  /api/employer/applications/{id}/status  # [Employer] Cập nhật trạng thái (interviewing, rejected, accepted)
POST   /api/applications/{id}/ai-analyze       # [AI] Phân tích CV qua Gemini API (trả về match_score & gợi ý)
```

### 6.5. Realtime Chat & Notifications
```text
GET   /api/conversations                # Lấy danh sách các cuộc hội thoại của user
POST  /api/conversations                # Khởi tạo cuộc hội thoại mới giữa Employer & Candidate
GET   /api/conversations/{id}/messages   # Lấy lịch sử tin nhắn của cuộc trò chuyện
POST  /api/conversations/{id}/messages   # Gửi tin nhắn mới (phát sự kiện Broadcast qua WebSocket)
GET   /api/notifications                # Lấy danh sách thông báo in-app
PATCH /api/notifications/{id}/read       # Đánh dấu 1 thông báo đã đọc
PATCH /api/notifications/read-all       # Đánh dấu tất cả thông báo đã đọc
```

### 6.6. Admin
```text
GET    /api/admin/stats                 # Thống kê tổng quan (số user, jobs, applications)
GET    /api/admin/users                 # Quản lý danh sách người dùng & doanh nghiệp
PATCH  /api/admin/users/{id}/status     # Khóa hoặc Mở khóa tài khoản người dùng (active / locked)
GET    /api/admin/jobs                  # Danh sách toàn bộ jobs chờ duyệt
PATCH  /api/admin/jobs/{id}/status      # Phê duyệt hoặc từ chối tin tuyển dụng (approve / reject)
POST   /api/admin/categories            # [Admin] Thêm danh mục ngành nghề mới
PUT    /api/admin/categories/{id}       # [Admin] Cập nhật danh mục ngành nghề
DELETE /api/admin/categories/{id}       # [Admin] Xóa danh mục ngành nghề
POST   /api/admin/skills                # [Admin] Thêm kỹ năng mới
PUT    /api/admin/skills/{id}           # [Admin] Cập nhật kỹ năng
DELETE /api/admin/skills/{id}           # [Admin] Xóa kỹ năng
```

---

## 7. Quy tắc làm việc nhóm

1. **Về Git:** Không bao giờ push code trực tiếp vào branch `main`. Mỗi tính năng tạo branch từ `develop` (ví dụ `feature/auth-fe`, `feature/job-be`, `feature/chat`), test chạy được trên máy mình rồi mới tạo Pull Request.
2. **Về Database & phpMyAdmin:** Không tự ý sửa bảng trực tiếp trên phpMyAdmin mà không báo nhóm. Mọi thay đổi DB phải viết qua file Laravel Migration. Trước khi nộp bài cho thầy, xuất file `.sql` từ phpMyAdmin.
3. **Về API:** Backend và Frontend phải thống nhất format JSON trả về trước khi code (Status code, message, data).
4. **Họp nhanh:** Mỗi tối dành 10 - 15 phút nhắn tin nhóm báo cáo:
   * Hôm nay đã làm xong việc gì?
   * Ngày mai sẽ làm việc gì?
   * Có vướng mắc hay lỗi gì cần hỗ trợ không?
