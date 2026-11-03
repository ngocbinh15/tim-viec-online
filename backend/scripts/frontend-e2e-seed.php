<?php

use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Conversation;
use App\Models\Job;
use App\Models\Message;
use App\Models\Notification;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

$app = require __DIR__.'/frontend-e2e-bootstrap.php';
$app->make(Kernel::class)->bootstrap();
// No clients exist during reset; seed notifications without network side effects.
config(['broadcasting.default' => 'log']);
$connection = config('database.connections.mysql');
if (
    config('database.default') !== 'mysql' || $connection['host'] !== '127.0.0.1'
    || (string) $connection['port'] !== '33063' || $connection['database'] !== 'frontend_api_e2e_test'
) {
    throw new RuntimeException('Refusing to reset a database outside the isolated browser fixture.');
}
$pdo = new PDO('mysql:host=127.0.0.1;port=33063;charset=utf8mb4', $connection['username'], $connection['password']);
$pdo->exec('CREATE DATABASE IF NOT EXISTS `frontend_api_e2e_test` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
Artisan::call('migrate:fresh', ['--force' => true]);

$users = [];
foreach (['candidate', 'employer', 'admin', 'outsider'] as $role) {
    $users[$role] = User::create([
        'name' => 'E2E '.ucfirst($role),
        'email' => $role.'@frontend-e2e.test',
        'password' => Hash::make('BrowserTest1!'),
        'role' => $role === 'outsider' ? 'candidate' : $role,
        'status' => 'active',
        'dob' => '1995-01-01',
        'phone' => '0912345678',
    ]);
    $users[$role]->forceFill(['email_verified_at' => now()])->save();
}
$profile = CandidateProfile::create(['user_id' => $users['candidate']->id, 'title' => 'Backend Developer', 'city' => 'Ha Noi', 'experience_years' => 3, 'cv_file_path' => 'cvs/e2e-profile.pdf']);
CandidateProfile::create(['user_id' => $users['outsider']->id]);
$company = Company::create(['user_id' => $users['employer']->id, 'name' => 'E2E Software', 'description' => 'Software company for browser verification', 'address' => '123 Test Street', 'city' => 'Ha Noi', 'company_size' => '10-50']);
$category = Category::create(['name' => 'E2E Engineering']);
$skill = Skill::create(['name' => 'E2E PHP']);
$profile->skills()->sync([$skill->id]);
$jobs = [];
foreach (['Backend Engineer E2E', 'Frontend Engineer E2E', 'Closed Engineer E2E'] as $index => $title) {
    $job = Job::create([
        'company_id' => $company->id,
        'category_id' => $category->id,
        'title' => $title,
        'job_level' => 'Middle',
        'quantity' => 2,
        'description' => 'Build web applications and maintain reliable services.',
        'requirements' => 'PHP and SQL experience required.',
        'benefits' => 'Insurance and annual leave.',
        'salary_min' => 15000000,
        'salary_max' => 25000000,
        'is_negotiable' => false,
        'job_type' => 'full_time',
        'city' => 'Ha Noi',
        'address' => '123 Test Street',
        'deadline' => now()->addDays(30)->toDateString(),
        'status' => $index === 2 ? 'closed' : 'active',
    ]);
    $job->skills()->sync([$skill->id]);
    $jobs[] = $job;
}
// A minimal genuine PDF with extractable text; also used for browser upload checks.
$stream = 'BT /F1 12 Tf 72 720 Td (Backend developer PHP SQL three years experience) Tj ET';
$objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length '.strlen($stream).">>\nstream\n".$stream."\nendstream",
];
$pdf = "%PDF-1.4\n";
$offsets = [];
foreach ($objects as $index => $object) {
    $offsets[] = strlen($pdf);
    $pdf .= ($index + 1)." 0 obj\n".$object."\nendobj\n";
}
$xref = strlen($pdf);
$pdf .= "xref\n0 6\n0000000000 65535 f \n";
foreach ($offsets as $offset) {
    $pdf .= sprintf("%010d 00000 n \n", $offset);
}
$pdf .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n".$xref."\n%%EOF";
Storage::disk('private')->put('cvs/e2e-profile.pdf', $pdf);
Storage::disk('private')->put('application_cvs/e2e-submitted.pdf', $pdf);
$application = Application::create(['job_id' => $jobs[1]->id, 'candidate_id' => $profile->id, 'cv_path' => 'application_cvs/e2e-submitted.pdf', 'cover_letter' => 'Genuine browser fixture application.', 'status' => 'applied', 'ai_analysis_status' => 'deferred']);
$conversation = Conversation::create(['candidate_id' => $users['candidate']->id, 'employer_id' => $users['employer']->id, 'job_id' => $jobs[1]->id, 'last_message_at' => now()]);
Message::create(['conversation_id' => $conversation->id, 'sender_id' => $users['candidate']->id, 'message' => 'Initial browser fixture message', 'is_read' => false]);
Notification::create(['user_id' => $users['employer']->id, 'type' => 'new_application', 'title' => 'E2E new application', 'content' => 'An application needs review.', 'data' => ['application_id' => $application->id, 'job_id' => $jobs[1]->id]]);
Notification::create(['user_id' => $users['candidate']->id, 'type' => 'app_status_changed', 'title' => 'E2E candidate notice', 'content' => 'Application received.', 'data' => ['application_id' => $application->id, 'job_id' => $jobs[1]->id]]);
file_put_contents($app->storagePath('fixture.json'), json_encode(['candidate_id' => $users['candidate']->id, 'outsider_id' => $users['outsider']->id, 'employer_id' => $users['employer']->id, 'admin_id' => $users['admin']->id, 'company_id' => $company->id, 'category_id' => $category->id, 'skill_id' => $skill->id, 'job_id' => $jobs[0]->id, 'applied_job_id' => $jobs[1]->id, 'closed_job_id' => $jobs[2]->id, 'application_id' => $application->id, 'conversation_id' => $conversation->id], JSON_PRETTY_PRINT));
echo "Isolated frontend_api_e2e_test fixture ready.\n";
