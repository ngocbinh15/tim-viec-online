<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resume_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('mime_type', 40);
            $table->unsignedInteger('size');
            $table->char('sha256', 64);
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('resume_assets'); }
};
