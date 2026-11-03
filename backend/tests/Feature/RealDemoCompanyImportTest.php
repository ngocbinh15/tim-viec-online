<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use App\Services\DemoCompanyImportService;
use Database\Seeders\Demo\DemoDataset;
use Database\Seeders\Demo\DemoOptions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RealDemoCompanyImportTest extends TestCase
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

    public function test_catalog_has_121_distinct_profiles_and_valid_local_brand_images(): void
    {
        $catalog = json_decode(file_get_contents(base_path(DemoCompanyImportService::CATALOG)), true);
        $this->assertCount(121, $catalog['companies']);
        $this->assertCount(121, array_unique(array_column($catalog['companies'], 'name')));
        $this->assertCount(120, array_unique($catalog['seed_mapping']));
        foreach ($catalog['companies'] as $profile) {
            $path = base_path(dirname(DemoCompanyImportService::CATALOG).'/logos/'.$profile['key'].'.png');
            $this->assertSame($profile['sources']['logo_sha256'], hash_file('sha256', $path));
            $this->assertSame(IMAGETYPE_PNG, getimagesize($path)[2]);
            $this->assertStringStartsWith('https://', $profile['sources']['profile_url']);
            $this->assertStringStartsWith('https://', $profile['sources']['logo_url']);
        }
    }

    public function test_import_preserves_relationships_and_non_demo_companies_and_is_reentrant(): void
    {
        app(DemoDataset::class)->seed(DemoOptions::preset('tiny'), 'DemoPassword1!');
        $unrelated = Company::create(['user_id' => User::factory()->create(['role' => 'employer'])->id, 'name' => 'Công ty của người dùng']);
        $before = DB::table('companies')->orderBy('id')->pluck('user_id', 'id')->all();
        $applications = DB::table('applications')->orderBy('id')->get(['id', 'job_id', 'candidate_id', 'cv_path'])->toJson();
        $conversations = DB::table('conversations')->orderBy('id')->get()->toJson();
        $oldName = DB::table('companies')->orderBy('id')->value('name');
        $service = app(DemoCompanyImportService::class);
        $this->assertSame(6, $service->import(true)['matched']);
        $this->assertSame($oldName, DB::table('companies')->orderBy('id')->value('name'));
        $this->assertSame(6, $service->import()['updated']);
        $this->assertSame($before, DB::table('companies')->orderBy('id')->pluck('user_id', 'id')->all());
        $this->assertSame($applications, DB::table('applications')->orderBy('id')->get(['id', 'job_id', 'candidate_id', 'cv_path'])->toJson());
        $this->assertSame($conversations, DB::table('conversations')->orderBy('id')->get()->toJson());
        $this->assertSame('Công ty của người dùng', $unrelated->fresh()->name);
        $company = Company::orderBy('id')->firstOrFail();
        $this->assertSame('CMC Global', $company->name);
        $this->assertSame($company->logo, $company->avatar);
        $this->assertTrue($company->is_demo);
        Storage::disk('public')->assertExists($company->avatar);
        $this->assertSame(0, DB::table('jobs')->where('description', 'like', '%'.$oldName.'%')->count());
        $company->update(['description' => 'Nội dung người dùng đã chỉnh sửa']);
        $this->assertSame(6, $service->import()['skipped']);
        $this->assertSame('Nội dung người dùng đã chỉnh sửa', $company->fresh()->description);
        $sources = $company->fresh()->reference_sources;
        $sources['logo_sha256'] = str_repeat('0', 64);
        DB::table('companies')->where('id', $company->id)->update(['reference_sources' => json_encode($sources)]);
        $this->assertSame(1, $service->import()['updated']);
        $this->assertSame('Nội dung người dùng đã chỉnh sửa', $company->fresh()->description);
        $response = $this->getJson('/api/companies/'.$company->id)->assertOk();
        $this->assertSame($response->json('data.logo'), $response->json('data.avatar'));
        $response->assertJsonPath('data.is_demo', true);
        Http::assertNothingSent();
        Mail::assertNothingSent();
        Bus::assertNothingDispatched();
    }

    public function test_legacy_profile_is_updated_and_avatar_upload_remains_compatible_with_logo(): void
    {
        $owner = User::factory()->create(['role' => 'employer', 'email' => 'employer@timviec.vn']);
        $company = Company::create(['user_id' => $owner->id, 'name' => 'FPT Software']);
        $this->assertSame(1, app(DemoCompanyImportService::class)->import()['updated']);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRFsAAAAASUVORK5CYII=');
        $this->actingAs($owner)->post('/api/employer/company', [
            'name' => 'FPT Software', 'description' => 'Hồ sơ thử nghiệm',
            'address' => 'Hà Nội', 'city' => 'Hà Nội',
            'avatar' => UploadedFile::fake()->createWithContent('brand.png', $png),
        ], ['Accept' => 'application/json'])->assertOk();
        $company->refresh();
        $this->assertSame($company->logo, $company->avatar);
        $this->assertStringStartsWith('company_logos/', $company->avatar);
        Storage::disk('public')->assertExists($company->avatar);
    }

    public function test_production_import_is_rejected(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        $this->expectException(\RuntimeException::class);
        app(DemoCompanyImportService::class)->import();
    }
}
