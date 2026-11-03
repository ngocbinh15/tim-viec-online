<?php

namespace App\Console\Commands;

use App\Models\ResumeExport;
use Illuminate\Console\Command;

class ResumeHealth extends Command
{
    protected $signature = 'resumes:health';

    protected $description = 'Report stalled CV exports; nonzero exit code can trigger an operations alert';

    public function handle(): int
    {
        $count = ResumeExport::whereIn('status', ['pending', 'processing'])->where('updated_at', '<', now()->subMinutes(2))->count();
        if ($count) {
            $this->error("Stalled CV exports: $count. Check the cv worker before retrying.");

            return self::FAILURE;
        }
        $this->info('CV queue: no stalled exports.');

        return self::SUCCESS;
    }
}
