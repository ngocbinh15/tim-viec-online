<?php

namespace App\Services\Resumes;

final readonly class RenderedPdf
{
    public function __construct(public string $tempPath, public int $size, public int $pageCount, public string $sha256) {}
}
