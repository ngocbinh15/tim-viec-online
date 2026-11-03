<?php

namespace Tests\Feature;

use App\Models\AiCvAnalysis;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Conversation;
use App\Models\Job;
use App\Models\Notification;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WorkspaceBootstrapTest extends TestCase
{
    use RefreshDatabase;

    public function test_bootstrap_requires_an_active_account_and_supported_role(): void
    {
        $this->getJson('/api/workspace/bootstrap')->assertUnauthorized();
        $locked = User::factory()->create(['role' => 'candidate', 'status' => 'locked']);
        $this->actingAs($locked, 'sanctum')->getJson('/api/workspace/bootstrap')->assertForbidden();
        $locked->status = 'active';
        $locked->role = 'unsupported';
        $this->actingAs($locked, 'sanctum')->getJson('/api/workspace/bootstrap')->assertForbidden();
    }

    public function test_candidate_gets_complete_owned_collections_without_employer_or_ai_data(): void
    {
        [$employer, $candidate, $otherCandidate, $company, $jobs] = $this->fixture();
        $profile = $candidate->candidateProfile;
        $profile->savedJobs()->attach($jobs->modelKeys());
        $conversation = Conversation::create(['candidate_id' => $candidate->id, 'employer_id' => $employer->id, 'job_id' => $jobs->first()->id]);
        Conversation::create(['candidate_id' => $otherCandidate->id, 'employer_id' => $employer->id, 'job_id' => $jobs->first()->id]);
        $this->notifications($candidate, 111);
        $this->notifications($otherCandidate, 2);
        $application = Application::where('candidate_id', $profile->id)->first();
        AiCvAnalysis::create(['application_id' => $application->id, 'match_score' => 91, 'summary' => 'Private employer assessment', 'matched_skills' => ['PHP'], 'missing_skills' => [], 'strengths' => [], 'recommendations' => []]);

        $response = $this->actingAs($candidate, 'sanctum')->getJson('/api/workspace/bootstrap?role=admin&user_id='.$otherCandidate->id)
            ->assertOk()->assertJsonPath('data.role', 'candidate')
            ->assertJsonPath('data.profile.user.id', $candidate->id)
            ->assertJsonCount(110, 'data.saved_jobs')->assertJsonCount(110, 'data.applications')
            ->assertJsonCount(111, 'data.notifications')->assertJsonCount(1, 'data.conversations')
            ->assertJsonPath('data.conversations.0.id', $conversation->id)
            ->assertJsonPath('data.conversation_jobs.0.id', $jobs->first()->id)
            ->assertJsonPath('data.notification_counts.total', 111)
            ->assertJsonMissingPath('data.company')->assertJsonMissingPath('data.users')
            ->assertJsonMissingPath('data.applications.0.ai_analysis_status')
            ->assertJsonMissingPath('data.applications.0.ai_analysis');
        $this->assertStringNotContainsString('Private employer assessment', $response->getContent());
        $this->assertStringNotContainsString('match_score', $response->getContent());
        $this->assertStringContainsString('private', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertSame($jobs->modelKeys(), collect($response->json('data.saved_jobs'))->pluck('id')->sort()->values()->all());
        $this->assertSame($this->getJson('/api/candidate/profile')->json('data'), $response->json('data.profile'));
        $this->assertSame($this->getJson('/api/notifications')->json('meta.total'), $response->json('data.notification_counts.total'));
    }

    public function test_employer_gets_all_jobs_and_applications_but_no_other_company_rows(): void
    {
        [$employer, $candidate, $otherCandidate, $company, $jobs] = $this->fixture();
        $otherEmployer = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $otherCompany = Company::create(['user_id' => $otherEmployer->id, 'name' => 'Unrelated company']);
        $otherJob = $jobs->first()->replicate();
        $otherJob->company_id = $otherCompany->id;
        $otherJob->save();
        Application::create(['candidate_id' => $candidate->candidateProfile->id, 'job_id' => $otherJob->id, 'cv_path' => 'application_cvs/private.pdf', 'status' => 'applied']);
        $this->notifications($employer, 111);
        $this->notifications($otherEmployer, 2);
        DB::enableQueryLog();
        DB::flushQueryLog();
        $response = $this->actingAs($employer, 'sanctum')->getJson('/api/workspace/bootstrap?company_id='.$otherCompany->id)
            ->assertOk()->assertJsonPath('data.role', 'employer')
            ->assertJsonPath('data.company.id', $company->id)
            ->assertJsonCount(110, 'data.jobs')->assertJsonCount(110, 'data.applications')
            ->assertJsonCount(111, 'data.notifications')
            ->assertJsonMissingPath('data.users')->assertJsonMissingPath('data.profile');
        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();
        $this->assertLessThan(60, $queryCount, 'A large employer workspace must avoid per-row SQL queries.');
        $this->assertSame($jobs->modelKeys(), collect($response->json('data.jobs'))->pluck('id')->sort()->values()->all());
        $this->assertSame($this->getJson('/api/employer/my-jobs')->json('meta.total'), count($response->json('data.jobs')));
        $this->assertSame($this->getJson('/api/employer/applications')->json('meta.total'), count($response->json('data.applications')));
        $this->assertSame($this->getJson('/api/employer/company')->json('data'), $response->json('data.company'));
        $this->assertNotContains($otherJob->id, collect($response->json('data.applications'))->pluck('job_id')->all());
    }

    public function test_admin_collections_are_complete_and_match_existing_api_dtos(): void
    {
        [$employer, $candidate, $otherCandidate, $company, $jobs] = $this->fixture();
        User::factory()->count(105)->create(['role' => 'candidate', 'status' => 'active']);
        for ($i = 0; $i < 105; $i++) {
            Category::create(['name' => 'Category '.$i]);
            Skill::create(['name' => 'Skill '.$i]);
        }
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/workspace/bootstrap')
            ->assertOk()->assertJsonPath('data.role', 'admin')
            ->assertJsonCount(109, 'data.users')->assertJsonCount(110, 'data.jobs')
            ->assertJsonCount(106, 'data.categories')->assertJsonCount(105, 'data.skills')
            ->assertJsonCount(14, 'data.stats.trends')
            ->assertJsonMissingPath('data.users.0.password')
            ->assertJsonMissingPath('data.users.0.remember_token')
            ->assertJsonMissingPath('data.profile');
        foreach (['users', 'jobs', 'categories', 'skills'] as $section) {
            $existing = $this->getJson('/api/admin/'.$section.'?per_page=100')->assertOk();
            $this->assertSame($existing->json('meta.total'), count($response->json('data.'.$section)));
            $this->assertSame($existing->json('data.0.id'), $response->json('data.'.$section.'.0.id'));
        }
        $response->assertJsonMissingPath('data.jobs.0.company')
            ->assertJsonMissingPath('data.jobs.0.category')
            ->assertJsonMissingPath('data.jobs.0.description')
            ->assertJsonMissingPath('data.jobs.0.requirements')
            ->assertJsonMissingPath('data.jobs.0.benefits')
            ->assertJsonMissingPath('data.stats.recent_applications')
            ->assertJsonMissingPath('data.stats.recent_users')
            ->assertJsonMissingPath('data.users.0.candidate_profile');
        $this->getJson('/api/admin/jobs/'.$jobs->first()->id)->assertOk()
            ->assertJsonPath('data.description', 'Build software')
            ->assertJsonPath('data.requirements', 'PHP');
        $stats = $this->getJson('/api/admin/stats?days=14')->json('data');
        unset($stats['recent_applications'], $stats['recent_users']);
        $this->assertSame($stats, $response->json('data.stats'));
    }

    public function test_new_candidate_and_employer_can_initialize_empty_workspaces(): void
    {
        $candidate = User::factory()->create(['role' => 'candidate', 'status' => 'active']);
        $this->actingAs($candidate, 'sanctum')->getJson('/api/workspace/bootstrap')
            ->assertOk()->assertJsonPath('data.profile.user.id', $candidate->id)
            ->assertJsonCount(0, 'data.applications')->assertJsonCount(0, 'data.saved_jobs')
            ->assertJsonCount(0, 'data.conversation_jobs')->assertJsonPath('data.notification_counts.total', 0);
        $employer = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $this->actingAs($employer, 'sanctum')->getJson('/api/workspace/bootstrap')
            ->assertOk()->assertJsonPath('data.company.name', $employer->name)
            ->assertJsonCount(0, 'data.jobs')->assertJsonCount(0, 'data.applications');
    }

    private function fixture(): array
    {
        $employer = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $candidate = User::factory()->create(['role' => 'candidate', 'status' => 'active']);
        $otherCandidate = User::factory()->create(['role' => 'candidate', 'status' => 'active']);
        $profile = CandidateProfile::create(['user_id' => $candidate->id]);
        CandidateProfile::create(['user_id' => $otherCandidate->id]);
        $company = Company::create(['user_id' => $employer->id, 'name' => 'Owned company']);
        $category = Category::create(['name' => 'Engineering']);
        $jobs = collect();
        for ($i = 0; $i < 110; $i++) {
            $job = Job::create(['company_id' => $company->id, 'category_id' => $category->id, 'title' => 'Developer '.$i, 'description' => 'Build software', 'requirements' => 'PHP', 'benefits' => '', 'city' => 'Ha Noi', 'deadline' => now()->addDays(10)->toDateString(), 'status' => $i === 0 ? 'closed' : 'active']);
            Application::create(['candidate_id' => $profile->id, 'job_id' => $job->id, 'cv_path' => 'application_cvs/snapshot.pdf', 'status' => 'applied']);
            $jobs->push($job);
        }

        return [$employer, $candidate, $otherCandidate, $company, new Collection($jobs->all())];
    }

    private function notifications(User $user, int $count): void
    {
        Notification::withoutEvents(function () use ($user, $count) {
            for ($i = 0; $i < $count; $i++) {
                Notification::create(['user_id' => $user->id, 'title' => 'Notice '.$i, 'content' => 'Private notice', 'type' => 'system']);
            }
        });
    }
}
