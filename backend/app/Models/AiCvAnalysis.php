<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiCvAnalysis extends Model
{
    use HasFactory;

    protected $table = 'ai_cv_analyses';

    // ai_cv_analyses table only has created_at, no updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'application_id',
        'match_score',
        'summary',
        'matched_skills',
        'missing_skills',
        'strengths',
        'recommendations',
    ];

    protected function casts(): array
    {
        return [
            'match_score' => 'integer',
            'matched_skills' => 'array',
            'missing_skills' => 'array',
            'strengths' => 'array',
            'recommendations' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class, 'application_id');
    }
}
