<?php

namespace Tests\Feature;

use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordRecoverySecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // These tests exercise recovery authorization; throttling is independent.
        $this->withoutMiddleware(ThrottleRequests::class);
        Mail::fake();
    }

    public function test_public_recovery_aliases_hide_tokens_and_account_existence(): void
    {
        $user = User::factory()->create();

        foreach (['/api/forgot-password', '/api/password/forgot'] as $endpoint) {
            $existing = $this->postJson($endpoint, ['email' => $user->email]);
            $missing = $this->postJson($endpoint, ['email' => 'missing@example.test']);

            $existing->assertOk()->assertJsonMissingPath('data.token');
            $missing->assertOk();
            $this->assertSame($existing->json(), $missing->json());
        }

        Mail::assertSent(ResetPasswordMail::class, 2);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'missing@example.test']);
    }

    public function test_mailed_token_resets_password_once_and_revokes_existing_access_tokens(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OriginalPass1!')]);
        $user->createToken('first-session');
        $user->createToken('second-session');
        $token = $this->requestMailToken($user);
        $record = DB::table('password_reset_tokens')->where('email', $user->email)->first();
        $this->assertTrue(hash_equals(hash('sha256', $token), $record->token), 'Reset token must be stored hashed.');

        $this->postJson('/api/password/reset', $this->resetPayload($user, $token))->assertOk();
        $this->assertTrue(Hash::check('ChangedPass2!', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->postJson('/api/reset-password', $this->resetPayload($user, $token))->assertStatus(400);
    }

    public function test_invalid_token_cannot_verify_or_reset_and_does_not_consume_valid_token(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OriginalPass1!')]);
        $token = $this->requestMailToken($user);

        $this->postJson('/api/verify-reset-token', ['email' => $user->email, 'token' => 'invalid-token'])->assertStatus(400);
        $this->postJson('/api/reset-password', $this->resetPayload($user, 'invalid-token'))->assertStatus(400);
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
        $this->postJson('/api/verify-reset-token', ['email' => $user->email, 'token' => $token])->assertOk();
        $this->postJson('/api/reset-password', $this->resetPayload($user, $token))->assertOk();
    }

    public function test_expired_mailed_token_cannot_reset_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OriginalPass1!')]);
        $token = $this->requestMailToken($user);
        $this->travel(16)->minutes();

        $this->postJson('/api/reset-password', $this->resetPayload($user, $token))->assertStatus(400);
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_new_recovery_request_invalidates_previous_mailed_token(): void
    {
        $user = User::factory()->create();
        $firstToken = $this->requestMailToken($user);
        $secondToken = $this->requestMailToken($user);

        $this->postJson('/api/reset-password', $this->resetPayload($user, $firstToken))->assertStatus(400);
        $this->postJson('/api/reset-password', $this->resetPayload($user, $secondToken))->assertOk();
    }

    public function test_new_password_accepts_special_characters_and_unicode_supported_by_the_frontend(): void
    {
        foreach (['GoodPass1.', 'MậtKhẩuMới1!'] as $password) {
            $user = User::factory()->create();
            $token = $this->requestMailToken($user);
            $payload = array_replace($this->resetPayload($user, $token), ['password' => $password, 'password_confirmation' => $password]);
            $this->postJson('/api/reset-password', $payload)->assertOk();
            $this->assertTrue(Hash::check($password, $user->fresh()->password));
        }
    }

    public function test_password_exceeding_bcrypt_byte_limit_is_rejected_without_consuming_the_token(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OriginalPass1!')]);
        $token = $this->requestMailToken($user);
        $password = str_repeat('ệ', 28).'A1!';
        $this->postJson('/api/reset-password', array_replace($this->resetPayload($user, $token), ['password' => $password, 'password_confirmation' => $password]))
            ->assertStatus(422)->assertJsonValidationErrors('password');
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
        $this->postJson('/api/reset-password', $this->resetPayload($user, $token))->assertOk();
    }

    private function requestMailToken(User $user): string
    {
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $mail = Mail::sent(ResetPasswordMail::class)->last();
        $this->assertNotNull($mail);
        $this->assertTrue($mail->hasTo($user->email));

        return $mail->token;
    }

    private function resetPayload(User $user, string $token): array
    {
        return [
            'email' => $user->email,
            'token' => $token,
            'password' => 'ChangedPass2!',
            'password_confirmation' => 'ChangedPass2!',
        ];
    }
}
