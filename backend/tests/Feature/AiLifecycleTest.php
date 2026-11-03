<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeApplicationCv;
use App\Models\AiCvAnalysis;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AiLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private \Illuminate\Queue\QueueManager $realQueue;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'broadcasting.default' => 'log', 'ai.enabled' => true, 'ai.provider' => 'gemini',
            'services.gemini.enabled' => true, 'services.gemini.key' => 'lifecycle-test-key',
            'services.gemini.model' => 'test-model',
            'cache.stores.database.connection' => 'mysql',
            'cache.stores.database.lock_connection' => 'mysql',
        ]);
        Storage::fake('private');
        Storage::fake('public');
        $this->realQueue = Queue::getFacadeRoot();
        Queue::fake();
        Http::preventStrayRequests();
    }

    public function test_ai_endpoints_require_authentication_and_reject_candidates_and_unrelated_employers(): void
    {
        [$candidate, , $application] = $this->fixture();
        $path = '/api/applications/'.$application->id;
        $this->getJson($path.'/ai-analysis')->assertUnauthorized();
        $this->postJson($path.'/ai-analyze')->assertUnauthorized();
        foreach ([$candidate, User::factory()->create(['role' => 'employer'])] as $outsider) {
            $this->actingAs($outsider, 'sanctum')->getJson($path.'/ai-analysis')->assertForbidden();
            $this->postJson($path.'/ai-analyze')->assertForbidden();
        }
        Queue::assertNothingPushed();
        Http::assertNothingSent();
    }

    public function test_locked_owner_and_unverified_retry_cannot_schedule_paid_analysis(): void
    {
        [, $employer, $application] = $this->fixture();
        $employer->forceFill(['status' => 'locked'])->save();
        $this->actingAs($employer, 'sanctum')->getJson('/api/applications/'.$application->id.'/ai-analysis')->assertForbidden();
        $this->postJson('/api/applications/'.$application->id.'/ai-analyze')->assertForbidden();
        $employer->forceFill(['status' => 'active', 'email_verified_at' => null])->save();
        $this->actingAs($employer->fresh(), 'sanctum')->postJson('/api/applications/'.$application->id.'/ai-analyze')
            ->assertForbidden()->assertJsonPath('code', 'email_verification_required');
        Queue::assertNothingPushed();
        Http::assertNothingSent();
    }

    public function test_verified_admin_can_inspect_and_schedule_any_application(): void
    {
        [, , $application] = $this->fixture();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->actingAs($admin, 'sanctum')->getJson('/api/applications/'.$application->id.'/ai-analysis')
            ->assertOk()->assertJsonPath('data.status', 'deferred')->assertJsonPath('data.analysis', null);
        Queue::assertNothingPushed();
        $this->postJson('/api/applications/'.$application->id.'/ai-analyze')->assertStatus(202);
        Queue::assertPushed(AnalyzeApplicationCv::class, 1);
        Http::assertNothingSent();
    }

    public function test_get_analysis_and_employer_details_never_schedule_failed_assessment(): void
    {
        [, $employer, $application] = $this->fixture();
        $application->update(['ai_analysis_status' => 'failed', 'ai_analysis_error' => 'Không thể phân tích CV lúc này.']);
        $this->actingAs($employer, 'sanctum')->getJson('/api/applications/'.$application->id.'/ai-analysis')
            ->assertOk()->assertJsonPath('data.status', 'failed')->assertJsonPath('data.analysis', null)
            ->assertJsonPath('data.retryable', true);
        $this->getJson('/api/employer/applications/'.$application->id)->assertOk();
        $this->assertSame('failed', $application->fresh()->ai_analysis_status);
        Queue::assertNothingPushed();
        Http::assertNothingSent();
    }

    public function test_explicit_retry_is_database_queued_even_when_default_connection_is_sync(): void
    {
        [, $employer, $application] = $this->fixture();
        config(['queue.default' => 'sync']);
        $application->update(['ai_analysis_status' => 'failed', 'ai_analysis_error' => 'Lỗi cũ.']);
        $this->actingAs($employer, 'sanctum')->postJson('/api/applications/'.$application->id.'/ai-analyze')
            ->assertStatus(202)->assertJsonPath('data.status', 'pending')->assertJsonPath('data.analysis', null)
            ->assertJsonPath('data.error', null)->assertJsonPath('data.retryable', false);
        $this->postJson('/api/applications/'.$application->id.'/ai-analyze')->assertStatus(202)->assertJsonPath('data.status', 'pending');
        Queue::assertPushed(AnalyzeApplicationCv::class, fn ($job) => $job->connection === 'database' && $job->queue === 'ai' && $job->afterCommit === true);
        Queue::assertPushed(AnalyzeApplicationCv::class, 1);
        $this->assertSame('pending', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->ai_analysis_error);
        Http::assertNothingSent();
    }

    public function test_completed_get_and_cached_post_share_resource_and_do_not_call_provider_again(): void
    {
        [, $employer, $application] = $this->fixture();
        $this->completed($application);
        $this->actingAs($employer, 'sanctum');
        $get = $this->getJson('/api/applications/'.$application->id.'/ai-analysis')
            ->assertOk()->assertJsonPath('data.status', 'completed')->assertJsonPath('data.analysis.match_score', 88)
            ->assertJsonPath('data.error', null)->assertJsonPath('data.retryable', false);
        $post = $this->postJson('/api/applications/'.$application->id.'/ai-analyze')->assertOk();
        $this->assertSame($get->json('data'), $post->json('data'));
        Queue::assertNothingPushed();
        Http::assertNothingSent();
    }

    public function test_two_sequential_jobs_parse_the_pdf_but_make_only_one_provider_request(): void
    {
        [, , $application] = $this->fixture();
        $application->update(['ai_analysis_status' => 'pending']);
        Http::fake(function () use ($application) {
            $this->assertSame('processing', $application->fresh()->ai_analysis_status);
            return Http::response($this->providerAssessment());
        });
        $this->app->call([new AnalyzeApplicationCv($application->id), 'handle']);
        $this->app->call([new AnalyzeApplicationCv($application->id), 'handle']);
        Http::assertSentCount(1);
        $this->assertDatabaseCount('ai_cv_analyses', 1);
        $this->assertSame(88, $application->fresh()->aiAnalysis->match_score);
        $this->assertSame('completed', $application->fresh()->ai_analysis_status);
    }

    public function test_transient_provider_failure_stays_pending_until_terminal_failure_and_never_exposes_body(): void
    {
        [, , $application] = $this->fixture();
        $application->update(['ai_analysis_status' => 'pending']);
        Http::fake(['*' => Http::response(['error' => ['message' => 'PRIVATE_CV_API_KEY_123']], 503)]);
        $job = (new AnalyzeApplicationCv($application->id))->withFakeQueueInteractions();
        try {
            $this->app->call([$job, 'handle']);
            $this->fail('A transient provider failure must ask the queue to retry.');
        } catch (\RuntimeException $exception) {
            $this->assertStringNotContainsString('PRIVATE_CV_API_KEY_123', $exception->getMessage());
            $this->assertNull($exception->getPrevious());
        }
        $this->assertSame('pending', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->aiAnalysis);
        $job->failed(new \RuntimeException('PRIVATE_CV_API_KEY_123'));
        $this->assertSame('failed', $application->fresh()->ai_analysis_status);
        $this->assertStringNotContainsString('PRIVATE_CV_API_KEY_123', $application->fresh()->ai_analysis_error);
    }

    public function test_groq_schema_rejection_retries_automatically_and_can_complete_without_manual_request(): void
    {
        [, , $application] = $this->fixture();
        config(['ai.provider' => 'groq', 'ai.groq.key' => 'test-only-groq-key', 'ai.groq.model' => 'openai/gpt-oss-20b']);
        Http::fake(['*' => Http::sequence()
            ->push(['error' => ['code' => 'json_validate_failed', 'message' => 'PRIVATE_CV_API_KEY_123']], 400)
            ->push(['choices' => [['finish_reason' => 'stop', 'message' => ['content' => json_encode($this->groqAssessment())]]]])]);
        $job = (new AnalyzeApplicationCv($application->id))->withFakeQueueInteractions();
        try {
            $this->app->call([$job, 'handle']);
            $this->fail('The queue must retry a generated schema rejection.');
        } catch (\App\Exceptions\AiAnalysisException $exception) {
            $this->assertTrue($exception->retryable);
        }
        $this->assertSame('pending', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->ai_analysis_error);
        $this->assertNull($application->fresh()->aiAnalysis);
        $job->job->attempts = 2;
        $this->app->call([$job, 'handle']);
        $this->assertSame('completed', $application->fresh()->ai_analysis_status);
        $this->assertSame(88, $application->fresh()->aiAnalysis->match_score);
        Http::assertSentCount(2);
    }

    public function test_repeated_schema_rejection_stops_after_three_attempts_with_the_correct_safe_error(): void
    {
        [, , $application] = $this->fixture();
        config(['ai.provider' => 'groq', 'ai.groq.key' => 'test-only-groq-key', 'ai.groq.model' => 'openai/gpt-oss-20b']);
        Http::fake(['*' => Http::response(['error' => ['code' => 'json_validate_failed', 'message' => 'PRIVATE_CV_API_KEY_123']], 400)]);
        $job = (new AnalyzeApplicationCv($application->id))->withFakeQueueInteractions();
        foreach ([1, 2, 3] as $attempt) {
            $job->job->attempts = $attempt;
            try {
                $this->app->call([$job, 'handle']);
                $this->assertSame(3, $attempt);
            } catch (\App\Exceptions\AiAnalysisException $exception) {
                $this->assertLessThan(3, $attempt);
                $this->assertTrue($exception->retryable);
            }
        }
        $job->assertFailed();
        $this->assertSame('failed', $application->fresh()->ai_analysis_status);
        $this->assertSame('AI chưa trả về đánh giá hợp lệ. Bạn có thể thử lại.', $application->fresh()->ai_analysis_error);
        $this->assertNull($application->fresh()->aiAnalysis);
        Http::assertSentCount(3);
    }

    public function test_invalid_provider_schema_is_terminal_without_a_fabricated_score(): void
    {
        [, , $application] = $this->fixture();
        $application->update(['ai_analysis_status' => 'pending']);
        Http::fake(['*' => Http::response(['candidates' => [['finishReason' => 'STOP', 'content' => ['parts' => [['text' => '{"match_score":999}']]]]]])]);
        $job = (new AnalyzeApplicationCv($application->id))->withFakeQueueInteractions();
        try {
            $this->app->call([$job, 'handle']);
        } catch (\RuntimeException $exception) {
            $this->assertNull($exception->getPrevious());
        }
        $this->assertSame('failed', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->aiAnalysis);
    }

    public function test_late_failed_callback_cannot_overwrite_completed_analysis(): void
    {
        [, , $application] = $this->fixture();
        $this->completed($application);
        (new AnalyzeApplicationCv($application->id))->failed(new \RuntimeException('old worker failed'));
        $this->assertSame('completed', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->ai_analysis_error);
        $this->assertSame(88, $application->fresh()->aiAnalysis->match_score);
    }

    public function test_disabled_worker_defers_without_touching_provider(): void
    {
        [, , $application] = $this->fixture();
        config(['ai.enabled' => false, 'services.gemini.enabled' => false]);
        $this->app->call([new AnalyzeApplicationCv($application->id), 'handle']);
        $this->assertSame('deferred', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->aiAnalysis);
        Http::assertNothingSent();
    }

    public function test_stale_job_generation_is_ignored_and_legacy_pending_can_be_recovered(): void
    {
        [, $employer, $application] = $this->fixture();
        $currentId = (string) Str::uuid();
        $application->forceFill(['ai_analysis_status' => 'pending', 'ai_request_id' => $currentId, 'ai_requested_at' => now()])->save();
        $this->app->call([new AnalyzeApplicationCv($application->id, (string) Str::uuid()), 'handle']);
        $this->assertSame($currentId, $application->fresh()->ai_request_id);
        $this->assertSame('pending', $application->fresh()->ai_analysis_status);
        Http::assertNothingSent();
        $application->forceFill(['ai_requested_at' => null])->save();
        $this->actingAs($employer, 'sanctum')->postJson('/api/applications/'.$application->id.'/ai-analyze')->assertStatus(202);
        Queue::assertPushed(AnalyzeApplicationCv::class, 1);
        $this->assertNotSame($currentId, $application->fresh()->ai_request_id);
    }

    public function test_legacy_job_and_failure_callback_cannot_touch_a_new_request_generation(): void
    {
        [, , $application] = $this->fixture();
        $currentId = (string) Str::uuid();
        $application->forceFill(['ai_analysis_status' => 'pending', 'ai_request_id' => $currentId, 'ai_requested_at' => now()])->save();
        $legacy = new AnalyzeApplicationCv($application->id);
        Http::fake(['*' => Http::response($this->providerAssessment())]);
        $this->app->call([$legacy, 'handle']);
        Http::assertNothingSent();
        $legacy->failed(new \RuntimeException('old legacy worker failed'));
        $this->assertSame('pending', $application->fresh()->ai_analysis_status);
        $this->assertSame($currentId, $application->fresh()->ai_request_id);
        $this->assertNull($application->fresh()->aiAnalysis);
    }

    public function test_candidate_history_still_has_no_analysis_status_errors_or_scores(): void
    {
        [$candidate, , $application] = $this->fixture();
        $this->completed($application);
        $data = $this->actingAs($candidate, 'sanctum')->getJson('/api/candidate/applications')->assertOk()->json('data.0');
        foreach (['ai_analysis', 'ai_analysis_status', 'ai_analysis_error', 'match_score', 'ai_job_snapshot'] as $key) {
            $this->assertArrayNotHasKey($key, $data);
        }
    }

    public function test_cross_worker_database_lock_prevents_provider_call_and_duplicate_scheduling(): void
    {
        [, $employer, $application] = $this->fixture();
        $application->update(['ai_analysis_status' => 'processing', 'ai_request_id' => (string) Str::uuid(), 'ai_requested_at' => now()]);
        $lock = Cache::store('database')->lock('ai-application:'.$application->id, 180);
        $this->assertTrue($lock->get());
        try {
            $job = (new AnalyzeApplicationCv($application->id))->withFakeQueueInteractions();
            $this->app->call([$job, 'handle']);
            $job->assertReleased(15);
            $this->actingAs($employer, 'sanctum')->postJson('/api/applications/'.$application->id.'/ai-analyze')
                ->assertStatus(202)->assertJsonPath('data.status', 'processing');
            Queue::assertNothingPushed();
            Http::assertNothingSent();
            $this->assertSame('processing', $application->fresh()->ai_analysis_status);
        } finally {
            $lock->release();
        }
    }

    public function test_retry_keeps_original_job_snapshot_after_employer_edits_the_job(): void
    {
        [, $employer, $application] = $this->fixture();
        $application->job->update(['title' => 'ORIGINAL_LIFECYCLE_TITLE', 'requirements' => 'ORIGINAL_LIFECYCLE_REQUIREMENTS']);
        $this->actingAs($employer, 'sanctum')->postJson('/api/applications/'.$application->id.'/ai-analyze')->assertStatus(202);
        $snapshot = $application->fresh()->ai_job_snapshot;
        $this->assertSame('ORIGINAL_LIFECYCLE_TITLE', $snapshot['title']);
        $application->job->update(['title' => 'EDITED_LIFECYCLE_TITLE', 'requirements' => 'EDITED_LIFECYCLE_REQUIREMENTS']);
        $application->update(['ai_analysis_status' => 'failed']);
        $this->postJson('/api/applications/'.$application->id.'/ai-analyze')->assertStatus(202);
        $this->assertSame($snapshot, $application->fresh()->ai_job_snapshot);
        Http::fake(function ($request) {
            $this->assertStringContainsString('ORIGINAL_LIFECYCLE_TITLE', $request->body());
            $this->assertStringContainsString('ORIGINAL_LIFECYCLE_REQUIREMENTS', $request->body());
            $this->assertStringNotContainsString('EDITED_LIFECYCLE_', $request->body());
            return Http::response($this->providerAssessment());
        });
        $this->app->call([new AnalyzeApplicationCv($application->id, $application->fresh()->ai_request_id), 'handle']);
        Http::assertSentCount(1);
        $this->assertSame('completed', $application->fresh()->ai_analysis_status);
    }

    public function test_admin_application_discovery_is_private_and_scoped_to_requested_job(): void
    {
        [$candidate, $employer, $application] = $this->fixture();
        $this->completed($application);
        $otherJob = $application->job->replicate();
        $otherJob->title = 'Other job';
        $otherJob->save();
        Application::create(['job_id' => $otherJob->id, 'candidate_id' => $application->candidate_id, 'cv_path' => $application->cv_path, 'status' => 'applied', 'ai_analysis_status' => 'deferred']);
        $list = '/api/admin/jobs/'.$application->job_id.'/applications';
        $detail = '/api/admin/applications/'.$application->id;
        $this->getJson($list)->assertUnauthorized();
        $this->getJson($detail)->assertUnauthorized();
        foreach ([$candidate, $employer] as $user) {
            $this->actingAs($user, 'sanctum')->getJson($list)->assertForbidden();
            $this->getJson($detail)->assertForbidden();
        }
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->actingAs($admin, 'sanctum')->getJson($list)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $application->id)->assertJsonPath('data.0.ai_analysis.match_score', 88)
            ->assertJsonPath('meta.total', 1)->assertJsonPath('meta.per_page', 20);
        $this->getJson($detail)->assertOk()->assertJsonPath('data.id', $application->id)
            ->assertJsonPath('data.ai_analysis.match_score', 88)->assertJsonMissingPath('data.cv_path');
        $this->getJson('/api/admin/jobs/999999/applications')->assertNotFound();
        $this->getJson('/api/admin/applications/999999')->assertNotFound();
        Queue::assertNothingPushed();
        Http::assertNothingSent();
    }

    public function test_admin_discovery_validates_pagination_and_does_not_mark_applicant_reviewed(): void
    {
        [, , $application] = $this->fixture();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->actingAs($admin, 'sanctum');
        $path = '/api/admin/jobs/'.$application->job_id.'/applications';
        foreach (['per_page=101', 'per_page=0', 'per_page=bad', 'page=0'] as $query) {
            $this->getJson($path.'?'.$query)->assertUnprocessable();
        }
        $this->getJson($path.'?per_page=1&page=1')->assertOk()->assertJsonPath('meta.per_page', 1)->assertJsonPath('meta.total', 1);
        $this->getJson('/api/admin/applications/'.$application->id)->assertOk();
        $this->assertSame('applied', $application->fresh()->status);
        $this->assertNull($application->fresh()->reviewed_at);
        Queue::assertNothingPushed();
    }

    public function test_seeded_demo_cv_cannot_be_requested_scheduled_or_processed(): void
    {
        [, $employer, $application] = $this->fixture();
        $application->update(['cv_path' => 'demo-seed/recruitment-demo-v1/applications/123.pdf']);
        $this->actingAs($employer, 'sanctum')->getJson('/api/applications/'.$application->id.'/ai-analysis')
            ->assertOk()->assertJsonPath('data.retryable', false);
        $this->postJson('/api/applications/'.$application->id.'/ai-analyze')->assertUnprocessable();
        app(\App\Services\AiAssessmentScheduler::class)->schedule($application);
        $application->update(['ai_analysis_status' => 'pending']);
        $this->app->call([new AnalyzeApplicationCv($application->id), 'handle']);
        $this->assertSame('deferred', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->aiAnalysis);
        Queue::assertNothingPushed();
        Http::assertNothingSent();
    }

    public function test_renamed_seed_cv_is_blocked_even_when_calling_provider_service_directly(): void
    {
        [, , $application] = $this->fixture();
        $source = (new \Database\Seeders\Demo\DemoAssets)->cv(0, 'Synthetic Candidate', 'Developer', ['PHP'], 3);
        $copy = app(\App\Services\ApplicationCvStorage::class)->snapshot($source);
        $this->assertStringStartsWith('application_cvs/demo-seed/', $copy);
        // Older copies lost their seed directory: their exact embedded seed marker still excludes them.
        Storage::disk('private')->copy($copy, 'application_cvs/old-copy.pdf');
        $application->update(['cv_path' => 'application_cvs/old-copy.pdf']);
        try {
            app(\App\Services\GeminiService::class)->analyze($application);
            $this->fail('Synthetic seed CV must never reach the provider.');
        } catch (\App\Exceptions\AiAnalysisException $exception) {
            $this->assertFalse($exception->retryable);
        }
        $this->app->call([new AnalyzeApplicationCv($application->id), 'handle']);
        $this->assertSame('deferred', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->aiAnalysis);
        Http::assertNothingSent();
    }

    public function test_genuine_upload_by_demo_account_remains_eligible_but_original_seed_does_not(): void
    {
        [$candidate, $employer, $seeded] = $this->fixture();
        $candidate->update(['email' => 'candidate.00001@demo.timviec.test']);
        $source = (new \Database\Seeders\Demo\DemoAssets)->cv(0, 'Synthetic Candidate', 'Developer', ['PHP'], 3);
        $seeded->update(['cv_path' => $source]);
        $profile = $candidate->candidateProfile;
        $profile->update(['cv_file_path' => $source]);
        $demoCvJob = $seeded->job->replicate();
        $demoCvJob->save();
        $this->actingAs($candidate->fresh(), 'sanctum')->postJson('/api/jobs/'.$demoCvJob->id.'/apply', ['cv_source' => 'profile'])->assertCreated();
        $demoCopy = Application::where('job_id', $demoCvJob->id)->firstOrFail();
        $this->assertStringStartsWith('application_cvs/demo-seed/', $demoCopy->cv_path);
        $this->assertSame('deferred', $demoCopy->ai_analysis_status);
        Queue::assertNothingPushed();
        Http::assertNothingSent();
        $newJob = $seeded->job->replicate();
        $newJob->save();
        $this->actingAs($candidate, 'sanctum')->postJson('/api/candidate/cv', [
            'cv_file' => \Illuminate\Http\UploadedFile::fake()->createWithContent('genuine.pdf', $this->pdf()),
        ])->assertSuccessful();
        $this->actingAs($candidate->fresh(), 'sanctum')->postJson('/api/jobs/'.$newJob->id.'/apply', ['cv_source' => 'profile'])->assertCreated();
        $genuine = Application::where('job_id', $newJob->id)->firstOrFail();
        Queue::assertPushed(AnalyzeApplicationCv::class, 1);
        $this->assertSame('pending', $genuine->ai_analysis_status);
        Http::fake(['*' => Http::response($this->providerAssessment())]);
        $this->app->call([new AnalyzeApplicationCv($genuine->id, $genuine->ai_request_id), 'handle']);
        $this->assertSame('completed', $genuine->fresh()->ai_analysis_status);
        Http::assertSentCount(1);
        $this->actingAs($employer, 'sanctum')->postJson('/api/applications/'.$seeded->id.'/ai-analyze')->assertUnprocessable();
        Http::assertSentCount(1);
    }

    public function test_uploaded_cv_is_automatically_database_queued_before_employer_notification(): void
    {
        [$candidate, , $fixture] = $this->fixture();
        $job = $fixture->job->replicate();
        $job->save();
        config(['queue.default' => 'sync', 'queue.connections.database.connection' => 'mysql',
            'queue.connections.database.table' => 'queue_jobs']);
        Queue::swap($this->realQueue);
        $queuedBeforeNotification = false;
        \Illuminate\Support\Facades\Event::listen('eloquent.creating: '.\App\Models\Notification::class,
            function ($notification) use (&$queuedBeforeNotification, $job) {
                if (($notification->data['job_id'] ?? null) === $job->id) {
                    $queuedBeforeNotification = \Illuminate\Support\Facades\DB::table('queue_jobs')->where('queue', 'ai')->count() === 1;
                }
            });
        $response = $this->actingAs($candidate, 'sanctum')->postJson('/api/jobs/'.$job->id.'/apply', [
            'cv_source' => 'new',
            'cv_file' => \Illuminate\Http\UploadedFile::fake()->createWithContent('uploaded-cv.pdf', $this->pdf()),
        ])->assertCreated();
        $application = Application::findOrFail($response->json('data.id'));
        $this->assertTrue($queuedBeforeNotification, 'AI must be queued immediately after saving the application, before notification delivery.');
        $this->assertSame('pending', $application->ai_analysis_status);
        $this->assertNotNull($application->ai_request_id);
        $this->assertNotNull($application->ai_requested_at);
        $this->assertSame($job->title, $application->ai_job_snapshot['title']);
        $rows = \Illuminate\Support\Facades\DB::table('queue_jobs')->where('queue', 'ai')->get();
        $this->assertCount(1, $rows);
        $payload = json_decode($rows[0]->payload, true, flags: JSON_THROW_ON_ERROR);
        $queued = unserialize($payload['data']['command'], ['allowed_classes' => [AnalyzeApplicationCv::class]]);
        $this->assertSame($application->id, $queued->applicationId);
        $this->assertSame($application->ai_request_id, $queued->requestId);
        $this->assertSame('database', $queued->connection);
        $this->assertSame('ai', $queued->queue);
        Http::assertNothingSent();
        foreach (['ai_analysis', 'ai_analysis_status', 'ai_analysis_error'] as $privateField) {
            $this->assertArrayNotHasKey($privateField, $response->json('data'));
        }
    }

    public function test_same_profile_cv_submitted_to_different_jobs_is_automatically_assessed_per_application(): void
    {
        [$candidate, , $fixture] = $this->fixture();
        $applications = [];
        foreach ([1, 2] as $number) {
            $job = $fixture->job->replicate();
            $job->title = 'Backend position '.$number;
            $job->save();
            $response = $this->actingAs($candidate, 'sanctum')->postJson('/api/jobs/'.$job->id.'/apply', ['cv_source' => 'profile'])->assertCreated();
            $application = Application::findOrFail($response->json('data.id'));
            $this->assertSame('pending', $application->ai_analysis_status);
            Queue::assertPushed(AnalyzeApplicationCv::class, fn ($queued) => $queued->applicationId === $application->id && $queued->requestId === $application->ai_request_id);
            $applications[] = $application;
        }
        Queue::assertPushed(AnalyzeApplicationCv::class, 2);
        $this->assertNotSame($applications[0]->ai_request_id, $applications[1]->ai_request_id);
        $this->assertNotSame($applications[0]->cv_path, $applications[1]->cv_path);
        Http::assertNothingSent();
        Http::fake(['*' => Http::response($this->providerAssessment())]);
        foreach ($applications as $application) {
            $this->app->call([new AnalyzeApplicationCv($application->id, $application->ai_request_id), 'handle']);
            $this->assertSame('completed', $application->fresh()->ai_analysis_status);
        }
        Http::assertSentCount(2);
    }

    private function completed(Application $application): void
    {
        AiCvAnalysis::create(['application_id' => $application->id] + $this->assessment());
        $application->update(['ai_analysis_status' => 'completed', 'ai_analysis_error' => null]);
    }

    private function assessment(): array
    {
        return ['match_score' => 88, 'summary' => 'Relevant backend experience.', 'matched_skills' => ['PHP'],
            'missing_skills' => [], 'strengths' => ['PHP experience', 'SQL experience'], 'recommendations' => [],
            'criteria_scores' => ['skills' => 88, 'experience' => 88, 'education' => 88, 'orientation' => 88]];
    }

    private function providerAssessment(): array
    {
        return ['candidates' => [['finishReason' => 'STOP', 'content' => ['parts' => [['text' => json_encode($this->assessment())]]]]]];
    }

    private function groqAssessment(): array
    {
        $assessment = $this->assessment();
        foreach (['missing_skills', 'strengths', 'recommendations'] as $field) {
            $values = $assessment[$field];
            $assessment[$field] = [];
            foreach (range(1, 4) as $index) {
                $assessment[$field]['item_'.$index] = $values[$index - 1] ?? null;
            }
        }
        return $assessment;
    }

    private function fixture(): array
    {
        $candidate = User::factory()->create(['role' => 'candidate', 'status' => 'active']);
        $profile = CandidateProfile::create(['user_id' => $candidate->id, 'cv_file_path' => 'cvs/lifecycle.pdf']);
        Storage::disk('private')->put($profile->cv_file_path, $this->pdf());
        $employer = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $company = Company::create(['user_id' => $employer->id, 'name' => 'Lifecycle Company', 'description' => 'Software company', 'address' => 'Test address', 'city' => 'Ha Noi']);
        $category = Category::create(['name' => 'Lifecycle engineering']);
        $job = Job::create(['company_id' => $company->id, 'category_id' => $category->id, 'title' => 'Backend Developer', 'job_level' => 'Middle', 'description' => 'Build software', 'requirements' => 'PHP and SQL', 'benefits' => 'Benefits', 'city' => 'Ha Noi', 'deadline' => now()->addWeek(), 'status' => 'active']);
        $application = Application::create(['job_id' => $job->id, 'candidate_id' => $profile->id, 'cv_path' => $profile->cv_file_path, 'status' => 'applied', 'ai_analysis_status' => 'deferred']);
        return [$candidate, $employer, $application];
    }

    private function pdf(): string
    {
        $stream = 'BT /F1 12 Tf 72 720 Td (Backend developer PHP SQL five years experience) Tj ET';
        $objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length '.strlen($stream).">>\nstream\n".$stream."\nendstream"];
        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $index => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n".$object."\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 6\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        return $pdf."trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n".$xref."\n%%EOF";
    }
}
