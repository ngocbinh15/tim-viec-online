<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeApplicationCv;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FrontendIntegrationContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_sort_and_level_filters_are_applied_before_pagination(): void
    {
        [, $company, $category] = $this->fixture();
        $this->job($company, $category, ['title' => 'Senior low salary', 'salary_min' => 10000000, 'salary_max' => 15000000]);
        $high = $this->job($company, $category, ['title' => 'Senior high salary', 'salary_min' => 25000000, 'salary_max' => 35000000]);
        $this->job($company, $category, ['title' => 'Junior different level', 'job_level' => 'Junior', 'salary_min' => 45000000, 'salary_max' => 55000000]);
        $this->getJson('/api/jobs?level=Senior&sort=salary_desc&per_page=1')->assertOk()
            ->assertJsonPath('meta.total', 2)->assertJsonPath('data.0.id', $high->id);
        $this->getJson('/api/jobs?sort=unsafe_sql')->assertUnprocessable();
    }

    public function test_admin_job_lists_and_detail_include_real_application_counts(): void
    {
        [, $company, $category] = $this->fixture();
        $job = $this->job($company, $category);
        $candidate = User::factory()->create(['role' => 'candidate']);
        $profile = CandidateProfile::create(['user_id' => $candidate->id]);
        Application::create(['job_id' => $job->id, 'candidate_id' => $profile->id, 'cv_path' => 'test.pdf', 'status' => 'applied']);
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/jobs')->assertOk()->assertJsonPath('data.0.applications_count', 1);
        $this->getJson('/api/admin/jobs/'.$job->id)->assertOk()->assertJsonPath('data.applications_count', 1);
    }

    public function test_public_city_alias_and_relevance_use_real_backend_data(): void
    {
        [, $company, $category] = $this->fixture();
        $company->update(['name' => 'PHP Agency']);
        $direct = $this->job($company, $category, ['title' => 'PHP Engineer', 'city' => 'TP. Hồ Chí Minh']);
        $this->job($company, $category, ['title' => 'Software engineer', 'city' => 'Hồ Chí Minh']);
        $this->getJson('/api/jobs?'.http_build_query(['city' => 'Hồ Chí Minh', 'keyword' => 'PHP', 'sort' => 'relevance', 'per_page' => 1]))
            ->assertOk()->assertJsonPath('meta.total', 2)->assertJsonPath('data.0.id', $direct->id);
    }

    public function test_ai_deferred_mode_does_not_queue_on_apply_or_employer_review(): void
    {
        config(['ai.enabled' => false, 'services.gemini.enabled' => false]);
        Bus::fake();
        Storage::fake('private');
        Storage::fake('public');
        [$employer, $company, $category] = $this->fixture();
        $job = $this->job($company, $category);
        $candidate = User::factory()->create(['role' => 'candidate']);
        CandidateProfile::create(['user_id' => $candidate->id, 'cv_file_path' => 'cvs/test.pdf']);
        Storage::disk('private')->put('cvs/test.pdf', '%PDF-1.4 test');
        $response = $this->actingAs($candidate, 'sanctum')->postJson('/api/jobs/'.$job->id.'/apply', ['cv_source' => 'profile']);
        $response->assertCreated();
        $id = $response->json('data.id');
        $this->actingAs($employer, 'sanctum')->getJson('/api/employer/applications/'.$id)->assertOk();
        Bus::assertNotDispatched(AnalyzeApplicationCv::class);
        $this->assertSame('deferred', Application::findOrFail($id)->ai_analysis_status);
        $this->postJson('/api/applications/'.$id.'/ai-analyze')->assertStatus(503);
        $service = $this->mock(\App\Services\GeminiService::class);
        $service->shouldNotReceive('analyze');
        (new AnalyzeApplicationCv($id))->handle($service);
        $this->assertSame('deferred', Application::findOrFail($id)->ai_analysis_status);
    }

    private function fixture(): array
    {
        $employer = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $company = Company::create(['user_id' => $employer->id, 'name' => 'Integration Company', 'description' => 'Software company', 'address' => 'District 1', 'city' => 'Ha Noi']);
        $category = Category::create(['name' => 'Software']);
        return [$employer, $company, $category];
    }

    private function job(Company $company, Category $category, array $overrides = []): Job
    {
        return Job::create(array_merge(['company_id' => $company->id, 'category_id' => $category->id,
            'title' => 'Senior software developer', 'job_level' => 'Senior', 'quantity' => 1,
            'description' => 'Build applications', 'requirements' => 'PHP skills', 'benefits' => 'Benefits',
            'salary_min' => 15000000, 'salary_max' => 25000000, 'is_negotiable' => false,
            'job_type' => 'full_time', 'city' => 'Ha Noi', 'address' => 'District 1', 'deadline' => now()->addDays(30), 'status' => 'active'], $overrides));
    }
}
