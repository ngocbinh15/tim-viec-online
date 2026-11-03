# Kiểm chứng trình tạo CV — 29/10/2026

Chức năng đã triển khai trên `feature/cv-builder`. Hướng dẫn bật và chạy: [cv-builder-setup.md](cv-builder-setup.md). Các kết quả CI/benchmark bên dưới thuộc lượt triển khai ban đầu trên database riêng cổng 33063. Lượt chỉnh giao diện mới được ghi riêng dưới đây.

## Rà soát trước merge vào develop — 30/10/2026

- Sửa mất bản nháp khi Next giữ editor trong React Activity: giữ cùng bộ tự lưu và revision, lưu các thay đổi đang chờ khi rời trang, giữ lỗi/xung đột khi quay lại và không tải lại dữ liệu đã khởi tạo. Kiểm thử Chromium dùng editor thật, API mô phỏng, xác nhận lưu sau điều hướng, tiếp tục sửa theo revision mới, thử lại lỗi 422 và giữ bản nháp xung đột qua nhiều lần ẩn/hiện. Bài này được thêm vào CI bằng `npm run test:cv-lifecycle`.
- Liên hệ dài được tách khỏi tiêu đề không ngắt trang. Kiểm tra cả sáu mẫu với mười URL gần giới hạn 1.000 ký tự: giữ đủ toàn bộ URL khi phân trang. Các danh sách trong API phải là JSON array; request dạng object bị trả 422 và không đổi revision đã lưu.
- Backend toàn bộ: **197 tests / 2.026 assertions đạt**, trên `tim_viec_online_cv_wizard_test`. Frontend: **136 unit, 11 server, 9 renderer, 1 browser worker và 1 Activity lifecycle đạt**. Production build/TypeScript, ESLint, Pint, Composer validate và audit đạt; npm audit không có mức high/critical, còn ba cảnh báo low từ công cụ shadcn CLI.
- Review độc lập backend và frontend đã kiểm tra lại các trường hợp tái hiện sau sửa, không còn lỗi chặn merge trong phạm vi rà soát.
- E2E production build với Laravel/queue thật trên database disposable cổng 33063: **1 test đạt**, không retry. Bao gồm điều hướng trước khi tự lưu, hai tab xung đột, lưu bản sao, reload, preview 360/768/1440px và axe, tải `Nguyễn Minh An CV.pdf`, ứng tuyển, xóa bản nháp và employer tải lại đúng bytes PDF của đơn đã nộp. Spec dùng locator theo role để không chọn nhầm editor ẩn trong cache. Không reset hoặc seed database phát triển.

## Bổ sung ba mẫu CV — 30/10/2026

Thêm Điều hành (`executive`), Thanh lịch (`elegant`) và Chuyên môn (`technical`), nâng danh sách lên sáu mẫu ở trang tạo CV và trong editor. Điều hành có tiêu đề nền đậm; Thanh lịch có trục dọc mảnh; Chuyên môn đặt kỹ năng/ngoại ngữ bên phải và dùng một cột khi hồ sơ ít nội dung. Dùng chung dữ liệu, ảnh riêng tư, màu sắc, cỡ chữ và giãn dòng hiện có. Backend dùng cùng allowlist cho tạo/lưu; không cần migration. Renderer tăng lên `5`; đã rebuild artifact và tạo đủ sáu ảnh mẫu 1200×1698 từ PDF thật.

Kiểm chứng: 136 unit tests, 8 renderer tests và browser worker cho đủ sáu mẫu đạt. Backend Resume đạt 22 tests / 218 assertions trên `tim_viec_online_cv_wizard_test`; production build/TypeScript, scoped ESLint, Pint và diff check đạt. Renderer kiểm tra tiếng Việt, nội dung nhiều trang, tên/email dài, ảnh, ẩn/sắp xếp mục và hồ sơ thưa nội dung. Browser API thật kiểm tra tạo/xem trước/xuất/tải cả ba mẫu mới, upload ảnh rồi đổi qua đủ sáu mẫu giữ nguyên nội dung, reload giữ thay đổi, tải đúng tên `Nguyễn An Kiểm Tra CV.pdf`. PDF tải về đều một trang có ảnh và văn bản tiếng Việt; thẻ mẫu không tràn ở 360px, axe trên thư viện không ghi nhận vi phạm. Tài khoản, CV, ảnh và PDF thử đã được dọn; không nộp đơn hoặc gửi email thử.

## Ảnh mẫu khi tạo CV

Dropdown chọn CV trong hộp thoại ứng tuyển dùng Radix Select với giao diện `selection-menu` chung. Nhãn, hướng dẫn và liên kết thư viện tách dòng; khóa lựa chọn khi đang tải/gửi, hiển thị trạng thái rỗng/lỗi riêng. Browser API thật kiểm tra chọn bản PDF ready, liên kết xem đúng export, tên dài không tràn ở 360px, ArrowDown/Escape trả focus về dropdown và không đóng dialog cha; axe không có vi phạm. Kiểm tra payload ứng tuyển qua request bị chặn tại browser xác nhận `cv_source=builder` và đúng `resume_export_id`, không gửi đơn thật. Build/TypeScript và lint đạt; spec E2E đã đổi sang thao tác combobox/option, chưa chạy lại toàn bộ suite E2E trong lượt này.

Ba ảnh mẫu được dựng lại từ renderer hiện tại và `tests/fixtures/resumes/showcase.json`, cùng kích thước 1200×1698. Bản Modern cũ chỉ 300×425 nên bị mờ khi phóng theo thẻ. Dùng static import và `sizes` cho ảnh responsive; URL theo nội dung tránh giữ ảnh cũ trong cache. Đã kiểm tra lựa chọn mẫu, ảnh trên màn hình 1920px ở DPR 1/2 và bố cục 360px; build/TypeScript/lint đạt.

Để dựng lại ảnh sau khi sửa template: trong `frontend`, chạy `npm run build:cv-renderer`, rồi `python scripts/generate-resume-covers.py` (cần PyMuPDF). Script dùng thư mục tạm cho PDF và chỉ cập nhật sáu PNG sau khi tất cả mẫu render thành công.

## Ảnh xem trước trong thư viện CV

Xác nhận xóa CV dùng AlertDialog của hệ thống, hiển thị tên bản nháp, nút Hủy và Xóa CV. Browser API thật đã kiểm tra Hủy/Escape không xóa, trả focus về nút mở, xóa thành công trả focus về tiêu đề thư viện; lỗi 503 giữ hộp thoại để thử lại, trong lúc chờ không gửi lặp hoặc đóng hộp thoại. Đã kiểm tra bố cục 360px và axe trên dialog; build/TypeScript/lint đạt. Dữ liệu kiểm tra được dọn sau lượt chạy.

Ảnh thu nhỏ được dựng từ trang đầu của bản nháp đã lưu, dùng cùng renderer với editor. Nội dung, mẫu, màu và ảnh cá nhân lấy qua API riêng tư của CV; không dùng ảnh mẫu hoặc bản PDF xuất cũ. Không cần xuất PDF để có ảnh thu nhỏ. Chỉ tải các thẻ gần vùng nhìn thấy, dùng chung một worker và xử lý tuần tự; hủy tác vụ, giải phóng worker/blob URL khi rời thư viện. Thẻ lỗi hiển thị trạng thái riêng và vẫn mở được editor.

Kiểm chứng cục bộ: tái hiện ảnh mẫu cố định trước sửa; sau sửa, đổi tên/chức danh và upload ảnh qua editor, lưu rồi quay lại thư viện cho ảnh PNG khác đúng nội dung mới. Ba mẫu tạo được ảnh riêng khi chưa có export; một API chi tiết trả 503 không chặn hai thẻ còn lại, tải lại khôi phục ảnh. Điều hướng khỏi rồi quay lại, giao diện 360px và axe trên thư viện đều qua. Production build/TypeScript, lint và 135 unit tests đạt. Dữ liệu và token kiểm tra được dọn; không chạy lại toàn bộ E2E CI hoặc sửa backend trong lượt này.

## Kiểm tra giao diện theo bước và nội dung mẫu

Lượt chỉnh dropdown/tải file: ba dropdown giao diện dùng `SelectionField` chung, có trạng thái disabled rõ ràng; viền menu đo trên browser là 1px, không có outline hiển thị. Lựa chọn lưu qua reload, popup không tràn ở 360px, axe không ghi nhận vi phạm trong menu đã kiểm tra. Kỹ năng giảm cỡ chữ/độ đậm/khoảng cách, renderer tăng lên 4 và rebuild artifact. Ba nút tải (thanh trạng thái, bước xuất, thư viện) đều tải thực tế tên `Nguyễn Ngọc Bình CV.pdf`; response có Unicode `filename*`, vẫn xem inline được. Bộ kiểm tra: production build/TypeScript/lint đạt, frontend unit 133/133, renderer 5/5, backend Resume 21/21 (167 assertions) trên DB test riêng. Test tên file bao gồm dấu tiếng Việt, loại ký tự đường dẫn/control và giữ tên từ snapshot sau khi bản nháp được sửa.

Cập nhật cùng ngày: bỏ thanh nhắc và nút bổ sung mẫu; dữ liệu tự khởi tạo một lần theo `settings.starter_version`, không thêm lại mục đã xóa. Thay câu chữ hướng dẫn trong nội dung CV bằng mô tả công việc/học vấn, giữ nguyên các đoạn ứng viên đã sửa. Thay ô tháng native bằng Popover/Select và lưới tháng tiếng Việt, hiển thị MM/YYYY.

Kiểm chứng cập nhật: build production, TypeScript, lint đạt; frontend 133/133; backend Resume 19/19 (159 assertions), cùng database test riêng ghi dưới đây. Browser API thật: chọn tháng/năm → lưu → reload giữ `2022-05`; CV cũ tự điền và làm sạch giá trị mẫu cũ, giữ tên/kỹ năng thật; xóa học vấn → save/reload vẫn rỗng; PDF trả HTTP 200 và `%PDF-`. Popup tháng ở 360px nằm trong viewport, Escape trả focus về ô mở, xóa/tháng này hoạt động; axe không có vi phạm trong editor và popup đã kiểm tra. Các bullet dưới đây ghi nhận lượt giao diện trước, nút bổ sung thủ công đã được thay thế.

- Editor theo tham chiếu `design/page_cv`: 9 bước, một nhóm nhập liệu mỗi bước, xem trước PDF song song trên desktop; thanh bước tự cuộn đến bước hiện tại trên mobile.
- CV mới từ giao diện có dữ liệu mẫu tiếng Việt và ưu tiên thông tin thật của hồ sơ. Nút bổ sung mẫu điền phần trống của CV cũ; đã kiểm tra xóa học vấn rồi bổ sung lại, giữ nguyên tên và công ty đã sửa.
- Trình duyệt thật với tài khoản disposable: tạo CV có đủ các mục, thêm/xóa kinh nghiệm, chuyển qua mọi bước, lưu và reload giữ dữ liệu; xuất và đọc file PDF trả HTTP 200, MIME `application/pdf`, header `%PDF-`.
- Không tràn ngang ở 360/768/1440px. Canvas khớp chiều rộng vùng xem trước; axe WCAG 2 A/AA không có vi phạm trong editor ở các bước giao diện, cá nhân, kinh nghiệm, bổ sung và xuất PDF đã kiểm tra. Vùng PDF cuộn được bằng bàn phím.
- `npm run build`, `npx tsc --noEmit`, `npm run lint` đạt; frontend unit 131/131; backend nhóm Resume 19/19, 153 assertions trên database riêng `tim_viec_online_cv_wizard_test` (MySQL 3306). Không reset/seed database phát triển.
- Đã cập nhật spec `backend-resume-builder.spec.ts` theo điều hướng mới; chưa chạy lại toàn bộ suite browser CI trong lượt này. Luồng trình duyệt cục bộ nêu trên dùng API thật và worker `cv` thật.
- Tài khoản, token và CV của lượt kiểm tra được dọn sau khi xác minh. Không gửi email hoặc gọi AI.

## Phạm vi đã có

- Thư viện CV, ba mẫu Classic/Modern/Minimal, nhập liệu, thứ tự/ẩn mục và ảnh riêng cho từng CV.
- Tự lưu tuần tự theo revision; không ghi đè khi hai tab xung đột; giữ nội dung chưa lưu và cho lưu thành bản mới.
- Preview dùng cùng template/PDF với renderer, chạy tạo PDF trong Web Worker; PDF.js vẽ trang trực tiếp trên desktop/mobile.
- Export bất biến trên queue `cv`, kiểm tra tối đa 5 trang/5 MB, font tiếng Việt cục bộ, retry có giới hạn và token ngăn job cũ công bố kết quả.
- Ứng tuyển bằng PDF đã xuất; mỗi đơn giữ bản sao riêng. Xóa/sửa bản nháp không thay CV đã nộp. Không gọi AI khi chỉnh sửa/xuất; AI sau ứng tuyển giữ quy tắc bỏ qua dữ liệu demo.
- Feature flag, upload ảnh đã tái mã hóa, file private có kiểm tra quyền, lệnh dọn file và health check hàng đợi.

## Kiểm thử

### Rà soát giao diện và tải PDF

- Làm mới ba mẫu: Classic một cột với thời gian căn phải; Modern tiêu đề xanh đậm, sidebar nền sáng; Minimal tiêu đề căn giữa và màu trung tính. Cùng font Be Vietnam Pro, ba bảng màu và các tùy chọn cỡ chữ/giãn dòng cũ.
- Tách **Xem PDF** và **Tải PDF**, hỗ trợ tải từ thư viện. Tăng `renderer_version` lên `2`; bấm xuất lại sẽ tạo PDF theo thiết kế mới, không dùng lại cache của renderer cũ.
- Kiểm tra ảnh render của hồ sơ tổng hợp đầy đủ (một trang với cả ba mẫu) và hồ sơ dài ba trang. Sửa chân trang biến mất do leading kế thừa, tiêu đề mục bị tách khỏi nội dung, trang trắng phát sinh và nội dung nhiều dòng bị cắt bởi khối không cho ngắt trang.
- Bổ sung kiểm thử email dài, kỹ năng 65 dòng, chức danh chứa xuống dòng; giữ đủ nội dung khi phân trang và không để token dài tràn lề. Chỉ chuẩn hóa khoảng trắng của trường một dòng khi trình bày; văn bản bản nháp và đích liên kết không đổi.
- Node renderer: **4 tests qua**; browser preview worker: **1 test qua**. PDF.js kiểm tra chân trang nằm trong trang, đủ phần cuối của 10 mô tả kinh nghiệm, mục dự án/chứng chỉ không bị bỏ lại tiêu đề và không có trang cuối rỗng.
- Backend nhóm Resume: **18 tests / 131 assertions qua** khi chạy tuần tự. Bổ sung kiểm tra tên có khoảng trắng/xuống dòng và từ dài: bước xác nhận text PDF bỏ qua khoảng trắng do phân trang, không báo `PDF_TEXT_MISSING` chỉ vì tên được ngắt dòng. Một lượt chạy đồng thời với build bị timeout ở bài kiểm thử process tranh khóa; chạy lại riêng cả nhóm qua, không thay timeout hoặc bỏ kiểm thử.
- Toàn bộ backend sau sửa: **192 tests / 1.906 assertions qua**.
- Frontend unit **130**, server **11** qua; lint, typecheck và production build qua. Các số đo tải ở dưới thuộc lượt đo trước, chưa đo lại với thiết kế mới.
- E2E Laravel + worker Node thực **1 test qua**: trình duyệt tải được `CV-<id>.pdf`, bytes trùng với bản ở nút **Xem PDF**; ứng tuyển, xóa bản nháp và employer đọc lại bản PDF riêng vẫn qua. Kiểm tra editor ở 360/768/1440px và axe qua. Review độc lập xác nhận hai lỗi cắt nội dung đã hết sau khi chạy lại đúng trường hợp tái hiện.

Các kết quả CI và bảng bên dưới ghi lại lượt kiểm chứng nền tảng trước lần làm mới mẫu.

Windows: PHP 8.2.12, Node 22.23.2, MySQL/MariaDB disposable trên 33063. PHP CLI kiểm thử bật GD bằng `-d extension=gd`; không sửa `php.ini` đang dùng.

| Bộ kiểm tra | Kết quả đã chạy |
|---|---|
| Backend toàn bộ, sau bản vá dependency | Linux CI: 191 tests / 1.904 assertions qua; Windows: 190 tests / 1.894 assertions qua trước khi bổ sung test giới hạn, sau đó riêng `ResumeApiTest` 4 tests / 35 assertions qua |
| Frontend unit / server | 130 / 11 tests qua |
| Node PDF renderer / browser render worker | 2 / 1 tests qua; ba mẫu PDF nhiều trang trích xuất được tiếng Việt |
| Lint / typecheck / production build | Qua |
| E2E Laravel + Node queue thực | Qua: tạo, lưu, reload, upload lỗi, xung đột hai tab, sao chép dirty buffer, export, ứng tuyển, xóa bản nháp, employer tải lại đúng PDF |
| Giao diện | Kiểm tra 360/768/1440px, canvas có nội dung và đúng tỷ lệ trang; axe không có vi phạm trong editor đã kiểm tra |
| Migration | Migrate → rollback ba bảng mới → CV profile cũ còn nguyên → migrate lại; ràng buộc unique export từ chối bản trùng |
| Hồi quy CI cũ | Search/company 18/18 lượt kiểm thử qua; lượt tập trung cuối company/selection 16/16 qua, lặp hai lần và không retry |
| Browser Linux CI cuối | Public 206; auth 28; AI 4; admin performance 4; CV với Laravel thực 1. Các job đều thành công; một test auth cần retry như ghi bên dưới |

Ba lỗi tìm thấy qua review đã sửa và có kiểm thử tái hiện trước khi sửa: file export bị mất không thể tạo lại; deadlock khi copy/export đồng thời; đổi tên trong lúc upload bị ghi đè. Kiểm thử deadlock dùng hai process và khóa MySQL thực.

Đã thêm kiểm thử và sửa việc xóa CV cuối ở trang 2: danh sách tự trở về trang hợp lệ, không báo rỗng khi trang 1 vẫn còn CV.

CI Linux tại commit `b10f467` đã qua cả [Backend](https://github.com/ngocbinh15/tim-viec-online/actions/runs/40817925024) và [Frontend](https://github.com/ngocbinh15/tim-viec-online/actions/runs/40817925055). Bước audit ban đầu phát hiện Symfony Mime 7.4.19 cần bản vá; lockfile đã nâng riêng gói này lên 7.4.22, `composer audit --locked` qua.

Minor còn lại: test accessibility trang auth ở 360px thất bại lượt đầu do contrast 4,34 thay vì 4,5, sau đó qua retry mặc định. Có thể phép đo lấy mẫu giữa hiệu ứng vào trang; chưa xác minh thêm hoặc sửa test này trong phạm vi CV builder. Không tăng retry hay bỏ kiểm tra contrast. CI xanh không có nghĩa toàn bộ bộ kiểm thử cũ đã hết flaky.

## Số đo tải cục bộ

Máy Windows, Intel i5-13500HX, 20 logical CPU, RAM 16 GiB; PHP 8.2.12, Node 22.23.2. Mỗi tài khoản có một CV tổng hợp ngắn, mỗi đợt bắn đồng thời một request/tài khoản qua HTTP loopback, không gọi provider AI/email. Chưa đại diện cho thư viện 20 CV/người, CV 5 trang có ảnh lớn hoặc tải production kéo dài.

| Runtime / tải | List p95 | Save p95 | Hai export worker, thời gian lớn nhất |
|---|---:|---:|---:|
| PHP development server, một worker, 50 tài khoản | 40.558 ms | 48.191 ms | 2.232 ms |
| Apache 64 threads, chưa bật OPcache, 50 tài khoản | 7.130 ms | 5.892 ms | 2.300 ms |
| Apache + OPcache, đợt đầu sau khởi động, 50 tài khoản | 7.532 ms | 1.408 ms | 2.190 ms |
| Apache + OPcache đã ấm, 50 tài khoản | 1.404 ms | 1.176 ms | 2.419 ms |
| Apache + OPcache đã ấm, 10 tài khoản | 324 ms | 310 ms | 2.180 ms |

**Mục tiêu save p95 dưới 500 ms ở 50 người chưa đạt trên máy này.** List đạt mục tiêu 1,5 giây khi cache đã ấm, export ngắn dưới 10 giây với hai worker. Với hai mẫu export, cột export là thời gian lớn nhất quan sát được, không phải một ước lượng p95 đủ tin cậy. Nó bao gồm khởi động PHP/worker và render, không đo thời gian chờ hàng đợi dưới tải kéo dài.

Giữ rollout thử nhỏ trước; dùng Apache/Nginx với PHP phù hợp và OPcache, chạy worker `cv` riêng. Cần đo lại save latency trên máy triển khai trước khi mở rộng lên 50 phiên chỉnh sửa. Số đo hiện tại không chứng minh đủ SLA production; chưa có số đo input latency và query count dưới tải đồng thời.

Probe bổ sung trong runtime test: list 1 hoặc 20 bản nháp dùng 6–7 query (gồm xác thực), save dùng 8 query; PHP peak 28 MiB cho probe gọi HTTP kernel tuần tự. Hai process Node render đồng thời fixture dài có peak RSS 137.468–138.364 KiB (~134–135 MiB/process), runtime 1.439–1.447 ms. Đây là các phép đo riêng, không phải bộ nhớ toàn hệ thống dưới tải 50 người. PHPUnit peak memory 82 MB cũng chỉ là bộ nhớ của tiến trình kiểm thử.

Script tái chạy: `frontend/scripts/benchmark-resumes.mjs` và fixture CLI tương ứng ở backend. Chúng chỉ dùng database E2E disposable và cổng loopback cho phép, tự xóa tài khoản/token/file của lượt đo. Cần có fixture E2E đã migrate và server test đang chạy; **không chạy đồng thời với Playwright đang reset cùng database**.

```powershell
# Terminal riêng, từ repository, chỉ sau khi fixture frontend E2E đã được tạo:
php -S 127.0.0.1:8127 backend/scripts/frontend-e2e-router.php

# Terminal khác:
cd frontend
node scripts/benchmark-resumes.mjs
# Có thể dùng 10 thay vì 50 tài khoản:
$env:RESUME_BENCHMARK_USERS='10'
node scripts/benchmark-resumes.mjs
```

Apache benchmark sử dụng cấu hình riêng ở 127.0.0.1:8137 và PHP ini riêng, không chỉnh XAMPP chính. Nếu chuẩn bị runtime tương đương, đặt `RESUME_BENCHMARK_PORT=8137`; bảo đảm Apache chuyển Authorization header cho PHP. Kết quả JSON nằm trong `frontend/test-results/resume-benchmark/`, không chứa token.

## Điều chỉnh triển khai

- Dùng checkout `feature/cv-builder` mà người dùng đã chọn; giữ nguyên thay đổi riêng ở `docs/demo-data.md`.
- Test renderer dùng ESM `.mts` và artifact CLI đã build để tương thích cách resolve dependency của React PDF.
- Preview canvas thay iframe sau khi QA mobile phát hiện khung trắng. Thêm dependency PDF.js tải theo editor và worker tĩnh cục bộ.
- Xây export backend trước editor để kiểm thử được API/queue độc lập; ba template dùng chung một React PDF document với các bố cục khác nhau.
- Bộ browser thật gộp tạo/xuất/ứng tuyển vào một spec để kiểm tra xuyên suốt bằng cùng một PDF. Autosave tách thành lớp điều phối để kiểm thử thứ tự request độc lập React.
- Không mở flag toàn hệ thống trong đợt này; bước bật, migration additive và worker nằm trong hướng dẫn vận hành. Đặc biệt chưa xác nhận mức tải 50 người đạt đầy đủ mục tiêu.
