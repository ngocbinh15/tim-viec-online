<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->hasVerifiedEmail()) {
            return response()->json([
                'success' => false, 'code' => 'email_verification_required',
                'message' => 'Vui lòng xác nhận email trước khi sử dụng chức năng này.',
                'errors' => ['email' => ['Email chưa được xác nhận.']],
            ], 403);
        }

        return $next($request);
    }
}
