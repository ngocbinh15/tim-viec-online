<?php

namespace App\Http\Controllers;
use App\Models\Job;
use App\Models\User;
use App\Models\Category;
use App\Models\Skill;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Application;
use Carbon\Carbon;
class AdminController extends Controller
{
    /**
     * 1. GET /api/admin/stats - Thống kê hệ thống tổng quan
     */
    public function stats(Request $request): JsonResponse
    {
        $days = $request->query('days', 7);
        // Thống kê tổng số lượng
        $usersCount = User::count();
        $candidatesCount = User::where('role', 'candidate')->count();
        $employersCount = User::where('role', 'employer')->count();
        $lockedUsersCount = User::where('status', 'locked')->count();
        $jobsCount = Job::count();
        $activeJobsCount = Job::where('status', 'active')->count();
        $closedJobsCount = Job::where('status', 'closed')->count();
        $expiredJobsCount = Job::where('status', 'expired')->count();
        $reportedJobsCount = Job::where('is_reported', true)->count();
        $applicationsCount = Application::count();
        // Xu hướng (trends) theo số ngày yêu cầu
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
        // Dữ liệu phụ trợ
        $recentUsers = User::latest()->take(5)->get(['id', 'name', 'email', 'role', 'status', 'created_at']);
        $reportedJobs = Job::where('is_reported', true)->with('company')->latest()->take(5)->get();
        $topCategories = Category::withCount('jobs')->orderByDesc('jobs_count')->take(5)->get();
        return response()->json([
            'success' => true,
            'data' => [
                'users_count' => $usersCount,
                'candidates_count' => $candidatesCount,
                'employers_count' => $employersCount,
                'locked_users_count' => $lockedUsersCount,
                'jobs_count' => $jobsCount,
                'active_jobs_count' => $activeJobsCount,
                'closed_jobs_count' => $closedJobsCount,
                'expired_jobs_count' => $expiredJobsCount,
                'reported_jobs_count' => $reportedJobsCount,
                'applications_count' => $applicationsCount,
                'trends' => $trends,
                'recent_users' => $recentUsers,
                'reported_jobs' => $reportedJobs,
                'top_categories' => $topCategories,
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * 2. GET /api/admin/users - Danh sách người dùng có lọc, tìm kiếm và phân trang
     */
    public function users(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('keyword')) {
            $keyword = $request->query('keyword');
            $query->where(function($q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                  ->orWhere('email', 'like', "%{$keyword}%")
                  ->orWhere('phone', 'like', "%{$keyword}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->query('role'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $sort = $request->query('sort', 'newest');
        if ($sort === 'oldest') {
            $query->oldest();
        } elseif ($sort === 'name') {
            $query->orderBy('name', 'asc');
        } else {
            $query->latest();
        }

        $perPage = $request->query('per_page', 15);
        $users = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $users->items(),
            'meta' => [
                'total' => $users->total(),
                'page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'last_page' => $users->lastPage(),
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * 3. GET /api/admin/users/{user_id} - Chi tiết người dùng
     */
    public function userDetail($userId): JsonResponse
    {
        $user = User::with(['company', 'candidateProfile'])->find($userId);

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy người dùng.'], 404);
        }

        $jobsCount = 0;
        if ($user->role === 'employer' && $user->company) {
            $jobsCount = Job::where('company_id', $user->company->id)->count();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at,
                'company' => $user->company,
                'candidate_profile' => $user->candidateProfile,
                'jobs_count' => $jobsCount,
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * 5. GET /api/admin/jobs - Quản lý danh sách tin tuyển dụng
     */
    public function jobs(Request $request): JsonResponse
    {
        $query = Job::with('company');

        if ($request->filled('keyword')) {
            $keyword = $request->query('keyword');
            $query->where('title', 'like', "%{$keyword}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('is_reported')) {
            $query->where('is_reported', $request->query('is_reported'));
        }

        $sort = $request->query('sort', 'newest');
        if ($sort === 'oldest') {
            $query->oldest();
        } elseif ($sort === 'name') {
            $query->orderBy('title', 'asc');
        } else {
            $query->latest();
        }

        $perPage = $request->query('per_page', 15);
        $jobs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $jobs->items(),
            'meta' => [
                'total' => $jobs->total(),
                'page' => $jobs->currentPage(),
                'per_page' => $jobs->perPage(),
                'last_page' => $jobs->lastPage(),
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * 6. GET /api/admin/jobs/{job_id} - Chi tiết tin tuyển dụng & Tác động xóa
     */
    public function jobDetail($jobId): JsonResponse
    {
        $job = Job::with(['company.user', 'category', 'skills'])->find($jobId);

        if (!$job) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy tin tuyển dụng.'], 404);
        }

        // Thống kê các dữ liệu liên quan để Admin đánh giá tác động khi xóa
        $applicationsCount = Application::where('job_id', $jobId)->count();
        // Giả lập các biến đếm hội thoại/tin nhắn/lưu tin nếu hệ thống có bảng tương ứng
        $conversationsCount = 0;
        $messagesCount = 0;
        $analysesCount = Application::where('job_id', $jobId)->has('aiAnalysis')->count();
        $savedCount = 0; // Thay thế bằng bảng favorite_jobs nếu có

        return response()->json([
            'success' => true,
            'data' => [
                'job' => $job,
                'owner' => $job->company ? $job->company->user : null,
                'is_reported' => $job->is_reported,
                'deletion_impact' => [
                    'applications_count' => $applicationsCount,
                    'conversations_count' => $conversationsCount,
                    'messages_count' => $messagesCount,
                    'analyses_count' => $analysesCount,
                    'saved_count' => $savedCount,
                ]
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
    /**
     * Lấy danh sách tin tuyển dụng bị báo cáo vi phạm hoặc toàn bộ tin để kiểm duyệt
     */
    public function getReportedJobs(Request $request): JsonResponse
    {
        $query = Job::with(['company.user', 'category']);

        // Lọc theo trạng thái báo cáo nếu có yêu cầu
        if ($request->boolean('reported_only', true)) {
            $query->where('is_reported', 1);
        }

        $jobs = $query->orderBy('updated_at', 'desc')->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách tin tuyển dụng cần kiểm duyệt thành công.',
            'data' => $jobs
        ], 200);
    }

    /**
     * Xóa tin tuyển dụng vi phạm và thông báo cho Nhà tuyển dụng (FR-09.2)
     */
    public function deleteReportedJob(Request $request, $id): JsonResponse
    {
        $job = Job::with('company.user')->find($id);

        if (!$job) {
            return response()->json([
                'success' => false,
                'message' => 'Tin tuyển dụng không tồn tại.'
            ], 404);
        }

        $reason = $request->input('reason', 'Tin tuyển dụng vi phạm chính sách kiểm duyệt của hệ thống.');

        try {
            DB::transaction(function () use ($job, $reason) {
                // Gửi thông báo cho nhà tuyển dụng sở hữu tin
                if ($job->company && $job->company->user) {
                    Notification::create([
                        'user_id' => $job->company->user->id,
                        'title' => 'Tin tuyển dụng bị gỡ bỏ',
                        'content' => "Tin tuyển dụng '{$job->title}' đã bị quản trị viên gỡ bỏ. Lý do: {$reason}",
                        'type' => 'job_deleted_by_admin',
                        'data' => ['job_id' => $job->id]
                    ]);
                }

                // Xóa tin tuyển dụng (Dữ liệu liên quan như job_skills, applications sẽ tự động xóa nhờ cascade trên DB)
                $job->delete();
            });

            return response()->json([
                'success' => true,
                'message' => 'Đã xóa tin tuyển dụng vi phạm và gửi thông báo thành công.'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Xóa tin tuyển dụng thất bại.',
                'error' => $e->getMessage()
            ], 500);
        }
    }




    /**
     * Khóa hoặc Mở khóa tài khoản người dùng (FR-09.4)
     */
    public function toggleLockUser(Request $request, $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy tài khoản người dùng.'
            ], 404);
        }

        // Không cho phép admin tự khóa tài khoản chính mình
        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không thể tự khóa tài khoản của chính mình.'
            ], 400);
        }

        // Chuyển đổi trạng thái active <-> locked
        $newStatus = $user->status === 'active' ? 'locked' : 'active';

        $user->update([
            'status' => $newStatus,
            // Nếu khóa tài khoản, có thể xóa toàn bộ token phiên làm việc hiện tại để hủy phiên đăng nhập ngay lập tức (FR-09.4)
        ]);

        if ($newStatus === 'locked') {
            $user->tokens()->delete(); // Hủy toàn bộ token đăng nhập hiện tại
        }

        $message = $newStatus === 'locked' ? 'Đã khóa tài khoản thành công.' : 'Đã mở khóa tài khoản thành công.';

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => [
                'user_id' => $user->id,
                'status' => $user->status
            ]
        ], 200);
    }

    // --- Quản lý Categories ---
    public function storeCategory(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:150|unique:categories,name']);
        $category = Category::create(['name' => $request->name]);

        return response()->json([
            'success' => true,
            'message' => 'Thêm danh mục ngành nghề thành công.',
            'data' => $category
        ], 201);
    }

    public function updateCategory(Request $request, $id): JsonResponse
    {
        $category = Category::find($id);
        if (!$category) return response()->json(['success' => false, 'message' => 'Danh mục không tồn tại.'], 404);

        $request->validate(['name' => 'required|string|max:150|unique:categories,name,' . $id]);
        $category->update(['name' => $request->name]);

        return response()->json(['success' => true, 'message' => 'Cập nhật danh mục thành công.', 'data' => $category]);
    }

    public function destroyCategory($id): JsonResponse
    {
        $category = Category::find($id);
        if (!$category) return response()->json(['success' => false, 'message' => 'Danh mục không tồn tại.'], 404);

        try {
            $category->delete();
            return response()->json(['success' => true, 'message' => 'Xóa danh mục ngành nghề thành công.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Không thể xóa danh mục đang có tin tuyển dụng liên kết.'], 400);
        }
    }

    // --- Quản lý Skills ---
    public function storeSkill(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:100|unique:skills,name']);
        $skill = Skill::create(['name' => $request->name]);

        return response()->json([
            'success' => true,
            'message' => 'Thêm kỹ năng thành công.',
            'data' => $skill
        ], 201);
    }

    public function updateSkill(Request $request, $id): JsonResponse
    {
        $skill = Skill::find($id);
        if (!$skill) return response()->json(['success' => false, 'message' => 'Kỹ năng không tồn tại.'], 404);

        $request->validate(['name' => 'required|string|max:100|unique:skills,name,' . $id]);
        $skill->update(['name' => $request->name]);

        return response()->json(['success' => true, 'message' => 'Cập nhật kỹ năng thành công.', 'data' => $skill]);
    }

    public function destroySkill($id): JsonResponse
    {
        $skill = Skill::find($id);
        if (!$skill) return response()->json(['success' => false, 'message' => 'Kỹ năng không tồn tại.'], 404);

        $skill->delete();
        return response()->json(['success' => true, 'message' => 'Xóa kỹ năng thành công.']);
    }
    /**
     * GET /api/admin/categories - Quản lý danh mục (Categories) cho Admin
     */
    public function categories(Request $request): JsonResponse
    {
        $query = Category::withCount('jobs');

        // 1. Tìm kiếm theo từ khóa (keyword)
        if ($request->filled('keyword')) {
            $keyword = $request->query('keyword');
            $query->where('name', 'like', "%{$keyword}%");
        }

        // 2. Lọc theo trạng thái sử dụng (usage: used / unused)
        if ($request->filled('usage')) {
            $usage = $request->query('usage');
            if ($usage === 'used') {
                $query->having('jobs_count', '>', 0);
            } elseif ($usage === 'unused') {
                $query->having('jobs_count', '=', 0);
            }
        }

        // Tính toán tổng số lượng cho summary trước khi phân trang
        $totalCategories = Category::count();
        $usedCount = Category::has('jobs')->count();
        $unusedCount = $totalCategories - $usedCount;

        // 3. Sắp xếp (sort: name / usage / newest / oldest)
        $sort = $request->query('sort', 'newest');
        if ($sort === 'name') {
            $query->orderBy('name', 'asc');
        } elseif ($sort === 'usage') {
            $query->orderBy('jobs_count', 'desc');
        }

        $perPage = $request->query('per_page', 15);
        $categories = $query->paginate($perPage);

        return response()->json([
            'success' => true,
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
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * GET /api/admin/skills - Quản lý kỹ năng (Skills) cho Admin
     */
    public function skills(Request $request): JsonResponse
    {
        // Giả sử Model Skill có quan hệ jobs và candidateProfiles (hoặc tùy chỉnh theo DB thực tế của bạn)
        $query = Skill::withCount(['jobs', 'candidateProfiles']);

        // 1. Tìm kiếm theo từ khóa (keyword)
        if ($request->filled('keyword')) {
            $keyword = $request->query('keyword');
            $query->where('name', 'like', "%{$keyword}%");
        }

        // 2. Lọc theo trạng thái sử dụng (usage: used / unused)
        if ($request->filled('usage')) {
            $usage = $request->query('usage');
            if ($usage === 'used') {
                $query->having('jobs_count', '>', 0)->orHaving('candidate_profiles_count', '>', 0);
            } elseif ($usage === 'unused') {
                $query->having('jobs_count', '=', 0)->where('candidate_profiles_count', '=', 0);
            }
        }

        // Tính toán tổng số lượng cho summary
        $totalSkills = Skill::count();
        $usedCount = Skill::has('jobs')->orHas('candidateProfiles')->count();
        $unusedCount = $totalSkills - $usedCount;

        // 3. Sắp xếp (sort: name / usage / newest / oldest)
        $sort = $request->query('sort', 'newest');
        if ($sort === 'name') {
            $query->orderBy('name', 'asc');
        } elseif ($sort === 'usage') {
            $query->orderBy('jobs_count', 'desc');
        }

        $perPage = $request->query('per_page', 15);
        $skills = $query->paginate($perPage);

        return response()->json([
            'success' => true,
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
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}
