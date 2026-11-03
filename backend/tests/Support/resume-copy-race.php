<?php

use App\Models\Resume;
use App\Services\Resumes\ResumeService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

// Internal integration helper. The parent test supplies its isolated database.
if (PHP_SAPI !== 'cli' || getenv('APP_ENV') !== 'testing' || ! preg_match('/^[a-zA-Z0-9_]+_test$/', getenv('DB_DATABASE') ?: '')) {
    exit(1);
}
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
config(['resumes.enabled' => true]);
DB::beforeExecuting(function ($query) {
    if (str_contains($query, 'candidate_profiles') && str_contains(strtolower($query), 'for update')) {
        echo "OWNER_LOCK_PENDING\n";
        flush();
    }
});
$resume = Resume::findOrFail((int) $argv[1]);
$copy = app(ResumeService::class)->duplicate($resume, $resume->revision, 'Concurrent copy');
echo 'COPIED:'.$copy->id."\n";
