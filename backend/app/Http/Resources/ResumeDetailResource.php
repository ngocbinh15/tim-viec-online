<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class ResumeDetailResource extends ResumeSummaryResource
{
    public function toArray(Request $request): array
    {
        return [...parent::toArray($request), ...$this->resource->document(), 'assets' => $this->whenLoaded('assets', fn () => $this->assets->map(fn ($asset) => ['id' => $asset->id, 'url' => '/api/candidate/resumes/'.$this->id.'/assets/'.$asset->id])->all()), 'capabilities' => ['edit' => (bool) config('resumes.enabled')]];
    }
}
