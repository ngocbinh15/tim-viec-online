<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEXES = [
        'conversations' => [
            'conversations_candidate_activity_idx' => ['candidate_id', 'last_message_at', 'id'],
            'conversations_employer_activity_idx' => ['employer_id', 'last_message_at', 'id'],
        ],
        'messages' => ['messages_conversation_unread_idx' => ['conversation_id', 'is_read', 'sender_id']],
        'notifications' => ['notifications_user_created_idx' => ['user_id', 'created_at', 'id']],
        'jobs' => ['jobs_created_at_idx' => ['created_at']],
        'applications' => ['applications_created_at_idx' => ['created_at']],
    ];

    public function up(): void
    {
        foreach (self::INDEXES as $tableName => $indexes) {
            foreach ($indexes as $name => $columns) {
                if (! Schema::hasIndex($tableName, $name)) {
                    Schema::table($tableName, fn (Blueprint $table) => $table->index($columns, $name));
                }
            }
        }
    }

    public function down(): void
    {
        foreach (array_reverse(self::INDEXES, true) as $tableName => $indexes) {
            foreach (array_reverse($indexes, true) as $name => $columns) {
                if (Schema::hasIndex($tableName, $name)) {
                    Schema::table($tableName, fn (Blueprint $table) => $table->dropIndex($name));
                }
            }
        }
    }
};
