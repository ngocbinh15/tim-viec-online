<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminApplicationsRequest;
use App\Http\Resources\ApplicationResource;
use App\Models\Application;
use App\Models\Job;
use Illuminate\Http\JsonResponse;

class AdminApplicationController extends Controller
{
    private const RELATIONS = ['job.company', 'job.category', 'job.skills', 'candidateProfile.user', 'candidateProfile.skills', 'aiAnalysis'];

    public function index(AdminApplicationsRequest $request, string $id): JsonResponse
    {
        if (! Job::whereKey($id)->exists()) {
            return $this->notFound('Không tìm thấy tin tuyển dụng.');
        }
        $applications = Application::where('job_id', $id)->with(self::RELATIONS)
            ->orderByDesc('id')->paginate((int) $request->validated('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Danh sách hồ sơ ứng tuyển của tin tuyển dụng.',
            'data' => ApplicationResource::collection($applications),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $application = Application::with(self::RELATIONS)->find($id);
        if (! $application) {
            return $this->notFound('Không tìm thấy hồ sơ ứng tuyển.');
        }

        return response()->json([
            'success' => true,
            'message' => 'Chi tiết hồ sơ ứng tuyển.',
            'data' => new ApplicationResource($application),
        ]);
    }

    private function notFound(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message, 'errors' => null], 404);
    }
}
