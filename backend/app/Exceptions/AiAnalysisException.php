<?php

namespace App\Exceptions;

/** Never retain provider response bodies or previous exceptions in queue failures. */
class AiAnalysisException extends \RuntimeException
{
    public const CONFIGURATION = 'CV analysis provider is not configured.';
    public const DEMO_CV = 'Seeded demo CV is excluded from AI analysis.';

    public const UNREADABLE_CV = 'Unreadable CV text.';

    public const MISSING_CV = 'CV file is missing.';

    public const OVERSIZED_CV = 'CV PDF exceeds the 5 MB limit.';

    public const INVALID_ASSESSMENT = 'Invalid CV assessment.';

    public const PROVIDER_UNAVAILABLE = 'CV analysis provider is temporarily unavailable.';

    public const PROVIDER_REJECTED = 'CV analysis provider rejected the request.';

    public function __construct(string $safeMessage, public readonly bool $retryable = false)
    {
        parent::__construct($safeMessage);
    }
}
