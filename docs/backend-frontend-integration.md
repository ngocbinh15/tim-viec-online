# Frontend kết nối Laravel

Các trang public, xác thực, ứng viên, nhà tuyển dụng và admin dùng API thật khi `AUTH_MODE=api`. Dữ liệu và thay đổi lưu ở Laravel/MySQL, không thay bằng mock khi API lỗi. `AUTH_MODE=mock` vẫn phục vụ demo frontend riêng.

## Khởi chạy

1. Cài dependencies theo README. Trong `backend/.env`, đặt kết nối database, `APP_URL=http://localhost:8000`, `FRONTEND_URL=http://localhost:3000`, `AI_ANALYSIS_ENABLED=false`. Chạy `php artisan migrate` trên database phát triển đã chọn; dùng seeders khi cần danh mục và tài khoản admin. Không dùng `migrate:fresh` cho database có dữ liệu cần giữ.
2. Chạy `php artisan storage:link` để hiển thị avatar/logo công khai và `php artisan serve --port=8000`. CV và ảnh chat được lưu riêng tư, truy cập qua endpoint phân quyền.
3. Trong `frontend/.env.local`:

   ```dotenv
   AUTH_MODE=api
   AUTH_API_URL=http://localhost:8000/api
   AUTH_APP_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

   `AUTH_APP_URL` phải khớp origin trình duyệt, gồm cả cổng; không trộn `localhost` và `127.0.0.1`. Sau đó chạy `npm run dev` trong `frontend/`. Với bản production, dùng HTTPS, `npm run build` rồi `npm run start`.
4. Đăng ký tài khoản ứng viên/nhà tuyển dụng qua giao diện rồi xác nhận địa chỉ bằng liên kết trong email. Chưa xác nhận vẫn đăng nhập được nhưng chưa ứng tuyển, đăng tin hoặc nhắn tin được. Tài khoản demo `candidate@example.test`/`employer@example.test` thuộc mock mode, không tự xuất hiện trong database API. Admin được tạo bằng seeder với `ADMIN_EMAIL`/`ADMIN_PASSWORD` trong môi trường riêng. Cấu hình SMTP, migration và worker queue `emails` theo [hướng dẫn email](mail-setup.md); ứng viên bật tùy chọn tại `/account/settings`.

## Lỗi xác thực khi chạy sai cổng

Nếu trang đăng nhập/đăng ký báo “Yêu cầu không hợp lệ. Vui lòng tải lại trang và thử lại”, kiểm tra địa chỉ trình duyệt có khớp `AUTH_APP_URL` hay không. `http://localhost:3001` khác origin với `http://localhost:3000`; cơ chế chống CSRF sẽ từ chối yêu cầu khi cấu hình không khớp.

Lệnh `npm run dev` đã cố định cổng **3000** để không tự chuyển sang 3001 khi một frontend khác đang chạy. Chỉ chạy một frontend; dừng bản `next start` cũ trước khi chạy development. Mở `http://localhost:3000/login`. Nếu chủ động dùng cổng khác, cập nhật đồng bộ `AUTH_APP_URL`, `FRONTEND_URL` ở backend và cấu hình CORS/Reverb liên quan, rồi khởi động lại dịch vụ. Không tắt kiểm tra origin để tránh lỗi cấu hình.

Backend chỉ bổ sung `http://localhost:3000` và `http://127.0.0.1:3000` vào CORS khi `APP_ENV=local`; danh sách loại bỏ các origin trùng nhau. Các môi trường khác dùng origin trong `FRONTEND_URL`. Việc cho phép CORS không thay thế kiểm tra `AUTH_APP_URL` của frontend hoặc xác thực và phân quyền tại API. Sau khi đổi cấu hình backend, chạy `php artisan config:clear` hoặc tạo lại config cache của môi trường triển khai.

## Chat và thông báo

Backend cần `BROADCAST_CONNECTION=reverb`, cùng `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, `REVERB_HOST`, `REVERB_PORT`, `REVERB_SCHEME`, `REVERB_ALLOWED_ORIGINS`. Chạy `php artisan reverb:start`. Chỉ public key được đưa vào frontend; không đưa secret sang biến `NEXT_PUBLIC_*`.

Frontend đặt `NEXT_PUBLIC_REVERB_APP_KEY` trùng key backend, cùng host/port/scheme tương ứng. Ví dụ local: host `localhost`, port `8080`, scheme `http`. Thay các biến `NEXT_PUBLIC_*` cần khởi động lại dev server hoặc build lại production. Kênh riêng được xác thực qua proxy có phiên đăng nhập, không gửi token Sanctum vào JavaScript. Có đối soát khi quay lại tab và mỗi 30 giây để bù sự kiện bị lỡ hoặc khi WebSocket không sẵn sàng.

## Phạm vi và điểm nối

| Phần | Dữ liệu và thao tác |
| --- | --- |
| Public | Trang chủ, danh mục, công ty, tìm kiếm/lọc/sắp xếp/phân trang, chi tiết tin |
| Ứng viên | Hồ sơ, kỹ năng, avatar/CV PDF, lưu/bỏ lưu tin, nộp/rút hồ sơ, lịch sử, chat chữ/ảnh, trạng thái đọc, thông báo |
| Nhà tuyển dụng | Công ty/logo, tạo/sửa/đóng/mở tin, hồ sơ theo tin, chi tiết/CV/xét duyệt, chat và thông báo |
| Admin | Thống kê, danh sách/khóa/mở tài khoản, tin báo cáo/xóa tin, CRUD ngành nghề/kỹ năng |

Lớp đọc server nằm ở `frontend/src/services/`; ánh xạ dữ liệu ở `frontend/src/features/*/api*`. Các thao tác browser gọi `/api/backend/...`, có allowlist method/path, kiểm tra Origin với thao tác ghi và giới hạn request body. Token nằm trong cookie HttpOnly; backend vẫn kiểm tra vai trò, quyền sở hữu, file và dữ liệu đầu vào. Proxy không nhận URL tùy ý; AI chỉ cho phép hai endpoint đọc trạng thái và yêu cầu phân tích theo ID hồ sơ.

`AI_ANALYSIS_ENABLED=false` ngăn tạo yêu cầu phân tích mới; job chưa có kết quả được worker chuyển `deferred`. Khi bật, đơn mới chạy qua database queue riêng `ai`; hồ sơ cũ/lỗi cần bấm phân tích/thử lại. Mở hồ sơ không tự gọi lại dịch vụ. Giao diện nhà tuyển dụng có điểm, bộ lọc/sắp xếp, skeleton và trạng thái lỗi; admin mở đánh giá từ hồ sơ của từng tin. Ứng viên không nhận điểm, nhận xét, trạng thái hoặc lỗi AI. Xem [cấu hình và vận hành AI](ai-setup.md).

## Kiểm thử

Trong `frontend/`: `npm run test`, `npm run test:mock-auth`, `npm run lint`, `npm run build`; `npm run test:e2e` kiểm tra demo và `npm run test:auth` kiểm tra hợp đồng xác thực qua fixture HTTP.

`npm run test:backend` chạy trình duyệt với Laravel/Reverb và SMTP sink thật. Cần MySQL/MariaDB thử nghiệm riêng ở `127.0.0.1:33063`, account có quyền tạo database **`frontend_api_e2e_test`**. Có thể đặt `FRONTEND_E2E_DB_USER`/`FRONTEND_E2E_DB_PASSWORD`; mặc định phục vụ instance local thử nghiệm. Script chỉ reset đúng database tên/cổng này, tách storage và config cache vào `backend/storage/framework/testing/frontend-e2e`, không dùng `.env` database phát triển. Các cổng `8127`, `8128`, `8129`, `3127` phải trống.

Build frontend trước với key `frontend-e2e-public-key`, host `127.0.0.1`, port `8128`, scheme `http` cho Reverb thử nghiệm. Đây là credentials công khai của fixture local, không dùng triển khai thật. Khi kết thúc, build lại với cấu hình triển khai của bạn. Bộ kiểm thử dùng tài khoản `*@frontend-e2e.test`, SMTP sink loopback và AI tắt, không giao thư ra ngoài hoặc gọi Gemini. Các báo cáo/traces nằm trong `frontend/test-results/` và không được commit.
