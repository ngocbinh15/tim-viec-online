<?php

namespace App\Models;

use App\Events\NotificationSent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    protected $table = 'notifications';

    // notifications table only has created_at, no updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'title',
        'content',
        'type',
        'data',
        'read_at',
    ];

    protected $appends = [
        'is_read',
        'time_ago',
        'redirect_url',
        'status_display',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (Notification $notification) {
            try {
                $unread = static::where('user_id', $notification->user_id)
                    ->whereNull('read_at')
                    ->count();
                broadcast(new NotificationSent($notification, $unread))->toOthers();
            } catch (\Throwable $e) {
                // Tiếp tục luồng bình thường nếu Reverb daemon chưa khởi động
            }
        });
    }

    public function getIsReadAttribute(): bool
    {
        return $this->read_at !== null;
    }

    public function getTimeAgoAttribute(): string
    {
        if (! $this->created_at) {
            return '';
        }

        return $this->created_at->locale('vi')->diffForHumans();
    }

    public function getStatusDisplayAttribute(): string
    {
        return $this->read_at !== null ? 'Đã đọc' : 'Chưa đọc';
    }

    public function getRedirectUrlAttribute(): string
    {
        $data = $this->data ?? [];
        $workspace = $this->user?->isEmployer() ? '/employer' : '/account';

        return match ($this->type) {
            'new_application', 'new_applicant' => isset($data['application_id'])
                ? '/employer/candidates/'.(int) $data['application_id']
                : '/employer/candidates'.(isset($data['job_id']) ? '?job_id='.(int) $data['job_id'] : ''),
            'app_status_changed', 'application_accepted', 'application_rejected', 'application_waiting' => '/account/jobs',
            'new_message', 'chat' => isset($data['conversation_id'])
                ? $workspace.'/messages?conversation='.(int) $data['conversation_id']
                : $workspace.'/messages',
            'security' => '/account/security',
            default => $workspace.'/notifications',
        };
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    public function markAsRead(): bool
    {
        return $this->update(['read_at' => now()]);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
