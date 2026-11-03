<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ImportedSchemaCompatibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_repair_restores_missing_fields_without_changing_existing_users(): void
    {
        $user = User::factory()->create();
        Schema::drop('job_reports');
        Schema::table('applications', fn ($table) => $table->dropColumn(['ai_analysis_status', 'ai_analysis_error']));
        Schema::table('messages', fn ($table) => $table->dropColumn(['image_path', 'read_at']));

        $migration = require database_path('migrations/2026_10_26_000002_complete_imported_domain_schema.php');
        $migration->up();
        $migration->up();

        $this->assertTrue(Schema::hasColumns('applications', ['ai_analysis_status', 'ai_analysis_error']));
        $this->assertTrue(Schema::hasColumns('messages', ['image_path', 'read_at']));
        $this->assertTrue(Schema::hasTable('job_reports'));
        $this->assertDatabaseCount('users', 1);
        $this->assertSame($user->email, $user->fresh()->email);
        $migration->down();
        $this->assertTrue(Schema::hasTable('job_reports'));
    }
}
