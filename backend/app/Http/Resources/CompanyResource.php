<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $logoUrl = null;
        if ($this->logo) {
            $logoUrl = filter_var($this->logo, FILTER_VALIDATE_URL)
                ? $this->logo
                : asset('storage/' . ltrim($this->logo, '/'));
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'logo' => $logoUrl,
            'website' => $this->website,
            'company_size' => $this->company_size,
            'size' => $this->company_size, // Alias cho FR-04.7
            'address' => $this->address,
            'city' => $this->city,
            'description' => $this->description,
            'active_jobs_count' => $this->when(isset($this->jobs_count), $this->jobs_count),
            'jobs' => JobResource::collection($this->whenLoaded('jobs')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
