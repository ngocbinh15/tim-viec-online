<?php

namespace App\Services\Resumes;

use App\Models\CandidateProfile;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ResumeService
{
    public static function enabled(): void
    {
        if (! config('resumes.enabled')) {
            throw new HttpResponseException(response()->json(['success' => false, 'message' => 'Chức năng tạo CV hiện chưa sẵn sàng.'], 503));
        }
    }

    public static function conflict(): never
    {
        throw new HttpResponseException(response()->json(['success' => false, 'message' => 'CV đã được cập nhật ở phiên khác. Giữ nội dung đang sửa và tải bản mới hoặc tạo bản sao.'], 409));
    }

    public function owner(User $user): CandidateProfile
    {
        return CandidateProfile::firstOrCreate(['user_id' => $user->id]);
    }

    public function owned(User $user, int $id): Resume
    {
        $resume = Resume::where('candidate_id', $user->candidateProfile?->id)->findOrFail($id);
        Gate::authorize('view', $resume);

        return $resume;
    }

    public function create(CandidateProfile $owner, array $data): Resume
    {
        self::enabled();

        return DB::transaction(function () use ($owner, $data) {
            CandidateProfile::whereKey($owner->id)->lockForUpdate()->firstOrFail();
            if ($owner->resumes()->count() >= 20) {
                throw ValidationException::withMessages(['name' => 'Bạn đã có 20 CV. Xóa bản không cần dùng trước khi tạo mới.']);
            }
            $document = ($data['use_sample_data'] ?? false) ? ResumeStarter::document() : ResumeSchema::empty();
            $document['name'] = $data['name'];
            $document['template_key'] = $data['template_key'];
            if ($data['prefill_from_profile'] ?? false) {
                $user = $owner->user;
                $document['content']['basics'] = [...$document['content']['basics'], ...array_filter(['full_name' => $user->name, 'email' => $user->email, 'phone' => (string) $user->phone, 'headline' => (string) $owner->title, 'city' => (string) $owner->city, 'summary' => (string) $owner->bio], fn ($value) => trim((string) $value) !== '')];
                if ($owner->skills->isNotEmpty()) {
                    $document['content']['skills'] = [];
                }
                foreach ($owner->skills as $skill) {
                    $document['content']['skills'][] = ['id' => (string) Str::uuid(), 'name' => $skill->name, 'detail' => ''];
                }
            }
            ResumeSchema::check($document);
            $resume = Resume::create(['candidate_id' => $owner->id, ...$document]);
            if (($data['prefill_from_profile'] ?? false) && $owner->avatar && Storage::disk('public')->exists($owner->avatar) && Storage::disk('public')->size($owner->avatar) <= 2097152) {
                $asset = app(ResumeAssetStorage::class)->store($resume, Storage::disk('public')->get($owner->avatar));
                $content = $resume->content;
                $content['basics']['photo_asset_id'] = $asset->id;
                $resume->content = $content;
                $resume->save();
            }

            return $resume->refresh();
        });
    }

    public function update(Resume $resume, int $baseRevision, array $data): Resume
    {
        self::enabled();
        $document = array_intersect_key($data, ResumeSchema::empty());

        return DB::transaction(function () use ($resume, $baseRevision, $document) {
            $current = Resume::whereKey($resume->id)->lockForUpdate()->firstOrFail();
            if ($current->revision !== $baseRevision) {
                self::conflict();
            }
            $assetId = $document['content']['basics']['photo_asset_id'];
            if ($assetId && ! $current->assets()->whereKey($assetId)->exists()) {
                throw ValidationException::withMessages(['content.basics.photo_asset_id' => 'Ảnh không thuộc CV này.']);
            }
            $current->fill($document);
            $current->revision++;
            $current->save();

            return $current;
        });
    }

    public function duplicate(Resume $resume, int $baseRevision, string $name): Resume
    {
        self::enabled();

        return DB::transaction(function () use ($resume, $baseRevision, $name) {
            // Match create/export lock ordering: candidate first, then document.
            CandidateProfile::whereKey($resume->candidate_id)->lockForUpdate()->firstOrFail();
            $current = Resume::whereKey($resume->id)->lockForUpdate()->firstOrFail();
            if ($current->revision !== $baseRevision) {
                self::conflict();
            }
            $copy = $this->create($current->candidateProfile, ['name' => $name, 'template_key' => $current->template_key]);
            $data = $current->document();
            $data['name'] = $name;
            $assetId = $data['content']['basics']['photo_asset_id'];
            if ($assetId) {
                $asset = $current->assets()->findOrFail($assetId);
                $target = 'resume_assets/'.$current->candidate_id.'/'.$copy->id.'/'.Str::uuid().'.png';
                Storage::disk('private')->copy($asset->path, $target);
                $newAsset = $copy->assets()->create(['path' => $target, 'mime_type' => $asset->mime_type, 'size' => $asset->size, 'sha256' => $asset->sha256]);
                $data['content']['basics']['photo_asset_id'] = $newAsset->id;
            }
            ResumeSchema::check($data);
            $copy->fill($data);
            $copy->is_demo = $current->is_demo;
            $copy->save();

            return $copy->refresh();
        });
    }

    public function delete(Resume $resume): void
    {
        DB::transaction(function () use ($resume) {
            $current = Resume::whereKey($resume->id)->lockForUpdate()->firstOrFail();
            $paths = [...$current->assets()->pluck('path')->all(), ...$current->exports()->whereNotNull('path')->pluck('path')->all()];
            $current->delete();
            DB::afterCommit(fn () => Storage::disk('private')->delete($paths));
        });
    }
}
