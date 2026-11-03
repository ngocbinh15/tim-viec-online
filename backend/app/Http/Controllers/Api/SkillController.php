<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillController extends Controller
{
    /**
     * Lấy danh sách kỹ năng (hỗ trợ tìm kiếm nhanh theo từ khóa)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Skill::query();

        if ($request->filled('keyword')) {
            $keyword = trim($request->keyword);
            $query->where('name', 'like', "%{$keyword}%");
        }

        $skills = $query->orderBy('name', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách kỹ năng thành công',
            'data' => $skills,
        ], 200);
    }

    /**
     * Xem chi tiết 1 kỹ năng
     */
    public function show($id): JsonResponse
    {
        $skill = Skill::find($id);

        if (!$skill) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy kỹ năng',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy chi tiết kỹ năng thành công',
            'data' => $skill,
        ], 200);
    }

    /**
     * [Admin] Thêm kỹ năng mới (FR-09.5)
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:skills,name'],
        ], [
            'name.required' => 'Tên kỹ năng là bắt buộc',
            'name.unique' => 'Kỹ năng này đã tồn tại trong hệ thống',
            'name.max' => 'Tên kỹ năng tối đa 100 ký tự',
        ]);

        $skill = Skill::create([
            'name' => trim($request->name),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Thêm kỹ năng thành công',
            'data' => $skill,
        ], 201);
    }

    /**
     * [Admin] Cập nhật kỹ năng (FR-09.5)
     */
    public function update(Request $request, $id): JsonResponse
    {
        $skill = Skill::find($id);

        if (!$skill) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy kỹ năng',
            ], 404);
        }

        $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:skills,name,' . $id],
        ], [
            'name.required' => 'Tên kỹ năng là bắt buộc',
            'name.unique' => 'Kỹ năng này đã tồn tại trong hệ thống',
            'name.max' => 'Tên kỹ năng tối đa 100 ký tự',
        ]);

        $skill->update([
            'name' => trim($request->name),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật kỹ năng thành công',
            'data' => $skill,
        ], 200);
    }

    /**
     * [Admin] Xóa kỹ năng (FR-09.5)
     */
    public function destroy($id): JsonResponse
    {
        $skill = Skill::find($id);

        if (!$skill) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy kỹ năng',
            ], 404);
        }

        $skill->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa kỹ năng thành công',
        ], 200);
    }
}
