<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CandidateProfileRequest;
use App\Http\Requests\UploadCvRequest;
use App\Models\CandidateProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CandidateProfileController extends Controller
{
    /**
     * Xem hồ sơ cá nhân của Ứng viên (FR-03)
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = CandidateProfile::firstOrCreate(['user_id' => $user->id]);
        $profile->load('skills');

        return response()->json([
            'success' => true,
            'message' => 'Lấy hồ sơ ứng viên thành công',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'dob' => $user->dob,
                ],
                'profile' => [
                    'id' => $profile->id,
                    'title' => $profile->title,
                    'experience_years' => $profile->experience_years,
                    'bio' => $profile->bio,
                    'avatar' => $profile->avatar,
                    'avatar_url' => $profile->avatar ? asset('storage/' . $profile->avatar) : null,
                    'address' => $profile->address,
                    'city' => $profile->city,
                    'cv_url' => $profile->cv_file_path ? url('/api/candidate/cv/file') : null,
                    'social_links' => $profile->social_links,
                    'skills' => $profile->skills,
                ],
            ],
        ], 200);
    }

    /**
     * Cập nhật hồ sơ cá nhân và tải lên CV PDF (FR-03.1 - FR-03.5)
     */
    public function update(CandidateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $profile = CandidateProfile::firstOrCreate(['user_id' => $user->id]);

        // Cập nhật thông tin người dùng nếu có gửi kèm
        $userData = [];
        if ($request->filled('name')) {
            $userData['name'] = $request->name;
        }
        if ($request->has('phone')) {
            $userData['phone'] = $request->phone;
        }
        if ($request->filled('email')) {
            $userData['email'] = mb_strtolower(trim($request->email));
        }
        if ($request->has('dob')) {
            $userData['dob'] = $request->dob;
        }
        if (!empty($userData)) {
            $user->update($userData);
        }

        // Xử lý upload file CV PDF (FR-03.3 - FR-03.5)
        if ($request->hasFile('cv_file')) {
            if ($profile->cv_file_path) {
                Storage::disk('private')->delete($profile->cv_file_path);
                Storage::disk('public')->delete($profile->cv_file_path);
            }
            $profile->cv_file_path = $request->file('cv_file')->store('cvs', 'private');
        }

        // Xử lý upload ảnh đại diện (Avatar)
        if ($request->hasFile('avatar')) {
            if ($profile->avatar && Storage::disk('public')->exists($profile->avatar)) {
                Storage::disk('public')->delete($profile->avatar);
            }
            $profile->avatar = $request->file('avatar')->store('avatars', 'public');
        }

        // Cập nhật các trường văn bản
        $profile->fill($request->only([
            'title',
            'experience_years',
            'bio',
            'address',
            'city',
            'social_links',
        ]));
        $profile->save();

        // Đồng bộ danh sách kỹ năng (tối đa 10 kỹ năng theo FR-03.2)
        if ($request->has('skills')) {
            $profile->skills()->sync($request->skills ?? []);
        } elseif ($request->has('skill_ids')) {
            $profile->skills()->sync($request->skill_ids ?? []);
        }

        $profile->load('skills');

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật hồ sơ ứng viên thành công',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'dob' => $user->dob,
                ],
                'profile' => [
                    'id' => $profile->id,
                    'title' => $profile->title,
                    'experience_years' => $profile->experience_years,
                    'bio' => $profile->bio,
                    'avatar' => $profile->avatar,
                    'avatar_url' => $profile->avatar ? asset('storage/' . $profile->avatar) : null,
                    'address' => $profile->address,
                    'city' => $profile->city,
                    'cv_url' => $profile->cv_file_path ? url('/api/candidate/cv/file') : null,
                    'social_links' => $profile->social_links,
                    'skills' => $profile->skills,
                ],
            ],
        ], 200);
    }

    /**
     * Tải lên file CV riêng biệt (FR-03.3)
     */
    public function uploadCv(UploadCvRequest $request): JsonResponse
    {
        $user = $request->user();
        $profile = CandidateProfile::firstOrCreate(['user_id' => $user->id]);

        if ($profile->cv_file_path) {
            Storage::disk('private')->delete($profile->cv_file_path);
            Storage::disk('public')->delete($profile->cv_file_path);
        }

        $path = $request->file('cv_file')->store('cvs', 'private');
        $profile->cv_file_path = $path;
        $profile->save();

        return response()->json([
            'success' => true,
            'message' => 'Tải lên CV thành công.',
            'data' => [
                'cv_url' => url('/api/candidate/cv/file'),
            ],
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Lấy thông tin & link tải CV (FR-03.3)
     */
    public function getCv(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = CandidateProfile::where('user_id', $user->id)->first();
        if (!$profile || !$profile->cv_file_path) {
            return response()->json([
                'success' => false,
                'message' => 'Chưa có file CV nào được tải lên.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy đường dẫn CV thành công.',
            'data' => [
                'cv_url' => url('/api/candidate/cv/file'),
            ],
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Xóa CV đã tải lên (FR-03.3)
     */
    public function deleteCv(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = CandidateProfile::where('user_id', $user->id)->first();
        if ($profile && $profile->cv_file_path) {
            Storage::disk('private')->delete($profile->cv_file_path);
            Storage::disk('public')->delete($profile->cv_file_path);
            $profile->cv_file_path = null;
            $profile->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Xóa CV thành công.',
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /** Stream the current candidate's CV after Sanctum authorization. */
    public function downloadCv(Request $request)
    {
        $path = $request->user()->candidateProfile?->cv_file_path;
        if (!$path) {
            return response()->json(['success' => false, 'message' => 'Chưa có file CV nào được tải lên.'], 404);
        }

        $disk = Storage::disk('private')->exists($path) ? 'private' : 'public';
        if (!Storage::disk($disk)->exists($path)) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy file CV'], 404);
        }

        return response()->file(Storage::disk($disk)->path($path), [
            'Content-Type' => 'application/pdf',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * Tải lên ảnh đại diện riêng (FR-03.1)
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $profile = CandidateProfile::firstOrCreate(['user_id' => $user->id]);

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
                'avatar_url' => asset('storage/' . $path),
            ],
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Xóa ảnh đại diện riêng (FR-03.1)
     */
    public function deleteAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = CandidateProfile::where('user_id', $user->id)->first();
        if ($profile && $profile->avatar) {
            if (Storage::disk('public')->exists($profile->avatar)) {
                Storage::disk('public')->delete($profile->avatar);
            }
            $profile->avatar = null;
            $profile->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Xóa ảnh đại diện thành công.',
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}
