<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\CandidateProfile;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Đăng ký tài khoản mới (FR-01)
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
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

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Đăng ký tài khoản thành công',
                'data' => [
                    'token' => $token,
                    'token_type' => 'Bearer',
                    'user' => $user,
                ],
            ], 201);
        });
    }

    /**
     * Đăng nhập tài khoản (FR-02)
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', strtolower($request->email))->first();

        // Kiểm tra user có tồn tại
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

        // FR-02.4: Kiểm tra tài khoản bị tạm khóa do nhập sai nhiều lần
        if ($user->locked_until && $user->locked_until->isFuture()) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau 15 phút',
            ], 403);
        }

        // Kiểm tra mật khẩu
        if (!Hash::check($request->password, $user->password)) {
            $user->increment('failed_attempts');

            // Sau 5 lần sai liên tiếp, tạm khóa 15 phút
            if ($user->failed_attempts >= 5) {
                $user->update([
                    'locked_until' => now()->addMinutes(15),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau 15 phút',
                ], 403);
            }

            return response()->json([
                'success' => false,
                'message' => 'Email hoặc mật khẩu không chính xác',
            ], 401);
        }

        // Đăng nhập thành công -> Reset bộ đếm số lần sai
        $user->update([
            'failed_attempts' => 0,
            'locked_until' => null,
        ]);

        if ($user->isCandidate()) {
            $user->load(['candidateProfile.skills']);
        } elseif ($user->isEmployer()) {
            $user->load('company');
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Đăng nhập thành công',
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
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
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đăng xuất thành công',
        ], 200);
    }

    /**
     * Đổi mật khẩu (FR-02.9)
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu hiện tại không chính xác',
            ], 400);
        }

        if (Hash::check($request->new_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
            ], 400);
        }

        $user->update([
            'password' => $request->new_password,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công',
        ], 200);
    }
}
