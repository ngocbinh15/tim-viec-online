<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Job;
use App\Models\JobReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class JobReportController extends Controller
{
    public function store(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:100'],
            'details' => ['nullable', 'string', 'max:2000'],
        ]);

        $job = Job::with('company')->find($id);
        if (!$job) {
            return response()->json(['success' => false, 'message' => 'Công việc không tồn tại'], 404);
        }

        if ((int) $job->company?->user_id === (int) $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không thể báo cáo tin tuyển dụng của chính mình'], 403);
        }

        if (JobReport::where('job_id', $job->id)->where('reporter_id', $request->user()->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Bạn đã báo cáo tin tuyển dụng này'], 409);
        }

        try {
            $report = DB::transaction(function () use ($job, $request, $validated) {
                $report = JobReport::create([
                    'job_id' => $job->id,
                    'reporter_id' => $request->user()->id,
                    'reason' => trim($validated['reason']),
                    'details' => $validated['details'] ?? null,
                ]);
                $job->forceFill(['is_reported' => true])->save();

                return $report;
            });
        } catch (UniqueConstraintViolationException $exception) {
            return response()->json(['success' => false, 'message' => 'Bạn đã báo cáo tin tuyển dụng này'], 409);
        }
        return response()->json([
            'success' => true,
            'message' => 'Đã gửi báo cáo tin tuyển dụng',
            'data' => ['id' => $report->id, 'job_id' => $job->id, 'status' => $report->status],
        ], 201);
    }
}
