# Bộ lọc trang việc làm HTML

## Phạm vi đã thống nhất

- Chỉnh bản thiết kế `design/page_jobs/index.html`, bỏ ô Lĩnh vực theo yêu cầu.
- Giữ font Be Vietnam Pro, màu xanh thương hiệu và bố cục hiện tại.
- Dropdown có tìm kiếm, danh sách cuộn, trạng thái lựa chọn và hỗ trợ bàn phím.
- Ngành nghề chọn nhiều; cấp bậc và mức lương chọn một.
- Bộ lọc mở rộng chứa từ khóa, địa điểm, hình thức làm việc và lương.
- Lọc ngay các thẻ mẫu, cập nhật số kết quả, hiển thị trạng thái rỗng và xóa bộ lọc.

## Quyết định

- Dùng HTML/CSS/JavaScript thuần phù hợp bản thiết kế hiện tại; chưa chuyển trang sang Next.js.
- Xóa Lĩnh vực thay vì bổ sung bảng dữ liệu mới: SQL chưa có trường này.
- Dùng checkbox ngành nghề theo SRS FR-05.2; dùng radio cấp bậc và lương.
- Áp dụng ngưỡng lương đúng FR-05.3, không đưa tin thỏa thuận vào khoảng lương số.
- Bỏ phân trang giả 45 trang vì chỉ có bốn thẻ mẫu; số kết quả phản ánh dữ liệu đang lọc.
- Dữ liệu danh mục có năm ngành trong SQL và hai ngành bổ sung để mô tả các thẻ thiết kế có sẵn. Các khóa này là khóa bản thiết kế, không phải ID database.

## Giả định và giới hạn

- Đây là tương tác trên dữ liệu mẫu, chưa gọi API hoặc đọc MySQL. Backend chưa có endpoint jobs/categories.
- Cấp bậc và hình thức làm việc của các thẻ là metadata minh họa; bốn thẻ hiện đều toàn thời gian.
- Đã bỏ tùy chọn lọc Tuyển gấp theo yêu cầu; nhãn trên thẻ việc làm vẫn giữ nguyên.
- Không đo hiệu năng hoặc độ sẵn sàng backend. Khi tích hợp thật cần phân trang và xác thực tham số ở API để đáp ứng NFR-01 (95% yêu cầu dưới 1,5 giây với 50 người dùng đồng thời).
- Nội dung tìm kiếm do người dùng nhập không được chèn bằng HTML; tên lựa chọn được tạo bằng text node.
- Tách CSS và logic thành `filters.css` và `filters.js` để dễ bảo trì.

## Kiểm tra

- Chromium headless: chọn nhiều ngành, tìm danh mục không dấu, lọc lương, cấp bậc, địa điểm, hình thức và từ khóa.
- Kiểm tra trạng thái không kết quả, xóa bộ lọc, Escape đóng dropdown và trả focus về nút mở.
- Kiểm tra dropdown ở 360px, 390px, 768px và xem ảnh desktop 1440px.
- Không có lỗi JavaScript khi thực hiện các luồng kiểm tra; `node --check` và `git diff --check` đạt.
- Chưa kiểm tra bằng trình đọc màn hình hoặc trên Firefox/Safari.
