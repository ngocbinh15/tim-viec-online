<?php

namespace App\Services;

use App\Jobs\AnalyzeApplicationCv;
use App\Models\Application;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/** Scheduling and execution share a cross-process lock; reads never enqueue. */
class AiAssessmentScheduler
{
    public static function lock(int $id): \Illuminate\Contracts\Cache\Lock
    {
        return Cache::store('database')->lock('ai-application:'.$id, 180);
    }

    public static function isActive(Application $application): bool
    {
        return in_array($application->ai_analysis_status, ['pending', 'processing'], true)
            && $application->ai_requested_at?->greaterThan(now()->subMinutes(5));
    }

    public function schedule(Application $application): Application
    {
        $lock = self::lock($application->id);
        if (! $lock->get()) {
            return $application->refresh()->load('aiAnalysis');
        }

        try {
            $application->refresh()->load(['aiAnalysis', 'job.skills']);
            if ($application->aiAnalysis) {
                return $application;
            }
            if (AiCvEligibility::isDemo($application->cv_path)) {
                $application->update(['ai_analysis_status' => 'deferred', 'ai_analysis_error' => null,
                    'ai_request_id' => null, 'ai_requested_at' => null]);
                return $application;
            }
            if (self::isActive($application)) {
                return $application;
            }
            $requestId = (string) Str::uuid();
            $job = $application->job;
            $snapshot = $application->ai_job_snapshot ?? [
                'title' => mb_substr((string) $job->title, 0, 300),
                'job_level' => $job->job_level,
                'description' => mb_substr(strip_tags((string) $job->description), 0, 8000),
                'requirements' => mb_substr(strip_tags((string) $job->requirements), 0, 8000),
                'skills' => $job->skills->take(50)->pluck('name')->map(fn ($name) => mb_substr($name, 0, 100))->all(),
            ];
            $application->update([
                'ai_analysis_status' => 'pending', 'ai_analysis_error' => null,
                'ai_request_id' => $requestId, 'ai_requested_at' => now(), 'ai_job_snapshot' => $snapshot,
            ]);
            try {
                AnalyzeApplicationCv::dispatch($application->id, $requestId);
            } catch (\Throwable) {
                $application->update([
                    'ai_analysis_status' => 'failed',
                    'ai_analysis_error' => 'Không thể đưa CV vào hàng đợi phân tích. Vui lòng thử lại sau.',
                ]);
                // Queue exceptions can contain connection secrets; never propagate them.
                throw new \RuntimeException('Không thể đưa CV vào hàng đợi phân tích.');
            }
            return $application;
        } finally {
            $lock->release();
        }
    }
}
