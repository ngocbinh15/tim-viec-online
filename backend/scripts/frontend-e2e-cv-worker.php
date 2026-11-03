<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;

// Runs one CV export against the isolated browser fixture only.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$app = require __DIR__.'/frontend-e2e-bootstrap.php';
$app->make(Kernel::class)->bootstrap();
if (config('database.connections.mysql.database') !== 'frontend_api_e2e_test' || (string) config('database.connections.mysql.port') !== '33063') {
    throw new RuntimeException('Not the isolated browser fixture.');
}
exit(Artisan::call('queue:work', ['connection' => 'database', '--queue' => 'cv', '--once' => true, '--timeout' => 45, '--tries' => 2]));
