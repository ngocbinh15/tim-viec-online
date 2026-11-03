<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobResource extends JsonResource
{
    /**
     * Định dạng số tiền sang triệu VNĐ hoặc VNĐ (FR-04.4)
     */
    private static function formatSalaryText(?int $amount): string
    {
        if (!$amount) {
            return '';
        }
        if ($amount >= 1000000 && $amount % 100000 === 0) {
            $mil = $amount / 1000000;
            return ($mil == (int) $mil ? (int) $mil : number_format($mil, 1, ',', '.')) . ' triệu VNĐ';
        }
        return number_format($amount, 0, ',', '.') . ' VNĐ';
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // FR-04.4: Định dạng mức lương theo 3 trường hợp thực tế
        $salaryDisplay = 'Thỏa thuận';
        $salaryType = 'negotiable';

        if (!$this->is_negotiable) {
            if ($this->salary_min && $this->salary_max) {
                $salaryType = 'range';
                $minStr = self::formatSalaryText($this->salary_min);
                $maxStr = self::formatSalaryText($this->salary_max);

                if (str_ends_with($minStr, ' triệu VNĐ') && str_ends_with($maxStr, ' triệu VNĐ')) {
                    $minNum = str_replace(' triệu VNĐ', '', $minStr);
                    $salaryDisplay = $minNum . ' - ' . $maxStr;
                } else {
                    $salaryDisplay = number_format($this->salary_min, 0, ',', '.') . ' - ' . number_format($this->salary_max, 0, ',', '.') . ' VNĐ';
                }
            } elseif ($this->salary_min) {
                $salaryType = 'from';
                $minStr = self::formatSalaryText($this->salary_min);
                $salaryDisplay = 'Từ ' . $minStr; // Hiển thị: "Từ X triệu VNĐ" (FR-04.4)
            } elseif ($this->salary_max) {
                $salaryType = 'to';
                $maxStr = self::formatSalaryText($this->salary_max);
                $salaryDisplay = 'Đến ' . $maxStr;
            }
        }

        // FR-04.6: Kiểm tra điều kiện nộp đơn (còn hạn và trạng thái active)
        $isExpired = $this->deadline ? $this->deadline->toDateString() < now()->toDateString() : false;
        $isClosed = $this->status === 'closed';
        $canApply = ($this->status === 'active') && !$isExpired;

        // Trạng thái hiển thị tiếng Việt
        $statusDisplay = match ($this->status) {
            'closed' => 'Đã đóng',
            'expired' => 'Hết hạn',
            default => $isExpired ? 'Hết hạn' : 'Đang tuyển',
        };

        // Thông báo phụ khi tin đã đóng hoặc hết hạn (FR-04.6 & FR-08.6)
        $notice = null;
        if ($isClosed) {
            $notice = 'Tin tuyển dụng đã đóng';
        } elseif ($isExpired) {
            $notice = 'Tin tuyển dụng đã hết hạn';
        }

        // Kiểm tra xem ứng viên đang đăng nhập đã lưu hoặc đã nộp đơn chưa
        $user = $request->user('sanctum');
        $isSaved = false;
        $isApplied = false;

        if ($user && $user->isCandidate() && $user->candidateProfile) {
            $candidateId = $user->candidateProfile->id;

            if ($this->relationLoaded('savedByCandidates')) {
                $isSaved = $this->savedByCandidates->contains('id', $candidateId);
            }

            if ($this->relationLoaded('applications')) {
                $appliedApp = $this->applications->first(function ($app) use ($candidateId) {
                    return (int) $app->candidate_id === (int) $candidateId;
                });
                $isApplied = $appliedApp !== null;
            }
        }

        // FR-06.4: Ràng buộc nút ứng tuyển trên giao diện
        $applyButtonDisabled = !$canApply || $isApplied;
        $applyButtonMessage = null;
        if ($isApplied) {
            $applyButtonMessage = 'Bạn đã nộp hồ sơ cho công việc này rồi';
        } elseif (!$canApply) {
            $applyButtonMessage = $notice;
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
            'salary_type' => $salaryType,
            'salary_display' => $salaryDisplay,
            'deadline' => $this->deadline?->format('Y-m-d'),
            'deadline_display' => $this->deadline?->format('d/m/Y'),
            'is_expired' => $isExpired,
            'is_closed' => $isClosed,
            'can_apply' => $canApply, // FR-04.6: dùng để ẩn nút Ứng tuyển trên frontend
            'status' => $this->status,
            'status_display' => $statusDisplay,
            'notice' => $notice,
            'views_count' => $this->views_count,
            'description' => $this->description,
            'requirements' => $this->requirements,
            'benefits' => $this->benefits,
            'is_reported' => (bool) $this->is_reported,
            'reports' => $this->whenLoaded('reports', fn () => $this->reports->map(fn ($report) => [
                'id' => $report->id,
                'reporter_id' => $report->reporter_id,
                'reporter_name' => $report->reporter?->name,
                'reason' => $report->reason,
                'details' => $report->details,
                'status' => $report->status,
                'created_at' => $report->created_at?->toIso8601String(),
            ])),
            'is_saved' => $isSaved,
            'is_applied' => $isApplied,
            'apply_button_disabled' => $applyButtonDisabled, // FR-06.4
            'apply_button_message' => $applyButtonMessage, // FR-06.4
            'applications_count' => $this->when(isset($this->applications_count), $this->applications_count),
            'company' => new CompanyResource($this->whenLoaded('company')),
            'category' => $this->whenLoaded('category'),
            'skills' => $this->whenLoaded('skills'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
