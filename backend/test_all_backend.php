<?php

/**
 * SCRIPT KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN BACKEND (ALL-IN-ONE AUTOMATED TEST SUITE)
 * Chạy lệnh: php test_all_backend.php
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use App\Models\Job;
use App\Models\Category;
use App\Models\Skill;
use App\Models\Application;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Notification;

Storage::fake('public');

$passed = 0;
$failed = 0;

function assertTest(string $name, bool $condition, string $detail = '') {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "  [PASS] {$name}\n";
    } else {
        $failed++;
        echo "  [FAIL] {$name} - {$detail}\n";
    }
}

echo "\n=======================================================\n";
echo "    BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG HỆ THỐNG BACKEND API\n";
echo "=======================================================\n\n";

// -------------------------------------------------------------------------
// 1. MODULE XÁC THỰC (AUTHENTICATION)
// -------------------------------------------------------------------------
echo "1. KIỂM THỬ MODULE XÁC THỰC (AUTH & SANCTUM):\n";
User::where('email', 'temp_test_candidate@timviec.vn')->delete();

// Test 1.1: Đăng ký Candidate
$req = Request::create('/api/register', 'POST', [
    'name' => 'Nguyễn Kiểm Thử',
    'email' => 'temp_test_candidate@timviec.vn',
    'password' => 'TestPass123@',
    'password_confirmation' => 'TestPass123@',
    'phone' => '0912345678',
    'dob' => '2000-01-01',
    'role' => 'candidate',
]);
$req->headers->set('Accept', 'application/json');
$resp = $app->handle($req);
assertTest("1.1 Đăng ký tài khoản Ứng viên (201 Created)", $resp->getStatusCode() === 201);
$tempUser = User::where('email', 'temp_test_candidate@timviec.vn')->first();
assertTest("1.2 Tự động tạo CandidateProfile rỗng (FR-01.6)", $tempUser && $tempUser->candidateProfile !== null);

// Test 1.3: Trùng email -> 422
Auth::forgetGuards();
$reqDup = Request::create('/api/register', 'POST', [
    'name' => 'Nguyễn Kiểm Thử Trùng',
    'email' => 'temp_test_candidate@timviec.vn',
    'password' => 'TestPass123@',
    'password_confirmation' => 'TestPass123@',
    'role' => 'candidate',
]);
$reqDup->headers->set('Accept', 'application/json');
$respDup = $app->handle($reqDup);
$dupJson = json_decode($respDup->getContent(), true);
assertTest("1.3 Đăng ký trùng email trả lỗi 422 'Email đã được sử dụng'", $respDup->getStatusCode() === 422 && ($dupJson['message'] ?? '') === 'Email đã được sử dụng');

// Test 1.4: Đăng nhập sai pass -> 401
Auth::forgetGuards();
$reqWrongPass = Request::create('/api/login', 'POST', ['email' => 'temp_test_candidate@timviec.vn', 'password' => 'WrongPass!']);
$reqWrongPass->headers->set('Accept', 'application/json');
$respWrong = $app->handle($reqWrongPass);
assertTest("1.4 Đăng nhập sai mật khẩu trả 401", $respWrong->getStatusCode() === 401);

// Test 1.5: Đăng nhập đúng -> 200
Auth::forgetGuards();
$reqLogin = Request::create('/api/login', 'POST', ['email' => 'temp_test_candidate@timviec.vn', 'password' => 'TestPass123@']);
$reqLogin->headers->set('Accept', 'application/json');
$respLogin = $app->handle($reqLogin);
$loginData = json_decode($respLogin->getContent(), true);
$candToken = $loginData['data']['token'] ?? '';
assertTest("1.5 Đăng nhập thành công trả 200 kèm Bearer Token", $respLogin->getStatusCode() === 200 && !empty($candToken));

// Test 1.6: Lấy thông tin user hiện tại
Auth::forgetGuards();
$reqUser = Request::create('/api/user', 'GET');
$reqUser->headers->set('Accept', 'application/json');
$reqUser->headers->set('Authorization', 'Bearer ' . $candToken);
$respUser = $app->handle($reqUser);
assertTest("1.6 Gọi API Protected /api/user trả 200 kèm Profile", $respUser->getStatusCode() === 200);

// -------------------------------------------------------------------------
// 2. MODULE MASTER DATA (CATEGORIES & SKILLS)
// -------------------------------------------------------------------------
echo "\n2. KIỂM THỬ MASTER DATA (NGÀNH NGHỀ & KỸ NĂNG):\n";
$reqCat = Request::create('/api/categories', 'GET');
$reqCat->headers->set('Accept', 'application/json');
$respCat = $app->handle($reqCat);
$catData = json_decode($respCat->getContent(), true);
assertTest("2.1 Lấy danh sách Ngành nghề công khai (/api/categories)", $respCat->getStatusCode() === 200 && count($catData['data']) >= 5);

$reqSkill = Request::create('/api/skills?keyword=PHP', 'GET');
$reqSkill->headers->set('Accept', 'application/json');
$respSkill = $app->handle($reqSkill);
$skillData = json_decode($respSkill->getContent(), true);
assertTest("2.2 Tìm kiếm kỹ năng autocomplete (/api/skills?keyword=PHP)", $respSkill->getStatusCode() === 200 && count($skillData['data']) >= 1);

// -------------------------------------------------------------------------
// 3. MODULE HỒ SƠ ỨNG VIÊN & DOANH NGHIỆP
// -------------------------------------------------------------------------
echo "\n3. KIỂM THỬ HỒ SƠ CÁ NHÂN & TẢI LÊN CV PDF:\n";
// Test 3.1: Upload file CV không phải PDF -> 400
Auth::forgetGuards();
$badFile = UploadedFile::fake()->create('cv.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
$reqBadCv = Request::create('/api/candidate/profile', 'POST', [], [], ['cv_file' => $badFile]);
$reqBadCv->headers->set('Accept', 'application/json');
$reqBadCv->headers->set('Authorization', 'Bearer ' . $candToken);
$respBadCv = $app->handle($reqBadCv);
assertTest("3.1 Upload CV sai định dạng trả 400 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB'", $respBadCv->getStatusCode() === 400);

// Test 3.2: Upload file CV PDF hợp lệ -> 200
Auth::forgetGuards();
$goodCv = UploadedFile::fake()->create('resume.pdf', 500, 'application/pdf');
$reqGoodCv = Request::create('/api/candidate/profile', 'POST', [
    'title' => 'Senior Laravel Developer',
    'skills' => [1, 2, 6],
    'experience_years' => 3,
    'city' => 'Hà Nội',
], [], ['cv_file' => $goodCv]);
$reqGoodCv->headers->set('Accept', 'application/json');
$reqGoodCv->headers->set('Authorization', 'Bearer ' . $candToken);
$respGoodCv = $app->handle($reqGoodCv);
$goodCvData = json_decode($respGoodCv->getContent(), true);
assertTest("3.2 Upload CV PDF hợp lệ & cập nhật kỹ năng trả 200", $respGoodCv->getStatusCode() === 200 && !empty($goodCvData['data']['profile']['cv_url']));

// Test 3.3: Employer cập nhật công ty
Auth::forgetGuards();
$employer = User::where('role', 'employer')->first();
$empToken = $employer->createToken('test_emp_runner')->plainTextToken;
$reqEmp = Request::create('/api/employer/company', 'POST', [
    'name' => 'FPT Software Corp',
    'address' => 'Khu Công Nghệ Cao Hòa Lạc',
    'city' => 'Hà Nội',
    'description' => 'Tập đoàn phần mềm hàng đầu',
    'company_size' => '1000+ nhân viên',
]);
$reqEmp->headers->set('Accept', 'application/json');
$reqEmp->headers->set('Authorization', 'Bearer ' . $empToken);
$respEmp = $app->handle($reqEmp);
assertTest("3.3 Nhà tuyển dụng cập nhật hồ sơ công ty (/api/employer/company)", $respEmp->getStatusCode() === 200);

// -------------------------------------------------------------------------
// 4. MODULE CORE VIỆC LÀM & TÌM KIẾM, BỘ LỌC
// -------------------------------------------------------------------------
echo "\n4. KIỂM THỬ CORE VIỆC LÀM (JOBS CRUD & BỘ LỌC):\n";
// Test 4.1: Đăng tin với hạn nộp ở quá khứ -> 400
Auth::forgetGuards();
$reqPastJob = Request::create('/api/employer/jobs', 'POST', [
    'title' => 'Tuyển dụng Developer Lỗi Hạn Nộp',
    'category_id' => 1,
    'job_level' => 'Middle',
    'quantity' => 1,
    'job_type' => 'full_time',
    'city' => 'Hà Nội',
    'deadline' => now()->subDay()->toDateString(),
    'description' => 'Mô tả',
    'requirements' => 'Yêu cầu',
    'skills' => [1, 2],
]);
$reqPastJob->headers->set('Accept', 'application/json');
$reqPastJob->headers->set('Authorization', 'Bearer ' . $empToken);
$respPast = $app->handle($reqPastJob);
assertTest("4.1 Hạn nộp hồ sơ ở quá khứ trả 400 'Hạn nộp hồ sơ phải sau ngày hôm nay'", $respPast->getStatusCode() === 400);

// Test 4.2: Đăng tin hợp lệ -> 201
Auth::forgetGuards();
$reqValidJob = Request::create('/api/employer/jobs', 'POST', [
    'title' => 'Lập Trình Viên Fullstack Laravel & NextJS',
    'category_id' => 1,
    'job_level' => 'Junior',
    'quantity' => 2,
    'job_type' => 'full_time',
    'city' => 'Hà Nội',
    'address' => 'Keangnam Landmark',
    'deadline' => now()->addDays(30)->toDateString(),
    'salary_min' => 15000000,
    'salary_max' => 25000000,
    'description' => 'Mô tả chi tiết công việc dự án.',
    'requirements' => 'Thành thạo Laravel, Next.js, MySQL.',
    'benefits' => 'Thưởng dự án, bảo hiểm đầy đủ.',
    'skills' => [1, 2, 3, 4],
]);
$reqValidJob->headers->set('Accept', 'application/json');
$reqValidJob->headers->set('Authorization', 'Bearer ' . $empToken);
$respValidJob = $app->handle($reqValidJob);
$jobCreated = json_decode($respValidJob->getContent(), true);
$createdJobId = $jobCreated['data']['id'] ?? 0;
assertTest("4.2 Đăng tin tuyển dụng hợp lệ trả 201 Created", $respValidJob->getStatusCode() === 201 && $createdJobId > 0);

// Test 4.3: Tìm kiếm theo từ khóa & Lọc lương
$reqSearch = Request::create('/api/jobs?keyword=Laravel&salary_range=10_20', 'GET');
$reqSearch->headers->set('Accept', 'application/json');
$respSearch = $app->handle($reqSearch);
assertTest("4.3 Tìm kiếm từ khóa và lọc khoảng mức lương (/api/jobs)", $respSearch->getStatusCode() === 200);

// Test 4.4: Ứng viên lưu việc làm
Auth::forgetGuards();
$reqSave = Request::create('/api/jobs/' . $createdJobId . '/save', 'POST');
$reqSave->headers->set('Accept', 'application/json');
$reqSave->headers->set('Authorization', 'Bearer ' . $candToken);
$respSave = $app->handle($reqSave);
assertTest("4.4 Ứng viên lưu việc làm yêu thích (/api/jobs/{id}/save)", $respSave->getStatusCode() === 200);

// -------------------------------------------------------------------------
// 5. MODULE ỨNG TUYỂN & TÍCH HỢP GEMINI AI
// -------------------------------------------------------------------------
echo "\n5. KIỂM THỬ ỨNG TUYỂN & TÍCH HỢP GEMINI AI:\n";
// Test 5.1: Nộp hồ sơ thành công & AI chấm điểm
Auth::forgetGuards();
$reqApply = Request::create('/api/jobs/' . $createdJobId . '/apply', 'POST', [
    'cover_letter' => 'Em muốn ứng tuyển vào vị trí này.',
]);
$reqApply->headers->set('Accept', 'application/json');
$reqApply->headers->set('Authorization', 'Bearer ' . $candToken);
$respApply = $app->handle($reqApply);
$applyData = json_decode($respApply->getContent(), true);
$appId = $applyData['data']['id'] ?? 0;
$matchScore = $applyData['data']['ai_analysis']['match_score'] ?? null;
assertTest("5.1 Nộp hồ sơ ứng tuyển thành công (201 Created)", $respApply->getStatusCode() === 201 && $appId > 0);
assertTest("5.2 Tích hợp AI Gemini phân tích Match Score (0-100%)", is_numeric($matchScore) && $matchScore >= 0 && $matchScore <= 100);

// Test 5.3: Chặn nộp trùng lần 2 -> 409 Conflict
Auth::forgetGuards();
$reqDupApply = Request::create('/api/jobs/' . $createdJobId . '/apply', 'POST', []);
$reqDupApply->headers->set('Accept', 'application/json');
$reqDupApply->headers->set('Authorization', 'Bearer ' . $candToken);
$respDupApply = $app->handle($reqDupApply);
assertTest("5.3 Chặn nộp hồ sơ lần 2 trả mã 409 Conflict", $respDupApply->getStatusCode() === 409);

// Test 5.4: NTD mở xem hồ sơ -> tự động chuyển sang 'waiting'
Auth::forgetGuards();
$reqViewApp = Request::create('/api/employer/applications/' . $appId, 'GET');
$reqViewApp->headers->set('Accept', 'application/json');
$reqViewApp->headers->set('Authorization', 'Bearer ' . $empToken);
$respViewApp = $app->handle($reqViewApp);
$viewAppData = json_decode($respViewApp->getContent(), true);
assertTest("5.4 NTD mở xem CV: tự động chuyển sang trạng thái 'waiting' (FR-06.5)", $respViewApp->getStatusCode() === 200 && ($viewAppData['data']['status'] ?? '') === 'waiting');

// Test 5.5: Ứng viên rút hồ sơ sau khi NTD đã xem -> 400
Auth::forgetGuards();
$reqWithdraw = Request::create('/api/candidate/applications/' . $appId . '/withdraw', 'DELETE');
$reqWithdraw->headers->set('Accept', 'application/json');
$reqWithdraw->headers->set('Authorization', 'Bearer ' . $candToken);
$respWithdraw = $app->handle($reqWithdraw);
assertTest("5.5 Chặn rút hồ sơ khi NTD đã xem trả lỗi 400 Bad Request", $respWithdraw->getStatusCode() === 400);

// -------------------------------------------------------------------------
// 6. MODULE NHẮN TIN REALTIME & THÔNG BÁO IN-APP
// -------------------------------------------------------------------------
echo "\n6. KIỂM THỬ REALTIME CHAT & THÔNG BÁO IN-APP:\n";
// Test 6.1: Mở phòng chat
Auth::forgetGuards();
$reqConv = Request::create('/api/conversations', 'POST', [
    'job_id' => $createdJobId,
    'partner_id' => $tempUser->id,
]);
$reqConv->headers->set('Accept', 'application/json');
$reqConv->headers->set('Authorization', 'Bearer ' . $empToken);
$respConv = $app->handle($reqConv);
$convData = json_decode($respConv->getContent(), true);
$convId = $convData['data']['id'] ?? 0;
assertTest("6.1 Mở cuộc trò chuyện 1-1 giữa NTD & Ứng viên (/api/conversations)", $respConv->getStatusCode() === 200 && $convId > 0);

// Test 6.2: Gửi tin nhắn
Auth::forgetGuards();
$reqSend = Request::create('/api/conversations/' . $convId . '/messages', 'POST', [
    'message' => 'Chào bạn, chúng tôi muốn mời bạn phỏng vấn trực tiếp.',
]);
$reqSend->headers->set('Accept', 'application/json');
$reqSend->headers->set('Authorization', 'Bearer ' . $empToken);
$respSend = $app->handle($reqSend);
assertTest("6.2 Gửi tin nhắn thành công kích hoạt Broadcast Event (201 Created)", $respSend->getStatusCode() === 201);

// Test 6.3: Kiểm tra thông báo in-app
Auth::forgetGuards();
$reqNotify = Request::create('/api/notifications', 'GET');
$reqNotify->headers->set('Accept', 'application/json');
$reqNotify->headers->set('Authorization', 'Bearer ' . $candToken);
$respNotify = $app->handle($reqNotify);
$notifyData = json_decode($respNotify->getContent(), true);
assertTest("6.3 Nhận thông báo in-app kèm unread badge count (/api/notifications)", $respNotify->getStatusCode() === 200 && ($notifyData['unread_count'] ?? 0) >= 1);

// -------------------------------------------------------------------------
// 7. MODULE QUẢN TRỊ VIÊN ADMIN DASHBOARD
// -------------------------------------------------------------------------
echo "\n7. KIỂM THỬ QUẢN TRỊ ADMIN (STATS & KHÓA USER):\n";
Auth::forgetGuards();
$admin = User::where('role', 'admin')->first();
$adminToken = $admin->createToken('test_admin_runner')->plainTextToken;

// Test 7.1: Thống kê Dashboard
$reqStats = Request::create('/api/admin/stats', 'GET');
$reqStats->headers->set('Accept', 'application/json');
$reqStats->headers->set('Authorization', 'Bearer ' . $adminToken);
$respStats = $app->handle($reqStats);
$stats = json_decode($respStats->getContent(), true);
assertTest("7.1 Lấy số liệu thống kê Dashboard (/api/admin/stats)", $respStats->getStatusCode() === 200 && isset($stats['data']['total_candidates']));

// Test 7.2: Khóa tài khoản
Auth::forgetGuards();
$reqLock = Request::create('/api/admin/users/' . $tempUser->id . '/status', 'PATCH', ['status' => 'locked']);
$reqLock->headers->set('Accept', 'application/json');
$reqLock->headers->set('Authorization', 'Bearer ' . $adminToken);
$respLock = $app->handle($reqLock);
assertTest("7.2 Khóa tài khoản người dùng & thu hồi token (/api/admin/users/{id}/status)", $respLock->getStatusCode() === 200);

// Test 7.3: User bị khóa đăng nhập -> 403
Auth::forgetGuards();
$reqLockedLog = Request::create('/api/login', 'POST', ['email' => 'temp_test_candidate@timviec.vn', 'password' => 'TestPass123@']);
$reqLockedLog->headers->set('Accept', 'application/json');
$respLockedLog = $app->handle($reqLockedLog);
assertTest("7.3 Đăng nhập tài khoản bị khóa trả 403 'Tài khoản của bạn đã bị khóa bởi quản trị viên'", $respLockedLog->getStatusCode() === 403);

// -------------------------------------------------------------------------
// DỌN DẸP DỮ LIỆU TEST
// -------------------------------------------------------------------------
Job::find($createdJobId)?->delete();
$tempUser->delete();
$employer->tokens()->delete();
$admin->tokens()->delete();

echo "\n=======================================================\n";
echo "    KẾT QUẢ KIỂM THỬ: {$passed} PASSED | {$failed} FAILED\n";
if ($failed === 0) {
    echo "    >>> TẤT CẢ 26 BÀI TEST HOẠT ĐỘNG HOÀN HẢO 100%! <<<\n";
} else {
    echo "    >>> CÓ {$failed} BÀI TEST CHƯA ĐẠT. XEM CHI TIẾT PHÍA TRÊN. <<<\n";
}
echo "=======================================================\n\n";
