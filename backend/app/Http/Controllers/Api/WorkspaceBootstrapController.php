<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WorkspaceBootstrapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceBootstrapController extends Controller
{
    public function __invoke(Request $request, WorkspaceBootstrapService $workspace): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Workspace loaded.',
            'data' => $workspace->load($request),
        ])->header('Cache-Control', 'private, no-store');
    }
}
