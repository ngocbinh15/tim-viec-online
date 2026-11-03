<?php

namespace Tests\Feature;

use App\Jobs\SendNotificationEmail;
use App\Mail\ActivityNotificationMail;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Conversation;
use App\Models\Job;
use App\Models\Message;
use App\Models\NotificationEmailDelivery;
use App\Models\User;
use App\Services\NotificationEmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class EmailNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        config(['ai.enabled' => false, 'services.gemini.enabled' => false, 'broadcasting.default' => 'log']);
    }

    public function test_preferences_require_authentication_default_off_and_accept_only_complete_boolean_input(): void
    {
        $this->getJson('/api/user/email-preferences')->assertUnauthorized();
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')->getJson('/api/user/email-preferences')
            ->assertOk()->assertJsonPath('data', ['applications' => false, 'messages' => false]);
        foreach ([['applications' => true], ['applications' => 'true', 'messages' => false], ['applications' => 1, 'messages' => false], ['applications' => true, 'messages' => false, 'email' => 'other@example.test']] as $input) {
            $this->putJson('/api/user/email-preferences', $input)->assertUnprocessable();
        }
        $this->putJson('/api/user/email-preferences', ['applications' => true, 'messages' => false])
            ->assertOk()->assertJsonPath('data', ['applications' => true, 'messages' => false]);
        // MySQL normalizes JSON object key order; MariaDB preserves insertion order.
        $stored = $user->fresh()->email_notifications;
        $this->assertCount(2, $stored);
        $this->assertTrue($stored['applications']);
        $this->assertFalse($stored['messages']);
    }

    public function test_unverified_recipient_can_disable_but_cannot_enable_preferences(): void
    {
        $user = User::factory()->unverified()->create();
        $this->actingAs($user, 'sanctum')->putJson('/api/user/email-preferences', ['applications' => false, 'messages' => true])
            ->assertForbidden()->assertJsonPath('code', 'email_verification_required');
        $this->putJson('/api/user/email-preferences', ['applications' => false, 'messages' => false])->assertOk();
    }

    public function test_chat_stays_immediate_and_burst_messages_share_one_pending_email(): void
    {
        [$candidate, $employer, , $conversation] = $this->fixture();
        foreach (['private chat first', 'private chat latest'] as $body) {
            $this->actingAs($employer, 'sanctum')->postJson('/api/conversations/'.$conversation->id.'/messages', ['message' => $body])->assertCreated();
        }
        $this->assertDatabaseCount('messages', 2);
        $this->assertDatabaseCount('notifications', 2);
        $this->assertDatabaseCount('notification_email_deliveries', 1);
        Mail::assertNothingSent();
        Queue::assertPushed(SendNotificationEmail::class, 1);
        $delivery = NotificationEmailDelivery::sole();
        $this->assertSame(Message::max('id'), $delivery->source_id);
        $this->travel(61)->seconds();
        app(NotificationEmailService::class)->deliver($delivery->id, $delivery->generation);
        Mail::assertSent(ActivityNotificationMail::class, function ($mail) use ($candidate, $conversation) {
            $this->assertTrue($mail->hasTo($candidate->email));
            $mail->assertDontSeeInHtml('private chat');
            $mail->assertDontSeeInText('private chat');
            $mail->assertSeeInText('/account/messages?conversation='.$conversation->id);
            return true;
        });
        app(NotificationEmailService::class)->deliver($delivery->id, $delivery->generation);
        Mail::assertSent(ActivityNotificationMail::class, 1);
    }

    public function test_delivery_rechecks_consent_verification_account_state_and_message_read_state(): void
    {
        foreach (['optout', 'unverified', 'locked', 'read', 'changed_address'] as $reason) {
            [$candidate, $employer, , $conversation] = $this->fixture();
            $message = Message::create(['conversation_id' => $conversation->id, 'sender_id' => $employer->id, 'message' => 'private', 'is_read' => false]);
            app(NotificationEmailService::class)->message($message);
            $delivery = NotificationEmailDelivery::where('user_id', $candidate->id)->sole();
            match ($reason) {
                'optout' => $candidate->forceFill(['email_notifications' => ['applications' => true, 'messages' => false]])->save(),
                'unverified' => $candidate->forceFill(['email_verified_at' => null])->save(),
                'locked' => $candidate->forceFill(['status' => 'locked'])->save(),
                'changed_address' => $candidate->forceFill(['email' => 'changed@example.test', 'email_verified_at' => now()])->save(),
                'read' => $message->update(['is_read' => true, 'read_at' => now()]),
            };
            $this->travel(61)->seconds();
            app(NotificationEmailService::class)->deliver($delivery->id, $delivery->generation);
        }
        Mail::assertNothingSent();
    }

    public function test_status_debounce_uses_latest_status_and_old_generation_cannot_resend(): void
    {
        [$candidate, , $application] = $this->fixture();
        $service = app(NotificationEmailService::class);
        $application->update(['status' => 'accepted']);
        $service->application($application);
        $application->update(['status' => 'rejected']);
        $service->application($application);
        $delivery = NotificationEmailDelivery::where('user_id', $candidate->id)->sole();
        Queue::assertPushed(SendNotificationEmail::class, 1);
        $this->travel(11)->seconds();
        $service->deliver($delivery->id, $delivery->generation);
        Mail::assertSent(ActivityNotificationMail::class, function ($mail) {
            $mail->assertSeeInText('Từ chối');
            $mail->assertDontSeeInText('Trúng tuyển');
            return true;
        });
        $application->update(['status' => 'accepted']);
        $service->application($application);
        $this->travel(11)->seconds();
        $service->deliver($delivery->id, $delivery->generation);
        Mail::assertSent(ActivityNotificationMail::class, 1);
        $delivery->refresh();
        $service->deliver($delivery->id, $delivery->generation);
        Mail::assertSent(ActivityNotificationMail::class, 2);
    }

    public function test_unverified_or_default_off_users_do_not_enqueue_and_mismatched_status_is_skipped(): void
    {
        [$candidate, , $application] = $this->fixture();
        $service = app(NotificationEmailService::class);
        $candidate->forceFill(['email_notifications' => null])->save();
        $service->application($application);
        $candidate->forceFill(['email_notifications' => ['applications' => true, 'messages' => true], 'email_verified_at' => null])->save();
        $service->application($application);
        Queue::assertNothingPushed();
        $candidate->forceFill(['email_verified_at' => now()])->save();
        $application->update(['status' => 'accepted']);
        $service->application($application);
        $delivery = NotificationEmailDelivery::sole();
        $application->update(['status' => 'rejected']);
        $this->travel(11)->seconds();
        $service->deliver($delivery->id, $delivery->generation);
        Mail::assertNothingSent();
    }

    public function test_employer_status_changes_enqueue_without_sending_inline_and_unchanged_status_is_silent(): void
    {
        [, $employer, $application] = $this->fixture();
        $this->actingAs($employer, 'sanctum')->patchJson('/api/employer/applications/'.$application->id.'/status', ['status' => 'accepted'])->assertOk();
        $this->patchJson('/api/employer/applications/'.$application->id.'/status', ['status' => 'accepted'])->assertOk();
        $this->assertDatabaseCount('notifications', 1);
        Queue::assertPushed(SendNotificationEmail::class, fn ($job) => $job->connection === 'database' && $job->queue === 'emails' && $job->afterCommit === true);
        Queue::assertPushed(SendNotificationEmail::class, 1);
        Mail::assertNothingSent();
    }

    public function test_burst_waits_until_quiet_and_processed_sources_are_idempotent(): void
    {
        [, $employer, , $conversation] = $this->fixture();
        $service = app(NotificationEmailService::class);
        $first = Message::create(['conversation_id' => $conversation->id, 'sender_id' => $employer->id, 'message' => 'first', 'is_read' => false]);
        $service->message($first);
        $this->travel(50)->seconds();
        $latest = Message::create(['conversation_id' => $conversation->id, 'sender_id' => $employer->id, 'message' => 'latest', 'is_read' => false]);
        $service->message($latest);
        $service->message($first);
        $delivery = NotificationEmailDelivery::sole();
        $this->travel(11)->seconds();
        $this->assertGreaterThan(0, $service->deliver($delivery->id, $delivery->generation));
        Mail::assertNothingSent();
        $this->travel(50)->seconds();
        $service->deliver($delivery->id, $delivery->generation);
        $service->message($latest);
        $service->message($first);
        Queue::assertPushed(SendNotificationEmail::class, 1);
        Mail::assertSent(ActivityNotificationMail::class, 1);
    }

    public function test_abandoned_processing_is_recovered_and_mail_errors_are_retryable_without_secrets(): void
    {
        [, , $application] = $this->fixture();
        $application->update(['status' => 'accepted']);
        $service = app(NotificationEmailService::class);
        $service->application($application);
        $delivery = NotificationEmailDelivery::sole();
        $this->travel(11)->seconds();
        $delivery->update(['state' => 'processing', 'processing_at' => now()]);
        $this->assertGreaterThan(0, $service->deliver($delivery->id, $delivery->generation));
        $this->travel(61)->seconds();
        $mailFake = Mail::getFacadeRoot();
        Mail::shouldReceive('to')->once()->andReturnSelf();
        Mail::shouldReceive('send')->once()->andThrow(new \RuntimeException('transport password secret'));
        try {
            $service->deliver($delivery->id, $delivery->generation);
            $this->fail('Failed transport must leave a retryable pending record.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Notification email delivery failed.', $exception->getMessage());
            $this->assertNull($exception->getPrevious());
        }
        $this->assertSame('pending', $delivery->fresh()->state);
        Mail::swap($mailFake);
        $service->deliver($delivery->id, $delivery->generation);
        Mail::assertSent(ActivityNotificationMail::class, 1);
    }

    public function test_email_content_escapes_names_has_both_mime_parts_and_links_to_preferences(): void
    {
        $mail = new ActivityNotificationMail('<script>private name</script>', 'messages', '', 'https://jobs.example.test/account/messages?conversation=12', 'https://jobs.example.test/account/settings');
        $mail->assertSeeInHtml('&lt;script&gt;', false);
        $mail->assertDontSeeInHtml('<script>', false);
        $mail->assertSeeInText('https://jobs.example.test/account/settings');
        $this->assertNotNull($mail->content()->text);
        $this->assertNotNull($mail->content()->view);
    }

    public function test_enqueue_failure_preserves_saved_chat_and_in_app_notification(): void
    {
        [, $employer, , $conversation] = $this->fixture();
        Queue::shouldReceive('connection')->with('database')->once()->andThrow(new \RuntimeException('queue connection secret'));
        $response = $this->actingAs($employer, 'sanctum')->postJson('/api/conversations/'.$conversation->id.'/messages', ['message' => 'message survives']);
        $response->assertCreated();
        $this->assertStringNotContainsString('secret', $response->getContent());
        $this->assertDatabaseCount('messages', 1);
        $this->assertDatabaseCount('notifications', 1);
        $this->assertSame('failed', NotificationEmailDelivery::sole()->state);
    }

    public function test_delayed_status_hook_cannot_replace_a_newer_status_notification(): void
    {
        [, , $application] = $this->fixture();
        $application->update(['status' => 'accepted']);
        $olderSnapshot = $application->fresh();
        $application->update(['status' => 'rejected']);
        $service = app(NotificationEmailService::class);
        $service->application($application);
        $service->application($olderSnapshot);
        $delivery = NotificationEmailDelivery::sole();
        $this->travel(11)->seconds();
        $service->deliver($delivery->id, $delivery->generation);
        Mail::assertSent(ActivityNotificationMail::class, fn ($mail) => $mail->statusLabel === 'Từ chối');
    }

    private function fixture(): array
    {
        $prefs = ['applications' => true, 'messages' => true];
        $candidate = User::factory()->create(['role' => 'candidate', 'status' => 'active', 'email_notifications' => $prefs]);
        $employer = User::factory()->create(['role' => 'employer', 'status' => 'active', 'email_notifications' => $prefs]);
        $profile = CandidateProfile::create(['user_id' => $candidate->id]);
        $category = Category::create(['name' => 'Email category '.uniqid()]);
        $company = Company::create(['user_id' => $employer->id, 'name' => 'Email company']);
        $job = Job::create(['company_id' => $company->id, 'category_id' => $category->id, 'title' => 'Developer', 'description' => 'Description', 'requirements' => 'Requirements', 'benefits' => 'Benefits', 'city' => 'Hồ Chí Minh', 'status' => 'active', 'deadline' => now()->addWeek()]);
        $application = Application::create(['job_id' => $job->id, 'candidate_id' => $profile->id, 'cv_path' => 'private/example.pdf', 'status' => 'applied', 'ai_analysis_status' => 'deferred']);
        $conversation = Conversation::create(['candidate_id' => $candidate->id, 'employer_id' => $employer->id, 'job_id' => $job->id]);
        return [$candidate, $employer, $application, $conversation];
    }
}
