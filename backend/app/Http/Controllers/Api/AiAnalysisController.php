<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\AnalyzeApplicationCv;
use App\Models\Application;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AiAnalysisController extends Controller
{
    /**
     * Kích hoạt AI phân tích CV ứng viên so với JD công việc (FR-07)
     */
    public function analyzeAndStore(Request $request, $applicationId): JsonResponse
    {
        $user = $request->user();

        // 1. Tìm đơn ứng tuyển kèm thông tin tin tuyển dụng và hồ sơ ứng viên
        $application = Application::with(['job.company', 'candidateProfile.user', 'aiAnalysis'])->find($applicationId);
        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển.'
            ], 404);
        }

        // 2. Phân quyền: Nhà tuyển dụng sở hữu tin, Admin hoặc chính ứng viên nộp đơn mới được phân tích
        $isOwnerCandidate = $user->role === 'candidate' && $application->candidateProfile && $application->candidateProfile->user_id === $user->id;
        $isOwnerEmployer = $user->role === 'employer' && $application->job && $application->job->company && $application->job->company->user_id === $user->id;
        $isAdmin = $user->role === 'admin';

        if (!$isOwnerCandidate && !$isOwnerEmployer && !$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền thực hiện phân tích AI cho đơn ứng tuyển này.'
            ], 403);
        }

        // 3. Kiểm tra file CV có tồn tại không
        if (!$application->cv_path) {
            return response()->json([
                'success' => false,
                'message' => 'Đơn ứng tuyển này chưa có file CV để phân tích.'
            ], 400);
        }

        if ($application->aiAnalysis) {
            return response()->json(
                ['success' => true, 'message' => 'Kết quả phân tích đã có sẵn', 'data' => $application->aiAnalysis],
                200,
                [],
                JSON_UNESCAPED_UNICODE
            );
        }

        if ($application->ai_analysis_status === 'pending') {
            return response()->json(['success' => true, 'message' => 'Phân tích CV đang được xử lý', 'data' => ['status' => 'pending']], 202);
        }

        $application->update(['ai_analysis_status' => 'pending', 'ai_analysis_error' => null]);
        try {
            AnalyzeApplicationCv::dispatch($application->id);
        } catch (\Throwable $exception) {
            $application->update([
                'ai_analysis_status' => 'failed',
                'ai_analysis_error' => 'Không thể đưa CV vào hàng đợi phân tích. Vui lòng thử lại sau.',
            ]);
            Log::error('Application CV analysis retry could not be queued', [
                'application_id' => $application->id,
                'exception' => $exception->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Không thể đưa CV vào hàng đợi phân tích',
                'data' => ['status' => 'failed'],
            ], 503);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã đưa CV vào hàng đợi phân tích',
            'data' => ['status' => 'pending'],
        ], 202);
    }

    /**
     * Xem kết quả phân tích AI đã lưu của một đơn ứng tuyển
     */
    public function show(Request $request, $applicationId): JsonResponse
    {
        $user = $request->user();

        // Tìm đơn ứng tuyển
        $application = Application::with(['job.company', 'candidateProfile.user', 'aiAnalysis'])->find($applicationId);

        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển.'
            ], 404);
        }

        // Kiểm tra quyền
        $isOwnerCandidate = $user->role === 'candidate' && $application->candidateProfile && $application->candidateProfile->user_id === $user->id;
        $isOwnerEmployer = $user->role === 'employer' && $application->job && $application->job->company && $application->job->company->user_id === $user->id;
        $isAdmin = $user->role === 'admin';

        if (!$isOwnerCandidate && !$isOwnerEmployer && !$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem kết quả phân tích AI của đơn này.'
            ], 403);
        }

        $analysis = $application->aiAnalysis;

        if (!$analysis) {
            if ($application->ai_analysis_status === 'pending') {
                return response()->json(['success' => true, 'message' => 'Phân tích CV đang được xử lý', 'data' => ['status' => 'pending']], 202);
            }
            if ($application->ai_analysis_status === 'failed') {
                return response()->json(['success' => false, 'message' => 'Không thể phân tích CV', 'data' => ['status' => 'failed', 'error' => $application->ai_analysis_error]], 422);
            }
            return response()->json([
                'success' => false,
                'message' => 'Hồ sơ này chưa được AI phân tích hoặc đang trong quá trình xử lý.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy kết quả phân tích AI thành công.',
            'data' => [
                'application_id' => $application->id,
                'job_title' => $application->job?->title,
                'candidate_name' => $application->candidateProfile?->user?->name,
                'match_score' => $analysis->match_score,
                'summary' => $analysis->summary,
                'strengths' => $analysis->strengths,
                'matched_skills' => $analysis->matched_skills,
                'missing_skills' => $analysis->missing_skills,
                'recommendations' => $analysis->recommendations,
                'analyzed_at' => $analysis->created_at,
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}
