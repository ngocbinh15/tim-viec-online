<?php

namespace App\Jobs;

use App\Models\ResumeExport;
use App\Services\Resumes\RenderInput;
use App\Services\Resumes\ResumePdfRenderer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class RenderResumePdf implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 45;

    public function __construct(public int $exportId, public string $attemptToken)
    {
        $this->onQueue('cv');
    }

    public function backoff(): array
    {
        return [5];
    }

    public function handle(ResumePdfRenderer $renderer): void
    {
        $claimed = ResumeExport::whereKey($this->exportId)->where('attempt_token', $this->attemptToken)->where('status', 'pending')->update(['status' => 'processing', 'started_at' => now()]);
        if (! $claimed) {
            return;
        }
        $export = ResumeExport::with('resume.assets')->find($this->exportId);
        if (! $export?->resume) {
            return;
        }
        $disk = Storage::disk('private');
        $output = null;
        $target = null;
        $started = microtime(true);
        try {
            $input = $export->input_snapshot;
            $photo = null;
            if ($id = $input['content']['basics']['photo_asset_id']) {
                $asset = $export->resume->assets->firstWhere('id', $id);
                if (! $asset || ! $disk->exists($asset->path)) {
                    throw new \RuntimeException('IMAGE_MISSING');
                }
                $photo = 'data:'.$asset->mime_type.';base64,'.base64_encode($disk->get($asset->path));
            }
            $output = $renderer->render(new RenderInput($input, $photo));
            $target = ($export->resume->is_demo ? 'demo-seed/' : '').'resume_exports/'.$export->resume->candidate_id.'/'.$export->resume_id.'/'.$export->id.'-'.$this->attemptToken.'.pdf';
            $disk->move($output->tempPath, $target);
            $changed = ResumeExport::whereKey($export->id)->where('attempt_token', $this->attemptToken)->where('status', 'processing')->update(['status' => 'ready', 'path' => $target, 'size' => $output->size, 'page_count' => $output->pageCount, 'sha256' => $output->sha256, 'completed_at' => now(), 'error_code' => null]);
            if (! $changed) {
                $disk->delete($target);
            }
            Log::info('Resume PDF render completed', ['export_id' => $export->id, 'revision' => $export->revision, 'status' => $changed ? 'ready' : 'stale', 'duration_ms' => (int) ((microtime(true) - $started) * 1000)]);
        } catch (\Throwable $exception) {
            if ($output) {
                $disk->delete($output->tempPath);
            }
            if ($target) {
                $disk->delete($target);
            }
            $known = ['PDF_TOO_LARGE', 'PDF_PAGE_LIMIT', 'INVALID_PDF', 'PDF_TEXT_MISSING', 'IMAGE_MISSING', 'INVALID_PHOTO', 'INPUT_TOO_LARGE'];
            $code = in_array($exception->getMessage(), $known) ? $exception->getMessage() : 'RENDER_FAILED';
            $retry = $code === 'RENDER_FAILED' && $this->attempts() < $this->tries;
            ResumeExport::whereKey($export->id)->where('attempt_token', $this->attemptToken)->update(['status' => $retry ? 'pending' : 'failed', 'error_code' => $code]);
            Log::warning('Resume PDF render failed', ['export_id' => $export->id, 'revision' => $export->revision, 'status' => $retry ? 'pending' : 'failed', 'error_code' => $code, 'duration_ms' => (int) ((microtime(true) - $started) * 1000)]);
            if ($retry) {
                throw new \RuntimeException('Resume render temporarily unavailable.');
            }
        }
    }

    public function failed(?\Throwable $exception): void
    {
        ResumeExport::whereKey($this->exportId)->where('attempt_token', $this->attemptToken)->whereIn('status', ['pending', 'processing'])->update(['status' => 'failed', 'error_code' => 'WORKER_FAILED']);
    }
}
