<?php

namespace App\Console\Commands;

use App\Models\Job;
use Illuminate\Console\Command;

class ExpireJobs extends Command
{
    protected $signature = 'jobs:expire';
    protected $description = 'Mark active job listings past their deadline as expired.';

    public function handle(): int
    {
        $count = Job::where('status', 'active')
            ->whereDate('deadline', '<', now()->toDateString())
            ->update(['status' => 'expired', 'updated_at' => now()]);

        $this->info("Expired {$count} job listing(s).");
        return self::SUCCESS;
    }
}
