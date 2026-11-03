<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmPasswordChangeRequest;
use App\Services\PasswordChangeService;
use Illuminate\Http\JsonResponse;

class PasswordChangeController extends Controller
{
    public function confirm(ConfirmPasswordChangeRequest $request, PasswordChangeService $service): JsonResponse
    {
        $user = $service->confirm($request->validated('email'), $request->validated('token'));
        if (! $user) {
            return response()->json([
                'success' => false, 'code' => 'invalid_password_change_token',
                'message' => 'Liên kết xác nhận đổi mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng tạo yêu cầu mới.',
                'errors' => null,
            ], 400);
        }

        return response()->json([
            'success' => true, 'message' => 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
            'data' => ['confirmed' => true, 'email' => $user->email],
        ]);
    }
}
