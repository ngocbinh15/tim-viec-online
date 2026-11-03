<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_change_requests', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->string('email', 254);
            $table->char('token', 64);
            $table->string('password_hash');
            $table->char('credential_hash', 64);
            $table->dateTime('created_at');
            $table->dateTime('expires_at')->index();
        });
        Schema::table('password_reset_tokens', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->char('credential_hash', 64)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('password_reset_tokens', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'credential_hash']);
        });
        Schema::dropIfExists('password_change_requests');
    }
};
