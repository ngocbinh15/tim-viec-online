# ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
## Hệ thống Tìm kiếm Việc làm Online

## 1. Thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| **Khách** | Người dùng chưa đăng nhập vào hệ thống |
| **Ứng viên (Candidate)** | Người tìm việc có tài khoản cá nhân, hồ sơ kỹ năng và file CV |
| **Nhà tuyển dụng (Employer)** | Doanh nghiệp có tài khoản, hồ sơ công ty và quyền đăng tin tuyển dụng |
| **Quản trị viên (Admin)** | Người quản trị hệ thống, có quyền duyệt tin tuyển dụng và khóa tài khoản |
| **JD (Job Description)** | Bản mô tả công việc, yêu cầu kỹ năng, kinh nghiệm và chế độ đãi ngộ |
| **CV (Curriculum Vitae)** | Hồ sơ lý lịch năng lực của ứng viên, định dạng file PDF |
| **Match Score** | Điểm số tương thích giữa CV của ứng viên và tin tuyển dụng do AI chấm (0 - 100%) |
| **WebSocket** | Giao thức truyền dữ liệu hai chiều tức thời phục vụ chức năng nhắn tin |

---

## 2. Mô tả tổng quan

### 2.1. Nhóm người dùng

| Nhóm | Quyền hạn |
|---|---|
| **Khách** | Xem trang chủ, tìm kiếm và lọc việc làm, xem chi tiết tin tuyển dụng và thông tin công ty, đăng ký tài khoản. |
| **Ứng viên** | Toàn bộ quyền của Khách, kèm theo: Cập nhật hồ sơ cá nhân, tải lên CV PDF, lưu việc làm yêu thích, nộp hồ sơ ứng tuyển, nhắn tin realtime với nhà tuyển dụng của tin đã nộp. Không được xem hoặc kích hoạt đánh giá AI. |
| **Nhà tuyển dụng** | Toàn bộ quyền của Khách, kèm theo: Cập nhật thông tin công ty, đăng tin tuyển dụng, đóng/mở tin, xem danh sách ứng viên đã nộp, xem trước và tải CV, cập nhật trạng thái duyệt hồ sơ, nhắn tin realtime với ứng viên. |
| **Quản trị viên** | Xem dashboard thống kê, kiểm tra và xử lý tin tuyển dụng bị báo cáo, khóa hoặc mở khóa tài khoản người dùng, quản lý danh mục ngành nghề và kỹ năng. Tin mới được đăng ở trạng thái `active` theo FR-04.5; quy trình phê duyệt trước khi đăng không thuộc phiên bản này. |

### 2.2. Ràng buộc chung
- Người dùng đăng ký tài khoản phải từ [**15 tuổi trở lên**.](https://thuvienphapluat.vn/chinh-sach-phap-luat-moi/vn/ho-tro-phap-luat/tu-van-phap-luat/43713/quy-dinh-ve-do-tuoi-lao-dong-cua-nguoi-lao-dong-hien-nay)
- File CV tải lên bắt buộc phải là định dạng **PDF**, dung lượng tối đa **5 MB**.
- Đơn vị tiền tệ: **Việt Nam đồng (VNĐ)**.
- Hệ thống là ứng dụng web tương thích tốt trên các trình duyệt Chrome, Edge, Firefox, Safari và hỗ trợ hiển thị trên thiết bị di động có chiều rộng màn hình từ **360px** trở lên.
- **Phạm vi cập nhật 29/10/2026:** Bổ sung trình tạo CV theo mẫu (nhập liệu, xem trước, tự lưu, xuất PDF và ứng tuyển). Upload PDF hiện có tiếp tục hoạt động. Chưa hỗ trợ kéo thả tọa độ tự do, chia sẻ CV công khai hoặc AI viết lại nội dung CV.

---

## 3. Yêu cầu chức năng

### FR-01. Đăng ký tài khoản

| Mã | Yêu cầu |
|---|---|
| FR-01.1 | Người dùng đăng ký bằng cách nhập: Họ tên, Email, Ngày sinh, Mật khẩu, Xác nhận mật khẩu, Số điện thoại (tùy chọn) và Vai trò (`Ứng viên` hoặc `Nhà tuyển dụng`). Ngày sinh bắt buộc để xác minh ràng buộc tối thiểu 15 tuổi ở mục 2.2. |
| FR-01.2 | Họ tên là thông tin bắt buộc, độ dài từ **2 đến 100 ký tự**, không chứa ký tự đặc biệt ngoài khoảng trắng và dấu gạch nối. |
| FR-01.3 | Email phải đúng định dạng chuẩn RFC (ví dụ: `user@example.com`) và không được trùng với email đã có trong hệ thống (không phân biệt hoa thường). Nếu trùng, hệ thống hiển thị thông báo "Email đã được sử dụng" và yêu cầu nhập lại email khác (Không xóa thông tin đã nhập trước đó). |
| FR-01.4 | Mật khẩu có độ dài **từ 8 đến 32 ký tự**, bắt buộc chứa **ít nhất một chữ cái thường, chữ cái in hoa, ký tự đặc biệt và số**. Ô "Xác nhận mật khẩu" phải trùng khớp 100% với mật khẩu đã nhập. |
| FR-01.5 | Số điện thoại là tùy chọn. Nếu nhập, phải gồm đúng **10 chữ số** và bắt đầu bằng các đầu số hợp lệ của Việt Nam (03, 05, 07, 08, 09). Nếu sai định dạng, hệ thống hiển thị "Số điện thoại không hợp lệ". |
| FR-01.6 | Đăng ký thành công: Hệ thống tự động tạo hồ sơ tương ứng (hồ sơ ứng viên rỗng nếu là Ứng viên, hồ sơ công ty rỗng nếu là Nhà tuyển dụng), gửi email xác nhận quyền sở hữu địa chỉ và chuyển đến trang hướng dẫn xác nhận. Không gửi mật khẩu hoặc token đăng nhập qua email. |
| FR-01.7 | **Xác nhận email (cập nhật 27/10/2026):** Liên kết dùng một lần, hết hạn sau 60 phút; backend chỉ lưu hash token. Mở liên kết không tự xác nhận: người dùng bấm nút để gửi POST xác nhận và cập nhật `email_verified_at`. Gửi lại liên kết làm liên kết cũ hết hiệu lực, có giới hạn theo email/IP và phản hồi không tiết lộ tài khoản tồn tại. |
| FR-01.8 | Tài khoản chưa xác nhận vẫn được đăng nhập, quản lý hồ sơ và yêu cầu gửi lại thư; backend chặn ứng tuyển, tạo/sửa/mở lại tin tuyển dụng, bắt đầu/gửi tin nhắn và yêu cầu khôi phục/đổi mật khẩu đến khi email được xác nhận riêng. Thay đổi email thực sự xóa trạng thái xác nhận và vô hiệu hóa liên kết cũ; khôi phục/đổi mật khẩu không thay thế xác nhận email và không cập nhật `email_verified_at`. Không tự xác nhận tài khoản cũ bằng migration. |

### FR-02. Đăng nhập, Quên mật khẩu & Khóa tài khoản

| Mã | Yêu cầu |
|---|---|
| FR-02.1 | Người dùng đăng nhập bằng Email và Mật khẩu. |
| FR-02.2 | Nếu Email hoặc Mật khẩu không chính xác, hệ thống hiển thị thông báo "Email hoặc mật khẩu không chính xác". |
| FR-02.3 | Sau **5 lần** đăng nhập sai liên tiếp trên cùng một email, tài khoản bị tạm khóa và gửi thông báo về email về việc tài khoản bị khóa kèm lý do nhập sai mật khẩu quá nhiều lần và yêu cầu khôi phục tài khoản. Một lần đăng nhập đúng sẽ đặt lại bộ đếm số lần sai về 0. (để sau)|
| FR-02.4 | Trong thời gian bị tạm khóa, mọi yêu cầu đăng nhập vào email này đều bị từ chối với thông báo "Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản". |
| FR-02.5 | Nếu tài khoản bị Quản trị viên chủ động khóa vi phạm (trạng thái `locked`), hệ thống từ chối đăng nhập với thông báo "Tài khoản của bạn đã bị khóa bởi quản trị viên". |
| FR-02.6 | Khi đăng nhập thành công, hệ thống cấp phát mã định danh phiên làm việc (Token) và tự động điều hướng: Ứng viên về trang Việc làm, Nhà tuyển dụng về trang Quản lý tuyển dụng, Quản trị viên về trang Dashboard Admin. |
| FR-02.7 | **Yêu cầu quên mật khẩu:** Người dùng nhập địa chỉ email đã đăng ký và đã xác nhận. Nếu tài khoản hoạt động và email đã xác nhận, hệ thống tạo mã token an toàn có hiệu lực trong **15 phút** và gửi email chứa liên kết đặt lại mật khẩu. Email chưa xác nhận, không tồn tại hoặc tài khoản không hoạt động đều nhận phản hồi chung như nhau, không tạo token và không gửi thư khôi phục. Giao diện hướng dẫn xác nhận email riêng tại `/verify-email`. |
| FR-02.8 | **Đặt lại mật khẩu mới:** Người dùng mở liên kết, Nếu token đã hết hạn hoặc không hợp lệ, hệ thống báo "Liên kết xác thực đã hết hạn hoặc không hợp lệ". Nếu token hợp lệ và còn hạn, nhập mật khẩu mới và xác nhận mật khẩu (thỏa mãn tiêu chuẩn FR-01.4), sau đó chuyển hướng người dùng đến trang Đăng nhập kèm thông báo "Đặt lại mật khẩu thành công". |
| FR-02.9 | **Đổi mật khẩu khi đang đăng nhập (cập nhật 27/10/2026):** Email phải được xác nhận riêng từ trước; nếu chưa xác nhận, backend trả 403 `email_verification_required` và giao diện hướng dẫn xác nhận trước. Nhập mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu mới. Hệ thống kiểm tra mật khẩu hiện tại, yêu cầu mật khẩu mới khác mật khẩu cũ và đáp ứng FR-01.4; sau đó gửi liên kết xác nhận đến email hiện tại. Mật khẩu và phiên đăng nhập giữ nguyên cho đến khi người dùng bấm xác nhận trên trang mở từ email. Liên kết hết hạn sau **15 phút**, dùng một lần; GET/mở thư không thay đổi mật khẩu. Xác nhận thành công cập nhật mật khẩu và thu hồi toàn bộ phiên của tài khoản. Lỗi gửi thư không đổi mật khẩu; liên kết bị thay thế, sai mục đích, đổi email, thu hồi xác nhận email hoặc thay đổi mật khẩu trước đó đều bị từ chối. |
| FR-02.10 | Liên kết khôi phục/đổi mật khẩu được ràng buộc với ID tài khoản, email và thông tin xác thực tại thời điểm yêu cầu; database chỉ lưu token băm và mật khẩu mới đã băm. Khôi phục hoặc đổi mật khẩu thành công làm mất hiệu lực các yêu cầu mật khẩu cũ. Tài khoản bị admin khóa không được khôi phục để vượt khóa. Không gửi mật khẩu qua email hoặc ghi token/SMTP credentials vào log. |

### FR-03. Hồ sơ ứng viên & Tải lên CV

| Mã | Yêu cầu |
|---|---|
| FR-03.1 | Ứng viên có thể cập nhật thông tin cá nhân: Chọn nghề nghiệp, chọn danh sách kỹ năng, Tỉnh/Thành phố sinh sống, link các tài khoản mxh... |
| FR-03.2 | Ứng viên có thể chọn tối đa **10 kỹ năng chuyên môn** từ danh mục kỹ năng có sẵn của sàn (ví dụ: PHP, React, UI/UX, Tiếng Anh giao tiếp). |
| FR-03.3 | Ứng viên tải lên file CV cá nhân mặc định: Định dạng bắt buộc là **PDF**, dung lượng file **tối đa 5 MB (5.120 KB)**. |
| FR-03.4 | Nếu file tải lên không phải đuôi `.pdf` hoặc dung lượng lớn hơn 5 MB, hệ thống hiển thị "Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB" và không lưu file. |
| FR-03.5 | File CV lưu thành công được hệ thống cấp đường dẫn xem trực tiếp (PDF Preview) trên trình duyệt, không bắt buộc người dùng phải tải về máy mới xem được. |
| FR-03.6 | Trường hợp file CV là dạng ảnh scan không chứa văn bản trích xuất được hoặc file bị lỗi font, hệ thống thông báo "File CV dạng ảnh scan không thể đọc nội dung, vui lòng tải CV dạng văn bản chuẩn". |
| FR-03.7 | Ứng viên quản lý tối đa 20 bản nháp CV riêng tư; tạo từ sáu mẫu classic/modern/minimal/executive/elegant/technical, đổi mẫu, đổi tên, sao chép và xóa. Không thay thế file CV mặc định đã upload. |
| FR-03.8 | CV gồm thông tin liên hệ, kinh nghiệm, học vấn, kỹ năng, dự án, chứng chỉ, ngoại ngữ và hoạt động. Được sắp xếp/ẩn mục, chọn màu/cỡ chữ/giãn dòng theo preset, thêm ảnh CV riêng tối đa 2 MB. |
| FR-03.9 | Tự lưu bản nháp có revision; khi hai tab sửa cùng phiên bản, lần lưu cũ nhận 409 và không ghi đè nội dung mới. Cho phép lưu nháp thiếu nội dung, giữ nội dung đang nhập khi lỗi mạng. |
| FR-03.10 | Xem trước và xuất PDF A4 chứa văn bản tiếng Việt; tối đa 5 trang và 5 MB cho CV do builder tạo. Trước xuất bắt buộc có họ tên, chức danh, email hợp lệ và ít nhất một mục nội dung. File tải xuống đặt tên theo họ tên trong bản xuất: `Tên ứng viên CV.pdf`, giữ dấu tiếng Việt và loại ký tự không hợp lệ trong tên file. |
| FR-03.11 | Export chạy qua queue cv, lưu snapshot bất biến theo revision. Mỗi bản xuất có trạng thái pending/processing/ready/failed, lỗi không tạo PDF giả và có thể thử lại có kiểm soát. |
| FR-03.12 | Chỉ chủ sở hữu đọc/sửa bản nháp và tải bản xuất. Tự lưu/đổi mẫu/xuất PDF không gọi AI; khi ứng tuyển, PDF được sao chép riêng và giữ nguyên dù CV gốc thay đổi hoặc bị xóa. |
| FR-03.13 | Trình tạo CV chia thành từng bước: giao diện, cá nhân, kinh nghiệm, học vấn, kỹ năng, ngoại ngữ, dự án, bổ sung và xuất PDF; xem trước song song trên desktop, chuyển nội dung/xem trước trên mobile. CV mới trên giao diện có nội dung sẵn để sửa, ưu tiên thông tin thật khi chọn điền từ hồ sơ. CV cũ tự điền phần trống một lần khi mở editor, giữ nội dung đã sửa và không điền lại mục đã xóa sau lần khởi tạo đó. Các trường thời gian chọn tháng/năm bằng giao diện tiếng Việt và hiển thị MM/YYYY. |
### FR-04. Hồ sơ công ty, Đăng tin & Quản lý vòng đời tin tuyển dụng

| Mã | Yêu cầu |
|---|---|
| FR-04.1 | Nhà tuyển dụng bắt buộc phải cập nhật Tên công ty, Giới thiệu công ty, Địa chỉ trụ sở và Tỉnh/Thành phố trước khi được phép đăng tin tuyển dụng đầu tiên. |
| FR-04.2 | Tin tuyển dụng gồm các mục bắt buộc: Tiêu đề việc làm (10 đến 200 ký tự), Ngành nghề, Địa điểm làm việc chi tiết, Cấp bậc, Số lượng tuyển, Hạn chót nộp hồ sơ, Mô tả công việc (JD), Yêu cầu chuyên môn. |
| FR-04.3 | Hạn chót nộp hồ sơ phải là ngày trong tương lai (lớn hơn ngày hiện tại ít nhất 1 ngày). Nếu chọn ngày hôm nay hoặc ngày trong quá khứ, hệ thống báo "Hạn nộp hồ sơ phải sau ngày hôm nay". |
| FR-04.4 | Quy tắc nhập lương: Có 3 trường hợp thực tế:<br>- **Khoảng lương cụ thể:** Nhập Lương tối thiểu và Lương tối đa (Lương tối thiểu phải **nhỏ hơn hoặc bằng** Lương tối đa, cả hai đều lớn hơn 0).<br>- **Lương khởi điểm:** Chỉ nhập Lương tối thiểu, để trống Lương tối đa (hiển thị: "Từ X triệu VNĐ").<br>- **Thỏa thuận:** Tích chọn ô "Lương thỏa thuận" (cả hai ô lương bị khóa, hiển thị: "Thỏa thuận"). (drop box 3 options: lương cụ thể or khởi điểm or thỏa thuận)|
| FR-04.5 | Tin sau khi tạo được lưu ở trạng thái "Đang tuyển" (`active`). |
| FR-04.6 | **Quy tắc khi Đóng tin (`closed`):**<br>- **Ngừng nhận hồ sơ mới:** Hệ thống tự động ẩn nút "Ứng tuyển" hoặc thông báo "Tin tuyển dụng này đã đóng / hết hạn". Không cho phép ứng viên apply vào nữa.<br>- **Bảo lưu và xử lý hồ sơ cũ:** Tin ứng tuyển và hồ sơ đã nộp vẫn được bảo lưu (admin có quyền xóa tin và dữ liệu liên quan). Nhà tuyển dụng tiếp tục xem CV và duyệt trạng thái.<br>- **Bảo lưu hội thoại chat:** Các cuộc trò chuyện vẫn gửi/nhận bình thường kèm nhãn tin đã đóng/hết hạn.<br>- **Mở lại tin:** Nhà tuyển dụng có thể mở tin đã đóng. Nếu tin đã hết hạn, phải chọn hạn nộp mới trong tương lai trước khi tin được hiển thị và nhận hồ sơ. |
| FR-04.7 | **Xem trang công ty công khai:** Người dùng (Khách và Ứng viên) có thể xem trang chi tiết của bất kỳ doanh nghiệp nào: Tên công ty, Logo, Website, Trụ sở, Giới thiệu (size, ...) và toàn bộ danh sách các tin tuyển dụng đang mở (`active`) của công ty đó. |
| FR-04.8 | Form đăng/sửa tin có ô tìm kỹ năng theo tên, hỗ trợ từ khóa có dấu và không dấu; đổi từ khóa không bỏ các kỹ năng đã chọn. Bộ chọn ngành nghề có ô tìm kiếm và trạng thái không tìm thấy kết quả. Menu ngành nghề ở header cũng tìm trong toàn bộ danh mục. |

### FR-05. Tìm kiếm & Bộ lọc việc làm

| Mã | Yêu cầu |
|---|---|
| FR-05.1 | Tìm kiếm theo từ khóa: Hệ thống tìm kiếm không dấu và có dấu khớp với Tiêu đề việc làm, Tên công ty tuyển dụng hoặc Kỹ năng yêu cầu. |
| FR-05.2 | Bộ lọc đa tiêu chí gồm: Ngành nghề (có thể chọn nhiều ngành), Tỉnh/Thành phố (Hà Nội, TP.HCM, Đà Nẵng,...) (lấy api), Hình thức làm việc (*Toàn thời gian, Bán thời gian, Từ xa, thực tập*), Khoảng mức lương. |
| FR-05.3 | Quy tắc lọc mức lương theo số tiền thực tế:<br>- **Dưới 10 triệu:** Lấy các tin có Lương tối đa < 10.000.000 VNĐ.<br>- **Từ 10 - 20 triệu:** Lấy các tin có Lương tối đa >= 10.000.000 VNĐ và Lương tối thiểu <= 20.000.000 VNĐ.<br>- **Trên 20 triệu:** Lấy các tin có Lương tối thiểu > 20.000.000 VNĐ.<br>- **Thỏa thuận:** Chỉ lấy các tin có đánh dấu "Lương thỏa thuận". |
| FR-05.4 | **Thứ tự hiển thị & Cơ chế Đẩy tin (Bump tin):**<br>- Mặc định trang tìm kiếm và mục việc làm trang chủ xen kẽ doanh nghiệp theo lượt: lấy tin cập nhật mới nhất của mỗi công ty trước, rồi đến tin thứ hai, thứ ba... Việc chia lượt áp dụng trên toàn bộ kết quả sau khi lọc, trước khi phân trang. Trong mỗi lượt, ưu tiên thời gian cập nhật/đẩy tin (`updated_at` / `bump_at`) giảm dần; khi trùng thời gian, trộn bằng khóa xác định từ ID công ty và ID tin. Cùng bộ dữ liệu/bộ lọc giữ thứ tự ổn định giữa các trang và lần tải lại. Các lựa chọn sắp xếp ngày đăng, lương hoặc độ liên quan theo từ khóa giữ tiêu chí riêng, không áp dụng chia lượt doanh nghiệp.<br>- **Cơ chế reset thời gian (Bump tin tự động):** Khi một tin có ứng viên mới nộp đơn (`apply`), hệ thống cập nhật `updated_at = now()`. Tin đó được ưu tiên trong lượt đầu của doanh nghiệp, giúp tiếp cận thêm ứng viên mà không để nhiều tin của cùng công ty chiếm toàn bộ đầu danh sách. |
| FR-05.5 | Khi không có kết quả phù hợp, hệ thống hiển thị thông báo "Không tìm thấy việc làm phù hợp với tiêu chí tìm kiếm" và nút "Xóa bộ lọc". |
| FR-05.6 | Ứng viên đã đăng nhập có thể nhấn Lưu hoặc Bỏ lưu việc làm để quản lý danh sách việc làm quan tâm tại trang "Việc làm đã lưu". Nếu Khách nhấn lưu, hệ thống chuyển thẳng đến trang Đăng nhập và giữ đường dẫn quay lại tin tuyển dụng, không mở hộp thoại trung gian. |

### FR-06. Ứng tuyển & Quản lý vòng đời hồ sơ

| Mã | Yêu cầu |
|---|---|
| FR-06.1 | Khách nhấn "Ứng tuyển" sẽ được hệ thống yêu cầu chuyển hướng đến trang Đăng nhập. Chỉ tài khoản Ứng viên mới có quyền nộp đơn. |
| FR-06.2 | Khi nộp đơn, Ứng viên chọn một trong ba nguồn: CV PDF hiện có trong hồ sơ, upload PDF mới hoặc bản PDF ready tạo bằng trình tạo CV. Backend kiểm tra quyền sở hữu và lưu bản sao PDF riêng; không render PDF đồng bộ trong request ứng tuyển. |
| FR-06.4 | Một ứng viên chỉ được nộp đơn **duy nhất 1 lần** cho cùng một tin tuyển dụng đang mở. Nếu đã nộp trước đó, nút ứng tuyển hiển thị trạng thái đã vô hiệu hóa kèm thông báo "Bạn đã nộp hồ sơ cho công việc này rồi". |
| FR-06.5 | Vòng đời trạng thái hồ sơ gồm 5 trạng thái:<br>1. `Đã ứng tuyển (Applied)`: Mặc định khi nộp.<br>2. `Đang xem xét (Waiting)`: Chuyển khi nhà tuyển dụng mở hồ sơ lần đầu.<br>3. `Trúng tuyển (Accepted)`: Nhà tuyển dụng đồng ý tuyển dụng.<br>4. `Từ chối (Rejected)`: Nhà tuyển dụng từ chối hồ sơ.<br>5. `Đã rút (Withdrawn)`: Ứng viên rút hồ sơ khi chưa được xem. Một ứng viên chỉ được nộp một lần cho mỗi tin, kể cả sau khi rút. |
| FR-06.7 | Ứng viên có thể theo dõi danh sách toàn bộ các việc đã nộp kèm trạng thái xét duyệt hiện tại theo thời gian thực tại trang "Lịch sử ứng tuyển". |
| FR-06.8 | Nhà tuyển dụng xuất danh sách ứng viên của một hoặc nhiều tin thuộc công ty mình: một file XLSX có sheet riêng cho từng tin, hoặc mỗi tin một file XLSX được gói trong ZIP. Mỗi lần tối đa 50 tin và 50.000 hồ sơ; lấy toàn bộ trạng thái, không thay đổi trạng thái khi xuất. Chi tiết tại [Xuất danh sách ứng viên](applicant-export.md). |

### FR-07. AI Phân tích CV & Chấm điểm độ phù hợp (Match Score)

| Mã | Yêu cầu |
|---|---|
| FR-07.1 | Ngay sau khi ứng viên nộp hồ sơ thành công, hệ thống tự động trích xuất nội dung chữ từ file CV PDF và nội dung bản mô tả công việc (JD) để gửi sang AI. |
| FR-07.2 | Thuật toán đánh giá của AI dựa trên 4 tiêu chí trọng số định lượng:<br>- **Kỹ năng chuyên môn (Trọng số 40%):** Mức độ trùng khớp giữa kỹ năng CV có và kỹ năng JD yêu cầu.<br>- **Kinh nghiệm làm việc (Trọng số 30%):** Số năm kinh nghiệm và vị trí công việc tương đương.<br>- **Học vấn & Chứng chỉ (Trọng số 15%):** Chuyên ngành đào tạo và các chứng chỉ nghề nghiệp liên quan.<br>- **Định hướng & Trình độ ngôn ngữ (Trọng số 15%):** Trình độ ngoại ngữ và mục tiêu nghề nghiệp phù hợp với vị trí. |
| FR-07.3 | Điểm số tương thích (Match Score) trả về là số nguyên từ **0 đến 100**. |
| FR-07.4 | Kết quả phân tích phải trả về: Điểm Match Score, từ **2 đến 4 điểm mạnh**, từ **0 đến 4 kỹ năng còn thiếu** (mảng rỗng nếu CV đáp ứng đủ kỹ năng JD), và **1 đoạn đánh giá tổng quan dưới 80 từ**.|
| FR-07.5 | Kết quả phân tích được lưu trữ ứng với lần nộp hồ sơ đó, chỉ Nhà tuyển dụng sở hữu tin và Quản trị viên được xem hoặc yêu cầu phân tích lại khi lỗi. API dành cho Ứng viên không trả điểm, nhận xét, trạng thái hay lỗi xử lý AI. |
| FR-07.6 | Phân tích chạy qua hàng đợi sau khi đơn được lưu. File mất hoặc không đọc được, thiếu cấu hình, lỗi dịch vụ hay kết quả sai cấu trúc phải được ghi nhận là thất bại với thông báo an toàn; không tạo điểm giả thay thế. Lỗi dịch vụ có thể thử lại và không làm mất đơn đã nộp. |


### FR-08. Nhắn tin thời gian thực (Real-time Chat)

| Mã | Yêu cầu |
|---|---|
| FR-08.1 | Phòng trò chuyện chỉ được tạo giữa Nhà tuyển dụng và Ứng viên đã có đơn nộp hồ sơ vào một tin tuyển dụng cụ thể của công ty đó. |
| FR-08.2 | Cả hai bên đều có quyền gửi tin nhắn văn bản với độ dài từ **1 đến 1.000 ký tự**. Không hỗ trợ gửi tin nhắn rỗng toàn dấu cách hoặc enter. (Vẽ thêm gửi hình...)|
| FR-08.3 | Khi người dùng nhấn nút "Gửi", tin nhắn xuất hiện ngay lập tức trên màn hình của đối phương qua WebSocket trong **dưới 1 giây** mà không cần tải lại trang trình duyệt. |
| FR-08.4 | Hệ thống hiển thị rõ ràng: Tên người gửi, nội dung tin nhắn, thời gian gửi (định dạng `HH:mm`) và trạng thái "Đã xem" khi đối phương đã mở phòng chat. |
| FR-08.5 | Cơ chế bảo mật: Người dùng tuyệt đối không thể kết nối hoặc xem trộm tin nhắn của các phòng chat mà mình không phải là thành viên tham gia. |
| FR-08.6 | **Duy trì liên lạc khi tin đóng:** Ngay cả khi tin tuyển dụng bị đóng hoặc hết hạn, phòng chat giữa Ứng viên đã nộp và Nhà tuyển dụng vẫn hoạt động bình thường để hai bên hoàn tất trao đổi phỏng vấn hoặc giải đáp thông tin. |

### FR-09. Quản trị hệ thống & Kiểm duyệt tin (Admin)

| Mã | Yêu cầu |
|---|---|
| FR-09.1 | Quản trị viên truy cập danh sách các tin tuyển dụng ở trạng thái "Report" để kiểm tra nội dung. |
| FR-09.2 | Quản trị viên từ chối tin: Nhấn "Xóa" để xóa tin và các dữ liệu liên quan. Hệ thống thông báo tới nhà tuyển dụng: "Tin tuyển dụng vi phạm chính sách..."|
| FR-09.4 | Quản lý người dùng: Quản trị viên có quyền xem danh sách toàn bộ tài khoản người dùng, tìm kiếm theo tên hoặc email, lọc theo vai trò (`Ứng viên`, `Nhà tuyển dụng`) và trạng thái (`Active`, `Locked`). Quản trị viên có quyền Khóa (`locked`) hoặc Mở khóa (`active`) tài khoản. Tài khoản bị khóa sẽ lập tức bị hủy phiên đăng nhập. Nếu đăng nhập lại, hiển thị thông báo: "Tài khoản của bạn đã bị khóa"|
| FR-09.5 | Quản lý danh mục: Quản trị viên có quyền Thêm, Sửa, Xóa danh mục ngành nghề (Categories) và danh mục kỹ năng (Skills). |

### FR-10. Hệ thống thông báo trên Web (Web Notifications)

| Mã | Yêu cầu |
|---|---|
| FR-10.1 | **Thông báo cho Ứng viên:** Hệ thống tự động tạo và gửi thông báo cho Ứng viên khi:<br>- Nhà tuyển dụng thay đổi trạng thái hồ sơ ứng tuyển (*Trúng tuyển, Từ chối*).<br>- Nhà tuyển dụng gửi tin nhắn mới trong phòng chat. |
| FR-10.2 | **Thông báo cho Nhà tuyển dụng:** Hệ thống tự động tạo và gửi thông báo cho Nhà tuyển dụng khi:<br>- Có ứng viên mới nộp hồ sơ vào tin tuyển dụng của công ty.<br>- Ứng viên gửi tin nhắn mới trong phòng chat. |
| FR-10.3 | **Trải nghiệm thông báo:**<br>- Biểu tượng chuông trên thanh điều hướng hiển thị số lượng thông báo chưa đọc (Unread badge).<br>- Danh sách thông báo hiển thị tiêu đề, nội dung ngắn gọn, thời gian gửi tương đối (ví dụ: *5 phút trước*), và phân biệt rõ trạng thái Đã đọc (màu trắng background) / Chưa đọc (Màu xanh background).<br>- Người dùng có thể nhấn vào thông báo để chuyển hướng ngay tới màn hình chi tiết tương ứng, bấm đánh dấu đã đọc từng thông báo, hoặc bấm nút "Đánh dấu tất cả là đã đọc". |
| FR-10.4 | **Email theo lựa chọn (cập nhật 27/10/2026):** Ứng viên bật/tắt riêng email trạng thái ứng tuyển và tin nhắn mới tại Quản lý tài khoản. Mặc định cả hai tắt; phải xác nhận email trước khi bật. Lựa chọn lưu trong database, độc lập với thông báo trên web. |
| FR-10.5 | Email thông báo chạy qua queue `emails`, không gửi SMTP trong yêu cầu chat. Gom thay đổi trạng thái trong 10 giây và tin nhắn cùng hội thoại trong 60 giây. Trước khi gửi, kiểm tra lại tài khoản, xác nhận email, lựa chọn hiện tại, địa chỉ nhận, quyền sở hữu, trạng thái hồ sơ hoặc tin nhắn chưa đọc. Không đưa CV/nội dung tin nhắn riêng tư vào email. |
| FR-10.6 | Trang thông báo ứng viên/nhà tuyển dụng và bảng thông báo ở header ứng viên có bộ lọc 1 ngày, 3 ngày, 1 tháng và tất cả; tương ứng 24 giờ, 72 giờ và 30 ngày gần nhất. Lọc thời gian trước trạng thái đọc và phân trang; giữ cả hai bộ lọc trong URL trang, đổi bộ lọc trở về trang đầu. Số chưa đọc trên chuông và thao tác đánh dấu tất cả đã đọc vẫn áp dụng cho toàn bộ thông báo của tài khoản. |

---

## 5. Yêu cầu phi chức năng (Non-Functional Requirements)

| Mã | Nhóm | Yêu cầu |
|---|---|---|
| **NFR-01** | **Thời gian phản hồi** | 95% các yêu cầu tải trang, tìm kiếm việc làm và xem chi tiết công việc có thời gian phản hồi **dưới 1,5 giây** trong điều kiện 50 người dùng truy cập đồng thời. |
| **NFR-02** | **Thời gian xử lý AI** | Thời gian từ lúc ứng viên nộp hồ sơ đến khi nhận kết quả phân tích AI đạt trung bình **dưới 4 giây**. Trong thời gian chờ, giao diện bắt buộc hiển thị hiệu ứng skeleton loading trực quan. |
| **NFR-03** | **Độ trễ tin nhắn** | Tin nhắn gửi qua kênh WebSocket được chuyển giao đến màn hình của người nhận trong vòng **dưới 1 giây**. |
| **NFR-04** | **Độ sẵn sàng** | Hệ thống duy trì thời gian hoạt động liên tục (Uptime) đạt tối thiểu **99%** trong suốt kỳ đánh giá. |
| **NFR-05** | **Bảo mật mật khẩu** | Toàn bộ mật khẩu của người dùng được mã hóa một chiều bằng thuật toán **Bcrypt** trước khi lưu trữ vào cơ sở dữ liệu. Không lưu mật khẩu dạng văn bản thuần (plain text). |
| **NFR-06** | **Chống tấn công dữ liệu** | 100% các câu truy vấn cơ sở dữ liệu phải sử dụng cơ chế Parameter Binding qua Eloquent ORM của Laravel để triệt tiêu hoàn toàn nguy cơ tấn công **SQL Injection**. Toàn bộ dữ liệu hiển thị phía client phải được escape ký tự HTML để chống tấn công **XSS**. |
| **NFR-07** | **Khả năng tương thích** | Giao diện hiển thị chuẩn xác, không bị vỡ bố cục trên cả màn hình máy tính (Desktop/Laptop) và màn hình điện thoại di động có chiều rộng từ **360px** trở lên. |
| **NFR-08** | **Định dạng hiển thị chuẩn** | Mức lương hiển thị theo chuẩn định dạng tiền tệ Việt Nam (ví dụ: `15.000.000 VNĐ` hoặc `15 - 20 triệu VNĐ`). Ngày tháng hiển thị theo định dạng Việt Nam `DD/MM/YYYY`. |

---

## Phụ lục A. Ví dụ minh họa tính điểm AI Match Score

Dưới đây là các trường hợp thực tế thể hiện quy tắc chấm điểm và phản hồi của thuật toán AI:

| # | Vị trí tuyển dụng (JD) | Năng lực thể hiện trong CV | Điểm Match Score | Phân loại | Điểm mạnh & Kỹ năng còn thiếu |
|---|---|---|---|---|---|
| 1 | Lập trình viên Backend PHP (Laravel, MySQL, RESTful API, 2 năm kinh nghiệm) | 2 năm làm việc với Laravel, thành thạo MySQL, Git, Docker, có dự án thực tế. | **88%** | Rất phù hợp (Xanh lá) | **Điểm mạnh:** Đúng khung công nghệ Laravel và đủ số năm kinh nghiệm.<br>**Thiếu:** Kiến thức tối ưu hóa Redis/Caching. |
| 2 | Chuyên viên Digital Marketing (SEO, Google Ads, Facebook Ads, 1 năm kinh nghiệm) | Có chứng chỉ Google Ads, từng chạy Facebook Ads 6 tháng, chưa có kinh nghiệm SEO thực chiến. | **65%** | Phù hợp (Xanh dương) | **Điểm mạnh:** Sử dụng tốt các công cụ trả phí Google Ads và Facebook Ads.<br>**Thiếu:** Kỹ năng SEO Onpage và phân tích từ khóa chuyên sâu. |
| 3 | Lập trình viên Frontend React/Next.js (Yêu cầu TypeScript, Tailwind CSS, 3 năm kinh nghiệm) | Sinh viên mới tốt nghiệp, biết HTML/CSS cơ bản và một ít Javascript, chưa từng làm việc với Next.js/TypeScript. | **35%** | Chưa phù hợp (Đỏ) | **Điểm mạnh:** Có nền tảng tư duy lập trình căn bản.<br>**Thiếu:** Chưa có kinh nghiệm thực tế, thiếu hoàn toàn TypeScript và Next.js. |
| 4 | Nhân viên Kế toán Tổng hợp (Yêu cầu bằng Cử nhân Kế toán, 2 năm kinh nghiệm phần mềm MISA) | Tốt nghiệp Cử nhân Kế toán, 3 năm sử dụng MISA và khai báo thuế thành thạo. | **95%** | Rất phù hợp (Xanh lá) | **Điểm mạnh:** Chuyên môn đào tạo đúng ngành, vượt yêu cầu số năm kinh nghiệm và phần mềm kế toán.<br>**Thiếu:** Không có kỹ năng thiếu đáng kể. |

---

## Phụ lục B. Bảng ánh xạ mã lỗi và thông báo hệ thống

| Mã HTTP | Tình huống phát sinh lỗi | Thông báo hiển thị cho người dùng |
|---|---|---|
| `400 Bad Request` | Chọn hạn nộp hồ sơ ở quá khứ hoặc hôm nay | "Hạn nộp hồ sơ phải sau ngày hôm nay" |
| `400 Bad Request` | Tải lên file CV sai định dạng hoặc quá dung lượng | "Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB" |
| `400 Bad Request` | Lương tối thiểu lớn hơn lương tối đa | "Mức lương tối thiểu không được lớn hơn mức lương tối đa" |
| `400 Bad Request` | Rút hồ sơ khi Nhà tuyển dụng đã mở xem CV | "Nhà tuyển dụng đã xem hồ sơ của bạn, không thể rút đơn" |
| `400 Bad Request` | Token đặt lại mật khẩu đã hết hạn hoặc không tồn tại | "Liên kết xác thực đã hết hạn hoặc không hợp lệ" |
| `400 Bad Request` | Nhập sai mật khẩu hiện tại khi thực hiện đổi mật khẩu | "Mật khẩu hiện tại không chính xác" |
| `401 Unauthorized` | Người dùng chưa đăng nhập hoặc token đã hết hạn | "Phiên làm việc đã hết hạn, vui lòng đăng nhập lại" |
| `403 Forbidden` | Đăng nhập tài khoản đã bị Quản trị viên khóa | "Tài khoản của bạn đã bị khóa bởi quản trị viên" |
| `403 Forbidden` | Đăng nhập tài khoản đang trong thời gian tạm khóa 15 phút | "Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau 15 phút" |
| `403 Forbidden` | Ứng viên cố gắng truy cập trang quản trị của Nhà tuyển dụng | "Bạn không có quyền truy cập vào chức năng này" |
| `404 Not Found` | Xem tin tuyển dụng không tồn tại hoặc đã bị xóa | "Công việc không tồn tại hoặc đã ngừng tuyển dụng" |
| `409 Conflict` | Ứng viên nộp hồ sơ lần thứ 2 cho cùng một công việc | "Bạn đã nộp hồ sơ cho công việc này rồi" |
| `422 Unprocessable` | Đăng ký với địa chỉ Email đã tồn tại trong hệ thống | "Email đã được sử dụng" |
| `422 Unprocessable` | Nộp hồ sơ vào tin tuyển dụng đã đóng hoặc hết hạn | "Tin tuyển dụng này đã đóng hoặc đã hết hạn nộp hồ sơ" |
