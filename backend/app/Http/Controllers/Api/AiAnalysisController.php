<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyzeApplicationRequest;
use App\Http\Resources\AiAnalysisResource;
use App\Models\Application;
use App\Services\AiAssessmentScheduler;
use App\Services\AiCvEligibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAnalysisController extends Controller
{
    public function analyzeAndStore(AnalyzeApplicationRequest $request, string $applicationId, AiAssessmentScheduler $scheduler): JsonResponse
    {
        $application = $this->ownedApplication($request, $applicationId);
        if ($application->aiAnalysis) {
            return $this->state($application);
        }
        abort_if(AiCvEligibility::isDemo($application->cv_path), 422, 'CV dữ liệu mẫu không được gửi sang dịch vụ AI.');
        abort_unless(config('ai.enabled'), 503, 'Phân tích AI chưa được bật.');
        abort_unless($application->cv_path, 422, 'Đơn ứng tuyển này chưa có file CV để phân tích.');
        abort_if($application->isWithdrawn(), 422, 'Hồ sơ đã rút không thể yêu cầu phân tích.');
        try {
            $application = $scheduler->schedule($application);
        } catch (\Throwable) {
            return response()->json(['success' => false, 'message' => 'Không thể đưa CV vào hàng đợi phân tích. Vui lòng thử lại sau.'], 503);
        }
        return $this->state($application, $application->aiAnalysis ? 200 : 202);
    }

    public function show(Request $request, string $applicationId): JsonResponse
    {
        return $this->state($this->ownedApplication($request, $applicationId));
    }

    private function ownedApplication(Request $request, string $id): Application
    {
        $application = Application::with(['job.company', 'aiAnalysis'])->findOrFail($id);
        abort_unless($request->user()->isAdmin()
            || ($request->user()->isEmployer() && $application->job?->company?->user_id === $request->user()->id), 403,
            'Bạn không có quyền xem hoặc phân tích hồ sơ này.');
        return $application;
    }

    private function state(Application $application, int $httpStatus = 200): JsonResponse
    {
        $status = $application->aiAnalysis ? 'completed' : ($application->ai_analysis_status ?? 'deferred');
        return response()->json([
            'success' => true, 'message' => 'Trạng thái phân tích CV.',
            'data' => [
                'status' => $status,
                'analysis' => $application->aiAnalysis ? new AiAnalysisResource($application->aiAnalysis) : null,
                'error' => $status === 'failed' ? $application->ai_analysis_error : null,
                'retryable' => (bool) config('ai.enabled') && ! $application->aiAnalysis && ! $application->isWithdrawn()
                    && ! AiCvEligibility::isDemo($application->cv_path)
                    && ! AiAssessmentScheduler::isActive($application),
            ],
        ], $httpStatus);
    }
}
