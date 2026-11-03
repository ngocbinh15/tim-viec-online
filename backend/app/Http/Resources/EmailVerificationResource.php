<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmailVerificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['email' => $this->email, 'verified' => $this->hasVerifiedEmail()];
    }
}
