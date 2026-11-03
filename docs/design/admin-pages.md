# Thiết kế lại khu vực quản trị

> Bản HTML dưới đây là thiết kế gốc. Khu vực quản trị Next.js đã được tích hợp vào ứng dụng. Cấu hình và phân quyền hiện hành nằm trong [hướng dẫn tích hợp frontend–backend](../backend-frontend-integration.md).

## Phạm vi đã thống nhất

Người dùng xác nhận bắt đầu phương án bộ HTML/CSS/JS trong `design/`, sau khi được thông báo frontend Next.js chưa có trang admin. Hoàn thiện các màn hình tổng quan, kiểm duyệt tin, quản lý tài khoản, ngành nghề và kỹ năng; bổ sung trang chi tiết tin cho quy trình kiểm duyệt.

Đối tượng là quản trị viên vận hành sàn tuyển dụng. Ưu tiên đọc dữ liệu, tìm tài khoản, kiểm tra tin bị báo cáo và quản lý danh mục. Giữ Be Vietnam Pro, logo TimViecOnline, nền slate, navy/blue và badge pastel theo các trang nhà tuyển dụng/ứng viên.

## Giả định và giới hạn

- Đây là bộ giao diện HTML tương tác bằng dữ liệu minh họa, chưa tích hợp Laravel/MySQL; thay đổi mẫu giữ trong sessionStorage để chuyển trang cùng tab, có nút khôi phục. Không lưu token, mật khẩu hay dữ liệu thật.
- Quy mô bản thiết kế nhỏ; khi nối backend, lọc/sắp xếp/phân trang cần thực hiện ở API. Mục tiêu hệ thống theo SRS là 95% yêu cầu dưới 1,5 giây ở 50 người truy cập đồng thời, uptime 99%; bản thiết kế không chứng minh các chỉ tiêu này.
- Hỗ trợ từ 360px, desktop và bàn phím; giảm chuyển động khi được yêu cầu. CSS và icon lưu cục bộ, font giữ nguồn Google Fonts hiện có với font hệ thống dự phòng.
- Mọi phân quyền, validate, khóa tài khoản/thu hồi phiên, xóa cascade và gửi thông báo thật phải do backend thực thi. UI không tuyên bố đã thực hiện các tác vụ này.
- Không triển khai backend, migration, xác thực, chức năng ngoài SRS hoặc thay đổi trang ứng viên/nhà tuyển dụng.
- Thành phần dùng chung nằm trong `design/shared/admin-*`; phiên bản React tương lai cần dùng shadcn/ui theo tiêu chuẩn dự án.

## Decision log

| Quyết định | Phương án cân nhắc | Lý do |
| --- | --- | --- |
| Hoàn thiện HTML trong `design/` | Dựng admin Next.js ngay | Khớp luồng thiết kế hiện tại và phương án người dùng đồng ý bắt đầu |
| Tách thành sáu màn hình cùng shell | Một trang dài với tab; app quản trị riêng | Có URL riêng, điều hướng rõ, CSS/JS dùng chung dễ bảo trì |
| Theo FR-04.5, FR-09 và SQL: `active/closed/expired` + `is_reported` | Luồng `pending/approve/reject` trong README | SRS chi tiết và schema thống nhất, chưa có trạng thái pending |
| Xóa tin và khóa tài khoản là hai thao tác riêng | Gộp thành một nút xóa và khóa | FR-09.2 và FR-09.4 là quyền riêng; tránh khóa chủ tin ngoài ý định |
| Chỉ có tên cho danh mục/kỹ năng | Thêm slug, icon, trạng thái danh mục | SQL hiện chỉ có id/name, không tạo trường chưa có nguồn dữ liệu |
| Chặn xóa ngành nghề đang được dùng | Xóa cascade hoặc gán mặc định | FK `jobs.category_id` có ON DELETE RESTRICT |
| Cảnh báo khi xóa kỹ năng được dùng | Chặn toàn bộ xóa; xóa không cảnh báo | SQL cascade liên kết job_skills/candidate_skills; cần diễn giải hậu quả |
| Dữ liệu mẫu lưu theo tab, có khôi phục | Không lưu; localStorage vĩnh viễn | Kiểm tra được quy trình liên trang, không sửa DB hay lưu lâu dài |
| Giữ footer dùng chung | Footer nội bộ mới | Đồng bộ bộ thiết kế và tài liệu footer hiện có |

## Hệ thống giao diện

Phong cách **quản trị tối giản, có cấu trúc**: thanh header trắng viền navy, sidebar rõ nhóm tác vụ, bảng có mật độ vừa phải. Điểm nhận diện là logo check xanh/cam, thanh chỉ mục navy và các số liệu tabular. Không cần điểm DFII vì đây là đánh giá chủ quan; ưu tiên kiểm chứng thao tác và khả năng đọc.

- Font: Be Vietnam Pro, hệ thống dự phòng; tiêu đề 24–28px, nội dung 13px, nhãn 11–12px.
- Màu dùng biến CSS: navy `#002b7f`, blue `#005aff`, slate `#f4f6f9`, text `#16243b`, muted `#52647a`, emerald `#117653`, amber `#925400`, rose `#b4233b`.
- Khoảng cách 4/8/12/16/24/32px, bo góc 6–12px; chỉ chuyển màu ngắn, hỗ trợ reduced motion.
- Bộ dùng chung: shell, page heading, KPI, filter toolbar, bảng, phân trang, badge, empty/error/skeleton, dialog native, toast live region.

## Màn hình và dữ liệu

| Màn hình | Nội dung và thao tác | Đối chiếu |
| --- | --- | --- |
| `page_admin_portal` | KPI nhất quán với fixture, xu hướng tin/đơn, hàng chờ báo cáo, tài khoản gần đây | README dashboard |
| `page_admin_jobs` | Tìm theo tiêu đề/công ty, lọc báo cáo/trạng thái, sắp xếp, phân trang, mở chi tiết | FR-09.1, jobs |
| `page_admin_job_detail` | JD, yêu cầu, quyền lợi, lương, hạn nộp, công ty, kỹ năng; xóa có lý do và xác nhận tác động | FR-09.2, FR-04.6 |
| `page_admin_users` | Tìm tên/email không dấu, lọc role/status, xem tài khoản, khóa/mở khóa có xác nhận; admin được bảo vệ trong demo | FR-09.4, users |
| `page_admin_categories` | Tìm, thêm/sửa/xóa tên, báo trùng, chặn xóa ngành nghề có tin | FR-09.5, categories FK RESTRICT |
| `page_admin_skills` | Tìm, thêm/sửa/xóa tên, báo trùng, cảnh báo gỡ liên kết khi xóa | FR-09.5, skills + pivot cascade |

Không tạo danh sách lý do báo cáo hoặc số lượt báo cáo từ dữ liệu không có trong SQL. `applications_count` và số liên kết kỹ năng ứng viên trong fixture là projection minh họa của các quan hệ, không phải cột DB mới. Bộ dữ liệu có 12 tài khoản, 10 tin và 34 đơn ứng tuyển mẫu; `candidate_user_id` là projection qua `candidate_profiles.user_id`. Mỗi cặp tin/ứng viên là duy nhất, ngày nộp không trước ngày tạo tài khoản/tin và không sau hạn nộp. Biểu đồ tính lượt ứng tuyển theo ngày nộp riêng, không theo ngày tạo tin. Tổng số liệu được tính từ cùng fixture, xóa tin mẫu gỡ các đơn tương ứng và cập nhật các màn hình liên quan.

## Trạng thái, truy cập và lỗi

Các danh sách có skeleton trước khi dựng dữ liệu, trạng thái rỗng và nút xóa lọc, lỗi đọc dữ liệu mẫu với nút thử lại. Có nhãn form, table caption, scope, skip link, focus-visible, dialog trả focus, Escape và sidebar mobile dùng dialog modal. Dữ liệu nhập phải được escape trước khi dựng HTML. Tên danh mục theo giới hạn SQL 150 ký tự, kỹ năng 100; lý do xóa tối đa 255 ký tự. Không dùng alert/confirm của trình duyệt.

## Kiểm chứng đã thực hiện

- Chromium/Chrome headless: 6 màn hình × 5 kích thước 360/390/768/1024/1440px, không tràn ngang, không lỗi JavaScript, điều hướng hiện tại đúng, không có nút icon rỗng; xem ảnh desktop/mobile và các hộp thoại.
- Tìm không dấu, lọc trạng thái/role/báo cáo/tình trạng sử dụng, sắp xếp, phân trang, lưu bộ lọc vào URL, giữ bộ lọc khi reload, trạng thái rỗng và xóa lọc đạt.
- Tài khoản: xem chi tiết, hủy thao tác, khóa/mở khóa mẫu, giữ thay đổi sau reload; không cho khóa tài khoản quản trị trong demo. Escape đóng modal và trả focus về nút ban đầu hoặc điều khiển ổn định.
- Ngành nghề: validate rỗng/khoảng trắng/trùng tên không dấu; thêm/sửa/xóa mẫu; chặn xóa ngành nghề có tin đúng ràng buộc FK. Kỹ năng: cảnh báo số liên kết, gỡ khỏi tin mẫu sau xóa, giữ nội dung tin.
- Xóa tin: bắt buộc lý do và xác nhận ảnh hưởng, hiển thị nội dung thông báo dự kiến; cập nhật KPI, gỡ đơn ứng tuyển mẫu và giữ trạng thái tài khoản chủ tin. Có màn hình không tìm thấy khi ID sai hoặc tin đã xóa.
- Dữ liệu session JSON hỏng: có lỗi, thử lại và khôi phục. Khi sessionStorage bị chặn, các thao tác vẫn dùng bộ nhớ trang và thông báo rõ không giữ thay đổi khi chuyển trang. Mở trực tiếp bằng `file://` vẫn dựng được giao diện.
- Input HTML độc hại được hiển thị dưới dạng chữ sau lưu/reload, không tạo thẻ img hoặc chạy sự kiện. Ngày theo DD/MM/YYYY, tiền theo vi-VN. Tổng 34 đơn từ các cặp ứng viên/tin hợp lệ, khớp KPI và biểu đồ.
- Axe-core (WCAG 2 A/AA + 2.1 AA): 6 trang ở 1440 và 360px, cùng menu mobile, modal danh mục có lỗi và modal xóa tin có lỗi: không phát hiện vi phạm tự động. Đây không phải chứng nhận WCAG hay kiểm thử trình đọc màn hình.
- Tab/Shift+Tab được giữ trong dialog, Escape và menu mobile hoạt động; chế độ reduced motion tắt animation/transition. Có skip link và trạng thái busy/live region.
- `node --check` cho cả 4 file JavaScript, `git diff --check`, kiểm tra liên kết cục bộ/ID/UTF-8/footer đạt. Bộ đồng bộ footer nhận mọi trang nội dung, thử với bản sao 6 trang admin đạt và lần chạy thứ hai không thay đổi file.

Chưa kiểm thử API, phân quyền thực tế, WebSocket, tải đồng thời, uptime, trình đọc màn hình hay Firefox/Safari. Không chạy build Next.js/Laravel vì không sửa mã ứng dụng của hai phần này. Bản giao diện HTML đã được kiểm chứng trong phạm vi trên; để triển khai production cần tích hợp backend và kiểm thử các tác vụ thật.
