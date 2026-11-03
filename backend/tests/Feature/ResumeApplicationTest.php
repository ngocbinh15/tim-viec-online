<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeApplicationCv;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\Resume;
use App\Models\ResumeExport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumeApplicationTest extends TestCase
{
    use RefreshDatabase;

    private function setupApplication(): array
    {
        Storage::fake('private');
        Queue::fake();
        config(['resumes.enabled' => true, 'broadcasting.default' => 'log', 'ai.enabled' => true]);
        $user = User::factory()->create(['role' => 'candidate']);
        $owner = CandidateProfile::create(['user_id' => $user->id]);
        $employer = User::factory()->create(['role' => 'employer']);
        $company = Company::create(['user_id' => $employer->id, 'name' => 'Synthetic Test Company']);
        $category = Category::create(['name' => 'Test']);
        $job = Job::create(['company_id' => $company->id, 'category_id' => $category->id, 'title' => 'Developer Test', 'description' => 'Develop software', 'requirements' => 'PHP', 'benefits' => 'Benefits', 'address' => 'Test street', 'quantity' => 1, 'job_level' => 'Middle', 'job_type' => 'full_time', 'city' => 'Hà Nội', 'status' => 'active', 'deadline' => now()->addWeek()]);
        $doc = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
        $resume = Resume::create(['candidate_id' => $owner->id, ...$doc]);
        Storage::disk('private')->put('resume_exports/real.pdf', '%PDF-1.4 synthetic resume');
        $export = ResumeExport::create(['resume_id' => $resume->id, 'revision' => 1, 'renderer_version' => '1', 'input_hash' => str_repeat('a', 64), 'input_snapshot' => $doc, 'status' => 'ready', 'path' => 'resume_exports/real.pdf']);

        return [$user, $job, $resume, $export];
    }

    public function test_generated_cv_is_snapshotted_and_real_cv_analysis_is_scheduled_once(): void
    {
        [$user,$job,$resume,$export] = $this->setupApplication();
        $id = $this->actingAs($user, 'sanctum')->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'builder', 'resume_export_id' => $export->id])->assertCreated()->assertJsonMissingPath('data.ai_analysis_status')->json('data.id');
        $application = Application::findOrFail($id);
        $path = $application->cv_path;
        $this->assertNotSame($export->path, $path);
        $this->assertSame('%PDF-1.4 synthetic resume', Storage::disk('private')->get($path));
        Queue::assertPushed(AnalyzeApplicationCv::class, 1);
        $this->deleteJson("/api/candidate/resumes/$resume->id")->assertOk();
        $this->assertTrue(Storage::disk('private')->exists($path));
        $this->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'builder', 'resume_export_id' => $export->id])->assertConflict();
    }

    public function test_other_owners_pending_exports_and_unverified_accounts_cannot_apply(): void
    {
        [$user,$job,$resume,$export] = $this->setupApplication();
        $other = User::factory()->create(['role' => 'candidate']);
        CandidateProfile::create(['user_id' => $other->id]);
        $this->actingAs($other, 'sanctum')->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'builder', 'resume_export_id' => $export->id])->assertNotFound();
        $export->update(['status' => 'pending']);
        $this->actingAs($user, 'sanctum')->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'builder', 'resume_export_id' => $export->id])->assertUnprocessable();
        $user->forceFill(['email_verified_at' => null])->save();
        $this->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'builder', 'resume_export_id' => $export->id])->assertForbidden();
        $this->assertDatabaseCount('applications',0);
    }

    public function test_failed_missing_and_conflicting_sources_are_rejected_without_creating_files(): void
    {
        [$user, $job, $resume, $export] = $this->setupApplication();
        $this->actingAs($user, 'sanctum');
        foreach (['failed', 'processing', 'ready'] as $status) {
            $export->update(['status' => $status, 'path' => 'resume_exports/missing.pdf']);
            $this->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'builder', 'resume_export_id' => $export->id])->assertUnprocessable()->assertJsonPath('success', false);
        }
        $this->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'profile', 'resume_export_id' => $export->id])->assertUnprocessable();
        $this->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'builder', 'resume_export_id' => $export->id, 'cv_file' => \Illuminate\Http\UploadedFile::fake()->create('cv.pdf', 1, 'application/pdf')])->assertStatus(400);
        $this->assertDatabaseCount('applications', 0);
        $this->assertSame(['resume_exports/real.pdf'], Storage::disk('private')->allFiles());
    }

    public function test_demo_exports_remain_ineligible_for_ai_and_closed_jobs_reject_builder_applications(): void
    {
        [$user, $job, $resume, $export] = $this->setupApplication();
        $this->actingAs($user, 'sanctum');
        $job->update(['status' => 'closed']);
        $this->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'builder', 'resume_export_id' => $export->id])->assertUnprocessable();
        $job->update(['status' => 'active', 'deadline' => now()->subDay()]);
        $this->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'builder', 'resume_export_id' => $export->id])->assertUnprocessable();
        $job->update(['deadline' => now()->addWeek()]);
        $path = 'demo-seed/resume_exports/synthetic.pdf';
        Storage::disk('private')->put($path, '%PDF-1.4 synthetic demo');
        $export->update(['path' => $path]);
        $this->postJson("/api/jobs/$job->id/apply", ['cv_source' => 'builder', 'resume_export_id' => $export->id])->assertCreated();
        Queue::assertNotPushed(AnalyzeApplicationCv::class);
        $this->assertStringContainsString('demo-seed/', Application::firstOrFail()->cv_path);
    }
}
