"""Build the committed Postman collection from the endpoint test catalog below."""
import json
from pathlib import Path

BASE = "{{baseUrl}}/api"
collection = {
    "info": {
        "_postman_id": "ae4d2ba4-cae2-4c2f-9d1f-4d9d9117e81b",
        "name": "TimViecOnline API – Full Manual QA",
        "description": "Bộ test theo FR-01..FR-10. Đọc postman/README.md trước khi chạy; yêu cầu API và dữ liệu test riêng.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
        {"key": "baseUrl", "value": "http://127.0.0.1:8000", "type": "string"},
        {"key": "candidateToken", "value": "", "type": "string"},
        {"key": "employerToken", "value": "", "type": "string"},
        {"key": "adminToken", "value": "", "type": "string"},
        {"key": "otherCandidateToken", "value": "", "type": "string"},
        {"key": "otherEmployerToken", "value": "", "type": "string"},
        {"key": "candidateEmail", "value": "candidate@example.test", "type": "string"},
        {"key": "employerEmail", "value": "employer@example.test", "type": "string"},
        {"key": "adminEmail", "value": "admin@example.test", "type": "string"},
        {"key": "candidatePassword", "value": "", "type": "string"},
        {"key": "jobId", "value": "", "type": "string"},
        {"key": "otherJobId", "value": "", "type": "string"},
        {"key": "categoryId", "value": "", "type": "string"},
        {"key": "skillId", "value": "", "type": "string"},
        {"key": "applicationId", "value": "", "type": "string"},
        {"key": "conversationId", "value": "", "type": "string"},
        {"key": "messageId", "value": "", "type": "string"},
        {"key": "notificationId", "value": "", "type": "string"},
        {"key": "userId", "value": "", "type": "string"},
        {"key": "companyId", "value": "", "type": "string"},
        {"key": "categoryAdminId", "value": "", "type": "string"},
        {"key": "skillAdminId", "value": "", "type": "string"},
        {"key": "resetToken", "value": "", "type": "string", "description": "Chỉ nhập từ email test trong hộp thư sandbox; không lưu/chia sẻ token thật."},
        {"key": "uniqueEmail", "value": "postman-new@example.test", "type": "string"},
        {"key": "uniqueSuffix", "value": "001", "type": "string"}
    ],
    "item": []
}

def req(name, method, path, *, folder, auth=None, body=None, mode="json", expected=200,
        description="", query=None, tests=None, headers=None, binary=False):
    request = {"method": method, "header": [{"key":"Accept","value":"application/json"}]}
    if headers:
        request["header"] += headers
    if auth:
        request["auth"] = {"type":"bearer","bearer":[{"key":"token","value":f"{{{{{auth}}}}}","type":"string"}]}
    if body is not None:
        if mode == "json":
            request["header"].append({"key":"Content-Type","value":"application/json"})
            request["body"] = {"mode":"raw","raw":json.dumps(body, ensure_ascii=False, indent=2),"options":{"raw":{"language":"json"}}}
        elif mode == "formdata":
            request["body"] = {"mode":"formdata","formdata":[{"key":k,"value":v,"type":"text"} for k,v in body.items()]}
        elif mode == "urlencoded":
            request["header"].append({"key":"Content-Type","value":"application/x-www-form-urlencoded"})
            request["body"] = {"mode":"urlencoded","urlencoded":[{"key":k,"value":v,"type":"text"} for k,v in body.items()]}
    url = {"raw": BASE+path, "host":["{{baseUrl}}"], "path":["api"]+path.strip("/").split("/")}
    if query:
        url["query"]=[{"key":k,"value":v} for k,v in query.items()]
        url["raw"] += "?"+"&".join(k+"="+v for k,v in query.items())
    script = [
        f"pm.test('HTTP {expected}', function () {{ pm.response.to.have.status({expected}); }});",
        "pm.test('Response time < 5s (diagnostic)', function () { pm.expect(pm.response.responseTime).to.be.below(5000); });"
    ]
    if expected < 300 and not binary:
        script.append("pm.test('JSON success response', function () { pm.response.to.be.json; const j=pm.response.json(); pm.expect(j.success).to.not.equal(false); });")
    elif expected in (400,401,403,404,409,422):
        script.append("pm.test('Error has a useful JSON body', function () { pm.response.to.be.json; const j=pm.response.json(); pm.expect(j.success).to.equal(false); pm.expect(j.message || j.errors).to.exist; });")
    if tests: script += tests
    return {"name":name,"request":request,"event":[{"listen":"test","script":{"type":"text/javascript","exec":script}}],"response":[],"description":description}

def folder(name, items): collection["item"].append({"name":name,"item":items,"description":f"{len(items)} testcase(s). Mỗi request mô tả tiền điều kiện và kết quả mong đợi."})

T=[]
def add(*args, **kwargs): T.append(req(*args, **kwargs))

# FR-01/02: authentication
add("01 Register candidate – hợp lệ", "POST", "/register", folder="auth", expected=201, body={"name":"Nguyen Test Candidate","email":"{{uniqueEmail}}","dob":"1990-01-01","password":"SecurePass1!","password_confirmation":"SecurePass1!","role":"candidate","phone":"0912345678"}, description="Tiền điều kiện: uniqueEmail chưa tồn tại; email sandbox. Kỳ vọng tạo user+candidate profile, 201, không có password/token trong response. Ghi test email/password vào current environment để login kế tiếp.", tests=["pm.test('No credential leak',()=>{const j=pm.response.json();pm.expect(JSON.stringify(j)).not.to.include('SecurePass1!');pm.expect(j.data?.token).to.be.undefined;});", "pm.environment.set('candidateEmail', pm.variables.replaceIn('{{uniqueEmail}}'));", "pm.environment.set('candidatePassword', 'SecurePass1!');"])
add("02 Register employer – hợp lệ", "POST", "/register", folder="auth", expected=201, body={"name":"Nguyen Test Employer","email":"employer-{{uniqueSuffix}}@example.test","dob":"1990-01-01","password":"SecurePass1!","password_confirmation":"SecurePass1!","role":"employer"}, description="Kỳ vọng tạo employer và company mặc định; kiểm tra DB nếu cần.")
add("03 Register trùng email", "POST", "/register", folder="auth", expected=422, body={"name":"Duplicate Test","email":"{{candidateEmail}}","dob":"1990-01-01","password":"SecurePass1!","password_confirmation":"SecurePass1!","role":"candidate"}, description="candidateEmail đã tồn tại; errors.email báo trùng, không tạo user mới.")
add("04 Register tuổi dưới 15", "POST", "/register", folder="auth", expected=422, body={"name":"Young Test","email":"young-{{uniqueSuffix}}@example.test","dob":"2015-01-01","password":"SecurePass1!","password_confirmation":"SecurePass1!","role":"candidate"}, description="Ngày sinh phải được điều chỉnh theo ngày chạy để kiểm tra chính xác biên 15 tuổi; kỳ vọng 422.")
add("05 Register sai password policy / confirmation", "POST", "/register", folder="auth", expected=422, body={"name":"Invalid Test","email":"invalid-{{uniqueSuffix}}@example.test","dob":"1990-01-01","password":"abc","password_confirmation":"different","role":"admin"}, description="Một payload kiểm tra mật khẩu yếu, confirmation sai, role admin; kỳ vọng 422 và errors cho các field vi phạm.")
add("06 Login candidate hợp lệ", "POST", "/login", folder="auth", expected=200, body={"email":"{{candidateEmail}}","password":"{{candidatePassword}}"}, description="Sau khi chạy, copy data.token vào candidateToken; token bí mật, không export environment đã resolve.", tests=["pm.test('Bearer token and user role',()=>{const d=pm.response.json().data;pm.expect(d.token).to.be.a('string');pm.expect(d.user.role).to.eql('candidate');pm.environment.set('candidateToken',d.token);});"])
add("07 Login sai mật khẩu", "POST", "/login", folder="auth", expected=401, body={"email":"{{candidateEmail}}","password":"WrongPass1!"}, description="Dùng tài khoản chưa bị khóa; lần sai 1–4 trả 401. Không chạy lặp đến lần 5 nếu không định kiểm tra khóa.")
add("08 Login thiếu field", "POST", "/login", folder="auth", expected=422, body={"email":"not-an-email"}, description="Kỳ vọng lỗi validation 422; không tạo token.")
add("09 Get current user", "GET", "/user", folder="auth", auth="candidateToken", description="Cần candidateToken; trả user/profile đúng tài khoản.")
add("10 Get user không token", "GET", "/user", folder="auth", expected=401, description="Authorization không gửi; kỳ vọng 401.")
add("11 Forgot password – email tồn tại", "POST", "/forgot-password", folder="auth", expected=200, body={"email":"{{candidateEmail}}"}, description="Dùng mail sandbox; phản hồi chung, không lộ token/reset_url. Token thô chỉ lấy từ mailbox test để dùng các case verify/reset.", tests=["pm.test('No reset secret in response',()=>{const s=pm.response.text();pm.expect(s).not.to.include('reset_url');pm.expect(s).not.to.include('token');});"])
add("12 Forgot password – email không tồn tại", "POST", "/forgot-password", folder="auth", expected=200, body={"email":"absent-{{uniqueSuffix}}@example.test"}, description="Phản hồi/thông điệp giống case email có thật, tránh user enumeration.")
add("13 Verify reset token", "GET", "/verify-reset-token", folder="auth", expected=200, query={"email":"{{candidateEmail}}","token":"{{resetToken}}"}, description="Tiền điều kiện: token sandbox còn hạn từ email reset. Token không có sẵn tự động vì API không trả token.")
add("14 Verify reset token sai", "GET", "/verify-reset-token", folder="auth", expected=400, query={"email":"{{candidateEmail}}","token":"invalid-token"}, description="Kỳ vọng 400, token không hợp lệ.")
add("15 Reset password", "POST", "/reset-password", folder="auth", expected=200, body={"email":"{{candidateEmail}}","token":"{{resetToken}}","password":"NewSecure1!","password_confirmation":"NewSecure1!"}, description="Dùng token mới, một lần. Kỳ vọng reset record bị xóa, token đăng nhập cũ bị thu hồi; cập nhật candidatePassword thủ công sau khi xác nhận.")
add("16 Change password – current sai", "PUT", "/user/change-password", folder="auth", auth="candidateToken", expected=400, body={"current_password":"wrong","new_password":"NewSecure1!","new_password_confirmation":"NewSecure1!"}, description="Kỳ vọng 400, mật khẩu không đổi.")
add("17 Logout token hiện tại", "POST", "/logout", folder="auth", auth="candidateToken", expected=200, description="Chạy cuối nhóm auth; sau đó request dùng cùng token phải 401.")
folder("FR-01–02 · Tài khoản & xác thực", T); T=[]

# Public catalog/search
for name,path in [("Categories list","/categories"),("Skills list","/skills"),("Companies list","/companies"),("City options","/locations/cities"),("Jobs list","/jobs")]:
    add(name,"GET",path,folder="public",description="Kỳ vọng 200 success=true; xác nhận payload data, phân trang nếu endpoint có.")
add("Category detail", "GET", "/categories/{{categoryId}}", folder="public", description="categoryId phải tồn tại; kiểm tra active_job_count/field thực tế.")
add("Category missing", "GET", "/categories/99999999", folder="public", expected=404, description="ID không tồn tại => 404.")
add("Skill detail", "GET", "/skills/{{skillId}}", folder="public", description="skillId phải tồn tại.")
add("Skill search keyword", "GET", "/skills", folder="public", query={"keyword":"php"}, description="Kết quả khớp keyword; thử thêm tiếng Việt có dấu/không dấu thủ công.")
add("Companies filter", "GET", "/companies", folder="public", query={"keyword":"test","city":"Ho Chi Minh","page":"1","per_page":"10"}, description="Kiểm tra bộ lọc + pagination.")
add("Company detail", "GET", "/companies/{{companyId}}", folder="public", description="companyId tồn tại; tin kèm theo chỉ active/chưa hết hạn.")
add("Jobs filter keyword/city/type/category/skill", "GET", "/jobs", folder="public", query={"keyword":"developer","city":"Ho Chi Minh","job_type":"full_time","category_id":"{{categoryId}}","skill_ids":"{{skillId}}","page":"1","per_page":"10"}, description="Dùng dữ liệu seed phù hợp. Kiểm tra mọi kết quả thỏa bộ lọc và meta pagination.")
add("Jobs invalid per_page", "GET", "/jobs", folder="public", query={"per_page":"abc"}, expected=422, description="Sai kiểu query theo SearchJobRequest => 422.")
add("Jobs detail + view", "GET", "/jobs/{{jobId}}", folder="public", description="jobId active; kỳ vọng detail và views_count tăng 1 khi kiểm tra DB.")
add("Jobs detail missing", "GET", "/jobs/99999999", folder="public", expected=404, description="ID không tồn tại => 404.")
add("Candidate save job", "POST", "/jobs/{{jobId}}/save", folder="public", auth="candidateToken", expected=200, description="Candidate + job active. Gửi lặp: idempotent, không thêm bản ghi saved_jobs.")
add("Candidate saved jobs", "GET", "/candidate/saved-jobs", folder="public", auth="candidateToken", description="Kỳ vọng chỉ tin của candidate hiện tại.")
add("Candidate unsave job", "DELETE", "/jobs/{{jobId}}/save", folder="public", auth="candidateToken", expected=200, description="Bỏ lưu; gọi lại kiểm tra idempotency theo hợp đồng đang triển khai.")
add("Employer blocked from candidate save", "POST", "/jobs/{{jobId}}/save", folder="public", auth="employerToken", expected=403, description="Wrong role => 403.")
folder("FR-05 · Tra cứu, tìm kiếm & lưu tin", T); T=[]

# Candidate profile / CV / application
add("Candidate profile read", "GET", "/candidate/profile", folder="candidate", auth="candidateToken", description="Kỳ vọng profile của token; kiểm tra cv_url là protected API URL.")
add("Candidate profile update", "PUT", "/candidate/profile", folder="candidate", auth="candidateToken", body={"name":"Nguyen Test Candidate","title":"Backend Developer","experience_years":3,"bio":"QA test profile","city":"Ho Chi Minh","skills":["{{skillId}}"]}, description="skillId tồn tại; kiểm tra đồng bộ kỹ năng. Thử danh sách rỗng, >10, ID sai và DOB dưới 15 bằng case variants.")
add("Candidate upload CV PDF", "POST", "/candidate/cv", folder="candidate", auth="candidateToken", mode="formdata", body={"cv_file":"<CHỌN FILE PDF TEST <=5MB>"}, description="Postman Body → form-data: thay giá trị bằng File qua giao diện. Kỳ vọng tệp riêng tư + data.cv_url có /api/candidate/cv/file.", tests=["pm.test('CV URL protected',()=>pm.expect(pm.response.json().data.cv_url).to.include('/api/candidate/cv/file')); "])
add("Candidate get CV metadata", "GET", "/candidate/cv", folder="candidate", auth="candidateToken", description="Cần CV vừa upload; URL trả về không được là public storage path.")
add("Candidate download CV", "GET", "/candidate/cv/file", folder="candidate", auth="candidateToken", binary=True, description="Kỳ vọng PDF bytes, Content-Type application/pdf, cache private/no-store. Test script JSON bị tắt có chủ ý cho binary response.", tests=["pm.test('PDF content type',()=>pm.expect(pm.response.headers.get('Content-Type')||'').to.include('application/pdf'));", "pm.test('Private cache header',()=>pm.expect(pm.response.headers.get('Cache-Control')||'').to.match(/private|no-store/i));"])
add("Other candidate cannot download CV", "GET", "/candidate/cv/file", folder="candidate", auth="otherCandidateToken", expected=404, description="Other candidate không có CV riêng => 404, không lộ tệp của candidateToken.")
add("Candidate delete CV", "DELETE", "/candidate/cv", folder="candidate", auth="candidateToken", expected=200, description="Xóa CV; sau đó GET CV/file phải 404; gọi xóa lần hai để kiểm tra an toàn.")
add("Candidate upload avatar", "POST", "/candidate/avatar", folder="candidate", auth="candidateToken", mode="formdata", body={"avatar":"<CHỌN FILE IMAGE TEST <=2MB>"}, description="Đổi field thành File trong Postman; thử JPEG hợp lệ rồi MIME sai và >2MB.")
add("Candidate delete avatar", "DELETE", "/candidate/avatar", folder="candidate", auth="candidateToken", expected=200, description="Xóa avatar; kiểm tra file public cũ đã được dọn.")
add("Apply with profile CV", "POST", "/jobs/{{jobId}}/apply", folder="candidate", auth="candidateToken", mode="formdata", body={"cv_source":"profile","cover_letter":"Postman QA application"}, expected=201, description="Cần job active, thuộc employer khác, candidate có CV profile; lưu applicationId từ response để chạy các case tiếp theo.", tests=["pm.test('Save applicationId',()=>{const d=pm.response.json().data;if(d?.id)pm.environment.set('applicationId',String(d.id));});"])
add("Apply duplicate", "POST", "/jobs/{{jobId}}/apply", folder="candidate", auth="candidateToken", mode="formdata", body={"cv_source":"profile"}, expected=409, description="Chạy sau Apply with profile CV; gửi lần 2 => 409, chỉ một application.")
add("Apply missing job", "POST", "/jobs/99999999/apply", folder="candidate", auth="candidateToken", mode="formdata", body={"cv_source":"profile"}, expected=404, description="Tin không tồn tại => 404 (nếu controller trả validation khác, ghi nhận sai khác contract).")
add("Apply without auth", "POST", "/jobs/{{jobId}}/apply", folder="candidate", mode="formdata", body={"cv_source":"profile"}, expected=401, description="Không token => 401.")
add("Employer cannot apply", "POST", "/jobs/{{jobId}}/apply", folder="candidate", auth="employerToken", mode="formdata", body={"cv_source":"profile"}, expected=403, description="Wrong role => 403.")
add("Candidate application history", "GET", "/candidate/applications", folder="candidate", auth="candidateToken", query={"page":"1","per_page":"10"}, description="Chỉ trả hồ sơ ứng tuyển của người dùng hiện tại.")
add("Withdraw application", "DELETE", "/candidate/applications/{{applicationId}}/withdraw", folder="candidate", auth="candidateToken", expected=200, description="Chỉ application trạng thái applied chưa review; sau rút status withdrawn và apply lại phải 409.")
folder("FR-03 & FR-06 · Hồ sơ, CV & ứng tuyển", T); T=[]

# Employer & reports
add("Employer company read", "GET", "/employer/company", folder="employer", auth="employerToken", description="Kỳ vọng company hiện tại.")
add("Employer company update", "POST", "/employer/company", folder="employer", auth="employerToken", body={"name":"QA Company","description":"Company used for Postman QA","address":"District 1","city":"Ho Chi Minh","size":"11-50","website":"https://example.test"}, description="Kiểm tra required fields, logo upload và ràng buộc kích thước bằng case riêng.")
add("Employer my jobs", "GET", "/employer/my-jobs", folder="employer", auth="employerToken", description="Chỉ tin của employer hiện tại.")
add("Employer create job – negotiable", "POST", "/employer/jobs", folder="employer", auth="employerToken", expected=201, body={"title":"QA Postman Backend Engineer","category_id":"{{categoryId}}","job_level":"mid","quantity":1,"job_type":"full_time","city":"Ho Chi Minh","deadline":"2030-12-31","description":"Build and maintain APIs.","requirements":"Laravel experience.","benefits":"Health insurance.","salary_type":"negotiable","skills":["{{skillId}}"]}, description="Company phải đủ thông tin, category/skill IDs tồn tại; ghi jobId từ response. Chạy date tương lai theo thời điểm kiểm thử.", tests=["pm.test('Save jobId',()=>{const d=pm.response.json().data;if(d?.id)pm.environment.set('jobId',String(d.id));});"])
add("Employer create job – invalid deadline/salary", "POST", "/employer/jobs", folder="employer", auth="employerToken", expected=400, body={"title":"Bad QA Postman Job","category_id":"{{categoryId}}","job_level":"mid","quantity":1,"job_type":"full_time","city":"Ho Chi Minh","deadline":"2000-01-01","description":"Description","requirements":"Requirements","salary_type":"range","salary_min":20000000,"salary_max":10000000,"skills":["{{skillId}}"]}, description="Kỳ vọng 400 theo JobRequest custom validation; kiểm tra lỗi deadline và min>max.")
add("Employer update own job", "PUT", "/employer/jobs/{{jobId}}", folder="employer", auth="employerToken", body={"title":"QA Postman Backend Engineer Updated","category_id":"{{categoryId}}","job_level":"senior","quantity":2,"job_type":"remote","city":"Ho Chi Minh","deadline":"2030-12-31","description":"Updated description","requirements":"Updated requirements","salary_type":"from","salary_min":20000000,"skills":["{{skillId}}"]}, description="Chỉ owner; thử cập nhật category/skills và xác nhận dữ liệu lưu.")
add("Other employer cannot update job", "PUT", "/employer/jobs/{{jobId}}", folder="employer", auth="otherEmployerToken", expected=403, body={"title":"Unauthorized edit","category_id":"{{categoryId}}","job_level":"mid","quantity":1,"job_type":"full_time","city":"Ho Chi Minh","deadline":"2030-12-31","description":"x","requirements":"y","salary_type":"negotiable","skills":["{{skillId}}"]}, description="Job không thuộc token => 403/404 theo policy; không được sửa dữ liệu.")
add("Employer close job", "PATCH", "/employer/jobs/{{jobId}}/status", folder="employer", auth="employerToken", body={"status":"closed"}, description="Kỳ vọng tin biến mất khỏi public search và không nhận application.")
add("Employer reopen job", "PATCH", "/employer/jobs/{{jobId}}/status", folder="employer", auth="employerToken", body={"status":"active","deadline":"2030-12-31"}, description="Mở lại với deadline tương lai; xác minh xuất hiện public search.")
add("Employer applicants list", "GET", "/employer/jobs/{{jobId}}/applications", folder="employer", auth="employerToken", description="Chỉ application của tin employer hiện tại.")
add("Employer application detail", "GET", "/employer/applications/{{applicationId}}", folder="employer", auth="employerToken", description="Lần xem đầu thường applied→waiting; kiểm tra reviewed_at và dữ liệu CV không public.")
add("Employer update application status", "PATCH", "/employer/applications/{{applicationId}}/status", folder="employer", auth="employerToken", body={"status":"accepted"}, description="Trạng thái waiting/accepted/rejected; kiểm tra notification tới đúng candidate.")
add("Other employer cannot read application", "GET", "/employer/applications/{{applicationId}}", folder="employer", auth="otherEmployerToken", expected=403, description="Không thuộc company => 403/404 và không lộ applicant.")
add("Candidate report job", "POST", "/jobs/{{jobId}}/report", folder="employer", auth="candidateToken", expected=201, body={"reason":"Thông tin tin tuyển dụng cần kiểm tra","details":"Test report from isolated Postman data"}, description="Báo cáo đầu tạo pending report và đánh dấu tin; lưu ý employer chủ tin không thể tự report.")
add("Duplicate report", "POST", "/jobs/{{jobId}}/report", folder="employer", auth="candidateToken", expected=409, body={"reason":"Duplicate report"}, description="Chạy sau report lần đầu; kỳ vọng 409 và không tạo record thứ hai.")
folder("FR-04, FR-06, FR-09 · Nhà tuyển dụng & báo cáo", T); T=[]

# AI, chat, notifications
add("AI analyze application", "POST", "/applications/{{applicationId}}/ai-analyze", folder="realtime", auth="candidateToken", expected=202, description="Ứng viên sở hữu application hoặc employer tin đó/admin. Queue worker bật thì có thể hoàn tất nhanh; Gemini API không bắt buộc nếu fake/fallback. Kiểm tra không leak provider details.")
add("AI analysis status", "GET", "/applications/{{applicationId}}/ai-analysis", folder="realtime", auth="candidateToken", expected=202, description="Pending=202, completed=200, failed=422. Điều chỉnh expected theo trạng thái đã chuẩn bị; 202 là trạng thái bình thường.")
add("Application CV download", "GET", "/applications/{{applicationId}}/cv", folder="realtime", auth="employerToken", binary=True, description="Employer sở hữu job; xác nhận PDF + private cache; unauthorized candidate/employer/admin matrix.", tests=["pm.test('PDF content type',()=>pm.expect(pm.response.headers.get('Content-Type')||'').to.include('application/pdf'));", "pm.test('Private cache header',()=>pm.expect(pm.response.headers.get('Cache-Control')||'').to.match(/private|no-store/i));"])
add("Conversations list", "GET", "/conversations", folder="realtime", auth="candidateToken", description="Chỉ conversation của token.")
add("Create conversation", "POST", "/conversations", folder="realtime", auth="candidateToken", expected=201, body={"job_id":"{{jobId}}","partner_id":"{{userId}}"}, description="Cần application hợp lệ giữa candidate và owner employer; partner_id là user ID phía còn lại. Lưu conversationId nếu response có ID.", tests=["pm.test('Save conversationId when present',()=>{const d=pm.response.json().data||pm.response.json().conversation;if(d?.id)pm.environment.set('conversationId',String(d.id));});"])
add("Conversation messages list", "GET", "/conversations/{{conversationId}}/messages", folder="realtime", auth="candidateToken", description="Thành viên hợp lệ; phân trang và đọc history.")
add("Send text message", "POST", "/conversations/{{conversationId}}/messages", folder="realtime", auth="candidateToken", expected=201, body={"message":"Postman QA message"}, description="Tin nhắn lưu DB và sự kiện; kiểm tra employer nhận được. Reverb down vẫn phải giữ message.")
add("Send empty message invalid", "POST", "/conversations/{{conversationId}}/messages", folder="realtime", auth="candidateToken", expected=422, body={"message":"   "}, description="Không có ảnh và nội dung rỗng => validation 422.")
add("Mark conversation read", "PATCH", "/conversations/{{conversationId}}/read", folder="realtime", auth="candidateToken", description="Chỉ tin nhận được đánh dấu read; kiểm tra trạng thái và event.")
add("Non-member cannot read conversation", "GET", "/conversations/{{conversationId}}/messages", folder="realtime", auth="otherCandidateToken", expected=403, description="User ngoài cuộc trò chuyện phải bị từ chối.")
add("Download chat image", "GET", "/conversations/{{conversationId}}/messages/{{messageId}}/image", folder="realtime", auth="candidateToken", binary=True, description="Cần message ảnh hợp lệ và là member; binary response, ảnh private.")
add("Notifications list", "GET", "/notifications", folder="realtime", auth="candidateToken", description="Chỉ notification của user; kiểm tra unread_count và pagination.")
add("Mark notification read", "PATCH", "/notifications/{{notificationId}}/read", folder="realtime", auth="candidateToken", description="notificationId thuộc candidateToken; unread→read.")
add("Mark all notifications read", "PATCH", "/notifications/read-all", folder="realtime", auth="candidateToken", description="Unread count của user hiện tại về 0; user khác không đổi.")
add("Delete notification", "DELETE", "/notifications/{{notificationId}}", folder="realtime", auth="candidateToken", description="Xóa thông báo của chính user; thử ID user khác phải 403/404.")
add("Private broadcast auth", "POST", "/broadcasting/auth", folder="realtime", auth="candidateToken", mode="urlencoded", body={"socket_id":"12345.67890","channel_name":"private-conversation.{{conversationId}}"}, description="Dùng socket/channel thực tế của client Reverb; member nhận auth signature, outsider bị từ chối. Endpoint broadcast auth được đăng ký bởi Laravel broadcasting.")
folder("FR-07, FR-08, FR-10 · AI, chat & thông báo", T); T=[]

# Admin
for label,path in [("Admin stats","/admin/stats"),("Admin users list","/admin/users"),("Admin user detail","/admin/users/{{userId}}"),("Admin jobs list","/admin/jobs"),("Admin job detail","/admin/jobs/{{jobId}}"),("Admin reported jobs","/admin/jobs/reported"),("Admin categories list","/admin/categories"),("Admin skills list","/admin/skills")]:
    add(label,"GET",path,folder="admin",auth="adminToken",description="Admin token required; kiểm tra pagination/data/filters.")
add("Non-admin blocked from admin routes", "GET", "/admin/users", folder="admin", auth="candidateToken", expected=403, description="Role candidate => 403.")
add("Admin toggle user lock", "PATCH", "/admin/users/{{userId}}/toggle-lock", folder="admin", auth="adminToken", description="Đọc controller contract để xác định payload/action; kiểm tra lock revoke tokens và không tự khóa admin đang dùng.")
add("Admin update user status", "PATCH", "/admin/users/{{userId}}/status", folder="admin", auth="adminToken", body={"status":"inactive"}, description="Dùng user test; sau đó khôi phục active bằng request tương tự.")
add("Admin delete job", "DELETE", "/admin/jobs/{{otherJobId}}", folder="admin", auth="adminToken", description="CHỈ chạy với tin test có thể xóa; xóa là destructive. Tạo tin riêng trước; xác nhận cascade/notification.")
add("Admin create category", "POST", "/admin/categories", folder="admin", auth="adminToken", expected=201, body={"name":"Postman QA {{uniqueSuffix}}","description":"Temporary test category"}, description="Tạo category mới; lưu ID từ response để update/delete.")
add("Admin update category", "PUT", "/admin/categories/{{categoryAdminId}}", folder="admin", auth="adminToken", body={"name":"Postman QA category updated {{uniqueSuffix}}","description":"Updated category"}, description="categoryAdminId phải là record vừa tạo.")
add("Admin delete category", "DELETE", "/admin/categories/{{categoryAdminId}}", folder="admin", auth="adminToken", description="Chỉ chạy với record thử chưa được job tham chiếu; nếu FK đang dùng thì kỳ vọng xử lý lỗi có kiểm soát.")
add("Admin create skill", "POST", "/admin/skills", folder="admin", auth="adminToken", expected=201, body={"name":"Postman QA Skill {{uniqueSuffix}}","description":"Temporary skill"}, description="Tạo skill test; lấy ID response.")
add("Admin update skill", "PUT", "/admin/skills/{{skillAdminId}}", folder="admin", auth="adminToken", body={"name":"Postman QA Skill updated {{uniqueSuffix}}","description":"Updated skill"}, description="skillAdminId phải là record vừa tạo.")
add("Admin delete skill", "DELETE", "/admin/skills/{{skillAdminId}}", folder="admin", auth="adminToken", description="Chỉ xóa record test không được job/profile tham chiếu; kiểm tra FK.")
add("Admin resolve report", "PATCH", "/admin/jobs/{{jobId}}/report", folder="admin", auth="adminToken", body={"status":"resolved"}, description="Cần pending report; kiểm tra reviewer/time và is_reported false khi hết pending report.")
add("Wrong role blocked from admin", "GET", "/admin/stats", folder="admin", auth="employerToken", expected=403, description="Employer => 403.")
folder("FR-09 · Quản trị", T)

out=Path(__file__).parent / "collections" / "TimViecOnline-Full-QA.postman_collection.json"
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(collection,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"Generated {out} with {sum(len(x['item']) for x in collection['item'])} requests")
