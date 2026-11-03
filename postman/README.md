# Hướng dẫn kiểm thử toàn bộ API bằng Postman

Bộ này dành cho backend Laravel hiện tại. Import `collections/TimViecOnline-Full-QA.postman_collection.json` và environment `environments/TimViecOnline-Local.postman_environment.json`. Collection hiện có **103 request testcase** theo endpoint/luồng FR-01..FR-10; mỗi request ghi tiền điều kiện và expected status. Dùng ma trận bên dưới để tạo request riêng cho từng biến thể dữ liệu/boundary. Đây là kiểm thử API đang chạy thật, không phải mock.

## Chuẩn bị an toàn

1. Chạy backend local, mặc định `http://127.0.0.1:8000`; đổi `baseUrl` nếu khác. Dùng database, mail, queue và storage dành riêng cho QA. Không chạy trên production. Tham khảo [`BACKEND_TESTING_GUIDE.md`](../BACKEND_TESTING_GUIDE.md).
2. Dùng mail sink/fake mailbox; không gửi email thật. Không đặt Gemini key thật. Dùng PDF/ảnh giả lập, không tải CV cá nhân.
3. Chuẩn bị 5 user test: candidate sở hữu profile/CV, candidate thứ hai, employer chủ job, employer thứ hai và admin. Candidate/employer/admin cần email/password riêng và role đúng. Hoàn thiện company; tạo tin active (deadline tương lai) cho mỗi employer.
4. Chọn environment vừa import. Điền token từ login vào `candidateToken`, `otherCandidateToken`, `employerToken`, `otherEmployerToken`, `adminToken`; điền IDs thật vào `categoryId`, `skillId`, `jobId`, `otherJobId`, v.v. Token/password đặt ở Current value dạng secret; không lưu/export environment đã resolve.
5. `candidatePassword` phải khớp `candidateEmail`. `uniqueEmail` phải chưa dùng; tăng `uniqueSuffix` cho mỗi lần chạy register/admin CRUD.

Register tạo user nhưng không token: chạy Login rồi copy `data.token`. API không cho đăng ký admin; admin và user “other” phải được seed/tạo riêng. Lấy category/skill IDs qua GET public routes; lấy user/job IDs từ dữ liệu QA.

## Chạy test

- Từng case: mở request, xác nhận URL/Body/Authorization và biến `{{...}}`, bấm **Send**, xem **Test Results** rồi kiểm tra response body. HTTP status đúng chưa đủ nếu nội dung/dữ liệu sau request sai.
- Cả nhóm: menu `…` của folder → **Run folder**, iteration = 1. Chạy đúng tiền điều kiện trong phần thứ tự bên dưới. Không Run toàn bộ collection trên dữ liệu dùng chung: có create/update/delete, lockout, application, mail/reset và trạng thái chuyển đổi.
- Binary CV/ảnh: thay placeholder form-data bằng file qua UI Postman (row type **File**); xác nhận `Content-Type` và `Cache-Control`, kiểm tra quyền user khác.
- Ghi lại cho mỗi case: PASS/FAIL, ngày/commit, role, input, expected/actual HTTP + response, thay đổi DB/tệp/notification, evidence đã che token/PII.

## Thứ tự luồng

1. Auth: register bằng email mới → login từng role → GET `/user`. Lockout chỉ chạy với account disposable: 1–4 lần sai `401`, lần 5 `403`, khóa 15 phút.
2. Catalog/search: categories, skills, companies, cities → chọn IDs → jobs filters/detail → save/unsave. Cần fixtures active, closed, expired.
3. Candidate: profile → upload CV → download → apply → history. Lưu `applicationId`; gửi apply lần hai ngay để kiểm tra `409`.
4. Employer: applicants → xem chi tiết (lần đầu có thể chuyển applied→waiting) → đổi status. Tạo đơn khác để thử withdraw.
5. Chat/notifications: conversation gắn với application hợp lệ → send → kiểm tra bằng token bên kia → read → kiểm tra notification.
6. AI: analyze và xem status. Không có worker thì pending/202 bình thường; bật queue worker riêng để kiểm tra completed/failed. Không coi fallback là kiểm tra Gemini thật.
7. Report/admin: candidate report → duplicate `409` → admin resolve/dismiss → kiểm tra cờ report. Admin CRUD chỉ dùng record test riêng.

## Testcase chi tiết theo yêu cầu

Mỗi dòng là một testcase độc lập. Với mỗi biến thể, Duplicate request chuẩn trong Postman, đặt tên theo mã case, thay duy nhất input cần thử để cô lập lỗi. Kỳ vọng response và trạng thái dữ liệu đều phải đúng.

### FR-01 — Đăng ký

| Case | Input/tiền điều kiện | Kỳ vọng |
|---|---|---|
| R01 candidate hợp lệ | Email mới, >15 tuổi, phone hợp lệ | 201; user + candidate profile; password hash; không trả token/password |
| R02 employer hợp lệ | Email mới, role employer | 201; user + company |
| R03 duplicate | Email đã đăng ký; thử khác hoa/thường | 422; không tạo user thứ hai |
| R04 name/email | Name rỗng, 1 ký tự, >100, ký tự đặc biệt; email sai | Mỗi input lỗi 422 và `errors` đúng field |
| R05 DOB | Chính xác 15 tuổi; 1 ngày chưa đủ 15 | Biên đúng theo ngày chạy; dưới 15 trả 422 |
| R06 password | <8, >32, thiếu chữ hoa/thường/số/ký tự đặc biệt, confirmation khác | 422; không tạo user |
| R07 role/phone | role admin/lạ; phone sai định dạng/prefix | 422 |
| R08 throttle | >5 register/phút cùng IP | Vượt ngưỡng 429; chạy cuối cùng và chờ cửa sổ reset |

### FR-02 — Đăng nhập và mật khẩu

| Case | Cách chạy | Kỳ vọng |
|---|---|---|
| A01 login theo role | Email/password đúng cho candidate/employer/admin | 200, bearer token, role và redirect đúng |
| A02 validation | Email thiếu/sai format; password thiếu | 422 |
| A03 credentials | Email không tồn tại và password sai (account chưa khóa) | Cùng 401/message, không tiết lộ email tồn tại |
| A04 lockout | 5 lần sai liên tục disposable user | Lần 1–4: 401; lần 5: 403; khóa +15 phút; đúng password lúc khóa vẫn 403 |
| A05 logout | Logout token hiện hành, gọi GET user lại | Logout 200; token đó 401; token thiết bị khác còn hiệu lực |
| A06 forgot enumeration | Gửi email tồn tại và không tồn tại | Cùng 200/message; không trả raw token hoặc reset URL |
| A07 reset | Token sandbox đúng, sai, hết 15 phút, dùng lại | Token đúng verify 200; sai/hết hạn/dùng lại 400; reset revoke token cũ |
| A08 change password | Current sai, confirmation sai, password yếu/trùng cũ, hợp lệ | Lỗi current/new bị từ chối; hợp lệ giữ token hiện tại, revoke token khác |
| A09 throttle | >10 login/phút; >3 forgot/15 phút | Request vượt ngưỡng 429 |

### FR-03 — Hồ sơ và tệp

| Case | Input | Kỳ vọng |
|---|---|---|
| P01 quyền | Guest / employer vào candidate profile | 401 / 403 |
| P02 profile | Hợp lệ; từng field sai; DOB <15; email trùng | 200 / 422; không thể sửa hồ sơ người khác |
| P03 skills | ID đúng/sai, ID trùng, >10, list rỗng | Tối đa 10 IDs hợp lệ; list rỗng đồng bộ/xóa liên kết theo contract |
| P04 CV upload | PDF <=5MB; thiếu/rỗng/>5MB; ảnh đổi đuôi; MIME giả; file hỏng | Hợp lệ ở disk private; sai bị từ chối; không lộ public storage path |
| P05 CV access | Owner, candidate khác, chưa có CV, delete lặp | Owner tải PDF/private cache; người khác/không có file 404; xóa xong file biến mất |
| P06 avatar | JPEG/PNG <=2MB, MIME sai, >2MB, delete | Hợp lệ; invalid từ chối; file cũ được dọn |
| P07 legacy | Chỉ trên bản sao QA | SHA-256 nguồn/đích bằng nhau; mặc định giữ nguồn; không dùng `--delete-source` nếu chưa backup/rollback |

### FR-04/05 — Tin, tìm kiếm và lưu

| Case | Input | Kỳ vọng |
|---|---|---|
| J01 company | Đủ field; thiếu name/description/address/city; logo sai/oversize | Hợp lệ 200; invalid validation; không sửa company người khác |
| J02 job create | Các job_type; salary specific/range/from/negotiable; skill IDs đúng | 201 và giá trị lưu đúng; company phải hoàn thiện |
| J03 validation | title <10/>200, quantity 0, category/skill ID sai, skills rỗng/trùng | 422; không tạo job |
| J04 salary | min=max; min>max; zero; chỉ max; range thiếu đầu; negotiable kèm số | Boundary hợp lệ được nhận; trường hợp sai 400; negotiable chuẩn hóa min/max null |
| J05 deadline | Hôm qua, hôm nay, ngày mai | Quá khứ/hôm nay 400; ngày mai hợp lệ; tạo ngày động theo ngày chạy |
| J06 ownership/status | Employer khác sửa; owner close/reopen; apply tin closed | Outsider 403/404; closed ẩn search và chặn apply; reopen + deadline tương lai hiển thị |
| J07 expiry command | `php artisan jobs:expire` trên DB QA | Chỉ active overdue thành expired; closed không đổi; gọi lặp an toàn |
| S01 keyword | Title/company/skill, Unicode và tiếng Việt có dấu/không dấu | Match theo dữ liệu/collation; không mặc định có transliteration fuzzy |
| S02 filters | Category scalar/CSV/array; city/type/skill IDs | Các kết quả khớp filter; input sai 422 |
| S03 salary bands | under_10, 10_20, over_20, negotiable; ranh giới 10m/20m, min-only | So kết quả với fixture. Aliases xem API_CHECKLIST.md |
| S04 pagination | page/per_page 1, 100, 0, >100, chữ | `meta` đúng; giới hạn/error theo SearchJobRequest |
| S05 visibility | Active, closed, expired, deadline quá hạn | Index chỉ active/chưa hết hạn; detail theo contract hiện hành |
| S06 saved jobs | Save lặp, unsave, ID sai/closed, employer gọi | Idempotent; list của đúng candidate; sai role 403 |

### FR-06 — Ứng tuyển

| Case | Setup/input | Kỳ vọng |
|---|---|---|
| AP01 auth/role | Guest, employer/admin apply | Guest 401; role sai bị từ chối |
| AP02 success | Candidate có CV; active job employer khác; profile/default/new PDF | 201; CV snapshot đúng; AI job dispatch |
| AP03 thiếu/sai | Không CV; new thiếu file; PDF lỗi; job missing/closed/expired | Business/validation error; không tạo application |
| AP04 rules | Tự ứng tuyển; duplicate; apply lại sau withdraw | Từ chối self; duplicate và apply lại withdrawn 409 |
| AP05 concurrency | Hai apply đồng thời trên DB QA | Tối đa một application; tuần tự không chứng minh race safety |
| AP06 history/withdraw | Candidate khác; rút applied; rút waiting/accepted/rejected | Chỉ owner thấy; chỉ applied chưa review được rút |
| AP07 employer review | Owner list/detail/status; employer khác; status lạ | Owner được phép; lần xem đầu applied→waiting; outsider denied; invalid validation |
| AP08 CV download | Owner candidate, employer owner, admin, outsider, guest | Authorized nhận PDF private; unauthorized denied |

### FR-07–10 — AI, chat, notifications, admin

| Nhóm | Testcase độc lập và expected |
|---|---|
| AI | Owner/wrong owner; missing application; pending=202, completed=200, failed=422; retry; worker dừng; CV scan/empty/corrupt; provider JSON invalid/5xx/timeout/no key. Không leak key/provider stack. |
| Chat | Chỉ mở từ application hợp lệ; sai job/partner/role; member vs outsider cho history/send/read/image; message 1/1000/blank/>1000; text/image/both; JPEG/PNG/GIF/WEBP <=5MB và sai/oversize; Reverb down vẫn lưu DB; broadcast member allow/outsider deny. |
| Notifications | List/pagination/unread_count; mark one/all; delete own; ID của user khác; application/status/message notification gửi đúng recipient, không trùng khi retry. |
| Admin users/jobs | Candidate/employer vào admin =403; list/detail/filter; lock/unlock và token revoke; status inactive/active; self-lock; xóa chỉ fixture một lần rồi kiểm tra cascade/notification. |
| Admin taxonomy | Category/skill CRUD; tên trùng/rỗng/quá dài; ID missing; xóa khi đang được tham chiếu (FK); chỉ xóa fixture riêng. |
| Reports | Guest 401; reason thiếu/>100, details >2000; job invalid; owner tự report; duplicate 409; pending→resolved/dismissed; reviewer/time; cờ chỉ clear khi hết pending. |
| NFR | 50 concurrent, p95 <=1.5s, chat <1s, uptime 99% cần môi trường/công cụ đại diện. Assertion thời gian cơ bản của collection không chứng minh NFR. |

## Tạo request biến thể riêng

1. Duplicate request chuẩn, đặt tên mã (ví dụ `R04b Register – name 1 ký tự`).
2. Chỉ thay một field, giữ các field còn lại hợp lệ; ghi precondition, payload, expected HTTP, `errors.<field>`, và hậu quả DB.
3. Bấm Send → xem Test Results và body. Nếu status đúng nhưng field/error/DB sai thì FAIL; thêm assertion Post-response cho field cụ thể.
4. Dùng unique test records; khôi phục fixture sau test. Binary form-data placeholder phải được đổi sang chọn File trong Postman.

## Giới hạn bằng chứng

- Collection gọi API hiện có nhưng không tự seed/dọn DB. Không chạy collection production. Admin delete/lockout và các thao tác xóa chỉ trên data disposable.
- Một số quyền sở hữu có thể trả 403 hoặc 404; AI có thể trả 200/202/422 theo trạng thái. Nếu code trả khác expected, đối chiếu SRS rồi ghi sai khác contract; đừng mặc nhiên xem code là chuẩn.
- Postman chứng minh HTTP/JSON; DB, storage, queue, mail và WebSocket cần kiểm tra thêm bằng DB/log/worker/client như hướng dẫn backend. Collection chưa được gọi live trong công việc này.
