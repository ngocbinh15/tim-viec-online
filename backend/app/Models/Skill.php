<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Skill extends Model
{
    use HasFactory;

    protected $table = 'skills';

    // The skills table has no created_at and updated_at columns
    public $timestamps = false;

    protected $fillable = [
        'name',
    ];

    public function candidateProfiles(): BelongsToMany
    {
        return $this->belongsToMany(CandidateProfile::class, 'candidate_skills', 'skill_id', 'candidate_id');
    }

    public function jobs(): BelongsToMany
    {
        return $this->belongsToMany(Job::class, 'job_skills', 'skill_id', 'job_id');
    }
}
