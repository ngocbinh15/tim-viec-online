<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobResource;
use App\Models\Application;
use App\Models\Job;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Dashboard Thống kê tổng quan hệ thống (FR-09 Dashboard)
     */
    public function stats(): JsonResponse
    {
        $totalCandidates = User::where('role', 'candidate')->count();
        $totalEmployers = User::where('role', 'employer')->count();
        $totalJobs = Job::count();
        $activeJobs = Job::active()->count();
        $totalApplications = Application::count();
        $reportedJobs = Job::where('is_reported', 1)->count();

        // 5 đơn ứng tuyển mới nhất
        $recentApplications = Application::with(['job.company', 'candidateProfile.user'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lấy số liệu thống kê thành công',
            'data' => [
                'total_candidates' => $totalCandidates,
                'total_employers' => $totalEmployers,
                'total_jobs' => $totalJobs,
                'active_jobs' => $activeJobs,
                'total_applications' => $totalApplications,
                'reported_jobs' => $reportedJobs,
                'recent_applications' => $recentApplications,
            ],
        ], 200);
    }

    /**
     * Quản lý danh sách người dùng (FR-09.4)
     */
    public function users(Request $request): JsonResponse
    {
        $query = User::query()->with(['candidateProfile', 'company']);

        if ($request->filled('keyword')) {
            $keyword = trim($request->keyword);
            $query->where(function ($q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                  ->orWhere('email', 'like', "%{$keyword}%")
                  ->orWhere('phone', 'like', "%{$keyword}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $users = $query->orderBy('id', 'desc')->paginate(15);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách người dùng thành công',
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ], 200);
    }

    /**
     * Khóa hoặc Mở khóa tài khoản người dùng (FR-09.4)
     */
    public function updateUserStatus(Request $request, $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy người dùng',
            ], 404);
        }

        // Không cho phép tự khóa chính mình hoặc khóa tài khoản Admin
        if ((int) $user->id === (int) $request->user()->id || $user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể khóa tài khoản quản trị viên',
            ], 400);
        }

        $request->validate([
            'status' => ['required', 'in:active,locked'],
        ]);

        $newStatus = $request->status;

        if ($newStatus === 'locked') {
            // FR-09.4: Tài khoản bị khóa sẽ lập tức bị hủy phiên đăng nhập (thu hồi tất cả tokens)
            $user->tokens()->delete();
            $user->update([
                'status' => 'locked',
            ]);
            $msg = 'Đã khóa tài khoản người dùng thành công';
        } else {
            $user->update([
                'status' => 'active',
                'failed_attempts' => 0,
                'locked_until' => null,
            ]);
            $msg = 'Đã mở khóa tài khoản người dùng thành công';
        }

        return response()->json([
            'success' => true,
            'message' => $msg,
            'data' => [
                'id' => $user->id,
                'status' => $user->status,
            ],
        ], 200);
    }

    /**
     * Danh sách tin tuyển dụng cho Admin (hỗ trợ lọc tin bị báo cáo vi phạm theo FR-09.1)
     */
    public function jobs(Request $request): JsonResponse
    {
        $query = Job::query()->with(['company.user', 'category', 'skills']);

        if ($request->boolean('reported')) {
            $query->where('is_reported', 1);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('keyword')) {
            $keyword = trim($request->keyword);
            $query->where('title', 'like', "%{$keyword}%");
        }

        $jobs = $query->orderBy('id', 'desc')->paginate(15);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách tin tuyển dụng thành công',
            'data' => JobResource::collection($jobs),
            'meta' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
                'total' => $jobs->total(),
            ],
        ], 200);
    }

    /**
     * Admin Xóa tin tuyển dụng vi phạm chính sách (FR-09.2)
     */
    public function deleteJob(Request $request, $id): JsonResponse
    {
        $job = Job::with('company.user')->find($id);

        if (!$job) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy tin tuyển dụng',
            ], 404);
        }

        // FR-09.2: Gửi thông báo tới nhà tuyển dụng về việc tin bị xóa do vi phạm
        if ($job->company && $job->company->user) {
            $reason = $request->input('reason', 'Tin tuyển dụng vi phạm chính sách cộng đồng và tiêu chuẩn kiểm duyệt của hệ thống.');

            Notification::create([
                'user_id' => $job->company->user->id,
                'title' => 'Tin tuyển dụng đã bị xóa bởi Quản trị viên',
                'content' => "Tin tuyển dụng '{$job->title}' đã bị gỡ bỏ. Lý do: {$reason}",
                'type' => 'job_rejected',
                'data' => [
                    'job_id' => $job->id,
                    'job_title' => $job->title,
                    'reason' => $reason,
                ],
            ]);
        }

        $job->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa tin tuyển dụng vi phạm thành công',
        ], 200);
    }
}
