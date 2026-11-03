# Đăng nhập và đăng ký

## Thiết kế

Hai trang dùng chung `design/shared/auth.css` và `auth.js`. Bố cục hai cột: giới thiệu ngắn và minh họa công việc bằng HTML/CSS bên trái; form trắng bên phải. Giữ Be Vietnam Pro, navy `#002b7f`, xanh `#005aff`, nền `#f5f7fb`, dùng cam tiết chế trong nhận diện. Không thêm ảnh/font thương hiệu mới. Trên mobile chỉ giữ form và header rút gọn. Footer vẫn dùng mẫu chung của homepage.

Mục tiêu là giúp người dùng hiểu cách bắt đầu, nhập thông tin rõ ràng và nhận phản hồi cạnh trường. Không dùng thông số tăng trưởng, cam kết bảo mật hoặc tính năng xác thực chưa có trong dự án.

## Trường và trạng thái

- Đăng nhập: email, mật khẩu, ghi nhớ đăng nhập, liên kết quên mật khẩu/đăng ký.
- Đăng ký: vai trò ứng viên hoặc nhà tuyển dụng; họ tên, email, số điện thoại tùy chọn, ngày sinh, mật khẩu và xác nhận mật khẩu. Ngày sinh giúp thể hiện yêu cầu từ 15 tuổi trở lên trong SRS.
- Nhà tuyển dụng đăng ký tài khoản người liên hệ; hồ sơ công ty được hoàn thiện sau đó theo FR-01.6/FR-04.1. Không yêu cầu mã số thuế hoặc giấy phép vì không có trường tương ứng trong SQL.
- Có hiện/ẩn mật khẩu, lỗi ngay cạnh trường và focus vào trường sai đầu tiên.
- Kiểm tra họ tên 2–100 ký tự, số điện thoại Việt Nam 10 số, mật khẩu 8–32 ký tự có chữ hoa/chữ thường/số/ký tự đặc biệt, mật khẩu xác nhận và tuổi tối thiểu 15 theo ngày Việt Nam.
- `?role=employer` mở đúng lựa chọn nhà tuyển dụng; không có đăng ký admin.

## Phạm vi

Đây là các trang HTML thiết kế. Submit chỉ kiểm tra dữ liệu nhập và báo rõ chưa kết nối API. Không gửi request đăng nhập/đăng ký, không lưu email/mật khẩu, không tự chuyển vào dashboard hoặc báo xác thực thành công. Bỏ cơ chế tự điền mật khẩu demo trước đây.

Backend vẫn cần kiểm tra lại tất cả dữ liệu, trùng email, xác thực và cấp phiên khi tích hợp thật. Các trạng thái tải/lỗi mạng và tài khoản bị khóa chưa mô phỏng trong lượt thiết kế này.

## Kiểm chứng

- Chromium: kiểm tra hai trang ở 360/390/768/1024/1440px, không tràn ngang đáng kể (sai số 1px).
- Đã xem ảnh desktop/mobile, kiểm tra nhãn của các trường, các liên kết nội bộ và Routes drawer.
- Kiểm tra email sai, thiếu trường, mật khẩu yếu, xác nhận không khớp, số điện thoại sai, dưới 15 tuổi; hiện/ẩn mật khẩu và đổi vai trò hoạt động.
- Submit không gửi POST hoặc chuyển trang; mật khẩu để trống khi mới tải trang; không có lỗi JavaScript trong các luồng kiểm tra.
- `node --check`, `git diff --check` đạt. Chưa kiểm thử backend, trình đọc màn hình, Firefox/Safari hoặc audit tương phản tự động.
