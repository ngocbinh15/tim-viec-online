<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApplyJobRequest;
use App\Http\Resources\ApplicationResource;
use App\Models\Application;
use App\Models\Job;
use App\Models\Notification;
use App\Services\GeminiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    /**
     * Ứng viên nộp hồ sơ vào tin tuyển dụng (FR-06.1 - FR-06.4 & FR-07)
     */
    public function apply(ApplyJobRequest $request, $jobId, GeminiService $geminiService): JsonResponse
    {
        $job = Job::with('company.user')->find($jobId);

        if (!$job) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc không tồn tại hoặc đã ngừng tuyển dụng',
            ], 404);
        }

        // Kiểm tra tin tuyển dụng đã đóng hoặc hết hạn (Phụ lục B SRS)
        if ($job->status !== 'active' || ($job->deadline && $job->deadline->isPast())) {
            return response()->json([
                'success' => false,
                'message' => 'Tin tuyển dụng này đã đóng hoặc đã hết hạn nộp hồ sơ',
            ], 422);
        }

        $user = $request->user();
        $candidateProfile = $user->candidateProfile;

        if (!$candidateProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng hoàn thiện hồ sơ cá nhân trước khi nộp đơn',
            ], 400);
        }

        // FR-06.4: Kiểm tra ứng viên đã nộp đơn cho công việc này chưa
        $existingApp = Application::where('job_id', $job->id)
            ->where('candidate_id', $candidateProfile->id)
            ->first();

        if ($existingApp && $existingApp->status !== 'withdrawn') {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đã nộp hồ sơ cho công việc này rồi',
            ], 409);
        }

        // Xác định đường dẫn file CV nộp
        $cvPath = null;
        if ($request->hasFile('cv_file')) {
            $cvPath = $request->file('cv_file')->store('application_cvs', 'public');
        } else {
            $cvPath = $candidateProfile->cv_file_path;
            if (!$cvPath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hồ sơ chưa có CV mặc định. Vui lòng tải lên file CV để ứng tuyển.',
                ], 400);
            }
        }

        // Tạo hoặc kích hoạt lại đơn nếu trước đó đã rút đơn
        if ($existingApp && $existingApp->status === 'withdrawn') {
            $existingApp->update([
                'cv_path' => $cvPath,
                'cover_letter' => $request->cover_letter,
                'status' => 'applied',
                'reviewed_at' => null,
            ]);
            $application = $existingApp;
        } else {
            $application = Application::create([
                'job_id' => $job->id,
                'candidate_id' => $candidateProfile->id,
                'cv_path' => $cvPath,
                'cover_letter' => $request->cover_letter,
                'status' => 'applied',
            ]);
        }

        // FR-05.4: Cơ chế Bump tin tự động - Cập nhật updated_at của Job để đẩy lên đầu trang tìm kiếm
        $job->touch();

        // FR-10.2: Tự động gửi thông báo cho Nhà tuyển dụng
        if ($job->company && $job->company->user) {
            Notification::create([
                'user_id' => $job->company->user->id,
                'title' => 'Ứng viên mới nộp hồ sơ',
                'content' => "Ứng viên {$user->name} vừa nộp hồ sơ vào vị trí '{$job->title}'.",
                'type' => 'new_applicant',
                'data' => [
                    'job_id' => $job->id,
                    'application_id' => $application->id,
                ],
            ]);
        }

        // FR-07: Gọi Gemini AI phân tích CV và lưu điểm
        $geminiService->analyze($application);

        $application->load(['job.company', 'candidateProfile.skills', 'aiAnalysis']);

        return response()->json([
            'success' => true,
            'message' => 'Nộp hồ sơ ứng tuyển thành công',
            'data' => new ApplicationResource($application),
        ], 201);
    }

    /**
     * [Candidate] Rút hồ sơ ứng tuyển (FR-06.5)
     */
    public function withdraw(Request $request, $id): JsonResponse
    {
        $candidateProfile = $request->user()->candidateProfile;
        $application = Application::where('candidate_id', $candidateProfile->id)->find($id);

        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển',
            ], 404);
        }

        // Phụ lục B SRS: Nếu NTD đã xem hồ sơ (hoặc chuyển trạng thái), không thể rút đơn
        if ($application->status !== 'applied' || $application->reviewed_at !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Nhà tuyển dụng đã xem hồ sơ của bạn, không thể rút đơn',
            ], 400);
        }

        $application->update([
            'status' => 'withdrawn',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rút hồ sơ ứng tuyển thành công',
        ], 200);
    }

    /**
     * [Candidate] Lịch sử nộp hồ sơ ứng tuyển (FR-06.7)
     */
    public function candidateHistory(Request $request): JsonResponse
    {
        $candidateProfile = $request->user()->candidateProfile;

        $applications = Application::where('candidate_id', $candidateProfile->id)
            ->with(['job.company', 'aiAnalysis'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy lịch sử ứng tuyển thành công',
            'data' => ApplicationResource::collection($applications),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
        ], 200);
    }

    /**
     * [Employer] Danh sách ứng viên nộp cho một tin tuyển dụng
     */
    public function jobApplicants(Request $request, $jobId): JsonResponse
    {
        $company = $request->user()->company;
        $job = Job::where('company_id', $company->id)->find($jobId);

        if (!$job) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc không tồn tại hoặc bạn không có quyền truy cập',
            ], 404);
        }

        $query = Application::where('job_id', $job->id)
            ->where('status', '!=', 'withdrawn')
            ->with(['candidateProfile.skills', 'candidateProfile.user', 'aiAnalysis']);

        // Bộ lọc theo trạng thái nếu có
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $applications = $query->orderBy('created_at', 'desc')->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách ứng viên thành công',
            'data' => ApplicationResource::collection($applications),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
        ], 200);
    }

    /**
     * [Employer] Xem chi tiết hồ sơ ứng viên (Tự động chuyển sang 'waiting' khi xem lần đầu theo FR-06.5)
     */
    public function showEmployerApplication(Request $request, $id, GeminiService $geminiService): JsonResponse
    {
        $company = $request->user()->company;

        $application = Application::whereHas('job', function ($q) use ($company) {
            $q->where('company_id', $company->id);
        })->with(['job', 'candidateProfile.skills', 'candidateProfile.user', 'aiAnalysis'])->find($id);

        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển',
            ], 404);
        }

        // FR-06.5: Tự động chuyển sang 'waiting' khi xem CV lần đầu tiên
        if ($application->status === 'applied') {
            $application->update([
                'status' => 'waiting',
                'reviewed_at' => now(),
            ]);
        }

        // Đảm bảo AI analysis tồn tại
        if (!$application->aiAnalysis) {
            $geminiService->analyze($application);
            $application->load('aiAnalysis');
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy chi tiết hồ sơ thành công',
            'data' => new ApplicationResource($application),
        ], 200);
    }

    /**
     * [Employer] Cập nhật trạng thái duyệt hồ sơ (accepted, rejected)
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $company = $request->user()->company;

        $application = Application::whereHas('job', function ($q) use ($company) {
            $q->where('company_id', $company->id);
        })->with(['job', 'candidateProfile.user'])->find($id);

        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển',
            ], 404);
        }

        $request->validate([
            'status' => ['required', 'in:waiting,accepted,rejected'],
        ]);

        $application->update([
            'status' => $request->status,
        ]);

        // FR-10.1: Tự động gửi thông báo cho Ứng viên khi NTD đổi trạng thái
        $candidateUser = $application->candidateProfile?->user;
        if ($candidateUser) {
            $statusLabels = [
                'waiting' => 'đang được xem xét',
                'accepted' => 'đã được chấp nhận (Trúng tuyển)',
                'rejected' => 'chưa phù hợp (Từ chối)',
            ];
            $statusText = $statusLabels[$request->status] ?? $request->status;

            Notification::create([
                'user_id' => $candidateUser->id,
                'title' => 'Cập nhật trạng thái ứng tuyển',
                'content' => "Hồ sơ của bạn cho vị trí '{$application->job->title}' {$statusText}.",
                'type' => 'app_status_changed',
                'data' => [
                    'job_id' => $application->job_id,
                    'application_id' => $application->id,
                    'status' => $request->status,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trạng thái hồ sơ thành công',
            'data' => new ApplicationResource($application),
        ], 200);
    }
}
