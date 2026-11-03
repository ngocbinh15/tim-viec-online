<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Demo queue payload only. Intentionally has no side effects, even when retried. */
final class DemoSeedNoOp implements ShouldQueue
{
    use Queueable;

    public function handle(): void {}
}
