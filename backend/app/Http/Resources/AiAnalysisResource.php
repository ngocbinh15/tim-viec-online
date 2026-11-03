<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AiAnalysisResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'match_score' => $this->match_score,
            'summary' => $this->summary,
            'matched_skills' => $this->matched_skills,
            'missing_skills' => $this->missing_skills,
            'strengths' => $this->strengths,
            'recommendations' => $this->recommendations ?? [],
            'criteria_scores' => $this->criteria_scores,
            'provider' => $this->provider,
            'model' => $this->model,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
