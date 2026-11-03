# Đồng bộ khu vực nhà tuyển dụng

## Phạm vi

Đồng bộ các màn hình HTML theo dashboard đã được chấp nhận. Giao diện chuyên nghiệp, nền trắng/slate, navy cho điều hướng, cam cho hành động chính; giữ Be Vietnam Pro và hệ khoảng cách của dashboard. Không triển khai API, lưu form, gửi tin hoặc cập nhật trạng thái hồ sơ.

Các màn hình:

- `page_employer_dashboard`: tổng quan và danh sách tin đã có; đổi liên kết hồ sơ công ty sang trang chỉnh sửa riêng.
- `page_employer_candidates`: danh sách hồ sơ, bộ lọc mẫu, các trạng thái `applied`, `waiting`, `accepted`, `rejected`, `withdrawn`, chi tiết ứng viên và điểm phù hợp CV.
- `page_post_job`: form thông tin công việc, kỹ năng, địa điểm, lương, hạn nộp, mô tả, yêu cầu và quyền lợi. Có ba cách nhập lương theo FR-04.4.
- `page_employer_chat`: hộp thư của nhà tuyển dụng, nội dung hội thoại mẫu với ứng viên đã ứng tuyển; minh họa bảo lưu hội thoại khi tin đóng.
- `page_employer_notifications`: thông báo hồ sơ mới, tin nhắn, rút hồ sơ; trạng thái đọc/chưa đọc và nút đánh dấu đã đọc mẫu.
- `page_employer_profile`: hồ sơ doanh nghiệp, thông tin người quản lý tài khoản và khu vực đổi mật khẩu.
- `page_ai_cv_report`: dùng lại header/sidebar mới để chuyển từ hồ sơ sang báo cáo không bị đổi khu vực.

## Thành phần dùng chung

`design/shared/employer-shell.js` dựng cùng header/sidebar, điều hướng đúng trang doanh nghiệp và menu mobile. `design/shared/employer.css` bổ sung hệ form, nút, khoảng cách, chữ phụ và trạng thái tĩnh; dùng lại biến màu và layout từ `page_employer_dashboard/dashboard.css`.

Các trang ứng viên `page_chat`, `page_notifications` giữ riêng. Các liên kết trong khu vực doanh nghiệp đi đến `page_employer_chat`, `page_employer_notifications`, tránh đưa người dùng sang layout ứng viên.

## Trường hồ sơ theo SQL/SRS/README

| Phần | Trường giao diện | Nguồn |
| --- | --- | --- |
| Công ty | Tên công ty, logo, website, quy mô nhân sự, địa chỉ trụ sở, tỉnh/thành phố, giới thiệu | `companies.name`, `logo`, `website`, `company_size`, `address`, `city`, `description` |
| Tài khoản | Họ tên, email, số điện thoại, ngày sinh | `users.name`, `email`, `phone`, `dob` |
| Mật khẩu | Mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu | SRS FR-02.9 |
| Thông tin hệ thống | Vai trò, trạng thái tài khoản chỉ đọc | `users.role`, `status` |

Tên, giới thiệu, địa chỉ và tỉnh/thành phố là thông tin công ty bắt buộc trước lần đăng tin đầu theo FR-04.1. Không thêm mã số thuế, ngành kinh doanh hoặc dữ liệu giấy phép vì SQL/SRS hiện chưa có các trường này. Không đưa ID, khóa ngoại hoặc các trường bảo mật nội bộ vào form.

## Giới hạn bản thiết kế

Form có thể nhập liệu, chọn file logo và chọn cách hiển thị lương. Các nút lưu/đăng/gửi chưa hoạt động; không có thông báo giả lưu thành công và không gửi dữ liệu qua mạng. Form thiết kế chặn submit mặc định. Hồ sơ, KPI và hội thoại là dữ liệu minh họa; các bộ lọc ở trang ứng viên hiện chỉ dựng giao diện. Dashboard vẫn giữ tương tác mẫu đã làm trước đó.

## Kiểm tra

- Chromium: cả 7 trang có header/sidebar thống nhất, mục điều hướng hiện tại đúng, không lỗi JavaScript và các đường dẫn file nội bộ tồn tại.
- Kiểm tra kích thước 360 / 390 / 768 / 1024 / 1440px, không tràn ngang đáng kể (sai số làm tròn tối đa 1px).
- Menu mobile mở/đóng được bằng nút và Escape; các input/select/textarea có nhãn truy cập.
- Kiểm tra trực quan ảnh desktop/mobile, chi tiết ứng viên dùng bàn phím được, trường công ty và người liên hệ có thể nhập liệu, trường mật khẩu để trống.
- Kiểm tra cú pháp JS và `git diff --check` đạt. Không chạy build Next.js/Laravel vì chỉ sửa các trang HTML trong `design/`.
- Chưa kiểm tra API, WebSocket, trình đọc màn hình, Firefox/Safari hoặc audit tương phản tự động.
