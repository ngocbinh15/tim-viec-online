<?php

namespace App\Jobs;

use App\Models\Application;
use App\Services\GeminiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AnalyzeApplicationCv implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 60;

    public function __construct(public int $applicationId)
    {
        $this->afterCommit();
    }

    public function handle(GeminiService $service): void
    {
        $application = Application::with(['job.skills', 'candidateProfile.skills'])->find($this->applicationId);
        if (!$application) {
            return;
        }
        if ($application->aiAnalysis) {
            $application->update(['ai_analysis_status' => 'completed', 'ai_analysis_error' => null]);
            return;
        }

        try {
            $service->analyze($application);
            $application->update(['ai_analysis_status' => 'completed']);
        } catch (\Throwable $exception) {
            $scanError = 'File CV dạng ảnh scan không thể đọc nội dung, vui lòng tải CV dạng văn bản chuẩn';
            $safeError = str_contains($exception->getMessage(), 'dạng ảnh scan')
                ? $scanError
                : 'Không thể phân tích CV lúc này. Vui lòng thử lại sau.';
            $application->update(['ai_analysis_status' => 'failed', 'ai_analysis_error' => $safeError]);
            Log::error('Application CV analysis failed', [
                'application_id' => $application->id,
                'exception' => $exception->getMessage(),
            ]);
            throw $exception;
        }
    }
}
