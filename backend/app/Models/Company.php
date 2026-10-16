<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasFactory;

    protected $table = 'companies';

    protected $fillable = [
        'user_id',
        'name',
        'logo',
        'website',
        'company_size',
        'address',
        'city',
        'description',
    ];

    /**
     * FR-04.1: Kiểm tra hồ sơ công ty đã cập nhật đủ thông tin bắt buộc chưa
     */
    public function isComplete(): bool
    {
        return !empty($this->name) &&
               !empty($this->description) &&
               !empty($this->address) &&
               !empty($this->city);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class, 'company_id');
    }
}
