<?php

namespace App\Services;

use App\Models\Application;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ApplicationCvStorage
{
    /** Each application owns a snapshot, independent of the candidate's profile. */
    public function snapshot(string $source): string
    {
        $disk = Storage::disk('private')->exists($source) ? 'private' : 'public';
        if (! Storage::disk($disk)->exists($source)) {
            throw new \RuntimeException('Profile CV is missing.');
        }
        $target = 'application_cvs/'.(AiCvEligibility::isDemo($source) ? 'demo-seed/' : '').Str::uuid().'.pdf';
        $stream = Storage::disk($disk)->readStream($source);
        if (! is_resource($stream)) {
            throw new \RuntimeException('Profile CV could not be read.');
        }
        try {
            if (! Storage::disk('private')->put($target, $stream)) {
                throw new \RuntimeException('Application CV could not be stored.');
            }
        } catch (\Throwable $exception) {
            Storage::disk('private')->delete($target);
            throw $exception;
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        return $target;
    }

    /** Legacy applications may still reference a former profile file. */
    public function releaseProfileCv(?string $path): void
    {
        if (! $path || Application::where('cv_path', $path)->exists()) {
            return;
        }
        Storage::disk('private')->delete($path);
        Storage::disk('public')->delete($path);
    }
}
