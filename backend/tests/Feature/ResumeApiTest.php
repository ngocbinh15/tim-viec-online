<?php

namespace Tests\Feature;

use App\Models\CandidateProfile;
use App\Models\Resume;
use App\Models\User;
use App\Services\Resumes\ResumeExportService;
use App\Services\Resumes\ResumeSchema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class ResumeApiTest extends TestCase
{
    use RefreshDatabase;

    private function document(): array
    {
        return json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
    }

    protected function setUp(): void
    {
        parent::setUp();
        config(['resumes.enabled' => true]);
    }

    public function test_all_six_templates_can_be_created_switched_and_copied_without_losing_content(): void
    {
        $keys = ['classic', 'modern', 'minimal', 'executive', 'elegant', 'technical'];
        $user = User::factory()->create(['role' => 'candidate']);
        $this->actingAs($user, 'sanctum');
        $this->getJson('/api/candidate/resume-templates')->assertOk()->assertJsonPath('data', array_map(fn ($key) => ['key' => $key, 'version' => 1], $keys));
        foreach ($keys as $index => $key) {
            $created = $this->postJson('/api/candidate/resumes', ['name' => 'CV '.$key, 'template_key' => $key, 'use_sample_data' => true])->assertCreated()->assertJsonPath('data.template_key', $key);
            $id = $created->json('data.id');
            $document = $this->document();
            $document['template_key'] = $keys[($index + 1) % count($keys)];
            $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$document])->assertOk()->assertJsonPath('data.template_key', $document['template_key'])->assertJsonPath('data.content', $document['content']);
            $copy = $this->postJson("/api/candidate/resumes/$id/duplicate", ['base_revision' => 2, 'name' => 'Bản sao'])->assertCreated()->assertJsonPath('data.template_key', $document['template_key']);
            $this->assertEquals($document['content'], $copy->json('data.content'));
        }
        $this->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'unknown'])->assertUnprocessable();
    }

    public function test_cv_collections_reject_objects_without_corrupting_the_saved_draft(): void
    {
        $user = User::factory()->create(['role' => 'candidate']);
        $id = $this->actingAs($user, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic'])->assertCreated()->json('data.id');
        foreach (['content.skills', 'content.experience', 'content.education', 'content.projects', 'content.certifications', 'content.languages', 'content.activities', 'content.basics.links', 'settings.section_order', 'settings.hidden_sections'] as $path) {
            $doc = $this->document();
            $entry = match ($path) {
                'content.basics.links' => ['id' => (string) Str::uuid(), 'label' => 'Portfolio', 'url' => 'https://example.test'],
                'settings.section_order' => 'experience',
                'settings.hidden_sections' => 'skills',
                default => ['id' => (string) Str::uuid(), ...array_fill_keys(array_keys(ResumeSchema::FIELDS[explode('.', $path)[1]]), '')],
            };
            if (in_array($path, ['content.experience', 'content.education'])) {
                $entry += ['start_month' => null, 'end_month' => null, 'current' => false];
            }
            if ($path === 'content.certifications') {
                $entry['issued_month'] = null;
            }
            $collection = $path === 'settings.section_order'
                ? array_combine(array_map(fn ($key) => 'named-'.$key, ResumeSchema::SECTIONS), ResumeSchema::SECTIONS)
                : ['named-key' => $entry];
            data_set($doc, $path, $collection);
            $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$doc])->assertUnprocessable()->assertJsonValidationErrors($path);
        }
        $this->getJson("/api/candidate/resumes/$id")->assertOk()->assertJsonPath('data.revision', 1);
    }

    public function test_copy_and_export_can_finish_concurrently_without_a_deadlock(): void
    {
        Queue::fake();
        $user = User::factory()->create(['role' => 'candidate']);
        $owner = CandidateProfile::create(['user_id' => $user->id]);
        $resume = Resume::create(['candidate_id' => $owner->id, ...$this->document()]);
        $connection = DB::connection();
        // Make these synthetic rows visible to the separate process. Restore
        // the outer RefreshDatabase transaction after explicit fixture cleanup.
        $connection->commit();
        $process = new Process([PHP_BINARY, base_path('tests/Support/resume-copy-race.php'), (string) $resume->id]);
        $process->setTimeout(12);
        try {
            $connection->beginTransaction();
            CandidateProfile::whereKey($owner->id)->lockForUpdate()->firstOrFail();
            $process->start();
            $this->assertTrue($process->waitUntil(fn ($type, $output) => str_contains($output, 'OWNER_LOCK_PENDING')));
            $export = app(ResumeExportService::class)->request($resume, 1);
            $connection->commit();
            $process->wait();
            $this->assertTrue($process->isSuccessful(), 'The concurrent copy did not complete.');
            $this->assertSame('pending', $export->status);
            $this->assertSame(2, $owner->resumes()->count());
        } finally {
            if ($connection->transactionLevel()) {
                $connection->rollBack();
            }
            if ($process->isRunning()) {
                $process->stop();
            }
            $owner->resumes()->delete();
            $user->delete();
            $connection->beginTransaction();
        }
    }

    public function test_owner_can_create_prefill_save_and_duplicate_but_stale_revision_cannot_overwrite(): void
    {
        $user = User::factory()->create(['role' => 'candidate']);
        $created = $this->actingAs($user, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'CV của tôi', 'template_key' => 'classic', 'prefill_from_profile' => true])->assertCreated();
        $id = $created->json('data.id');
        $this->assertSame($user->name, $created->json('data.content.basics.full_name'));
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$this->document()])->assertOk()->assertJsonPath('data.revision', 2);
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$this->document()])->assertConflict();
        $this->postJson("/api/candidate/resumes/$id/duplicate", ['base_revision' => 2, 'name' => 'Bản sao'])->assertCreated()->assertJsonPath('data.revision', 1);
        $list = $this->getJson('/api/candidate/resumes')->assertOk()->assertJsonPath('meta.total', 2);
        $this->assertArrayNotHasKey('content', $list->json('data.0'));
        $this->deleteJson("/api/candidate/resumes/$id")->assertOk();
    }

    public function test_auth_roles_ownership_input_and_flag_are_enforced_at_backend(): void
    {
        $this->getJson('/api/candidate/resumes')->assertUnauthorized();
        $this->actingAs(User::factory()->create(['role' => 'employer']), 'sanctum')->getJson('/api/candidate/resumes')->assertForbidden();
        $owner = User::factory()->create(['role' => 'candidate']);
        $id = $this->actingAs($owner, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic'])->assertCreated()->json('data.id');
        $this->actingAs(User::factory()->create(['role' => 'candidate']), 'sanctum')->getJson("/api/candidate/resumes/$id")->assertNotFound();
        $this->deleteJson("/api/candidate/resumes/$id")->assertNotFound();
        $this->actingAs($owner, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic', 'candidate_id' => 999])->assertUnprocessable();
        $doc = $this->document();
        $doc['content']['basics']['links'] = [['id' => (string) Str::uuid(), 'label' => 'Link', 'url' => 'file:///etc/passwd']];
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$doc])->assertUnprocessable();
        config(['resumes.enabled' => false]);
        $this->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic'])->assertStatus(503);
        $this->getJson("/api/candidate/resumes/$id")->assertOk();
        $this->deleteJson("/api/candidate/resumes/$id")->assertOk();
    }

    public function test_new_cv_can_start_with_sample_content_while_preserving_real_profile_information(): void
    {
        $user = User::factory()->create(['role' => 'candidate', 'name' => 'Nguyễn Bình', 'email' => 'binh@example.test']);
        CandidateProfile::create(['user_id' => $user->id, 'title' => 'Quản lý dự án', 'bio' => 'Giới thiệu thật của ứng viên.']);
        $created = $this->actingAs($user, 'sanctum')->postJson('/api/candidate/resumes', [
            'name' => 'CV khởi đầu', 'template_key' => 'modern', 'prefill_from_profile' => true, 'use_sample_data' => true,
        ])->assertCreated();
        $created->assertJsonPath('data.content.basics.full_name', $user->name)
            ->assertJsonPath('data.content.basics.email', $user->email)
            ->assertJsonPath('data.content.basics.headline', 'Quản lý dự án')
            ->assertJsonPath('data.content.basics.summary', 'Giới thiệu thật của ứng viên.');
        foreach (['experience', 'education', 'skills', 'languages', 'projects', 'certifications', 'activities'] as $section) {
            $this->assertNotEmpty($created->json("data.content.$section"));
        }
        $id = $created->json('data.id');
        $this->getJson("/api/candidate/resumes/$id")->assertOk()->assertJsonPath('data.content.experience', $created->json('data.content.experience'));
        $another = $this->postJson('/api/candidate/resumes', ['name' => 'CV khác', 'template_key' => 'classic', 'use_sample_data' => true])->assertCreated();
        $this->assertNotSame($created->json('data.content.experience.0.id'), $another->json('data.content.experience.0.id'));
        $this->getJson('/api/candidate/resume-templates')->assertOk()->assertJsonStructure(['sample_document' => ['content' => ['experience', 'education', 'skills']]]);
        $document = array_intersect_key($created->json('data'), ResumeSchema::empty());
        $this->assertSame(1, $document['settings']['starter_version']);
        $this->assertStringNotContainsString('Nội dung mẫu:', json_encode($document, JSON_UNESCAPED_UNICODE));
        $document['content']['education'] = [];
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$document])->assertOk();
        $this->getJson("/api/candidate/resumes/$id")->assertOk()->assertJsonPath('data.settings.starter_version', 1)->assertJsonPath('data.content.education', []);
    }

    public function test_draft_limits_pagination_and_raw_body_limit_are_enforced(): void
    {
        $user = User::factory()->create(['role' => 'candidate']);
        $owner = CandidateProfile::create(['user_id' => $user->id]);
        for ($i = 0; $i < 20; $i++) {
            $resume = Resume::create(['candidate_id' => $owner->id, ...$this->document()]);
        }
        $this->actingAs($user, 'sanctum')->getJson('/api/candidate/resumes')->assertOk()->assertJsonCount(12, 'data')->assertJsonPath('meta.total', 20)->assertJsonPath('meta.last_page', 2);
        $this->getJson('/api/candidate/resumes?page=2')->assertOk()->assertJsonCount(8, 'data');
        $this->postJson('/api/candidate/resumes', ['name' => 'Beyond limit', 'template_key' => 'classic'])->assertUnprocessable();
        $doc = $this->document();
        $doc['content']['basics']['summary'] = str_repeat('x', 131073);
        $this->putJson("/api/candidate/resumes/$resume->id", ['base_revision' => 1, ...$doc])->assertUnprocessable();
        $this->assertSame(1, $resume->fresh()->revision);
        $this->assertSame(20, $owner->resumes()->count());
    }
}
