<?php

namespace Tests\Feature;

use App\Models\AiCvAnalysis;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\TestCase;
use ZipArchive;

class ApplicantExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_requires_employer_and_valid_input(): void
    {
        $this->postJson('/api/employer/applications/export', [])->assertUnauthorized();
        $candidate = User::factory()->create(['role' => 'candidate']);
        $this->actingAs($candidate, 'sanctum')->postJson('/api/employer/applications/export', [])->assertForbidden();
        [$employer] = $this->fixture();
        $this->actingAs($employer, 'sanctum')->postJson('/api/employer/applications/export', ['job_ids' => [], 'mode' => 'csv'])
            ->assertUnprocessable()->assertJsonPath('success', false);
    }

    public function test_batch_rejects_a_foreign_or_missing_job_entirely(): void
    {
        [$employer, $job] = $this->fixture();
        [, $foreign] = $this->fixture();
        $this->actingAs($employer, 'sanctum')->postJson('/api/employer/applications/export', ['job_ids' => [$job->id, $foreign->id], 'mode' => 'workbook'])->assertNotFound();
        $this->postJson('/api/employer/applications/export', ['job_ids' => [$job->id, 999999], 'mode' => 'workbook'])->assertNotFound();
    }

    public function test_rejects_duplicate_invalid_and_oversized_selections_and_locked_accounts(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        [$employer, $job] = $this->fixture();
        $this->actingAs($employer, 'sanctum');
        foreach ([[], [$job->id, $job->id], [-1], ['invalid'], ['job' => $job->id], range(1, 51)] as $ids) {
            $this->postJson('/api/employer/applications/export', ['job_ids' => $ids, 'mode' => 'workbook'])->assertUnprocessable()->assertJsonPath('success', false);
        }
        $employer->update(['status' => 'locked']);
        $this->postJson('/api/employer/applications/export', ['job_ids' => [$job->id], 'mode' => 'workbook'])->assertForbidden();
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'sanctum')->postJson('/api/employer/applications/export', ['job_ids' => [$job->id], 'mode' => 'workbook'])->assertForbidden();
    }

    public function test_single_separate_file_and_ai_score_only_when_completed(): void
    {
        [$employer, $job, $application] = $this->fixture();
        AiCvAnalysis::create(['application_id' => $application->id, 'match_score' => 87, 'summary' => 'Test', 'matched_skills' => [], 'missing_skills' => [], 'strengths' => [], 'recommendations' => []]);
        foreach (['failed' => '', 'completed' => '87'] as $status => $expected) {
            $application->update(['ai_analysis_status' => $status]);
            $response = $this->actingAs($employer, 'sanctum')->postJson('/api/employer/applications/export', ['job_ids' => [$job->id], 'mode' => 'separate'])->assertOk();
            $zip = $this->openResponseZip($response->baseResponse);
            $sheet = new \SimpleXMLElement($zip->getFromName('xl/worksheets/sheet1.xml'));
            $this->assertSame($expected, (string) $sheet->sheetData->row[1]->c[12]->v);
            $zip->close();
            $this->cleanupResponse($response->baseResponse);
        }
    }

    public function test_workbook_includes_all_rows_and_string_cells_without_marking_reviewed(): void
    {
        [$employer, $job, $application] = $this->fixture();
        $user = $application->candidateProfile->user;
        $user->update(['name' => '=HYPERLINK("https://example.test")', 'phone' => '0012345678']);
        $application->update(['status' => 'withdrawn']);
        $job->update(['status' => 'closed']);
        for ($i = 0; $i < 12; $i++) {
            $profile = CandidateProfile::create(['user_id' => User::factory()->create()->id]);
            Application::create(['job_id' => $job->id, 'candidate_id' => $profile->id, 'status' => 'applied', 'cv_path' => 'private/example.pdf']);
        }
        $response = $this->actingAs($employer, 'sanctum')->postJson('/api/employer/applications/export', ['job_ids' => [$job->id], 'mode' => 'workbook'])->assertOk();
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $zip = $this->openResponseZip($response->baseResponse);
        $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $this->assertStringContainsString('0012345678', $xml);
        $this->assertStringContainsString('HYPERLINK', $xml);
        $this->assertStringNotContainsString('<f>', $xml);
        $this->assertStringNotContainsString('private/example.pdf', $xml);
        $sheet = new \SimpleXMLElement($xml);
        $this->assertCount(14, $sheet->sheetData->row);
        $zip->close();
        $this->assertNull($application->fresh()->reviewed_at);
        $this->assertSame('withdrawn', $application->fresh()->status);
        $this->cleanupResponse($response->baseResponse);
    }

    public function test_workbook_uses_unique_valid_sheets_and_separate_mode_creates_zip(): void
    {
        [$employer, $job] = $this->fixture();
        $job->update(['title' => str_repeat('A', 40).'/?:[]']);
        $second = $job->replicate();
        $second->save();
        $response = $this->actingAs($employer, 'sanctum')->postJson('/api/employer/applications/export', ['job_ids' => [$job->id, $second->id], 'mode' => 'workbook'])->assertOk();
        $zip = $this->openResponseZip($response->baseResponse);
        $workbook = new \SimpleXMLElement($zip->getFromName('xl/workbook.xml'));
        $names = [];
        foreach ($workbook->sheets->sheet as $sheet) {
            $name = (string) $sheet['name'];
            $this->assertLessThanOrEqual(31, mb_strlen($name));
            $this->assertDoesNotMatchRegularExpression('/[\\\\\[\]:*?\/]/', $name);
            $names[] = $name;
        }
        $this->assertCount(2, array_unique($names));
        $zip->close();
        $this->cleanupResponse($response->baseResponse);
        $response = $this->postJson('/api/employer/applications/export', ['job_ids' => [$job->id, $second->id], 'mode' => 'separate'])->assertOk()->assertHeader('Content-Type', 'application/zip');
        $zip = $this->openResponseZip($response->baseResponse);
        $this->assertSame(2, $zip->numFiles);
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $this->assertStringEndsWith('.xlsx', $zip->getNameIndex($i));
            $this->assertStringNotContainsString('/', $zip->getNameIndex($i));
        }
        $zip->close();
        $this->cleanupResponse($response->baseResponse);
    }

    public function test_sheet_name_cannot_end_with_an_apostrophe_after_truncation(): void
    {
        [$employer, $job] = $this->fixture();
        $prefixLength = mb_strlen($job->id.' - ');
        $job->update(['title' => str_repeat('A', 30 - $prefixLength)."'more text"]);
        $response = $this->actingAs($employer, 'sanctum')->postJson('/api/employer/applications/export', ['job_ids' => [$job->id], 'mode' => 'workbook'])->assertOk();
        $zip = $this->openResponseZip($response->baseResponse);
        $workbook = new \SimpleXMLElement($zip->getFromName('xl/workbook.xml'));
        $this->assertStringEndsNotWith("'", (string) $workbook->sheets->sheet['name']);
        $zip->close();
        $this->cleanupResponse($response->baseResponse);
    }

    public function test_generation_failure_cleans_up_private_files(): void
    {
        [$employer, $job] = $this->fixture();
        $before = glob(storage_path('app/private/applicant_exports/*')) ?: [];
        $event = 'eloquent.retrieved: '.Application::class;
        Event::listen($event, function (): void {
            throw new \RuntimeException('Simulated export read failure');
        });
        try {
            $this->actingAs($employer, 'sanctum')->postJson('/api/employer/applications/export', ['job_ids' => [$job->id], 'mode' => 'workbook'])
                ->assertStatus(500)->assertJsonPath('success', false)->assertJsonPath('errors', [])
                ->assertJsonMissingPath('exception')->assertDontSee('Simulated export read failure');
        } finally {
            Event::forget($event);
        }
        $this->assertSame($before, glob(storage_path('app/private/applicant_exports/*')) ?: []);
    }

    public function test_export_rejects_more_than_fifty_thousand_rows_without_creating_files(): void
    {
        [$employer, $firstJob] = $this->fixture();
        $jobIds = [$firstJob->id];
        for ($i = 1; $i < 50; $i++) {
            $job = $firstJob->replicate();
            $job->save();
            $jobIds[] = $job->id;
        }
        $users = [];
        for ($i = 0; $i < 1000; $i++) {
            $users[] = ['name' => 'Export candidate', 'email' => 'export-limit-'.$i.'@example.test', 'password' => 'unused', 'role' => 'candidate', 'status' => 'active'];
        }
        DB::table('users')->insert($users);
        $userIds = User::where('email', 'like', 'export-limit-%@example.test')->pluck('id');
        DB::table('candidate_profiles')->insert($userIds->map(fn ($id) => ['user_id' => $id])->all());
        $profileIds = CandidateProfile::whereIn('user_id', $userIds)->pluck('id');
        foreach ($jobIds as $jobId) {
            DB::table('applications')->insert($profileIds->map(fn ($id) => ['job_id' => $jobId, 'candidate_id' => $id, 'status' => 'applied', 'cv_path' => 'private/test.pdf'])->all());
        }
        $before = glob(storage_path('app/private/applicant_exports/*')) ?: [];
        $this->actingAs($employer, 'sanctum')->postJson('/api/employer/applications/export', ['job_ids' => $jobIds, 'mode' => 'separate'])->assertUnprocessable()->assertJsonPath('success', false);
        $this->assertSame($before, glob(storage_path('app/private/applicant_exports/*')) ?: []);
    }

    public function test_export_layout_keeps_long_contact_details_readable_and_rows_compact(): void
    {
        [$employer, $job, $application] = $this->fixture();
        $application->candidateProfile->user->update(['email' => 'candidate.long.email@example.test']);
        $response = $this->actingAs($employer, 'sanctum')->postJson('/api/employer/applications/export', ['job_ids' => [$job->id], 'mode' => 'workbook'])->assertOk();
        $zip = $this->openResponseZip($response->baseResponse);
        $sheet = new \SimpleXMLElement($zip->getFromName('xl/worksheets/sheet1.xml'));
        $this->assertSame('A1:M2', (string) $sheet->autoFilter['ref']);
        $this->assertSame('D2', (string) $sheet->sheetViews->sheetView->pane['topLeftCell']);
        $this->assertContains((string) $sheet->sheetViews->sheetView['showGridLines'], ['0', 'false']);
        $this->assertGreaterThanOrEqual(30, (float) $sheet->sheetData->row[0]['ht']);
        $this->assertGreaterThanOrEqual(32, (float) $sheet->sheetData->row[1]['ht']);
        $this->assertLessThanOrEqual(72, (float) $sheet->sheetData->row[1]['ht']);
        $emailWidth = null;
        foreach ($sheet->cols->col as $column) {
            if ((int) $column['min'] <= 4 && (int) $column['max'] >= 4) {
                $emailWidth = (float) $column['width'];
            }
        }
        $this->assertGreaterThanOrEqual(34, $emailWidth);
        $styles = new \SimpleXMLElement($zip->getFromName('xl/styles.xml'));
        $emailStyle = $styles->cellXfs->xf[(int) $sheet->sheetData->row[1]->c[3]['s']];
        $this->assertSame('0', (string) $emailStyle->alignment['wrapText']);
        $this->assertStringContainsString('candidate.long.email@example.test', $zip->getFromName('xl/worksheets/sheet1.xml'));
        $zip->close();
        $this->cleanupResponse($response->baseResponse);
    }

    private function openResponseZip(BinaryFileResponse $response): ZipArchive
    {
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($response->getFile()->getPathname()));

        return $zip;
    }

    private function cleanupResponse(BinaryFileResponse $response): void
    {
        $path = $response->getFile()->getPathname();
        $directory = dirname($path);
        ob_start();
        $response->sendContent();
        ob_end_clean();
        $this->assertFileDoesNotExist($path);
        $this->assertDirectoryDoesNotExist($directory);
    }

    private function fixture(): array
    {
        $employer = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $company = Company::create(['user_id' => $employer->id, 'name' => 'Company']);
        $category = Category::firstOrCreate(['name' => 'Engineering']);
        $job = Job::create(['company_id' => $company->id, 'category_id' => $category->id, 'title' => 'Backend developer', 'description' => 'Build software', 'requirements' => 'PHP', 'benefits' => '', 'city' => 'Ha Noi', 'deadline' => now()->addDays(10)->toDateString(), 'status' => 'active']);
        $profile = CandidateProfile::create(['user_id' => User::factory()->create(['role' => 'candidate'])->id]);
        $application = Application::create(['job_id' => $job->id, 'candidate_id' => $profile->id, 'cv_path' => 'application_cvs/snapshot.pdf', 'status' => 'applied']);

        return [$employer, $job, $application];
    }
}
