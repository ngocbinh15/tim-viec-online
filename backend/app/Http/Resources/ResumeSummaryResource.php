<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResumeSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'name' => $this->name, 'template_key' => $this->template_key, 'revision' => $this->revision, 'updated_at' => $this->updated_at?->toIso8601String(), 'latest_export' => $this->relationLoaded('exports') && $this->exports->isNotEmpty() ? new ResumeExportResource($this->exports->first()) : null];
    }
}
