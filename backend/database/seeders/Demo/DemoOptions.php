<?php

namespace Database\Seeders\Demo;

final class DemoOptions
{
    public const RUN = 'recruitment-demo-v1';

    private function __construct(
        public readonly string $name,
        public readonly int $candidates,
        public readonly int $employers,
        public readonly int $jobsPerEmployer,
        public readonly int $applicationsPerCandidate,
        public readonly int $savedPerCandidate,
        public readonly int $conversationsPerCandidate,
        public readonly int $messagesPerConversation,
        public readonly bool $aiFixtures,
        public readonly bool $runtimeFixtures,
    ) {}

    public static function preset(string $name, bool $ai = false, bool $runtime = false): self
    {
        $sizes = [
            'tiny' => [12, 6, 6, 5, 5, 2, 6],
            'medium' => [300, 40, 10, 10, 6, 3, 8],
            'large' => [1500, 120, 12, 15, 8, 4, 10],
            'huge' => [5000, 400, 15, 20, 10, 4, 12],
        ];
        if (! isset($sizes[$name])) {
            throw new \InvalidArgumentException('Preset hợp lệ: tiny, medium, large, huge.');
        }

        return new self($name, ...[...$sizes[$name], $ai, $runtime]);
    }

    public function jobs(): int
    {
        return $this->employers * $this->jobsPerEmployer;
    }

    public function applications(): int
    {
        return $this->candidates * $this->applicationsPerCandidate;
    }

    public function toArray(): array
    {
        return get_object_vars($this);
    }

    public function estimate(): array
    {
        return [
            'users' => $this->candidates + $this->employers + 3,
            'candidate_profiles' => $this->candidates, 'companies' => $this->employers,
            'jobs' => $this->jobs(), 'applications' => $this->applications(),
            'saved_jobs' => $this->candidates * $this->savedPerCandidate,
            'conversations' => $this->candidates * $this->conversationsPerCandidate,
            'messages' => $this->candidates * $this->conversationsPerCandidate * $this->messagesPerConversation,
            'ai_cv_analyses' => $this->aiFixtures ? (int) ceil($this->applications() / 3) : 0,
        ];
    }
}
