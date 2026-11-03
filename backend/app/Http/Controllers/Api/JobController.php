<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobRequest;
use App\Http\Requests\SearchJobRequest;
use App\Http\Resources\JobResource;
use App\Models\Job;
use App\Models\SavedJob;
use App\Services\JobDiscoveryOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobController extends Controller
{
    /** Public city filter options based on currently searchable listings. */
    public function cities(): JsonResponse
    {
        $cities = Job::active()
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->select('city')
            ->distinct()
            ->orderBy('city')
            ->pluck('city');

        return response()->json([
            'success' => true,
            'data' => $cities,
        ]);
    }

    /**
     * Danh sách việc làm & Tìm kiếm, Lọc đa tiêu chí (FR-05)
     */
    public function index(SearchJobRequest $request, JobDiscoveryOrder $discovery): JsonResponse
    {
        $query = Job::query()
            ->active()
            ->with(['company.user', 'category', 'skills']);

        // Load quan hệ kiểm tra saved / applied nếu là candidate đã đăng nhập
        $user = $request->user('sanctum');
        if ($user && $user->isCandidate() && $user->candidateProfile) {
            $query->with([
                'savedByCandidates' => function ($q) use ($user) {
                    $q->where('candidate_profiles.id', $user->candidateProfile->id);
                },
                'applications' => function ($q) use ($user) {
                    $q->where('candidate_id', $user->candidateProfile->id);
                },
            ]);
        }

        // FR-05.1: Tìm kiếm theo từ khóa (Tiêu đề, Tên công ty, Kỹ năng)
        if ($request->filled('keyword')) {
            $keyword = trim($request->input('keyword'));
            $query->where(function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                  ->orWhereHas('company', function ($cq) use ($keyword) {
                      $cq->where('name', 'like', "%{$keyword}%");
                  })
                  ->orWhereHas('skills', function ($sq) use ($keyword) {
                      $sq->where('name', 'like', "%{$keyword}%");
                  });
            });
        }

        // FR-05.2: Lọc theo ngành nghề (Category)
        if ($request->filled('category_id')) {
            $categoryIds = is_array($request->input('category_id'))
                ? $request->input('category_id')
                : explode(',', $request->input('category_id'));
            $query->whereIn('category_id', array_filter($categoryIds));
        }

        // Lọc theo Tỉnh/Thành phố (City)
        if ($request->filled('city')) {
            $city = preg_replace('/^(?:TP\.?|Thành phố|Tỉnh)\s+/iu', '', trim($request->input('city')));
            $query->whereIn('city', [$city, 'TP. '.$city, 'TP '.$city, 'Thành phố '.$city, 'Tỉnh '.$city]);
        }

        // Lọc theo hình thức làm việc (Job Type)
        if ($request->filled('job_type')) {
            $query->where('job_type', $request->input('job_type'));
        }

        // FR-05.3: Quy tắc lọc theo mức lương
        if ($request->filled('salary_range')) {
            $range = $request->input('salary_range');
            if ($range === 'under_10' || $range === 'under_10m') {
                $query->where('is_negotiable', 0)
                      ->where(function ($q) {
                          $q->where('salary_max', '<', 10000000)
                            ->orWhere(function ($sub) {
                                $sub->whereNull('salary_max')->where('salary_min', '<', 10000000);
                            });
                      });
            } elseif ($range === '10_20' || $range === '10m_20m') {
                $query->where('is_negotiable', 0)
                      ->where(function ($q) {
                          $q->where('salary_max', '>=', 10000000)
                            ->orWhere(function ($from) {
                                $from->whereNull('salary_max')->whereNotNull('salary_min');
                            });
                      })
                      ->where('salary_min', '<=', 20000000);
            } elseif ($range === 'over_20' || $range === 'above_20m' || $range === 'above_20') {
                $query->where('is_negotiable', 0)
                      ->where('salary_min', '>', 20000000);
            } elseif ($range === 'negotiable') {
                $query->where('is_negotiable', 1);
            }
        }

        // Lọc theo danh sách kỹ năng (FR-05.2)
        if ($request->filled('skill_ids')) {
            $skillIds = is_array($request->skill_ids) ? $request->skill_ids : explode(',', $request->skill_ids);
            $skillIds = array_filter(array_map('intval', $skillIds));
            if (!empty($skillIds)) {
                $query->whereHas('skills', function ($q) use ($skillIds) {
                    $q->whereIn('skills.id', $skillIds);
                }, '=', count($skillIds));
            }
        }

        if ($request->filled('level')) {
            $level = $request->string('level')->toString();
            $query->whereIn('job_level', strtolower($level) === 'middle' ? [$level, 'mid'] : [$level]);
        }
        // Whitelisted ordering is applied before pagination, with stable tie breaks.
        $sort = $request->input('sort', 'default');
        if ($sort === 'relevance' && $request->filled('keyword')) {
            $keyword = '%'.trim($request->input('keyword')).'%';
            $query->orderByRaw('(CASE WHEN jobs.title LIKE ? THEN 3 ELSE 0 END + '
                .'CASE WHEN EXISTS (SELECT 1 FROM job_skills JOIN skills ON skills.id = job_skills.skill_id WHERE job_skills.job_id = jobs.id AND skills.name LIKE ?) THEN 2 ELSE 0 END + '
                .'CASE WHEN EXISTS (SELECT 1 FROM companies WHERE companies.id = jobs.company_id AND companies.name LIKE ?) THEN 1 ELSE 0 END) DESC',
                [$keyword, $keyword, $keyword]);
        }
        if ($sort === 'default' || ($sort === 'relevance' && ! $request->filled('keyword'))) {
            $discovery->apply($query);
        } else {
            match ($sort) {
                'salary_desc' => $query->orderBy('is_negotiable')->orderByRaw('COALESCE(salary_max, salary_min, 0) DESC'),
                'newest' => $query->orderByDesc('created_at'),
                default => $query->orderByDesc('updated_at'),
            };
            $query->orderByDesc('id');
        }

        $perPage = (int) $request->input('per_page', 10);
        $perPage = ($perPage > 0 && $perPage <= 100) ? $perPage : 10;

        $jobs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách việc làm thành công',
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
     * Xem chi tiết việc làm
     */
    public function show(Request $request, $id): JsonResponse
    {
        $query = Job::with(['company.user', 'category', 'skills']);

        $user = $request->user('sanctum');
        if ($user && $user->isCandidate() && $user->candidateProfile) {
            $query->with([
                'savedByCandidates' => function ($q) use ($user) {
                    $q->where('candidate_profiles.id', $user->candidateProfile->id);
                },
                'applications' => function ($q) use ($user) {
                    $q->where('candidate_id', $user->candidateProfile->id);
                },
            ]);
        }

        $job = $query->find($id);

        if (!$job) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc không tồn tại hoặc đã ngừng tuyển dụng',
            ], 404);
        }

        // Tăng lượt xem tin tuyển dụng
        $job->increment('views_count');

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin việc làm thành công',
            'data' => new JobResource($job),
        ], 200);
    }

    /**
     * [Employer] Lấy danh sách tin tuyển dụng của công ty mình
     */
    public function myJobs(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = $user->company;

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ công ty',
            ], 404);
        }

        $jobs = Job::where('company_id', $company->id)
            ->withCount('applications')
            ->with(['category', 'skills'])
            ->orderBy('updated_at', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách tin đã đăng thành công',
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
     * [Employer] Đăng tin tuyển dụng mới (FR-04.2 - FR-04.5)
     */
    public function store(JobRequest $request): JsonResponse
    {
        $user = $request->user();
        $company = $user->company;

        // FR-04.1: Kiểm tra hồ sơ công ty đã hoàn thiện chưa
        if (!$company || !$company->isComplete()) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng cập nhật đầy đủ thông tin công ty (Tên, Giới thiệu, Trụ sở, Tỉnh/Thành phố) trước khi đăng tin tuyển dụng đầu tiên',
            ], 400);
        }

        $isNegotiable = filter_var($request->input('is_negotiable'), FILTER_VALIDATE_BOOLEAN);

        $job = Job::create([
            'company_id' => $company->id,
            'category_id' => $request->category_id,
            'title' => trim($request->title),
            'job_level' => $request->job_level,
            'quantity' => $request->quantity,
            'job_type' => $request->job_type,
            'city' => $request->city,
            'address' => $request->address,
            'deadline' => $request->deadline,
            'description' => $request->description,
            'requirements' => $request->requirements,
            'benefits' => $request->benefits ?? '',
            'is_negotiable' => $isNegotiable,
            'salary_min' => $isNegotiable ? null : $request->salary_min,
            'salary_max' => $isNegotiable ? null : $request->salary_max,
            'status' => 'active', // FR-04.5
        ]);

        if ($request->has('skills')) {
            $job->skills()->sync($request->skills);
        }

        $job->load(['company.user', 'category', 'skills']);

        return response()->json([
            'success' => true,
            'message' => 'Đăng tin tuyển dụng thành công',
            'data' => new JobResource($job),
        ], 201);
    }

    /**
     * [Employer] Chỉnh sửa tin tuyển dụng
     */
    public function update(JobRequest $request, $id): JsonResponse
    {
        $company = $request->user()->company;
        $job = Job::where('company_id', $company->id)->find($id);

        if (!$job) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc không tồn tại hoặc bạn không có quyền chỉnh sửa',
            ], 404);
        }

        $isNegotiable = filter_var($request->input('is_negotiable'), FILTER_VALIDATE_BOOLEAN);

        $job->update([
            'category_id' => $request->category_id,
            'title' => trim($request->title),
            'job_level' => $request->job_level,
            'quantity' => $request->quantity,
            'job_type' => $request->job_type,
            'city' => $request->city,
            'address' => $request->address,
            'deadline' => $request->deadline,
            'description' => $request->description,
            'requirements' => $request->requirements,
            'benefits' => $request->benefits ?? '',
            'is_negotiable' => $isNegotiable,
            'salary_min' => $isNegotiable ? null : $request->salary_min,
            'salary_max' => $isNegotiable ? null : $request->salary_max,
        ]);

        if ($request->has('skills')) {
            $job->skills()->sync($request->skills);
        }

        $job->load(['company.user', 'category', 'skills']);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật tin tuyển dụng thành công',
            'data' => new JobResource($job),
        ], 200);
    }

    /**
     * [Employer] Đóng hoặc Mở lại tin tuyển dụng (FR-04.6)
     */
    public function toggleStatus(Request $request, $id): JsonResponse
    {
        $company = $request->user()->company;
        $job = Job::where('company_id', $company->id)->find($id);

        if (!$job) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc không tồn tại hoặc bạn không có quyền thao tác',
            ], 404);
        }

        $request->validate([
            'status' => ['required', 'in:active,closed'],
            'deadline' => ['nullable', 'date', 'after:today'],
        ]);

        if ($request->status === 'active'
            && !$request->filled('deadline')
            && $job->deadline
            && $job->deadline->toDateString() < now()->toDateString()) {
            return response()->json([
                'success' => false,
                'message' => 'Tin đã hết hạn; cần chọn hạn nộp mới trong tương lai để mở lại',
            ], 400);
        }

        $updateData = ['status' => $request->status];
        if ($request->status === 'active' && $request->filled('deadline')) {
            $updateData['deadline'] = $request->deadline;
        }

        $job->update($updateData);

        $msg = $job->status === 'active' ? 'Đã mở lại tin tuyển dụng' : 'Đã đóng tin tuyển dụng';

        return response()->json([
            'success' => true,
            'message' => $msg,
            'data' => [
                'id' => $job->id,
                'status' => $job->status,
                'deadline' => $job->deadline?->format('Y-m-d'),
            ],
        ], 200);
    }

    /**
     * [Candidate] Lưu việc làm yêu thích (FR-05.6)
     */
    public function saveJob(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $candidateProfile = $user->candidateProfile;

        $job = Job::active()->find($id);
        if (!$job) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc không tồn tại hoặc đã ngừng tuyển dụng',
            ], 404);
        }

        SavedJob::firstOrCreate([
            'candidate_id' => $candidateProfile->id,
            'job_id' => $job->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lưu việc làm thành công',
        ], 200);
    }

    /**
     * [Candidate] Bỏ lưu việc làm yêu thích (FR-05.6)
     */
    public function unsaveJob(Request $request, $id): JsonResponse
    {
        $candidateProfile = $request->user()->candidateProfile;

        SavedJob::where('candidate_id', $candidateProfile->id)
            ->where('job_id', $id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Bỏ lưu việc làm thành công',
        ], 200);
    }

    /**
     * [Candidate] Danh sách các việc làm đã lưu (FR-05.6)
     */
    public function savedJobs(Request $request): JsonResponse
    {
        $candidateProfile = $request->user()->candidateProfile;

        $jobs = $candidateProfile->savedJobs()
            ->with(['company.user', 'category', 'skills'])
            ->orderBy('saved_jobs.created_at', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách việc làm đã lưu thành công',
            'data' => JobResource::collection($jobs),
            'meta' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
                'total' => $jobs->total(),
            ],
        ], 200);
    }
}
