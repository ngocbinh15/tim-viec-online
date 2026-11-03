# Hiệu suất tải trang và nhắn tin

Đợt tối ưu ngày 27/10/2026 sử dụng database demo đang có: 1.626 tài khoản, 121 công ty, 1.441 tin, 22.500 đơn và 60.000 tin nhắn. Không reset dữ liệu.

## Chạy local

Trong `backend/`, mở API bằng:

```bash
php scripts/serve-local.php --port=8000
```

Script sử dụng router của Laravel, bật OPcache nếu PHP có extension và kiểm tra thay đổi mã nguồn ở mỗi request. Không thay đổi `php.ini` hoặc `.env`. Đây vẫn là server phát triển, không thay thế Apache/PHP-FPM khi triển khai.

Mở terminal khác và giữ Reverb chạy để gửi/nhận trực tiếp:

```bash
php artisan reverb:start
```

Frontend có thể dùng `npm run dev`. Để đo tốc độ bản đã biên dịch trong `frontend/`:

```bash
npm run build
npm start
```

### Trang mắc ở loading và liên tục tải lại khi chạy dev

Nếu log có `HMR hash mismatch`, liên tục `Compiled` dù không sửa file, hoặc lỗi Suspense kèm tải lại trang, hãy dừng frontend bằng `Ctrl+C`. Sau đó chạy trong thư mục `frontend/`:

```powershell
if (Test-Path -LiteralPath '.next/dev') {
    Move-Item -LiteralPath '.next/dev' -Destination ('.next/dev-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
}
npm run dev
```

Lệnh trên giữ lại cache cũ và tạo lại cache phát triển, không thay đổi database hay `.env`. Khi server báo Ready, tải lại trình duyệt bằng `Ctrl+Shift+R`. Chỉ chạy một frontend trên cổng 3000; dừng server dev trước khi chạy `npm start`.

Lượt kiểm tra ngày 29/10/2026: trước khi tạo lại cache, trình duyệt lặp `HMR hash mismatch` và mắc ở loading. Sau khi tạo lại cache: trang đăng nhập, trang chủ, danh sách việc làm và chuyển hướng tài khoản chưa đăng nhập tải thành công; theo dõi thêm 12 giây không có lỗi JavaScript hoặc tự tải lại. Đây là kết quả kiểm tra local, không phải kiểm thử tải hay xác nhận toàn bộ phiên đăng nhập.

## Các thay đổi

- Giới hạn thời gian kết nối và phát sự kiện Reverb/Pusher. Một server WebSocket không truy cập được không còn giữ request gửi tin hàng chục giây. Tin và thông báo vẫn được lưu; WebSocket phải chạy để người nhận có cập nhật trực tiếp.
- Giao diện hiển thị tin đang gửi ngay, cập nhật theo phản hồi và sự kiện, gộp theo ID. Tin thất bại có nút thử lại; bản nháp mới không bị xóa và không tự động gửi lại POST.
- Chỉ xác thực kênh người dùng và hội thoại đang mở, thay vì hàng chục kênh hội thoại cùng lúc. Tin/biên nhận đọc cập nhật trực tiếp; thông báo của hội thoại khác chỉ tải phần xem trước cần thiết.
- Lịch sử mở với 50 tin gần nhất; nút xem cũ tải từng phần và giữ vị trí cuộn. API hỗ trợ `latest`, `before_id`, `after_id`, giữ tương thích phân trang cũ và kiểm tra thành viên phòng.
- `GET /api/workspace/bootstrap` ghép dữ liệu theo vai trò trong một request riêng tư. Các bộ sưu tập không bị cắt theo giới hạn trang đầu. Admin không nhận lặp lại thông tin công ty/hồ sơ ứng viên trong từng tin; frontend chỉ chuyển những trường cần thiết xuống trình duyệt.
- Gộp truy vấn đếm chưa đọc, bỏ truy vấn người dùng theo từng thông báo, giảm dữ liệu ứng viên được nạp cho danh sách chat. Biểu đồ admin dùng hai truy vấn tổng hợp theo ngày.
- Danh mục và danh sách công khai có cache ngắn, tách theo backend đang kết nối. Thay đổi tin/công ty/danh mục qua frontend xóa cache liên quan. Nội dung riêng tư luôn dùng phiên hiện tại và không dùng cache chung; lượt xem chi tiết tin vẫn được ghi nhận.
- Migration `2026_10_27_000001_add_workspace_query_indexes.php` thêm index phục vụ hội thoại, thông báo, thống kê. Database import SQL cũ có thể áp dụng riêng migration này sau khi sao lưu:

  ```bash
  php artisan migrate --path=database/migrations/2026_10_27_000001_add_workspace_query_indexes.php
  ```

## Kết quả đo local

### Tải và chuyển trang admin (bổ sung 27/10)

- Layout/provider chỉ tải snapshot quản trị một lần khi vào workspace. Các trang con vẫn kiểm tra phiên/vai trò, nhưng không tải lại toàn bộ snapshot khi điều hướng; thao tác cập nhật vẫn làm mới dữ liệu từ API.
- Bootstrap chỉ lấy các cột tóm tắt tin từ MySQL, không gửi mô tả/yêu cầu/quyền lợi của mọi tin. Trang chi tiết lấy nội dung đầy đủ riêng. Bỏ dữ liệu ứng tuyển/người dùng lặp lại trong thống kê bootstrap và các quan hệ ứng tuyển không dùng ở endpoint chi tiết.
- Skeleton gồm khung admin cho lần vào đầu và các bố cục riêng cho tổng quan, tài khoản, kiểm duyệt, danh mục, chi tiết. Header/sidebar giữ nguyên khi chuyển trang; skeleton hỗ trợ màn hình nhỏ và giảm chuyển động.
- Mẫu đo API trên database local có 1.627 tài khoản và 1.441 tin: bootstrap giảm từ **5.521.544 xuống 1.589.794 byte**, khoảng **71%**. Một lượt đọc lần lượt mất 1,69 và 1,41 giây; đây không phải phép đo P95 hay tải đồng thời.
- `npm run test:admin-performance` trong `frontend/` chạy API fixture riêng: đếm bootstrap khi chuyển trang, làm chậm xác thực/chi tiết để kiểm tra skeleton, kiểm tra nội dung chi tiết và phiên hết hạn. Fixture này không dùng database phát triển.

### Đợt tối ưu tổng thể

Các số dưới đây là mẫu đo tải đủ HTTP response trên cùng máy và bộ dữ liệu; không phải P95 hay kiểm thử 50 người đồng thời. Sau tối ưu dùng API có OPcache và frontend production, lượt đầu có thể chậm hơn khi cache chưa ấm.

| Trang | Trước | Sau |
|---|---:|---:|
| Trang chủ | 1,84 giây | 0,18 giây |
| Danh sách việc làm | 1,73 giây | 0,24 giây |
| Chi tiết việc làm | 2,22 giây | 0,26 giây |
| Tin nhắn ứng viên | 3,89 giây | 1,25 giây |
| Tin nhắn nhà tuyển dụng | 7,26 giây | 0,97 giây |
| Tổng quan admin | 16,01 giây | 1,94 giây |

Kiểm tra trình duyệt trên tài khoản demo có 60 hội thoại: hai yêu cầu xác thực WebSocket, thay vì đăng ký toàn bộ hội thoại. Bộ kiểm thử tích hợp kiểm tra sự kiện WebSocket thật, hai vai trò gửi/nhận, ảnh riêng tư, pending/thử lại và tải lịch sử cũ.

### Giữ ổn định khung chat (27/10)

- Đồng bộ nền không chèn/xóa dòng tải trong lịch sử đã mở; chỉ lần tải đầu và thao tác xem tin cũ mới hiển thị trạng thái tải.
- Khi gửi tin, chỉ đưa xuống cuối và đặt con trỏ lúc bắt đầu gửi. Phản hồi chậm không tự kéo người đang đọc tin cũ xuống cuối hoặc giành lại con trỏ.
- Hai vai trò dùng chung khung ảnh có tỷ lệ cố định để ảnh xem trước và ảnh tải từ API chiếm cùng không gian. Khung chat ứng viên tắt cuộn neo tự động của trình duyệt để không tranh chấp với cơ chế giữ vị trí hiện có.
- Đã tái hiện regression dòng tải xuất hiện khi đồng bộ nền. Sau sửa: 7 kiểm thử chat với Laravel/Reverb trên database riêng, 115 unit tests, ESLint và production build đạt. Kiểm thử vị trí so sánh tọa độ nội dung trước/trong/sau đồng bộ và sau xác nhận gửi chậm (sai lệch tối đa 1 px); đây không phải phép đo FPS hay tải đồng thời.
