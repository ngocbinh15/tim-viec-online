<?php

namespace Tests\Feature;

use App\Jobs\RenderResumePdf;
use App\Models\ResumeExport;
use App\Models\User;
use App\Services\Resumes\RenderInput;
use App\Services\Resumes\ResumePdfRenderer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser;
use Tests\TestCase;

class ResumeExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_download_name_uses_the_exported_candidate_name_and_preserves_vietnamese(): void
    {
        config(['resumes.enabled' => true]);
        Storage::fake('private');
        $user = User::factory()->create(['role' => 'candidate']);
        $id = $this->actingAs($user, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'Tên bản nháp', 'template_key' => 'classic'])->json('data.id');
        $document = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
        $export = ResumeExport::create(['resume_id' => $id, 'revision' => 1, 'renderer_version' => '3', 'input_hash' => str_repeat('a', 64), 'input_snapshot' => $document, 'status' => 'ready', 'path' => 'exports/check.pdf']);
        Storage::disk('private')->put($export->path, '%PDF-1.4');
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...array_replace_recursive($document, ['content' => ['basics' => ['full_name' => 'Tên đã sửa sau khi xuất']]])])->assertOk();
        $this->getJson("/api/candidate/resume-exports/{$export->id}")->assertOk()->assertJsonPath('data.file_name', 'Nguyễn Minh An CV.pdf');
        $file = $this->get("/api/candidate/resume-exports/{$export->id}/file")->assertOk();
        $disposition = $file->headers->get('Content-Disposition');
        $this->assertStringStartsWith('inline;', $disposition);
        $this->assertStringContainsString('Nguyễn Minh An CV.pdf', rawurldecode($disposition));
    }

    public function test_download_name_removes_path_characters_and_controls_without_losing_accents(): void
    {
        $export = new ResumeExport(['input_snapshot' => ['content' => ['basics' => ['full_name' => "  Nguyễn / Minh\\An\r\n:*?\"<>|  "]]]]);
        $this->assertSame('Nguyễn Minh An CV.pdf', $export->downloadName());
        $export->input_snapshot = ['content' => ['basics' => ['full_name' => '...']]];
        $this->assertSame('CV.pdf', $export->downloadName());
    }

    public function test_renderer_accepts_a_name_split_across_lines_without_losing_its_text(): void
    {
        Storage::fake('private');
        $document = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
        $document['content']['basics']['full_name'] = "Nguyễn   Minh\nAn ".str_repeat('W', 50);
        $result = app(ResumePdfRenderer::class)->render(new RenderInput($document));
        $pdf = (new Parser)->parseContent(Storage::disk('private')->get($result->tempPath));
        $this->assertStringContainsString(
            preg_replace('/\s+/u', '', $document['content']['basics']['full_name']),
            preg_replace('/\s+/u', '', $pdf->getText()),
        );
        $this->assertGreaterThan(1000, $result->size);
    }

    public function test_export_snapshot_deduplicates_jobs_and_never_changes_on_later_edits(): void
    {
        config(['resumes.enabled' => true]);
        Queue::fake();
        $user = User::factory()->create(['role' => 'candidate']);
        $id = $this->actingAs($user, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic'])->json('data.id');
        $doc = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$doc])->assertOk();
        $first = $this->postJson("/api/candidate/resumes/$id/exports", ['revision' => 2])->assertStatus(202)->json('data');
        $this->postJson("/api/candidate/resumes/$id/exports", ['revision' => 2])->assertStatus(202)->assertJsonPath('data.id', $first['id']);
        Queue::assertPushed(RenderResumePdf::class, 1);
        $doc['name'] = 'CV sửa sau';
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 2, ...$doc])->assertOk();
        $this->assertSame('CV tổng hợp kiểm thử', ResumeExport::find($first['id'])->input_snapshot['name']);
        $this->postJson("/api/candidate/resumes/$id/exports", ['revision' => 2])->assertConflict();
        $this->getJson("/api/candidate/resume-exports/{$first['id']}/file")->assertConflict();
        $this->actingAs(User::factory()->create(['role' => 'candidate']), 'sanctum')->getJson("/api/candidate/resume-exports/{$first['id']}")->assertNotFound();
    }

    public function test_real_node_renderer_publishes_private_text_pdf_and_stale_job_cannot_overwrite(): void
    {
        config(['resumes.enabled' => true]);
        Storage::fake('private');
        Queue::fake();
        $user = User::factory()->create(['role' => 'candidate']);
        $this->actingAs($user, 'sanctum');
        $id = $this->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic'])->json('data.id');
        $doc = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$doc])->assertOk();
        $exportId = $this->postJson("/api/candidate/resumes/$id/exports", ['revision' => 2])->json('data.id');
        $export = ResumeExport::findOrFail($exportId);
        $job = new RenderResumePdf($export->id, $export->attempt_token);
        $job->handle(app(ResumePdfRenderer::class));
        $export->refresh();
        $this->assertSame('ready', $export->status);
        $this->assertGreaterThan(1000, $export->size);
        $hash = $export->sha256;
        (new RenderResumePdf($export->id, 'old-token'))->handle(app(ResumePdfRenderer::class));
        $this->assertSame($hash, $export->fresh()->sha256);
        $pdf = (new Parser)->parseContent(Storage::disk('private')->get($export->path));
        $this->assertStringContainsString('Nguyễn Minh An', $pdf->getText());
        $this->get("/api/candidate/resume-exports/$exportId/file")->assertOk()->assertHeader('Content-Type', 'application/pdf');
        // A lost storage object must be recoverable without editing the CV.
        $oldToken = $export->attempt_token;
        Storage::disk('private')->delete($export->path);
        $this->postJson("/api/candidate/resumes/$id/exports", ['revision' => 2])->assertStatus(202)->assertJsonPath('data.id', $exportId);
        $export->refresh();
        $this->assertNotSame($oldToken, $export->attempt_token);
        $this->assertNull($export->path);
        $this->assertNull($export->sha256);
        $this->assertNull($export->size);
        $this->assertNull($export->page_count);
        Queue::assertPushed(RenderResumePdf::class, 2);
        $job->handle(app(ResumePdfRenderer::class));
        $this->assertSame('pending', $export->fresh()->status);
        (new RenderResumePdf($export->id, $export->attempt_token))->handle(app(ResumePdfRenderer::class));
        $this->get("/api/candidate/resume-exports/$exportId/file")->assertOk();
    }
}
