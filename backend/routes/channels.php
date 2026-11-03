<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Kênh riêng tư cho cuộc trò chuyện giữa Ứng viên & Nhà tuyển dụng (FR-08.5)
Broadcast::channel('chat.{conversationId}', function ($user, $conversationId) {
    $conversation = Conversation::find($conversationId);
    if (!$conversation) {
        return false;
    }

    return (int) $user->id === (int) $conversation->candidate_id || (int) $user->id === (int) $conversation->employer_id;
});
