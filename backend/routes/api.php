<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CandidateProfileController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SkillController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Authentication (Public)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->name('login');

// Master Data: Categories & Skills (Public)
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);
Route::get('/skills', [SkillController::class, 'index']);
Route::get('/skills/{id}', [SkillController::class, 'show']);

// Companies (Public)
Route::get('/companies', [CompanyController::class, 'index']);
Route::get('/companies/{id}', [CompanyController::class, 'show']);

// Jobs (Public Search & Filter)
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

    // Web Notifications (FR-10)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Candidate Routes (FR-03, FR-05.6, FR-06)
    Route::middleware('role:candidate')->prefix('candidate')->group(function () {
        Route::get('/profile', [CandidateProfileController::class, 'show']);
        Route::post('/profile', [CandidateProfileController::class, 'update']);
        Route::get('/saved-jobs', [JobController::class, 'savedJobs']);
        Route::get('/applications', [ApplicationController::class, 'candidateHistory']);
        Route::delete('/applications/{id}/withdraw', [ApplicationController::class, 'withdraw']);
    });
    // Candidate Job Actions (Apply & Save)
    Route::middleware('role:candidate')->group(function () {
        Route::post('/jobs/{id}/apply', [ApplicationController::class, 'apply']);
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
        Route::patch('/users/{id}/status', [AdminController::class, 'updateUserStatus']);

        // Jobs Moderation (FR-09.1, FR-09.2)
        Route::get('/jobs', [AdminController::class, 'jobs']);
        Route::delete('/jobs/{id}', [AdminController::class, 'deleteJob']);

        // Categories Management (FR-09.5)
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{id}', [CategoryController::class, 'update']);
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

        // Skills Management (FR-09.5)
        Route::get('/skills', [SkillController::class, 'index']);
        Route::post('/skills', [SkillController::class, 'store']);
        Route::put('/skills/{id}', [SkillController::class, 'update']);
        Route::delete('/skills/{id}', [SkillController::class, 'destroy']);
    });
});
