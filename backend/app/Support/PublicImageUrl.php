<?php

namespace App\Support;

final class PublicImageUrl
{
    public static function from(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return in_array(strtolower(parse_url($path, PHP_URL_SCHEME) ?? ''), ['http', 'https'], true) ? $path : null;
        }
        $path = ltrim($path, '/');
        if (str_contains($path, '..') || str_contains($path, ':') || str_contains($path, '\\')) {
            return null;
        }

        return '/storage/'.$path;
    }
}
