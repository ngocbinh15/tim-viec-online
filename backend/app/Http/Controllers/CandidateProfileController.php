<?php
namespace App\Http\Controllers;
use Illuminate\Support\Facades\DB;
use App\Http\Requests\UpdateCandidateProfileRequest;
use App\Http\Requests\UploadCvRequest;
use App\Models\CandidateProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;

class CandidateProfileController extends Controller
{
    //  Lấy thông tin chi tiết hồ sơ cá nhân
    public function show(Request $request)
    {
        $user = $request->user();

        $profile = CandidateProfile::with(['skills', 'user'])
            ->where('user_id', $user->id)
            ->first();
        if (!$profile) {
        return response()->json([
            'success' => false,
            'message' => 'Không tìm thấy thông tin hồ sơ ứng viên.'
        ], 404);
    }
        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin hồ sơ thành công',
            'data' => $profile
        ]);
    }

    // Cập nhật thông tin cá nhân và kỹ năng
    public function update(UpdateCandidateProfileRequest $request)
    {
        $user =$request->user();

        $profile = CandidateProfile::where('user_id',$user->id)->first();

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin hồ sơ ứng viên để cập nhật.'
            ], 404);
        }

        try {
            DB::transaction(function () use ($user, $profile,$request) {
                // 1. Cập nhật thông tin cá nhân cơ bản vào bảng `users`
                $user->update($request->only([
                    'name',
                    'phone',
                    'email',
                    'dob'
                ]));

                // 2. Cập nhật thông tin chi tiết vào bảng `candidate_profiles`
                $profile->update($request->only([
                    'title',
                    'experience_years',
                    'bio',
                    'address',
                    'city',
                    'social_links'
                ]));

                // 3. Đồng bộ danh sách kỹ năng qua bảng trung gian `candidate_skills`
                if ($request->has('skill_ids')) {
                    $profile->skills()->sync($request->skill_ids);
                }
            });

            // Tải lại dữ liệu mới nhất (gồm cả thông tin user đã đổi tên/sđt và các skills mới)
            $profile->load(['skills', 'user']);

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật thông tin cá nhân và hồ sơ thành công!',
                'data' => $profile
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cập nhật thất bại, vui lòng thử lại sau.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function uploadCv(UploadCvRequest $request)
    {
        $user = $request->user();
        $profile = CandidateProfile::where('user_id', $user->id)->firstOrFail();
        if ($request->hasFile('cv_file')) {
            $file = $request->file('cv_file');
            // Xóa file CV cũ nếu có
            if ($profile->cv_file_path && Storage::disk('public')->exists($profile->cv_file_path)) {
                Storage::disk('public')->delete($profile->cv_file_path);
            }
            // Lưu file vào storage/app/public/resumes
            $path = $file->store('resumes', 'public');
            // Cập nhật cv_file_path trong DB
            $profile->cv_file_path = $path;
            $profile->save();
            $cvUrl = asset('storage/' . $path);
            return response()->json([
                'success' => true,
                'message' => 'Tải lên CV thành công!',
                'data' => [
                    'cv_file_path' => $path,
                    'cv_url' => $cvUrl
                ]
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Không tìm thấy file tải lên.'
        ], 400);
    }
    public function getCv(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'candidate') {
            return response()->json(['success' => false, 'message' => 'Quyền hạn không hợp lệ.'], 403);
        }

        $profile = CandidateProfile::where('user_id', $user->id)->first();
        if (!$profile || !$profile->cv_path) {
            return response()->json(['success' => false, 'message' => 'Chưa có file CV nào được tải lên.'], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy đường dẫn CV thành công.',
            'data' => [
                'cv_url' => asset('storage/' . $profile->cv_path),
                'cv_path' => $profile->cv_path
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    public function deleteCv(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'candidate') {
            return response()->json(['success' => false, 'message' => 'Quyền hạn không hợp lệ.'], 403);
        }

        $profile = CandidateProfile::where('user_id', $user->id)->first();
        if ($profile && $profile->cv_file_path) {
            Storage::disk('public')->delete($profile->cv_file_path);
            $profile->cv_file_path = null;
            $profile->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Xóa CV thành công.'
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'candidate') {
            return response()->json(['success' => false, 'message' => 'Quyền hạn không hợp lệ.'], 403);
        }

        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048', // Tối đa 2MB
        ]);

        $profile = CandidateProfile::firstOrCreate(['user_id' => $user->id]);

        // Xóa ảnh cũ nếu có
        if ($profile->avatar && Storage::disk('public')->exists($profile->avatar)) {
            Storage::disk('public')->delete($profile->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $profile->avatar = $path;
        $profile->save();

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật ảnh đại diện thành công.',
            'data' => [
                'avatar_url' => asset('storage/' . $path)
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    public function deleteAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'candidate') {
            return response()->json(['success' => false, 'message' => 'Quyền hạn không hợp lệ.'], 403);
        }

        $profile = CandidateProfile::where('user_id', $user->id)->first();
        if ($profile && $profile->avatar) {
            Storage::disk('public')->delete($profile->avatar);
            $profile->avatar = null;
            $profile->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Xóa ảnh đại diện thành công.'
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}
