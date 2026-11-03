<?php

namespace App\Services\Resumes;

use App\Models\Resume;
use App\Models\ResumeAsset;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ResumeAssetStorage
{
    public function store(Resume $resume, string $bytes): ResumeAsset
    {
        if (! function_exists('imagecreatefromstring')) {
            throw new HttpResponseException(response()->json(['success' => false, 'message' => 'Dịch vụ xử lý ảnh chưa sẵn sàng. Vui lòng liên hệ quản trị viên.'], 503));
        }
        $size = @getimagesizefromstring($bytes);
        if (strlen($bytes) > 2097152 || ! $size || ! in_array($size['mime'], ['image/jpeg', 'image/png', 'image/webp']) || $size[0] > 4096 || $size[1] > 4096) {
            throw ValidationException::withMessages(['image' => 'Ảnh không hợp lệ hoặc vượt giới hạn kích thước.']);
        }
        if ($resume->assets()->count() >= 100) {
            throw ValidationException::withMessages(['image' => 'CV đã có quá nhiều lần tải ảnh. Vui lòng tạo bản sao hoặc thử lại sau khi dọn dữ liệu.']);
        }
        $source = @imagecreatefromstring($bytes);
        if (! $source) {
            throw ValidationException::withMessages(['image' => 'Không thể đọc ảnh đã chọn.']);
        }
        $ratio = min(1, 2048 / max($size[0], $size[1]));
        $image = imagescale($source, max(1, (int) ($size[0] * $ratio)), max(1, (int) ($size[1] * $ratio)));
        imagedestroy($source);
        ob_start();
        imagepng($image, null, 9);
        $normalized = ob_get_clean();
        imagedestroy($image);
        if (! $normalized || strlen($normalized) > 2097152) {
            throw ValidationException::withMessages(['image' => 'Ảnh sau xử lý vượt 2 MB. Vui lòng chọn ảnh nhỏ hơn.']);
        }
        $path = 'resume_assets/'.$resume->candidate_id.'/'.$resume->id.'/'.Str::uuid().'.png';
        Storage::disk('private')->put($path, $normalized);
        try {
            return $resume->assets()->create(['path' => $path, 'mime_type' => 'image/png', 'size' => strlen($normalized), 'sha256' => hash('sha256', $normalized)]);
        } catch (\Throwable $e) {
            Storage::disk('private')->delete($path);
            throw $e;
        }
    }
}
