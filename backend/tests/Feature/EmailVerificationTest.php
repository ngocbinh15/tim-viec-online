<?php

namespace Tests\Feature;

use App\Mail\VerifyEmailMail;
use App\Models\User;
use App\Services\EmailVerificationService;
use App\Services\PasswordRecoveryService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_registration_sends_single_use_hashed_verification_link_without_session(): void
    {
        config(['app.frontend_url' => 'https://jobs.example.test']);
        $response = $this->postJson('/api/register', [
            'name' => 'Ứng Viên', 'email' => 'new@example.test', 'dob' => '1995-01-01', 'role' => 'candidate',
            'password' => 'OriginalPass1!', 'password_confirmation' => 'OriginalPass1!',
        ])->assertCreated()->assertJsonPath('data.user.email_verified_at', null);
        $this->assertArrayNotHasKey('token', $response->json('data'));
        $user = User::whereEmail('new@example.test')->firstOrFail();
        $mail = Mail::sent(VerifyEmailMail::class)->sole();
        parse_str(parse_url($mail->verificationUrl, PHP_URL_QUERY), $query);
        $this->assertStringStartsWith('https://jobs.example.test/verify-email?', $mail->verificationUrl);
        $this->assertSame(64, strlen($query['token']));
        $this->assertDatabaseHas('email_verification_tokens', ['user_id' => $user->id, 'token' => hash('sha256', $query['token'])]);
        $this->assertStringNotContainsString($query['token'], $response->getContent());
        $this->assertNull($user->email_verified_at);
        $mail->assertSeeInText('60 phút');
        $mail->assertDontSeeInHtml('OriginalPass1!');
        $this->getJson('/api/email/verify?'.http_build_query($query))->assertStatus(405);
        Event::fake([Verified::class]);
        $this->postJson('/api/email/verify', $query)->assertOk()->assertJsonPath('data.verified', true);
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertDatabaseMissing('email_verification_tokens', ['user_id' => $user->id]);
        Event::assertDispatched(Verified::class);
        $this->postJson('/api/email/verify', $query)->assertStatus(400)->assertJsonPath('code', 'invalid_verification_token');
    }

    public function test_resend_is_generic_and_replaces_old_link_with_account_and_ip_throttles(): void
    {
        $user = User::factory()->unverified()->create();
        $generic = $this->postJson('/api/email/resend', ['email' => strtoupper($user->email)])->assertOk()->json();
        $missing = $this->postJson('/api/email/resend', ['email' => 'missing@example.test'])->assertOk()->json();
        $verified = User::factory()->create();
        $this->assertSame($generic, $missing);
        $this->assertSame($generic, $this->postJson('/api/email/resend', ['email' => $verified->email])->assertOk()->json());
        $this->postJson('/api/email/resend', ['email' => $user->email])->assertStatus(429);
        $first = Mail::sent(VerifyEmailMail::class)->sole();
        parse_str(parse_url($first->verificationUrl, PHP_URL_QUERY), $old);
        $this->travel(61)->seconds();
        $this->postJson('/api/email/resend', ['email' => $user->email])->assertOk();
        $this->postJson('/api/email/verify', $old)->assertStatus(400);
        Mail::assertSent(VerifyEmailMail::class, 2);
    }

    public function test_expired_wrong_and_malformed_tokens_do_not_verify_or_unlock(): void
    {
        $user = User::factory()->unverified()->create(['status' => 'locked']);
        $token = str_repeat('a', 64);
        DB::table('email_verification_tokens')->insert([
            'user_id' => $user->id, 'email' => $user->email, 'token' => hash('sha256', $token),
            'created_at' => now()->subHour(), 'expires_at' => now(),
        ]);
        $this->postJson('/api/email/verify', ['email' => $user->email, 'token' => $token])->assertStatus(400);
        $this->postJson('/api/email/verify', ['email' => $user->email, 'token' => str_repeat('b', 64)])->assertStatus(400);
        $this->postJson('/api/email/verify', ['email' => ['bad'], 'token' => ['bad']])->assertUnprocessable();
        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertSame('locked', $user->fresh()->status);
    }

    public function test_unverified_accounts_can_login_and_read_account_but_cannot_apply_publish_or_send(): void
    {
        $user = User::factory()->unverified()->create(['role' => 'candidate', 'password' => 'OriginalPass1!']);
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'OriginalPass1!'])->assertOk();
        $this->actingAs($user, 'sanctum')->getJson('/api/user')->assertOk()->assertJsonPath('data.email_verified_at', null);
        foreach (['/api/jobs/999/apply', '/api/conversations', '/api/conversations/999/messages'] as $path) {
            $this->postJson($path)->assertForbidden()->assertJsonPath('code', 'email_verification_required');
        }
        $employer = User::factory()->unverified()->create(['role' => 'employer']);
        $this->actingAs($employer, 'sanctum')->postJson('/api/employer/jobs')->assertForbidden()->assertJsonPath('code', 'email_verification_required');
        $this->putJson('/api/employer/jobs/999')->assertForbidden()->assertJsonPath('code', 'email_verification_required');
        $this->patchJson('/api/employer/jobs/999/status')->assertForbidden()->assertJsonPath('code', 'email_verification_required');
    }

    public function test_changing_email_invalidates_verification_and_old_link_even_when_changed_back(): void
    {
        $user = User::factory()->unverified()->create(['role' => 'candidate']);
        app(EmailVerificationService::class)->sendLink($user->email);
        $mail = Mail::sent(VerifyEmailMail::class)->sole();
        parse_str(parse_url($mail->verificationUrl, PHP_URL_QUERY), $old);
        $oldEmail = $user->email;
        $this->actingAs($user, 'sanctum')->putJson('/api/candidate/profile', ['email' => 'changed@example.test'])->assertOk();
        $this->putJson('/api/candidate/profile', ['email' => $oldEmail])->assertOk();
        $this->postJson('/api/email/verify', $old)->assertStatus(400);
        $this->assertNull($user->fresh()->email_verified_at);
        $user->forceFill(['email_verified_at' => now()])->save();
        $this->actingAs($user->fresh(), 'sanctum')->putJson('/api/candidate/profile', ['email' => strtoupper($oldEmail)])->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->putJson('/api/candidate/profile', ['email' => 'another@example.test'])->assertOk();
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_smtp_failure_is_private_and_registration_account_is_retained(): void
    {
        Mail::shouldReceive('to')->once()->andReturnSelf();
        Mail::shouldReceive('send')->once()->andThrow(new \RuntimeException('private SMTP secret'));
        Log::shouldReceive('warning')->once()->with('Verification email could not be sent', \Mockery::on(fn ($context) => array_keys($context) === ['user_id']));
        $response = $this->postJson('/api/register', [
            'name' => 'Ứng Viên', 'email' => 'smtp-failure@example.test', 'dob' => '1995-01-01', 'role' => 'candidate',
            'password' => 'OriginalPass1!', 'password_confirmation' => 'OriginalPass1!',
        ])->assertCreated();
        $this->assertStringNotContainsString('private', $response->getContent());
        $this->assertDatabaseHas('users', ['email' => 'smtp-failure@example.test']);
        $this->assertDatabaseCount('email_verification_tokens', 0);
    }

    public function test_profile_email_changes_cannot_bypass_send_limits_across_both_aliases(): void
    {
        $user = User::factory()->create(['role' => 'candidate']);
        $this->actingAs($user, 'sanctum');
        foreach (['one', 'two', 'three'] as $name) {
            $this->putJson('/api/candidate/profile', ['email' => $name.'@example.test'])->assertOk();
        }
        $this->postJson('/api/candidate/profile', ['email' => 'four@example.test'])->assertStatus(429);
        $this->assertSame('three@example.test', $user->fresh()->email);
        Mail::assertSent(VerifyEmailMail::class, 3);
        $this->putJson('/api/candidate/profile', ['title' => 'Developer'])->assertOk();
    }

    public function test_stale_profile_request_does_not_delete_reassigned_mailbox_recovery(): void
    {
        $user = User::factory()->create(['role' => 'candidate']);
        $stale = $user->replicate();
        $stale->id = $user->id;
        $oldEmail = $user->email;
        app(EmailVerificationService::class)->updateUser($user, ['email' => 'current-mailbox@example.test']);
        $newOwner = User::factory()->create(['email' => $oldEmail]);
        app(PasswordRecoveryService::class)->sendLink($newOwner->email);
        $this->assertDatabaseHas('password_reset_tokens', ['user_id' => $newOwner->id]);
        app(EmailVerificationService::class)->updateUser($stale, ['email' => 'third-mailbox@example.test']);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $oldEmail, 'user_id' => $newOwner->id]);
    }

    public function test_active_account_expiry_boundary_wrong_token_and_mailbox_binding(): void
    {
        $user = User::factory()->unverified()->create();
        $other = User::factory()->unverified()->create();
        $service = app(EmailVerificationService::class);
        $service->sendLink($user->email);
        parse_str(parse_url(Mail::sent(VerifyEmailMail::class)->sole()->verificationUrl, PHP_URL_QUERY), $query);
        $this->postJson('/api/email/verify', array_replace($query, ['token' => str_repeat('x', 64)]))->assertStatus(400);
        $this->postJson('/api/email/verify', array_replace($query, ['email' => $other->email]))->assertStatus(400);
        $this->assertDatabaseHas('email_verification_tokens', ['user_id' => $user->id]);
        $this->travel(59)->minutes();
        $this->postJson('/api/email/verify', $query)->assertOk();

        Mail::fake();
        $service->sendLink($other->email);
        parse_str(parse_url(Mail::sent(VerifyEmailMail::class)->sole()->verificationUrl, PHP_URL_QUERY), $expired);
        $this->travel(60)->minutes();
        $this->postJson('/api/email/verify', $expired)->assertStatus(400)->assertJsonPath('code', 'invalid_verification_token');
        $this->assertNull($other->fresh()->email_verified_at);
        $this->assertDatabaseMissing('email_verification_tokens', ['user_id' => $other->id]);
    }
}
