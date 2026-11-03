<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resumes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained('candidate_profiles')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('template_key', 40);
            $table->unsignedInteger('template_version')->default(1);
            $table->unsignedInteger('schema_version')->default(1);
            $table->json('content');
            $table->json('settings');
            $table->unsignedInteger('revision')->default(1);
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
            $table->index(['candidate_id', 'updated_at', 'id']);
        });
    }

    public function down(): void { Schema::dropIfExists('resumes'); }
};
