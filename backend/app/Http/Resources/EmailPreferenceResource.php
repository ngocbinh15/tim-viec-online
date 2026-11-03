<?php

namespace App\Http\Resources;

use App\Services\NotificationEmailService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmailPreferenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return NotificationEmailService::preferences($this->resource);
    }
}
