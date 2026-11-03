<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demo_seed_runs', function (Blueprint $table) {
            $table->id();
            $table->string('run_key', 64)->unique();
            $table->json('options');
            $table->json('counts');
            $table->timestamp('completed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demo_seed_runs');
    }
};
