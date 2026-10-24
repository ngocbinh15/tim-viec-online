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
$testIp = static fn (): string => '10.255.' . random_int(1, 254) . '.' . random_int(1, 254);

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
], [], [], ['REMOTE_ADDR' => $testIp()]);
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
], [], [], ['REMOTE_ADDR' => $testIp()]);
$reqDup->headers->set('Accept', 'application/json');
$respDup = $app->handle($reqDup);
$dupJson = json_decode($respDup->getContent(), true);
assertTest("1.3 Đăng ký trùng email trả lỗi 422 'Email đã được sử dụng'", $respDup->getStatusCode() === 422 && ($dupJson['message'] ?? '') === 'Email đã được sử dụng');

// Test 1.4: Đăng nhập sai pass -> 401 với thông báo chuẩn FR-02.2
Auth::forgetGuards();
$reqWrongPass = Request::create('/api/login', 'POST', ['email' => 'temp_test_candidate@timviec.vn', 'password' => 'WrongPass!'], [], [], ['REMOTE_ADDR' => $testIp()]);
$reqWrongPass->headers->set('Accept', 'application/json');
$respWrong = $app->handle($reqWrongPass);
$wrongJson = json_decode($respWrong->getContent(), true);
assertTest("1.4 Đăng nhập sai mật khẩu trả 401 'Email hoặc mật khẩu không chính xác' (FR-02.2)", $respWrong->getStatusCode() === 401 && ($wrongJson['message'] ?? '') === 'Email hoặc mật khẩu không chính xác');

// Test 1.5: Tạm khóa sau 5 lần sai liên tiếp (FR-02.3 & FR-02.4)
Auth::forgetGuards();
for ($i = 0; $i < 3; $i++) {
    $r = Request::create('/api/login', 'POST', ['email' => 'temp_test_candidate@timviec.vn', 'password' => 'WrongPass!'], [], [], ['REMOTE_ADDR' => $testIp()]);
    $r->headers->set('Accept', 'application/json');
    $app->handle($r);
}
// Lần thứ 5 sai (lần 1 ở test 1.4 + 3 lần ở vòng lặp + 1 lần này = 5 lần)
$req5th = Request::create('/api/login', 'POST', ['email' => 'temp_test_candidate@timviec.vn', 'password' => 'WrongPass!'], [], [], ['REMOTE_ADDR' => $testIp()]);
$req5th->headers->set('Accept', 'application/json');
$resp5th = $app->handle($req5th);
$json5th = json_decode($resp5th->getContent(), true);
assertTest("1.5 Sai 5 lần liên tiếp trả 403 'Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản' (FR-02.4)", 
    $resp5th->getStatusCode() === 403 && ($json5th['message'] ?? '') === 'Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản');

// Khôi phục tài khoản để tiếp tục test đăng nhập thành công
User::where('email', 'temp_test_candidate@timviec.vn')->update(['failed_attempts' => 0, 'locked_until' => null]);

// Test 1.6: Đăng nhập đúng -> 200 kèm Bearer Token & redirect_url điều hướng đúng vai trò (FR-02.6)
Auth::forgetGuards();
$reqLogin = Request::create('/api/login', 'POST', ['email' => 'temp_test_candidate@timviec.vn', 'password' => 'TestPass123@'], [], [], ['REMOTE_ADDR' => $testIp()]);
$reqLogin->headers->set('Accept', 'application/json');
$respLogin = $app->handle($reqLogin);
$loginData = json_decode($respLogin->getContent(), true);
$candToken = $loginData['data']['token'] ?? '';
$redirectUrl = $loginData['data']['redirect_url'] ?? '';
assertTest("1.6 Đăng nhập thành công trả 200 kèm Bearer Token & redirect_url=/jobs (FR-02.6)", 
    $respLogin->getStatusCode() === 200 && !empty($candToken) && $redirectUrl === '/jobs');

// Test 1.7: Lấy thông tin user hiện tại
Auth::forgetGuards();
$reqUser = Request::create('/api/user', 'GET');
$reqUser->headers->set('Accept', 'application/json');
$reqUser->headers->set('Authorization', 'Bearer ' . $candToken);
$respUser = $app->handle($reqUser);
assertTest("1.7 Gọi API Protected /api/user trả 200 kèm Profile", $respUser->getStatusCode() === 200);

// Test 1.8: Đổi mật khẩu - sai mật khẩu hiện tại trả 400 (FR-02.9)
Auth::forgetGuards();
$reqCpWrong = Request::create('/api/user/change-password', 'PUT', [
    'current_password' => 'WrongPass123@',
    'new_password' => 'NewTestPass123@',
    'new_password_confirmation' => 'NewTestPass123@',
]);
$reqCpWrong->headers->set('Accept', 'application/json');
$reqCpWrong->headers->set('Authorization', 'Bearer ' . $candToken);
$respCpWrong = $app->handle($reqCpWrong);
$cpWrongJson = json_decode($respCpWrong->getContent(), true);
assertTest("1.8 Đổi mật khẩu sai mật khẩu hiện tại trả 400 'Mật khẩu hiện tại không chính xác' (FR-02.9)",
    $respCpWrong->getStatusCode() === 400 && ($cpWrongJson['message'] ?? '') === 'Mật khẩu hiện tại không chính xác');

// Test 1.9: Đổi mật khẩu - mật khẩu mới trùng mật khẩu cũ trả 400 (FR-02.9)
Auth::forgetGuards();
$reqCpSame = Request::create('/api/user/change-password', 'PUT', [
    'current_password' => 'TestPass123@',
    'new_password' => 'TestPass123@',
    'new_password_confirmation' => 'TestPass123@',
]);
$reqCpSame->headers->set('Accept', 'application/json');
$reqCpSame->headers->set('Authorization', 'Bearer ' . $candToken);
$respCpSame = $app->handle($reqCpSame);
$cpSameJson = json_decode($respCpSame->getContent(), true);
assertTest("1.9 Đổi mật khẩu mới trùng mật khẩu cũ trả 400 'Mật khẩu mới không được trùng với mật khẩu hiện tại' (FR-02.9)",
    $respCpSame->getStatusCode() === 400 && ($cpSameJson['message'] ?? '') === 'Mật khẩu mới không được trùng với mật khẩu hiện tại');

// Test 1.10: Đổi mật khẩu thành công trả 200 (FR-02.9)
Auth::forgetGuards();
$reqCpOk = Request::create('/api/user/change-password', 'PUT', [
    'current_password' => 'TestPass123@',
    'new_password' => 'ChangedPass123@',
    'new_password_confirmation' => 'ChangedPass123@',
]);
$reqCpOk->headers->set('Accept', 'application/json');
$reqCpOk->headers->set('Authorization', 'Bearer ' . $candToken);
$respCpOk = $app->handle($reqCpOk);
$cpOkJson = json_decode($respCpOk->getContent(), true);
assertTest("1.10 Đổi mật khẩu thành công trả 200 'Đổi mật khẩu thành công' (FR-02.9)",
    $respCpOk->getStatusCode() === 200 && ($cpOkJson['message'] ?? '') === 'Đổi mật khẩu thành công');

// Test 1.11: Quên mật khẩu - Email không tồn tại trả lỗi 404 (FR-02.7)
Auth::forgetGuards();
$reqFpNotFound = Request::create('/api/forgot-password', 'POST', [
    'email' => 'nonexistent_email_12345@timviec.vn',
], [], [], ['REMOTE_ADDR' => $testIp()]);
$reqFpNotFound->headers->set('Accept', 'application/json');
$respFpNotFound = $app->handle($reqFpNotFound);
assertTest("1.11 Quên mật khẩu email không tồn tại trả 404 (FR-02.7)", $respFpNotFound->getStatusCode() === 404, $respFpNotFound->getStatusCode() . ' ' . $respFpNotFound->getContent());

// Test 1.12: Quên mật khẩu - Email hợp lệ trả 200 và sinh token có hạn 15 phút (FR-02.7)
Auth::forgetGuards();
$reqFp = Request::create('/api/forgot-password', 'POST', [
    'email' => 'temp_test_candidate@timviec.vn',
], [], [], ['REMOTE_ADDR' => $testIp()]);
$reqFp->headers->set('Accept', 'application/json');
$respFp = $app->handle($reqFp);
$fpJson = json_decode($respFp->getContent(), true);
$resetToken = $fpJson['data']['token'] ?? '';
assertTest("1.12 Quên mật khẩu thành công trả 200 & tạo token xác thực (FR-02.7)",
    $respFp->getStatusCode() === 200 && !empty($resetToken), $respFp->getStatusCode() . ' ' . $respFp->getContent());

// Test 1.13: Kiểm tra link đặt lại mật khẩu với token sai/hết hạn trả 400 (FR-02.8)
Auth::forgetGuards();
$reqVerifyInvalid = Request::create('/api/verify-reset-token', 'GET', [
    'email' => 'temp_test_candidate@timviec.vn',
    'token' => 'invalid_or_expired_token_xyz',
]);
$reqVerifyInvalid->headers->set('Accept', 'application/json');
$respVerifyInvalid = $app->handle($reqVerifyInvalid);
$verifyInvalidJson = json_decode($respVerifyInvalid->getContent(), true);
assertTest("1.13 Token đặt lại mật khẩu không hợp lệ trả 400 'Liên kết xác thực đã hết hạn hoặc không hợp lệ' (FR-02.8)",
    $respVerifyInvalid->getStatusCode() === 400 && ($verifyInvalidJson['message'] ?? '') === 'Liên kết xác thực đã hết hạn hoặc không hợp lệ');

// Test 1.14: Đặt lại mật khẩu thành công và khôi phục tài khoản (FR-02.8)
Auth::forgetGuards();
$reqReset = Request::create('/api/reset-password', 'POST', [
    'email' => 'temp_test_candidate@timviec.vn',
    'token' => $resetToken,
    'password' => 'TestPass123@', // Trả về lại pass gốc để các bài test phía sau chạy bình thường
    'password_confirmation' => 'TestPass123@',
], [], [], ['REMOTE_ADDR' => $testIp()]);
$reqReset->headers->set('Accept', 'application/json');
$respReset = $app->handle($reqReset);
$resetJson = json_decode($respReset->getContent(), true);
assertTest("1.14 Đặt lại mật khẩu thành công trả 200 'Đặt lại mật khẩu thành công' & redirect_url=/login (FR-02.8)",
    $respReset->getStatusCode() === 200 && ($resetJson['message'] ?? '') === 'Đặt lại mật khẩu thành công' && ($resetJson['data']['redirect_url'] ?? '') === '/login', $respReset->getStatusCode() . ' ' . $respReset->getContent());

// Password reset correctly revokes existing sessions; obtain a fresh token for
// the remaining authenticated integration checks.
Auth::forgetGuards();
$reqLoginAfterReset = Request::create('/api/login', 'POST', [
    'email' => 'temp_test_candidate@timviec.vn',
    'password' => 'TestPass123@',
], [], [], ['REMOTE_ADDR' => $testIp()]);
$reqLoginAfterReset->headers->set('Accept', 'application/json');
$loginAfterReset = $app->handle($reqLoginAfterReset);
$candToken = json_decode($loginAfterReset->getContent(), true)['data']['token'] ?? $candToken;

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
// 4. MODULE CORE VIỆC LÀM & QUẢN LÝ VÒNG ĐỜI TIN TUYỂN DỤNG (FR-04)
// -------------------------------------------------------------------------
echo "\n4. KIỂM THỬ CORE VIỆC LÀM (FR-04 CRUD & VÒNG ĐỜI TIN TUYỂN DỤNG):\n";

// Test 4.1: Chặn đăng tin khi chưa cập nhật đầy đủ thông tin công ty (FR-04.1)
Auth::forgetGuards();
$empCompany = $employer->company;
$oldDesc = $empCompany->description;
$empCompany->update(['description' => '']); // Tạm thời để trống description để test
$reqIncompleteJob = Request::create('/api/employer/jobs', 'POST', [
    'title' => 'Tuyển dụng Developer Kiểm tra Hồ sơ',
    'category_id' => 1,
    'job_level' => 'Middle',
    'quantity' => 1,
    'job_type' => 'full_time',
    'city' => 'Hà Nội',
    'deadline' => now()->addDays(10)->toDateString(),
    'description' => 'Mô tả',
    'requirements' => 'Yêu cầu',
    'skills' => [1, 2],
]);
$reqIncompleteJob->headers->set('Accept', 'application/json');
$reqIncompleteJob->headers->set('Authorization', 'Bearer ' . $empToken);
$respIncomplete = $app->handle($reqIncompleteJob);
$incompleteJson = json_decode($respIncomplete->getContent(), true);
assertTest("4.1 Chưa cập nhật đủ hồ sơ công ty trả 400 (FR-04.1)",
    $respIncomplete->getStatusCode() === 400 && str_contains($incompleteJson['message'] ?? '', 'Vui lòng cập nhật đầy đủ thông tin công ty'));
$empCompany->update(['description' => $oldDesc]); // Khôi phục lại thông tin công ty

// Test 4.2: Đăng tin với hạn nộp ở quá khứ -> 400 (FR-04.3)
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
assertTest("4.2 Hạn nộp hồ sơ ở quá khứ trả 400 'Hạn nộp hồ sơ phải sau ngày hôm nay' (FR-04.3)", $respPast->getStatusCode() === 400);

// Test 4.3: Nhập mức lương min > max trả 400 (FR-04.4)
Auth::forgetGuards();
$reqSalaryErr = Request::create('/api/employer/jobs', 'POST', [
    'title' => 'Tuyển dụng Developer Lỗi Mức Lương',
    'category_id' => 1,
    'job_level' => 'Middle',
    'quantity' => 1,
    'job_type' => 'full_time',
    'city' => 'Hà Nội',
    'deadline' => now()->addDays(20)->toDateString(),
    'salary_min' => 30000000,
    'salary_max' => 20000000,
    'description' => 'Mô tả',
    'requirements' => 'Yêu cầu',
    'skills' => [1, 2],
]);
$reqSalaryErr->headers->set('Accept', 'application/json');
$reqSalaryErr->headers->set('Authorization', 'Bearer ' . $empToken);
$respSalaryErr = $app->handle($reqSalaryErr);
$salErrJson = json_decode($respSalaryErr->getContent(), true);
assertTest("4.3 Lương min > max trả 400 'Mức lương tối thiểu không được lớn hơn mức lương tối đa' (FR-04.4)",
    $respSalaryErr->getStatusCode() === 400 && ($salErrJson['message'] ?? '') === 'Mức lương tối thiểu không được lớn hơn mức lương tối đa');

// Test 4.4: Đăng tin hợp lệ (khoảng lương cụ thể) -> 201 Created & status='active' (FR-04.2 & FR-04.5)
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
$createdJobStatus = $jobCreated['data']['status'] ?? '';
assertTest("4.4 Đăng tin tuyển dụng hợp lệ trả 201 Created & status='active' (FR-04.5)", 
    $respValidJob->getStatusCode() === 201 && $createdJobId > 0 && $createdJobStatus === 'active');

// Test 4.5: Đăng tin với Lương khởi điểm và Lương thỏa thuận (FR-04.4)
Auth::forgetGuards();
$reqFromSalary = Request::create('/api/employer/jobs', 'POST', [
    'title' => 'Lập Trình Viên Backend Lương Khởi Điểm',
    'category_id' => 1,
    'job_level' => 'Middle',
    'quantity' => 1,
    'job_type' => 'full_time',
    'city' => 'Hà Nội',
    'deadline' => now()->addDays(30)->toDateString(),
    'salary_type' => 'from',
    'salary_min' => 18000000,
    'description' => 'Mô tả chi tiết',
    'requirements' => 'Yêu cầu chuyên môn',
    'skills' => [1, 2],
]);
$reqFromSalary->headers->set('Accept', 'application/json');
$reqFromSalary->headers->set('Authorization', 'Bearer ' . $empToken);
$respFromSal = $app->handle($reqFromSalary);
$fromSalJson = json_decode($respFromSal->getContent(), true);
$fromSalDisplay = $fromSalJson['data']['salary_display'] ?? '';
$tempJob1Id = $fromSalJson['data']['id'] ?? 0;

$reqNegoSalary = Request::create('/api/employer/jobs', 'POST', [
    'title' => 'Lập Trình Viên Frontend Lương Thỏa Thuận',
    'category_id' => 1,
    'job_level' => 'Senior',
    'quantity' => 1,
    'job_type' => 'remote',
    'city' => 'TP.HCM',
    'deadline' => now()->addDays(30)->toDateString(),
    'salary_type' => 'negotiable',
    'description' => 'Mô tả chi tiết',
    'requirements' => 'Yêu cầu chuyên môn',
    'skills' => [1, 3],
]);
$reqNegoSalary->headers->set('Accept', 'application/json');
$reqNegoSalary->headers->set('Authorization', 'Bearer ' . $empToken);
$respNegoSal = $app->handle($reqNegoSalary);
$negoSalJson = json_decode($respNegoSal->getContent(), true);
$negoSalDisplay = $negoSalJson['data']['salary_display'] ?? '';
$tempJob2Id = $negoSalJson['data']['id'] ?? 0;

assertTest("4.5 Định dạng mức lương: Lương khởi điểm 'Từ X triệu VNĐ' & Lương thỏa thuận 'Thỏa thuận' (FR-04.4)",
    str_starts_with($fromSalDisplay, 'Từ ') && $negoSalDisplay === 'Thỏa thuận');

// Dọn dẹp 2 tin phụ vừa tạo
Job::find($tempJob1Id)?->delete();
Job::find($tempJob2Id)?->delete();

// Test 4.6: Xem trang công ty công khai (/api/companies/{id}) kèm danh sách tin active (FR-04.7)
Auth::forgetGuards();
$reqPublicComp = Request::create('/api/companies/' . $empCompany->id, 'GET');
$reqPublicComp->headers->set('Accept', 'application/json');
$respPublicComp = $app->handle($reqPublicComp);
$pubCompJson = json_decode($respPublicComp->getContent(), true);
$compData = $pubCompJson['data'] ?? [];
assertTest("4.6 Xem trang công ty công khai trả 200 kèm danh sách tin đang mở (FR-04.7)",
    $respPublicComp->getStatusCode() === 200 && !empty($compData['name']) && isset($compData['jobs']) && count($compData['jobs']) >= 1);

// Test 4.7: Đóng tin tuyển dụng & Chặn ứng viên nộp hồ sơ mới (FR-04.6)
Auth::forgetGuards();
$reqClose = Request::create('/api/employer/jobs/' . $createdJobId . '/status', 'PATCH', ['status' => 'closed']);
$reqClose->headers->set('Accept', 'application/json');
$reqClose->headers->set('Authorization', 'Bearer ' . $empToken);
$respClose = $app->handle($reqClose);
$closeJson = json_decode($respClose->getContent(), true);

Auth::forgetGuards();
$reqApplyClosed = Request::create('/api/jobs/' . $createdJobId . '/apply', 'POST', ['cover_letter' => 'Thư ứng tuyển thử nghiệm']);
$reqApplyClosed->headers->set('Accept', 'application/json');
$reqApplyClosed->headers->set('Authorization', 'Bearer ' . $candToken);
$respApplyClosed = $app->handle($reqApplyClosed);
$applyClosedJson = json_decode($respApplyClosed->getContent(), true);

assertTest("4.7 Đóng tin tuyển dụng trả 200 & chặn ứng viên apply trả lỗi 422 (FR-04.6)",
    $respClose->getStatusCode() === 200 && ($closeJson['message'] ?? '') === 'Đã đóng tin tuyển dụng' &&
    $respApplyClosed->getStatusCode() === 422 && ($applyClosedJson['message'] ?? '') === 'Tin tuyển dụng này đã đóng hoặc đã hết hạn nộp hồ sơ');

// Test 4.8: Mở lại tin tuyển dụng bất cứ lúc nào (FR-04.6)
Auth::forgetGuards();
$reqReopen = Request::create('/api/employer/jobs/' . $createdJobId . '/status', 'PATCH', ['status' => 'active']);
$reqReopen->headers->set('Accept', 'application/json');
$reqReopen->headers->set('Authorization', 'Bearer ' . $empToken);
$respReopen = $app->handle($reqReopen);
$reopenJson = json_decode($respReopen->getContent(), true);
assertTest("4.8 Mở lại tin tuyển dụng thành công trả 200 'Đã mở lại tin tuyển dụng' (FR-04.6)",
    $respReopen->getStatusCode() === 200 && ($reopenJson['message'] ?? '') === 'Đã mở lại tin tuyển dụng');

// Test 4.9: Tìm kiếm theo từ khóa & Lọc lương
$reqSearch = Request::create('/api/jobs?keyword=Laravel&salary_range=10_20', 'GET');
$reqSearch->headers->set('Accept', 'application/json');
$respSearch = $app->handle($reqSearch);
assertTest("4.9 Tìm kiếm từ khóa và lọc khoảng mức lương (/api/jobs)", $respSearch->getStatusCode() === 200);

// Test 4.10: Ứng viên lưu việc làm
Auth::forgetGuards();
$reqSave = Request::create('/api/jobs/' . $createdJobId . '/save', 'POST');
$reqSave->headers->set('Accept', 'application/json');
$reqSave->headers->set('Authorization', 'Bearer ' . $candToken);
$respSave = $app->handle($reqSave);
assertTest("4.10 Ứng viên lưu việc làm yêu thích (/api/jobs/{id}/save)", $respSave->getStatusCode() === 200);

// -------------------------------------------------------------------------
// 5. MODULE ỨNG TUYỂN & TÍCH HỢP GEMINI AI (FR-06)
// -------------------------------------------------------------------------
echo "\n5. KIỂM THỬ ỨNG TUYỂN & TÍCH HỢP GEMINI AI (FR-06):\n";

// Test 5.1: Phân quyền nộp đơn: Khách trả 401 & Nhà tuyển dụng trả 403 (FR-06.1)
Auth::forgetGuards();
$reqGuestApply = Request::create('/api/jobs/' . $createdJobId . '/apply', 'POST', []);
$reqGuestApply->headers->set('Accept', 'application/json');
$respGuestApply = $app->handle($reqGuestApply);

Auth::forgetGuards();
$reqEmpApply = Request::create('/api/jobs/' . $createdJobId . '/apply', 'POST', []);
$reqEmpApply->headers->set('Accept', 'application/json');
$reqEmpApply->headers->set('Authorization', 'Bearer ' . $empToken);
$respEmpApply = $app->handle($reqEmpApply);
$empApplyJson = json_decode($respEmpApply->getContent(), true);

assertTest("5.1 Phân quyền nộp đơn: Khách trả 401 & NTD trả 403 'Chỉ tài khoản Ứng viên mới có quyền nộp đơn ứng tuyển' (FR-06.1)",
    $respGuestApply->getStatusCode() === 401 &&
    $respEmpApply->getStatusCode() === 403 &&
    ($empApplyJson['message'] ?? '') === 'Chỉ tài khoản Ứng viên mới có quyền nộp đơn ứng tuyển');

// Test 5.2: Chọn hình thức CV mới nhưng thiếu file CV -> 400 (FR-06.2)
Auth::forgetGuards();
$reqApplyNoFile = Request::create('/api/jobs/' . $createdJobId . '/apply', 'POST', [
    'cv_source' => 'new',
]);
$reqApplyNoFile->headers->set('Accept', 'application/json');
$reqApplyNoFile->headers->set('Authorization', 'Bearer ' . $candToken);
$respApplyNoFile = $app->handle($reqApplyNoFile);
$applyNoFileJson = json_decode($respApplyNoFile->getContent(), true);
assertTest("5.2 Nộp CV mới nhưng không gửi kèm file PDF trả 400 'Vui lòng tải lên file CV PDF cho vị trí này' (FR-06.2)",
    $respApplyNoFile->getStatusCode() === 400 && ($applyNoFileJson['message'] ?? '') === 'Vui lòng tải lên file CV PDF cho vị trí này');

// Test 5.3: Nộp hồ sơ bằng CV hồ sơ cá nhân thành công & AI Gemini chấm điểm (FR-06.2 & FR-05.3)
Auth::forgetGuards();
$reqApply = Request::create('/api/jobs/' . $createdJobId . '/apply', 'POST', [
    'cv_source' => 'profile',
    'cover_letter' => 'Em muốn ứng tuyển vào vị trí này.',
]);
$reqApply->headers->set('Accept', 'application/json');
$reqApply->headers->set('Authorization', 'Bearer ' . $candToken);
$respApply = $app->handle($reqApply);
$applyData = json_decode($respApply->getContent(), true);
$appId = $applyData['data']['id'] ?? 0;
$appStatus = $applyData['data']['status'] ?? '';
$matchScore = $applyData['data']['ai_analysis']['match_score'] ?? null;
assertTest("5.3 Nộp hồ sơ bằng CV profile thành công trả 201 Created & status='applied' (FR-06.2 & FR-06.5)",
    $respApply->getStatusCode() === 201 && $appId > 0 && $appStatus === 'applied');
assertTest("5.4 Tích hợp AI Gemini phân tích Match Score (0-100%)",
    is_numeric($matchScore) && $matchScore >= 0 && $matchScore <= 100);

// Test 5.5: Kiểm tra trạng thái nút Ứng tuyển & Chặn nộp trùng lần 2 -> 409 Conflict (FR-06.4)
Auth::forgetGuards();
$reqJobDetail = Request::create('/api/jobs/' . $createdJobId, 'GET');
$reqJobDetail->headers->set('Accept', 'application/json');
$reqJobDetail->headers->set('Authorization', 'Bearer ' . $candToken);
$respJobDetail = $app->handle($reqJobDetail);
$jobDetailJson = json_decode($respJobDetail->getContent(), true);
$jobDetailData = $jobDetailJson['data'] ?? [];

Auth::forgetGuards();
$reqDupApply = Request::create('/api/jobs/' . $createdJobId . '/apply', 'POST', []);
$reqDupApply->headers->set('Accept', 'application/json');
$reqDupApply->headers->set('Authorization', 'Bearer ' . $candToken);
$respDupApply = $app->handle($reqDupApply);
$dupApplyJson = json_decode($respDupApply->getContent(), true);

assertTest("5.5 Nút Ứng tuyển bị vô hiệu hóa & chặn nộp trùng lần 2 trả 409 'Bạn đã nộp hồ sơ cho công việc này rồi' (FR-06.4)",
    ($jobDetailData['is_applied'] ?? false) === true &&
    ($jobDetailData['apply_button_disabled'] ?? false) === true &&
    ($jobDetailData['apply_button_message'] ?? '') === 'Bạn đã nộp hồ sơ cho công việc này rồi' &&
    $respDupApply->getStatusCode() === 409 &&
    ($dupApplyJson['message'] ?? '') === 'Bạn đã nộp hồ sơ cho công việc này rồi');

// Test 5.6: NTD mở xem CV: tự động chuyển sang 'waiting' (FR-06.5)
Auth::forgetGuards();
$reqViewApp = Request::create('/api/employer/applications/' . $appId, 'GET');
$reqViewApp->headers->set('Accept', 'application/json');
$reqViewApp->headers->set('Authorization', 'Bearer ' . $empToken);
$respViewApp = $app->handle($reqViewApp);
$viewAppData = json_decode($respViewApp->getContent(), true);
assertTest("5.6 NTD mở xem CV: tự động chuyển sang trạng thái 'waiting' (FR-06.5)",
    $respViewApp->getStatusCode() === 200 && ($viewAppData['data']['status'] ?? '') === 'waiting');

// Test 5.7: Ứng viên rút hồ sơ sau khi NTD đã xem -> 400 (FR-06.5)
Auth::forgetGuards();
$reqWithdraw = Request::create('/api/candidate/applications/' . $appId . '/withdraw', 'DELETE');
$reqWithdraw->headers->set('Accept', 'application/json');
$reqWithdraw->headers->set('Authorization', 'Bearer ' . $candToken);
$respWithdraw = $app->handle($reqWithdraw);
assertTest("5.7 Chặn rút hồ sơ khi NTD đã xem xét trả lỗi 400 Bad Request", $respWithdraw->getStatusCode() === 400);

// Test 5.8: NTD cập nhật kết quả hồ sơ sang 'accepted' (Trúng tuyển) (FR-06.5)
Auth::forgetGuards();
$reqAccept = Request::create('/api/employer/applications/' . $appId . '/status', 'PATCH', [
    'status' => 'accepted',
]);
$reqAccept->headers->set('Accept', 'application/json');
$reqAccept->headers->set('Authorization', 'Bearer ' . $empToken);
$respAccept = $app->handle($reqAccept);
$acceptJson = json_decode($respAccept->getContent(), true);
assertTest("5.8 NTD cập nhật trạng thái hồ sơ sang 'accepted' (Trúng tuyển) trả 200 (FR-06.5)",
    $respAccept->getStatusCode() === 200 && ($acceptJson['data']['status'] ?? '') === 'accepted');

// Test 5.9: Ứng viên theo dõi lịch sử ứng tuyển theo thời gian thực (FR-06.7)
Auth::forgetGuards();
$reqHistory = Request::create('/api/candidate/applications?status=accepted', 'GET');
$reqHistory->headers->set('Accept', 'application/json');
$reqHistory->headers->set('Authorization', 'Bearer ' . $candToken);
$respHistory = $app->handle($reqHistory);
$historyJson = json_decode($respHistory->getContent(), true);
$historyItems = $historyJson['data'] ?? [];
assertTest("5.9 Ứng viên xem lịch sử ứng tuyển & lọc trạng thái theo thời gian thực trả 200 (FR-06.7)",
    $respHistory->getStatusCode() === 200 && count($historyItems) >= 1 && ($historyItems[0]['status'] ?? '') === 'accepted');


// -------------------------------------------------------------------------
// 6. MODULE NHẮN TIN REALTIME & THÔNG BÁO IN-APP (FR-08)
// -------------------------------------------------------------------------
echo "\n6. KIỂM THỬ REALTIME CHAT & THÔNG BÁO IN-APP (FR-08):\n";

// Test 6.1: Chặn tạo phòng chat khi ứng viên chưa nộp đơn vào tin (FR-08.1)
Auth::forgetGuards();
$dummyJob = Job::create([
    'company_id' => $employer->company->id,
    'title' => 'Vị trí kiểm thử chưa có đơn',
    'category_id' => 1,
    'city' => 'Hà Nội',
    'address' => 'Hà Nội',
    'job_level' => 'Junior',
    'quantity' => 1,
    'job_type' => 'full_time',
    'salary_min' => 10000000,
    'salary_max' => 15000000,
    'is_negotiable' => 0,
    'deadline' => now()->addDays(20)->toDateString(),
    'description' => 'Mô tả',
    'requirements' => 'Yêu cầu',
    'benefits' => '',
    'status' => 'active',
]);

$reqConvNoApp = Request::create('/api/conversations', 'POST', [
    'job_id' => $dummyJob->id,
    'partner_id' => $tempUser->id,
]);
$reqConvNoApp->headers->set('Accept', 'application/json');
$reqConvNoApp->headers->set('Authorization', 'Bearer ' . $empToken);
$respConvNoApp = $app->handle($reqConvNoApp);
$convNoAppJson = json_decode($respConvNoApp->getContent(), true);
assertTest("6.1 Chặn tạo phòng chat khi ứng viên chưa nộp đơn trả 400 (FR-08.1)",
    $respConvNoApp->getStatusCode() === 400 &&
    ($convNoAppJson['message'] ?? '') === 'Phòng trò chuyện chỉ được tạo khi ứng viên đã nộp hồ sơ vào tin tuyển dụng này');
$dummyJob->delete();

// Test 6.2: Khởi tạo phòng chat thành công giữa NTD và Ứng viên đã nộp đơn (FR-08.1)
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
assertTest("6.2 Khởi tạo phòng chat thành công giữa NTD & Ứng viên đã nộp đơn (FR-08.1)",
    $respConv->getStatusCode() === 200 && $convId > 0);

// Test 6.3: Chặn gửi tin nhắn rỗng toàn dấu cách hoặc enter -> 400 (FR-08.2)
Auth::forgetGuards();
$reqEmptyMsg = Request::create('/api/conversations/' . $convId . '/messages', 'POST', [
    'message' => "   \n\t   ",
]);
$reqEmptyMsg->headers->set('Accept', 'application/json');
$reqEmptyMsg->headers->set('Authorization', 'Bearer ' . $empToken);
$respEmptyMsg = $app->handle($reqEmptyMsg);
$emptyMsgJson = json_decode($respEmptyMsg->getContent(), true);
assertTest("6.3 Chặn gửi tin nhắn rỗng toàn dấu cách/enter trả 400 (FR-08.2)",
    $respEmptyMsg->getStatusCode() === 400 &&
    ($emptyMsgJson['message'] ?? '') === 'Nội dung tin nhắn không được để trống hoặc chỉ chứa khoảng trắng');

// Test 6.4: Chặn gửi tin nhắn vượt quá 1.000 ký tự -> 400 (FR-08.2)
Auth::forgetGuards();
$reqLongMsg = Request::create('/api/conversations/' . $convId . '/messages', 'POST', [
    'message' => str_repeat('A', 1001),
]);
$reqLongMsg->headers->set('Accept', 'application/json');
$reqLongMsg->headers->set('Authorization', 'Bearer ' . $empToken);
$respLongMsg = $app->handle($reqLongMsg);
$longMsgJson = json_decode($respLongMsg->getContent(), true);
assertTest("6.4 Chặn gửi tin nhắn vượt quá 1.000 ký tự trả 400 (FR-08.2)",
    $respLongMsg->getStatusCode() === 400 &&
    ($longMsgJson['message'] ?? '') === 'Nội dung tin nhắn không được vượt quá 1.000 ký tự');

// Test 6.5: Gửi tin nhắn văn bản hợp lệ (1-1.000 ký tự) trả 201 Created & Broadcast Reverb (FR-08.2 & FR-08.3)
Auth::forgetGuards();
$reqSend = Request::create('/api/conversations/' . $convId . '/messages', 'POST', [
    'message' => 'Chào bạn, chúng tôi muốn mời bạn phỏng vấn trực tiếp.',
]);
$reqSend->headers->set('Accept', 'application/json');
$reqSend->headers->set('Authorization', 'Bearer ' . $empToken);
$respSend = $app->handle($reqSend);
$sendData = json_decode($respSend->getContent(), true);
$msgData = $sendData['data'] ?? [];
assertTest("6.5 Gửi tin nhắn văn bản thành công kích hoạt Broadcast Event (201 Created) (FR-08.2 & FR-08.3)",
    $respSend->getStatusCode() === 201 &&
    ($msgData['sender_name'] ?? '') === $employer->name &&
    ($msgData['message'] ?? '') === 'Chào bạn, chúng tôi muốn mời bạn phỏng vấn trực tiếp.' &&
    ($msgData['status_display'] ?? '') === 'Đã gửi' &&
    preg_match('/^\d{2}:\d{2}$/', $msgData['time_display'] ?? ''));

// Test 6.6: Gửi tin nhắn kèm hình ảnh hợp lệ (FR-08.2 hỗ trợ gửi hình)
Auth::forgetGuards();
$fakeImage = UploadedFile::fake()->create('interview_invitation.png', 300, 'image/png');
$reqSendImage = Request::create('/api/conversations/' . $convId . '/messages', 'POST', [
    'message' => 'Sơ đồ địa chỉ văn phòng phỏng vấn',
], [], ['image' => $fakeImage]);
$reqSendImage->headers->set('Accept', 'application/json');
$reqSendImage->headers->set('Authorization', 'Bearer ' . $empToken);
$respSendImage = $app->handle($reqSendImage);
$sendImageJson = json_decode($respSendImage->getContent(), true);
$imgData = $sendImageJson['data'] ?? [];
assertTest("6.6 Hỗ trợ gửi tin nhắn đính kèm hình ảnh trả 201 kèm image_url (FR-08.2)",
    $respSendImage->getStatusCode() === 201 &&
    !empty($imgData['image_url']) &&
    ($imgData['message'] ?? '') === 'Sơ đồ địa chỉ văn phòng phỏng vấn');

// Test 6.7: Đối phương mở phòng chat tự động chuyển sang 'Đã xem' (is_read=1) & HH:mm (FR-08.4)
Auth::forgetGuards();
$reqGetMsgs = Request::create('/api/conversations/' . $convId . '/messages', 'GET');
$reqGetMsgs->headers->set('Accept', 'application/json');
$reqGetMsgs->headers->set('Authorization', 'Bearer ' . $candToken);
$respGetMsgs = $app->handle($reqGetMsgs);
$getMsgsJson = json_decode($respGetMsgs->getContent(), true);
$msgsList = $getMsgsJson['data'] ?? [];
$firstMsg = $msgsList[0] ?? [];
assertTest("6.7 Mở xem tin nhắn: tự động cập nhật trạng thái 'Đã xem' & thời gian HH:mm (FR-08.4)",
    $respGetMsgs->getStatusCode() === 200 &&
    count($msgsList) >= 2 &&
    ($firstMsg['is_read'] ?? false) === true &&
    ($firstMsg['status_display'] ?? '') === 'Đã xem' &&
    preg_match('/^\d{2}:\d{2}$/', $firstMsg['time_display'] ?? ''));

// Test 6.8: Bảo mật: Người ngoài không phải thành viên bị từ chối 403 (FR-08.5)
Auth::forgetGuards();
$outsider = User::where('role', 'candidate')->where('id', '!=', $tempUser->id)->first();
$outsiderToken = $outsider ? $outsider->createToken('test_outsider')->plainTextToken : '';

$reqOutsiderGet = Request::create('/api/conversations/' . $convId . '/messages', 'GET');
$reqOutsiderGet->headers->set('Accept', 'application/json');
$reqOutsiderGet->headers->set('Authorization', 'Bearer ' . $outsiderToken);
$respOutsiderGet = $app->handle($reqOutsiderGet);

$reqOutsiderPost = Request::create('/api/conversations/' . $convId . '/messages', 'POST', ['message' => 'Xem trộm']);
$reqOutsiderPost->headers->set('Accept', 'application/json');
$reqOutsiderPost->headers->set('Authorization', 'Bearer ' . $outsiderToken);
$respOutsiderPost = $app->handle($reqOutsiderPost);

assertTest("6.8 Cơ chế bảo mật: Người ngoài không thể xem hoặc gửi tin vào phòng chat trả 403 (FR-08.5)",
    $respOutsiderGet->getStatusCode() === 403 &&
    $respOutsiderPost->getStatusCode() === 403);

// Test 6.9: Duy trì liên lạc bình thường khi tin đóng kèm nhãn phụ 'Tin tuyển dụng đã đóng' (FR-08.6)
Auth::forgetGuards();
$createdJob = Job::find($createdJobId);
$createdJob->update(['status' => 'closed']);

// Ứng viên gửi phản hồi cho NTD khi tin đã đóng
$reqSendClosed = Request::create('/api/conversations/' . $convId . '/messages', 'POST', [
    'message' => 'Dạ em cảm ơn quý công ty, em sẽ đến đúng giờ phỏng vấn ạ.',
]);
$reqSendClosed->headers->set('Accept', 'application/json');
$reqSendClosed->headers->set('Authorization', 'Bearer ' . $candToken);
$respSendClosed = $app->handle($reqSendClosed);

// NTD mở xem danh sách phòng chat kiểm tra nhãn phụ
Auth::forgetGuards();
$reqConvList = Request::create('/api/conversations', 'GET');
$reqConvList->headers->set('Accept', 'application/json');
$reqConvList->headers->set('Authorization', 'Bearer ' . $empToken);
$respConvList = $app->handle($reqConvList);
$convListJson = json_decode($respConvList->getContent(), true);
$convItem = collect($convListJson['data'] ?? [])->firstWhere('id', $convId);

assertTest("6.9 Duy trì liên lạc khi tin đóng trả 201 & kèm nhãn 'Tin tuyển dụng đã đóng' (FR-08.6)",
    $respSendClosed->getStatusCode() === 201 &&
    ($convItem['job_status'] ?? '') === 'closed' &&
    ($convItem['job_notice'] ?? '') === 'Tin tuyển dụng đã đóng');

// Mở lại tin để các module sau hoạt động bình thường
$createdJob->update(['status' => 'active']);

// -------------------------------------------------------------------------
// 7. MODULE HỆ THỐNG THÔNG BÁO TRÊN WEB (FR-10)
// -------------------------------------------------------------------------
echo "\n7. KIỂM THỬ HỆ THỐNG THÔNG BÁO TRÊN WEB (FR-10):\n";

// Test 7.1: Thông báo cho Ứng viên khi NTD thay đổi trạng thái hồ sơ (FR-10.1)
Auth::forgetGuards();
$candNotifies = Notification::where('user_id', $tempUser->id)
    ->where('type', 'app_status_changed')
    ->latest()
    ->first();
assertTest("7.1 Tự động gửi thông báo cho Ứng viên khi NTD đổi trạng thái hồ sơ Trúng tuyển/Từ chối (FR-10.1)",
    $candNotifies !== null &&
    str_contains($candNotifies->title, 'trúng tuyển') &&
    $candNotifies->redirect_url === '/candidate/applications');

// Test 7.2: Thông báo cho Ứng viên khi NTD gửi tin nhắn mới trong phòng chat (FR-10.1)
$candMsgNotify = Notification::where('user_id', $tempUser->id)
    ->where('type', 'new_message')
    ->latest()
    ->first();
assertTest("7.2 Tự động gửi thông báo cho Ứng viên khi NTD gửi tin nhắn mới trong phòng chat (FR-10.1)",
    $candMsgNotify !== null &&
    str_contains($candMsgNotify->title, 'Tin nhắn mới từ') &&
    str_starts_with($candMsgNotify->redirect_url, '/messages/'));

// Test 7.3: Thông báo cho Nhà tuyển dụng khi có ứng viên mới nộp hồ sơ (FR-10.2)
Auth::forgetGuards();
$empApplyNotify = Notification::where('user_id', $employer->id)
    ->where('type', 'new_application')
    ->latest()
    ->first();
assertTest("7.3 Tự động gửi thông báo cho Nhà tuyển dụng khi có ứng viên mới nộp hồ sơ (FR-10.2)",
    $empApplyNotify !== null &&
    $empApplyNotify->title === 'Ứng viên mới nộp hồ sơ' &&
    str_contains($empApplyNotify->redirect_url, '/employer/jobs/'));

// Test 7.4: Thông báo cho Nhà tuyển dụng khi Ứng viên gửi tin nhắn mới (FR-10.2)
$empMsgNotify = Notification::where('user_id', $employer->id)
    ->where('type', 'new_message')
    ->latest()
    ->first();
assertTest("7.4 Tự động gửi thông báo cho Nhà tuyển dụng khi Ứng viên gửi tin nhắn mới (FR-10.2)",
    $empMsgNotify !== null &&
    str_contains($empMsgNotify->title, 'Tin nhắn mới từ') &&
    str_starts_with($empMsgNotify->redirect_url, '/messages/'));

// Test 7.5: Trải nghiệm thông báo: Unread badge, thời gian tương đối (diffForHumans) & màu nền phân biệt (FR-10.3)
Auth::forgetGuards();
$reqNotify = Request::create('/api/notifications', 'GET');
$reqNotify->headers->set('Accept', 'application/json');
$reqNotify->headers->set('Authorization', 'Bearer ' . $candToken);
$respNotify = $app->handle($reqNotify);
$notifyData = json_decode($respNotify->getContent(), true);
$unreadBadge = $notifyData['unread_count'] ?? 0;
$notifyItems = $notifyData['data'] ?? [];
$firstNotify = $notifyItems[0] ?? [];

assertTest("7.5 Trải nghiệm thông báo: Unread badge, thời gian tương đối & màu nền background (FR-10.3)",
    $respNotify->getStatusCode() === 200 &&
    $unreadBadge >= 1 &&
    !empty($firstNotify['title']) &&
    !empty($firstNotify['content']) &&
    !empty($firstNotify['time_ago']) &&
    $firstNotify['background_color'] === 'blue' &&
    $firstNotify['is_read'] === false &&
    !empty($firstNotify['redirect_url']));

// Test 7.6: Đánh dấu đã đọc từng thông báo & chuyển màu background trắng (FR-10.3)
Auth::forgetGuards();
$testNotifyId = $firstNotify['id'] ?? 0;
$reqMarkOne = Request::create('/api/notifications/' . $testNotifyId . '/read', 'PATCH');
$reqMarkOne->headers->set('Accept', 'application/json');
$reqMarkOne->headers->set('Authorization', 'Bearer ' . $candToken);
$respMarkOne = $app->handle($reqMarkOne);
$markOneJson = json_decode($respMarkOne->getContent(), true);

assertTest("7.6 Đánh dấu đã đọc từng thông báo trả 200 & cập nhật is_read=true (FR-10.3)",
    $respMarkOne->getStatusCode() === 200 &&
    ($markOneJson['data']['is_read'] ?? false) === true);

// Test 7.7: Đánh dấu tất cả thông báo là đã đọc (FR-10.3)
Auth::forgetGuards();
$reqMarkAll = Request::create('/api/notifications/read-all', 'PATCH');
$reqMarkAll->headers->set('Accept', 'application/json');
$reqMarkAll->headers->set('Authorization', 'Bearer ' . $candToken);
$respMarkAll = $app->handle($reqMarkAll);
$markAllJson = json_decode($respMarkAll->getContent(), true);

assertTest("7.7 Đánh dấu tất cả là đã đọc trả 200 & unread_count=0 (FR-10.3)",
    $respMarkAll->getStatusCode() === 200 &&
    ($markAllJson['unread_count'] ?? -1) === 0);

// Test 7.8: Lọc danh sách thông báo theo trạng thái read/unread (FR-10.3)
Auth::forgetGuards();
$reqFilterUnread = Request::create('/api/notifications?status=unread', 'GET');
$reqFilterUnread->headers->set('Accept', 'application/json');
$reqFilterUnread->headers->set('Authorization', 'Bearer ' . $candToken);
$respFilterUnread = $app->handle($reqFilterUnread);
$unreadJson = json_decode($respFilterUnread->getContent(), true);

$reqFilterRead = Request::create('/api/notifications?status=read', 'GET');
$reqFilterRead->headers->set('Accept', 'application/json');
$reqFilterRead->headers->set('Authorization', 'Bearer ' . $candToken);
$respFilterRead = $app->handle($reqFilterRead);
$readJson = json_decode($respFilterRead->getContent(), true);

assertTest("7.8 Lọc thông báo theo trạng thái ?status=unread và ?status=read (FR-10.3)",
    count($unreadJson['data'] ?? []) === 0 &&
    count($readJson['data'] ?? []) >= 1 &&
    ($readJson['data'][0]['background_color'] ?? '') === 'white');

// -------------------------------------------------------------------------
// 8. MODULE QUẢN TRỊ VIÊN ADMIN DASHBOARD
// -------------------------------------------------------------------------
echo "\n8. KIỂM THỬ QUẢN TRỊ ADMIN (STATS & KHÓA USER):\n";
Auth::forgetGuards();
$admin = User::where('role', 'admin')->first();
$adminToken = $admin->createToken('test_admin_runner')->plainTextToken;

// Test 8.1: Thống kê Dashboard
$reqStats = Request::create('/api/admin/stats', 'GET');
$reqStats->headers->set('Accept', 'application/json');
$reqStats->headers->set('Authorization', 'Bearer ' . $adminToken);
$respStats = $app->handle($reqStats);
$stats = json_decode($respStats->getContent(), true);
assertTest("8.1 Lấy số liệu thống kê Dashboard (/api/admin/stats)", $respStats->getStatusCode() === 200 && isset($stats['data']['total_candidates']));

// Test 8.2: Khóa tài khoản
Auth::forgetGuards();
$reqLock = Request::create('/api/admin/users/' . $tempUser->id . '/status', 'PATCH', ['status' => 'locked']);
$reqLock->headers->set('Accept', 'application/json');
$reqLock->headers->set('Authorization', 'Bearer ' . $adminToken);
$respLock = $app->handle($reqLock);
assertTest("8.2 Khóa tài khoản người dùng & thu hồi token (/api/admin/users/{id}/status)", $respLock->getStatusCode() === 200);

// Test 8.3: User bị khóa đăng nhập -> 403
Auth::forgetGuards();
$reqLockedLog = Request::create('/api/login', 'POST', ['email' => 'temp_test_candidate@timviec.vn', 'password' => 'TestPass123@'], [], [], ['REMOTE_ADDR' => $testIp()]);
$reqLockedLog->headers->set('Accept', 'application/json');
$respLockedLog = $app->handle($reqLockedLog);
assertTest("8.3 Đăng nhập tài khoản bị khóa trả 403 'Tài khoản của bạn đã bị khóa bởi quản trị viên'", $respLockedLog->getStatusCode() === 403, $respLockedLog->getStatusCode() . ' ' . $respLockedLog->getContent());

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
    echo "    >>> TẤT CẢ {$passed} BÀI TEST HOẠT ĐỘNG HOÀN HẢO 100%! <<<\n";
} else {
    echo "    >>> CÓ {$failed} BÀI TEST CHƯA ĐẠT. XEM CHI TIẾT PHÍA TRÊN. <<<\n";
}
echo "=======================================================\n\n";
