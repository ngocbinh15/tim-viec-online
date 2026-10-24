<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApplicationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // FR-06.5: Vòng đời trạng thái hồ sơ ứng tuyển
        $statusLabels = [
            'applied' => 'Đã ứng tuyển',
            'waiting' => 'Đang xem xét',
            'accepted' => 'Trúng tuyển',
            'rejected' => 'Từ chối',
            'withdrawn' => 'Đã rút hồ sơ',
        ];

        // Ứng viên chỉ được rút đơn khi chưa được NTD xem (status = applied và reviewed_at null)
        $canWithdraw = $this->status === 'applied' && $this->reviewed_at === null;

        return [
            'id' => $this->id,
            'job_id' => $this->job_id,
            'candidate_id' => $this->candidate_id,
            'cv_url' => $this->cv_path ? url('/api/applications/' . $this->id . '/cv') : null,
            'ai_analysis_status' => $this->ai_analysis_status ?? ($this->aiAnalysis ? 'completed' : 'pending'),
            'ai_analysis_error' => $this->ai_analysis_error,
            'cover_letter' => $this->cover_letter,
            'status' => $this->status,
            'status_label' => $statusLabels[$this->status] ?? $this->status,
            'can_withdraw' => $canWithdraw,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'applied_at_display' => $this->created_at?->format('d/m/Y H:i'),
            'job' => new JobResource($this->whenLoaded('job')),
            'candidate' => $this->whenLoaded('candidateProfile', function () {
                $user = $this->candidateProfile->user;
                return [
                    'id' => $this->candidateProfile->id,
                    'user_id' => $this->candidateProfile->user_id,
                    'name' => $user?->name,
                    'email' => $user?->email,
                    'phone' => $user?->phone,
                    'title' => $this->candidateProfile->title,
                    'experience_years' => $this->candidateProfile->experience_years,
                    'city' => $this->candidateProfile->city,
                    'avatar_url' => $this->candidateProfile->avatar ? asset('storage/' . $this->candidateProfile->avatar) : null,
                    'skills' => $this->candidateProfile->skills,
                ];
            }),
            'ai_analysis' => $this->whenLoaded('aiAnalysis', function () {
                return [
                    'id' => $this->aiAnalysis->id,
                    'match_score' => $this->aiAnalysis->match_score,
                    'summary' => $this->aiAnalysis->summary,
                    'matched_skills' => $this->aiAnalysis->matched_skills,
                    'missing_skills' => $this->aiAnalysis->missing_skills,
                    'strengths' => $this->aiAnalysis->strengths,
                    'recommendations' => $this->aiAnalysis->recommendations,
                    'created_at' => $this->aiAnalysis->created_at?->toIso8601String(),
                ];
            }),
        ];
    }
}
