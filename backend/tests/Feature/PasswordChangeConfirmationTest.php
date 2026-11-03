<?php

namespace Tests\Feature;

use App\Mail\ConfirmPasswordChangeMail;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordChangeConfirmationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        config(['broadcasting.default' => 'log']);
    }

    public function test_request_only_stages_hash_and_confirmation_changes_once_revoking_all_sessions(): void
    {
        config(['app.frontend_url' => 'https://jobs.example.test']);
        $user = $this->user();
        $user->createToken('first');
        $user->createToken('second');
        $query = $this->requestChange($user);
        $record = DB::table('password_change_requests')->where('user_id', $user->id)->first();
        $this->assertSame(hash('sha256', $query['token']), $record->token);
        $this->assertTrue(Hash::check('ChangedPass2!', $record->password_hash));
        $this->assertSame(hash('sha256', $user->password), $record->credential_hash);
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
        $this->assertSame(2, $user->tokens()->count());
        $this->assertDatabaseCount('notifications', 0);
        $mail = Mail::sent(ConfirmPasswordChangeMail::class)->sole();
        $this->assertStringStartsWith('https://jobs.example.test/confirm-password-change?', $mail->confirmationUrl);
        $mail->assertSeeInText('15 phút');
        $mail->assertDontSeeInHtml('ChangedPass2!');
        $mail->assertDontSeeInText('OriginalPass1!');
        $this->getJson('/api/password/change/confirm?'.http_build_query($query))->assertStatus(405);
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
        $this->postJson('/api/password/change/confirm', $query)->assertOk()->assertJsonPath('data.confirmed', true);
        $this->assertTrue(Hash::check('ChangedPass2!', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
        $this->assertDatabaseMissing('password_change_requests', ['user_id' => $user->id]);
        $this->assertDatabaseCount('notifications', 1);
        $this->postJson('/api/password/change/confirm', $query)->assertStatus(400)->assertJsonPath('code', 'invalid_password_change_token');
    }

    public function test_wrong_current_unchanged_password_and_invalid_input_never_send_mail(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $user = $this->user();
        $this->actingAs($user, 'sanctum')->putJson('/api/user/change-password', $this->payload('WrongPass1!'))->assertStatus(400)->assertJsonPath('code', 'invalid_current_password');
        $this->putJson('/api/user/change-password', $this->payload('OriginalPass1!', 'OriginalPass1!'))->assertStatus(400)->assertJsonPath('code', 'password_unchanged');
        $this->putJson('/api/user/change-password', $this->payload('OriginalPass1!', str_repeat('ệ', 28).'A1!'))->assertUnprocessable();
        Mail::assertNothingSent();
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
    }

    public function test_wrong_or_other_mailbox_token_does_not_consume_and_exact_expiry_is_invalid(): void
    {
        $user = $this->user();
        $query = $this->requestChange($user);
        $this->postJson('/api/password/change/confirm', array_replace($query, ['token' => str_repeat('x', 64)]))->assertStatus(400);
        $this->postJson('/api/password/change/confirm', array_replace($query, ['email' => 'another@example.test']))->assertStatus(400);
        $this->assertDatabaseHas('password_change_requests', ['user_id' => $user->id]);
        $this->travel(15)->minutes();
        $this->postJson('/api/password/change/confirm', $query)->assertStatus(400);
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
        $this->postJson('/api/password/change/confirm', ['email' => ['bad'], 'token' => ['bad']])->assertUnprocessable();
    }

    public function test_latest_request_invalidates_prior_link_and_unicode_policy_matches_reset(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $user = $this->user();
        $first = $this->requestChange($user);
        $second = $this->requestChange($user, 'MậtKhẩuMới1!');
        $this->postJson('/api/password/change/confirm', $first)->assertStatus(400);
        $this->postJson('/api/password/change/confirm', $second)->assertOk();
        $this->assertTrue(Hash::check('MậtKhẩuMới1!', $user->fresh()->password));
    }

    public function test_reset_and_change_invalidate_each_other_and_cannot_overwrite_later_credentials(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $user = $this->user();
        $change = $this->requestChange($user);
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $reset = Mail::sent(ResetPasswordMail::class)->last()->token;
        $this->postJson('/api/reset-password', ['email' => $user->email, 'token' => $reset, 'password' => 'ResetPass3!', 'password_confirmation' => 'ResetPass3!'])->assertOk();
        $this->postJson('/api/password/change/confirm', $change)->assertStatus(400);
        $this->assertTrue(Hash::check('ResetPass3!', $user->fresh()->password));
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $reset = Mail::sent(ResetPasswordMail::class)->last()->token;
        $this->actingAs($user->fresh(), 'sanctum')->putJson('/api/user/change-password', $this->payload('ResetPass3!'))->assertStatus(202);
        parse_str(parse_url(Mail::sent(ConfirmPasswordChangeMail::class)->last()->confirmationUrl, PHP_URL_QUERY), $change);
        $this->postJson('/api/password/change/confirm', $change)->assertOk();
        $this->postJson('/api/reset-password', ['email' => $user->email, 'token' => $reset, 'password' => 'StalePass4!', 'password_confirmation' => 'StalePass4!'])->assertStatus(400);
        $this->assertTrue(Hash::check('ChangedPass2!', $user->fresh()->password));
    }

    public function test_email_round_trip_invalidates_both_purposes_and_locked_accounts_stay_locked(): void
    {
        $user = $this->user();
        $change = $this->requestChange($user);
        $original = $user->email;
        $this->postJson('/api/forgot-password', ['email' => $original])->assertOk();
        $reset = Mail::sent(ResetPasswordMail::class)->last()->token;
        $this->putJson('/api/candidate/profile', ['email' => 'changed@example.test'])->assertOk();
        $this->putJson('/api/candidate/profile', ['email' => $original])->assertOk();
        $this->postJson('/api/password/change/confirm', $change)->assertStatus(400);
        $this->postJson('/api/reset-password', ['email' => $original, 'token' => $reset, 'password' => 'ResetPass3!', 'password_confirmation' => 'ResetPass3!'])->assertStatus(400);
        $this->withoutMiddleware(ThrottleRequests::class);
        // A changed mailbox must complete its separate verification before a new request.
        $user->refresh()->forceFill(['email_verified_at' => now()])->save();
        $change = $this->requestChange($user->fresh());
        $user->forceFill(['status' => 'locked'])->save();
        $this->postJson('/api/password/change/confirm', $change)->assertStatus(400);
        $this->assertSame('locked', $user->fresh()->status);
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
    }

    public function test_smtp_failure_preserves_password_and_sessions_and_exposes_no_transport_secret(): void
    {
        $user = $this->user();
        $user->createToken('keep-session');
        Mail::shouldReceive('to')->once()->with($user->email)->andReturnSelf();
        Mail::shouldReceive('send')->once()->andThrow(new \RuntimeException('private SMTP password'));
        Log::shouldReceive('warning')->once()->with('Password change confirmation email could not be sent', ['user_id' => $user->id]);
        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user/change-password', $this->payload())->assertStatus(503)->assertJsonPath('code', 'mail_delivery_failed');
        $this->assertStringNotContainsString('private', $response->getContent());
        $this->assertDatabaseCount('password_change_requests', 0);
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_requests_require_auth_and_are_rate_limited_before_extra_mail(): void
    {
        $this->putJson('/api/user/change-password', $this->payload())->assertUnauthorized();
        $user = $this->user();
        $this->requestChange($user);
        $this->putJson('/api/user/change-password', $this->payload())->assertStatus(429);
        $this->travel(61)->seconds();
        $this->requestChange($user);
        Mail::assertSent(ConfirmPasswordChangeMail::class, 2);
    }

    public function test_stale_credentials_and_mailbox_reassignment_cannot_use_previously_issued_links(): void
    {
        $user = $this->user();
        $change = $this->requestChange($user);
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $reset = Mail::sent(ResetPasswordMail::class)->last()->token;
        $user->forceFill(['password' => Hash::make('DifferentPass4!')])->save();
        $this->postJson('/api/password/change/confirm', $change)->assertStatus(400);
        $this->postJson('/api/verify-reset-token', ['email' => $user->email, 'token' => $reset])->assertStatus(400);
        $this->postJson('/api/reset-password', ['email' => $user->email, 'token' => $reset, 'password' => 'ResetPass3!', 'password_confirmation' => 'ResetPass3!'])->assertStatus(400);
        $original = $user->email;
        $user->forceFill(['email' => 'previous-owner@example.test'])->save();
        $newOwner = User::factory()->create(['email' => $original, 'password' => 'NewOwnerPass2!']);
        $this->postJson('/api/reset-password', ['email' => $original, 'token' => $reset, 'password' => 'ResetPass3!', 'password_confirmation' => 'ResetPass3!'])->assertStatus(400);
        $this->assertTrue(Hash::check('NewOwnerPass2!', $newOwner->fresh()->password));
        $this->assertTrue(Hash::check('DifferentPass4!', $user->fresh()->password));
    }

    public function test_confirmation_mail_escapes_untrusted_names_and_supports_html_and_text(): void
    {
        $mail = new ConfirmPasswordChangeMail('<script>alert(1)</script>', 'https://jobs.example.test/confirm-password-change?email=a%40example.test&token='.str_repeat('a', 64));
        $mail->assertSeeInHtml('&lt;script&gt;', false);
        $mail->assertDontSeeInHtml('<script>', false);
        $mail->assertSeeInText($mail->confirmationUrl);
        $this->assertNotNull($mail->content()->text);
    }

    public function test_older_smtp_failure_does_not_remove_a_newer_pending_request(): void
    {
        $user = $this->user();
        $newDigest = hash('sha256', str_repeat('n', 64));
        Mail::shouldReceive('to')->once()->andReturnSelf();
        Mail::shouldReceive('send')->once()->andReturnUsing(function () use ($user, $newDigest) {
            DB::table('password_change_requests')->where('user_id', $user->id)->update(['token' => $newDigest]);
            throw new \RuntimeException('private transport secret');
        });
        Log::shouldReceive('warning')->once()->with('Password change confirmation email could not be sent', ['user_id' => $user->id]);
        $this->actingAs($user, 'sanctum')->putJson('/api/user/change-password', $this->payload())->assertStatus(503);
        $this->assertDatabaseHas('password_change_requests', ['user_id' => $user->id, 'token' => $newDigest]);
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password));
    }

    public function test_token_purposes_are_not_interchangeable_and_legacy_reset_rows_are_rejected(): void
    {
        $user = $this->user();
        $change = $this->requestChange($user);
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $reset = Mail::sent(ResetPasswordMail::class)->last()->token;
        $this->postJson('/api/password/change/confirm', array_replace($change, ['token' => $reset]))->assertStatus(400);
        $this->postJson('/api/reset-password', ['email' => $user->email, 'token' => $change['token'], 'password' => 'ResetPass3!', 'password_confirmation' => 'ResetPass3!'])->assertStatus(400);
        DB::table('password_reset_tokens')->where('email', $user->email)->update(['user_id' => null, 'credential_hash' => null]);
        $this->postJson('/api/reset-password', ['email' => $user->email, 'token' => $reset, 'password' => 'ResetPass3!', 'password_confirmation' => 'ResetPass3!'])->assertStatus(400);
        $this->postJson('/api/password/change/confirm', $change)->assertOk();
    }

    private function user(): User
    {
        return User::factory()->create(['role' => 'candidate', 'password' => 'OriginalPass1!']);
    }

    private function payload(string $current = 'OriginalPass1!', string $password = 'ChangedPass2!'): array
    {
        return ['current_password' => $current, 'password' => $password, 'password_confirmation' => $password];
    }

    private function requestChange(User $user, string $password = 'ChangedPass2!'): array
    {
        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user/change-password', $this->payload('OriginalPass1!', $password));
        $response->assertStatus(202)->assertJsonPath('data.confirmation_required', true)->assertJsonPath('data.email', $user->email);
        $mail = Mail::sent(ConfirmPasswordChangeMail::class)->last();
        parse_str(parse_url($mail->confirmationUrl, PHP_URL_QUERY), $query);
        $this->assertStringNotContainsString($query['token'], $response->getContent());
        $this->assertStringNotContainsString($password, $response->getContent());

        return $query;
    }
}
