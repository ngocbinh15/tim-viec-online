<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApplyJobRequest;
use App\Http\Resources\ApplicationResource;
use App\Services\AiAssessmentScheduler;
use App\Models\Application;
use App\Models\Job;
use App\Models\Notification;
use App\Services\ApplicationCvStorage;
use App\Services\NotificationEmailService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ApplicationController extends Controller
{
    /**
     * Ứng viên nộp hồ sơ vào tin tuyển dụng (FR-06.1 - FR-06.4 & FR-07)
     */
    public function apply(ApplyJobRequest $request, $jobId): JsonResponse
    {
        $job = Job::with('company.user')->find($jobId);

        if (! $job) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc không tồn tại hoặc đã ngừng tuyển dụng',
            ], 404);
        }

        // Kiểm tra tin tuyển dụng đã đóng hoặc hết hạn (Phụ lục B SRS)
        if ($job->status !== 'active' || ($job->deadline && $job->deadline->toDateString() < now()->toDateString())) {
            return response()->json([
                'success' => false,
                'message' => 'Tin tuyển dụng này đã đóng hoặc đã hết hạn nộp hồ sơ',
            ], 422);
        }

        $user = $request->user();
        $candidateProfile = $user->candidateProfile;

        if (! $candidateProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng hoàn thiện hồ sơ cá nhân trước khi nộp đơn',
            ], 400);
        }

        // FR-06.4: Kiểm tra ứng viên đã nộp đơn cho công việc này chưa
        $existingApp = Application::where('job_id', $job->id)
            ->where('candidate_id', $candidateProfile->id)
            ->first();

        if ($existingApp) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đã nộp hồ sơ cho công việc này rồi',
            ], 409);
        }

        // FR-06.2: Xác định hình thức nộp CV (sẵn có trong hồ sơ hoặc tải lên file mới)
        $cvSource = $request->input('cv_source');
        $cvPath = null;
        $uploadedCv = false;

        if ($cvSource === 'builder') {
            $cvPath = app(\App\Services\Resumes\ResumeApplicationCvResolver::class)->snapshot($user, $request->integer('resume_export_id'));
            $uploadedCv = true;
        } elseif ($cvSource === 'new' || $request->hasFile('cv_file')) {
            if (! $request->hasFile('cv_file')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng tải lên file CV PDF cho vị trí này',
                ], 400);
            }
            $cvPath = $request->file('cv_file')->store('application_cvs', 'private');
            $uploadedCv = true;
        } else {
            // Sử dụng file CV sẵn có trong hồ sơ cá nhân
            $profileCvPath = $candidateProfile->cv_file_path;
            if (! $profileCvPath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hồ sơ chưa có CV mặc định. Vui lòng tải lên file CV để ứng tuyển.',
                ], 400);
            }
            try {
                $cvPath = app(ApplicationCvStorage::class)->snapshot($profileCvPath);
                $uploadedCv = true;
            } catch (\Throwable $exception) {
                Log::warning('Application CV snapshot could not be created', ['user_id' => $user->id]);

                return response()->json(['success' => false, 'message' => 'Không thể đọc CV mặc định. Vui lòng tải lại CV hoặc thử lại sau.'], 422);
            }
        }

        try {
            $application = DB::transaction(function () use ($jobId, $candidateProfile, $cvPath, $request) {
                // Prevent a concurrent close/expiry from accepting an application after the job stops accepting.
                $currentJob = Job::whereKey($jobId)->sharedLock()->first();
                if (! $currentJob
                    || $currentJob->status !== 'active'
                    || ($currentJob->deadline && $currentJob->deadline->toDateString() < now()->toDateString())) {
                    return null;
                }

                $application = Application::create([
                    'job_id' => $currentJob->id,
                    'candidate_id' => $candidateProfile->id,
                    'cv_path' => $cvPath,
                    'cover_letter' => $request->cover_letter,
                    'status' => 'applied',
                    'ai_analysis_status' => 'deferred',
                ]);
                $currentJob->touch();

                return $application;
            });
            if (! $application) {
                if ($uploadedCv && $cvPath) {
                    Storage::disk('private')->delete($cvPath);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Tin tuyển dụng này đã đóng hoặc đã hết hạn nộp hồ sơ',
                ], 422);
            }
        } catch (UniqueConstraintViolationException $exception) {
            if ($uploadedCv) {
                Storage::disk('private')->delete($cvPath);
            }

            return response()->json(['success' => false, 'message' => 'Bạn đã nộp hồ sơ cho công việc này rồi'], 409);
        } catch (\Throwable $exception) {
            if ($uploadedCv && $cvPath) {
                Storage::disk('private')->delete($cvPath);
            }
            throw $exception;
        }

        // Queue assessment immediately after the application commits. Notification
        // delivery must not delay automatic analysis or require an employer action.
        try {
            if (config('ai.enabled')) {
                app(AiAssessmentScheduler::class)->schedule($application);
            }
        } catch (\Throwable $exception) {
            $application->update([
                'ai_analysis_status' => 'failed',
                'ai_analysis_error' => 'Không thể đưa CV vào hàng đợi phân tích. Vui lòng thử lại sau.',
            ]);
            Log::error('Application CV analysis could not be queued', [
                'application_id' => $application->id,
            ]);
        }

        // FR-10.2: Tự động gửi thông báo cho Nhà tuyển dụng
        if ($job->company && $job->company->user) {
            try {
                Notification::create([
                    'user_id' => $job->company->user->id,
                    'title' => 'Ứng viên mới nộp hồ sơ',
                    'content' => "Ứng viên {$user->name} vừa nộp hồ sơ vào vị trí '{$job->title}'.",
                    'type' => 'new_application',
                    'data' => [
                        'job_id' => $job->id,
                        'application_id' => $application->id,
                    ],
                ]);
            } catch (\Throwable $exception) {
                Log::error('Application notification could not be created', [
                    'application_id' => $application->id,
                    'exception' => $exception->getMessage(),
                ]);
            }
        }

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

        if (! $application) {
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

        $changed = Application::whereKey($application->id)
            ->where('status', 'applied')->whereNull('reviewed_at')
            ->update(['status' => 'withdrawn']);
        if (! $changed) {
            return response()->json(['success' => false, 'message' => 'Nhà tuyển dụng đã xem hồ sơ của bạn, không thể rút đơn'], 409);
        }

        return response()->json([
            'success' => true,
            'message' => 'Rút hồ sơ ứng tuyển thành công',
        ], 200);
    }

    /** Stream an application CV only to its candidate, the owning employer, or an admin. */
    public function downloadCv(Request $request, $applicationId)
    {
        $application = Application::with('job.company')->find($applicationId);
        if (! $application) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy hồ sơ ứng tuyển'], 404);
        }

        $user = $request->user();
        $isCandidate = $user->isCandidate()
            && (int) $application->candidateProfile?->user_id === (int) $user->id;
        $isEmployer = $user->isEmployer()
            && (int) $application->job?->company?->user_id === (int) $user->id;
        if (! $isCandidate && ! $isEmployer && ! $user->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xem CV này'], 403);
        }

        $path = $application->cv_path;
        $disk = Storage::disk('private')->exists($path) ? 'private' : 'public';
        if (! Storage::disk($disk)->exists($path)) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy file CV'], 404);
        }

        if ($isEmployer) {
            Application::whereKey($application->id)->where('status', 'applied')
                ->update(['status' => 'waiting', 'reviewed_at' => now()]);
        }

        return response()->file(Storage::disk($disk)->path($path), [
            'Content-Type' => 'application/pdf',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * [Candidate] Lịch sử nộp hồ sơ ứng tuyển (FR-06.7)
     */
    public function candidateHistory(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', 'in:applied,waiting,accepted,rejected,withdrawn'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $candidateProfile = $request->user()->candidateProfile;

        $query = Application::where('candidate_id', $candidateProfile->id)
            ->with(['job.company', 'aiAnalysis'])
            ->orderBy('created_at', 'desc');

        // Hỗ trợ lọc theo trạng thái hồ sơ trong lịch sử
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = (int) $request->input('per_page', 10);
        $perPage = ($perPage > 0 && $perPage <= 100) ? $perPage : 10;

        $applications = $query->paginate($perPage);

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
    public function employerApplications(Request $request): JsonResponse
    {
        $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $applications = Application::whereHas('job.company', function ($query) use ($request) {
            $query->where('user_id', $request->user()->id);
        })->with(['job.company', 'candidateProfile.user', 'candidateProfile.skills', 'aiAnalysis'])
            ->orderByDesc('id')->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => ApplicationResource::collection($applications),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
        ]);
    }

    public function jobApplicants(Request $request, $jobId): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', 'in:applied,waiting,accepted,rejected'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $company = $request->user()->company;
        $job = Job::where('company_id', $company->id)->find($jobId);

        if (! $job) {
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
    public function showEmployerApplication(Request $request, $id): JsonResponse
    {
        $company = $request->user()->company;

        $application = Application::whereHas('job', function ($q) use ($company) {
            $q->where('company_id', $company->id);
        })->with(['job', 'candidateProfile.skills', 'candidateProfile.user', 'aiAnalysis'])->find($id);

        if (! $application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển',
            ], 404);
        }

        // FR-06.5: Tự động chuyển sang 'waiting' khi xem CV lần đầu tiên
        if ($application->status === 'applied') {
            Application::whereKey($application->id)->where('status', 'applied')->update([
                'status' => 'waiting',
                'reviewed_at' => now(),
            ]);
            $application->refresh();
        }

        // Reading an applicant must never initiate a paid provider request.
        $application->load('aiAnalysis');

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

        if (! $application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển',
            ], 404);
        }

        $request->validate([
            'status' => ['required', 'in:waiting,accepted,rejected'],
        ]);

        $previousStatus = $application->status;
        if ($previousStatus === 'withdrawn') {
            return response()->json(['success' => false, 'message' => 'Hồ sơ đã được ứng viên rút, không thể xét duyệt.'], 409);
        }
        if ($previousStatus !== $request->status) {
            $changed = Application::whereKey($application->id)->where('status', $previousStatus)
                ->update(['status' => $request->status, 'reviewed_at' => $application->reviewed_at ?? now()]);
            if (! $changed) {
                return response()->json(['success' => false, 'message' => 'Trạng thái hồ sơ đã thay đổi. Vui lòng tải lại trước khi xét duyệt.'], 409);
            }
            $application->refresh();
        }

        // FR-10.1: Tự động tạo và gửi thông báo cho Ứng viên khi NTD thay đổi trạng thái hồ sơ
        $candidateUser = $application->candidateProfile?->user;
        if ($candidateUser && $previousStatus !== $request->status) {
            $notificationTitle = match ($request->status) {
                'accepted' => 'Chúc mừng! Bạn đã trúng tuyển',
                'rejected' => 'Thông báo kết quả ứng tuyển',
                default => 'Hồ sơ đang được xem xét',
            };

            $notificationContent = match ($request->status) {
                'accepted' => "Chúc mừng bạn! Hồ sơ ứng tuyển cho vị trí '{$application->job->title}' đã được Nhà tuyển dụng đồng ý tuyển dụng (Trúng tuyển).",
                'rejected' => "Cảm ơn bạn đã quan tâm. Hồ sơ ứng tuyển cho vị trí '{$application->job->title}' chưa phù hợp với yêu cầu đợt này (Từ chối).",
                default => "Nhà tuyển dụng đang xem xét hồ sơ ứng tuyển của bạn cho vị trí '{$application->job->title}'.",
            };

            try {
                Notification::create([
                    'user_id' => $candidateUser->id,
                    'title' => $notificationTitle,
                    'content' => $notificationContent,
                    'type' => 'app_status_changed',
                    'data' => [
                        'job_id' => $application->job_id,
                        'application_id' => $application->id,
                        'status' => $request->status,
                    ],
                ]);
            } catch (\Throwable $exception) {
                Log::error('Application status notification could not be created', [
                    'application_id' => $application->id,
                    'exception' => $exception->getMessage(),
                ]);
            }
        }

        if ($previousStatus !== $request->status) {
            try {
                app(NotificationEmailService::class)->application($application);
            } catch (\Throwable) {
                Log::error('Application email notification could not be queued', ['application_id' => $application->id]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trạng thái hồ sơ thành công',
            'data' => new ApplicationResource($application),
        ], 200);
    }
}
