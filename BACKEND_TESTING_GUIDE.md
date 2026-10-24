# Hướng dẫn kiểm thử backend

Hướng dẫn kiểm thử theo [SRS](docs/SRS.md), các tuyến API hiện tại và hợp đồng tại [API_CHECKLIST.md](API_CHECKLIST.md). Một trường hợp chỉ đạt khi mã trạng thái, nội dung phản hồi, thay đổi cơ sở dữ liệu/tệp/sự kiện và phân quyền đều đúng.

## 1. Kết quả và phạm vi môi trường

Đã chạy migration cùng dữ liệu mẫu trên một cơ sở dữ liệu MySQL thử nghiệm riêng; không sử dụng cơ sở dữ liệu mặc định. Đã bổ sung 10 kiểm thử chức năng cốt lõi theo FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-08, FR-09; tổng cộng 53 assertions, không có lỗi. Bộ kiểm thử dùng dữ liệu/tệp giả lập, giả lập email và không gọi Gemini/Reverb bên ngoài. PHP 8.5 vẫn ghi nhận cảnh báo deprecated từ cấu hình PDO của Laravel/vendor.

Kiểm tra API trực tiếp: Postman CLI gọi `GET /api/categories` (200, 1 assertion đạt); gọi HTTP đăng ký hợp lệ trả 201; API hồ sơ khi chưa đăng nhập trả 401. Chưa gửi email SMTP thật vì mailer đang ghi log; chưa gọi Gemini vì thiếu khóa API. Reverb đã được kiểm thử đầu-cuối cục bộ: xác thực kênh riêng, ứng tuyển trả 201 và client nhận sự kiện thông báo. Chuyển CV cũ chỉ thử bằng tệp giả lập. Bài tải 50 yêu cầu đồng thời qua `artisan serve` có 0 lỗi, p95 1.970 giây; máy chủ phát triển đơn luồng không đại diện môi trường triển khai và chưa đạt bằng chứng NFR.

Cơ sở dữ liệu thử nghiệm hiện dùng tên `tim_viec_online_fr_test_20261023_144851`. Chỉ chạy migration/reset vào cơ sở dữ liệu riêng này; tuyệt đối không thay tên đích bằng DB cần giữ.

Các lệnh kiểm tra:

```powershell
cd backend
php artisan route:list --path=api
php artisan migrate:status
php artisan test
composer validate --no-check-publish
```

`php artisan test` hiện chạy 10 kiểm thử nghiệp vụ mới cùng 2 bài mẫu. Xem kết quả phía trên để phân biệt bài đạt với cảnh báo deprecated.
## 2. Chuẩn bị môi trường kiểm thử riêng biệt

1. Tạo database MySQL riêng, ví dụ `tim_viec_online_test`; không dùng thông tin đăng nhập hay dữ liệu vận hành.
2. Dùng `MAIL_MAILER=array`, `QUEUE_CONNECTION=sync` hoặc queue riêng, `BROADCAST_CONNECTION=log`, `FILESYSTEM_DISK=local`; không cấu hình khóa Gemini thật.
3. Chỉ chạy `migrate:fresh --seed` sau khi xác minh rõ ràng rằng `DB_DATABASE` là database thử nghiệm có thể xóa.
4. Dùng tài khoản, công ty, tin, CV giả lập; cô lập tệp bằng `Storage::fake` và email bằng `Mail::fake`. Không gửi email thật hoặc dùng CV cá nhân.
5. Lưu yêu cầu đã loại bí mật, phản hồi, mã trạng thái, thay đổi dữ liệu và nhật ký cho từng trường hợp.

## 3. Ma trận kiểm tra theo FR

### FR-01 Đăng ký

- Ứng viên/nhà tuyển dụng hợp lệ: 201, user vai trò chính xác, mật khẩu hash, hồ sơ/công ty được tạo cùng transaction, phản hồi không có token/mật khẩu.
- Duplicate email kể cả khác hoa thường; email sai; vai trò admin; name boundary/ký tự; mật khẩu min/max/complexity/confirmation; phone; thiếu DOB, DOB đủ 15 tuổi và trẻ hơn 15.
- Mail thành công và thất bại: lỗi mail không tạo mật khẩu/token leak; client điều hướng login. giới hạn tần suất 5/phút.

### FR-02 Đăng nhập, khóa tạm thời và đặt lại mật khẩu

- email không tồn tại/sai mật khẩu cùng trạng thái/tin nhắn; 4 lần sai chưa lock, lần thứ 5 lock 15 phút, đúng mật khẩu đặt lại count; lock hết hạn được login. Dùng đồng hồ giả lập.
- Quản trị viên lock/unlock; lock thu hồi mọi Sanctum token. Logout chỉ thu hồi token hiện hành.
- Forgot email tồn tại/không tồn tại cùng phản hồi chung; giới hạn tần suất; đặt lại mail chỉ chứa token thô/đường dẫn; phản hồi API không có `token`/`reset_url`; DB chỉ giữ hash.
- xác minh/đặt lại hợp lệ, sai email/token, hết hạn ở biên, token dùng lại, mật khẩu rules, đặt lại thu hồi toàn bộ token. Change mật khẩu: mật khẩu hiện tại sai, confirmation, mật khẩu mới trùng mật khẩu cũ, token hiện tại giữ lại và token khác bị thu hồi.
- Mail lỗi được log, không tiết lộ sự tồn tại của tài khoản. email cảnh báo lock là được hoãn theo SRS.

### FR-03 Hồ sơ ứng viên và CV

- Ứng viên chỉ xem/sửa hồ sơ của chính mình; tính duy nhất/chuẩn hóa email, DOB >=15, ID kỹ năng phải tồn tại, tối đa 10 kỹ năng, đồng bộ khi gửi danh sách rỗng.
- PDF hợp lệ, đuôi/MIME giả mạo, rỗng/hỏng/dạng ảnh quét, >5MB; ảnh đại diện đúng định dạng/tối đa 2MB; lỗi lưu tệp; thay/xóa tệp cũ.
- Ứng viên CV endpoint chỉ trả CV của token hiện tại. hồ sơ ứng tuyển CV: ứng viên sở hữu hồ sơ, đúng công ty của nhà tuyển dụng, admin được phép; khách chưa đăng nhập/nhà tuyển dụng khác/ứng viên khác bị từ chối. Xác nhận `Content-Type`, `Cache-Control: private, không lưu bộ nhớ đệm`, không có đường dẫn công khai.
- Chạy migration cũ trên bản sao dữ liệu; kiểm tra SHA-256 giống; thử hoàn tác/khôi phục trước `--delete-source`; kiểm tra đường dẫn trực tiếp `/storage` không còn cung cấp CV sau khi di chuyển.

### FR-04 Công ty và tin tuyển dụng

- Điều kiện công ty phải hoàn thiện; nhà tuyển dụng không được sửa tin của công ty khác. Tiêu đề tin/danh mục/loại/số lượng/hạn nộp/thành phố/kỹ năng, `salary_type`, lương thỏa thuận, min/max, min>max và biên zero.
- Hạn hôm qua phải bị từ chối, hôm nay dùng hết ngày; danh sách công khai loại bỏ đã đóng/đã hết hạn; đóng tin phải chặn ứng tuyển/ẩn khỏi danh sách; quy tắc mở lại; chi tiết tin và cuộc trò chuyện/hồ sơ ứng tuyển hiện có theo SRS.
- `php artisan jobs:expire` chỉ đổi đang hoạt động tin tuyển dụng quá hạn sang `expired`; chạy nhiều lần không tạo tác động phụ. Schedule chạy 00:05 mỗi ngày; kiểm tra bộ lập lịch trên môi trường thử nghiệm.
- Migration trên cơ sở dữ liệu mới tạo đủ FK/index/unique; hoàn tác migration nghiệp vụ đúng thứ tự; nạp dữ liệu mẫu từ cơ sở dữ liệu sạch. So sánh lược đồ SQL dump với các migration.

### FR-05 Tìm kiếm và lưu tin

- Từ khóa tiêu đề/công ty/kỹ năng, Unicode/có dấu/không dấu; danh mục một giá trị/chuỗi phân tách dấu phẩy/mảng; city, tin tuyển dụng type, kỹ năng IDs; ID/loại/trang/số mục mỗi trang không hợp lệ.
- lương `under_10`, `10_20`, `over_20`, `negotiable`; kiểm tra ranh giới 10m/20m, chỉ có mức lương tối thiểu, mức tối đa rỗng, tin ẩn/lương thỏa thuận.
- sắp xếp/phân trang; save idempotent; unsave missing; kiểm tra vai trò; chỉ áp dụng cho tin đang hoạt động. Xác minh chỉ mục bằng EXPLAIN và đo hiệu năng riêng với dữ liệu đại diện.

### FR-06 Hồ sơ ứng tuyển

- Khách chưa đăng nhập 401; nhà tuyển dụng/admin 403; ứng viên chưa có hồ sơ/CV; CV trong hồ sơ/CV mới tải lên; không hợp lệ CV; không hoạt động/quá hạn; tự ứng tuyển; gửi trùng kể cả hồ sơ đã rút; các yêu cầu trùng đồng thời chỉ tạo một bản ghi.
- Nhà tuyển dụng list/chi tiết chỉ thuộc tin tuyển dụng mình; lần xem đầu `applied→waiting` và thời điểm xem xét; các chuyển trạng thái được phép/bị từ chối; thông báo được gửi đúng người nhận.
- rút chỉ `applied` và chưa review; không thể rút hồ sơ đang chờ/được nhận/bị từ chối. Giả lập lỗi đưa tác vụ vào hàng đợi sau khi lưu: đơn vẫn có trạng thái đang chờ xử lý/thất bại theo quy tắc đã chọn, không trả lỗi gây client gửi trùng.
- Xác nhận policy `withdrawn` không được apply lại; SRS hiện ghi rõ 5 trạng thái và quy tắc này.

### FR-07 Phân tích AI

- Đưa tác vụ vào hàng đợi sau khi ứng tuyển; trạng thái đang chờ xử lý/hoàn tất/thất bại; GET trả 202/200/422 tương ứng; Gửi yêu cầu thử lại không tạo phân tích trùng lặp.
- `Http::fake`: Gemini JSON đúng định dạng, sai định dạng/thiếu trường, mã phản hồi khác 2xx, timeout, không có khóa API; kết quả cơ chế dự phòng trong 0–100, riêng tư CV đọc được, lỗi nhà cung cấp không bị lộ.
- trích xuất văn bản từ PDF; scanned/empty/corrupt thông báo rõ; tóm tắt/kỹ năng/tiêu chí đề xuất; quá thời gian/thử lại/tác vụ lỗi; hành vi khi tiến trình xử lý nền dừng hoặc tồn đọng tác vụ.
- Chỉ dùng CV giả lập khi kiểm tra Gemini thật, theo dõi quota, độ trễ và mô hình đã cấu hình; không chấm quyết định tuyển dụng tự động.

### FR-08 Trò chuyện

- Tạo cuộc trò chuyện chỉ từ hồ sơ ứng tuyển hợp lệ, ứng viên/nhà tuyển dụng đúng cặp; người ngoài không được liệt kê/đọc/gửi tin/tham gia kênh riêng tư.
- tin nhắn 1..1000, cắt khoảng trắng/để trống, ảnh-chỉ, tin nhắn+ảnh, MIME/kích thước không hợp lệ, lỗi lưu tệpure; trường nội dung tin nhắn trong cơ sở dữ liệu cho phép rỗng; đường dẫn ảnh/quy tắc truy cập.
- Xác nhận đã đọc chỉ đánh dấu tin nhắn nhận được; channel xác thực `/api/broadcasting/auth`; xác nhận riêng việc ghi cơ sở dữ liệu và phát sự kiện; Reverb down không làm mất tin nhắn, nhật ký ghi nhận lỗi thời gian thực.
- Tải ảnh chat chỉ cho thành viên cuộc trò chuyện; đường dẫn trực tiếp `/storage/chat_images/...` không cung cấp ảnh mới; cũ images cần chuyển bằng `storage:secure-legacy-cvs`.
- Đo thời gian đầu-cuối để xác nhận SRS <1s với Reverb/client thực.

### FR-09 Quản trị viên / báo cáo

- Không admin 403 cho tất cả admin routes; admin list/chi tiết/xóa tin tuyển dụng, lock/unlock user, danh mục/kỹ năng CRUD, stats date range.
- Submit báo cáo requires xác thực/reason/chi tiết; không hợp lệ tin tuyển dụng, self-báo cáo công ty tin tuyển dụng, duplicate 409, báo cáo trạng thái đang chờ xử lý và `is_reported=true`.
- Quản trị viên resolve/dismiss, reviewer/timestamp; tin tuyển dụng flag giữ khi còn đang chờ xử lý, clear khi không còn; người không admin không xử lý báo cáo.

### FR-10 Thông báo

- Các sự kiện ứng tuyển/trạng thái/chat/bảo mật/quản trị kích hoạt thông báo; người nhận/nội dung/loại/dữ liệu; danh sách có phân trang/số chưa đọc; đánh dấu một/tất cả đã đọc; chỉ xóa thông báo của chính mình; another user's ID inaccessible.
- Xác nhận sự kiện chỉ phát một lần; Reverb lỗi phát sự kiện so với việc lưu trong cơ sở dữ liệu; bộ lọc truy vấn được kiểm tra; không tạo trùng khi thử lại nếu áp dụng.

## 4. Kiểm tra phi chức năng và bảo mật

- Ma trận phân quyền: unauthenticated 401, wrong vai trò 403, không đúng chủ sở hữu/thành viên 403/404; không làm lộ sự tồn tại/dữ liệu.
- Đầu vào thử SQL injection phải dùng truy vấn có tham số; việc thoát đầu ra/chống XSS phải được xác minh trên giao diện. MIME/kích thước tệp tải lên và chính sách bộ nhớ đệm riêng tư; secrets/tokens absent from nhật ký/phản hồi.
- Tải theo NFR: bộ dữ liệu đã thống nhất, 50 kết nối đồng thời, p95 <=1.5s, tỷ lệ lỗi, ảnh hưởng đến hàng đợi; chat <1s; thời gian hoạt động 99% trong khoảng thời gian đã thống nhất. These are cần đo trong môi trường thực tế, không thể kết luận chỉ từ unit kiểm thử.
- Sao lưu/khôi phục: DB + riêng tư/công khai storage, diễn tập khôi phục và kiểm tra quyền truy cập CV sau khôi phục.

## 5. Thao tác cần tránh hoặc chú ý

Không chạy `backend/test_all_backend.php`: script cũ thay đổi/xóa account/tin tuyển dụng/token và không có cơ chế cô lập/dọn dữ liệu đáng tin cậy. Không chạy `migrate:fresh` vào cơ sở dữ liệu có dữ liệu cần giữ. Không xóa cũ công khai CV bằng `--delete-source` khi chưa sao lưu và xác minh bản sao và có rollback.
