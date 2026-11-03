<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationEmailDelivery extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer', 'scope_id' => 'integer', 'source_id' => 'integer', 'generation' => 'integer',
            'ready_at' => 'datetime', 'processing_at' => 'datetime', 'delivered_at' => 'datetime',
        ];
    }
}
