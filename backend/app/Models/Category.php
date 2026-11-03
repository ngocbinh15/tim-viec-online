<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    protected $table = 'categories';

    // The categories table has no created_at and updated_at columns
    public $timestamps = false;

    protected $fillable = [
        'name',
    ];

    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class, 'category_id');
    }
}
