<?php

use App\Models\CandidateProfile;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

// Synthetic benchmark fixtures only; this runtime cannot inherit the live DB.
if (PHP_SAPI !== 'cli') {
    exit(1);
}
$app = require __DIR__.'/frontend-e2e-bootstrap.php';
$app->make(Kernel::class)->bootstrap();
if (config('database.connections.mysql.port') != 33063 || config('database.connections.mysql.database') !== 'frontend_api_e2e_test') {
    throw new RuntimeException('Isolated browser database required.');
}
$manifest = $app->storagePath('cv-benchmark.json');
if (($argv[1] ?? '') === 'cleanup') {
    $rows = json_decode(file_get_contents($manifest), true);
    foreach ($rows as $row) {
        $user = User::whereKey($row['user_id'])->where('email', 'like', '%@cv-benchmark.test')->firstOrFail();
        foreach ($user->candidateProfile->resumes as $resume) {
            $paths = [...$resume->assets()->pluck('path')->all(), ...$resume->exports()->whereNotNull('path')->pluck('path')->all()];
            Storage::disk('private')->delete($paths);
        }
        $user->tokens()->delete();
        $user->delete();
    }
    unlink($manifest);
    exit(0);
}
if (is_file($manifest)) {
    throw new RuntimeException('Clean up the previous benchmark before starting another.');
}
$doc = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
$count = (int) (getenv('RESUME_BENCHMARK_USERS') ?: 50);
if (! in_array($count, [10, 50], true)) {
    throw new RuntimeException('Benchmark supports 10 or 50 synthetic users.');
}
$rows = [];
$batch = bin2hex(random_bytes(4));
$hash = Hash::make('SyntheticBenchmark1!');
for ($i = 0; $i < $count; $i++) {
    $user = User::create(['name' => 'Synthetic benchmark', 'email' => "$batch.$i@cv-benchmark.test", 'password' => $hash, 'role' => 'candidate', 'status' => 'active', 'email_verified_at' => now()]);
    $owner = CandidateProfile::create(['user_id' => $user->id]);
    $resume = Resume::create(['candidate_id' => $owner->id, ...$doc]);
    $rows[] = ['user_id' => $user->id, 'resume_id' => $resume->id, 'token' => $user->createToken('synthetic-benchmark')->plainTextToken];
}
file_put_contents($manifest, json_encode($rows));
echo "$count synthetic candidates prepared in the isolated database.\n";
