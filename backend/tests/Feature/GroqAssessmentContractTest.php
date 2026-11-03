<?php

namespace Tests\Feature;

use App\Exceptions\AiAnalysisException;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\User;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class GroqAssessmentContractTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'ai.provider' => 'groq', 'ai.groq.key' => 'test-only-groq-key',
            'ai.groq.model' => 'openai/gpt-oss-20b', 'services.gemini.key' => null,
        ]);
        Storage::fake('private');
        Storage::fake('public');
        Http::preventStrayRequests();
    }

    public function test_groq_isolates_untrusted_text_computes_weighted_score_and_stores_bounded_provenance_once(): void
    {
        $application = $this->fixture();
        Http::fake(['*' => Http::response($this->response())]);
        $service = app(GeminiService::class);
        $analysis = $service->analyze($application);

        $this->assertSame(75, $analysis->match_score);
        $this->assertSame(['skills' => 90, 'experience' => 80, 'education' => 60, 'orientation' => 40], $analysis->criteria_scores);
        $this->assertSame('groq', $analysis->provider);
        $this->assertSame('openai/gpt-oss-20b', $analysis->model);
        $this->assertNotEmpty($analysis->prompt_version);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $analysis->input_hash);
        $this->assertSame(['input_tokens' => 123, 'output_tokens' => 44, 'total_tokens' => 167], $analysis->token_usage);
        $this->assertStringNotContainsString('PRIVATE CV', json_encode($analysis->getAttributes()));
        $this->assertSame($analysis->id, $service->analyze($application->fresh())->id);
        Http::assertSentCount(1);
        Http::assertSent(function ($request): bool {
            $system = $request['messages'][0];
            $data = json_decode($request['messages'][1]['content'], true);
            $schema = $request['response_format']['json_schema'];

            return $request->url() === 'https://api.groq.com/openai/v1/chat/completions'
                && $request->hasHeader('Authorization', 'Bearer test-only-groq-key')
                && $system['role'] === 'system' && ! str_contains($system['content'], 'PRIVATE CV')
                && str_contains($data['cv_text'], 'PRIVATE CV')
                && str_contains($data['job_description'], 'Backend developer')
                && $request['max_completion_tokens'] === 3000
                && $request['response_format']['type'] === 'json_schema'
                && $schema['strict'] === true && $schema['schema']['additionalProperties'] === false
                && $schema['schema']['properties']['criteria_scores']['additionalProperties'] === false;
        });
    }

    public function test_strict_schema_limits_bounded_lists_with_four_named_slots(): void
    {
        $assessment = $this->assessment();
        foreach (['missing_skills', 'strengths', 'recommendations'] as $field) {
            $assessment[$field] = $this->slots($assessment[$field]);
        }
        Http::fake(['*' => Http::response(['choices' => [['finish_reason' => 'stop', 'message' => ['content' => json_encode($assessment)]]]])]);
        $analysis = app(GeminiService::class)->analyze($this->fixture());
        $this->assertSame(['English'], $analysis->missing_skills);
        $this->assertCount(2, $analysis->strengths);
        $this->assertSame([], $analysis->recommendations);
        Http::assertSent(function ($request) {
            $properties = $request['response_format']['json_schema']['schema']['properties'];
            foreach (['missing_skills', 'strengths', 'recommendations'] as $field) {
                if ($properties[$field]['type'] !== 'object' || count($properties[$field]['properties']) !== 4
                    || count($properties[$field]['required']) !== 4 || $properties[$field]['additionalProperties'] !== false) {
                    return false;
                }
            }
            return true;
        });
    }

    private function slots(array $values): array
    {
        $slots = [];
        for ($index = 0; $index < max(4, count($values)); $index++) {
            $slots['item_'.($index + 1)] = $values[$index] ?? null;
        }
        return $slots;
    }

    public function test_llama_uses_json_object_mode_with_the_same_validated_score_contract(): void
    {
        config(['ai.groq.model' => 'llama-3.3-70b-versatile']);
        Http::fake(['*' => Http::response($this->response())]);
        $analysis = app(GeminiService::class)->analyze($this->fixture());
        $this->assertSame(75, $analysis->match_score);
        Http::assertSent(fn ($request) => $request['response_format']['type'] === 'json_object');
    }

    public function test_gemini_also_requires_criteria_and_uses_the_server_weighted_score(): void
    {
        config(['ai.provider' => 'gemini', 'services.gemini.key' => 'test-only-gemini-key', 'services.gemini.model' => 'test-model']);
        $application = $this->fixture();
        $legacy = $this->assessment();
        unset($legacy['criteria_scores']);
        Http::fake(['*' => Http::sequence()
            ->push(['candidates' => [['content' => ['parts' => [['text' => json_encode($legacy)]]]]]])
            ->push(['candidates' => [['content' => ['parts' => [['text' => json_encode($this->assessment())]]]]]])]);
        $this->assertFailure($application, false);
        $analysis = app(GeminiService::class)->analyze($application);
        $this->assertSame(75, $analysis->match_score);
        $this->assertSame('gemini', $analysis->provider);
        Http::assertSent(fn ($request) => in_array('criteria_scores', $request['generationConfig']['responseSchema']['required'], true));
    }

    public static function failures(): array
    {
        return ['bad request' => [400, false], 'unauthorized' => [401, false], 'forbidden' => [403, false],
            'timeout' => [408, true], 'quota' => [429, true], 'server failure' => [500, true], 'unavailable' => [503, true]];
    }

    #[DataProvider('failures')]
    public function test_http_failures_are_classified_without_retaining_transport_secrets(int $status, bool $retryable): void
    {
        Http::fake(['*' => Http::response(['error' => ['message' => 'PRIVATE CV and secret-provider-key']], $status)]);
        $this->assertFailure($this->fixture(), $retryable);
        Http::assertSentCount(1);
    }

    public function test_provider_json_validation_failure_is_retryable_and_not_a_configuration_error(): void
    {
        Http::fake(['*' => Http::response(['error' => [
            'type' => 'invalid_request_error', 'code' => 'json_validate_failed',
            'message' => 'PRIVATE CV secret-provider-key',
            'failed_generation' => json_encode(['missing_skills' => ['a', 'b', 'c', 'd', 'e']]),
        ]], 400)]);
        $application = $this->fixture();
        try {
            app(GeminiService::class)->analyze($application);
            $this->fail('Provider schema rejection must not create an assessment.');
        } catch (AiAnalysisException $exception) {
            $this->assertSame(AiAnalysisException::INVALID_ASSESSMENT, $exception->getMessage());
            $this->assertTrue($exception->retryable);
            $this->assertNull($exception->getPrevious());
            $this->assertStringNotContainsString('PRIVATE CV', (string) $exception);
            $this->assertStringNotContainsString('secret-provider-key', (string) $exception);
        }
        Http::assertSentCount(1);
        $this->assertNull($application->fresh()->aiAnalysis);
    }

    public function test_network_failure_is_retryable_and_never_chains_the_original_exception(): void
    {
        Http::fake(fn () => throw new ConnectionException('PRIVATE CV secret-provider-key'));
        $this->assertFailure($this->fixture(), true);
    }

    public static function invalidResults(): array
    {
        return [
            'missing criteria' => ['criteria_scores', null],
            'fractional score' => ['criteria_scores', ['skills' => 10.5, 'experience' => 80, 'education' => 60, 'orientation' => 40]],
            'out of range' => ['criteria_scores', ['skills' => 101, 'experience' => 80, 'education' => 60, 'orientation' => 40]],
            'numeric string' => ['criteria_scores', ['skills' => '90', 'experience' => 80, 'education' => 60, 'orientation' => 40]],
            'long summary' => ['summary', str_repeat('word ', 80)],
            'too few strengths' => ['strengths', ['one']],
            'too many missing skills' => ['missing_skills', ['a', 'b', 'c', 'd', 'e']],
            'unbounded item' => ['matched_skills', [str_repeat('x', 301)]],
        ];
    }

    #[DataProvider('invalidResults')]
    public function test_invalid_assessment_never_becomes_a_persisted_score(string $field, mixed $value): void
    {
        $assessment = $this->assessment();
        if ($value === null) {
            unset($assessment[$field]);
        } else {
            $assessment[$field] = $value;
        }
        Http::fake(['*' => Http::response($this->response($assessment))]);
        $this->assertFailure($this->fixture(), false);
    }

    public function test_truncated_completion_and_malformed_json_are_permanent_failures(): void
    {
        foreach (['length', 'invalid-json'] as $failure) {
            $payload = $this->response();
            if ($failure === 'length') {
                $payload['choices'][0]['finish_reason'] = 'length';
            } else {
                $payload['choices'][0]['message']['content'] = '{invalid';
            }
            Http::fake(['*' => Http::response($payload)]);
            $this->assertFailure($this->fixture(), false);
        }
    }

    public function test_missing_key_and_oversized_pdf_fail_before_provider_calls(): void
    {
        $application = $this->fixture();
        config(['ai.groq.key' => null]);
        $this->assertFailure($application, false);
        config(['ai.groq.key' => 'test-only-groq-key']);
        Storage::disk('private')->put($application->cv_path, '%PDF-1.4'.str_repeat('x', 5 * 1024 * 1024));
        $this->assertFailure($application, false);
        Http::assertNothingSent();
    }

    public function test_cv_and_combined_job_description_are_bounded_before_sending(): void
    {
        $application = $this->fixture(str_repeat('A', 33000));
        $application->job->update(['description' => str_repeat('D', 17000), 'requirements' => str_repeat('R', 17000)]);
        Http::fake(['*' => Http::response($this->response())]);
        app(GeminiService::class)->analyze($application);
        Http::assertSent(function ($request): bool {
            $data = json_decode($request['messages'][1]['content'], true);

            return mb_strlen($data['cv_text']) === 32000 && mb_strlen($data['job_description']) === 16000;
        });
    }

    private function assertFailure(Application $application, bool $retryable): void
    {
        try {
            app(GeminiService::class)->analyze($application);
            $this->fail('Expected a sanitized analysis exception.');
        } catch (AiAnalysisException $exception) {
            $this->assertSame($retryable, $exception->retryable);
            $this->assertNull($exception->getPrevious());
            $this->assertStringNotContainsString('PRIVATE CV', (string) $exception);
            $this->assertStringNotContainsString('secret-provider-key', (string) $exception);
        }
        $this->assertDatabaseMissing('ai_cv_analyses', ['application_id' => $application->id]);
    }

    private function assessment(): array
    {
        return ['match_score' => 99, 'summary' => 'Phù hợp với yêu cầu kỹ thuật, cần bổ sung bằng chứng ngoại ngữ.',
            'matched_skills' => ['PHP'], 'missing_skills' => ['English'],
            'strengths' => ['Kinh nghiệm PHP', 'Thiết kế SQL'], 'recommendations' => [],
            'criteria_scores' => ['skills' => 90, 'experience' => 80, 'education' => 60, 'orientation' => 40]];
    }

    private function response(?array $assessment = null): array
    {
        $assessment ??= $this->assessment();
        if (in_array(config('ai.groq.model'), ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'], true)) {
            foreach (['missing_skills', 'strengths', 'recommendations'] as $field) {
                if (is_array($assessment[$field] ?? null)) {
                    $assessment[$field] = $this->slots($assessment[$field]);
                }
            }
        }
        return ['choices' => [['finish_reason' => 'stop', 'message' => ['content' => json_encode($assessment)]]],
            'usage' => ['prompt_tokens' => 123, 'completion_tokens' => 44, 'total_tokens' => 167]];
    }

    private function fixture(string $text = 'PRIVATE CV PHP developer with SQL experience five years'): Application
    {
        $candidate = User::factory()->create();
        $profile = CandidateProfile::create(['user_id' => $candidate->id]);
        $employer = User::factory()->create(['role' => 'employer']);
        $company = Company::create(['user_id' => $employer->id, 'name' => 'Contract Company']);
        $category = Category::firstOrCreate(['name' => 'Contract IT']);
        $job = Job::create(['company_id' => $company->id, 'category_id' => $category->id,
            'title' => 'Backend developer', 'job_level' => 'mid', 'quantity' => 1, 'description' => 'Build software',
            'requirements' => 'PHP and SQL', 'benefits' => 'Benefits', 'salary_min' => 10000000,
            'salary_max' => 20000000, 'is_negotiable' => false, 'job_type' => 'full_time',
            'city' => 'Ha Noi', 'address' => 'Contract address', 'deadline' => now()->addDays(14), 'status' => 'active']);
        $path = 'application_cvs/contract-'.$profile->id.'.pdf';
        Storage::disk('private')->put($path, $this->pdf($text));

        return Application::create(['job_id' => $job->id, 'candidate_id' => $profile->id, 'cv_path' => $path,
            'status' => 'applied', 'ai_analysis_status' => 'pending']);
    }

    private function pdf(string $text): string
    {
        $stream = 'BT /F1 12 Tf 72 720 Td ('.$text.') Tj ET';
        $objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length '.strlen($stream).">>\nstream\n".$stream."\nendstream"];
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
