<?php

namespace Tests\Feature;

use App\Mail\ConfirmPasswordChangeMail;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use App\Services\PasswordChangeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PasswordEmailVerificationGateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public static function roles(): array
    {
        return [['candidate'], ['employer'], ['admin']];
    }

    #[DataProvider('roles')]
    public function test_unverified_account_can_login_but_cannot_request_password_operations(string $role): void
    {
        $user = User::factory()->unverified()->create(['role' => $role, 'password' => 'OriginalPass1!']);
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'OriginalPass1!'])->assertOk();
        $missing = $this->postJson('/api/forgot-password', ['email' => 'missing@example.test'])->assertOk()->json();
        foreach (['/api/forgot-password', '/api/password/forgot'] as $path) {
            $this->assertSame($missing, $this->postJson($path, ['email' => $user->email])->assertOk()->json());
        }
        $this->actingAs($user, 'sanctum')->putJson('/api/user/change-password', [
            'current_password' => 'OriginalPass1!', 'password' => 'ChangedPass2!', 'password_confirmation' => 'ChangedPass2!',
        ])->assertForbidden()->assertJsonPath('code', 'email_verification_required');
        Mail::assertNothingSent();
        $this->assertDatabaseCount('password_reset_tokens', 0);
        $this->assertDatabaseCount('password_change_requests', 0);
        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
        // Registration verification remains accessible without using password recovery.
        $this->postJson('/api/email/resend', ['email' => $user->email])->assertOk();
    }

    public function test_revoked_verification_invalidates_previously_issued_reset_and_change_links(): void
    {
        $user = User::factory()->create(['password' => 'OriginalPass1!']);
        $user->createToken('preserved');
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $reset = Mail::sent(ResetPasswordMail::class)->sole()->token;
        $this->actingAs($user, 'sanctum')->putJson('/api/user/change-password', [
            'current_password' => 'OriginalPass1!', 'password' => 'ChangedPass2!', 'password_confirmation' => 'ChangedPass2!',
        ])->assertStatus(202);
        parse_str(parse_url(Mail::sent(ConfirmPasswordChangeMail::class)->sole()->confirmationUrl, PHP_URL_QUERY), $change);
        $user->forceFill(['email_verified_at' => null])->save();
        $this->postJson('/api/verify-reset-token', ['email' => $user->email, 'token' => $reset])->assertStatus(400);
        $this->postJson('/api/reset-password', ['email' => $user->email, 'token' => $reset, 'password' => 'ResetPass3!', 'password_confirmation' => 'ResetPass3!'])->assertStatus(400);
        $this->postJson('/api/password/change/confirm', $change)->assertStatus(400);
        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_verifying_email_allows_retry_without_a_password_request_cooldown(): void
    {
        $user = User::factory()->unverified()->create(['password' => 'OriginalPass1!']);
        $payload = ['current_password' => 'OriginalPass1!', 'password' => 'ChangedPass2!', 'password_confirmation' => 'ChangedPass2!'];
        $this->actingAs($user, 'sanctum')->putJson('/api/user/change-password', $payload)->assertForbidden();
        $user->forceFill(['email_verified_at' => now()])->save();
        $this->actingAs($user->fresh(), 'sanctum')->putJson('/api/user/change-password', $payload)->assertStatus(202);
        Mail::assertSent(ConfirmPasswordChangeMail::class, 1);
    }

    public function test_change_service_checks_fresh_verification_instead_of_stale_authenticated_identity(): void
    {
        $staleIdentity = User::factory()->create(['password' => 'OriginalPass1!']);
        $staleIdentity->fresh()->forceFill(['email_verified_at' => null])->save();
        try {
            app(PasswordChangeService::class)->request($staleIdentity, 'OriginalPass1!', 'ChangedPass2!');
            $this->fail('A stale verified identity must not bypass the current verification state.');
        } catch (HttpResponseException $exception) {
            $this->assertSame(403, $exception->getResponse()->getStatusCode());
            $this->assertSame('email_verification_required', json_decode($exception->getResponse()->getContent(), true)['code']);
        }
        Mail::assertNothingSent();
        $this->assertDatabaseCount('password_change_requests', 0);
        $this->assertTrue(Hash::check('OriginalPass1!', $staleIdentity->fresh()->password));
    }

    public function test_successful_password_operations_preserve_original_verification_timestamp(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()->subDays(7)]);
        $verifiedAt = $user->email_verified_at->toISOString();
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $token = Mail::sent(ResetPasswordMail::class)->sole()->token;
        $this->postJson('/api/reset-password', ['email' => $user->email, 'token' => $token, 'password' => 'ResetPass3!', 'password_confirmation' => 'ResetPass3!'])->assertOk();
        $this->assertSame($verifiedAt, $user->fresh()->email_verified_at->toISOString());
        $this->actingAs($user->fresh(), 'sanctum')->putJson('/api/user/change-password', [
            'current_password' => 'ResetPass3!', 'password' => 'ChangedPass2!', 'password_confirmation' => 'ChangedPass2!',
        ])->assertStatus(202);
        parse_str(parse_url(Mail::sent(ConfirmPasswordChangeMail::class)->sole()->confirmationUrl, PHP_URL_QUERY), $change);
        $this->postJson('/api/password/change/confirm', $change)->assertOk();
        $this->assertSame($verifiedAt, $user->fresh()->email_verified_at->toISOString());
    }
}
