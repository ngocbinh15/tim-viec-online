<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateEmailPreferencesRequest;
use App\Http\Resources\EmailPreferenceResource;
use App\Models\User;
use App\Services\NotificationEmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmailPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true, 'message' => 'Lựa chọn nhận email.',
            'data' => new EmailPreferenceResource($request->user()),
        ]);
    }

    public function update(UpdateEmailPreferencesRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $preferences = $request->validated();
            $previous = NotificationEmailService::preferences($user);
            $enabling = ($preferences['applications'] && ! $previous['applications'])
                || ($preferences['messages'] && ! $previous['messages']);
            if (! $user->email_verified_at && $enabling) {
                return response()->json([
                    'success' => false, 'code' => 'email_verification_required',
                    'message' => 'Vui lòng xác thực email trước khi bật thông báo qua email.', 'errors' => null,
                ], 403);
            }
            $user->forceFill(['email_notifications' => $preferences])->save();
            return response()->json([
                'success' => true, 'message' => 'Đã lưu lựa chọn nhận email.',
                'data' => new EmailPreferenceResource($user),
            ]);
        });
    }
}
