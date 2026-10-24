<?php

namespace App\Http\Controllers;

use App\Models\AiCvAnalysis;
use App\Models\Application;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\GeminiAiService;

class AiAnalysisController extends Controller
{
    public function analyzeAndStore(Request $request, $applicationId, GeminiAiService$geminiService): JsonResponse
    {
        $user =$request->user();

        // 1. Tìm đơn ứng tuyển kèm thông tin tin tuyển dụng và hồ sơ ứng viên
        $application = Application::with(['job.company', 'candidateProfile.user'])->find($applicationId);
        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển.'
            ], 404);
        }

        // 2. Kiểm tra quyền: Nhà tuyển dụng sở hữu tin, Admin hoặc Ứng viên nộp đơn mới được gọi phân tích
        $isOwnerCandidate =$user->role === 'candidate' && $application->candidateProfile->user_id ===$user->id;
        $isOwnerEmployer =$user->role === 'employer' && $application->job->company->user_id ===$user->id;
        $isAdmin =$user->role === 'admin';

        if (!$isOwnerCandidate && !$isOwnerEmployer && !$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền thực hiện phân tích AI cho đơn này.'
            ], 403);
        }

        // 3. Kiểm tra file CV có tồn tại không
        if (!$application->cv_path) {
            return response()->json([
                'success' => false,
                'message' => 'Đơn ứng tuyển này chưa có file CV để phân tích.'
            ], 400);
        }

        try {
            // 4. Gọi Gemini AI phân tích CV
            $jobDescription = $application->job->description;
            $jobRequirements = $application->job->requirements;

            $aiResult = $geminiService->analyzeCvWithJob(
                $application->cv_path,
                $jobDescription,
                $jobRequirements
            );

            // 5. Kiểm tra kết quả Gemini trước khi lưu
            if (
                !is_array($aiResult) ||
                !isset($aiResult['match_score']) ||
                !isset($aiResult['summary'])
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gemini AI không trả về kết quả phân tích hợp lệ.',
                ], 502);
            }

            // 6. Lưu kết quả phân tích thực tế
            $analysis = AiCvAnalysis::updateOrCreate(
                ['application_id' => $application->id],
                [
                    'match_score' => $aiResult['match_score'],
                    'summary' => $aiResult['summary'],
                    'matched_skills' => $aiResult['matched_skills'] ?? [],
                    'missing_skills' => $aiResult['missing_skills'] ?? [],
                    'strengths' => $aiResult['strengths'] ?? [],
                    'recommendations' => $aiResult['recommendations'] ?? [],
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'AI phân tích CV và lưu kết quả thành công!',
                'data' => $analysis
            ], 200,[], JSON_UNESCAPED_UNICODE);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Quá trình phân tích AI gặp sự cố.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function show(Request $request, $applicationId): JsonResponse
    {
        $user = $request->user();

        // Tìm đơn ứng tuyển
        $application = Application::with(['job.company', 'candidateProfile.user'])->find($applicationId);

        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển.'
            ], 404);
        }

        // Kiểm tra quyền: Chỉ Ứng viên nộp đơn hoặc Nhà tuyển dụng sở hữu tin tuyển dụng đó mới được xem
        $isOwnerCandidate = $user->role === 'candidate' && $application->candidateProfile->user_id === $user->id;
        $isOwnerEmployer = $user->role === 'employer' && $application->job->company->user_id === $user->id;
        $isAdmin = $user->role === 'admin';

        if (!$isOwnerCandidate && !$isOwnerEmployer && !$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem kết quả phân tích AI của đơn này.'
            ], 403);
        }

        $analysis = AiCvAnalysis::where('application_id', $applicationId)->first();

        if (!$analysis) {
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
                'job_title' => $application->job->title,
                'candidate_name' => $application->candidateProfile->user->name,
                'match_score' => $analysis->match_score,
                'summary' => $analysis->summary,
                'strengths' => $analysis->strengths,
                'matched_skills' => $analysis->matched_skills,
                'missing_skills' => $analysis->missing_skills,
                'recommendations' => $analysis->recommendations,
                'analyzed_at' => $analysis->created_at,
            ]
        ], 200);
    }
}
