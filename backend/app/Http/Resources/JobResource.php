<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Định dạng mức lương hiển thị theo NFR-08 & FR-04.4
        $salaryDisplay = 'Thỏa thuận';
        if (!$this->is_negotiable) {
            if ($this->salary_min && $this->salary_max) {
                $salaryDisplay = number_format($this->salary_min, 0, ',', '.') . ' - ' . number_format($this->salary_max, 0, ',', '.') . ' VNĐ';
            } elseif ($this->salary_min) {
                $salaryDisplay = 'Từ ' . number_format($this->salary_min, 0, ',', '.') . ' VNĐ';
            } elseif ($this->salary_max) {
                $salaryDisplay = 'Đến ' . number_format($this->salary_max, 0, ',', '.') . ' VNĐ';
            }
        }

        // Kiểm tra xem ứng viên đang đăng nhập đã lưu hoặc đã nộp đơn chưa
        $user = $request->user('sanctum');
        $isSaved = false;
        $isApplied = false;

        if ($user && $user->isCandidate() && $user->candidateProfile) {
            $candidateId = $user->candidateProfile->id;

            // Nếu quan hệ đã được eager load
            if ($this->relationLoaded('savedByCandidates')) {
                $isSaved = $this->savedByCandidates->contains('id', $candidateId);
            }

            if ($this->relationLoaded('applications')) {
                $isApplied = $this->applications->contains('candidate_id', $candidateId);
            }
        }

        return [
            'id' => $this->id,
            'title' => $this->title,
            'company_id' => $this->company_id,
            'category_id' => $this->category_id,
            'job_level' => $this->job_level,
            'quantity' => $this->quantity,
            'job_type' => $this->job_type,
            'city' => $this->city,
            'address' => $this->address,
            'salary_min' => $this->salary_min,
            'salary_max' => $this->salary_max,
            'is_negotiable' => (bool) $this->is_negotiable,
            'salary_display' => $salaryDisplay,
            'deadline' => $this->deadline?->format('Y-m-d'),
            'deadline_display' => $this->deadline?->format('d/m/Y'),
            'is_expired' => $this->deadline ? $this->deadline->isPast() : false,
            'status' => $this->status,
            'views_count' => $this->views_count,
            'description' => $this->description,
            'requirements' => $this->requirements,
            'benefits' => $this->benefits,
            'is_reported' => (bool) $this->is_reported,
            'is_saved' => $isSaved,
            'is_applied' => $isApplied,
            'applications_count' => $this->when(isset($this->applications_count), $this->applications_count),
            'company' => new CompanyResource($this->whenLoaded('company')),
            'category' => $this->whenLoaded('category'),
            'skills' => $this->whenLoaded('skills'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
