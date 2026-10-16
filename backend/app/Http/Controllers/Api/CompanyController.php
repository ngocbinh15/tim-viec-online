<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CompanyProfileRequest;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompanyController extends Controller
{
    /**
     * Danh sách công ty công khai (kèm tìm kiếm và số lượng việc làm đang mở)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Company::query()
            ->with('user')
            ->withCount(['jobs' => function ($q) {
                $q->active();
            }]);

        if ($request->filled('keyword')) {
            $keyword = trim($request->input('keyword'));
            $query->where(function ($q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                  ->orWhere('description', 'like', "%{$keyword}%")
                  ->orWhere('address', 'like', "%{$keyword}%");
            });
        }

        if ($request->filled('city')) {
            $query->where('city', $request->input('city'));
        }

        $query->orderBy('id', 'desc');

        $perPage = (int) $request->input('per_page', 10);
        $perPage = ($perPage > 0 && $perPage <= 100) ? $perPage : 10;

        $companies = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách công ty thành công',
            'data' => CompanyResource::collection($companies),
            'meta' => [
                'current_page' => $companies->currentPage(),
                'last_page' => $companies->lastPage(),
                'per_page' => $companies->perPage(),
                'total' => $companies->total(),
            ],
        ], 200);
    }

    /**
     * Xem thông tin chi tiết công ty công khai (FR-04.7 kèm danh sách việc làm đang tuyển)
     */
    public function show($id): JsonResponse
    {
        $company = Company::with([
            'user',
            'jobs' => function ($q) {
                $q->active()->with(['category', 'skills'])->orderBy('updated_at', 'desc');
            },
        ])->find($id);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin công ty',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin chi tiết công ty thành công',
            'data' => new CompanyResource($company),
        ], 200);
    }

    /**
     * [Employer] Xem thông tin công ty của chính mình
     */
    public function myCompany(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = Company::firstOrCreate(
            ['user_id' => $user->id],
            ['name' => $user->name]
        );
        $company->load('user');

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin công ty thành công',
            'data' => new CompanyResource($company),
        ], 200);
    }

    /**
     * [Employer] Cập nhật thông tin công ty (FR-04.1)
     */
    public function updateCompany(CompanyProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $company = Company::firstOrCreate(
            ['user_id' => $user->id],
            ['name' => $user->name]
        );

        // Xử lý upload Logo công ty
        if ($request->hasFile('logo')) {
            if ($company->logo && !filter_var($company->logo, FILTER_VALIDATE_URL) && Storage::disk('public')->exists($company->logo)) {
                Storage::disk('public')->delete($company->logo);
            }
            $company->logo = $request->file('logo')->store('company_logos', 'public');
        }

        // Cập nhật thông tin
        $company->fill($request->only([
            'name',
            'company_size',
            'website',
            'address',
            'city',
            'description',
        ]));
        $company->save();

        $company->load('user');

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin công ty thành công',
            'data' => new CompanyResource($company),
        ], 200);
    }
}
