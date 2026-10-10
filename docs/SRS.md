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
| **Ứng viên** | Toàn bộ quyền của Khách, kèm theo: Cập nhật hồ sơ cá nhân, tải lên CV PDF, lưu việc làm yêu thích, nộp hồ sơ ứng tuyển, xem kết quả AI phân tích CV, nhắn tin realtime với nhà tuyển dụng của tin đã nộp. |
| **Nhà tuyển dụng** | Toàn bộ quyền của Khách, kèm theo: Cập nhật thông tin công ty, đăng tin tuyển dụng, đóng/mở tin, xem danh sách ứng viên đã nộp, xem trước và tải CV, cập nhật trạng thái duyệt hồ sơ, nhắn tin realtime với ứng viên. |
| **Quản trị viên** | Xem dashboard thống kê, phê duyệt hoặc từ chối tin tuyển dụng mới, khóa hoặc mở khóa tài khoản người dùng, quản lý danh mục ngành nghề và kỹ năng. |

### 2.2. Ràng buộc chung
- Người dùng đăng ký tài khoản phải từ [**15 tuổi trở lên**.](https://thuvienphapluat.vn/chinh-sach-phap-luat-moi/vn/ho-tro-phap-luat/tu-van-phap-luat/43713/quy-dinh-ve-do-tuoi-lao-dong-cua-nguoi-lao-dong-hien-nay)
- File CV tải lên bắt buộc phải là định dạng **PDF**, dung lượng tối đa **5 MB**.
- Đơn vị tiền tệ: **Việt Nam đồng (VNĐ)**.
- Hệ thống là ứng dụng web tương thích tốt trên các trình duyệt Chrome, Edge, Firefox, Safari và hỗ trợ hiển thị trên thiết bị di động có chiều rộng màn hình từ **360px** trở lên.
- **Giới hạn phạm vi (Out of Scope):** Trong phiên bản này, hệ thống tập trung hoàn toàn vào cơ chế Upload CV (PDF) cá nhân hóa và Phân tích tương thích bằng AI; **chưa hỗ trợ công cụ tạo CV kéo thả trực tuyến (CV Template Builder).**

---

## 3. Yêu cầu chức năng

### FR-01. Đăng ký tài khoản

| Mã | Yêu cầu |
|---|---|
| FR-01.1 | Người dùng đăng ký bằng cách nhập: Họ tên, Email, Mật khẩu, Xác nhận mật khẩu, Số điện thoại và Vai trò (`Ứng viên` hoặc `Nhà tuyển dụng`). |
| FR-01.2 | Họ tên là thông tin bắt buộc, độ dài từ **2 đến 100 ký tự**, không chứa ký tự đặc biệt ngoài khoảng trắng và dấu gạch nối. |
| FR-01.3 | Email phải đúng định dạng chuẩn RFC (ví dụ: `user@example.com`) và không được trùng với email đã có trong hệ thống (không phân biệt hoa thường). Nếu trùng, hệ thống hiển thị thông báo "Email đã được sử dụng" và yêu cầu nhập lại email khác (Không xóa thông tin đã nhập trước đó). |
| FR-01.4 | Mật khẩu có độ dài **từ 8 đến 32 ký tự**, bắt buộc chứa **ít nhất một chữ cái thường, chữ cái in hoa, ký tự đặc biệt và số**. Ô "Xác nhận mật khẩu" phải trùng khớp 100% với mật khẩu đã nhập. |
| FR-01.5 | Số điện thoại là tùy chọn. Nếu nhập, phải gồm đúng **10 chữ số** và bắt đầu bằng các đầu số hợp lệ của Việt Nam (03, 05, 07, 08, 09). Nếu sai định dạng, hệ thống hiển thị "Số điện thoại không hợp lệ". |
| FR-01.6 | Đăng ký thành công: Hệ thống tự động tạo hồ sơ tương ứng (hồ sơ ứng viên rỗng nếu là Ứng viên, hồ sơ công ty rỗng nếu là Nhà tuyển dụng), gửi thông báo về người dùng là đã đăng ký thành công (Gồm các thông tin đi kèm, không bao gồm tài khoản và mật khẩu). Sau đó, chuyển hướng  sang trang đăng nhập và đăng nhập tài khoản. |

### FR-02. Đăng nhập, Quên mật khẩu & Khóa tài khoản

| Mã | Yêu cầu |
|---|---|
| FR-02.1 | Người dùng đăng nhập bằng Email và Mật khẩu. |
| FR-02.2 | Nếu Email hoặc Mật khẩu không chính xác, hệ thống hiển thị thông báo "Email hoặc mật khẩu không chính xác". |
| FR-02.3 | Sau **5 lần** đăng nhập sai liên tiếp trên cùng một email, tài khoản bị tạm khóa và gửi thông báo về email về việc tài khoản bị khóa kèm lý do nhập sai mật khẩu quá nhiều lần và yêu cầu khôi phục tài khoản. Một lần đăng nhập đúng sẽ đặt lại bộ đếm số lần sai về 0. |
| FR-02.4 | Trong thời gian bị tạm khóa, mọi yêu cầu đăng nhập vào email này đều bị từ chối với thông báo "Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản". |
| FR-02.5 | Nếu tài khoản bị Quản trị viên chủ động khóa vi phạm (trạng thái `locked`), hệ thống từ chối đăng nhập với thông báo "Tài khoản của bạn đã bị khóa bởi quản trị viên". |
| FR-02.6 | Khi đăng nhập thành công, hệ thống cấp phát mã định danh phiên làm việc (Token) và tự động điều hướng: Ứng viên về trang Việc làm, Nhà tuyển dụng về trang Quản lý tuyển dụng, Quản trị viên về trang Dashboard Admin. |
| FR-02.7 | **Yêu cầu quên mật khẩu:** Người dùng nhập địa chỉ email đã đăng ký. Hệ thống kiểm tra: nếu email tồn tại, hệ thống tạo mã token xác thực an toàn có hiệu lực trong **15 phút** và gửi email chứa liên kết đặt lại mật khẩu đến hòm thư người dùng. |
| FR-02.8 | **Đặt lại mật khẩu mới:** Người dùng mở liên kết, Nếu token đã hết hạn hoặc không hợp lệ, hệ thống báo "Liên kết xác thực đã hết hạn hoặc không hợp lệ". Nếu token hợp lệ và còn hạn, nhập mật khẩu mới và xác nhận mật khẩu (thỏa mãn tiêu chuẩn FR-01.4), sau đó chuyển hướng người dùng đến trang Đăng nhập kèm thông báo "Đặt lại mật khẩu thành công". |
| FR-02.9 | **Đổi mật khẩu khi đang đăng nhập:** Người dùng đã đăng nhập có thể đổi mật khẩu tại trang Cài đặt tài khoản bằng cách nhập: Mật khẩu hiện tại, Mật khẩu mới và Xác nhận mật khẩu mới. Hệ thống kiểm tra: nếu mật khẩu hiện tại không đúng, báo lỗi "Mật khẩu hiện tại không chính xác"; nếu mật khẩu mới trùng với mật khẩu cũ, báo lỗi "Mật khẩu mới không được trùng với mật khẩu hiện tại"; nếu hợp lệ, cập nhật mật khẩu mới và gửi thông báo thành công. |

### FR-03. Hồ sơ ứng viên & Tải lên CV

| Mã | Yêu cầu |
|---|---|
| FR-03.1 | Ứng viên có thể cập nhật thông tin cá nhân: Chọn nghề nghiệp, chọn danh sách kỹ năng, Tỉnh/Thành phố sinh sống, Giới thiệu ngắn về bản thân (tối đa 1.000 ký tự). |
| FR-03.2 | Ứng viên có thể chọn tối đa **10 kỹ năng chuyên môn** từ danh mục kỹ năng có sẵn của sàn (ví dụ: PHP, React, UI/UX, Tiếng Anh giao tiếp). |
| FR-03.3 | Ứng viên tải lên file CV cá nhân mặc định: Định dạng bắt buộc là **PDF**, dung lượng file **tối đa 5 MB (5.120 KB)**. |
| FR-03.4 | Nếu file tải lên không phải đuôi `.pdf` hoặc dung lượng lớn hơn 5 MB, hệ thống hiển thị "Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB" và không lưu file. |
| FR-03.5 | File CV lưu thành công được hệ thống cấp đường dẫn xem trực tiếp (PDF Preview) trên trình duyệt, không bắt buộc người dùng phải tải về máy mới xem được. |

### FR-04. Hồ sơ công ty, Đăng tin & Quản lý vòng đời tin tuyển dụng

| Mã | Yêu cầu |
|---|---|
| FR-04.1 | Nhà tuyển dụng bắt buộc phải cập nhật Tên công ty, Địa chỉ trụ sở và Tỉnh/Thành phố trước khi được phép đăng tin tuyển dụng đầu tiên. |
| FR-04.2 | Tin tuyển dụng gồm các mục bắt buộc: Tiêu đề việc làm (10 đến 200 ký tự), Ngành nghề, Địa điểm làm việc chi tiết, Cấp bậc, Số lượng tuyển, Hạn chót nộp hồ sơ, Mô tả công việc (JD), Yêu cầu chuyên môn. |
| FR-04.3 | Hạn chót nộp hồ sơ phải là ngày trong tương lai (lớn hơn ngày hiện tại ít nhất 1 ngày). Nếu chọn ngày hôm nay hoặc ngày trong quá khứ, hệ thống báo "Hạn nộp hồ sơ phải sau ngày hôm nay". |
| FR-04.4 | Quy tắc nhập lương: Có 3 trường hợp thực tế:<br>- **Khoảng lương cụ thể:** Nhập Lương tối thiểu và Lương tối đa (Lương tối thiểu phải **nhỏ hơn hoặc bằng** Lương tối đa, cả hai đều lớn hơn 0).<br>- **Lương khởi điểm:** Chỉ nhập Lương tối thiểu, để trống Lương tối đa (hiển thị: "Từ X triệu VNĐ").<br>- **Thỏa thuận:** Tích chọn ô "Lương thỏa thuận" (cả hai ô lương bị khóa, hiển thị: "Thỏa thuận"). |
| FR-04.5 | Tin sau khi tạo được lưu ở trạng thái "Chờ duyệt" (`pending`) và hiển thị cho Nhà tuyển dụng dòng thông báo "Đăng tin thành công, tin của bạn đang chờ quản trị viên phê duyệt". |
| FR-04.6 | **Quy tắc khi Đóng tin (`closed`):**<br>- **Ngừng nhận hồ sơ mới:** Hệ thống tự động ẩn nút "Ứng tuyển" hoặc thông báo "Tin tuyển dụng này đã đóng / hết hạn". Không cho phép tạo đơn ứng tuyển mới.<br>- **Bảo lưu và xử lý hồ sơ cũ:** Toàn bộ hồ sơ ứng tuyển đã nộp trước thời điểm đóng tin vẫn được **bảo lưu nguyên vẹn**. Nhà tuyển dụng tiếp tục có đầy đủ quyền xem CV, duyệt trạng thái hồ sơ (*Mời phỏng vấn, Trúng tuyển, Từ chối*) để hoàn tất đợt tuyển dụng.<br>- **Bảo lưu hội thoại chat:** Các cuộc trò chuyện đã tạo giữa Nhà tuyển dụng và Ứng viên vẫn duy trì hoạt động gửi/nhận bình thường (kèm nhãn thông báo phụ "Tin tuyển dụng đã đóng") để hai bên tiếp tục phỏng vấn.<br>- **Mở lại tin:** Nhà tuyển dụng có quyền mở lại tin đã đóng bất kỳ lúc nào. |
| FR-04.7 | **Xem trang công ty công khai:** Người dùng (Khách và Ứng viên) có thể xem trang chi tiết của bất kỳ doanh nghiệp nào: Tên công ty, Logo, Website, Quy mô nhân sự, Trụ sở, Giới thiệu và toàn bộ danh sách các tin tuyển dụng đang mở (`active`) của công ty đó. |

### FR-05. Tìm kiếm & Bộ lọc việc làm

| Mã | Yêu cầu |
|---|---|
| FR-05.1 | Tìm kiếm theo từ khóa: Hệ thống tìm kiếm không dấu và có dấu khớp với Tiêu đề việc làm, Tên công ty tuyển dụng hoặc Kỹ năng yêu cầu. |
| FR-05.2 | Bộ lọc đa tiêu chí gồm: Ngành nghề (có thể chọn nhiều ngành), Tỉnh/Thành phố (Hà Nội, TP.HCM, Đà Nẵng, Khác), Hình thức làm việc (*Toàn thời gian, Bán thời gian, Từ xa, thực tập*), Khoảng mức lương. |
| FR-05.3 | Quy tắc lọc mức lương theo số tiền thực tế:<br>- **Dưới 10 triệu:** Lấy các tin có Lương tối đa < 10.000.000 VNĐ.<br>- **Từ 10 - 20 triệu:** Lấy các tin có Lương tối đa >= 10.000.000 VNĐ và Lương tối thiểu <= 20.000.000 VNĐ.<br>- **Trên 20 triệu:** Lấy các tin có Lương tối thiểu > 20.000.000 VNĐ.<br>- **Thỏa thuận:** Chỉ lấy các tin có đánh dấu "Lương thỏa thuận". |
| FR-05.4 | Trang tìm kiếm trả về tất cả đăng tuyển theo thứ tự thời gian cập nhật/tạo. |
| FR-05.5 | Khi không có kết quả phù hợp, hệ thống hiển thị thông báo "Không tìm thấy việc làm phù hợp với tiêu chí tìm kiếm" và nút "Xóa bộ lọc". |
| FR-05.6 | Ứng viên đã đăng nhập có thể nhấn Lưu hoặc Bỏ lưu việc làm để quản lý danh sách việc làm quan tâm tại trang "Việc làm đã lưu". Nếu Khách nhấn lưu, hệ thống hiển thị yêu cầu chuyển đến trang Đăng nhập. |

### FR-06. Ứng tuyển & Quản lý vòng đời hồ sơ

| Mã | Yêu cầu |
|---|---|
| FR-06.1 | Khách nhấn "Ứng tuyển" sẽ được hệ thống yêu cầu chuyển hướng đến trang Đăng nhập. Chỉ tài khoản Ứng viên mới có quyền nộp đơn. |
| FR-06.2 | Khi nộp đơn, Ứng viên chọn 1 trong 2 hình thức: Sử dụng file CV sẵn có trong hồ sơ cá nhân HOẶC Tải lên một file CV PDF mới riêng cho vị trí này. |
| FR-06.4 | Một ứng viên chỉ được nộp đơn **tối đa 1 lần** cho cùng một tin tuyển dụng đang mở. Nếu đã nộp trước đó, nút ứng tuyển hiển thị trạng thái đã vô hiệu hóa kèm thông báo "Bạn đã nộp hồ sơ cho công việc này rồi". |
| FR-06.5 | Vòng đời trạng thái hồ sơ ứng tuyển gồm 6 trạng thái:<br>1. `Đã ứng tuyển (Applied)`: Mặc định ngay sau khi ứng viên nộp hồ sơ.<br>2. `Đang xem xét (Waiting)`: Tự động chuyển khi xem CV của ứng viên lần đầu tiên.<br>3. `Mời phỏng vấn (Interviewing)`: Nhà tuyển dụng chọn đổi trạng thái để mời ứng viên phỏng vấn.<br>4. `Trúng tuyển (Accepted)`: Nhà tuyển dụng xác nhận đồng ý tuyển dụng.<br>5. `Từ chối (Rejected)`: Nhà tuyển dụng từ chối hồ sơ chưa phù hợp. |
| FR-06.7 | Ứng viên có thể theo dõi danh sách toàn bộ các việc đã nộp kèm trạng thái xét duyệt hiện tại theo thời gian thực tại trang "Lịch sử ứng tuyển". |

### FR-07. AI Phân tích CV & Chấm điểm độ phù hợp (Match Score)

| Mã | Yêu cầu |
|---|---|
| FR-07.1 | Ngay sau khi ứng viên nộp hồ sơ thành công, hệ thống tự động trích xuất nội dung chữ từ file CV PDF và nội dung bản mô tả công việc (JD) để gửi sang AI. |
| FR-07.2 | Thuật toán đánh giá của AI dựa trên 4 tiêu chí trọng số định lượng:<br>- **Kỹ năng chuyên môn (Trọng số 40%):** Mức độ trùng khớp giữa kỹ năng CV có và kỹ năng JD yêu cầu.<br>- **Kinh nghiệm làm việc (Trọng số 30%):** Số năm kinh nghiệm và vị trí công việc tương đương.<br>- **Học vấn & Chứng chỉ (Trọng số 15%):** Chuyên ngành đào tạo và các chứng chỉ nghề nghiệp liên quan.<br>- **Định hướng & Trình độ ngôn ngữ (Trọng số 15%):** Trình độ ngoại ngữ và mục tiêu nghề nghiệp phù hợp với vị trí. |
| FR-07.3 | Điểm số tương thích (Match Score) trả về là số nguyên từ **0 đến 100**. |
| FR-07.4 | Kết quả phân tích phải trả về: Điểm số Match Score, từ **2 đến 4 điểm mạnh** phù hợp nhất, từ **1 đến 4 kỹ năng còn thiếu** mà JD đòi hỏi nhưng CV chưa có, và **1 đoạn gợi ý cải thiện CV ngắn gọn dưới 80 từ**.|
| FR-07.5 | Kết quả phân tích được lưu trữ vĩnh viễn vào hệ thống ứng với lần nộp hồ sơ đó, giúp Nhà tuyển dụng và Ứng viên xem lại tức thì mà không bị trễ thời gian gọi lại AI. |
| FR-07.6 | Trường hợp file CV là dạng ảnh scan không chứa văn bản trích xuất được hoặc file bị lỗi font, hệ thống ghi nhận điểm 0% kèm thông báo "File CV dạng ảnh scan không thể đọc nội dung, vui lòng tải CV dạng văn bản chuẩn". |

### FR-08. Nhắn tin thời gian thực (Real-time Chat)

| Mã | Yêu cầu |
|---|---|
| FR-08.1 | Phòng trò chuyện chỉ được tạo giữa Nhà tuyển dụng và Ứng viên đã có đơn nộp hồ sơ vào một tin tuyển dụng cụ thể của công ty đó. |
| FR-08.2 | Cả hai bên đều có quyền gửi tin nhắn văn bản với độ dài từ **1 đến 1.000 ký tự**. Không hỗ trợ gửi tin nhắn rỗng toàn dấu cách. |
| FR-08.3 | Khi người dùng nhấn nút "Gửi", tin nhắn xuất hiện ngay lập tức trên màn hình của đối phương qua WebSocket trong **dưới 1 giây** mà không cần tải lại trang trình duyệt. |
| FR-08.4 | Hệ thống hiển thị rõ ràng: Tên người gửi, nội dung tin nhắn, thời gian gửi (định dạng `HH:mm`) và trạng thái "Đã xem" khi đối phương đã mở phòng chat. |
| FR-08.5 | Cơ chế bảo mật: Người dùng tuyệt đối không thể kết nối hoặc xem trộm tin nhắn của các phòng chat mà mình không phải là thành viên tham gia. |
| FR-08.6 | **Duy trì liên lạc khi tin đóng:** Ngay cả khi tin tuyển dụng bị đóng hoặc hết hạn, phòng chat giữa Ứng viên đã nộp và Nhà tuyển dụng vẫn hoạt động bình thường để hai bên hoàn tất trao đổi phỏng vấn hoặc giải đáp thông tin. |

### FR-09. Quản trị hệ thống & Kiểm duyệt tin (Admin)

| Mã | Yêu cầu |
|---|---|
| FR-09.1 | Quản trị viên truy cập danh sách các tin tuyển dụng ở trạng thái "Chờ duyệt" (`pending`) để kiểm tra nội dung. |
| FR-09.2 | Quản trị viên duyệt tin: Nhấn "Duyệt" để chuyển tin sang trạng thái `active` và cho phép hiển thị công khai trên trang chủ và tìm kiếm. |
| FR-09.3 | Quản trị viên từ chối tin: Nhấn "Từ chối", nhập lý do từ chối (tối đa 255 ký tự). Hệ thống chuyển tin sang trạng thái `rejected` và gửi lý do về hòm thư thông báo của Nhà tuyển dụng. |
| FR-09.4 | Quản lý người dùng: Quản trị viên có quyền xem danh sách toàn bộ tài khoản người dùng, tìm kiếm theo tên hoặc email, lọc theo vai trò (`Ứng viên`, `Nhà tuyển dụng`) và trạng thái (`Active`, `Locked`). Quản trị viên có quyền Khóa (`locked`) hoặc Mở khóa (`active`) tài khoản. Tài khoản bị khóa sẽ lập tức bị hủy phiên đăng nhập. |
| FR-09.5 | Quản lý danh mục: Quản trị viên có quyền Thêm, Sửa, Xóa danh mục ngành nghề (Categories) và danh mục kỹ năng (Skills). |
| FR-09.6 | Dashboard thống kê hiển thị 4 chỉ số tổng quan theo thời gian thực: Tổng số Ứng viên, Tổng số Nhà tuyển dụng, Tổng số việc làm đang tuyển (`active`), Tổng lượt nộp hồ sơ. |

### FR-10. Hệ thống thông báo trên Web (Web Notifications)

| Mã | Yêu cầu |
|---|---|
| FR-10.1 | **Thông báo cho Ứng viên:** Hệ thống tự động tạo và gửi thông báo cho Ứng viên khi:<br>- Nhà tuyển dụng thay đổi trạng thái hồ sơ ứng tuyển (*Trúng tuyển, Từ chối*).<br>- Nhà tuyển dụng gửi tin nhắn mới trong phòng chat. |
| FR-10.2 | **Thông báo cho Nhà tuyển dụng:** Hệ thống tự động tạo và gửi thông báo cho Nhà tuyển dụng khi:<br>- Có ứng viên mới nộp hồ sơ vào tin tuyển dụng của công ty.<br>- Ứng viên gửi tin nhắn mới trong phòng chat. |
| FR-10.3 | **Trải nghiệm thông báo:**<br>- Biểu tượng chuông trên thanh điều hướng hiển thị số lượng thông báo chưa đọc (Unread badge).<br>- Danh sách thông báo hiển thị tiêu đề, nội dung ngắn gọn, thời gian gửi tương đối (ví dụ: *5 phút trước*), và phân biệt rõ trạng thái Đã đọc (màu trắng background) / Chưa đọc (Màu xanh background).<br>- Người dùng có thể nhấn vào thông báo để chuyển hướng ngay tới màn hình chi tiết tương ứng, bấm đánh dấu đã đọc từng thông báo, hoặc bấm nút "Đánh dấu tất cả là đã đọc". |

---

## 4. Ca sử dụng tiêu biểu (Use Cases)

### UC-02. Ca sử dụng "Đăng tin tuyển dụng mới"

- **Tác nhân:** Nhà tuyển dụng
- **Tiền điều kiện:** Nhà tuyển dụng đã đăng nhập và đã hoàn thành thông tin hồ sơ công ty.
- **Luồng sự kiện chính:**
  1. Nhà tuyển dụng chọn chức năng "Đăng tin tuyển dụng" trên thanh điều hướng.
  2. Nhà tuyển dụng nhập tiêu đề việc làm, chọn ngành nghề, gắn các kỹ năng yêu cầu, chọn hình thức làm việc, thiết lập mức lương và chọn hạn nộp hồ sơ.
  3. Nhà tuyển dụng soạn thảo phần mô tả công việc (JD), yêu cầu ứng viên và quyền lợi được hưởng.
  4. Nhà tuyển dụng nhấn nút "Đăng tin".
  5. Hệ thống kiểm tra tính hợp lệ của toàn bộ dữ liệu nhập (hạn nộp trong tương lai, lương tối thiểu <= lương tối đa).
  6. Hệ thống hiển thị thông báo "Đăng tin thành công, đang mở tuyển ứng viên".

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
