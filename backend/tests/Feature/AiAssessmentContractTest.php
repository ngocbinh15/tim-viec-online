<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeApplicationCv;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\User;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AiAssessmentContractTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['broadcasting.default' => 'log', 'ai.enabled' => true, 'ai.provider' => 'gemini', 'services.gemini.key' => 'test-only-key', 'services.gemini.model' => 'test-model']);
        Storage::fake('private');
        Storage::fake('public');
        Http::preventStrayRequests();
    }

    public function test_real_pdf_parser_and_valid_provider_output_persist_once(): void
    {
        [, $employer, $application] = $this->fixture();
        Http::fake(['*' => Http::response(['candidates' => [['content' => ['parts' => [['text' => json_encode($this->assessment())]]]]]])]);
        (new AnalyzeApplicationCv($application->id))->handle(app(GeminiService::class));
        $this->assertSame('completed', $application->fresh()->ai_analysis_status);
        $this->assertSame(88, $application->fresh()->aiAnalysis->match_score);
        app(GeminiService::class)->analyze($application->fresh());
        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request['generationConfig']['responseSchema']['type'] === 'OBJECT'
            && $request['contents'][0]['parts'][0]['inlineData']['mimeType'] === 'application/pdf');
        $this->actingAs($employer, 'sanctum')->getJson("/api/applications/{$application->id}/ai-analysis")
            ->assertOk()->assertJsonPath('data.analysis.match_score', 88);
    }

    public function test_missing_key_does_not_create_analysis_and_can_be_retried_by_employer(): void
    {
        [, $employer, $application] = $this->fixture();
        config(['services.gemini.key' => null]);
        $this->assertFailedAnalysis($application);
        Http::assertNothingSent();
        Bus::fake();
        $this->actingAs($employer, 'sanctum')->postJson("/api/applications/{$application->id}/ai-analyze")
            ->assertStatus(202);
        Bus::assertDispatched(AnalyzeApplicationCv::class);
        $this->assertSame('pending', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->ai_analysis_error);
    }

    public function test_provider_error_is_failed_without_score(): void
    {
        [, , $application] = $this->fixture();
        Http::fake(['*' => Http::response(['error' => ['message' => 'provider unavailable']], 503)]);
        $this->assertFailedAnalysis($application);
        Http::assertSentCount(1);
    }

    public function test_invalid_provider_schema_does_not_get_normalized_to_fake_success(): void
    {
        [, , $application] = $this->fixture();
        Http::fake(['*' => Http::response(['candidates' => [['content' => ['parts' => [['text' => '{"match_score":999}']]]]]])]);
        $this->assertFailedAnalysis($application);
    }

    public function test_missing_and_unreadable_pdf_fail_before_http(): void
    {
        [, , $application] = $this->fixture();
        foreach ([null, '%PDF-1.4 broken', $this->pdf('')] as $content) {
            if ($content === null) {
                Storage::disk('private')->delete($application->cv_path);
            } else {
                Storage::disk('private')->put($application->cv_path, $content);
            }
            $this->assertFailedAnalysis($application);
        }
        Http::assertNothingSent();
    }

    public function test_candidate_has_no_ai_fields_and_unrelated_employer_cannot_read_or_retry(): void
    {
        [$candidate, , $application] = $this->fixture();
        $response = $this->actingAs($candidate, 'sanctum')->getJson('/api/candidate/applications')->assertOk();
        foreach (['ai_analysis', 'ai_analysis_status', 'ai_analysis_error'] as $field) {
            $this->assertArrayNotHasKey($field, $response->json('data.0'));
        }
        $other = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $this->actingAs($other, 'sanctum')->getJson("/api/applications/{$application->id}/ai-analysis")->assertForbidden();
        $this->postJson("/api/applications/{$application->id}/ai-analyze")->assertForbidden();
    }

    private function assertFailedAnalysis(Application $application): void
    {
        try {
            (new AnalyzeApplicationCv($application->id))->handle(app(GeminiService::class));
            $this->fail('Analysis should throw so the queue can retry.');
        } catch (\Exception) {
            // Assert persisted state separately so provider failure cannot masquerade as a score.
        }
        $this->assertSame('failed', $application->fresh()->ai_analysis_status);
        $this->assertNotEmpty($application->fresh()->ai_analysis_error);
        $this->assertNull($application->fresh()->aiAnalysis);
    }

    private function assessment(): array
    {
        return ['match_score' => 88, 'summary' => 'Relevant backend experience.',
            'criteria_scores' => ['skills' => 88, 'experience' => 88, 'education' => 88, 'orientation' => 88],
            'matched_skills' => ['PHP'], 'missing_skills' => [],
            'strengths' => ['PHP experience', 'SQL experience'], 'recommendations' => []];
    }

    private function pdf(string $text): string
    {
        $stream = "BT /F1 12 Tf 72 720 Td ($text) Tj ET";
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length '.strlen($stream).">>\nstream\n".$stream."\nendstream",
        ];
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
        $application = Application::create(['job_id' => $job->id, 'candidate_id' => $profile->id, 'cv_path' => $profile->cv_file_path, 'status' => 'applied', 'ai_analysis_status' => 'pending']);
        Storage::disk('private')->put($profile->cv_file_path, $this->pdf('Backend developer PHP SQL five years experience'));

        return [$candidate, $employer, $application];
    }
}
