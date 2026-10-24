<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Notification $notification;
    public int $unreadCount;

    public function __construct(Notification $notification, int $unreadCount = 0)
    {
        $this->notification = $notification;
        $this->unreadCount = $unreadCount;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.' . $this->notification->user_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id,
            'title' => $this->notification->title,
            'content' => $this->notification->content,
            'type' => $this->notification->type,
            'data' => $this->notification->data,
            'redirect_url' => $this->notification->redirect_url,
            'is_read' => false,
            'status_display' => 'Chưa đọc',
            'time_ago' => $this->notification->time_ago ?? 'vừa xong',
            'created_at' => $this->notification->created_at?->toIso8601String(),
            'unread_count' => $this->unreadCount,
        ];
    }
}
