<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Add fields missing from older SQL imports without changing their data or migration ledger. */
    public function up(): void
    {
        foreach (['ai_analysis_status', 'ai_analysis_error'] as $column) {
            if (! Schema::hasColumn('applications', $column)) {
                Schema::table('applications', function (Blueprint $table) use ($column) {
                    if ($column === 'ai_analysis_status') {
                        $table->string($column, 20)->default('deferred');
                    } else {
                        $table->text($column)->nullable();
                    }
                });
            }
        }
        foreach (['image_path', 'read_at'] as $column) {
            if (! Schema::hasColumn('messages', $column)) {
                Schema::table('messages', function (Blueprint $table) use ($column) {
                    if ($column === 'image_path') {
                        $table->string($column)->nullable();
                    } else {
                        $table->timestamp($column)->nullable();
                    }
                });
            }
        }
        if (! Schema::hasTable('job_reports')) {
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
    }

    public function down(): void
    {
        // Forward-only compatibility repair: never remove imported data or fields owned by the base migration.
    }
};
