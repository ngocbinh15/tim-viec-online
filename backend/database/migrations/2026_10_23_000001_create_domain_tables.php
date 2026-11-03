<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidate_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('title', 100)->nullable();
            $table->unsignedTinyInteger('experience_years')->default(0);
            $table->text('bio')->nullable();
            $table->string('avatar')->nullable();
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('cv_file_path')->nullable();
            $table->json('social_links')->nullable();
            $table->timestamps();
        });

        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('name', 200);
            $table->string('logo')->nullable();
            $table->string('website')->nullable();
            $table->string('company_size', 50)->nullable();
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->unique();
        });

        Schema::create('skills', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
        });

        Schema::create('candidate_skills', function (Blueprint $table) {
            $table->foreignId('candidate_id')->constrained('candidate_profiles')->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->primary(['candidate_id', 'skill_id']);
        });

        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('title', 255);
            $table->string('job_level', 50)->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->text('description');
            $table->text('requirements');
            $table->text('benefits');
            $table->unsignedBigInteger('salary_min')->nullable();
            $table->unsignedBigInteger('salary_max')->nullable();
            $table->boolean('is_negotiable')->default(false);
            $table->enum('job_type', ['full_time', 'part_time', 'remote', 'internship'])->default('full_time');
            $table->string('city', 100);
            $table->string('address')->nullable();
            $table->date('deadline');
            $table->enum('status', ['active', 'closed', 'expired'])->default('active');
            $table->boolean('is_reported')->default(false);
            $table->string('rejection_reason')->nullable();
            $table->unsignedInteger('views_count')->default(0);
            $table->timestamps();
            $table->index(['status', 'city', 'salary_min', 'salary_max', 'deadline'], 'jobs_filter_idx');
            $table->index('updated_at', 'jobs_updated_at_idx');
            $table->index('company_id', 'jobs_company_idx');
            $table->index('category_id', 'jobs_category_idx');
            $table->index('is_reported', 'jobs_reported_idx');
        });

        Schema::create('job_skills', function (Blueprint $table) {
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->primary(['job_id', 'skill_id']);
        });

        Schema::create('saved_jobs', function (Blueprint $table) {
            $table->foreignId('candidate_id')->constrained('candidate_profiles')->cascadeOnDelete();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->primary(['candidate_id', 'job_id']);
        });

        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->foreignId('candidate_id')->constrained('candidate_profiles')->cascadeOnDelete();
            $table->string('cv_path');
            $table->text('cover_letter')->nullable();
            $table->enum('status', ['applied', 'waiting', 'accepted', 'rejected', 'withdrawn'])->default('applied');
            $table->string('ai_analysis_status', 20)->default('pending');
            $table->text('ai_analysis_error')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique(['job_id', 'candidate_id'], 'unique_job_application');
            $table->index('status');
        });

        Schema::create('ai_cv_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('match_score');
            $table->text('summary');
            $table->json('matched_skills');
            $table->json('missing_skills');
            $table->json('strengths');
            $table->json('recommendations')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['candidate_id', 'employer_id', 'job_id']);
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('message')->nullable();
            $table->string('image_path')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['conversation_id', 'created_at']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('content');
            $table->string('type', 50);
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'read_at'], 'notifications_user_read_idx');
        });

        Schema::create('job_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 100);
            $table->text('details')->nullable();
            $table->enum('status', ['pending', 'resolved', 'dismissed'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique(['job_id', 'reporter_id'], 'job_reports_job_reporter_unique');
            $table->index(['status', 'created_at'], 'job_reports_status_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_reports');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('ai_cv_analyses');
        Schema::dropIfExists('applications');
        Schema::dropIfExists('saved_jobs');
        Schema::dropIfExists('job_skills');
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('candidate_skills');
        Schema::dropIfExists('skills');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('companies');
        Schema::dropIfExists('candidate_profiles');
    }
};
