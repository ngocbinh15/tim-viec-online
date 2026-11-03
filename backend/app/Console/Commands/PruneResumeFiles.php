<?php

namespace App\Console\Commands;

use App\Models\ResumeAsset;
use App\Models\ResumeExport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PruneResumeFiles extends Command
{
    protected $signature = 'resumes:prune {--dry-run : Report only; do not delete files}';

    protected $description = 'Remove abandoned builder files older than 24 hours without touching submitted application CVs';

    public function handle(): int
    {
        $disk = Storage::disk('private');
        $cutoff = now()->subDay()->timestamp;
        $count = 0;
        foreach (['resume_assets', 'resume_exports', 'demo-seed/resume_exports'] as $directory) {
            foreach ($disk->allFiles($directory) as $path) {
                $asset = null;
                if ($disk->lastModified($path) >= $cutoff) {
                    continue;
                }
                if (str_starts_with($path, 'resume_assets/')) {
                    $asset = ResumeAsset::with('resume')->where('path', $path)->first();
                    if ($asset?->resume) {
                        if (($asset->resume->content['basics']['photo_asset_id'] ?? null) === $asset->id) {
                            continue;
                        }
                        $needed = $asset->resume->exports()->whereIn('status', ['pending', 'processing'])->get(['input_snapshot'])->contains(fn ($export) => ($export->input_snapshot['content']['basics']['photo_asset_id'] ?? null) === $asset->id);
                        if ($needed) {
                            continue;
                        }
                    }
                } elseif (ResumeExport::where('path', $path)->exists()) {
                    continue;
                }
                $count++;
                if (! $this->option('dry-run')) {
                    $disk->delete($path);
                    if (isset($asset) && $asset) {
                        $asset->delete();
                    }
                }
                unset($asset);
            }
        }
        $this->info(($this->option('dry-run') ? 'Would remove: ' : 'Removed: ').$count.' abandoned files.');

        return self::SUCCESS;
    }
}
