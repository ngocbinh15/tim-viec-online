<?php

namespace Tests\Feature;

use App\Models\CandidateProfile;
use App\Models\Resume;
use App\Models\ResumeExport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_documents_and_exports_are_owned_cast_and_isolated_from_legacy_cv(): void
    {
        $owner = CandidateProfile::create(['user_id' => User::factory()->create()->id, 'cv_file_path' => 'cvs/legacy.pdf']);
        $document = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
        $resume = Resume::create(['candidate_id' => $owner->id, ...$document]);
        $this->assertIsArray($resume->fresh()->content);
        $this->assertSame(1, $resume->fresh()->revision);
        $export = ResumeExport::create(['resume_id' => $resume->id, 'revision' => 1, 'renderer_version' => '1', 'input_hash' => str_repeat('a', 64), 'input_snapshot' => $document]);
        $this->assertSame('pending', $export->fresh()->status);
        $resume->delete();
        $this->assertDatabaseMissing('resume_exports', ['id' => $export->id]);
        $this->assertSame('cvs/legacy.pdf', $owner->fresh()->cv_file_path);
    }
}
