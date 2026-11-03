# Khu vực tài khoản ứng viên

## Thiết kế đã triển khai

Dùng bố cục ảnh người dùng cung cấp: thẻ cá nhân màu xanh, menu điều hướng bên trái, các khối nội dung trắng trên nền slate bên phải. Giữ navbar xanh TimViecOnline, tìm kiếm, danh mục, ngăn thông báo và dropdown tài khoản đã có. Giữ footer chung theo homepage. Sidebar có năm mục, gồm Tin nhắn; đã bỏ nút cam Tạo Thông Báo Việc Làm theo yêu cầu tiếp theo.

Định hướng: trang tài khoản chức năng, rõ ràng, ít trang trí. Font Be Vietnam Pro, xanh `#005aff`, thẻ cá nhân `#447bf5`, cam `#e85327`, khoảng cách 16–24px. Mobile chuyển menu sang hàng cuộn ngang và các khối nội dung thành một cột.

Đã bỏ Tổng quan, Công ty của tôi, Quản lý đơn hàng khỏi dropdown tài khoản trên 12 trang công khai/ứng viên có menu này. Sidebar tài khoản không có ba mục này.

## Các trang

- `page_candidate_dashboard`: Hồ sơ của tôi, công việc mong muốn, CV PDF, mức hoàn thiện mẫu, mục tiêu nghề nghiệp, kinh nghiệm, học vấn, kỹ năng và thông tin cơ bản.
- `page_candidate_jobs`: Việc đã ứng tuyển, trạng thái rỗng và liên kết tìm việc.
- `page_saved_jobs`: Cùng layout Việc làm của tôi, tab Việc đã lưu có thẻ việc mẫu.
- `page_candidate_alerts`: Trạng thái rỗng thông báo việc làm và form tạo thông báo mẫu theo ảnh.
- `page_notifications`: Thông báo ứng tuyển/tin nhắn, liên kết sang thông báo việc làm.
- `page_settings`: Email đăng nhập, thông tin tài khoản, khu vực mật khẩu và tùy chọn email mẫu.
- `page_chat`: Hội thoại mẫu giữa ứng viên và nhà tuyển dụng đã nhận hồ sơ, cùng sidebar tài khoản; minh họa tiếp tục trao đổi khi tin đã đóng theo FR-08.6. Chưa gửi tin hoặc nối WebSocket.

## Phù hợp dữ liệu

Thông tin cá nhân dùng `users.name`, `email`, `phone`, `dob`. Hồ sơ dùng `candidate_profiles.title`, `experience_years`, `bio`, `city`, `address`, `avatar`, `social_links`, `cv_file_path`; kỹ năng dùng danh sách seed SQL. CV là PDF tối đa 5 MB theo FR-03; không thêm CV builder hay thay đổi mẫu CV online.

Học vấn/kinh nghiệm chi tiết được trình bày trong CV. Mức lương mong muốn, thông báo tìm việc tự động và tùy chọn email chỉ minh họa giao diện theo ảnh; chưa có dữ liệu/tính năng lưu tương ứng. Không thêm migration hoặc endpoint trong lượt này.

Tất cả dữ liệu hiện là mẫu, không có xác thực, upload thực, gửi email, đổi mật khẩu hay lưu form. Chọn tệp, native details, điều hướng giữa các trang và navbar hoạt động; nút lưu/gửi chưa hoạt động. Không hiển thị thông báo giả lưu thành công.

## Kiểm chứng

- Chromium: các trang tài khoản ở 360 / 390 / 768 / 1024 / 1440px không tràn ngang đáng kể (sai số 1px).
- Header danh mục, dropdown tài khoản và ngăn thông báo mở/đóng; Escape đóng các mục đang mở.
- Mỗi trang có một h1, một footer chung, năm mục sidebar và mục đang chọn đúng; không có lỗi JavaScript. Không còn nút cam tạo thông báo ở sidebar.
- Mọi input/select/textarea trong nội dung có nhãn; đường dẫn file nội bộ tồn tại.
- Xem ảnh desktop trang hồ sơ/việc của tôi và ảnh mobile; chọn Tạo thông báo mở native details của form.
- Kiểm tra cú pháp JS và `git diff --check`. Chưa kiểm thử trình đọc màn hình, Firefox/Safari hoặc backend.
