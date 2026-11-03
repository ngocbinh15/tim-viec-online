<?php

namespace Tests\Feature;

use App\Events\MessageSent;
use App\Events\NotificationSent;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Conversation;
use App\Models\Job;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use GuzzleHttp\Promise\Create;
use GuzzleHttp\Psr7\Response;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class WorkspacePerformanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['broadcasting.default' => 'log']);
    }

    public function test_conversation_list_query_count_does_not_grow_per_thread(): void
    {
        [$employer, $candidate, $job, $conversation] = $this->fixture();
        Message::create(['conversation_id' => $conversation->id, 'sender_id' => $candidate->id, 'message' => 'Hello']);
        $first = $this->queries(fn () => $this->actingAs($employer, 'sanctum')->getJson('/api/conversations')->assertOk());
        for ($i = 0; $i < 12; $i++) {
            $user = User::factory()->create(['role' => 'candidate', 'status' => 'active']);
            $profile = CandidateProfile::create(['user_id' => $user->id]);
            Application::create(['job_id' => $job->id, 'candidate_id' => $profile->id, 'cv_path' => 'private.pdf', 'status' => 'applied']);
            $thread = Conversation::create(['candidate_id' => $user->id, 'employer_id' => $employer->id, 'job_id' => $job->id]);
            Message::create(['conversation_id' => $thread->id, 'sender_id' => $user->id, 'message' => 'First']);
            Message::create(['conversation_id' => $thread->id, 'sender_id' => $user->id, 'message' => 'Latest']);
        }
        $many = $this->queries(fn () => $this->actingAs($employer, 'sanctum')->getJson('/api/conversations')->assertOk()->assertJsonCount(13, 'data'));
        $this->assertLessThanOrEqual(count($first) + 1, count($many));
        $response = $this->actingAs($employer, 'sanctum')->getJson('/api/conversations')->assertOk();
        $thread = collect($response->json('data'))->firstWhere('id', $thread->id);
        $this->assertSame('Latest', $thread['last_message']['message']);
        $this->assertSame(2, $thread['unread_count']);
        $this->assertNotNull($thread['application_id']);
    }

    public function test_notification_list_reuses_authenticated_user_for_destinations(): void
    {
        [$employer] = $this->fixture();
        Notification::withoutEvents(function () use ($employer) {
            for ($i = 0; $i < 30; $i++) {
                Notification::create(['user_id' => $employer->id, 'title' => 'Message', 'content' => 'Hello', 'type' => 'new_message', 'data' => ['conversation_id' => 1]]);
            }
        });
        $queries = $this->queries(fn () => $this->actingAs($employer, 'sanctum')->getJson('/api/notifications?per_page=50')->assertOk()
            ->assertJsonCount(30, 'data')->assertJsonPath('data.0.redirect_url', '/employer/messages?conversation=1')
            ->assertJsonPath('total_count', 30)->assertJsonPath('read_count', 0)->assertJsonPath('unread_count', 30));
        $userQueries = array_filter($queries, fn ($query) => str_contains($query['query'], 'from `users`'));
        $this->assertLessThanOrEqual(1, count($userQueries));
        $this->getJson('/api/notifications?status=read')->assertOk()->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0)->assertJsonPath('total_count', 30)->assertJsonPath('unread_count', 30);
    }

    public function test_chat_cursor_windows_are_bounded_ordered_and_private(): void
    {
        [$employer, $candidate, $job, $conversation] = $this->fixture();
        $ids = [];
        for ($i = 0; $i < 110; $i++) {
            $ids[] = Message::create(['conversation_id' => $conversation->id, 'sender_id' => $candidate->id, 'message' => 'Message '.$i])->id;
        }
        $url = '/api/conversations/'.$conversation->id.'/messages';
        $latest = $this->actingAs($employer, 'sanctum')->getJson($url.'?latest=1&per_page=50')->assertOk()->assertJsonCount(50, 'data')
            ->assertJsonPath('meta.has_more', true)->assertJsonPath('meta.oldest_id', $ids[60])->assertJsonPath('meta.newest_id', $ids[109]);
        $this->assertSame(array_slice($ids, 60), array_column($latest->json('data'), 'id'));
        $older = $this->getJson($url.'?before_id='.$ids[60].'&per_page=50')->assertOk()->assertJsonPath('meta.has_more', true);
        $this->assertSame(array_slice($ids, 10, 50), array_column($older->json('data'), 'id'));
        $this->getJson($url.'?before_id='.$ids[10])->assertOk()->assertJsonCount(10, 'data')->assertJsonPath('meta.has_more', false);
        $this->getJson($url.'?after_id='.$ids[107])->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.has_more', false);
        $this->getJson($url.'?after_id='.$ids[109])->assertOk()->assertJsonCount(0, 'data');
        $this->getJson($url.'?after_id=1&before_id=2')->assertUnprocessable();
        $this->getJson($url.'?latest=1&per_page=101')->assertUnprocessable();
        $this->getJson($url.'?per_page=10&page=2')->assertOk()->assertJsonPath('data.0.id', $ids[10])->assertJsonPath('meta.total', 110);
        $outsider = User::factory()->create(['role' => 'candidate', 'status' => 'active']);
        $this->actingAs($outsider, 'sanctum')->getJson($url.'?latest=1')->assertForbidden();
    }

    public function test_broadcast_http_requests_have_short_effective_timeouts(): void
    {
        $config = config('broadcasting.connections.reverb');
        $captured = [];
        $config['key'] = 'test-key';
        $config['secret'] = 'test-secret';
        $config['app_id'] = 'test-app';
        // This is a fake HTTP transport test, independent of local Reverb env.
        $config['options'] = array_replace($config['options'], [
            'host' => '127.0.0.1', 'port' => 6001, 'scheme' => 'http', 'useTLS' => false,
        ]);
        $config['client_options']['handler'] = function ($request, $options) use (&$captured) {
            $captured = $options;

            return Create::promiseFor(new Response(200, [], '{}'));
        };
        app(BroadcastManager::class)->pusher($config)->trigger('private-chat.1', 'message.sent', ['message' => 'Hello']);
        $this->assertGreaterThan(0, $captured['connect_timeout']);
        $this->assertLessThanOrEqual(0.5, $captured['connect_timeout']);
        $this->assertGreaterThan(0, $captured['timeout']);
        $this->assertLessThanOrEqual(1.0, $captured['timeout']);
    }

    public function test_broadcast_failure_does_not_lose_messages_or_notifications_for_closed_jobs(): void
    {
        [$employer, $candidate, $job, $conversation] = $this->fixture();
        $job->update(['status' => 'closed']);
        Event::listen(MessageSent::class, fn () => throw new \RuntimeException('Unavailable broadcaster'));
        Event::listen(NotificationSent::class, fn () => throw new \RuntimeException('Unavailable broadcaster'));
        $this->actingAs($employer, 'sanctum')->postJson('/api/conversations/'.$conversation->id.'/messages', ['message' => 'Hello'])
            ->assertCreated()->assertJsonPath('data.message', 'Hello');
        $this->assertDatabaseHas('messages', ['conversation_id' => $conversation->id, 'message' => 'Hello']);
        $this->assertDatabaseHas('notifications', ['user_id' => $candidate->id, 'type' => 'new_message']);
    }

    public function test_dashboard_date_range_uses_fixed_number_of_queries(): void
    {
        [$employer, $candidate, $job] = $this->fixture();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $short = $this->queries(fn () => $this->actingAs($admin, 'sanctum')->getJson('/api/admin/stats?days=7')->assertOk());
        $long = $this->queries(fn () => $this->actingAs($admin, 'sanctum')->getJson('/api/admin/stats?days=30')->assertOk()
            ->assertJsonCount(30, 'data.trends')->assertJsonPath('data.trends.29.jobs_count', 1)->assertJsonPath('data.trends.29.applications_count', 1));
        $this->assertLessThanOrEqual(count($short) + 1, count($long));
    }

    private function queries(callable $callback): array
    {
        DB::flushQueryLog();
        DB::enableQueryLog();
        try {
            $callback();

            return DB::getQueryLog();
        } finally {
            DB::disableQueryLog();
        }
    }

    private function fixture(): array
    {
        $employer = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $candidate = User::factory()->create(['role' => 'candidate', 'status' => 'active']);
        $profile = CandidateProfile::create(['user_id' => $candidate->id]);
        $company = Company::create(['user_id' => $employer->id, 'name' => 'Company']);
        $category = Category::create(['name' => 'Engineering']);
        $job = Job::create(['company_id' => $company->id, 'category_id' => $category->id, 'title' => 'Backend developer', 'description' => 'Build software', 'requirements' => 'PHP', 'benefits' => '', 'city' => 'Ha Noi', 'deadline' => now()->addDays(10)->toDateString(), 'status' => 'active']);
        Application::create(['job_id' => $job->id, 'candidate_id' => $profile->id, 'cv_path' => 'private.pdf', 'status' => 'applied']);
        $conversation = Conversation::create(['candidate_id' => $candidate->id, 'employer_id' => $employer->id, 'job_id' => $job->id]);

        return [$employer, $candidate, $job, $conversation];
    }
}
