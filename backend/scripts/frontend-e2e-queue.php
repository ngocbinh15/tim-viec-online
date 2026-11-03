<?php

/** Drain only notification email jobs in the dedicated browser fixture; never seeds or resets data. */
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

$app = require __DIR__.'/frontend-e2e-bootstrap.php';
$app->make(Kernel::class)->bootstrap();
$database = config('database.connections.mysql');
$queue = config('queue.connections.database');
$smtp = config('mail.mailers.smtp');
if (! $app->environment('testing')
    || config('database.default') !== 'mysql'
    || ($database['host'] ?? null) !== '127.0.0.1'
    || (string) ($database['port'] ?? '') !== '33063'
    || ($database['database'] ?? null) !== 'frontend_api_e2e_test'
    || ! empty($database['url']) || ! empty($database['unix_socket'])
    || ! in_array($queue['connection'] ?? null, [null, 'mysql'], true)
    || ($queue['table'] ?? null) !== 'queue_jobs'
    || config('mail.default') !== 'smtp'
    || ($smtp['host'] ?? null) !== '127.0.0.1'
    || (string) ($smtp['port'] ?? '') !== '8129'
    || ! empty($smtp['url'])) {
    throw new RuntimeException('Refusing to drain email outside the isolated browser fixture.');
}
// Confirm the actual connection as well as its configuration before any database mutation.
if (DB::connection('mysql')->selectOne('SELECT DATABASE() AS fixture_name')->fixture_name !== 'frontend_api_e2e_test') {
    throw new RuntimeException('Refusing to drain email on an unexpected database.');
}

DB::transaction(function () {
    // Accelerate the debounce only in this isolated test runtime. Other queues are untouched.
    DB::table('notification_email_deliveries')->where('state', 'pending')->update(['ready_at' => now()->subSecond()]);
    DB::table('queue_jobs')->where('queue', 'emails')->whereNull('reserved_at')->update(['available_at' => now()->timestamp]);
});

$result = Artisan::call('queue:work', [
    'connection' => 'database', '--queue' => 'emails', '--stop-when-empty' => true,
    '--tries' => 3, '--timeout' => 30, '--sleep' => 1, '--max-time' => 45,
]);
echo Artisan::output();
exit($result);
