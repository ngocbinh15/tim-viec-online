<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobResource;
use App\Models\Application;
use App\Models\Category;
use App\Models\Job;
use App\Models\JobReport;
use App\Models\Notification;
use App\Models\Skill;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Dashboard Thống kê tổng quan hệ thống (FR-09 Dashboard)
     */
    public function stats(Request $request): JsonResponse
    {
        $request->validate(['days' => ['sometimes', 'integer', 'min:1', 'max:365']]);
        $days = (int) $request->query('days', 7);

        $totalUsers = User::count();
        $totalCandidates = User::where('role', 'candidate')->count();
        $totalEmployers = User::where('role', 'employer')->count();
        $lockedUsersCount = User::where('status', 'locked')->count();

        $totalJobs = Job::count();
        $activeJobs = Job::active()->count();
        $closedJobs = Job::where('status', 'closed')->count();
        $expiredJobs = Job::where('status', 'expired')->orWhere(function ($q) {
            $q->where('status', 'active')->whereDate('deadline', '<', now());
        })->count();
        $reportedJobs = Job::where('is_reported', 1)->count();

        $totalApplications = Application::count();

        // Xu hướng (trends) theo số ngày yêu cầu (mặc định 7 ngày gần nhất)
        $trends = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $jobsOnDate = Job::whereDate('created_at', $date)->count();
            $appsOnDate = Application::whereDate('created_at', $date)->count();
            $trends[] = [
                'date' => $date,
                'jobs_count' => $jobsOnDate,
                'applications_count' => $appsOnDate,
            ];
        }

        // 5 đơn ứng tuyển mới nhất
        $recentApplications = Application::with(['job.company', 'candidateProfile.user'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // 5 người dùng mới đăng ký
        $recentUsers = User::latest()->take(5)->get(['id', 'name', 'email', 'role', 'status', 'created_at']);

        return response()->json([
            'success' => true,
            'message' => 'Lấy số liệu thống kê thành công',
            'data' => [
                'users_count' => $totalUsers,
                'total_candidates' => $totalCandidates,
                'total_employers' => $totalEmployers,
                'locked_users_count' => $lockedUsersCount,
                'total_jobs' => $totalJobs,
                'active_jobs' => $activeJobs,
                'closed_jobs_count' => $closedJobs,
                'expired_jobs_count' => $expiredJobs,
                'reported_jobs' => $reportedJobs,
                'reported_jobs_count' => $reportedJobs,
                'total_applications' => $totalApplications,
                'applications_count' => $totalApplications,
                'trends' => $trends,
                'recent_users' => $recentUsers,
                'recent_applications' => $recentApplications,
            ],
        ], 200);
    }

    /**
     * Quản lý danh sách người dùng (FR-09.4)
     */
    public function users(Request $request): JsonResponse
    {
        $request->validate([
            'keyword' => ['nullable', 'string', 'max:150'],
            'role' => ['nullable', 'in:candidate,employer,admin'],
            'status' => ['nullable', 'in:active,locked'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

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

        $users = $query->orderBy('id', 'desc')->paginate((int) $request->query('per_page', 15));

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
     * Xem chi tiết thông tin người dùng theo ID
     */
    public function userDetail($id): JsonResponse
    {
        $user = User::with([
            'candidateProfile.skills',
            'company.jobs',
            'candidateProfile.applications.job',
        ])->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy người dùng.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy chi tiết người dùng thành công.',
            'data' => $user,
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
     * Toggle khóa/mở khóa tài khoản nhanh (toggle-lock)
     */
    public function toggleLockUser(Request $request, $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy người dùng',
            ], 404);
        }

        if ((int) $user->id === (int) $request->user()->id || $user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể khóa tài khoản quản trị viên',
            ], 400);
        }

        $newStatus = $user->status === 'locked' ? 'active' : 'locked';

        if ($newStatus === 'locked') {
            $user->tokens()->delete();
            $user->update(['status' => 'locked']);
            $msg = 'Đã khóa tài khoản thành công.';
        } else {
            $user->update([
                'status' => 'active',
                'failed_attempts' => 0,
                'locked_until' => null,
            ]);
            $msg = 'Đã mở khóa tài khoản thành công.';
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
        $request->validate([
            'reported' => ['nullable', 'boolean'],
            'status' => ['nullable', 'in:active,closed,expired'],
            'keyword' => ['nullable', 'string', 'max:150'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

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

        $jobs = $query->orderBy('id', 'desc')->paginate((int) $request->query('per_page', 15));

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
     * Chi tiết tin tuyển dụng cho Admin
     */
    public function jobDetail($id): JsonResponse
    {
        $job = Job::with(['company.user', 'category', 'skills', 'applications.candidateProfile.user'])->find($id);

        if (!$job) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy tin tuyển dụng.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy chi tiết tin tuyển dụng thành công.',
            'data' => new JobResource($job),
        ], 200);
    }

    /**
     * Danh sách tin tuyển dụng bị báo cáo vi phạm (FR-09.1)
     */
    public function getReportedJobs(Request $request): JsonResponse
    {
        $query = Job::with(['company.user', 'category', 'skills'])
            ->with(['reports.reporter'])
            ->where('is_reported', 1)
            ->latest();

        $perPage = (int) $request->query('per_page', 15);
        $perPage = ($perPage >= 1 && $perPage <= 100) ? $perPage : 15;
        $jobs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách tin bị báo cáo thành công.',
            'data' => JobResource::collection($jobs),
            'meta' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
                'total' => $jobs->total(),
            ],
        ], 200);
    }

    /** Resolve all pending user reports for a job. */
    public function resolveJobReports(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:resolved,dismissed'],
        ]);

        $job = Job::find($id);
        if (!$job) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy tin tuyển dụng'], 404);
        }

        DB::transaction(function () use ($job, $validated, $request) {
            JobReport::where('job_id', $job->id)
                ->where('status', 'pending')
                ->update([
                    'status' => $validated['status'],
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                    'updated_at' => now(),
                ]);

            $job->forceFill([
                'is_reported' => JobReport::where('job_id', $job->id)->where('status', 'pending')->exists(),
            ])->save();
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật kết quả xử lý báo cáo',
            'data' => ['job_id' => $job->id, 'is_reported' => (bool) $job->fresh()->is_reported],
        ], 200);
    }

    /**
     * Admin Xóa tin tuyển dụng vi phạm chính sách (FR-09.2)
     */
    public function deleteJob(Request $request, $id): JsonResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

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

    /**
     * Xóa tin tuyển dụng bị báo cáo (alias)
     */
    public function deleteReportedJob(Request $request, $id): JsonResponse
    {
        return $this->deleteJob($request, $id);
    }

    /**
     * Quản lý danh mục ngành nghề cho Admin (FR-09.5)
     */
    public function categories(Request $request): JsonResponse
    {
        $query = Category::withCount('jobs');

        if ($request->filled('keyword')) {
            $keyword = $request->query('keyword');
            $query->where('name', 'like', "%{$keyword}%");
        }

        if ($request->filled('usage')) {
            $usage = $request->query('usage');
            if ($usage === 'used') {
                $query->has('jobs');
            } elseif ($usage === 'unused') {
                $query->doesntHave('jobs');
            }
        }

        $totalCategories = Category::count();
        $usedCount = Category::has('jobs')->count();
        $unusedCount = $totalCategories - $usedCount;

        $sort = $request->query('sort', 'newest');
        if ($sort === 'name') {
            $query->orderBy('name', 'asc');
        } elseif ($sort === 'usage') {
            $query->orderBy('jobs_count', 'desc');
        } elseif ($sort === 'oldest') {
            $query->orderBy('id', 'asc');
        } else {
            $query->orderBy('id', 'desc');
        }

        $perPage = (int) $request->query('per_page', 15);
        $categories = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách danh mục thành công.',
            'data' => $categories->items(),
            'meta' => [
                'total' => $categories->total(),
                'page' => $categories->currentPage(),
                'per_page' => $categories->perPage(),
                'last_page' => $categories->lastPage(),
            ],
            'summary' => [
                'total' => $totalCategories,
                'used_count' => $usedCount,
                'unused_count' => $unusedCount,
            ],
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:150|unique:categories,name']);
        $category = Category::create(['name' => trim($request->name)]);

        return response()->json([
            'success' => true,
            'message' => 'Thêm danh mục ngành nghề thành công.',
            'data' => $category,
        ], 201);
    }

    public function updateCategory(Request $request, $id): JsonResponse
    {
        $category = Category::find($id);
        if (!$category) {
            return response()->json(['success' => false, 'message' => 'Danh mục không tồn tại.'], 404);
        }

        $request->validate(['name' => 'required|string|max:150|unique:categories,name,' . $id]);
        $category->update(['name' => trim($request->name)]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật danh mục thành công.',
            'data' => $category,
        ], 200);
    }

    public function destroyCategory($id): JsonResponse
    {
        $category = Category::find($id);
        if (!$category) {
            return response()->json(['success' => false, 'message' => 'Danh mục không tồn tại.'], 404);
        }

        try {
            $category->delete();
            return response()->json(['success' => true, 'message' => 'Xóa danh mục ngành nghề thành công.']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Không thể xóa danh mục đang có tin tuyển dụng liên kết.'], 400);
        }
    }

    /**
     * Quản lý kỹ năng cho Admin (FR-09.5)
     */
    public function skills(Request $request): JsonResponse
    {
        $query = Skill::withCount(['jobs', 'candidateProfiles']);

        if ($request->filled('keyword')) {
            $keyword = $request->query('keyword');
            $query->where('name', 'like', "%{$keyword}%");
        }

        if ($request->filled('usage')) {
            $usage = $request->query('usage');
            if ($usage === 'used') {
                $query->where(function ($q) {
                    $q->has('jobs')->orHas('candidateProfiles');
                });
            } elseif ($usage === 'unused') {
                $query->doesntHave('jobs')->doesntHave('candidateProfiles');
            }
        }

        $totalSkills = Skill::count();
        $usedCount = Skill::has('jobs')->orHas('candidateProfiles')->count();
        $unusedCount = $totalSkills - $usedCount;

        $sort = $request->query('sort', 'newest');
        if ($sort === 'name') {
            $query->orderBy('name', 'asc');
        } elseif ($sort === 'usage') {
            $query->orderBy('jobs_count', 'desc');
        } elseif ($sort === 'oldest') {
            $query->orderBy('id', 'asc');
        } else {
            $query->orderBy('id', 'desc');
        }

        $perPage = (int) $request->query('per_page', 15);
        $skills = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách kỹ năng thành công.',
            'data' => $skills->items(),
            'meta' => [
                'total' => $skills->total(),
                'page' => $skills->currentPage(),
                'per_page' => $skills->perPage(),
                'last_page' => $skills->lastPage(),
            ],
            'summary' => [
                'total' => $totalSkills,
                'used_count' => $usedCount,
                'unused_count' => $unusedCount,
            ],
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    public function storeSkill(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:100|unique:skills,name']);
        $skill = Skill::create(['name' => trim($request->name)]);

        return response()->json([
            'success' => true,
            'message' => 'Thêm kỹ năng thành công.',
            'data' => $skill,
        ], 201);
    }

    public function updateSkill(Request $request, $id): JsonResponse
    {
        $skill = Skill::find($id);
        if (!$skill) {
            return response()->json(['success' => false, 'message' => 'Kỹ năng không tồn tại.'], 404);
        }

        $request->validate(['name' => 'required|string|max:100|unique:skills,name,' . $id]);
        $skill->update(['name' => trim($request->name)]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật kỹ năng thành công.',
            'data' => $skill,
        ], 200);
    }

    public function destroySkill($id): JsonResponse
    {
        $skill = Skill::find($id);
        if (!$skill) {
            return response()->json(['success' => false, 'message' => 'Kỹ năng không tồn tại.'], 404);
        }

        $skill->delete();
        return response()->json(['success' => true, 'message' => 'Xóa kỹ năng thành công.']);
    }
}
