<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeAsset extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['path'];

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
