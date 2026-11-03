<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumePruneTest extends TestCase
{
    use RefreshDatabase;

    public function test_pruning_is_scoped_dry_run_counts_once_and_keeps_submitted_cvs(): void
    {
        Storage::fake('private');
        $disk = Storage::disk('private');
        foreach (['resume_exports/tmp/old.pdf', 'application_cvs/keep.pdf'] as $path) {
            $disk->put($path, '%PDF-');
            touch($disk->path($path), now()->subDays(2)->timestamp);
        }
        $this->artisan('resumes:prune', ['--dry-run' => true])->expectsOutput('Would remove: 1 abandoned files.')->assertSuccessful();
        $this->assertTrue($disk->exists('resume_exports/tmp/old.pdf'));
        $this->artisan('resumes:prune')->expectsOutput('Removed: 1 abandoned files.')->assertSuccessful();
        $this->assertFalse($disk->exists('resume_exports/tmp/old.pdf'));
        $this->assertTrue($disk->exists('application_cvs/keep.pdf'));
    }
}
