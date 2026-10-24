<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Job extends Model
{
    use HasFactory;

    protected $table = 'jobs';

    protected $fillable = [
        'company_id',
        'category_id',
        'title',
        'job_level',
        'quantity',
        'description',
        'requirements',
        'benefits',
        'salary_min',
        'salary_max',
        'is_negotiable',
        'job_type',
        'city',
        'address',
        'deadline',
        'status',
        'is_reported',
        'rejection_reason',
        'views_count',
    ];

    protected function casts(): array
    {
        return [
            'is_negotiable' => 'boolean',
            'is_reported' => 'boolean',
            'deadline' => 'date',
            'quantity' => 'integer',
            'salary_min' => 'integer',
            'salary_max' => 'integer',
            'views_count' => 'integer',
        ];
    }

    // Scopes
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
            ->whereDate('deadline', '>=', now()->toDateString());
    }

    // Relationships
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'job_skills', 'job_id', 'skill_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'job_id');
    }

    public function savedByCandidates(): BelongsToMany
    {
        return $this->belongsToMany(CandidateProfile::class, 'saved_jobs', 'job_id', 'candidate_id')
            ->withPivot('created_at');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'job_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(JobReport::class, 'job_id');
    }
}
