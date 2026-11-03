<?php

namespace App\Services;

use App\Jobs\SendNotificationEmail;
use App\Mail\ActivityNotificationMail;
use App\Models\Application;
use App\Models\Message;
use App\Models\NotificationEmailDelivery;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class NotificationEmailService
{
    public static function preferences(User $user): array
    {
        $settings = $user->email_notifications ?? [];
        return ['applications' => ($settings['applications'] ?? false) === true, 'messages' => ($settings['messages'] ?? false) === true];
    }

    public function message(Message $message): void
    {
        $conversation = $message->conversation;
        if (! $conversation || ! in_array((int) $message->sender_id, [(int) $conversation->candidate_id, (int) $conversation->employer_id], true)) {
            return;
        }
        $receiverId = (int) $message->sender_id === (int) $conversation->candidate_id
            ? $conversation->employer_id : $conversation->candidate_id;
        $this->schedule((int) $receiverId, 'messages', (int) $conversation->id, (int) $message->id, null, 60);
    }

    public function application(Application $application): void
    {
        $userId = $application->candidateProfile?->user_id;
        if ($userId && in_array($application->status, ['waiting', 'accepted', 'rejected'], true)) {
            $this->schedule((int) $userId, 'applications', (int) $application->id, (int) $application->id, $application->status, 10);
        }
    }

    private function eligible(?User $user, string $category): bool
    {
        return $user !== null && $user->status === 'active' && ! $user->isLocked()
            && $user->email_verified_at !== null && self::preferences($user)[$category];
    }

    private function schedule(int $userId, string $category, int $scopeId, int $sourceId, ?string $status, int $seconds): void
    {
        $queued = DB::transaction(function () use ($userId, $category, $scopeId, $sourceId, $status, $seconds) {
            // Serializes first insert and preference updates without process-local cache locks.
            $user = User::whereKey($userId)->lockForUpdate()->first();
            if (! $this->eligible($user, $category)) {
                return null;
            }
            if ($category === 'applications' && ! Application::whereKey($sourceId)->where('status', $status)->exists()) {
                // A slower request may enqueue its hook after a later status update has already committed.
                return null;
            }
            $delivery = NotificationEmailDelivery::where('user_id', $userId)->where('category', $category)
                ->where('scope_id', $scopeId)->lockForUpdate()->first();
            if ($delivery && (($category === 'messages' && $delivery->source_id > $sourceId)
                || ($delivery->source_id === $sourceId && $delivery->source_status === $status && $delivery->state !== 'failed'))) {
                return null;
            }
            $newGeneration = ! $delivery || $delivery->state !== 'pending';
            if (! $delivery) {
                $delivery = new NotificationEmailDelivery(['user_id' => $userId, 'category' => $category, 'scope_id' => $scopeId, 'generation' => 1]);
            } elseif ($newGeneration) {
                $delivery->generation++;
            }
            $delivery->fill([
                'source_id' => $sourceId, 'source_status' => $status, 'state' => 'pending',
                'recipient_email_hash' => hash('sha256', strtolower(trim($user->email))),
                'ready_at' => now()->addSeconds($seconds), 'processing_at' => null, 'delivered_at' => null,
            ])->save();
            return $newGeneration ? [$delivery->id, $delivery->generation, $delivery->ready_at] : null;
        });
        if ($queued !== null) {
            try {
                SendNotificationEmail::dispatch($queued[0], $queued[1])->delay($queued[2]);
            } catch (\Throwable) {
                NotificationEmailDelivery::whereKey($queued[0])->where('generation', $queued[1])
                    ->where('state', 'pending')->update(['state' => 'failed']);
                throw new \RuntimeException('Notification email could not be queued.');
            }
        }
    }

    /** Returns a release delay while a burst is still being coalesced. */
    public function deliver(int $id, int $generation): ?int
    {
        $claim = DB::transaction(function () use ($id, $generation) {
            $delivery = NotificationEmailDelivery::whereKey($id)->lockForUpdate()->first();
            if (! $delivery || $delivery->generation !== $generation || in_array($delivery->state, ['sent', 'skipped', 'failed'], true)) {
                return null;
            }
            if ($delivery->state === 'processing' && $delivery->processing_at?->greaterThan(now()->subSeconds(60))) {
                return 60;
            }
            if ($delivery->ready_at->isFuture()) {
                return max(1, (int) ceil(now()->diffInSeconds($delivery->ready_at)));
            }
            // Recover killed workers after their 30s timeout, without holding locks during SMTP.
            $delivery->update(['state' => 'processing', 'processing_at' => now()]);
            return $delivery;
        });
        if (! $claim instanceof NotificationEmailDelivery) {
            return $claim;
        }
        try {
            $user = User::find($claim->user_id);
            $sameAddress = $user && hash_equals($claim->recipient_email_hash, hash('sha256', strtolower(trim($user->email))));
            $payload = $sameAddress && $this->eligible($user, $claim->category) ? $this->payload($claim, $user) : null;
            if (! $payload) {
                $this->finish($claim, 'skipped');
                return null;
            }
            // A newer event may have replaced this generation after the claim.
            if (! NotificationEmailDelivery::whereKey($id)->where('generation', $generation)->where('state', 'processing')->exists()) {
                return null;
            }
            $frontend = rtrim(config('app.frontend_url'), '/');
            Mail::to($user->email)->send(new ActivityNotificationMail(
                $user->name, $claim->category, $payload['status'], $frontend.$payload['path'], $frontend.$payload['preferences'],
            ));
            $this->finish($claim, 'sent');
        } catch (\Throwable) {
            NotificationEmailDelivery::whereKey($id)->where('generation', $generation)->where('state', 'processing')
                ->update(['state' => 'pending', 'processing_at' => null]);
            // Transport errors may contain credentials; never chain or log the original exception.
            throw new \RuntimeException('Notification email delivery failed.');
        }
        return null;
    }

    public function failed(int $id, int $generation): void
    {
        NotificationEmailDelivery::whereKey($id)->where('generation', $generation)
            ->whereIn('state', ['pending', 'processing'])->update(['state' => 'failed', 'processing_at' => null]);
    }

    private function finish(NotificationEmailDelivery $delivery, string $state): void
    {
        NotificationEmailDelivery::whereKey($delivery->id)->where('generation', $delivery->generation)->where('state', 'processing')
            ->update(['state' => $state, 'processing_at' => null, 'delivered_at' => $state === 'sent' ? now() : null]);
    }

    private function payload(NotificationEmailDelivery $delivery, User $user): ?array
    {
        if ($delivery->category === 'applications') {
            $application = Application::with('candidateProfile')->find($delivery->source_id);
            if (! $application || (int) $application->id !== $delivery->scope_id
                || (int) $application->candidateProfile?->user_id !== (int) $user->id
                || $application->status !== $delivery->source_status) {
                return null;
            }
            $label = match ($application->status) {
                'waiting' => 'Đang xem xét', 'accepted' => 'Trúng tuyển', 'rejected' => 'Từ chối', default => null,
            };
            return $label ? ['status' => $label, 'path' => '/account/jobs', 'preferences' => '/account/settings'] : null;
        }
        $message = Message::with('conversation')->find($delivery->source_id);
        $conversation = $message?->conversation;
        if (! $message || ! $conversation || $message->is_read || (int) $conversation->id !== $delivery->scope_id
            || ! in_array((int) $user->id, [(int) $conversation->candidate_id, (int) $conversation->employer_id], true)
            || ! in_array((int) $message->sender_id, [(int) $conversation->candidate_id, (int) $conversation->employer_id], true)
            || (int) $message->sender_id === (int) $user->id) {
            return null;
        }
        $workspace = $user->isEmployer() ? '/employer' : '/account';
        return ['status' => '', 'path' => $workspace.'/messages?conversation='.$conversation->id, 'preferences' => $user->isEmployer() ? '/employer/security' : '/account/settings'];
    }
}
