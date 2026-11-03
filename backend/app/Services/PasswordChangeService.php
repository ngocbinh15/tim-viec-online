<?php

namespace App\Services;

use App\Mail\ConfirmPasswordChangeMail;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordChangeService
{
    public const EXPIRY_MINUTES = 15;

    public function request(User $authenticated, string $currentPassword, string $newPassword): string
    {
        $token = Str::random(64);
        $digest = hash('sha256', $token);
        $user = DB::transaction(function () use ($authenticated, $currentPassword, $newPassword, $digest) {
            $user = User::whereKey($authenticated->id)->lockForUpdate()->firstOrFail();
            if ($user->isLocked()) {
                $this->reject(403, 'account_locked', 'Tài khoản của bạn đã bị khóa.');
            }
            if (! $user->hasVerifiedEmail()) {
                $this->reject(403, 'email_verification_required', 'Vui lòng xác nhận email trước khi đổi mật khẩu.');
            }
            if (! Hash::check($currentPassword, $user->password)) {
                $this->reject(400, 'invalid_current_password', 'Mật khẩu hiện tại không chính xác');
            }
            if (Hash::check($newPassword, $user->password)) {
                $this->reject(400, 'password_unchanged', 'Mật khẩu mới không được trùng với mật khẩu hiện tại');
            }
            DB::table('password_change_requests')->updateOrInsert(['user_id' => $user->id], [
                'email' => $user->email, 'token' => $digest,
                'password_hash' => Hash::make($newPassword), 'credential_hash' => hash('sha256', $user->password),
                'created_at' => now(), 'expires_at' => now()->addMinutes(self::EXPIRY_MINUTES),
            ]);

            return $user;
        });
        $url = rtrim(config('app.frontend_url'), '/').'/confirm-password-change?'.http_build_query(
            ['email' => $user->email, 'token' => $token], '', '&', PHP_QUERY_RFC3986
        );
        try {
            Mail::to($user->email)->send(new ConfirmPasswordChangeMail($user->name, $url));
        } catch (\Throwable) {
            DB::table('password_change_requests')->where('user_id', $user->id)->where('token', $digest)->delete();
            Log::warning('Password change confirmation email could not be sent', ['user_id' => $user->id]);
            $this->reject(503, 'mail_delivery_failed', 'Chưa gửi được email xác nhận. Mật khẩu chưa thay đổi. Vui lòng thử lại sau.');
        }

        return $user->email;
    }

    public function confirm(string $email, string $token): ?User
    {
        $user = DB::transaction(function () use ($email, $token) {
            $user = User::where('email', strtolower(trim($email)))->lockForUpdate()->first();
            if (! $user || $user->isLocked() || ! $user->hasVerifiedEmail()) {
                return null;
            }
            $record = DB::table('password_change_requests')->where('user_id', $user->id)->lockForUpdate()->first();
            if (! $record || $record->email !== $user->email || ! hash_equals($record->token, hash('sha256', $token))) {
                return null;
            }
            DB::table('password_change_requests')->where('user_id', $user->id)->delete();
            if (Carbon::parse($record->expires_at)->lessThanOrEqualTo(now())
                || ! hash_equals($record->credential_hash, hash('sha256', $user->password))) {
                return null;
            }
            $user->forceFill(['password' => $record->password_hash, 'failed_attempts' => 0, 'locked_until' => null])->save();
            $user->tokens()->delete();
            DB::table('password_reset_tokens')->where('user_id', $user->id)->orWhere('email', $user->email)->delete();

            return $user;
        });
        if ($user) {
            try {
                Notification::create([
                    'user_id' => $user->id, 'title' => 'Đổi mật khẩu thành công', 'type' => 'security',
                    'content' => 'Mật khẩu đã được cập nhật sau khi xác nhận email. Vui lòng đăng nhập lại trên các thiết bị.',
                ]);
            } catch (\Throwable) {
                Log::warning('Password change notification could not be created', ['user_id' => $user->id]);
            }
        }

        return $user;
    }

    private function reject(int $status, string $code, string $message): never
    {
        throw new HttpResponseException(response()->json([
            'success' => false, 'code' => $code, 'message' => $message, 'errors' => null,
        ], $status));
    }
}
