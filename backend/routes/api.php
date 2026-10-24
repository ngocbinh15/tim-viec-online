<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AiAnalysisController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CandidateProfileController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\JobReportController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SkillController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Authentication (Public)
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1')->name('login');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,15');
Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,15');
Route::match(['get', 'post'], '/verify-reset-token', [AuthController::class, 'verifyResetToken'])->middleware('throttle:20,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
Route::post('/password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');

// Reports require an authenticated account to discourage anonymous spam.
Route::middleware('auth:sanctum')->post('/jobs/{id}/report', [JobReportController::class, 'store']);

// Master Data: Categories & Skills (Public)
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);
Route::get('/skills', [SkillController::class, 'index']);
Route::get('/skills/{id}', [SkillController::class, 'show']);

// Companies (Public)
Route::get('/companies', [CompanyController::class, 'index']);
Route::get('/companies/{id}', [CompanyController::class, 'show']);

// Jobs (Public Search & Filter)
Route::get('/locations/cities', [JobController::class, 'cities']);
Route::get('/jobs', [JobController::class, 'index']);
Route::get('/jobs/{id}', [JobController::class, 'show']);

// Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth profile & password
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user/change-password', [AuthController::class, 'changePassword']);

    // Realtime Chat (FR-08)
    Route::get('/conversations', [ChatController::class, 'index']);
    Route::post('/conversations', [ChatController::class, 'startConversation']);
    Route::get('/conversations/{id}/messages', [ChatController::class, 'messages']);
    Route::post('/conversations/{id}/messages', [ChatController::class, 'sendMessage']);
    Route::get('/conversations/{conversationId}/messages/{messageId}/image', [ChatController::class, 'downloadMessageImage']);
    Route::patch('/conversations/{id}/read', [ChatController::class, 'markAsRead']);

    // Web Notifications (FR-10)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // AI CV Analysis (FR-07)
    Route::prefix('applications')->group(function () {
        Route::post('/{applicationId}/ai-analyze', [AiAnalysisController::class, 'analyzeAndStore']);
        Route::get('/{applicationId}/ai-analysis', [AiAnalysisController::class, 'show']);
        Route::get('/{applicationId}/cv', [ApplicationController::class, 'downloadCv']);
    });

    // Candidate Routes (FR-03, FR-05.6, FR-06)
    Route::middleware('role:candidate')->prefix('candidate')->group(function () {
        Route::get('/profile', [CandidateProfileController::class, 'show']);
        Route::post('/profile', [CandidateProfileController::class, 'update']);
        Route::put('/profile', [CandidateProfileController::class, 'update']);
        Route::post('/cv', [CandidateProfileController::class, 'uploadCv']);
        Route::get('/cv', [CandidateProfileController::class, 'getCv']);
        Route::delete('/cv', [CandidateProfileController::class, 'deleteCv']);
        Route::get('/cv/file', [CandidateProfileController::class, 'downloadCv']);
        Route::post('/avatar', [CandidateProfileController::class, 'uploadAvatar']);
        Route::delete('/avatar', [CandidateProfileController::class, 'deleteAvatar']);
        Route::get('/saved-jobs', [JobController::class, 'savedJobs']);
        Route::get('/applications', [ApplicationController::class, 'candidateHistory']);
        Route::delete('/applications/{id}/withdraw', [ApplicationController::class, 'withdraw']);
    });
    // Candidate Job Actions (Apply & Save)
    Route::post('/jobs/{id}/apply', [ApplicationController::class, 'apply']);
    Route::middleware('role:candidate')->group(function () {
        Route::post('/jobs/{id}/save', [JobController::class, 'saveJob']);
        Route::delete('/jobs/{id}/save', [JobController::class, 'unsaveJob']);
    });

    // Employer Routes (FR-04, FR-06)
    Route::middleware('role:employer')->prefix('employer')->group(function () {
        // Company Profile
        Route::get('/company', [CompanyController::class, 'myCompany']);
        Route::post('/company', [CompanyController::class, 'updateCompany']);

        // Job Management
        Route::get('/my-jobs', [JobController::class, 'myJobs']);
        Route::post('/jobs', [JobController::class, 'store']);
        Route::put('/jobs/{id}', [JobController::class, 'update']);
        Route::patch('/jobs/{id}/status', [JobController::class, 'toggleStatus']);

        // Applicant Management
        Route::get('/jobs/{id}/applications', [ApplicationController::class, 'jobApplicants']);
        Route::get('/applications/{id}', [ApplicationController::class, 'showEmployerApplication']);
        Route::patch('/applications/{id}/status', [ApplicationController::class, 'updateStatus']);
    });

    // Admin Routes (FR-09)
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        // Dashboard Stats
        Route::get('/stats', [AdminController::class, 'stats']);

        // Users Moderation (FR-09.4)
        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/users/{id}', [AdminController::class, 'userDetail']);
        Route::patch('/users/{id}/status', [AdminController::class, 'updateUserStatus']);
        Route::patch('/users/{id}/toggle-lock', [AdminController::class, 'toggleLockUser']);

        // Jobs Moderation (FR-09.1, FR-09.2)
        Route::get('/jobs', [AdminController::class, 'jobs']);
        Route::get('/jobs/reported', [AdminController::class, 'getReportedJobs']);
        Route::patch('/jobs/{id}/report', [AdminController::class, 'resolveJobReports']);
        Route::get('/jobs/{id}', [AdminController::class, 'jobDetail']);
        Route::delete('/jobs/{id}', [AdminController::class, 'deleteJob']);

        // Categories Management (FR-09.5)
        Route::get('/categories', [AdminController::class, 'categories']);
        Route::post('/categories', [AdminController::class, 'storeCategory']);
        Route::put('/categories/{id}', [AdminController::class, 'updateCategory']);
        Route::delete('/categories/{id}', [AdminController::class, 'destroyCategory']);

        // Skills Management (FR-09.5)
        Route::get('/skills', [AdminController::class, 'skills']);
        Route::post('/skills', [AdminController::class, 'storeSkill']);
        Route::put('/skills/{id}', [AdminController::class, 'updateSkill']);
        Route::delete('/skills/{id}', [AdminController::class, 'destroySkill']);
    });
});
