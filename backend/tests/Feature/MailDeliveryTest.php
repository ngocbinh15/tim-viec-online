<?php

namespace Tests\Feature;

use App\Mail\ResetPasswordMail;
use App\Mail\VerifyEmailMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Tests\TestCase;

class MailDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_frontend_url_is_available_in_cached_application_configuration(): void
    {
        $this->assertNotEmpty(config('app.frontend_url'));
        $this->assertLessThan(10, config('mail.mailers.smtp.timeout'));
        $this->assertArrayHasKey('scheme', config('mail.mailers.smtp'));
        $this->assertTrue(config('mail.mailers.smtp.require_tls'));
    }

    public function test_empty_mail_url_does_not_override_the_smtp_transport(): void
    {
        $environment = Env::getRepository();
        $previous = $environment->get('MAIL_URL');
        try {
            $environment->set('MAIL_URL', '');
            $settings = (require config_path('mail.php'))['mailers']['smtp'];
            $settings['host'] = '127.0.0.1';
            $settings['username'] = null;
            $settings['password'] = null;
            config(['mail.mailers.smtp' => $settings]);
            // Construct only; never connects or sends to the configured provider.
            $this->assertInstanceOf(EsmtpTransport::class, Mail::mailer('smtp')->getSymfonyTransport());
        } finally {
            $previous === null ? $environment->clear('MAIL_URL') : $environment->set('MAIL_URL', $previous);
        }
    }

    public function test_reset_mail_contains_html_and_plain_text_with_the_configured_frontend_link(): void
    {
        Mail::fake();
        config(['app.frontend_url' => 'https://jobs.example.test']);
        $user = User::factory()->create(['name' => '<script>alert(1)</script>', 'email' => 'person+tag@example.test']);

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $mail = Mail::sent(ResetPasswordMail::class)->sole();
        $this->assertTrue($mail->hasTo($user->email));
        $this->assertStringStartsWith('https://jobs.example.test/reset-password?', $mail->resetUrl);
        $this->assertStringContainsString('person%2Btag%40example.test', $mail->resetUrl);
        $this->assertNotNull($mail->content()->text);
        $mail->assertSeeInHtml('&lt;script&gt;', false);
        $mail->assertDontSeeInHtml('<script>', false);
        $mail->assertSeeInText('15 phút');
        $mail->assertSeeInText($mail->resetUrl);
    }

    public function test_smtp_failure_does_not_expose_secrets_or_leave_an_undelivered_token(): void
    {
        $user = User::factory()->create();
        Mail::shouldReceive('to')->once()->with($user->email)->andReturnSelf();
        Mail::shouldReceive('send')->once()->andThrow(new \RuntimeException('private SMTP password and token'));
        Log::shouldReceive('error')->once()->with('Password reset email could not be sent', ['user_id' => $user->id]);

        $response = $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $this->assertStringNotContainsString('private', $response->getContent());
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_reset_and_verification_reject_malformed_and_expired_tokens_consistently(): void
    {
        foreach (['email' => ['bad'], 'token' => ['bad']] as $field => $value) {
            $payload = array_replace(['email' => 'person@example.test', 'token' => 'invalid'], [$field => $value]);
            $this->postJson('/api/verify-reset-token', $payload)->assertStatus(422)->assertJsonPath('success', false);
        }
        $this->postJson('/api/verify-reset-token', ['email' => 'missing@example.test', 'token' => 'invalid'])
            ->assertStatus(400)->assertJsonPath('code', 'invalid_reset_token');

        $user = User::factory()->create();
        DB::table('password_reset_tokens')->insert(['email' => $user->email, 'token' => hash('sha256', 'expired'), 'created_at' => now()->subMinutes(15)]);
        $this->postJson('/api/reset-password', ['email' => $user->email, 'token' => 'expired', 'password' => 'ChangedPass2!', 'password_confirmation' => 'ChangedPass2!'])
            ->assertStatus(400)->assertJsonPath('code', 'invalid_reset_token');
    }

    public function test_recovery_rate_limit_is_account_scoped_shared_across_aliases_and_separate_from_login(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/login', ['email' => 'missing@example.test', 'password' => 'WrongPass1!'])->assertStatus(401);
        }
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        }
        $this->postJson('/api/password/forgot', ['email' => $user->email])->assertStatus(429);
        $this->postJson('/api/forgot-password', ['email' => 'another@example.test'])->assertOk();
        Mail::assertSent(ResetPasswordMail::class, 3);
    }

    public function test_registration_sends_a_verification_email_without_password_or_session_token(): void
    {
        Mail::fake();
        config(['app.frontend_url' => 'https://jobs.example.test']);
        $this->postJson('/api/register', [
            'name' => 'Người dùng mới', 'email' => 'new-account@example.test', 'dob' => '1995-01-01', 'role' => 'candidate',
            'password' => 'OriginalPass1!', 'password_confirmation' => 'OriginalPass1!',
        ])->assertCreated();
        $mail = Mail::sent(VerifyEmailMail::class)->sole();
        $mail->assertSeeInHtml('https://jobs.example.test/verify-email?');
        $mail->assertSeeInText('Người dùng mới');
        $mail->assertDontSeeInHtml('OriginalPass1!');
        $mail->assertDontSeeInText('OriginalPass1!');
    }

    public function test_mail_check_does_not_send_without_an_explicit_recipient(): void
    {
        Mail::fake();
        $this->artisan('mail:check')->assertFailed();
        Mail::assertNothingSent();
    }

    public function test_mail_check_validates_tls_and_only_sends_with_an_explicit_recipient(): void
    {
        Mail::fake();
        config([
            'mail.default' => 'smtp', 'mail.from.address' => 'sender@example.test',
            'mail.mailers.smtp.host' => 'smtp.example.test', 'mail.mailers.smtp.port' => 465,
            'mail.mailers.smtp.scheme' => 'smtps', 'mail.mailers.smtp.username' => 'fixture-user',
            'mail.mailers.smtp.password' => 'fixture-password', 'mail.mailers.smtp.url' => null,
        ]);
        $this->artisan('mail:check')->assertSuccessful();
        Mail::assertNothingSent();
        $this->artisan('mail:check', ['--to' => 'not-an-email'])->assertFailed();
        config(['mail.mailers.smtp.scheme' => 'smtp', 'mail.mailers.smtp.require_tls' => false]);
        $this->artisan('mail:check', ['--to' => 'recipient@example.test'])->assertFailed();
        config(['mail.mailers.smtp.scheme' => 'smtps']);
        $this->artisan('mail:check', ['--to' => 'recipient@example.test'])->assertSuccessful();
    }
}
