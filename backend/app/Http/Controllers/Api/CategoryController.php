<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Lấy danh sách toàn bộ ngành nghề (kèm số lượng việc làm đang mở)
     */
    public function index(): JsonResponse
    {
        $categories = Category::withCount(['jobs' => function ($query) {
            $query->active();
        }])->get();

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách ngành nghề thành công',
            'data' => $categories,
        ], 200);
    }

    /**
     * Xem chi tiết ngành nghề
     */
    public function show($id): JsonResponse
    {
        $category = Category::withCount(['jobs' => function ($query) {
            $query->active();
        }])->find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy ngành nghề',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy chi tiết ngành nghề thành công',
            'data' => $category,
        ], 200);
    }

    /**
     * [Admin] Thêm ngành nghề mới (FR-09.5)
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:150', 'unique:categories,name'],
        ], [
            'name.required' => 'Tên ngành nghề là bắt buộc',
            'name.unique' => 'Tên ngành nghề đã tồn tại',
            'name.max' => 'Tên ngành nghề tối đa 150 ký tự',
        ]);

        $category = Category::create([
            'name' => trim($request->name),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Thêm ngành nghề thành công',
            'data' => $category,
        ], 201);
    }

    /**
     * [Admin] Chỉnh sửa ngành nghề (FR-09.5)
     */
    public function update(Request $request, $id): JsonResponse
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy ngành nghề',
            ], 404);
        }

        $request->validate([
            'name' => ['required', 'string', 'max:150', 'unique:categories,name,' . $id],
        ], [
            'name.required' => 'Tên ngành nghề là bắt buộc',
            'name.unique' => 'Tên ngành nghề đã tồn tại',
            'name.max' => 'Tên ngành nghề tối đa 150 ký tự',
        ]);

        $category->update([
            'name' => trim($request->name),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật ngành nghề thành công',
            'data' => $category,
        ], 200);
    }

    /**
     * [Admin] Xóa ngành nghề (FR-09.5)
     */
    public function destroy($id): JsonResponse
    {
        $category = Category::withCount('jobs')->find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy ngành nghề',
            ], 404);
        }

        // Không cho phép xóa ngành nghề nếu đang có tin tuyển dụng sử dụng
        if ($category->jobs_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa ngành nghề đang có tin tuyển dụng liên kết',
            ], 400);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa ngành nghề thành công',
        ], 200);
    }
}
