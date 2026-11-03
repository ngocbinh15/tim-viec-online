<?php

namespace App\Services;

use App\Mail\VerifyEmailMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class EmailVerificationService
{
    public const EXPIRY_MINUTES = 60;

    public function sendLink(string $email): void
    {
        $email = strtolower(trim($email));
        $token = Str::random(64);
        $digest = hash('sha256', $token);
        $user = DB::transaction(function () use ($email, $digest) {
            $user = User::where('email', $email)->lockForUpdate()->first();
            if (! $user || $user->hasVerifiedEmail() || $user->isLocked()) {
                return null;
            }
            DB::table('email_verification_tokens')->updateOrInsert(['user_id' => $user->id], [
                'email' => $email, 'token' => $digest, 'created_at' => now(),
                'expires_at' => now()->addMinutes(self::EXPIRY_MINUTES),
            ]);

            return $user;
        });
        if (! $user) {
            return;
        }
        $url = rtrim(config('app.frontend_url'), '/').'/verify-email?'.http_build_query(
            ['email' => $email, 'token' => $token], '', '&', PHP_QUERY_RFC3986
        );
        try {
            Mail::to($email)->send(new VerifyEmailMail($user, $url));
        } catch (\Throwable) {
            DB::table('email_verification_tokens')->where('user_id', $user->id)->where('token', $digest)->delete();
            Log::warning('Verification email could not be sent', ['user_id' => $user->id]);
        }
    }

    public function verify(string $email, string $token): ?User
    {
        return DB::transaction(function () use ($email, $token) {
            // Match the same lock order used by resend and email changes.
            $user = User::where('email', strtolower(trim($email)))->lockForUpdate()->first();
            if (! $user || $user->hasVerifiedEmail() || $user->isLocked()) {
                return null;
            }
            $record = DB::table('email_verification_tokens')->where('user_id', $user->id)->lockForUpdate()->first();
            if (! $record || $record->email !== $user->email || ! hash_equals($record->token, hash('sha256', $token))) {
                return null;
            }
            DB::table('email_verification_tokens')->where('user_id', $user->id)->delete();
            if (Carbon::parse($record->expires_at)->lessThanOrEqualTo(now())) {
                return null;
            }
            $user->markEmailAsVerified();
            DB::afterCommit(fn () => event(new Verified($user)));

            return $user;
        });
    }

    /** Preserve verification for unchanged addresses; revoke every old link on an actual change. */
    public function updateUser(User $user, array $attributes): void
    {
        $changed = DB::transaction(function () use ($user, $attributes) {
            $current = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $oldEmail = $current->email;
            $changed = isset($attributes['email']) && $attributes['email'] !== $current->email;
            if ($changed) {
                $keys = ['verification-change:user:'.$current->id => 3, 'verification-change:ip:'.request()->ip() => 15];
                foreach ($keys as $key => $limit) {
                    if (RateLimiter::tooManyAttempts($key, $limit)) {
                        throw new HttpResponseException(response()->json([
                            'success' => false, 'message' => 'Bạn đã đổi email nhiều lần. Vui lòng thử lại sau 15 phút.',
                            'errors' => null,
                        ], 429));
                    }
                }
                foreach (array_keys($keys) as $key) {
                    RateLimiter::hit($key, 15 * 60);
                }
            }
            $current->fill($attributes);
            if ($changed) {
                DB::table('password_reset_tokens')->where('user_id', $current->id)
                    ->orWhere(fn ($query) => $query->whereNull('user_id')->where('email', $oldEmail))->delete();
                DB::table('password_change_requests')->where('user_id', $current->id)->delete();
                $current->email_verified_at = null;
                DB::table('email_verification_tokens')->where('user_id', $current->id)->delete();
            }
            $current->save();
            $user->setRawAttributes($current->getAttributes(), true);

            return $changed;
        });
        if ($changed) {
            DB::afterCommit(fn () => $this->sendLink($user->email));
        }
    }
}
