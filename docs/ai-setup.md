# Phân tích CV và độ phù hợp với công việc

AI chạy ở backend, sau khi ứng viên nộp đơn thành công. Nhà tuyển dụng sở hữu tin và admin xem kết quả; ứng viên không nhận điểm hoặc nhận xét AI. Điểm hỗ trợ đọc hồ sơ, không tự thay đổi quyết định tuyển dụng.

## Cấu hình

Thêm vào `backend/.env` (không commit key):

```dotenv
AI_ANALYSIS_ENABLED=true
AI_PROVIDER=groq
GROQ_API_KEY=your-private-key
GROQ_MODEL=openai/gpt-oss-20b
```

Để dùng Gemini, chọn `AI_PROVIDER=gemini`, nhập `GEMINI_API_KEY` và `GEMINI_MODEL` được tài khoản hỗ trợ. Không tự chuyển sang provider khác khi lỗi. Với Groq, model GPT-OSS dùng JSON schema strict; Llama dùng JSON object và vẫn phải qua kiểm tra cấu trúc ở backend. Xem [tài liệu structured outputs của Groq](https://console.groq.com/docs/structured-outputs).

Sau khi đổi cấu hình:

```powershell
cd backend
php artisan migrate
php artisan config:clear
php artisan queue:work database --queue=ai --sleep=1 --tries=3 --timeout=60
```

Giữ worker trên chạy ở terminal riêng; worker `--queue=emails` không xử lý AI. Khi thay key/model, khởi động lại worker AI. Dùng Supervisor/systemd hoặc trình quản lý tiến trình tương đương khi triển khai. `retry_after` của database queue cần lớn hơn timeout 60 giây (mặc định dự án là 90).

Database nhập từ SQL có thể còn migration tạo bảng cũ ở trạng thái Pending dù bảng đã tồn tại. Với database đã có đầy đủ domain schema, chỉ chạy hai migration AI mới, không reset dữ liệu:

```powershell
php artisan migrate --path=database/migrations/2026_10_27_000007_add_ai_application_requests.php --path=database/migrations/2026_10_27_000008_add_ai_assessment_provenance.php
```

## Cách dùng

- Mỗi lần ứng viên nộp CV thật vào một tin tuyển dụng, đơn mới tự được đưa vào queue ngay sau khi lưu, trước bước gửi thông báo. Áp dụng cho cả CV tải trực tiếp lúc nộp và CV đã lưu trong tài khoản; không cần nhà tuyển dụng mở hồ sơ hoặc bấm **Phân tích CV**. Cùng một CV nộp vào hai tin được đối chiếu riêng với từng JD. Đơn không mất nếu dịch vụ AI gặp lỗi.
- Mở chi tiết hồ sơ ở nhà tuyển dụng hoặc danh sách ứng viên của tin ở admin. Kết quả gồm điểm, nhận xét, điểm mạnh, kỹ năng khớp/thiếu và gợi ý.
- Hồ sơ cũ chưa phân tích: nhấn **Phân tích CV**. Hồ sơ lỗi: kiểm tra nguyên nhân rồi nhấn **Thử lại**. Mở trang hoặc tải lại trang không tự gọi AI.
- Chỉ tải CV vào trang hồ sơ cá nhân chưa tạo phân tích đối chiếu: cần nộp vào một tin để có JD cụ thể. Hồ sơ nộp trước khi AI được bật có thể vẫn cần phân tích thủ công một lần; điều này không áp dụng cho đơn mới khi AI và worker đang chạy.
- CV sinh từ bộ seed demo bị loại trừ ở API, scheduler và worker, kể cả bản đã sao chép sang đường dẫn mới. Chúng không được gửi tới provider và không có nút yêu cầu phân tích. CV thật tải lên và nộp trong đơn mới vẫn được xử lý, kể cả khi dùng tài khoản hoặc ứng tuyển vào công ty demo.
- Kết quả đã hoàn tất được dùng lại. JD/kỹ năng được chụp khi tạo yêu cầu đầu tiên, CV là bản riêng của lần ứng tuyển; sửa hồ sơ hoặc tin sau đó không thay đổi đầu vào của lượt thử lại.
- PDF scan hoặc PDF không đọc được chữ không được chấm điểm. Ứng viên cần dùng PDF văn bản tối đa 5 MB.

## Chi phí và trạng thái

Queue riêng, khóa theo đơn và kết quả duy nhất giúp tránh gọi trùng. Lỗi mạng, 408, 429 và 5xx được thử lại tối đa ba lần với khoảng chờ. Lỗi Groq HTTP 400 có mã `json_validate_failed` nghĩa là kết quả sinh ra không khớp schema; lỗi này cũng dùng chung giới hạn ba lần thử của queue, không báo nhầm thành sai cấu hình. Các lỗi 400 khác, sai key và PDF không hợp lệ dừng ngay. Kết quả sai cấu trúc không được lưu hoặc cắt bớt để giả thành thành công. Không tự phân tích hàng loạt dữ liệu demo. Với lưu lượng lớn, điều chỉnh số worker theo quota của tài khoản thay vì chạy nhiều worker không giới hạn.

Backend giới hạn nội dung CV, JD và đầu ra; lưu model/provider, phiên bản prompt, dấu vân tay đầu vào và token usage nếu nhà cung cấp trả về. Không lưu nội dung lỗi thô của provider vào lỗi AI/failed jobs. Bốn điểm thành phần 0–100 được tổng hợp tại backend theo trọng số 40/30/15/15. Kết quả AI cũ có thể chưa có điểm thành phần.

Với GPT-OSS trên Groq, schema truyền các trường kỹ năng thiếu, điểm mạnh và đề xuất bằng đúng bốn ô `item_1`–`item_4` (ô không dùng là `null`). Backend đổi các ô hợp lệ thành danh sách trước khi kiểm tra và lưu; API/frontend vẫn dùng mảng như cũ. Cách này tránh lỗi model sinh mục thứ năm dù có `maxItems`. Ô thừa, thiếu hoặc dữ liệu sai vẫn bị từ chối; không cắt bớt kết quả lỗi để tạo điểm hợp lệ. Xem [Structured Outputs của Groq](https://console.groq.com/docs/structured-outputs) về schema strict; ứng dụng vẫn kiểm tra ngữ nghĩa đầu ra ở backend.

API xác thực:

| Method | Đường dẫn | Ý nghĩa |
| --- | --- | --- |
| GET | `/api/applications/{id}/ai-analysis` | Chỉ đọc trạng thái/kết quả |
| POST | `/api/applications/{id}/ai-analyze` | Tạo yêu cầu hoặc dùng lại kết quả có sẵn |

`data` thống nhất gồm `status`, `analysis`, `error`, `retryable`. POST yêu cầu email đã xác thực và bị giới hạn tần suất. Kết quả chỉ được truy cập bởi nhà tuyển dụng sở hữu tin và admin.
