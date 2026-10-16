# CẨM NANG HƯỚNG DẪN KIỂM THỬ BACKEND TỪ A ĐẾN Z
> **Dự án:** Sàn Tìm Kiếm Việc Làm Online (TimViecOnline)  
> **Backend Framework:** Laravel 11 RESTful API | **Database:** MySQL  
> **Tài liệu đối chiếu:** [docs/srs.md](./docs/srs.md) | [BACKEND_GUIDE.md](./BACKEND_GUIDE.md) | [db/tim_viec_online.sql](./db/tim_viec_online.sql)

---

## MỤC LỤC
1. [Chuẩn bị môi trường & Khởi chạy hệ thống](#1-chuẩn-bị-môi-trường--khởi-chạy-hệ-thống)
2. [Danh sách tài khoản kiểm thử có sẵn (Seed Data)](#2-danh-sách-tài-khoản-kiểm-thử-có-sẵn-seed-data)
3. [Cách 1: Chạy bộ kiểm thử tự động 1 lệnh (Automated Test Suite)](#3-cách-1-chạy-bộ-kiểm-thử-tự-động-1-lệnh-automated-test-suite)
4. [Cách 2: Hướng dẫn kiểm thử thủ công qua Postman / Thunder Client / cURL](#4-cách-2-hướng-dẫn-kiểm-thử-thủ-công-qua-postman--thunder-client--curl)
   * [4.1. Module Xác thực & Tài khoản (Auth & Sanctum)](#41-module-xác-thực--tài-khoản-auth--sanctum)
   * [4.2. Module Dữ liệu Danh mục (Categories & Skills)](#42-module-dữ-liệu-danh-mục-categories--skills)
   * [4.3. Module Hồ sơ Người dùng (Candidate & Company Profile)](#43-module-hồ-sơ-người-dùng-candidate--company-profile)
   * [4.4. Module Việc làm & Tìm kiếm, Bộ lọc (Jobs Core)](#44-module-việc-làm--tìm-kiếm-bộ-lọc-jobs-core)
   * [4.5. Module Ứng tuyển & Tích hợp Gemini AI (Applications & AI Score)](#45-module-ứng-tuyển--tích-hợp-gemini-ai-applications--ai-score)
   * [4.6. Module Nhắn tin Realtime & Thông báo In-App (Chat & Notifications)](#46-module-nhắn-tin-realtime--thông-báo-in-app-chat--notifications)
   * [4.7. Module Quản trị viên (Admin Dashboard & Moderation)](#47-module-quản-trị-viên-admin-dashboard--moderation)
5. [Bảng đối chiếu mã trạng thái HTTP & Thông báo lỗi chuẩn SRS](#5-bảng-đối-chiếu-mã-trạng-thái-http--thông-báo-lỗi-chuẩn-srs)
6. [Xử lý sự cố thường gặp (Troubleshooting)](#6-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Chuẩn bị môi trường & Khởi chạy hệ thống

### 1.1. Kiểm tra cấu hình file `backend/.env`
Mở file `backend/.env` và đảm bảo các thông số cấu hình chính xác:
```ini
APP_NAME=TimViecOnline
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Kết nối MySQL (Bật XAMPP MySQL)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tim-viec-online
DB_USERNAME=root
DB_PASSWORD=

# Lưu trữ file công khai (Avatar, Logo, CV PDF)
FILESYSTEM_DISK=public

# WebSocket Laravel Reverb (Realtime Chat)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=timviec_app
REVERB_APP_KEY=timviec_key
REVERB_APP_SECRET=timviec_secret
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http

# Google Gemini AI Key
GEMINI_API_KEY=dien_api_key_cua_ban_vao_day
```

### 1.2. Tạo symbolic link cho thư mục lưu trữ file
Chạy lệnh này (chỉ cần chạy 1 lần) để cho phép trình duyệt truy cập các file upload tại `http://localhost:8000/storage/...`:
```bash
cd backend
php artisan storage:link
```

### 1.3. Khởi chạy máy chủ Backend API
Mở cửa sổ Terminal thứ nhất:
```bash
cd backend
php artisan serve --port=8000
```
> API Base URL: `http://localhost:8000/api`

### 1.4. Khởi chạy máy chủ WebSocket Reverb (Phục vụ Realtime Chat)
Mở cửa sổ Terminal thứ hai:
```bash
cd backend
php artisan reverb:start
```

---

## 2. Danh sách tài khoản kiểm thử có sẵn (Seed Data)

Dữ liệu mẫu ban đầu đã có sẵn 3 tài khoản tương ứng với 3 vai trò (Role):

| Vai trò | Email đăng nhập | Mật khẩu mặc định | Hồ sơ liên kết sẵn |
|---|---|---|---|
| **Quản trị viên (Admin)** | `admin@timviec.vn` | `Password123@` | Quản trị viên hệ thống |
| **Nhà tuyển dụng (Employer)** | `employer@timviec.vn` | `Password123@` | Công ty: **FPT Software** |
| **Ứng viên (Candidate)** | `candidate@timviec.vn` | `Password123@` | Hồ sơ: **Lập Trình Viên Fullstack**, 5 kỹ năng |

---

## 3. Cách 1: Chạy bộ kiểm thử tự động 1 lệnh (Automated Test Suite)

Trong thư mục `backend/` đã tích hợp sẵn kịch bản kiểm thử tự động toàn diện `test_all_backend.php`.  
Kịch bản này tự động thực thi **26 bài test liên hoàn** từ Module 1 đến Module 7 mà không làm ảnh hưởng hay rác dữ liệu thực tế.

### Lệnh thực thi:
```bash
cd backend
php test_all_backend.php
```

### Kết quả kỳ vọng:
```text
=======================================================
    BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG HỆ THỐNG BACKEND API
=======================================================

1. KIỂM THỬ MODULE XÁC THỰC (AUTH & SANCTUM):
  [PASS] 1.1 Đăng ký tài khoản Ứng viên (201 Created)
  [PASS] 1.2 Tự động tạo CandidateProfile rỗng (FR-01.6)
  [PASS] 1.3 Đăng ký trùng email trả lỗi 422 'Email đã được sử dụng'
  [PASS] 1.4 Đăng nhập sai mật khẩu trả 401
  [PASS] 1.5 Đăng nhập thành công trả 200 kèm Bearer Token
  [PASS] 1.6 Gọi API Protected /api/user trả 200 kèm Profile

2. KIỂM THỬ MASTER DATA (NGÀNH NGHỀ & KỸ NĂNG):
  [PASS] 2.1 Lấy danh sách Ngành nghề công khai (/api/categories)
  [PASS] 2.2 Tìm kiếm kỹ năng autocomplete (/api/skills?keyword=PHP)

3. KIỂM THỬ HỒ SƠ CÁ NHÂN & TẢI LÊN CV PDF:
  [PASS] 3.1 Upload CV sai định dạng trả 400 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB'
  [PASS] 3.2 Upload CV PDF hợp lệ & cập nhật kỹ năng trả 200
  [PASS] 3.3 Nhà tuyển dụng cập nhật hồ sơ công ty (/api/employer/company)

4. KIỂM THỬ CORE VIỆC LÀM (JOBS CRUD & BỘ LỌC):
  [PASS] 4.1 Hạn nộp hồ sơ ở quá khứ trả 400 'Hạn nộp hồ sơ phải sau ngày hôm nay'
  [PASS] 4.2 Đăng tin tuyển dụng hợp lệ trả 201 Created
  [PASS] 4.3 Tìm kiếm từ khóa và lọc khoảng mức lương (/api/jobs)
  [PASS] 4.4 Ứng viên lưu việc làm yêu thích (/api/jobs/{id}/save)

5. KIỂM THỬ ỨNG TUYỂN & TÍCH HỢP GEMINI AI:
  [PASS] 5.1 Nộp hồ sơ ứng tuyển thành công (201 Created)
  [PASS] 5.2 Tích hợp AI Gemini phân tích Match Score (0-100%)
  [PASS] 5.3 Chặn nộp hồ sơ lần 2 trả mã 409 Conflict
  [PASS] 5.4 NTD mở xem CV: tự động chuyển sang trạng thái 'waiting' (FR-06.5)
  [PASS] 5.5 Chặn rút hồ sơ khi NTD đã xem trả lỗi 400 Bad Request

6. KIỂM THỬ REALTIME CHAT & THÔNG BÁO IN-APP:
  [PASS] 6.1 Mở cuộc trò chuyện 1-1 giữa NTD & Ứng viên (/api/conversations)
  [PASS] 6.2 Gửi tin nhắn thành công kích hoạt Broadcast Event (201 Created)
  [PASS] 6.3 Nhận thông báo in-app kèm unread badge count (/api/notifications)

7. KIỂM THỬ QUẢN TRỊ ADMIN (STATS & KHÓA USER):
  [PASS] 7.1 Lấy số liệu thống kê Dashboard (/api/admin/stats)
  [PASS] 7.2 Khóa tài khoản người dùng & thu hồi token (/api/admin/users/{id}/status)
  [PASS] 7.3 Đăng nhập tài khoản bị khóa trả 403 'Tài khoản của bạn đã bị khóa bởi quản trị viên'

=======================================================
    KẾT QUẢ KIỂM THỬ: 26 PASSED | 0 FAILED
    >>> TẤT CẢ 26 BÀI TEST HOẠT ĐỘNG HOÀN HẢO 100%! <<<
=======================================================
```

---

## 4. Cách 2: Hướng dẫn kiểm thử thủ công qua Postman / Thunder Client / cURL

### Cấu hình Header chung cho tất cả các Request:
* `Accept: application/json`
* `Content-Type: application/json` (với các request JSON)
* Với các request có xác thực (Protected):  
  `Authorization: Bearer <TOKEN_NHẬN_ĐƯỢC_SAU_KHI_LOGIN>`

---

### 4.1. Module Xác thực & Tài khoản (Auth & Sanctum)

#### Test Case 1: Đăng ký tài khoản Ứng viên mới (FR-01)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/register`
* **Body (raw JSON):**
  ```json
  {
    "name": "Trần Văn An",
    "email": "an.tran@example.com",
    "password": "Password123@",
    "password_confirmation": "Password123@",
    "phone": "0988776655",
    "dob": "2001-05-15",
    "role": "candidate"
  }
  ```
* **Kỳ vọng:** `201 Created`, tự động sinh Bearer token và tạo sẵn bản ghi `candidate_profile` rỗng.

#### Test Case 2: Đăng ký trùng email (FR-01.3)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/register`
* **Body:** Nhập lại email `an.tran@example.com` đã tạo ở Test Case 1.
* **Kỳ vọng:** `422 Unprocessable Content`:
  ```json
  {
    "success": false,
    "message": "Email đã được sử dụng",
    "errors": { "email": ["Email đã được sử dụng"] }
  }
  ```

#### Test Case 3: Đăng nhập thành công (FR-02)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/login`
* **Body:**
  ```json
  {
    "email": "candidate@timviec.vn",
    "password": "Password123@"
  }
  ```
* **Kỳ vọng:** `200 OK`, trả về token và thông tin profile. Lưu token này vào biến môi trường Postman `{{candidate_token}}`.

#### Test Case 4: Lấy thông tin tài khoản hiện tại kèm Profile
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/user`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK`, trả về thông tin `User` kèm `candidateProfile` và mảng `skills`.

#### Test Case 5: Đổi mật khẩu (FR-02.9)
* **Method:** `PUT`
* **URL:** `http://localhost:8000/api/user/change-password`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body:**
  ```json
  {
    "current_password": "Password123@",
    "new_password": "NewPassword123@",
    "new_password_confirmation": "NewPassword123@"
  }
  ```
* **Kỳ vọng:** `200 OK: "Đổi mật khẩu thành công"`. Nếu nhập sai mật khẩu cũ: `400: "Mật khẩu hiện tại không chính xác"`.

---

### 4.2. Module Dữ liệu Danh mục (Categories & Skills)

#### Test Case 6: Lấy danh sách ngành nghề (Public)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/categories`
* **Kỳ vọng:** `200 OK`, mảng 10 ngành nghề, mỗi ngành nghề có trường `jobs_count` (số lượng tin tuyển dụng đang mở).

#### Test Case 7: Tìm kiếm kỹ năng autocomplete (Public)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/skills?keyword=React`
* **Kỳ vọng:** `200 OK`, lọc ra `ReactJS`.

#### Test Case 8: Thêm ngành nghề mới (Admin only)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/admin/categories`
* **Headers:** `Authorization: Bearer {{admin_token}}`
* **Body:** `{ "name": "Thương mại điện tử & E-Commerce" }`
* **Kỳ vọng:** `201 Created`. (Nếu gọi bằng `{{candidate_token}}` sẽ bị chặn `403 Forbidden: "Bạn không có quyền truy cập vào chức năng này"`).

---

### 4.3. Module Hồ sơ Người dùng (Candidate & Company Profile)

#### Test Case 9: Xem hồ sơ Ứng viên
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/candidate/profile`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK`, hiển thị `title`, `experience_years`, `cv_url`, `avatar_url`, `skills`.

#### Test Case 10: Tải lên CV sai định dạng (FR-03.4)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/candidate/profile`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body:** Chọn `form-data`, key `cv_file` chọn 1 file `.docx` hoặc `.png`.
* **Kỳ vọng:** `400 Bad Request`:
  ```json
  {
    "success": false,
    "message": "Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB"
  }
  ```

#### Test Case 11: Cập nhật hồ sơ & Tải lên file CV PDF chuẩn (FR-03.3 - FR-03.5)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/candidate/profile`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body (form-data):**
  * `title`: `Chuyên viên Backend PHP/Laravel`
  * `experience_years`: `3`
  * `city`: `Hà Nội`
  * `bio`: `Đam mê tối ưu hóa hệ thống backend.`
  * `skills[0]`: `1` (PHP)
  * `skills[1]`: `2` (Laravel)
  * `skills[2]`: `6` (MySQL)
  * `cv_file`: Chọn 1 file định dạng `.pdf` (dung lượng < 5MB).
* **Kỳ vọng:** `200 OK`, hệ thống lưu file vào `storage/app/public/cvs/` và trả về `cv_url` có dạng `http://localhost:8000/storage/cvs/....pdf`.

#### Test Case 12: Nhà tuyển dụng cập nhật thông tin công ty (FR-04.1)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/employer/company`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (form-data):**
  * `name`: `FPT Software`
  * `address`: `Khu Công Nghệ Cao Hòa Lạc`
  * `city`: `Hà Nội`
  * `website`: `https://fptsoftware.com`
  * `company_size`: `1000+ nhân viên`
  * `description`: `Tập đoàn chuyển đổi số toàn cầu.`
* **Kỳ vọng:** `200 OK: "Cập nhật thông tin công ty thành công"`.

---

### 4.4. Module Việc làm & Tìm kiếm, Bộ lọc (Jobs Core)

#### Test Case 13: Đăng tin có hạn nộp ở quá khứ (FR-04.3)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/employer/jobs`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (JSON):**
  ```json
  {
    "title": "Tuyển Lập Trình Viên Backend",
    "category_id": 1,
    "job_level": "Middle",
    "quantity": 1,
    "job_type": "full_time",
    "city": "Hà Nội",
    "deadline": "2020-01-01",
    "description": "Mô tả",
    "requirements": "Yêu cầu",
    "skills": [1, 2]
  }
  ```
* **Kỳ vọng:** `400 Bad Request: "Hạn nộp hồ sơ phải sau ngày hôm nay"`.

#### Test Case 14: Đăng tin có lương tối thiểu > tối đa (FR-04.4)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/employer/jobs`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (JSON):**
  ```json
  {
    "title": "Tuyển Lập Trình Viên Backend",
    "category_id": 1,
    "job_level": "Middle",
    "quantity": 1,
    "job_type": "full_time",
    "city": "Hà Nội",
    "deadline": "2026-12-31",
    "salary_min": 30000000,
    "salary_max": 20000000,
    "description": "Mô tả",
    "requirements": "Yêu cầu",
    "skills": [1, 2]
  }
  ```
* **Kỳ vọng:** `400 Bad Request: "Mức lương tối thiểu không được lớn hơn mức lương tối đa"`.

#### Test Case 15: Đăng tin tuyển dụng hợp lệ (FR-04.2 - FR-04.5)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/employer/jobs`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (JSON):**
  ```json
  {
    "title": "Lập Trình Viên Backend Laravel (Senior)",
    "category_id": 1,
    "job_level": "Senior",
    "quantity": 2,
    "job_type": "full_time",
    "city": "Hà Nội",
    "address": "Tòa nhà FPT, Cầu Giấy, Hà Nội",
    "deadline": "2026-12-31",
    "salary_min": 25000000,
    "salary_max": 35000000,
    "description": "Phát triển hệ thống Microservices backend hiệu năng cao.",
    "requirements": "Tối thiểu 3 năm kinh nghiệm Laravel, MySQL, Docker, Redis.",
    "benefits": "Lương tháng 13, bảo hiểm FPT Care toàn diện.",
    "skills": [1, 2, 6, 8]
  }
  ```
* **Kỳ vọng:** `201 Created`, trả về thông tin việc làm và chuỗi hiển thị lương `25.000.000 - 35.000.000 VNĐ`. Lưu `id` trả về (ví dụ: `2`).

#### Test Case 16: Tìm kiếm & Lọc việc làm đa tiêu chí (FR-05)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/jobs?keyword=Laravel&category_id=1&city=Hà Nội&salary_range=over_20`
* **Kỳ vọng:** `200 OK`, lọc ra đúng các việc làm thỏa mãn tất cả tiêu chí.

#### Test Case 17: Lưu việc làm yêu thích (FR-05.6)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/jobs/2/save`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK: "Lưu việc làm thành công"`.
* Xem danh sách đã lưu: `GET /api/candidate/saved-jobs`.
* Bỏ lưu: `DELETE /api/jobs/2/save`.

#### Test Case 18: Đóng / Mở lại tin tuyển dụng (FR-04.6)
* **Method:** `PATCH`
* **URL:** `http://localhost:8000/api/employer/jobs/2/status`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body:** `{ "status": "closed" }`
* **Kỳ vọng:** `200 OK: "Đã đóng tin tuyển dụng"`.

---

### 4.5. Module Ứng tuyển & Tích hợp Gemini AI (Applications & AI Score)

#### Test Case 19: Ứng viên Nộp hồ sơ & Tự động chấm điểm AI (FR-06 & FR-07)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/jobs/1/apply`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body (form-data):**
  * `cv_file`: Chọn 1 file PDF mới (hoặc để trống nếu dùng CV trong Profile).
  * `cover_letter`: `Tôi rất mong muốn được cống hiến cho công ty.`
* **Kỳ vọng:**
  * Trả về mã `201 Created`.
  * Tự động sinh `ai_analysis`: điểm `match_score` (0-100%), danh sách `matched_skills`, `missing_skills`, `strengths`, `recommendations`.
  * Tự động cập nhật thời gian đẩy tin của Job (`updated_at = now()`) theo FR-05.4.
  * Tự động gửi thông báo in-app cho Nhà tuyển dụng.

#### Test Case 20: Chặn nộp hồ sơ lần 2 (FR-06.4)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/jobs/1/apply`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `409 Conflict`:
  ```json
  {
    "success": false,
    "message": "Bạn đã nộp hồ sơ cho công việc này rồi"
  }
  ```

#### Test Case 21: NTD xem chi tiết hồ sơ & Tự động đổi trạng thái sang 'waiting' (FR-06.5)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/employer/applications/1`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Kỳ vọng:** `200 OK`, trạng thái hồ sơ tự động chuyển từ `applied` sang `waiting`, có ghi nhận thời gian `reviewed_at`.

#### Test Case 22: Ứng viên rút hồ sơ sau khi NTD đã xem (Phụ lục B SRS)
* **Method:** `DELETE`
* **URL:** `http://localhost:8000/api/candidate/applications/1/withdraw`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `400 Bad Request: "Nhà tuyển dụng đã xem hồ sơ của bạn, không thể rút đơn"`.

#### Test Case 23: NTD duyệt hồ sơ ứng viên (accepted / rejected)
* **Method:** `PATCH`
* **URL:** `http://localhost:8000/api/employer/applications/1/status`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body:** `{ "status": "accepted" }`
* **Kỳ vọng:** `200 OK`, trạng thái chuyển sang `accepted (Trúng tuyển)`, tự động bắn thông báo cho Ứng viên.

---

### 4.6. Module Nhắn tin Realtime & Thông báo In-App (Chat & Notifications)

#### Test Case 24: Khởi tạo cuộc trò chuyện 1-1 (FR-08.1)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/conversations`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (JSON):**
  ```json
  {
    "job_id": 1,
    "partner_id": 3
  }
  ```
* **Kỳ vọng:** `200 OK`, trả về `id` phòng trò chuyện (ví dụ: `1`). *(Nếu ứng viên chưa nộp đơn vào job này, hệ thống sẽ từ chối theo FR-08.1).*

#### Test Case 25: Gửi tin nhắn mới & Kích hoạt Broadcast (FR-08.2 - FR-08.4)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/conversations/1/messages`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (JSON):**
  ```json
  {
    "message": "Chào bạn, chúng tôi muốn mời bạn tham gia buổi phỏng vấn online vào 9h sáng thứ Hai."
  }
  ```
* **Kỳ vọng:**
  * `201 Created`, hiển thị người gửi, nội dung, giờ gửi `HH:mm`.
  * Sự kiện `MessageSent` được phát lên WebSocket Reverb kênh `private-chat.1`.
  * Tạo thông báo in-app mới cho Ứng viên.

#### Test Case 26: Ứng viên kiểm tra danh sách thông báo & Quả chuông (FR-10.3)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/notifications`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK`, trả về `unread_count >= 1` và danh sách thông báo.
* Đánh dấu 1 thông báo đã đọc: `PATCH /api/notifications/{id}/read`.
* Đánh dấu tất cả đã đọc: `PATCH /api/notifications/read-all`.

---

### 4.7. Module Quản trị viên (Admin Dashboard & Moderation)

#### Test Case 27: Thống kê số liệu Dashboard (FR-09)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/admin/stats`
* **Headers:** `Authorization: Bearer {{admin_token}}`
* **Kỳ vọng:** `200 OK`, trả về tổng số:
  * `total_candidates`
  * `total_employers`
  * `total_jobs`
  * `active_jobs`
  * `total_applications`
  * `reported_jobs`

#### Test Case 28: Khóa tài khoản người dùng vi phạm (FR-09.4)
* **Method:** `PATCH`
* **URL:** `http://localhost:8000/api/admin/users/3/status`
* **Headers:** `Authorization: Bearer {{admin_token}}`
* **Body:** `{ "status": "locked" }`
* **Kỳ vọng:**
  * `200 OK: "Đã khóa tài khoản người dùng thành công"`.
  * Toàn bộ token đăng nhập hiện có của user bị thu hồi ngay lập tức.
  * Khi user bị khóa cố tình đăng nhập lại: nhận mã lỗi `403 Forbidden: "Tài khoản của bạn đã bị khóa bởi quản trị viên"`.
* Mở khóa tài khoản: Gửi lại request với body `{ "status": "active" }`.

---

## 5. Bảng đối chiếu mã trạng thái HTTP & Thông báo lỗi chuẩn SRS

Hệ thống tuân thủ 100% bảng ánh xạ mã lỗi theo **Phụ lục B SRS**:

| HTTP Code | Tình huống phát sinh | Message hiển thị chuẩn tiếng Việt |
|---|---|---|
| `400 Bad Request` | Chọn hạn nộp ở quá khứ hoặc hôm nay | `"Hạn nộp hồ sơ phải sau ngày hôm nay"` |
| `400 Bad Request` | Upload file CV không phải PDF hoặc > 5MB | `"Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB"` |
| `400 Bad Request` | Lương tối thiểu > lương tối đa | `"Mức lương tối thiểu không được lớn hơn mức lương tối đa"` |
| `400 Bad Request` | Rút hồ sơ khi Nhà tuyển dụng đã mở xem CV | `"Nhà tuyển dụng đã xem hồ sơ của bạn, không thể rút đơn"` |
| `400 Bad Request` | Nhập sai mật khẩu hiện tại khi đổi mật khẩu | `"Mật khẩu hiện tại không chính xác"` |
| `401 Unauthorized` | Chưa truyền Bearer token hoặc token đã hết hạn | `"Phiên làm việc đã hết hạn, vui lòng đăng nhập lại"` |
| `401 Unauthorized` | Đăng nhập sai Email hoặc Mật khẩu | `"Email hoặc mật khẩu không chính xác"` |
| `403 Forbidden` | Đăng nhập vào tài khoản đã bị Admin khóa | `"Tài khoản của bạn đã bị khóa bởi quản trị viên"` |
| `403 Forbidden` | Nhập sai mật khẩu liên tiếp 5 lần | `"Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau 15 phút"` |
| `403 Forbidden` | Truy cập trái quyền (Ứng viên vào route Employer/Admin) | `"Bạn không có quyền truy cập vào chức năng này"` |
| `404 Not Found` | Xem tin tuyển dụng không tồn tại hoặc đã ngừng | `"Công việc không tồn tại hoặc đã ngừng tuyển dụng"` |
| `409 Conflict` | Ứng viên nộp hồ sơ lần thứ 2 cho cùng 1 việc làm | `"Bạn đã nộp hồ sơ cho công việc này rồi"` |
| `422 Unprocessable`| Đăng ký với Email đã tồn tại | `"Email đã được sử dụng"` |
| `422 Unprocessable`| Nộp hồ sơ vào tin đã đóng hoặc hết hạn | `"Tin tuyển dụng này đã đóng hoặc đã hết hạn nộp hồ sơ"` |

---

## 6. Xử lý sự cố thường gặp (Troubleshooting)

### 6.1. File upload (CV / Avatar / Logo) bị lỗi 404 khi mở URL
* **Nguyên nhân:** Chưa tạo symbolic link giữa thư mục `storage/app/public` và `public/storage`.
* **Khắc phục:** Chạy lệnh:
  ```bash
  cd backend
  php artisan storage:link
  ```

### 6.2. Lỗi CORS khi gọi API từ Frontend Next.js (`http://localhost:3000`)
* **Nguyên nhân:** File `config/cors.php` chưa cho phép origin hoặc methods.
* **Khắc phục:** Đảm bảo `config/cors.php` có:
  ```php
  'paths' => ['api/*', 'sanctum/csrf-cookie'],
  'allowed_origins' => ['http://localhost:3000'],
  'supports_credentials' => true,
  ```

### 6.3. Chưa có Google Gemini API Key
* Hệ thống được trang bị **cơ chế Fallback Heuristic thông minh**: Dù bạn chưa điền API Key hoặc API Key bị hết hạn ngạch (quota limit), API Nộp đơn ứng tuyển vẫn chấm điểm Match Score chính xác dựa trên độ trùng khớp kỹ năng và năm kinh nghiệm trong CSDL mà không bao giờ bị báo lỗi 500.
* Để kích hoạt AI Gemini 1.5 Flash thực tế, chỉ cần dán API Key vào dòng `GEMINI_API_KEY=...` trong file `backend/.env`.
