<?php

namespace App\Console\Commands;

use App\Models\Application;
use App\Models\CandidateProfile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class SecureLegacyCvFiles extends Command
{
    protected $signature = 'storage:secure-legacy-cvs {--delete-source : Delete the public source only after a verified private copy exists}';
    protected $description = 'Copy legacy public CVs and chat images to the private disk, verify them, then optionally remove public copies.';

    public function handle(): int
    {
        $paths = CandidateProfile::whereNotNull('cv_file_path')->pluck('cv_file_path')
            ->merge(Application::whereNotNull('cv_path')->pluck('cv_path'))
            ->merge(\App\Models\Message::whereNotNull('image_path')->pluck('image_path'))
            ->unique()
            ->values();
        $public = Storage::disk('public');
        $private = Storage::disk('private');
        $copied = 0;
        $missing = 0;
        $unexpected = 0;

        foreach ($paths as $path) {
            if (!str_starts_with($path, 'cvs/') && !str_starts_with($path, 'application_cvs/') && !str_starts_with($path, 'chat_images/')) {
                $this->warn("Skipped unexpected stored path: {$path}");
                $unexpected++;
                continue;
            }
            if (!$public->exists($path)) {
                if (!$private->exists($path)) {
                    $this->warn("Missing CV file: {$path}");
                    $missing++;
                }
                continue;
            }

            if (!$private->exists($path)) {
                $private->put($path, $public->get($path));
            }

            $sameContent = $private->exists($path)
                && hash('sha256', $private->get($path)) === hash('sha256', $public->get($path));
            if (!$sameContent) {
                $this->error("Private copy verification failed: {$path}");
                return self::FAILURE;
            }
            $copied++;

            if ($this->option('delete-source')) {
                $public->delete($path);
            }
        }

        $this->info("Verified {$copied} private upload(s); {$missing} missing; {$unexpected} unexpected path(s).");
        if (!$this->option('delete-source')) {
            $this->comment('Copy and verification completed; public sources remain. Use --delete-source after backing up public storage and database.');
        }

        return $missing === 0 && $unexpected === 0 ? self::SUCCESS : self::FAILURE;
    }
}
