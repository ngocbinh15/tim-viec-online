<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_cv_analyses', function (Blueprint $table) {
            $table->json('criteria_scores')->nullable();
            $table->string('provider', 20)->nullable();
            $table->string('model', 120)->nullable();
            $table->string('prompt_version', 40)->nullable();
            $table->char('input_hash', 64)->nullable();
            $table->json('token_usage')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('ai_cv_analyses', fn (Blueprint $table) => $table->dropColumn([
            'criteria_scores', 'provider', 'model', 'prompt_version', 'input_hash', 'token_usage',
        ]));
    }
};
