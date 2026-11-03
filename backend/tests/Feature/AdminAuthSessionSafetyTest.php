<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminAuthSessionSafetyTest extends TestCase
{
    use RefreshDatabase;

    public static function lockEndpoints(): array
    {
        return [
            'explicit status' => ['status'],
            'toggle status' => ['toggle-lock'],
        ];
    }

    #[DataProvider('lockEndpoints')]
    public function test_login_interleaved_after_revocation_cannot_leave_a_live_token(string $endpoint): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'candidate', 'password' => 'OriginalPass1!']);
        $user->createToken('existing-session');
        $loginStatus = null;
        $interleaved = false;

        // Pause the handler after revocation, precisely where the old code still
        // exposed an active account to another login. This models that ordering
        // deterministically; it does not claim to run separate database sessions.
        DB::listen(function (QueryExecuted $query) use ($user, &$loginStatus, &$interleaved): void {
            if ($interleaved || ! preg_match('/^delete from [`"]?personal_access_tokens/i', $query->sql)) {
                return;
            }
            $interleaved = true;
            $loginStatus = $this->postJson('/api/login', [
                'email' => $user->email, 'password' => 'OriginalPass1!',
            ])->status();
        });

        $this->actingAs($admin, 'sanctum')->patchJson('/api/admin/users/'.$user->id.'/'.$endpoint, ['status' => 'locked'])
            ->assertOk()->assertJsonPath('data.status', 'locked');

        $this->assertTrue($interleaved, 'The regression must exercise the revocation window.');
        $this->assertSame(403, $loginStatus);
        $this->assertSame('locked', $user->fresh()->status);
        $this->assertSame(0, $user->tokens()->count());
    }

    #[DataProvider('lockEndpoints')]
    public function test_failed_lock_rolls_back_status_and_session_revocation_together(string $endpoint): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'candidate']);
        $existing = $user->createToken('keep-on-failed-lock')->accessToken;
        $interrupted = false;

        DB::listen(function (QueryExecuted $query) use (&$interrupted): void {
            if (! $interrupted && preg_match('/^delete from [`"]?personal_access_tokens/i', $query->sql)) {
                $interrupted = true;
                throw new \RuntimeException('Injected failure after session revocation');
            }
        });

        $this->withoutExceptionHandling();
        try {
            $this->actingAs($admin, 'sanctum')->patchJson('/api/admin/users/'.$user->id.'/'.$endpoint, ['status' => 'locked']);
            $this->fail('Expected the injected revocation failure.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Injected failure after session revocation', $exception->getMessage());
        }

        $this->assertTrue($interrupted);
        $this->assertSame('active', $user->fresh()->status);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $existing->id]);
    }
}
