# TIMVIECONLINE - BACKEND API SERVICE (LARAVEL 11)

> Tài liệu hướng dẫn đầy đủ từ A - Z dành cho lập trình viên Backend (được hợp nhất trực tiếp từ **SRS** và **README**):
> 👉 **[BẤM ĐỂ XEM TOÀN BỘ CẨM NANG BACKEND A-Z (BACKEND_GUIDE.md)](../BACKEND_GUIDE.md)**

---

## 1. Khởi chạy nhanh (Quick Start)

```bash
# 1. Cài đặt dependencies
composer install

# 2. Cấu hình .env
cp .env.example .env
php artisan key:generate

# 3. Tạo link storage cho file upload (Avatar, Logo, CV PDF)
php artisan storage:link

# 4. Migrate database và seed dữ liệu mẫu
php artisan migrate:fresh --seed

# 5. Khởi chạy API Server (Port 8000)
php artisan serve --port=8000

# 6. Khởi chạy WebSocket Reverb Server (Terminal riêng)
php artisan reverb:start
```

---

## 2. Kiểm thử tự động toàn bộ API Backend
Dự án đã có sẵn script kiểm thử tự động 100% kịch bản theo yêu cầu SRS:

```bash
php test_all_backend.php
```

---

## 3. Tài khoản kiểm thử có sẵn (Seed Data)
Mật khẩu mặc định cho tất cả tài khoản: **`Password@123`**

* **Admin:** `admin@timvieconline.vn`
* **Employer:** `hr@fptsoftware.vn`, `hr@vng.vn`, `hr@viettel.vn`
* **Candidate:** `nguyen.van.a@gmail.com`, `tran.thi.b@gmail.com`, `le.van.c@gmail.com`

---

## 4. Chi tiết Nghiệp vụ & API Specification
Xem chi tiết toàn bộ nghiệp vụ FR-01 -> FR-10, bảng mã lỗi HTTP chuẩn, ERD 15 bảng database và danh sách đầy đủ API tại:
**[BACKEND_GUIDE.md](../BACKEND_GUIDE.md)**.
