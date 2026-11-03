<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Conversation;
use App\Models\Job;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployerWorkspaceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_aggregate_is_scoped_paginated_and_retains_withdrawn_closed_job_applications(): void
    {
        [$employer, $candidate, $job, $application] = $this->fixture();
        $application->update(['status' => 'withdrawn']);
        $job->update(['status' => 'closed']);
        $this->actingAs($employer, 'sanctum')->getJson('/api/employer/applications?per_page=1')
            ->assertOk()->assertJsonPath('data.0.id', $application->id)
            ->assertJsonPath('data.0.status', 'withdrawn')->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.candidate.user_id', $candidate->id);
        $other = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $this->actingAs($other, 'sanctum')->getJson('/api/employer/applications')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($candidate, 'sanctum')->getJson('/api/employer/applications')->assertForbidden();
    }

    public function test_conversations_expose_owned_application_and_participant_ids_even_after_withdrawal(): void
    {
        [$employer, $candidate, $job, $application] = $this->fixture();
        $application->update(['status' => 'withdrawn']);
        Conversation::create(['candidate_id' => $candidate->id, 'employer_id' => $employer->id, 'job_id' => $job->id]);
        $this->actingAs($employer, 'sanctum')->getJson('/api/conversations')->assertOk()
            ->assertJsonPath('data.0.application_id', $application->id)
            ->assertJsonPath('data.0.candidate_id', $candidate->id)
            ->assertJsonPath('data.0.employer_id', $employer->id);
    }

    public function test_candidate_can_open_the_owning_employer_chat_without_client_partner_identity(): void
    {
        [$employer, $candidate, $job] = $this->fixture();
        $this->actingAs($candidate, 'sanctum')->postJson('/api/conversations', ['job_id' => $job->id])
            ->assertOk()->assertJsonPath('data.employer_id', $employer->id)
            ->assertJsonPath('data.candidate_id', $candidate->id);
        $this->actingAs($employer, 'sanctum')->postJson('/api/conversations', ['job_id' => $job->id])
            ->assertUnprocessable();
    }

    private function fixture(): array
    {
        $employer = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $candidate = User::factory()->create(['role' => 'candidate', 'status' => 'active']);
        $profile = CandidateProfile::create(['user_id' => $candidate->id]);
        $company = Company::create(['user_id' => $employer->id, 'name' => 'Company']);
        $category = Category::create(['name' => 'Engineering']);
        $job = Job::create(['company_id' => $company->id, 'category_id' => $category->id, 'title' => 'Backend developer', 'description' => 'Build software', 'requirements' => 'PHP', 'benefits' => '', 'city' => 'Ha Noi', 'deadline' => now()->addDays(10)->toDateString(), 'status' => 'active']);
        $application = Application::create(['job_id' => $job->id, 'candidate_id' => $profile->id, 'cv_path' => 'application_cvs/snapshot.pdf', 'status' => 'applied']);
        return [$employer, $candidate, $job, $application];
    }
}
