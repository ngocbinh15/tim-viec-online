# Xác nhận email và thông báo qua email

Laravel Mail xử lý xác nhận địa chỉ sau đăng ký, quên mật khẩu, xác nhận đổi mật khẩu và hai loại thông báo tùy chọn bằng SMTP (Symfony Mailer). Dùng cùng cấu hình Gmail/SMTP hiện có. Email có bản HTML và text, nội dung tiếng Việt; không gửi mật khẩu, CV hoặc nội dung chat riêng tư.

## Gmail SMTP — cổng 465

Bật xác minh hai bước trong tài khoản Google và tạo **mật khẩu ứng dụng mới** tại [Google App Passwords](https://myaccount.google.com/apppasswords). Không sử dụng mật khẩu đăng nhập Gmail thông thường. Nếu một mật khẩu ứng dụng đã được chia sẻ trong chat, ảnh hoặc source code, thu hồi mã đó và tạo mã khác.

Nhập trực tiếp vào `backend/.env`:

```dotenv
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME=dia-chi-gmail-cua-ban@gmail.com
MAIL_PASSWORD=mat-khau-ung-dung-moi-khong-co-khoang-trang
MAIL_FROM_ADDRESS=dia-chi-gmail-cua-ban@gmail.com
MAIL_FROM_NAME="TimViecOnline"
MAIL_REQUIRE_TLS=true
MAIL_TIMEOUT=5

AI_ANALYSIS_ENABLED=false
```

Thay các giá trị minh họa bằng thông tin của bạn. `MAIL_FROM_ADDRESS` nên trùng tài khoản Gmail gửi. Bỏ `MAIL_URL` nếu có để tránh ghi đè các trường SMTP. Không đưa `MAIL_PASSWORD` vào frontend, ảnh chụp hoặc Git. `.env` đã được ignore.

Gmail cũng hỗ trợ cổng 587: đổi `MAIL_SCHEME=smtp`, `MAIL_PORT=587` và giữ `MAIL_REQUIRE_TLS=true` để yêu cầu STARTTLS. Laravel/Symfony hiện tại dùng `MAIL_SCHEME`, không dùng khóa cấu hình cũ `MAIL_ENCRYPTION`.

## Kiểm tra và chạy

Tại thư mục `backend`:

```powershell
php artisan config:clear
php artisan mail:check
```

Lệnh trên chỉ kiểm tra đủ cấu hình; **chưa đăng nhập SMTP hoặc gửi thư**. Để gửi thử, truyền địa chỉ hộp thư bạn kiểm soát:

```powershell
php artisan mail:check --to=dia-chi-nhan-cua-ban@example.com
```

Thông báo SMTP nhận thư không bảo đảm thư đã vào inbox: kiểm tra cả Thư rác/Spam. Lệnh không in mật khẩu, token hoặc lỗi SMTP thô. Khởi động lại `php artisan serve --port=8000` sau khi chỉnh cấu hình; dùng `config:cache` sau khi cấu hình production đã đúng. URL frontend được lưu trong config nên vẫn hoạt động khi cache.

Email xác nhận và khôi phục gửi đồng bộ với timeout SMTP hữu hạn. Email thông báo chạy qua queue riêng để không làm chậm chat. Timeout được giới hạn 1–8 giây mỗi thao tác socket; mặc định 5 giây. Đây không phải cam kết tổng thời gian gửi. Tránh mailer `failover` với đích `log` nếu cần xác nhận gửi thật.

Sau khi cập nhật code, chạy migration bổ sung (không reset dữ liệu) và giữ worker trong terminal riêng tại `backend`:

```powershell
php artisan migrate
php artisan queue:work database --queue=emails --sleep=1 --tries=3 --timeout=30
```

Với database cũ được import SQL, nếu `migrate:status` còn liệt kê `2026_10_23_000001_create_domain_tables` là pending trong khi các bảng nghiệp vụ đã tồn tại, không chạy lại migration tạo bảng đó. Chỉ áp dụng các migration email chưa chạy:

```powershell
php artisan migrate --path=database/migrations/2026_10_27_000002_add_notification_email_preferences_and_deliveries.php
php artisan migrate --path=database/migrations/2026_10_27_000005_create_email_verification_tokens_table.php
php artisan migrate --path=database/migrations/2026_10_27_000006_add_password_change_confirmation.php
```

Queue dùng kết nối `database` rõ ràng, kể cả khi queue mặc định của máy là `sync`. Nếu đã có worker AI/default, vẫn cần worker nhận queue `emails`. Sau khi cập nhật code/cấu hình, chạy `php artisan queue:restart` và khởi động lại worker; production cần process manager giữ worker hoạt động.

Chưa chạy worker thì thư thông báo chờ trong `queue_jobs`, còn chat và chuông thông báo vẫn hoạt động. Xem `php artisan queue:failed` khi có thư lỗi; chỉ retry sau khi sửa SMTP. Gửi qua SMTP có thể bị lặp nếu server nhận thư rồi tiến trình chết trước khi ghi nhận thành công; không cam kết giao thư đúng một lần ở nhà cung cấp.

## Thử luồng ứng dụng

1. Đăng ký bằng email bạn sở hữu: trang `/verify-email` hướng dẫn kiểm tra hộp thư. Mở liên kết và bấm **Xác thực email** để hoàn tất, sau đó đăng nhập. Liên kết hết hạn sau 60 phút, chỉ dùng một lần. Mở trang/tải lại trang chưa tiêu thụ liên kết.
2. Đăng xuất và mở `/forgot-password`, nhập email đó. Phản hồi giống nhau dù email có tồn tại để tránh dò tài khoản.
3. Mở thư khôi phục, bấm nút đặt lại mật khẩu. Liên kết về `FRONTEND_URL/reset-password`, có hạn 15 phút, chỉ dùng một lần; yêu cầu thư mới làm liên kết trước đó hết hiệu lực.
4. Đổi mật khẩu, đăng nhập với mật khẩu mới. Các phiên đăng nhập trước reset bị thu hồi. Mật khẩu cũ và liên kết đã dùng không còn hiệu lực.

### Đổi mật khẩu khi đang đăng nhập

1. Xác nhận email đăng ký trước tại `/verify-email`. Sau đó mở `/account/security` bằng tài khoản ứng viên, tuyển dụng hoặc admin; nhập mật khẩu hiện tại và mật khẩu mới. Sau khi bấm **Đổi mật khẩu**, trang báo đã gửi email xác nhận. Mật khẩu cũ và các phiên hiện có vẫn hoạt động. Tài khoản chưa xác nhận chỉ thấy hướng dẫn xác nhận email; backend từ chối yêu cầu đổi mật khẩu với 403 `email_verification_required`.
2. Mở email và liên kết `/confirm-password-change`. Kiểm tra địa chỉ tài khoản rồi bấm **Xác nhận đổi mật khẩu**. Chỉ mở thư hoặc tải lại trang chưa áp dụng thay đổi.
3. Sau xác nhận, mật khẩu mới có hiệu lực và toàn bộ phiên của tài khoản bị thu hồi; đăng nhập lại bằng mật khẩu mới. Trình duyệt đang đăng nhập tài khoản khác vẫn giữ phiên của tài khoản đó.

Liên kết có hạn **15 phút**, dùng một lần. Yêu cầu mới thay thế yêu cầu cũ. Liên kết mất hiệu lực khi đã reset/đổi mật khẩu hoặc đổi địa chỉ email, kể cả đổi về địa chỉ cũ. Database `password_change_requests` chỉ lưu hash mật khẩu mới, hash token và thông tin ràng buộc với tài khoản; không lưu mật khẩu mới dạng rõ và không đưa hash/token vào API response.

Yêu cầu đổi mật khẩu có giới hạn 1 lần/phút, 3 lần/15 phút mỗi tài khoản, kèm giới hạn IP; xác nhận có giới hạn IP riêng. SMTP lỗi trả thông báo gửi thất bại, giữ nguyên mật khẩu và phiên đăng nhập. Người dùng có thể gửi lại từ trang bảo mật sau thời gian chờ. Nếu không yêu cầu đổi mật khẩu, bỏ qua thư.

Quên mật khẩu cũng yêu cầu email đã xác nhận riêng từ trước. Email chưa xác nhận, không tồn tại hoặc tài khoản không hoạt động đều nhận phản hồi chung; không tạo token hay gửi thư khôi phục. Dùng `/verify-email` để yêu cầu thư xác nhận đăng ký trước. Khi trạng thái xác nhận bị thu hồi, liên kết reset/đổi mật khẩu đang chờ cũng không sử dụng được. Reset và đổi mật khẩu không tự cập nhật `email_verified_at`, kể cả khi thành công.

Migration mới bổ sung `user_id` và `credential_hash` vào `password_reset_tokens`. Các liên kết reset phát hành trước khi nâng cấp chưa có ràng buộc này cần yêu cầu lại thư mới. Không reset database hay tự xác nhận email của các tài khoản cũ.

Liên kết lỗi/hết hạn có nút yêu cầu liên kết mới. Nếu API tạm ngừng, giao diện báo chưa kiểm tra được liên kết thay vì kết luận đã hết hạn. Backend chỉ lưu hash token và không ghi URL/token vào log khi SMTP lỗi. Gửi thất bại sẽ xóa đúng token chưa giao, không xóa token của yêu cầu mới hơn.

Xác nhận email: gửi lại tối đa 1 lần/phút, 3 lần/15 phút theo địa chỉ, kèm giới hạn theo IP; đổi email trong hồ sơ cũng có giới hạn riêng theo tài khoản/IP. Không dùng chung bộ đếm với đăng nhập. Khôi phục mật khẩu giữ giới hạn 3 yêu cầu/15 phút theo email giữa các alias.

SMTP lỗi không xóa tài khoản đăng ký. Người dùng vẫn đăng nhập, sửa hồ sơ và yêu cầu gửi lại tại `/verify-email`. Backend yêu cầu xác nhận trước khi ứng tuyển, đăng/sửa/mở lại tin hoặc bắt đầu/gửi tin nhắn. Các tài khoản cũ chưa có `email_verified_at` cũng xác nhận bằng hộp thư của mình; migration không giả lập việc xác nhận và không tự gửi thư hàng loạt. Đổi mật khẩu hoặc reset mật khẩu không tự đánh dấu email đã xác nhận.

## Cài đặt thông báo của ứng viên

Mở `/account/settings`, xác nhận email rồi bật **Trạng thái ứng tuyển** và/hoặc **Tin nhắn mới**. Mặc định tắt; tải lại trang vẫn giữ lựa chọn. Có thể tắt bất kỳ lúc nào, kể cả khi địa chỉ mới chưa xác nhận.

- Trạng thái hồ sơ: gom thay đổi trong 10 giây và gửi trạng thái mới nhất còn đúng.
- Tin nhắn: gom trong 60 giây kể từ tin mới nhất của cùng hội thoại; bỏ qua nếu đã đọc trước lúc gửi.
- Worker kiểm tra lại lựa chọn, email đã xác nhận, địa chỉ chưa đổi, tài khoản còn hoạt động và quyền sở hữu. Tắt email không tắt thông báo trên web.

Database lưu lựa chọn ở `users.email_notifications`, token băm ở `email_verification_tokens`, trạng thái gom/giao thư ở `notification_email_deliveries`. Không cần thêm field xác nhận mới: dùng `users.email_verified_at` đã có.

## Khi chưa nhận được thư

- Kiểm tra `MAIL_MAILER=smtp`. `log` ghi thư vào log; `array` chỉ giữ trong bộ nhớ, không giao thư.
- Gmail báo sai xác thực: tạo lại App Password, nhập đủ 16 ký tự không có dấu cách; kiểm tra chính sách tài khoản Google Workspace. Không bật SMTP debug trên giao diện.
- Kết nối timeout: kiểm tra mạng/firewall có cho kết nối ra cổng 465/587; XAMPP/PHP cần OpenSSL và chứng chỉ CA hợp lệ. Không tắt xác minh chứng chỉ để sửa lỗi.
- Thư trỏ sai địa chỉ: kiểm tra `FRONTEND_URL`, xóa cache config và yêu cầu **thư mới**.
- Hộp thư không thuộc bạn hoặc địa chỉ gõ sai: dùng địa chỉ bạn kiểm soát, không thử gửi hàng loạt.

## Kiểm thử tự động

Backend có regression tests cho xác nhận, phân quyền tài khoản chưa xác nhận, token băm/hết hạn/dùng lại, đổi email, tùy chọn, gom thư, lỗi SMTP/queue và kiểm tra lại lúc giao. `npm run test:backend` trong frontend khởi chạy SMTP sink chỉ bind `127.0.0.1:8129`, không relay ra Internet; chỉ nhận `*@frontend-e2e.test`. Thư nằm trong storage kiểm thử đã ignore, dùng database riêng `frontend_api_e2e_test` trên cổng 33063. Không dùng bộ thử nghiệm này làm cấu hình chạy ứng dụng.

Tham khảo: [Gmail SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp), [Google App Passwords](https://support.google.com/accounts/answer/185833), [Laravel 12 Mail](https://laravel.com/docs/12.x/mail), [Symfony TLS](https://symfony.com/doc/current/mailer.html#ensure-tls).
