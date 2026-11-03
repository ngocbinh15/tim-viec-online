<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ResumeExport extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['path', 'input_snapshot', 'attempt_token'];

    protected function casts(): array
    {
        return ['input_snapshot' => 'array', 'revision' => 'integer', 'started_at' => 'datetime', 'completed_at' => 'datetime'];
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    public function downloadName(): string
    {
        $name = (string) data_get($this->input_snapshot, 'content.basics.full_name', '');
        $name = preg_replace('/[\\\\\/:*?"<>|\p{C}]+/u', ' ', $name);
        $name = trim(mb_strcut(Str::squish($name), 0, 180, 'UTF-8'), ' .');

        return $name !== '' ? $name.' CV.pdf' : 'CV.pdf';
    }
}
