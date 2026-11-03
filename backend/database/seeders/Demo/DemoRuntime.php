<?php

namespace Database\Seeders\Demo;

use App\Jobs\DemoSeedNoOp;
use Carbon\Carbon;
use Illuminate\Support\Str;

final class DemoRuntime
{
    public function __construct(private DemoWriter $writer) {}

    public function create(array $actors, Carbon $now): void
    {
        $expired = $now->copy()->subDays(30);
        foreach ($actors['users'] as $i => $id) {
            $this->writer->add('personal_access_tokens', [
                'tokenable_type' => 'App\\Models\\User', 'tokenable_id' => $id,
                'name' => 'DEMO EXPIRED - NOT A LIVE SESSION', 'token' => hash('sha256', random_bytes(32)),
                'abilities' => DemoWriter::json([]), 'last_used_at' => $expired->copy()->subDay(),
                'expires_at' => $expired, 'created_at' => $expired->copy()->subDays(7), 'updated_at' => $expired,
            ]);
            $this->writer->add('sessions', [
                'id' => 'demo-'.Str::uuid(), 'user_id' => $id, 'ip_address' => '192.0.2.'.(1 + $i % 250),
                'user_agent' => 'TimViecOnline synthetic demo; expired session',
                'payload' => base64_encode(serialize(['demo' => true])), 'last_activity' => $expired->getTimestamp(),
            ]);
        }
        foreach ($actors['candidates'] as $i => $candidate) {
            $this->writer->add('password_reset_tokens', [
                'email' => 'candidate.'.sprintf('%05d', $i + 1).'@demo.timviec.test',
                'token' => hash('sha256', random_bytes(32)), 'created_at' => $expired,
            ]);
        }
        foreach ($actors['companies'] as $i => $company) {
            $key = 'demo-seed:'.DemoOptions::RUN.':company:'.$company['id'];
            $this->writer->add('cache', ['key' => $key, 'value' => serialize(['demo' => true, 'company_id' => $company['id']]), 'expiration' => $expired->getTimestamp()]);
            $this->writer->add('cache_locks', ['key' => $key.':lock', 'owner' => (string) Str::uuid(), 'expiration' => $expired->getTimestamp()]);
            if ($i % 4 !== 0) {
                continue;
            }
            $uuid = (string) Str::uuid();
            $job = (new DemoSeedNoOp)->onQueue('demo-fixtures');
            $payload = DemoWriter::json([
                'uuid' => $uuid, 'displayName' => 'DEMO: no-op fixture, no email or AI',
                'job' => 'Illuminate\\Queue\\CallQueuedHandler@call', 'maxTries' => 1,
                'maxExceptions' => null, 'failOnTimeout' => false, 'backoff' => null, 'timeout' => 10,
                'retryUntil' => null, 'data' => ['commandName' => DemoSeedNoOp::class, 'command' => serialize($job)],
            ]);
            $this->writer->add('queue_jobs', ['queue' => 'demo-fixtures', 'payload' => $payload, 'attempts' => 0, 'reserved_at' => null, 'available_at' => $now->copy()->addYear()->getTimestamp(), 'created_at' => $now->getTimestamp()]);
            $this->writer->add('failed_jobs', ['uuid' => $uuid, 'connection' => 'database', 'queue' => 'demo-fixtures', 'payload' => $payload, 'exception' => '[MINH HỌA] Bản ghi lỗi giả lập; payload no-op, không gọi dịch vụ bên ngoài.', 'failed_at' => $expired]);
            $this->writer->add('job_batches', ['id' => (string) Str::uuid(), 'name' => 'DEMO completed batch '.($i + 1), 'total_jobs' => 3, 'pending_jobs' => 0, 'failed_jobs' => 1, 'failed_job_ids' => DemoWriter::json([$uuid]), 'options' => serialize([]), 'cancelled_at' => null, 'created_at' => $expired->copy()->subHour()->getTimestamp(), 'finished_at' => $expired->getTimestamp()]);
        }
    }
}
