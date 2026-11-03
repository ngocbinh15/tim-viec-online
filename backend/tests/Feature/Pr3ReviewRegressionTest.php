<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeApplicationCv;
use App\Models\AiCvAnalysis;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\Notification;
use App\Models\User;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Regression coverage for the issues found while reviewing PR #3. */
class Pr3ReviewRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['broadcasting.default' => 'log', 'services.gemini.key' => null]);
        Storage::fake('private');
        Storage::fake('public');
        Mail::fake();
        Http::preventStrayRequests();
        Bus::fake();
    }

    public function test_recovery_response_cannot_replace_password_without_mailbox_access(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OriginalPass1!')]);
        $response = $this->postJson('/api/forgot-password', ['email' => $user->email]);
        $response->assertOk();
        $token = $response->json('data.token');
        if (is_string($token) && $token !== '') {
            $this->postJson('/api/reset-password', [
                'email' => $user->email,
                'token' => $token,
                'password' => 'ChangedPass2!',
                'password_confirmation' => 'ChangedPass2!',
            ])->assertOk();
        }
        // Never print recovery tokens or response bodies in review evidence.
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password),
            'Public recovery response allowed password replacement without mailbox access.');
    }

    public function test_candidate_cannot_read_or_trigger_employer_ai_assessment(): void
    {
        [$candidate, , $application] = $this->fixture();
        $this->analysis($application);
        $this->actingAs($candidate, 'sanctum');
        $statuses = [
            $this->getJson("/api/applications/{$application->id}/ai-analysis")->status(),
            $this->postJson("/api/applications/{$application->id}/ai-analyze")->status(),
        ];
        $this->assertSame([403, 403], $statuses);
    }

    public function test_candidate_history_omits_employer_ai_assessment(): void
    {
        [$candidate, , $application] = $this->fixture();
        $this->analysis($application);
        $response = $this->actingAs($candidate, 'sanctum')->getJson('/api/candidate/applications');
        $response->assertOk();
        $this->assertFalse(array_key_exists('ai_analysis', $response->json('data.0')),
            'Candidate history includes employer-only assessment.');
    }

    public function test_removing_profile_cv_preserves_original_submitted_cv(): void
    {
        [$candidate, $employer, $application] = $this->fixture();
        $this->actingAs($candidate, 'sanctum')->deleteJson('/api/candidate/cv')->assertOk();
        $this->actingAs($employer, 'sanctum')
            ->get("/api/applications/{$application->id}/cv")->assertOk();
    }

    public function test_apply_dispatches_ai_asynchronously(): void
    {
        $this->fixture();
        Bus::assertNotDispatchedSync(AnalyzeApplicationCv::class);
        Bus::assertDispatched(AnalyzeApplicationCv::class);
    }

    public function test_queue_failure_preserves_successfully_submitted_application(): void
    {
        Bus::shouldReceive('dispatch')->once()->andThrow(new \RuntimeException('Queue unavailable'));
        [, , $application] = $this->fixture();
        $this->assertSame('applied', $application->status);
        $this->assertSame('failed', $application->ai_analysis_status);
        Storage::disk('private')->assertExists($application->cv_path);
        $this->assertDatabaseCount('applications', 1);
    }

    public function test_profile_replacement_preserves_exact_application_snapshot(): void
    {
        [$candidate, $employer, $application] = $this->fixture();
        $profilePath = $candidate->candidateProfile->cv_file_path;
        $contents = Storage::disk('private')->get($application->cv_path);
        $this->assertNotSame($profilePath, $application->cv_path);
        $this->actingAs($candidate, 'sanctum')->post('/api/candidate/cv', [
            'cv_file' => UploadedFile::fake()->create('replacement.pdf', 20, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertOk();
        $this->assertSame($contents, Storage::disk('private')->get($application->cv_path));
        Storage::disk('private')->assertMissing($profilePath);
        $this->actingAs($employer, 'sanctum')->get("/api/applications/{$application->id}/cv")->assertOk();
    }

    public function test_legacy_application_reference_survives_profile_deletion(): void
    {
        [$candidate, $employer, $application] = $this->fixture();
        $profilePath = $candidate->candidateProfile->cv_file_path;
        $application->update(['cv_path' => $profilePath]);
        $this->actingAs($candidate, 'sanctum')->deleteJson('/api/candidate/cv')->assertOk();
        Storage::disk('private')->assertExists($profilePath);
        $this->actingAs($employer, 'sanctum')->get("/api/applications/{$application->id}/cv")->assertOk();
    }

    public function test_candidate_and_outsider_cv_requests_do_not_mark_reviewed(): void
    {
        [$candidate, , $application] = $this->fixture();
        $this->actingAs($candidate, 'sanctum')->get("/api/applications/{$application->id}/cv")->assertOk();
        $outsider = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $this->actingAs($outsider, 'sanctum')->getJson("/api/applications/{$application->id}/cv")->assertForbidden();
        $this->assertSame('applied', $application->fresh()->status);
        $this->assertNull($application->fresh()->reviewed_at);
    }

    public function test_employer_cv_view_blocks_later_withdrawal(): void
    {
        [$candidate, $employer, $application] = $this->fixture();
        $this->actingAs($employer, 'sanctum')->get("/api/applications/{$application->id}/cv")->assertOk();
        $this->actingAs($candidate, 'sanctum')
            ->deleteJson("/api/candidate/applications/{$application->id}/withdraw")->assertStatus(400);
        $this->assertSame('waiting', $application->fresh()->status);
    }

    public function test_notification_destinations_use_existing_role_specific_frontend_routes(): void
    {
        $employer = User::factory()->create(['role' => 'employer']);
        $candidate = User::factory()->create(['role' => 'candidate']);
        foreach ([
            [$employer, 'new_application', ['application_id' => 7, 'job_id' => 3], '/employer/candidates/7'],
            [$employer, 'new_application', ['job_id' => 3], '/employer/candidates?job_id=3'],
            [$candidate, 'app_status_changed', [], '/account/jobs'],
            [$candidate, 'new_message', ['conversation_id' => 4], '/account/messages?conversation=4'],
            [$employer, 'new_message', ['conversation_id' => 4], '/employer/messages?conversation=4'],
            [$employer, 'security', [], '/account/security'],
        ] as [$user, $type, $data, $destination]) {
            $notification = new Notification(['user_id' => $user->id, 'type' => $type, 'data' => $data]);
            $notification->setRelation('user', $user);
            $this->assertSame($destination, $notification->redirect_url);
        }
    }

    public function test_direct_employer_cv_view_marks_application_reviewed(): void
    {
        [, $employer, $application] = $this->fixture();
        $this->actingAs($employer, 'sanctum')
            ->get("/api/applications/{$application->id}/cv")->assertOk();
        $this->assertSame('waiting', $application->fresh()->status);
        $this->assertNotNull($application->fresh()->reviewed_at);
    }

    public function test_employer_cannot_resurrect_withdrawn_application(): void
    {
        [$candidate, $employer, $application] = $this->fixture();
        $this->actingAs($candidate, 'sanctum')
            ->deleteJson("/api/candidate/applications/{$application->id}/withdraw")->assertOk();
        $this->actingAs($employer, 'sanctum')
            ->patchJson("/api/employer/applications/{$application->id}/status", ['status' => 'accepted']);
        $this->assertSame('withdrawn', $application->fresh()->status);
    }

    public function test_unreadable_cv_does_not_produce_successful_assessment(): void
    {
        [, , $application] = $this->fixture();
        // The fixture's fake PDF has no readable text and HTTP is disabled.
        try {
            (new AnalyzeApplicationCv($application->id, $application->ai_request_id))->handle(app(GeminiService::class));
        } catch (\Throwable) {
            // A validation failure is expected; the persisted status is the contract.
        }
        $this->assertSame('failed', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->aiAnalysis);
    }

    private function fixture(): array
    {
        $candidate = User::factory()->create(['role' => 'candidate', 'status' => 'active']);
        $profile = CandidateProfile::create(['user_id' => $candidate->id, 'cv_file_path' => 'cvs/original.pdf']);
        Storage::disk('private')->put($profile->cv_file_path, '%PDF-1.4 review fixture without readable text');
        $employer = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $company = Company::create([
            'user_id' => $employer->id, 'name' => 'Review Company',
            'description' => 'Review fixture company', 'address' => 'Review address', 'city' => 'Ha Noi',
        ]);
        $category = Category::create(['name' => 'Review category']);
        $job = Job::create([
            'company_id' => $company->id, 'category_id' => $category->id,
            'title' => 'Backend developer review', 'job_level' => 'mid', 'quantity' => 1,
            'description' => 'Build software', 'requirements' => 'PHP', 'benefits' => 'Benefits',
            'salary_min' => 10000000, 'salary_max' => 20000000, 'is_negotiable' => false,
            'job_type' => 'full_time', 'city' => 'Ha Noi', 'address' => 'Review address',
            'deadline' => now()->addDays(14)->toDateString(), 'status' => 'active',
        ]);
        $response = $this->actingAs($candidate, 'sanctum')
            ->postJson("/api/jobs/{$job->id}/apply", ['cv_source' => 'profile']);
        $response->assertCreated();

        return [$candidate, $employer, Application::findOrFail($response->json('data.id'))];
    }

    private function analysis(Application $application): void
    {
        AiCvAnalysis::create([
            'application_id' => $application->id, 'match_score' => 88,
            'summary' => 'Review fixture assessment', 'matched_skills' => ['PHP'],
            'missing_skills' => ['Redis'], 'strengths' => ['PHP', 'SQL'], 'recommendations' => [],
        ]);
        $application->update(['ai_analysis_status' => 'completed']);
    }
}
