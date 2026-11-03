# Xuất danh sách ứng viên

Nhà tuyển dụng mở **Tin tuyển dụng**, chọn các tin cần xuất rồi bấm **Xuất danh sách**. Mỗi dòng tin cũng có nút xuất riêng.

- **Một file Excel:** mỗi tin nằm trong một sheet, kể cả tin chưa nhận hồ sơ.
- **File riêng:** mỗi tin có một file Excel. Khi chọn nhiều tin, hệ thống gói các file vào ZIP.

Mỗi lần chọn tối đa 50 tin, với tổng tối đa 50.000 hồ sơ. File chứa toàn bộ hồ sơ của những tin đã chọn, bao gồm hồ sơ đã rút và hồ sơ của tin đã đóng; bộ lọc trang tin không lọc các dòng trong file. Xuất danh sách không đánh dấu hồ sơ đã xem.

Các cột gồm mã hồ sơ, họ tên, email, điện thoại, vị trí ứng viên, địa điểm, số năm kinh nghiệm, kỹ năng, ngày nộp, trạng thái và điểm AI đã có. Không kèm file CV hoặc đường dẫn lưu trữ riêng.

Bảng Excel có bộ lọc ở hàng tiêu đề, cố định tiêu đề và ba cột đầu khi cuộn. Các dòng dùng màu nền xen kẽ; trạng thái hồ sơ có màu riêng. Cột liên hệ không tự ngắt dòng, còn kỹ năng xuống dòng trong ô và vẫn giữ nguyên nội dung đầy đủ.

API: `POST /api/employer/applications/export`, yêu cầu phiên đăng nhập nhà tuyển dụng.

```json
{
  "job_ids": [12, 18],
  "mode": "workbook"
}
```

`mode` nhận `workbook` hoặc `separate`. Khi chỉ chọn một tin, cả hai chế độ đều trả về XLSX. Nếu có tin không thuộc công ty của người tải, toàn bộ yêu cầu bị từ chối. File được tạo trong thư mục riêng và xóa sau khi gửi.
