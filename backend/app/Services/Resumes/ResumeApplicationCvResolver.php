<?php

namespace App\Services\Resumes;

use App\Models\ResumeExport;
use App\Models\User;
use App\Services\ApplicationCvStorage;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ResumeApplicationCvResolver
{
    public function snapshot(User $user, int $exportId): string
    {
        $export = ResumeExport::whereHas('resume', fn ($q) => $q->where('candidate_id', $user->candidateProfile?->id))->findOrFail($exportId);
        $disk = Storage::disk('private');
        if ($export->status !== 'ready' || ! $export->path || ! $disk->exists($export->path) || $disk->size($export->path) > 5242880) {
            throw ValidationException::withMessages(['resume_export_id' => 'PDF chưa sẵn sàng hoặc đã bị mất. Vui lòng mở CV và xuất lại.']);
        }

        return app(ApplicationCvStorage::class)->snapshot($export->path);
    }
}
