<?php

namespace App\Services;

use App\Mail\ResetPasswordMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordRecoveryService
{
    public const EXPIRY_MINUTES = 15;

    public function sendLink(string $email): void
    {
        $email = strtolower(trim($email));
        $token = Str::random(64);
        $digest = hash('sha256', $token);
        $user = DB::transaction(function () use ($email, $digest) {
            $user = User::where('email', $email)->lockForUpdate()->first();
            if (! $user || $user->status !== 'active' || ! $user->hasVerifiedEmail()) {
                return null;
            }
            DB::table('password_reset_tokens')->updateOrInsert(['email' => $email], [
                'token' => $digest, 'created_at' => now(), 'user_id' => $user->id,
                'credential_hash' => hash('sha256', $user->password),
            ]);

            return $user;
        });
        if (! $user) {
            return;
        }
        $url = rtrim(config('app.frontend_url'), '/').'/reset-password?'.http_build_query(
            ['token' => $token, 'email' => $user->email], '', '&', PHP_QUERY_RFC3986
        );

        try {
            Mail::to($user->email)->send(new ResetPasswordMail($user, $url, $token));
        } catch (\Throwable $exception) {
            // Do not delete a newer request's token, or log transport bodies/credentials.
            DB::table('password_reset_tokens')->where('email', $user->email)->where('token', $digest)->delete();
            Log::error('Password reset email could not be sent', ['user_id' => $user->id]);
        }
    }

    public function isValid(string $email, string $token): bool
    {
        $record = DB::table('password_reset_tokens')->where('email', strtolower($email))->first();
        $user = User::where('email', strtolower(trim($email)))->first();
        if (! $this->matches($record, $token) || ! $this->belongsTo($record, $user)) {
            return false;
        }
        if ($this->expired($record)) {
            DB::table('password_reset_tokens')->where('email', $record->email)->where('token', $record->token)->delete();

            return false;
        }

        return true;
    }

    public function reset(string $email, string $token, string $password): ?User
    {
        $email = strtolower(trim($email));

        return DB::transaction(function () use ($email, $token, $password) {
            $user = User::where('email', $email)->lockForUpdate()->first();
            if (! $user || $user->status !== 'active' || ! $user->hasVerifiedEmail()) {
                return null;
            }
            $record = DB::table('password_reset_tokens')->where('email', $email)->lockForUpdate()->first();
            if (! $this->matches($record, $token) || ! $this->belongsTo($record, $user)) {
                return null;
            }
            if ($this->expired($record)) {
                DB::table('password_reset_tokens')->where('email', $email)->delete();

                return null;
            }
            $user->update(['password' => Hash::make($password), 'failed_attempts' => 0, 'locked_until' => null]);
            $user->tokens()->delete();
            DB::table('password_change_requests')->where('user_id', $user->id)->delete();
            DB::table('password_reset_tokens')->where('email', $email)->delete();

            return $user;
        });
    }

    private function matches(?object $record, string $token): bool
    {
        return $record && hash_equals($record->token, hash('sha256', $token));
    }

    private function belongsTo(?object $record, ?User $user): bool
    {
        return $record && $user && $user->status === 'active' && $user->hasVerifiedEmail()
            && (int) $record->user_id === (int) $user->id
            && is_string($record->credential_hash) && hash_equals($record->credential_hash, hash('sha256', $user->password));
    }

    private function expired(object $record): bool
    {
        return Carbon::parse($record->created_at)->addMinutes(self::EXPIRY_MINUTES)->lessThanOrEqualTo(now());
    }
}
