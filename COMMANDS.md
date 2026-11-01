# DANH SÁCH TOÀN BỘ CÂU LỆNH CHẠY DỰ ÁN TIMVIECONLINE

Tài liệu này tổng hợp toàn bộ các câu lệnh cần thiết để cài đặt, khởi chạy hằng ngày và bảo trì dự án **TimViecOnline** (Laravel 12 API + Next.js 16 + MySQL + Reverb WebSocket + Queue Workers).

---

## 📌 BẢNG TỔNG HỢP CÁC DỊCH VỤ CẦN CHẠY

Để toàn bộ tính năng của hệ thống (Đăng nhập, Tìm việc, Đăng tin, Xuất CV PDF, Chat Realtime, Thông báo, Phân tích AI) hoạt động đầy đủ, cần khởi chạy các dịch vụ sau:

| Dịch vụ | Thư mục | Cổng / Hàng đợi | Lệnh chạy |
| :--- | :--- | :--- | :--- |
| **MySQL Database** | XAMPP | Cổng `3306` | Bật **MySQL** trong **XAMPP Control Panel** |
| **Backend API** | `backend/` | `http://127.0.0.1:8000` | `php scripts/serve-local.php --port=8000` |
| **Frontend UI** | `frontend/` | `http://localhost:3000` | `npm run dev` |
| **Reverb WebSocket** | `backend/` | `127.0.0.1:8080` | `php artisan reverb:start --host=127.0.0.1 --port=8080` |
| **Worker Email** | `backend/` | Queue `emails` | `php artisan queue:work database --queue=emails --sleep=1 --tries=3 --timeout=30` |
| **Worker CV Builder** | `backend/` | Queue `cv` | `php artisan queue:work database --queue=cv --sleep=1 --tries=2 --timeout=45` |
| **Worker AI (Tùy chọn)** | `backend/` | Queue `ai` | `php artisan queue:work database --queue=ai --sleep=1 --tries=3 --timeout=60` |
| **Scheduler (Tùy chọn)** | `backend/` | Chạy theo lịch | `php artisan schedule:work` |

---

## PHẦN 1: CÀI ĐẶT LẦN ĐẦU TIÊN (SETUP FROM SCRATCH)

> 💡 *Chỉ cần thực hiện 1 lần duy nhất khi mới clone dự án về máy.*

### Bước 1: Khởi động MySQL
- Mở **XAMPP Control Panel**, nhấn nút **Start** tại mục **MySQL** (cổng mặc định `3306`).
- (Tùy chọn) Bật **Apache** nếu muốn vào `http://localhost/phpmyadmin` để quản lý giao diện DB.

### Bước 2: Thiết lập Backend (Laravel)
Mở terminal tại thư mục gốc dự án:

```powershell
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Cài đặt các gói thư viện PHP
composer install

# 3. Tạo file cấu hình môi trường (.env) nếu chưa có
copy .env.example .env

# 4. Khởi tạo Application Key bí mật
php artisan key:generate

# 5. Cấu hình Database trong file backend/.env:
#    DB_CONNECTION=mysql
#    DB_HOST=127.0.0.1
#    DB_PORT=3306
#    DB_DATABASE=tim_viec_online
#    DB_USERNAME=root
#    DB_PASSWORD=

# 6. Chuẩn bị cơ sở dữ liệu (chọn 1 trong 2 cách):
#    Cách A (Khuyên dùng): Import file database có sẵn vào MySQL:
#       mysql -u root tim_viec_online < ../db/tim_viec_online.sql
#
#    Cách B: Chạy migrations và seed dữ liệu mặc định:
#       php artisan migrate --seed

# 7. Tạo liên kết lưu trữ công khai (cho avatar, logo công ty)
php artisan storage:link

# 8. Quay lại thư mục gốc
cd ..
```

### Bước 3: Thiết lập Frontend (Next.js)
Mở terminal tại thư mục gốc:

```powershell
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các gói thư viện Node
npm install
# hoặc dùng: npm ci

# 3. Tạo file cấu hình môi trường (.env.local) nếu chưa có
copy .env.example .env.local

# 4. Build bộ chuyển đổi định dạng và xuất CV PDF (Bắt buộc cho CV Builder)
npm run build:cv-renderer

# 5. Quay lại thư mục gốc
cd ..
```

---

## PHẦN 2: CÁC CÂU LỆNH KHỞI CHẠY HẰNG NGÀY (DAILY RUN)

Khi làm việc hoặc chạy demo, mở các cửa sổ Terminal (PowerShell / Command Prompt) riêng biệt cho từng dịch vụ:

### 🟢 Terminal 1: Bật MySQL
- Mở **XAMPP Control Panel** ➔ Bấm **Start MySQL** (đảm bảo hiển thị cổng `3306`).

---

### 🟢 Terminal 2: Chạy Backend API (Cổng 8000)
```powershell
cd backend
php artisan config:clear
php scripts/serve-local.php --port=8000
```
> *(Nếu script `serve-local.php` không khả dụng trên môi trường của bạn, dùng lệnh Laravel chuẩn thay thế: `php artisan serve --host=127.0.0.1 --port=8000`)*  
> 🔗 **Kiểm tra API:** Mở trình duyệt xem `http://127.0.0.1:8000/up` hoặc `http://127.0.0.1:8000/api/categories`.

---

### 🟢 Terminal 3: Chạy Frontend Next.js (Cổng 3000)
```powershell
cd frontend
npm run dev
```
> 🔗 **Truy cập Website:** Mở trình duyệt vào **`http://localhost:3000`**.

---

### 🟢 Terminal 4: Chạy Reverb WebSocket (Chat & Thông báo Realtime - Cổng 8080)
```powershell
cd backend
php artisan reverb:start --host=127.0.0.1 --port=8080
```
> ⚠️ **Lưu ý:** Nếu không bật Reverb, tin nhắn vẫn được lưu vào database qua API nhưng 2 bên chat sẽ không nhận được tin nhắn tức thời (realtime).

---

### 🟢 Terminal 5: Chạy Worker Email (Xử lý email thông báo, ứng tuyển, tin nhắn)
```powershell
cd backend
php artisan queue:work database --queue=emails --sleep=1 --tries=3 --timeout=30
```
> ⚠️ **Lưu ý:** Worker này lấy các job gửi thư từ queue `emails` để gửi cho ứng viên và nhà tuyển dụng.

---

### 🟢 Terminal 6: Chạy Worker CV (Xử lý xuất PDF của Trình tạo CV)
```powershell
cd backend
php artisan queue:work database --queue=cv --sleep=1 --tries=2 --timeout=45
```
> ⚠️ **Lưu ý:** Bắt buộc phải chạy terminal này khi ứng viên thao tác **Tạo CV theo mẫu ➔ Xuất PDF** trong mục **CV của tôi**.

---

### 🟡 Terminal 7 (Tùy chọn): Chạy Worker AI (Đối chiếu và chấm điểm CV)
```powershell
cd backend
php artisan queue:work database --queue=ai --sleep=1 --tries=3 --timeout=60
```
> ℹ️ *Chỉ cần khi bật `AI_ANALYSIS_ENABLED=true` và có cấu hình Gemini/Groq API Key trong `backend/.env`.*

---

### 🟡 Terminal 8 (Tùy chọn): Chạy Laravel Scheduler (Quét tin tuyển dụng hết hạn lúc 00:05)
```powershell
cd backend
php artisan schedule:work
```
> ℹ️ *Tự động đóng các tin tuyển dụng đã quá hạn nộp hồ sơ.*

---

## PHẦN 3: CÁC CÂU LỆNH BẢO TRÌ & XỬ LÝ LỖI (MAINTENANCE & TROUBLESHOOTING)

### 1. Khi sửa đổi file `.env` hoặc cấu hình backend
Mỗi khi chỉnh sửa `backend/.env`, cần xóa cache cấu hình để Laravel nhận thông số mới:
```powershell
cd backend
php artisan optimize:clear
# hoặc:
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

### 2. Khi sửa code liên quan đến Jobs/Queues
Worker lưu code PHP trong bộ nhớ, vì vậy cần restart worker sau khi sửa code job:
```powershell
cd backend
php artisan queue:restart
```

### 3. Khi cập nhật database (Thêm bảng, cột mới)
```powershell
cd backend
php artisan migrate
```

### 4. Khi sửa đổi code template / renderer CV PDF
```powershell
cd frontend
npm run build:cv-renderer
```

### 5. Build và chạy Frontend ở chế độ Production (Tối ưu hiệu năng)
```powershell
cd frontend
npm run build
npm start
```

### 6. Chạy kiểm thử tự động (Testing)
```powershell
# Chạy Unit/Feature Tests Backend
cd backend
php artisan test

# Chạy Tests Frontend
cd frontend
npm run typecheck
npm run lint
npm test
```

---

## PHẦN 4: KHỞI CHẠY NHANH 1-CLICK (TIỆN ÍCH WINDOWS)

Dự án đã có sẵn file script tự động mở đồng thời tất cả các cửa sổ terminal cần thiết:

- **Cách 1 (Khuyên dùng):** Nhấp đúp chuột vào file [`start-dev.bat`](file:///D:/xampp/htdocs/tim-viec-online/start-dev.bat) ở thư mục gốc (hoặc gõ `.\start-dev.bat` trong cmd/powershell).
- **Cách 2:** Copy và chạy đoạn lệnh sau trong PowerShell tại thư mục gốc:

```powershell
# Mở Backend API
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; php artisan config:clear; php scripts/serve-local.php --port=8000"

# Mở Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

# Mở Reverb WebSocket
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; php artisan reverb:start --host=127.0.0.1 --port=8080"

# Mở Worker Emails
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; php artisan queue:work database --queue=emails --sleep=1 --tries=3 --timeout=30"

# Mở Worker CV PDF
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; php artisan queue:work database --queue=cv --sleep=1 --tries=2 --timeout=45"
```
