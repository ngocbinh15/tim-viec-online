<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

/** Excludes generated seed files, independently of the account or hiring company. */
final class AiCvEligibility
{
    public const DEMO_MARKER = 'DEMO CV - SYNTHETIC DATA / HO SO MINH HOA';

    public static function isDemo(?string $path): bool
    {
        if (! $path) {
            return false;
        }
        $normalized = ltrim(str_replace('\\', '/', $path), '/');
        if (str_starts_with($normalized, 'demo-seed/') || str_starts_with($normalized, 'application_cvs/demo-seed/')) {
            return true;
        }
        // Historical profile snapshots lost the original directory. Seed PDFs contain
        // an exact, uncompressed marker near the beginning; read only a bounded prefix.
        foreach (['private', 'public'] as $disk) {
            $stream = null;
            try {
                if (! Storage::disk($disk)->exists($path)) {
                    continue;
                }
                $stream = Storage::disk($disk)->readStream($path);
                return is_resource($stream) && str_contains((string) fread($stream, 8192), self::DEMO_MARKER);
            } catch (\Throwable) {
                // Missing/unreadable real files use the normal assessment error handling.
                return false;
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }
        }
        return false;
    }
}
