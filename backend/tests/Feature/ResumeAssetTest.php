<?php
namespace Tests\Feature;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumeAssetTest extends TestCase
{
    use RefreshDatabase;
    public function test_images_are_private_validated_owned_and_copied_independently(): void
    {
        config(['resumes.enabled' => true]); Storage::fake('private');
        $user = User::factory()->create(['role' => 'candidate']);
        $id = $this->actingAs($user, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic'])->json('data.id');
        $asset = $this->postJson("/api/candidate/resumes/$id/assets", ['image' => UploadedFile::fake()->image('photo.jpg', 300, 300)])->assertCreated()->json('data');
        $this->assertArrayNotHasKey('path', $asset);
        $this->get("/api/candidate/resumes/$id/assets/{$asset['id']}")->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->postJson("/api/candidate/resumes/$id/assets", ['image' => UploadedFile::fake()->create('evil.svg', 1, 'image/svg+xml')])->assertUnprocessable();
        $doc = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true); $doc['content']['basics']['photo_asset_id'] = $asset['id'];
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$doc])->assertOk();
        $copy = $this->postJson("/api/candidate/resumes/$id/duplicate", ['base_revision' => 2, 'name' => 'Copy'])->assertCreated()->json('data');
        $this->assertNotSame($asset['id'], $copy['content']['basics']['photo_asset_id']);
        $this->actingAs(User::factory()->create(['role' => 'candidate']), 'sanctum')->getJson("/api/candidate/resumes/$id/assets/{$asset['id']}")->assertNotFound();
    }
}
