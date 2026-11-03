<?php

namespace App\Services\Resumes;

final readonly class RenderInput
{
    public function __construct(public array $document, public ?string $photo = null) {}
}
