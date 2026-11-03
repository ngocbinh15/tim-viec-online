<?php

namespace App\Jobs;

use App\Services\NotificationEmailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendNotificationEmail implements ShouldQueue
{
    use Queueable;

    public int $tries = 0;
    public int $maxExceptions = 3;
    public int $timeout = 30;
    public array $backoff = [30, 120];

    public function __construct(public int $deliveryId, public int $generation)
    {
        $this->onConnection('database')->onQueue('emails')->afterCommit();
    }

    public function handle(NotificationEmailService $service): void
    {
        $delay = $service->deliver($this->deliveryId, $this->generation);
        if ($delay !== null) {
            $this->release($delay);
        }
    }

    public function failed(?\Throwable $exception): void
    {
        app(NotificationEmailService::class)->failed($this->deliveryId, $this->generation);
    }
}
