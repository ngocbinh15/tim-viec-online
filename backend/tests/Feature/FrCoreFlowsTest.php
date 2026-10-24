<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeApplicationCv;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Conversation;
use App\Models\Job;
use App\Models\JobReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FrCoreFlowsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['broadcasting.default' => 'log']);
        Storage::fake('private');
        Mail::fake();
    }

    public function test_registration_creates_role_profile_and_never_returns_password_or_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Nguyen Van A',
            'email' => 'Candidate@Example.test',
            'dob' => '1995-01-01',
            'password' => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
            'role' => 'candidate',
            'phone' => '0912345678',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.email', 'candidate@example.test')
            ->assertJsonMissingPath('data.token')
            ->assertJsonMissingPath('data.user.password');

        $user = User::where('email', 'candidate@example.test')->firstOrFail();
        $this->assertTrue(Hash::check('SecurePass1!', $user->password));
        $this->assertDatabaseHas('candidate_profiles', ['user_id' => $user->id]);
        $this->assertDatabaseCount('companies', 0);
    }

    public function test_registration_rejects_underage_user_without_creating_a_record(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Nguyen Van B',
            'email' => 'young@example.test',
            'dob' => now()->subYears(14)->toDateString(),
            'password' => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
            'role' => 'candidate',
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('users', ['email' => 'young@example.test']);
    }

    public function test_five_failed_logins_temporarily_lock_account(): void
    {
        $user = $this->makeUser('candidate');

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $response = $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'WrongPass1!',
            ]);

            if ($attempt < 5) {
                $response->assertUnauthorized();
            } else {
                $response->assertForbidden();
            }
        }

        $user->refresh();
        $this->assertSame(5, $user->failed_attempts);
        $this->assertNotNull($user->locked_until);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'SecurePass1!',
        ])->assertForbidden();
    }

    public function test_candidate_cv_is_private_and_not_exposed_as_a_storage_path(): void
    {
        $candidate = $this->makeUser('candidate');
        $response = $this->actingAs($candidate, 'sanctum')->post('/api/candidate/cv', [
            'cv_file' => UploadedFile::fake()->create('resume.pdf', 20, 'application/pdf'),
        ], ['Accept' => 'application/json']);

        $response->assertOk()->assertJsonPath('data.cv_url', fn ($url) => str_contains($url, '/api/candidate/cv/file'));
        $this->assertStringNotContainsString('cvs/', $response->getContent());

        $path = $candidate->candidateProfile()->firstOrFail()->cv_file_path;
        Storage::disk('private')->assertExists($path);

        $this->actingAs($candidate, 'sanctum')->get('/api/candidate/cv/file')->assertOk();

        $otherCandidate = $this->makeUser('candidate', 'other@example.test');
        $this->actingAs($otherCandidate, 'sanctum')->get('/api/candidate/cv/file')->assertNotFound();
    }

    public function test_job_reports_are_unique_and_admin_can_resolve_them(): void
    {
        $employer = $this->makeUser('employer');
        $job = $this->makeJob($employer);
        $candidate = $this->makeUser('candidate');

        $reportResponse = $this->actingAs($candidate, 'sanctum')->postJson("/api/jobs/{$job->id}/report", [
            'reason' => 'Thông tin tuyển dụng không chính xác',
        ]);
        $reportResponse->assertCreated()->assertJsonStructure(['data' => ['id', 'job_id', 'status']]);

        $this->actingAs($candidate, 'sanctum')->postJson("/api/jobs/{$job->id}/report", [
            'reason' => 'Báo cáo lần nữa',
        ])->assertStatus(409);

        $this->assertTrue((bool) $job->fresh()->is_reported);
        $this->assertDatabaseCount('job_reports', 1);

        $admin = $this->makeUser('admin');
        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/jobs/{$job->id}/report", [
            'status' => 'resolved',
        ])->assertOk()->assertJsonPath('data.is_reported', false);

        $this->assertSame('resolved', JobReport::firstOrFail()->status);
        $this->assertFalse((bool) $job->fresh()->is_reported);
    }

    public function test_withdrawn_application_cannot_be_submitted_again(): void
    {
        Bus::fake();

        $employer = $this->makeUser('employer');
        $job = $this->makeJob($employer);
        $candidate = $this->makeUser('candidate');
        $profile = $candidate->candidateProfile()->firstOrFail();
        $cvPath = 'cvs/resume.pdf';
        Storage::disk('private')->put($cvPath, '%PDF-1.4 test document');
        $profile->update(['cv_file_path' => $cvPath]);

        $first = $this->actingAs($candidate, 'sanctum')->postJson("/api/jobs/{$job->id}/apply", [
            'cv_source' => 'profile',
        ]);
        $first->assertCreated();

        $applicationId = $first->json('data.id');
        $this->actingAs($candidate, 'sanctum')->deleteJson("/api/candidate/applications/{$applicationId}/withdraw")
            ->assertOk();

        $this->actingAs($candidate, 'sanctum')->postJson("/api/jobs/{$job->id}/apply", [
            'cv_source' => 'profile',
        ])->assertStatus(409);

        $this->assertSame('withdrawn', Application::findOrFail($applicationId)->status);
        $this->assertDatabaseCount('applications', 1);
        Bus::assertDispatched(AnalyzeApplicationCv::class);
    }

    public function test_public_search_excludes_closed_and_expired_jobs(): void
    {
        $employer = $this->makeUser('employer');
        $active = $this->makeJob($employer);
        $closed = $this->makeJob($employer);
        $closed->update(['status' => 'closed']);
        $expired = $this->makeJob($employer);
        $expired->update(['status' => 'expired', 'deadline' => now()->subDay()->toDateString()]);

        $this->getJson('/api/jobs')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $active->id);
    }

    public function test_chat_history_is_not_accessible_to_a_non_member(): void
    {
        $employer = $this->makeUser('employer');
        $candidate = $this->makeUser('candidate');
        $outsider = $this->makeUser('candidate');
        $job = $this->makeJob($employer);
        $conversation = Conversation::create([
            'candidate_id' => $candidate->id,
            'employer_id' => $employer->id,
            'job_id' => $job->id,
        ]);

        $this->actingAs($outsider, 'sanctum')
            ->getJson("/api/conversations/{$conversation->id}/messages")
            ->assertForbidden();
    }

    public function test_expiration_command_only_expires_active_overdue_jobs(): void
    {
        $employer = $this->makeUser('employer');
        $overdueActive = $this->makeJob($employer);
        $overdueActive->update(['deadline' => now()->subDay()->toDateString()]);
        $overdueClosed = $this->makeJob($employer);
        $overdueClosed->update(['status' => 'closed', 'deadline' => now()->subDay()->toDateString()]);

        Artisan::call('jobs:expire');

        $this->assertSame('expired', $overdueActive->fresh()->status);
        $this->assertSame('closed', $overdueClosed->fresh()->status);
    }

    public function test_legacy_cv_copy_is_hash_verified_and_keeps_public_source_by_default(): void
    {
        $candidate = $this->makeUser('candidate');
        $path = 'cvs/legacy-resume.pdf';
        $contents = '%PDF-1.4 legacy test CV';
        Storage::disk('public')->put($path, $contents);
        $candidate->candidateProfile()->update(['cv_file_path' => $path]);

        $this->artisan('storage:secure-legacy-cvs')->assertExitCode(0);

        Storage::disk('private')->assertExists($path);
        Storage::disk('public')->assertExists($path);
        $this->assertSame(
            hash('sha256', $contents),
            hash('sha256', Storage::disk('private')->get($path)),
        );
    }

    private function makeUser(string $role, ?string $email = null): User
    {
        static $sequence = 0;
        $sequence++;

        $user = User::create([
            'name' => ucfirst($role) . ' Test ' . $sequence,
            'email' => $email ?? strtolower($role) . $sequence . '@example.test',
            'password' => 'SecurePass1!',
            'dob' => '1990-01-01',
            'role' => $role,
            'status' => 'active',
        ]);

        if ($role === 'candidate') {
            CandidateProfile::create(['user_id' => $user->id]);
        } elseif ($role === 'employer') {
            Company::create([
                'user_id' => $user->id,
                'name' => 'Công ty ' . $sequence,
                'description' => 'Mô tả công ty phục vụ kiểm thử.',
                'address' => 'Quận 1',
                'city' => 'Hồ Chí Minh',
            ]);
        }

        return $user->fresh();
    }

    private function makeJob(User $employer): Job
    {
        $category = Category::firstOrCreate(['name' => 'Công nghệ thông tin']);

        return Job::create([
            'company_id' => $employer->company->id,
            'category_id' => $category->id,
            'title' => 'Kỹ sư phần mềm kiểm thử',
            'job_level' => 'mid',
            'quantity' => 1,
            'description' => 'Mô tả công việc kiểm thử nghiệp vụ.',
            'requirements' => 'Có kinh nghiệm phát triển ứng dụng.',
            'benefits' => 'Chế độ theo quy định.',
            'salary_min' => 15000000,
            'salary_max' => 25000000,
            'is_negotiable' => false,
            'job_type' => 'full_time',
            'city' => 'Hồ Chí Minh',
            'address' => 'Quận 1',
            'deadline' => now()->addDays(14)->toDateString(),
            'status' => 'active',
        ]);
    }
}
