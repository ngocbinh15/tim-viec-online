<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ResendVerificationEmailRequest;
use App\Http\Requests\VerifyEmailRequest;
use App\Http\Resources\EmailVerificationResource;
use App\Services\EmailVerificationService;
use Illuminate\Http\JsonResponse;

class EmailVerificationController extends Controller
{
    public function __construct(private EmailVerificationService $verification) {}

    public function resend(ResendVerificationEmailRequest $request): JsonResponse
    {
        $this->verification->sendLink($request->validated('email'));

        return response()->json([
            'success' => true,
            'message' => 'Nếu tài khoản cần xác nhận email, liên kết xác nhận sẽ được gửi đến địa chỉ đó.',
            'data' => ['accepted' => true],
        ]);
    }

    public function verify(VerifyEmailRequest $request): JsonResponse
    {
        $user = $this->verification->verify($request->validated('email'), $request->validated('token'));
        if (! $user) {
            return response()->json([
                'success' => false, 'code' => 'invalid_verification_token',
                'message' => 'Liên kết xác nhận đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu liên kết mới.',
            ], 400);
        }

        return response()->json([
            'success' => true, 'message' => 'Email đã được xác nhận thành công.',
            'data' => new EmailVerificationResource($user),
        ]);
    }
}
