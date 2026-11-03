# Kế hoạch triển khai trình tạo CV theo mẫu

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Chỉ dùng quy trình nhiều agent nếu người dùng chọn cách đó khi bắt đầu triển khai.

**Goal:** Ứng viên tạo, chỉnh sửa, lưu nhiều CV theo mẫu, xem trước, xuất PDF và dùng bản PDF đã chọn để ứng tuyển.

**Architecture:** Laravel giữ quyền sở hữu, dữ liệu bản nháp và các bản xuất bất biến; Next.js cung cấp trình nhập liệu. Một bộ template React PDF dùng chung cho xem trước ở trình duyệt và xuất PDF chuẩn qua Node CLI do Laravel queue gọi. Luồng ứng tuyển tiếp tục lưu bản sao PDF riêng của từng đơn.

**Tech Stack:** Laravel 12/PHP 8.2+, MySQL, Sanctum, database queue; Next.js 16.4.2/React 19.3/TypeScript, shadcn/Radix/Lucide/Sonner. Đề xuất thêm `@react-pdf/renderer`, `esbuild` và thư viện kiểm tra schema phía TypeScript; phải kiểm chứng tương thích và chốt phiên bản trong Task 1 trước khi cài vào sản phẩm.

**Spec:** [SRS hiện tại](../../SRS.md), đặc biệt FR-03, FR-06, FR-07 và NFR-01/NFR-07. Mục 1–8 bên dưới là đề xuất đặc tả mở rộng; chức năng tạo CV chưa nằm đầy đủ trong SRS hiện hành.

**Trạng thái:** Kế hoạch, chưa triển khai code/migration. Ngày lập: 29/10/2026. Người dùng đã chọn phạm vi theo mẫu: 3–5 mẫu, nhập liệu, xem trước, tự lưu, xuất PDF và ứng tuyển.

**Cập nhật triển khai 29/10/2026:** luồng chức năng đã có trên `feature/cv-builder`; xem [báo cáo kiểm chứng](../../cv-builder-verification.md) và [hướng dẫn chạy](../../cv-builder-setup.md). Preview cuối cùng dùng PDF.js canvas để hiển thị PDF do worker tạo. Mục tiêu save p95 ở 50 người chưa đạt trên máy local; chưa bật rollout toàn hệ thống. Các checklist dưới đây giữ yêu cầu nghiệm thu chi tiết ban đầu; báo cáo nêu phạm vi đã kiểm chứng thực tế.

M0–M3 đã có luồng dùng được và được kiểm thử. CI backend/frontend của mã nguồn cuối đã xanh; M4 triển khai rộng vẫn cần đo lại save p95 trên máy vận hành. Có một test auth cũ cần retry trong CI, được ghi rõ trong báo cáo; phép đo input latency bổ sung chưa thực hiện.

## Global Constraints

- File CV ứng tuyển là **PDF**, tối đa **5 MB**, tiếp tục áp dụng cho PDF được hệ thống tạo.
- Chỉ candidate sở hữu mới được đọc/sửa bản nháp. Employer/admin chỉ đọc PDF qua quyền truy cập đơn ứng tuyển hiện có, không được duyệt bản nháp của ứng viên.
- Chưa xác nhận email: được chuẩn bị CV; ứng tuyển vẫn bị chặn bởi `email.verified`. Không tự đánh dấu email đã xác thực khi tạo/xuất CV.
- “CV đã nộp” không thay đổi khi sửa/xóa bản nháp hoặc thay ảnh sau này.
- Không reset/seed lại database hiện tại; mọi thay đổi cấu trúc dùng migration bổ sung.
- Không đưa CV vào public storage, không trả đường dẫn filesystem/token Sanctum cho trình duyệt, không log nội dung CV.
- AI chỉ chạy theo luồng sau nộp đơn; không gọi AI khi mở editor, tự lưu, đổi mẫu hoặc xuất PDF. CV demo tiếp tục bị loại khỏi AI.
- Giao diện dùng màu/token hiện có, đủ skeleton/empty/error state, dùng được từ **360px** và bằng bàn phím.
- Không sao chép mẫu, hình ảnh hoặc mã nguồn TopCV. Tham khảo luồng sử dụng; thiết kế mẫu riêng cho TimViecOnline.

## Review Focus

1. Hai tab sửa cùng CV: lưu cũ phải nhận `409`, không ghi đè im lặng. Kiểm chứng ở Task 3 và Task 5.
2. CV đổi nội dung khi đang xuất PDF: bản xuất phải giữ đúng revision đã yêu cầu. Kiểm chứng ở Task 6.
3. Ứng viên xóa CV hoặc ảnh sau khi nộp: PDF/AI của đơn cũ vẫn hoạt động. Kiểm chứng ở Task 7.
4. CV dài, dấu tiếng Việt, URL dài: không mất chữ, chồng chữ, cắt trang sai; text vẫn trích xuất được. Kiểm chứng ở Task 1/4/8.
5. Đổi ID, ảnh từ URL ngoài hoặc file giả ảnh: không đọc CV người khác, không SSRF, không đọc file tùy ý. Kiểm chứng ở Task 3/6/8.

## 1. Phạm vi đã thống nhất và các mặc định đề xuất

### Đợt đầu: một luồng hoàn chỉnh

- Trang **CV của tôi**: tạo, đổi tên, sao chép, xóa, mở lại CV; danh sách phân trang 12 CV/trang.
- Khởi đầu **3 mẫu**: `classic` một cột, `modern` hai cột, `minimal` một cột ít trang trí. Thêm hai mẫu sau nghiệm thu luồng đầu.
- Nội dung: thông tin liên hệ, chức danh/mục tiêu, kinh nghiệm, học vấn, kỹ năng, dự án, chứng chỉ, ngoại ngữ, hoạt động.
- Thêm/xóa/sắp xếp mục bằng nút lên/xuống; ẩn mục trống. Thêm/xóa/sắp xếp các mục con bằng nút, không kéo thả tự do.
- Chọn ảnh CV riêng, màu nhấn trong bảng màu cho phép, cỡ chữ và giãn dòng theo preset.
- Lấy thông tin hồ sơ hiện tại **một lần khi tạo**. Đổi hồ sơ cá nhân sau đó không tự ghi đè CV.
- Bản nháp cho phép thiếu nội dung; trước khi xuất bắt buộc có họ tên, chức danh, email hợp lệ và ít nhất một mục nội dung có dữ liệu.
- Tự lưu, nút “Lưu ngay”, hiển thị “Đang lưu / Đã lưu / Lưu thất bại / Có xung đột”.
- Xem trước PDF, tải PDF, chọn bản xuất để ứng tuyển; vẫn giữ lựa chọn CV hồ sơ hiện có và upload PDF mới.

### Mặc định kỹ thuật cần đo lại trong đợt triển khai

| Nội dung           | Mặc định đề xuất                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dung lượng JSON    | Tối đa 128 KiB sau chuẩn hóa; giới hạn ở cả web server và FormRequest                                                                                 |
| Số bản nháp        | Tối đa 20 CV còn hoạt động/candidate; trả `422` khi vượt giới hạn                                                                                     |
| Độ dài nội dung    | Họ tên 120, tiêu đề 150, tên CV 120 ký tự; mô tả mỗi mục con 2.000 ký tự; tối đa 20 mục con cho mỗi loại                                              |
| Ảnh CV             | JPEG/PNG/WebP ≤ 2 MB; kiểm tra nội dung ảnh và tái mã hóa, cạnh tối đa 2.048px                                                                        |
| Tự lưu             | Debounce 1 giây; một request đang lưu/CV, gộp thay đổi tiếp theo                                                                                      |
| Xem trước          | Debounce 600ms, render trong Web Worker, bỏ kết quả render cũ                                                                                         |
| Giới hạn xuất      | 5 yêu cầu/phút và tối đa 2 export đang chờ/chạy/candidate                                                                                             |
| PDF                | A4, tối đa 5 trang và 5 MB; hướng dẫn rút gọn nếu vượt, không cắt nội dung âm thầm                                                                    |
| Mục tiêu hiệu suất | Save p95 < 500ms; API danh sách p95 < 1,5s khi 50 người dùng đồng thời; PDF 1–3 trang p95 < 10s với 2 render đồng thời trên máy benchmark được ghi rõ |
| Timeout export     | Node process 30s; Laravel job 45s; queue `retry_after` lớn hơn timeout job; tối đa 2 lần cho lỗi tạm thời                                             |

Các giá trị trên là mục tiêu/giới hạn thiết kế, chưa phải kết quả benchmark. Nếu máy vận hành yếu hơn, giảm số worker trước khi nâng timeout.

### Chưa đưa vào đợt đầu

Chỉnh trực tiếp bằng `contenteditable` trên trang CV, kéo thả tọa độ tự do, HTML/CSS tùy ý, link CV công khai, chia sẻ/chỉnh sửa cộng tác, thanh toán mẫu premium, nhập PDF cũ thành CV có thể chỉnh sửa, AI viết lại nội dung hoặc chấm CV cho ứng viên.

## 2. Hiện trạng repository và điểm tích hợp

| Thành phần có sẵn                                            | Hướng sử dụng                                                                                         |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `candidate_profiles.cv_file_path`                            | Tiếp tục đại diện file PDF hồ sơ hiện có; không biến cột này thành JSON của editor                    |
| `backend/app/Services/ApplicationCvStorage.php`              | Tái sử dụng `snapshot(string $source): string` để tạo PDF riêng trong `application_cvs/`              |
| `backend/app/Http/Controllers/Api/ApplicationController.php` | Bổ sung nguồn CV builder, giữ kiểm tra tin đang mở, nộp một lần, transaction và dọn file khi thất bại |
| `backend/app/Http/Requests/ApplyJobRequest.php`              | Hiện nhận `profile/default/new`; mở rộng thêm `builder` với `resume_export_id`                        |
| `backend/app/Services/AiAssessmentScheduler.php`             | Chỉ gọi sau đơn đã commit, dùng PDF snapshot hiện có                                                  |
| `backend/app/Services/AiCvEligibility.php`                   | Giữ cơ chế loại demo; không hiểu nhầm mọi PDF do builder tạo là dữ liệu demo                          |
| `frontend/src/components/jobs/apply-dialog.tsx`              | Thêm lựa chọn CV đã tạo và hiển thị tên/revision/bản xem trước trước khi gửi                          |
| `frontend/src/components/candidate/workspace-provider.tsx`   | Mở rộng payload apply; không tải tất cả JSON CV vào workspace bootstrap                               |
| `frontend/src/features/api/paths.ts`                         | Thêm allowlist chính xác cho API mới và `protectedFilePath` cho ảnh/PDF                               |
| `frontend/src/app/api/backend/[...path]/route.ts`            | Tái sử dụng proxy giữ token ở server, stream file riêng tư và kiểm tra same-origin hiện có            |
| `backend/config/filesystems.php`                             | Disk `private` trỏ `backend/storage/app/private`; đã có `throw=true`                                  |

Không cần chuyển toàn bộ hồ sơ ứng viên hiện tại sang schema mới. CV upload trước đây vẫn dùng được.

## 3. Giao diện và hành vi người dùng

### Các trang

| Route                        | Nội dung                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `/account/resumes`           | Danh sách CV, trạng thái bản nháp/bản xuất, tạo mới và sao chép              |
| `/account/resumes/new`       | Chọn mẫu rồi tạo bản nháp từ thông tin hồ sơ, chuyển đến editor bằng ID thật |
| `/account/resumes/[id]/edit` | Editor riêng: thanh công cụ, nhập liệu, xem trước, trạng thái lưu            |

Editor desktop dùng chiều rộng lớn hơn trang hồ sơ, hai vùng khoảng 40% nhập liệu / 60% preview. Trên mobile chuyển tab “Nội dung / Xem trước”; preview vừa chiều rộng và có tải PDF làm phương án dự phòng nếu trình duyệt không nhúng PDF được. Không tải bundle renderer ở trang việc làm, đăng nhập hoặc trang admin.

- Đổi mẫu/màu không làm mất nội dung hoặc thay thứ tự mục đã chọn.
- PDF preview là kết quả renderer, không dùng ảnh chụp HTML. Input vẫn là biểu mẫu có label; preview không phải cách duy nhất để đọc nội dung.
- Khi đang gõ, chỉ cập nhật state và worker; không gọi router refresh trên mỗi ký tự.
- “Xuất PDF” phải chờ lưu hết thay đổi, lấy revision mới từ server rồi tạo export.
- Khi có sửa đổi trong lúc export chạy, ghi rõ bản PDF thuộc revision cũ; không gắn nhãn “bản mới nhất”.
- Khi lỗi mạng, giữ thay đổi trong RAM và nút thử lưu lại. Không ghi CV vào `localStorage` mặc định; cảnh báo trước khi đóng tab có thay đổi chưa lưu. Không hứa khôi phục sau crash trình duyệt trong MVP.
- Khi xung đột hai tab: giữ nội dung đang sửa, đưa lựa chọn tải bản server hoặc sao chép phần đang sửa thành CV mới. Không tự retry ghi đè revision mới.

“Sao chép phần đang sửa” khi có xung đột dùng tạo CV mới rồi lưu dirty buffer vào CV mới; không gọi endpoint duplicate của bản server rồi coi nội dung đó là phần người dùng đang sửa.

## 4. Dữ liệu, version và lưu trữ

### Ba bảng bổ sung

| Bảng             | Trường chính / ràng buộc                                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resumes`        | `id` bigint, `candidate_id` FK → `candidate_profiles` cascade; `name` varchar(120); `template_key` varchar(40); `template_version` unsigned int; `schema_version` unsigned int; `content` JSON; `settings` JSON; `revision` unsigned int mặc định 1; `is_demo` boolean do server quyết định; timestamps; index `(candidate_id, updated_at, id)`                                         |
| `resume_assets`  | `id` bigint, `resume_id` FK cascade; `path`, `mime_type`, `size`, `sha256`, timestamps; file bất biến sau upload, backend trả URL đọc có xác thực                                                                                                                                                                                                                                       |
| `resume_exports` | `id` bigint, `resume_id` FK cascade; `revision`; `renderer_version`; `input_hash` char(64); `input_snapshot` JSON; `status` (`pending/processing/ready/failed`); `attempt_token` UUID nullable; `path` nullable; `size`, `page_count`, `sha256`, `error_code`, `started_at`, `completed_at`, timestamps; unique `(resume_id, revision, renderer_version)`; index `(status, updated_at)` |

`input_snapshot` gồm nội dung, settings, phiên bản schema/template và tham chiếu ảnh bất biến của revision. Thay ảnh tạo asset mới; chỉ dọn asset cũ khi không còn draft/export đang xử lý tham chiếu. Ảnh được worker đọc qua disk riêng tư rồi truyền bytes, không yêu cầu renderer tải URL từ người dùng.

**Không bắt buộc thêm FK từ `applications` đến bản nháp.** `applications.cv_path` đã đủ để giữ hồ sơ bất biến. Đợt đầu không thêm liên kết khiến xóa CV làm hỏng đơn; nếu cần lịch sử nguồn CV, bổ sung metadata nullable ở đợt riêng.

### Schema nội dung v1

`ResumeContentV1` có các khóa cố định:

- `basics`: `full_name`, `headline`, `email`, `phone`, `city`, `summary`, `links: [{id, label, url}]`, `photo_asset_id: number|null`.
- `experience`: `[{id, company, position, start_month, end_month, current, description}]`.
- `education`: `[{id, school, qualification, start_month, end_month, current, description}]`.
- `projects`: `[{id, name, role, url, description}]`.
- `skills`: `[{id, name, detail}]`; không dùng điểm số sao/phần trăm tự đánh giá trong template mặc định.
- `certifications`: `[{id, name, issuer, issued_month, url}]`.
- `languages`: `[{id, name, proficiency}]`.
- `activities`: `[{id, name, role, description}]`.

ID mục con là UUID; tháng `YYYY-MM` hoặc `null`, `current=true` thì `end_month=null`. Không bắt buộc gửi đủ dữ liệu để lưu nháp; parser chuẩn hóa các mảng rỗng. Từ chối khóa lạ, HTML thô, URI `javascript:/file:/data:` trong liên kết. Link chỉ cho `https/http`; email/điện thoại render từ trường riêng đã validate.

`ResumeSettingsV1 = { accent: "blue"|"teal"|"slate", font_size: "small"|"normal"|"large", line_spacing: "compact"|"normal", section_order: SectionKey[], hidden_sections: SectionKey[] }`. Thứ tự phải chứa mỗi section đúng một lần. Các kiểu và fixture phải đồng nhất ở PHP, TS và renderer; không tin client chỉ vì đã validate ở frontend.

### Đường dẫn file

```text
backend/storage/app/private/
  resume_assets/{candidateId}/{resumeId}/{uuid}.jpg
  resume_exports/{candidateId}/{resumeId}/{exportId}.pdf
  resume_exports/tmp/{uuid}.pdf
  application_cvs/{uuid}.pdf             # bản sao riêng đã có
```

- File CV demo do seeder tạo đi dưới `demo-seed/...` để `AiCvEligibility` nhận diện; bản snapshot demo vẫn giữ dấu hiệu demo. CV người dùng nhập thật không bị đánh dấu demo vì sử dụng template.
- Không dùng tên file người dùng làm tên lưu vật lý. Tên tải xuống được làm sạch và đặt qua `Content-Disposition`.
- PDF tải qua API có quyền và proxy Next; `Cache-Control: private, no-store`. Không `storage:link` thư mục private.
- Xóa resume: transaction đánh dấu/xóa dữ liệu theo quyền, dọn file sau commit. Worker đang chạy kiểm tra resume và `attempt_token` trước khi công bố; nếu resume đã xóa thì xóa output tạm. PDF trong `application_cvs/` không bị đụng tới.
- Tác vụ dọn rác chỉ xóa export không còn resume, file tạm quá 24 giờ và asset không được tham chiếu; có chế độ dry-run. Không quét xóa tùy ý theo đường dẫn client.

## 5. API đề xuất

Tất cả route dưới đây yêu cầu Sanctum và role candidate. Policy kiểm tra `resume.candidate_id === user.candidateProfile.id` ở backend; truy vấn owner trước khi đọc tài nguyên, ID không thuộc quyền trả `404`. FormRequest riêng cho mọi đầu vào; Resource riêng cho dữ liệu JSON.

| Method / API, sau prefix `/api`                 | Đầu vào / kết quả                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET /candidate/resume-templates`               | Danh sách manifest mẫu/phiên bản/settings cho phép; không trả CV cá nhân                                                        |
| `GET /candidate/resumes?page=1&per_page=12`     | Metadata và export mới nhất, không lấy toàn bộ `content`                                                                        |
| `POST /candidate/resumes`                       | `{name, template_key, prefill_from_profile}` → `201 ResumeDetail`; mặc định prefill chỉ khi người dùng chọn                     |
| `GET /candidate/resumes/{id}`                   | Nội dung riêng tư, `revision`, settings và trạng thái export                                                                    |
| `PUT /candidate/resumes/{id}`                   | `{base_revision, name, template_key, content, settings}` → revision mới; so sánh/cập nhật atomically, stale → `409`             |
| `POST /candidate/resumes/{id}/duplicate`        | `{base_revision, name}`; chỉ copy revision hiện tại đã lưu; → `201` CV mới, ảnh riêng nếu có                                    |
| `DELETE /candidate/resumes/{id}`                | Xóa bản nháp; không xóa PDF các đơn đã nộp                                                                                      |
| `POST /candidate/resumes/{id}/assets`           | Multipart `image`, kiểm tra mime/size; trả asset metadata/URL có quyền                                                          |
| `GET /candidate/resumes/{id}/assets/{assetId}`  | Stream ảnh thuộc đúng CV; không nhận đường dẫn hoặc URL tùy ý                                                                   |
| `POST /candidate/resumes/{id}/exports`          | `{revision}`; revision không còn khớp → `409`; tạo snapshot/dispatch sau commit → `202 ExportResource`, hoặc `200` khi đã ready |
| `GET /candidate/resume-exports/{exportId}`      | `{id, resume_id, revision, status, error_code, retryable, file_url, page_count}`; không tự tạo/retry job                        |
| `GET /candidate/resume-exports/{exportId}/file` | PDF ready của chủ sở hữu; chưa ready → `409`, file mất → lỗi an toàn                                                            |

Thử lại export lỗi qua chính `POST .../exports` với revision hiện hành; export lỗi của revision cũ không tự đổi snapshot sang dữ liệu mới. Job có token lần xử lý để kết quả lần cũ không ghi đè lần mới.

JSON thành công `{success:true,message,data,meta?}`, lỗi `{success:false,message,errors?}` theo dự án. `401` chưa đăng nhập, `403` sai role/email chưa xác thực khi apply, `404` không thuộc quyền, `409` xung đột/chưa ready, `422` dữ liệu không hợp lệ, `429` giới hạn tần suất, `503` renderer chưa sẵn sàng. Nội dung lỗi không trả stack/path/command.

## 6. PDF và xử lý nền

### Phương án chọn và phương án đã cân nhắc

| Phương án                         | Đánh đổi                                                                            | Quyết định                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| React PDF dùng chung browser/Node | Phải viết layout PDF riêng và kiểm chứng worker/React 19; có API ngắt trang và font | Chọn cho template có kiểm soát, cùng định nghĩa preview/export               |
| HTML/CSS + Chromium               | Dùng CSS quen thuộc; cần browser runtime và cơ chế phân trang/ảnh/font có kiểm soát | Dự phòng nếu spike React PDF không đạt; không triển khai hai engine cùng lúc |
| Chụp HTML thành ảnh rồi nhúng PDF | Dễ lệch ngắt trang, chữ không còn là text tốt cho trích xuất                        | Không chọn vì luồng AI hiện tại đọc text từ PDF                              |

**Task 1 là cổng kỹ thuật:** chỉ chốt engine sau khi đã chứng minh font tiếng Việt, nhiều trang, text extraction, worker và Node trên cả Windows/Linux. Nếu không đạt, cập nhật quyết định trong tài liệu này trước các task tiếp theo, thay vì che lỗi bằng PDF ảnh.

### Quy trình export

1. Web lưu hết thay đổi, nhận revision `r`, gọi tạo export cho `r`.
2. Backend khóa bản ghi ngắn, kiểm tra revision/quyền, tạo hoặc lấy export theo unique key; lưu `input_snapshot`. Cùng transaction không render PDF.
3. Sau commit, đưa `RenderResumePdf` vào queue **`cv`**, tách worker AI/email. Nếu dispatch thất bại, ghi trạng thái lỗi có thể thử lại.
4. Worker claim bằng cập nhật trạng thái có điều kiện và `attempt_token`. Đọc ảnh hợp lệ từ private storage, chuẩn bị payload nội bộ chứa bytes ảnh và nội dung; không truyền URL ngoài.
5. `ResumePdfRenderer::render(RenderInput $input): RenderedPdf` gọi Node CLI bằng Symfony Process với argv array, executable/artifact path từ cấu hình server, JSON qua stdin. Output path tạm do backend tạo trong thư mục cho phép. Không dựng shell command từ nội dung CV.
6. Node dùng manifest template/font đã đóng gói, không tải font/ảnh từ internet, không chạy script/HTML của người dùng. Tạo PDF text, trả stdout chỉ metadata; stderr dùng mã lỗi an toàn.
7. Backend kiểm tra output là PDF, số trang, dung lượng, có text dự kiến; move sang đường dẫn chính rồi cập nhật `ready` nếu token vẫn khớp. Job cũ hoặc resume đã xóa thì bỏ output.
8. Frontend polling export đang mở mỗi 2 giây, dừng khi ready/failed, tab ẩn hoặc sau 60 giây. Đến hạn chỉ báo chưa nhận kết quả, không tự tạo export mới; có nút kiểm tra lại.

Một revision chỉ render lại khi retry lỗi hoặc đổi `renderer_version`; GET/poll không tạo việc. Export ready không bị sửa nội dung. Trường hợp nội dung mới đang xuất không cản tải bản cũ nhưng phải ghi đúng revision.

Font đóng gói dạng TTF static có giấy phép phù hợp, đủ Regular/Bold/Italic và dấu tiếng Việt; không dùng font variable/WOFF2 sẵn của giao diện nếu renderer không hỗ trợ. Mẫu hai cột cần kiểm chứng thứ tự text extraction; không tuyên bố “chuẩn ATS” khi chưa đo.

### Tự lưu chống mất dữ liệu

- `useResumeAutosave` giữ `serverRevision`, một request đang chạy, và dirty buffer mới nhất.
- Gửi full snapshot đã chuẩn hóa với `base_revision`. Save thành công cập nhật revision nhưng **không thay form hiện tại bằng response cũ** khi người dùng đang gõ thêm.
- Save response/error cũ không ghi lên CV khác sau khi chuyển route; cleanup AbortController và generation ID.
- `409` dừng tự lưu, giữ buffer; `422` gắn lỗi vào trường; `401` giữ buffer trong bộ nhớ và yêu cầu đăng nhập; lỗi mạng cho thử lại có backoff tối đa 3 lượt, sau đó thao tác thủ công.
- “Lưu ngay / Xuất PDF / Sao chép” cùng gọi `flush(): Promise<{id:number, revision:number}>`; không phát request ghi song song.

## 7. Ứng tuyển bằng CV đã tạo

Payload mở rộng cho `POST /api/jobs/{id}/apply`:

```json
{ "cv_source": "builder", "resume_export_id": 123, "cover_letter": "..." }
```

- Backend kiểm tra export thuộc candidate, ready, file còn tồn tại, PDF ≤ 5 MB. `resume_export_id` bị cấm với nguồn `profile/new`; `cv_file` bị cấm với `builder`, tránh âm thầm dùng sai CV.
- Không render PDF trong request apply. UI yêu cầu xuất xong và cho xem trước đúng bản đã chọn; không tự chuyển sang CV hồ sơ nếu render lỗi.
- Gọi `ApplicationCvStorage::snapshot($export->path)`, lưu kết quả vào `applications.cv_path`, giữ nguyên kiểm tra một đơn/tin và tin đóng/hết hạn.
- Transaction tạo đơn thất bại thì dọn **bản snapshot vừa tạo**, không xóa PDF export gốc. Kiểm thử cả hai request nộp đồng thời và tin đóng trong lúc nộp.
- Sau commit, đi qua `AiAssessmentScheduler` hiện có. Kết quả AI vẫn chỉ cho employer sở hữu tin/admin. Xóa hoặc sửa resume sau đó không thay đổi AI input của đơn.
- Với builder, không bắt buộc candidate đã upload `candidate_profiles.cv_file_path`; chỉ cần hồ sơ candidate và export hợp lệ.

## 8. Phân rã file và trách nhiệm

Các đường dẫn “tạo mới” là đề xuất; không tạo tất cả scaffolding trước khi task cần chúng.

| Khu vực        | File tạo mới chính                                                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database/model | `backend/database/migrations/<timestamp>_create_resumes_table.php`, `..._create_resume_assets_table.php`, `..._create_resume_exports_table.php`; `backend/app/Models/Resume.php`, `ResumeAsset.php`, `ResumeExport.php`     |
| Quyền và input | `backend/app/Policies/ResumePolicy.php`; `backend/app/Http/Requests/Resumes/{IndexResume,StoreResume,UpdateResume,DuplicateResume,UploadResumeAsset,CreateResumeExport}Request.php`                                         |
| API            | `backend/app/Http/Controllers/Api/{Resume,ResumeAsset,ResumeExport}Controller.php`; `backend/app/Http/Resources/{ResumeSummary,ResumeDetail,ResumeAsset,ResumeExport}Resource.php`                                          |
| Domain service | `backend/app/Services/Resumes/{ResumeService,ResumeSchema,ResumeAssetStorage,ResumeExportService,ResumePdfRenderer}.php`; `RenderInput.php`, `RenderedPdf.php` dùng DTO rõ ràng                                             |
| Queue/vận hành | `backend/app/Jobs/RenderResumePdf.php`; `backend/app/Console/Commands/PruneResumeFiles.php`; `backend/config/resumes.php`                                                                                                   |
| TS/schema      | `frontend/src/features/resumes/{types,schema,templates,export-state}.ts`; JSON fixture chung trong `tests/fixtures/resumes/`                                                                                                |
| Renderer       | `frontend/src/features/resumes/pdf/{resume-document,classic,modern,minimal,font-registry}.tsx`; `frontend/scripts/render-cv.tsx`; `frontend/scripts/build-cv-renderer.mjs`; `frontend/src/workers/resume-preview.worker.ts` |
| UI             | `frontend/src/components/resumes/{resume-list,resume-editor,resume-toolbar,resume-sections,resume-preview,resume-export-status}.tsx`; `use-resume-autosave.ts`, `resume-builder.css`                                        |
| Kết nối API    | `frontend/src/services/resumes.ts` server-only; `frontend/src/features/resumes/client.ts` gọi proxy cùng origin                                                                                                             |
| Routes         | `frontend/src/app/(candidate)/account/resumes/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`, kèm `loading.tsx` và `error.tsx` phù hợp                                                                                     |

File hiện có cần sửa được liệt kê trong từng task bên dưới. Không sửa controller profile cũ ở namespace khác nếu route thực tế trỏ namespace `Api`.

## 9. Các task triển khai

Mỗi task: viết kiểm thử hành vi trước, chạy xác nhận thất bại nếu là hành vi mới, triển khai vừa đủ, chạy lại và commit có phạm vi. Migration/test chỉ chạy trên database test riêng; không `migrate:fresh` database đang dùng.

### Task 1 — Chứng minh renderer và chốt schema/đặc tả

**Files:** tạo fixture `tests/fixtures/resumes/{minimal,vi-long,two-column}.json`, prototype renderer trong thư mục thử nghiệm ignored trước; khi đạt mới thêm renderer dependencies/build scripts ở các đường dẫn mục 8. Cập nhật `docs/SRS.md` với FR-03.7–FR-03.12 cho builder và mở rộng FR-06.2 sang ba nguồn CV. Không sửa các yêu cầu AI/quyền đã thống nhất.

**Interfaces:** chốt `ResumeContentV1`, `ResumeSettingsV1`, `ResumeTemplateManifest`, `RendererInputV1`; manifest có key, version, label, thumbnail và allowed settings.

- [ ] Kiểm tra tài liệu compatibility và version/package license, tạo thử đủ 3 fixture có tiếng Việt, URL dài, nội dung 3–5 trang.
- [ ] Dùng cùng template tạo preview trong worker và PDF qua Node CLI; kiểm tra Next production build và Windows/Linux. Chưa tích hợp dữ liệu thật.
- [ ] Viết `frontend/tests/resume-renderer.test.ts`: assert PDF header, ≤ 5 MB, page count, đủ chuỗi tiếng Việt sau parser; kiểm tra hình ảnh từng trang và vị trí ngắt trang.
- [ ] Chốt engine khi các điều kiện đạt; lưu decision log, dependency/lockfile và font licenses. Nếu fail, cập nhật phương án trước khi Task 2 bắt đầu.
- [ ] Chạy `npm run build:cv-renderer`, `npx tsx --test tests/resume-renderer.test.ts`, `npm run build` ở `frontend`; ghi môi trường và kết quả đo thực tế.
- [ ] Commit: `feat(resumes): establish document schema and PDF renderer`.

**Nghiệm thu:** PDF text đọc được bởi `smalot/pdfparser` đang dùng ở backend; preview/export cùng nội dung/bố cục; không cắt chữ, không font lỗi, không phụ thuộc internet.

### Task 2 — Migration và mô hình dữ liệu không ảnh hưởng CV cũ

**Files:** 3 migration/model mục 8; sửa `backend/app/Models/CandidateProfile.php` thêm quan hệ; tạo `backend/tests/Feature/ResumeSchemaTest.php` và factories tương ứng.

**Interfaces:** `CandidateProfile::resumes(): HasMany`; `Resume::assets()/exports(): HasMany`; casts JSON và số nguyên. Trường path không xuất trực tiếp trong JSON.

- [ ] Test migration giữ nguyên profile CV/application snapshot cũ, FK/index/unique đúng; sửa CV mới không thay bản ghi cũ.
- [ ] Tạo migration additive và quan hệ; `down()` đảo được bảng mới trên database test.
- [ ] Test duplicate `(resume_id, revision, renderer_version)` bị chặn và xóa resume không cascade sang applications.
- [ ] Chạy `vendor/bin/phpunit --filter ResumeSchemaTest` trên MySQL test, kiểm tra cả migrate/rollback ở DB disposable.
- [ ] Commit: `feat(resumes): add private document and export models`.

### Task 3 — API bản nháp, ảnh và quyền truy cập

**Files:** Requests/Policy/Resources/controllers/ResumeService/ResumeSchema/ResumeAssetStorage mục 8; sửa `backend/routes/api.php`; tests `backend/tests/Feature/{ResumeApi,ResumeAsset}Test.php`.

**Interfaces:** `ResumeService::create(CandidateProfile $owner, array $data): Resume`; `update(Resume $resume, int $baseRevision, array $data): Resume`; `duplicate(Resume $resume, int $baseRevision, string $name): Resume`; cập nhật revision bằng điều kiện trong DB, không read-then-save không khóa.

- [ ] Test 401/403/404, truy cập ID người khác, phân trang, limit 20 CV, payload 128 KiB, khóa lạ và ownership của ảnh.
- [ ] Test lưu nháp thiếu mục vẫn được; export validation khác draft validation; stale revision trả 409 và dữ liệu server không đổi.
- [ ] Triển khai API mục 5; tạo profile thiếu bằng `firstOrCreate` dưới candidate đã xác thực. Prefill không ghi ngược sang hồ sơ.
- [ ] Upload kiểm tra image thật, decode/re-encode sang JPEG/PNG, loại EXIF, chặn ảnh quá kích thước; giới hạn pixel trước khi decode đầy đủ. Copy ảnh profile thành asset riêng khi prefill có ảnh.
- [ ] Test file giả ảnh, SVG, URL/path traversal, xóa/duplicate không dùng chung asset có thể bị xóa giữa hai CV; JSON không lộ filesystem.
- [ ] Chạy `vendor/bin/phpunit --filter 'ResumeApiTest|ResumeAssetTest'`; commit `feat(resumes): add owned draft and asset APIs`.

### Task 4 — Ba mẫu CV và preview không chặn nhập liệu

**Files:** templates/renderer/worker mục 8; `frontend/public/fonts/resumes/` với license; `frontend/public/resume-templates/` ảnh mẫu từ dữ liệu tổng hợp; test `frontend/tests/{resume-schema,resume-renderer}.test.ts`.

**Interfaces:** `ResumeDocument({document, assets, fonts})` dùng chung Node/browser; worker nhận `{requestId, document, assets}` và trả `{requestId, pdfBytes}` hoặc mã lỗi, không tự gọi API.

- [ ] Tests dữ liệu rỗng, ký tự Việt, URL dài, danh sách tối đa và mục bị ẩn; không hiện dữ liệu mẫu trong CV mới của người dùng.
- [ ] Hoàn thiện classic/modern/minimal theo manifest; A4, heading không nằm lẻ cuối trang, mục dài tự ngắt an toàn. Không đặt toàn bộ mục dài thành block không thể chia trang.
- [ ] Preview render trong worker, chỉ một render đang chạy và một snapshot mới nhất đang chờ; bỏ kết quả cũ, thu hồi Blob URL và terminate worker khi rời editor; lazy-load bundle.
- [ ] So sánh PDF fixtures/ảnh render trong browser và Node, nhất là thứ tự trích xuất hai cột. Chạy test renderer và production build.
- [ ] Commit: `feat(resumes): add three reusable CV templates and preview`.

### Task 5 — Danh sách, editor và tự lưu có revision

**Files:** routes/UI/service mục 8; sửa `frontend/src/features/api/paths.ts`, `frontend/src/features/candidate-workspace/types.ts`, `frontend/src/components/candidate/{candidate-sidebar,account-shell,account-workspace}.tsx` khi cần thêm menu/section; tests `frontend/tests/{resume-autosave,resume-schema}.test.ts`, `frontend/tests/e2e/resume-builder.spec.ts`.

**Interfaces:** `useResumeAutosave(id, initialRevision)` cung cấp `status`, `save(snapshot)`, `flush()`, `retry()`; `flush` trả ID/revision đã lưu thực tế. Không đưa toàn bộ state editor vào provider toàn workspace.

- [ ] Test response save A về khi đã gõ B: B vẫn còn, save tiếp dùng revision mới; route đổi không nhận response CV cũ.
- [ ] Test 409 giữ dirty buffer, 422 chỉ rõ trường, offline giữ form, rời tab có cảnh báo, sao chép dùng dữ liệu đã flush.
- [ ] Tạo routes explicit `/account/resumes/...`, cập nhật menu có trạng thái active; tránh route `[section]` bắt nhầm hoặc render workspace trùng shell.
- [ ] Xây editor/preview responsive như mục 3; prefill thực tế, nút lên/xuống và label bàn phím; hiển thị skeleton/empty/error/retry.
- [ ] Cho phép proxy đúng method/path mới, protected file ảnh/export; giữ same-origin, no-store và token server-side. Thêm test allowlist chặn route/path không hợp lệ.
- [ ] Chạy `npm run lint`, `npm run typecheck`, `npm test`, `npx playwright test tests/e2e/resume-builder.spec.ts`; commit `feat(resumes): add editor with conflict-safe autosave`.

### Task 6 — Export PDF bất biến qua queue riêng

**Files:** ResumeExportService/ResumePdfRenderer/DTO/job/config/controller/export requests/resources mục 8; sửa cấu hình deploy và build scripts; tests `backend/tests/Feature/ResumeExportTest.php` và `frontend/tests/e2e/resume-export.spec.ts`.

**Interfaces:** `ResumeExportService::request(Resume $resume, int $revision): ResumeExport`; `RenderResumePdf($exportId, $attemptToken)`; `ResumePdfRenderer::render(RenderInput $input): RenderedPdf`; DTO kết quả gồm tempPath, byte size, page count.

- [ ] Test cùng revision gọi hai lần chỉ có một export và một công việc hiệu lực; sửa document khi job chạy vẫn xuất input_snapshot cũ.
- [ ] Test token job cũ không ghi đè job mới; queue dispatch lỗi, worker chết, resume bị xóa, file output mất, process timeout và render vượt 5 MB/5 trang.
- [ ] Triển khai node artifact `frontend/dist/cv-renderer/render-cv.mjs`; dependencies runtime được đóng gói hoặc cài production theo chiến lược spike đã kiểm chứng. Cấu hình absolute `RESUME_NODE_BINARY`, `RESUME_RENDERER_PATH`; không đưa secret qua argv.
- [ ] Rate limit theo candidate, owner authorization cho status/file, retry có kiểm soát; dọn file tạm sau lỗi. Lỗi validation không retry; chỉ retry lỗi tạm thời tối đa 2 lần.
- [ ] UI flush rồi export, polling có giới hạn, hiển thị revision, tải file qua proxy; GET/status không gọi renderer hoặc AI.
- [ ] Chạy `vendor/bin/phpunit --filter ResumeExportTest`, renderer test, E2E export với worker thực và fixture tổng hợp; commit `feat(resumes): export immutable PDFs on a dedicated queue`.

### Task 7 — Tích hợp ứng tuyển và bảo toàn hồ sơ đã nộp

**Files:** sửa `backend/app/Http/Requests/ApplyJobRequest.php`, `backend/app/Http/Controllers/Api/ApplicationController.php`; tạo `backend/app/Services/Resumes/ResumeApplicationCvResolver.php` để logic nguồn builder không làm controller phình; sửa `frontend/src/components/jobs/apply-dialog.tsx`, `frontend/src/components/candidate/workspace-provider.tsx`, `frontend/src/features/candidate-workspace/application.ts`; tests `backend/tests/Feature/ResumeApplicationTest.php`, `frontend/tests/e2e/resume-apply.spec.ts`.

**Interfaces:** mở rộng ApplyInput thành union theo nguồn, giữ adapter cho `profile/new`; `ResumeApplicationCvResolver::snapshot(User $user, int $exportId): string` chỉ trả path snapshot mới, không nhận path từ client.

- [ ] Test builder thành công không cần profile CV, export người khác/failed/mất file bị từ chối; payload mâu thuẫn không fallback nguồn khác.
- [ ] Test chưa verified bị chặn, tin đóng/hết hạn/duplicate không nhận đơn, concurrent submit không rò file; profile/new cũ vẫn hoạt động.
- [ ] Thêm lựa chọn CV đã tạo, tên/revision/PDF preview, hướng dẫn tạo/xuất nếu chưa có bản ready; người dùng xác nhận đúng bản trước submit.
- [ ] Đồng bộ giới hạn thư giới thiệu ở adapter API với `ApplyJobRequest` hiện tại: tối đa 3.000 ký tự; không tiếp tục cho UI gửi 5.000 ký tự rồi chỉ báo lỗi sau submit.
- [ ] Dùng snapshot PDF riêng, after-commit AI như hiện tại; test sửa/xóa resume/ảnh/export không đổi hash PDF của đơn và không làm hỏng download employer/admin.
- [ ] Test CV demo không dispatch AI, CV thật tạo bằng template dispatch đúng một lần; candidate không nhận trường điểm/trạng thái AI trong API.
- [ ] Chạy `vendor/bin/phpunit --filter 'ResumeApplicationTest|AiLifecycleTest|FrontendIntegrationContractTest'`, E2E apply với backend test; commit `feat(resumes): apply with a generated CV snapshot`.

### Task 8 — Vận hành, kiểm chứng toàn luồng và phát hành có kiểm soát

**Files:** command prune/config mục 8; sửa `.github/workflows/{backend,frontend}.yml`, `frontend/package.json`, `docs/backend-run-guide.md`, tạo `docs/cv-builder-setup.md`; fixture/mocks chỉ chứa dữ liệu tổng hợp.

**Interfaces:** `php artisan resumes:prune --dry-run` rồi mới thực thi có option rõ; feature flag `RESUME_BUILDER_ENABLED` mặc định false ở backend, frontend dùng capability từ server. Tắt flag ẩn UI mới và chặn create/update/export mới bằng 503; vẫn cho owner đọc/tải/xóa dữ liệu đã có.

- [ ] CI cài/build renderer và font artifact; chạy PDF text/visual fixture trên Linux và smoke Windows. Test API/backend giả process ở unit, ít nhất một integration thật qua Node worker trên DB test.
- [ ] E2E thật: tạo → nhập → tự lưu → reload → đổi mẫu → export → tải PDF → ứng tuyển → sửa/xóa bản nháp → employer mở lại PDF cũ.
- [ ] Test 360/768/1440px, bàn phím, lỗi mạng, hai tab, tab ẩn và reconnect. Axe/đo hình học chờ dữ liệu và animation ổn định; không dùng sleep cố định hay tăng retry để che lỗi.
- [ ] Load test 50 người dùng đọc/lưu và 2 export đồng thời trên môi trường ghi rõ; theo dõi input latency, queue wait, runtime/memory, số query. Mục tiêu chưa đạt phải ghi thực tế và điều chỉnh trước mở rộng.
- [ ] Chạy full backend tests trên DB test riêng; frontend lint/typecheck/unit/server/build/browser và CI GitHub. Chỉ gọi provider AI giả, không gửi CV cá nhân hoặc dữ liệu seed lên dịch vụ ngoài.
- [ ] Viết hướng dẫn PowerShell từng bước: build artifact, cấu hình đường dẫn Node, migrate additive, bật flag, chạy worker `php artisan queue:work database --queue=cv --sleep=1 --tries=2 --timeout=45`; đảm bảo retry_after > 45s, tách tiến trình ai/emails.
- [ ] Ghi log chỉ export ID, revision, status, duration/error code; alert khi export kẹt processing quá 2 phút. Request lại chỉ claim lần mới sau khi worker cũ hết timeout, token bảo vệ công bố kết quả.
- [ ] Phát hành thử với một vài tài khoản/CV tổng hợp; tắt flag nếu lỗi. Rollback code/flag không drop bảng/file PDF đã tạo; không rollback migration trên DB thật khi còn dữ liệu.
- [ ] Review diff/secrets, kiểm tra CI xanh trước merge/push theo yêu cầu đợt triển khai; commit `test(resumes): verify end-to-end CV creation and deployment`.

## 10. Mốc nghiệm thu và thứ tự làm

| Mốc                      | Task | Có thể trình diễn/nghiệm thu                                    |
| ------------------------ | ---- | --------------------------------------------------------------- |
| M0 — chứng minh kỹ thuật | 1    | Font Việt, PDF text nhiều trang, preview/Node cùng template     |
| M1 — bản nháp an toàn    | 2–3  | CRUD/ảnh, quyền sở hữu, version conflict, dữ liệu cũ còn nguyên |
| M2 — editor dùng được    | 4–5  | Ba mẫu, nhập liệu, tự lưu, reload còn dữ liệu, mobile           |
| M3 — xuất và ứng tuyển   | 6–7  | Queue xuất PDF, chọn đúng revision, snapshot đơn không đổi      |
| M4 — sẵn sàng mở dùng    | 8    | CI, quyền, hiệu suất, hướng dẫn và rollback đã kiểm chứng       |

Chưa ước lượng ngày hoàn thành cố định trước M0: độ khó thực tế nằm ở worker/renderer, ngắt trang và kiểm chứng font. Sau M0 mới ước lượng theo kết quả, ưu tiên hoàn thành một mẫu từ đầu đến cuối rồi nhân lên ba mẫu.

## 11. Decision log và tài liệu tham khảo

| Quyết định                                        | Lý do / trạng thái                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Theo mẫu, không kéo thả tự do ở MVP               | Người dùng chọn ngày 29/10/2026; giúp giới hạn layout khi xuất                     |
| 3 mẫu đầu, mở rộng lên 5 sau                      | Mặc định đề xuất trong khoảng 3–5 đã chọn; nghiệm thu kỹ PDF trước khi tăng số mẫu |
| JSON bản nháp riêng, không thay profile CV        | Giữ tương thích upload PDF hiện có và cho phép nhiều CV                            |
| Preview/export dùng chung React PDF               | Tránh hai định nghĩa bố cục độc lập; phải qua cổng kỹ thuật M0                     |
| Export bất biến theo revision, queue cv riêng     | Tránh PDF sai bản và không làm chậm chat/AI/email                                  |
| Snapshot vào đơn, không render khi apply          | Tái sử dụng kiến trúc đang có, bảo toàn đơn đã gửi                                 |
| AI chỉ sau apply, không thêm AI viết CV trong MVP | Giữ phạm vi và quyền xem AI trong SRS hiện tại                                     |
| Giới hạn dung lượng/số CV/timing mục 1            | Đề xuất kỹ thuật; đo lại ở M0/M4, không phải số liệu hiệu suất đã đạt              |

Nguồn tham khảo kiểm tra ngày 29/10/2026:

- [TopCV: luồng chọn mẫu, nhập, lưu và xuất PDF](https://www.topcv.vn/cach-tao-cv-online-tren-topcv). Chỉ dùng tham khảo trải nghiệm; không giả định họ dùng kiến trúc trong kế hoạch này.
- [React PDF v4: Node API](https://react-pdf.org/docs/v4/node) cho render PDF phía Node.
- [React PDF v4: fonts](https://react-pdf.org/docs/v4/fonts) cho font TTF/WOFF và đăng ký font riêng theo weight/style.
- [React PDF v4: advanced](https://react-pdf.org/docs/v4/advanced) cho page wrapping và các cơ chế điều khiển phân trang.

## 12. Kiểm tra chất lượng kế hoạch

- [x] Đối chiếu route/model/service thực tế thay vì giả định dự án đã có bảng `resumes`.
- [x] Bao phủ phạm vi người dùng chọn; tách rõ phần chưa làm và mặc định kỹ thuật.
- [x] Nêu giao diện giữa các task, file tạo/sửa, quyền backend, đường dẫn file và quy trình test.
- [x] Có cơ chế chống xung đột, kết quả job cũ, xóa giữa lúc xử lý và giữ PDF các đơn cũ.
- [x] Giữ quyền riêng tư và quy tắc không phân tích CV demo; không gọi AI khi tự lưu.
- [x] Có cổng kiểm chứng renderer, tải thực tế, CI và rollback; chưa ghi bất kỳ mục triển khai nào là hoàn thành.
