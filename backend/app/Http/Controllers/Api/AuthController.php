<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Mail\ResetPasswordMail;
use App\Models\CandidateProfile;
use App\Models\Company;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Đăng ký tài khoản mới (FR-01)
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->name,
                'email' => strtolower($request->email),
                'password' => Hash::make($request->password),
                'phone' => $request->phone,
                'dob' => $request->dob,
                'role' => $request->role,
                'status' => 'active',
                'failed_attempts' => 0,
            ]);

            // FR-01.6: Tự động tạo hồ sơ tương ứng
            if ($user->isCandidate()) {
                CandidateProfile::create([
                    'user_id' => $user->id,
                ]);
                $user->load('candidateProfile');
            } elseif ($user->isEmployer()) {
                Company::create([
                    'user_id' => $user->id,
                    'name' => $user->name,
                ]);
                $user->load('company');
            }

            return $user;
        });

        try {
            Mail::raw(
                "Xin chào {$user->name},\n\nTài khoản TimViecOnline của bạn đã được tạo thành công. Email này không chứa mật khẩu.\n\nĐăng nhập tại: " . rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/') . '/login',
                fn ($message) => $message->to($user->email)->subject('Tài khoản TimViecOnline đã được tạo')
            );
        } catch (\Throwable $exception) {
            Log::warning('Registration confirmation email could not be sent', ['user_id' => $user->id]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đăng ký tài khoản thành công',
            'data' => [
                'user' => $user,
                'redirect_url' => '/login',
            ],
        ], 201);
    }

    /**
     * Đăng nhập tài khoản (FR-02)
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', strtolower($request->email))->first();

        // FR-02.2: Kiểm tra user có tồn tại
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email hoặc mật khẩu không chính xác',
            ], 401);
        }

        // FR-02.5: Kiểm tra tài khoản bị Admin khóa
        if ($user->status === 'locked') {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản của bạn đã bị khóa bởi quản trị viên',
            ], 403);
        }

        // Kiểm tra nếu thời gian khóa tạm thời đã hết thì đặt lại bộ đếm
        if ($user->locked_until && $user->locked_until->isPast()) {
            $user->update([
                'failed_attempts' => 0,
                'locked_until' => null,
            ]);
        }

        // FR-02.4: Kiểm tra tài khoản bị tạm khóa do nhập sai nhiều lần
        if ($user->locked_until && $user->locked_until->isFuture()) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản',
            ], 403);
        }

        // Kiểm tra mật khẩu
        if (!Hash::check($request->password, $user->password)) {
            $user->increment('failed_attempts');

            // FR-02.3 & FR-02.4: Sau 5 lần đăng nhập sai liên tiếp, tạm khóa 15 phút
            if ($user->failed_attempts >= 5) {
                $user->update([
                    'locked_until' => now()->addMinutes(15),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản',
                ], 403);
            }

            // FR-02.2: Hiển thị thông báo nếu email hoặc mật khẩu không chính xác
            return response()->json([
                'success' => false,
                'message' => 'Email hoặc mật khẩu không chính xác',
            ], 401);
        }

        // Đăng nhập đúng: đặt lại bộ đếm số lần sai về 0 và xóa khóa tạm thời
        $user->update([
            'failed_attempts' => 0,
            'locked_until' => null,
        ]);

        if ($user->isCandidate()) {
            $user->load(['candidateProfile.skills']);
        } elseif ($user->isEmployer()) {
            $user->load('company');
        }

        // FR-02.6: Cấp phát token & tự động điều hướng theo vai trò
        $token = $user->createToken('auth_token')->plainTextToken;

        $redirectUrl = match ($user->role) {
            'candidate' => '/jobs',
            'employer' => '/employer/my-jobs',
            'admin' => '/admin/dashboard',
            default => '/',
        };

        return response()->json([
            'success' => true,
            'message' => 'Đăng nhập thành công',
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
                'redirect_url' => $redirectUrl,
            ],
        ], 200);
    }

    /**
     * Yêu cầu quên mật khẩu (FR-02.7)
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $user = User::where('email', strtolower($request->email))->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy tài khoản với email này',
            ], 404);
        }

        // Tạo mã token ngẫu nhiên bảo mật
        $token = Str::random(64);

        // Lưu vào bảng password_reset_tokens với hiệu lực 15 phút
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => hash('sha256', $token),
                'created_at' => now(),
            ]
        );

        // Tạo liên kết đặt lại mật khẩu gửi về email
        $frontendUrl = config('app.frontend_url') ?: env('FRONTEND_URL', 'http://localhost:3000');
        $resetUrl = rtrim($frontendUrl, '/') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);

        try {
            Mail::to($user->email)->send(new ResetPasswordMail($user, $resetUrl, $token));
        } catch (\Throwable $e) {
            Log::error('Gửi email đặt lại mật khẩu thất bại: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email đó.',
            'data' => ['token' => $token],
        ], 200);
    }

    /**
     * Kiểm tra tính hợp lệ của liên kết đặt lại mật khẩu (FR-02.8)
     */
    public function verifyResetToken(Request $request): JsonResponse
    {
        $email = $request->query('email') ?? $request->input('email');
        $token = $request->query('token') ?? $request->input('token');

        if (!$email || !$token) {
            return response()->json([
                'success' => false,
                'message' => 'Liên kết xác thực đã hết hạn hoặc không hợp lệ',
            ], 400);
        }

        $record = DB::table('password_reset_tokens')
            ->where('email', strtolower($email))
            ->first();

        if (!$record || !hash_equals($record->token, hash('sha256', $token))) {
            return response()->json([
                'success' => false,
                'message' => 'Liên kết xác thực đã hết hạn hoặc không hợp lệ',
            ], 400);
        }

        // Kiểm tra hiệu lực trong 15 phút (FR-02.7 & FR-02.8)
        $createdAt = Carbon::parse($record->created_at);
        if ($createdAt->addMinutes(15)->isPast()) {
            DB::table('password_reset_tokens')->where('email', strtolower($email))->delete();

            return response()->json([
                'success' => false,
                'message' => 'Liên kết xác thực đã hết hạn hoặc không hợp lệ',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Liên kết xác thực hợp lệ',
            'data' => [
                'email' => $record->email,
            ],
        ], 200);
    }

    /**
     * Đặt lại mật khẩu mới (FR-02.8)
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $email = strtolower($request->email);
        $newPassword = $request->password ?? $request->new_password;

        $user = DB::transaction(function () use ($email, $request, $newPassword) {
            $record = DB::table('password_reset_tokens')
                ->where('email', $email)
                ->lockForUpdate()
                ->first();

            if (!$record || !hash_equals($record->token, hash('sha256', $request->token))) {
                return null;
            }

            if (Carbon::parse($record->created_at)->addMinutes(15)->isPast()) {
                DB::table('password_reset_tokens')->where('email', $email)->delete();
                return null;
            }

            $user = User::where('email', $email)->lockForUpdate()->first();
            if (!$user) {
                DB::table('password_reset_tokens')->where('email', $email)->delete();
                return null;
            }

            $user->update([
                'password' => Hash::make($newPassword),
                'failed_attempts' => 0,
                'locked_until' => null,
            ]);
            $user->tokens()->delete();
            DB::table('password_reset_tokens')->where('email', $email)->delete();

            return $user;
        });

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Liên kết xác thực đã hết hạn hoặc không hợp lệ',
            ], 400);
        }

        try {
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Đặt lại mật khẩu thành công',
                'content' => 'Mật khẩu tài khoản của bạn đã được đặt lại thành công vào lúc ' . now()->format('H:i d/m/Y') . '.',
                'type' => 'security',
            ]);
        } catch (\Throwable $exception) {
            Log::error('Password reset notification could not be created', [
                'user_id' => $user->id,
                'exception' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đặt lại mật khẩu thành công',
            'data' => [
                'redirect_url' => '/login',
            ],
        ], 200);
    }

    /**
     * Lấy thông tin user hiện tại kèm profile
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isCandidate()) {
            $user->load(['candidateProfile.skills']);
        } elseif ($user->isEmployer()) {
            $user->load('company');
        }

        return response()->json([
            'success' => true,
            'data' => $user,
        ], 200);
    }

    /**
     * Đăng xuất & Thu hồi token
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Đăng xuất thành công',
        ], 200);
    }

    /**
     * Đổi mật khẩu khi đang đăng nhập (FR-02.9)
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        // Kiểm tra mật khẩu hiện tại
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu hiện tại không chính xác',
            ], 400);
        }

        $newPassword = $request->new_password ?? $request->password;

        // Kiểm tra mật khẩu mới trùng với mật khẩu cũ
        if (Hash::check($newPassword, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
            ], 400);
        }

        $user->update([
            'password' => Hash::make($newPassword),
            'failed_attempts' => 0,
            'locked_until' => null,
        ]);

        $currentToken = $user->currentAccessToken();
        if ($currentToken && method_exists($currentToken, 'getKey')) {
            $user->tokens()->where('id', '!=', $currentToken->getKey())->delete();
        } else {
            $user->tokens()->delete();
        }

        try {
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Đổi mật khẩu thành công',
                'content' => 'Mật khẩu của bạn đã được cập nhật thành công vào lúc ' . now()->format('H:i d/m/Y') . '.',
                'type' => 'security',
            ]);
        } catch (\Throwable $exception) {
            Log::error('Password change notification could not be created', [
                'user_id' => $user->id,
                'exception' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công',
        ], 200);
    }
}
