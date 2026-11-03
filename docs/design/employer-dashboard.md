# Thiết kế lại trang nhà tuyển dụng

## Mục tiêu và định hướng

Trang `design/page_employer_dashboard/index.html` là trung tâm quản lý tuyển dụng đã đăng nhập. Ưu tiên đăng tin, xem hồ sơ theo vị trí và quản lý vòng đời tin thay vì các nội dung bán dịch vụ.

Phong cách: cổng tuyển dụng chuyên nghiệp, nền trắng và slate, điều hướng xanh navy, nút đăng tin màu cam. Giữ thương hiệu TimViecOnline và font Be Vietnam Pro của dự án. Điểm nhận diện là thanh điều hướng trắng có viền navy, sidebar và bảng tin đăng cùng các badge trạng thái nhẹ.

Người dùng yêu cầu tham khảo VietnamWorks. Đã thử truy cập `https://employer.vietnamworks.com/` và `https://www.vietnamworks.com.vn/`; môi trường trả 403/502, nên không xác nhận hoặc sao chép giao diện dashboard hiện tại của dịch vụ này.

## Hệ thống giao diện

- Màu dùng biến CSS: navy `#002b7f`, xanh `#005aff`, cam `#d84816`, nền `#f4f6f9`, chữ `#16243b`, chữ phụ `#64748b`.
- Font hiện có: Be Vietnam Pro, không thêm bộ font mới.
- Khoảng cách chính: 16 / 22 / 24 / 32px; bo góc 6–10px; chuyển màu nhẹ khi hover.
- Sidebar desktop, menu bật/tắt mobile; bảng tin chuyển thành thẻ dưới 600px.
- Có focus rõ, tab trạng thái hỗ trợ phím mũi tên/Home/End, dialog native và thông báo bằng live region. Tôn trọng reduced motion.

## Đối chiếu nghiệp vụ

- FR-04.1: liên kết sang trang hồ sơ công ty với tên, giới thiệu, địa chỉ, tỉnh/thành phố bắt buộc.
- FR-04.3: tin đã hết hạn cần sửa hạn trước khi mở lại.
- FR-04.5/04.6: trạng thái SQL `active`, `closed`, `expired`; đóng tin vẫn bảo lưu hồ sơ và hội thoại.
- FR-07: điểm phù hợp CV 0–100, liên kết đến hồ sơ đã ứng tuyển.
- FR-08/10: liên kết tin nhắn và thông báo tuyển dụng.
- KPI dùng số tin đang tuyển, hồ sơ đã nhận, CV phù hợp từ 80%, số trúng tuyển. Bỏ gói Pro và thống kê lịch phỏng vấn vì không có dữ liệu tương ứng trong SQL.

## Phạm vi tương tác

- Tab trạng thái, tìm không dấu, sắp xếp theo cập nhật/số hồ sơ/hạn nộp.
- Đóng/mở tin có dialog xác nhận; số hồ sơ được giữ nguyên.
- Hồ sơ công ty mở trang riêng `page_employer_profile`, có cả thông tin người quản lý tài khoản; thao tác lưu chưa triển khai.
- Menu mobile và Routes (18) hoạt động.
- Giữ liên kết đến các màn hình thiết kế đã có.

Đây là bản HTML tương tác, không kết nối API/MySQL, không lưu thay đổi sau khi tải lại. Metadata và KPI là dữ liệu minh họa nhất quán: 4 tin, 48 hồ sơ, 8 chưa xem. Tham số `job`, `application`, `edit` được đưa vào URL để thể hiện ngữ cảnh; trang đích hiện vẫn là các bản thiết kế độc lập.

## Kiểm chứng

- Chromium headless: tab trạng thái, từ khóa không dấu, sắp xếp, trạng thái rỗng/xóa lọc, đóng/mở tin, bảo lưu số hồ sơ, tin hết hạn. Luồng hồ sơ công ty đã chuyển sang trang riêng theo yêu cầu tiếp theo.
- Kiểm tra bàn phím cho tab, Escape đóng dialog/menu, và điều hướng mobile.
- 360 / 390 / 768 / 1024 / 1440px: không có tràn nội dung đáng kể (cho phép sai số làm tròn 1px).
- Xem ảnh desktop và mobile; kiểm tra các liên kết đến file nội bộ tồn tại.
- Không có lỗi JavaScript trong các luồng kiểm tra; `node --check` và `git diff --check` đạt.
- Chưa kiểm thử trình đọc màn hình, Firefox/Safari hoặc luồng API. Độ tương phản màu chính được chọn cho chữ trên nền sáng; chưa chạy công cụ audit WCAG tự động.
