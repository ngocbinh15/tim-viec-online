<?php

namespace Tests\Feature;

use App\Jobs\RenderResumePdf;
use App\Models\CandidateProfile;
use App\Models\Resume;
use App\Models\ResumeExport;
use App\Models\User;
use App\Services\Resumes\ResumeExportService;
use App\Services\Resumes\ResumePdfRenderer;
use Illuminate\Contracts\Queue\Job;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumeJobTest extends TestCase
{
    use RefreshDatabase;

    private function export(): ResumeExport
    {
        config(['resumes.enabled' => true]);
        Storage::fake('private');
        $user = User::factory()->create(['role' => 'candidate']);
        $owner = CandidateProfile::create(['user_id' => $user->id]);
        $doc = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
        $resume = Resume::create(['candidate_id' => $owner->id, ...$doc]);

        return ResumeExport::create(['resume_id' => $resume->id, 'revision' => 1, 'renderer_version' => '1', 'input_hash' => str_repeat('a', 64), 'input_snapshot' => $doc, 'status' => 'pending', 'attempt_token' => 'test-attempt']);
    }

    public function test_content_failures_stop_without_retry_and_deleted_documents_do_not_render(): void
    {
        $export = $this->export();
        $renderer = \Mockery::mock(ResumePdfRenderer::class);
        $renderer->shouldReceive('render')->once()->andThrow(new \RuntimeException('PDF_PAGE_LIMIT'));
        (new RenderResumePdf($export->id, $export->attempt_token))->handle($renderer);
        $this->assertSame('failed', $export->fresh()->status);
        $this->assertSame('PDF_PAGE_LIMIT', $export->fresh()->error_code);
        $this->assertSame([], Storage::disk('private')->allFiles());
        $export->resume->delete();
        (new RenderResumePdf($export->id, $export->attempt_token))->handle($renderer);
        $this->assertDatabaseMissing('resume_exports', ['id' => $export->id]);
    }

    public function test_transient_failure_retries_once_then_stops_without_exposing_process_details(): void
    {
        $export = $this->export();
        $renderer = \Mockery::mock(ResumePdfRenderer::class);
        $renderer->shouldReceive('render')->twice()->andThrow(new \RuntimeException('sensitive process input'));
        $job = new RenderResumePdf($export->id, $export->attempt_token);
        try {
            $job->handle($renderer);
            $this->fail('The first transient failure must be retried.');
        } catch (\RuntimeException $error) {
            $this->assertSame('Resume render temporarily unavailable.', $error->getMessage());
        }
        $this->assertSame('pending', $export->fresh()->status);
        $queueJob = \Mockery::mock(Job::class);
        $queueJob->shouldReceive('attempts')->andReturn(2);
        $job->setJob($queueJob);
        $job->handle($renderer);
        $this->assertSame('failed', $export->fresh()->status);
        $this->assertSame('RENDER_FAILED', $export->fresh()->error_code);
    }

    public function test_dispatch_failure_is_reported_and_can_be_requested_again(): void
    {
        $export = $this->export();
        $export->update(['status' => 'failed']);
        Bus::shouldReceive('dispatch')->once()->andThrow(new \RuntimeException('queue unavailable'));
        $result = app(ResumeExportService::class)->request($export->resume, 1);
        $this->assertSame('failed', $result->status);
        $this->assertSame('QUEUE_UNAVAILABLE', $result->error_code);
    }

    public function test_health_check_detects_stalled_work_without_requeueing(): void
    {
        $export = $this->export();
        $this->artisan('resumes:health')->assertSuccessful();
        ResumeExport::whereKey($export->id)->update(['updated_at' => now()->subMinutes(3)]);
        $this->artisan('resumes:health')->assertFailed();
        $this->assertSame('pending', $export->fresh()->status);
        $this->assertSame('test-attempt', $export->fresh()->attempt_token);
    }
}
