<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->uuid('ai_request_id')->nullable();
            $table->timestamp('ai_requested_at')->nullable();
            $table->json('ai_job_snapshot')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn(['ai_request_id', 'ai_requested_at', 'ai_job_snapshot']);
        });
    }
};
