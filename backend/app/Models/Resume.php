<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resume extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['content' => 'array', 'settings' => 'array', 'revision' => 'integer', 'schema_version' => 'integer', 'template_version' => 'integer', 'is_demo' => 'boolean'];
    }

    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(CandidateProfile::class, 'candidate_id');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(ResumeAsset::class);
    }

    public function exports(): HasMany
    {
        return $this->hasMany(ResumeExport::class);
    }

    public function document(): array
    {
        return $this->only(['name', 'template_key', 'template_version', 'schema_version', 'content', 'settings']);
    }
}
