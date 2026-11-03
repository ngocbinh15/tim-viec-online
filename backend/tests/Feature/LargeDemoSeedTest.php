<?php

namespace Tests\Feature;

use App\Jobs\DemoSeedNoOp;
use App\Models\User;
use Database\Seeders\Demo\DemoDataset;
use Database\Seeders\Demo\DemoOptions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Queue\CallQueuedHandler;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser;
use Tests\TestCase;

class LargeDemoSeedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('private');
        Storage::fake('public');
        Http::preventStrayRequests();
        Mail::fake();
        Bus::fake();
    }

    public function test_large_preset_has_the_agreed_scale_and_dry_run_writes_nothing(): void
    {
        $options = DemoOptions::preset('large');
        $this->assertSame(1500, $options->candidates);
        $this->assertSame(120, $options->employers);
        $this->assertSame(1440, $options->jobs());
        $this->assertSame(22500, $options->applications());
        $this->artisan('demo:seed', ['--dry-run' => true])->assertSuccessful();
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('demo_seed_runs', 0);
        $this->assertEmpty(Storage::disk('private')->allFiles());
    }

    public function test_dataset_is_coherent_reentrant_and_never_contacts_external_services(): void
    {
        $existing = User::factory()->create(['name' => 'Tài khoản cần giữ']);
        $options = DemoOptions::preset('tiny');
        $dataset = app(DemoDataset::class);
        $report = $dataset->seed($options, 'DemoPassword1!');
        $this->assertSame(60, $report['counts']['applications']);
        $this->assertDatabaseCount('users', 12 + 6 + 3 + 1);
        $this->assertDatabaseCount('jobs', 36);
        $this->assertDatabaseCount('applications', 60);
        $this->assertGreaterThan(0, DB::table('conversations')->count());
        $this->assertGreaterThan(0, DB::table('messages')->count());
        $this->assertGreaterThan(0, DB::table('notifications')->count());
        $this->assertGreaterThan(0, DB::table('job_reports')->count());
        $this->assertSame(5, DB::table('applications')->distinct()->count('status'));
        $this->assertSame(3, DB::table('jobs')->distinct()->count('status'));
        $this->assertSame(4, DB::table('jobs')->distinct()->count('job_type'));
        $this->assertDatabaseCount('ai_cv_analyses', 0);
        $this->assertDatabaseCount('queue_jobs', 0);
        $this->assertSame(0, DB::table('candidate_skills')->select('candidate_id')->groupBy('candidate_id')->havingRaw('count(*) > 10')->get()->count());
        $this->assertSame(0, DB::table('applications')->where('status', 'withdrawn')->whereNotNull('reviewed_at')->count());
        $this->assertSame(0, DB::table('jobs')->whereColumn('updated_at', '<', 'created_at')->count());
        $this->assertSame(0, DB::table('applications as a')->join('jobs as j', 'j.id', '=', 'a.job_id')->whereColumn('a.created_at', '<', 'j.created_at')->count());
        $this->assertSame(0, DB::table('applications as a')->join('jobs as j', 'j.id', '=', 'a.job_id')->whereRaw('DATE(a.created_at) > j.deadline')->count());
        $this->assertSame(0, DB::table('conversations as c')->join('jobs as j', 'j.id', '=', 'c.job_id')->join('companies as co', 'co.id', '=', 'j.company_id')->whereColumn('c.employer_id', '!=', 'co.user_id')->count());
        $this->assertSame(0, DB::table('messages')->where('created_at', '>', now())->count());
        $this->assertSame(0, DB::table('notifications')->where('created_at', '>', now())->count());
        $this->assertSame(0, DB::table('jobs')->where('status', 'active')->whereDate('deadline', '<=', today())->count());
        $this->assertSame(0, DB::table('messages as m')->join('conversations as c', 'c.id', '=', 'm.conversation_id')->whereColumn('m.sender_id', '!=', 'c.candidate_id')->whereColumn('m.sender_id', '!=', 'c.employer_id')->count());
        $this->assertSame(0, DB::table('conversations as c')->join('candidate_profiles as p', 'p.user_id', '=', 'c.candidate_id')->leftJoin('applications as a', function ($join) {
            $join->on('a.candidate_id', '=', 'p.id')->on('a.job_id', '=', 'c.job_id');
        })->whereNull('a.id')->count());
        $profile = DB::table('candidate_profiles')->first();
        Storage::disk('private')->assertExists($profile->cv_file_path);
        $pdf = (new Parser)->parseFile(Storage::disk('private')->path($profile->cv_file_path));
        $this->assertStringContainsString('DEMO', $pdf->getText());
        $application = DB::table('applications')->where('candidate_id', $profile->id)->first();
        $this->assertNotSame($profile->cv_file_path, $application->cv_path);
        Storage::disk('private')->assertExists($application->cv_path);
        $this->assertTrue($dataset->seed($options, 'DifferentPass1!')['already_seeded']);
        $this->assertDatabaseCount('applications', 60);
        $this->assertSame('Tài khoản cần giữ', $existing->fresh()->name);
        Mail::assertNothingSent();
        Bus::assertNothingDispatched();
        Http::assertNothingSent();
    }

    public function test_seeded_accounts_login_and_files_enforce_ownership_while_candidates_never_receive_ai(): void
    {
        app(DemoDataset::class)->seed(DemoOptions::preset('tiny', true), 'DemoPassword1!');
        $candidate = User::where('email', 'candidate.00001@demo.timviec.test')->firstOrFail();
        $employer = User::where('email', 'employer.00001@demo.timviec.test')->firstOrFail();
        $outsider = User::where('email', 'employer.00002@demo.timviec.test')->firstOrFail();
        $application = DB::table('applications')->where('candidate_id', $candidate->candidateProfile->id)->first();
        $this->postJson('/api/login', ['email' => $candidate->email, 'password' => 'DemoPassword1!'])->assertOk();
        $this->actingAs($candidate)->getJson('/api/candidate/applications')->assertOk()->assertJsonMissingPath('data.0.ai_analysis');
        $candidateResult = $this->actingAs($candidate)->getJson('/api/candidate/applications')->json();
        $this->assertStringNotContainsString('match_score', json_encode($candidateResult));
        $this->actingAs($employer)->get('/api/applications/'.$application->id.'/cv')->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->actingAs($outsider)->get('/api/applications/'.$application->id.'/cv')->assertForbidden();
        $this->actingAs($employer)->getJson('/api/employer/applications')->assertOk();
        $this->actingAs(User::where('email', 'admin@demo.timviec.test')->firstOrFail())->getJson('/api/admin/stats')->assertOk();
    }

    public function test_optional_fixtures_cover_every_table_without_live_credentials_or_active_jobs(): void
    {
        $options = DemoOptions::preset('tiny', true, true);
        app(DemoDataset::class)->seed($options, 'DemoPassword1!');
        foreach (['ai_cv_analyses', 'sessions', 'personal_access_tokens', 'password_reset_tokens', 'cache', 'cache_locks', 'queue_jobs', 'job_batches', 'failed_jobs', 'demo_seed_runs'] as $table) {
            $this->assertGreaterThan(0, DB::table($table)->count(), $table);
        }
        $this->assertSame(0, DB::table('personal_access_tokens')->where('expires_at', '>', now())->count());
        $this->assertSame(0, DB::table('password_reset_tokens')->where('created_at', '>', now()->subMinutes(15))->count());
        $this->assertSame(0, DB::table('queue_jobs')->where('queue', '!=', 'demo-fixtures')->count());
        $this->assertSame(User::class, DB::table('personal_access_tokens')->value('tokenable_type'));
        $payload = json_decode(DB::table('queue_jobs')->value('payload'), true);
        $this->assertSame(CallQueuedHandler::class.'@call', $payload['job']);
        $noop = unserialize($payload['data']['command'], ['allowed_classes' => [DemoSeedNoOp::class]]);
        $this->assertInstanceOf(DemoSeedNoOp::class, $noop);
        $noop->handle();
        $this->assertSame(0, DB::table('ai_cv_analyses')->where('summary', 'not like', '%MINH HỌA%')->count());
    }

    public function test_production_and_changed_presets_are_rejected_without_touching_data(): void
    {
        $dataset = app(DemoDataset::class);
        $dataset->seed(DemoOptions::preset('tiny'), 'DemoPassword1!');
        $this->expectException(\RuntimeException::class);
        $dataset->seed(DemoOptions::preset('medium'), 'DemoPassword1!');
    }

    public function test_production_is_blocked_even_when_called_as_a_seeder_service(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        $this->expectException(\RuntimeException::class);
        app(DemoDataset::class)->seed(DemoOptions::preset('tiny'), 'DemoPassword1!');
    }

    public function test_missing_password_or_unknown_preset_does_not_write_data(): void
    {
        config(['demo.seed_password' => '']);
        $this->artisan('demo:seed')->assertFailed();
        $this->artisan('demo:seed', ['--preset' => 'unknown', '--dry-run' => true])->assertFailed();
        config(['demo.seed_password' => 'weak']);
        $this->artisan('demo:seed')->assertFailed();
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('demo_seed_runs', 0);
        $this->assertEmpty(Storage::disk('private')->allFiles());
    }

    public function test_existing_demo_namespace_without_manifest_is_preserved(): void
    {
        $existing = User::factory()->create(['email' => 'candidate.00001@demo.timviec.test']);
        try {
            app(DemoDataset::class)->seed(DemoOptions::preset('tiny'), 'DemoPassword1!');
            $this->fail('An existing demo account must not be adopted or overwritten.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('namespace', $exception->getMessage());
        }
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('demo_seed_runs', 0);
        $this->assertSame($existing->password, $existing->fresh()->password);
        $this->assertEmpty(Storage::disk('private')->allFiles());
    }
}
