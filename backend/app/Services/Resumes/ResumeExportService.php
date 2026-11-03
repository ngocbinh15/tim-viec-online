<?php

namespace App\Services\Resumes;

use App\Jobs\RenderResumePdf;
use App\Models\CandidateProfile;
use App\Models\Resume;
use App\Models\ResumeExport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ResumeExportService
{
    public function request(Resume $resume, int $revision): ResumeExport
    {
        ResumeService::enabled();
        $dispatch = false;
        $export = DB::transaction(function () use ($resume, $revision, &$dispatch) {
            CandidateProfile::whereKey($resume->candidate_id)->lockForUpdate()->firstOrFail();
            $current = Resume::whereKey($resume->id)->lockForUpdate()->firstOrFail();
            if ($current->revision !== $revision) {
                ResumeService::conflict();
            }
            ResumeSchema::requireExportable($current->document());
            $existing = $current->exports()->where('revision', $revision)->where('renderer_version', config('resumes.renderer_version'))->first();
            $readyFileExists = $existing?->status === 'ready' && $existing->path && Storage::disk('private')->exists($existing->path);
            if ($existing && ($readyFileExists || (in_array($existing->status, ['pending', 'processing']) && $existing->updated_at->gt(now()->subMinutes(2))))) {
                return $existing;
            }
            $active = ResumeExport::whereHas('resume', fn ($q) => $q->where('candidate_id', $current->candidate_id))->whereIn('status', ['pending', 'processing'])->where('updated_at', '>', now()->subMinutes(2))->count();
            if ($active >= 2) {
                throw ValidationException::withMessages(['revision' => 'Bạn đang có hai yêu cầu xuất CV. Vui lòng đợi hoàn tất.']);
            }
            $input = $current->document();
            $export = $existing ?? new ResumeExport(['resume_id' => $current->id, 'revision' => $revision, 'renderer_version' => config('resumes.renderer_version')]);
            $export->fill(['input_snapshot' => $input, 'input_hash' => hash('sha256', json_encode($input)), 'status' => 'pending', 'attempt_token' => (string) Str::uuid(), 'error_code' => null, 'started_at' => null, 'completed_at' => null, 'path' => null, 'size' => null, 'page_count' => null, 'sha256' => null]);
            $export->save();
            $dispatch = true;

            return $export;
        });
        if ($dispatch) {
            try {
                RenderResumePdf::dispatch($export->id, $export->attempt_token)->afterCommit();
            } catch (\Throwable) {
                $export->update(['status' => 'failed', 'error_code' => 'QUEUE_UNAVAILABLE']);
            }
        }

        return $export->refresh();
    }
}
