<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $table = 'messages';

    protected $hidden = ['image_path'];

    // messages table only has created_at, no updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'message',
        'image_path',
        'is_read',
        'read_at',
    ];

    protected $appends = [
        'image_url',
        'time_display',
        'status_display',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'created_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? url('/api/conversations/' . $this->conversation_id . '/messages/' . $this->id . '/image')
            : null;
    }

    public function getTimeDisplayAttribute(): ?string
    {
        return $this->created_at?->format('H:i');
    }

    public function getStatusDisplayAttribute(): string
    {
        return $this->is_read ? 'Đã xem' : 'Đã gửi';
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
