<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resume_exports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('revision');
            $table->string('renderer_version', 40);
            $table->char('input_hash', 64);
            $table->json('input_snapshot');
            $table->string('status', 20)->default('pending');
            $table->uuid('attempt_token')->nullable();
            $table->string('path')->nullable();
            $table->unsignedInteger('size')->nullable();
            $table->unsignedSmallInteger('page_count')->nullable();
            $table->char('sha256', 64)->nullable();
            $table->string('error_code', 60)->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['resume_id', 'revision', 'renderer_version']);
            $table->index(['status', 'updated_at']);
        });
    }

    public function down(): void { Schema::dropIfExists('resume_exports'); }
};
