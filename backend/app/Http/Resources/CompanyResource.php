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
        $avatar = $this->avatar ?: $this->logo;
        if ($avatar) {
            $logoUrl = filter_var($avatar, FILTER_VALIDATE_URL)
                ? $avatar
                : '/storage/'.ltrim($avatar, '/');
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'logo' => $logoUrl,
            'avatar' => $logoUrl,
            'is_demo' => (bool) $this->is_demo,
            'reference_sources' => $this->reference_sources,
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
