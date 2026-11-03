<?php

namespace App\Jobs;

use App\Exceptions\AiAnalysisException;
use App\Models\Application;
use App\Services\AiAssessmentScheduler;
use App\Services\AiCvEligibility;
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

    public int $tries = 3;
    public int $timeout = 60;
    public bool $failOnTimeout = true;

    public function backoff(): array
    {
        return [30, 120];
    }

    public function __construct(public int $applicationId, public ?string $requestId = null)
    {
        $this->onConnection('database')->onQueue('ai')->afterCommit();
    }

    public function handle(GeminiService $service): void
    {
        $lock = AiAssessmentScheduler::lock($this->applicationId);
        if (! $lock->get()) {
            if ($this->job) {
                $this->release(15);
            }
            return;
        }

        try {
            $application = Application::with(['job.skills', 'aiAnalysis'])->find($this->applicationId);
            if (! $application || $application->ai_request_id !== $this->requestId) {
                return;
            }
            if ($application->aiAnalysis) {
                $application->update(['ai_analysis_status' => 'completed', 'ai_analysis_error' => null]);
                return;
            }
            if (! config('ai.enabled') || $application->isWithdrawn() || AiCvEligibility::isDemo($application->cv_path)) {
                $application->update(['ai_analysis_status' => 'deferred', 'ai_analysis_error' => null]);
                return;
            }

            $application->update(['ai_analysis_status' => 'processing', 'ai_analysis_error' => null]);
            try {
                $service->analyze($application);
                $application->update(['ai_analysis_status' => 'completed', 'ai_analysis_error' => null]);
            } catch (\Throwable $exception) {
                if ($exception instanceof AiAnalysisException && $exception->getMessage() === AiAnalysisException::DEMO_CV) {
                    $application->update(['ai_analysis_status' => 'deferred', 'ai_analysis_error' => null]);
                    return;
                }
                $safe = $exception instanceof AiAnalysisException
                    ? $exception : new AiAnalysisException('Không thể phân tích CV lúc này. Vui lòng thử lại sau.', false);
                $retry = $safe->retryable && $this->job && $this->attempts() < $this->tries;
                $application->update([
                    'ai_analysis_status' => $retry ? 'pending' : 'failed',
                    'ai_analysis_error' => $retry ? null : $this->displayError($safe),
                ]);
                Log::warning('Application CV analysis attempt failed', [
                    'application_id' => $application->id, 'retrying' => (bool) $retry,
                    'attempt' => $this->attempts(), 'reason' => $safe->getMessage(),
                ]);
                if ($this->job && ! $retry) {
                    $this->fail($safe);
                    return;
                }
                throw $safe;
            }
        } finally {
            $lock->release();
        }
    }

    public function failed(?\Throwable $exception): void
    {
        Application::whereKey($this->applicationId)
            ->where('ai_request_id', $this->requestId)
            ->whereDoesntHave('aiAnalysis')
            ->whereIn('ai_analysis_status', ['pending', 'processing'])
            ->update([
                'ai_analysis_status' => 'failed',
                'ai_analysis_error' => 'Phân tích chưa hoàn tất. Vui lòng kiểm tra dịch vụ AI và thử lại.',
            ]);
    }

    private function displayError(AiAnalysisException $exception): string
    {
        return match ($exception->getMessage()) {
            AiAnalysisException::UNREADABLE_CV => 'Không đọc được nội dung CV. Vui lòng dùng PDF có văn bản thay vì ảnh scan.',
            AiAnalysisException::MISSING_CV => 'Không tìm thấy file CV của hồ sơ ứng tuyển.',
            AiAnalysisException::OVERSIZED_CV => 'File CV vượt quá giới hạn 5 MB.',
            AiAnalysisException::CONFIGURATION, AiAnalysisException::PROVIDER_REJECTED => 'Dịch vụ AI chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên.',
            AiAnalysisException::INVALID_ASSESSMENT => 'AI chưa trả về đánh giá hợp lệ. Bạn có thể thử lại.',
            default => 'Dịch vụ AI đang bận hoặc tạm thời không khả dụng. Vui lòng thử lại sau.',
        };
    }
}
