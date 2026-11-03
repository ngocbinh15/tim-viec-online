<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->json('email_notifications')->nullable());
        Schema::create('notification_email_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category', 20);
            $table->unsignedBigInteger('scope_id');
            $table->unsignedBigInteger('source_id');
            $table->char('recipient_email_hash', 64);
            $table->string('source_status', 20)->nullable();
            $table->unsignedBigInteger('generation')->default(1);
            $table->string('state', 20)->default('pending');
            $table->dateTime('ready_at');
            $table->dateTime('processing_at')->nullable();
            $table->dateTime('delivered_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'category', 'scope_id'], 'notification_email_scope_unique');
            $table->index(['state', 'ready_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_email_deliveries');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('email_notifications'));
    }
};
