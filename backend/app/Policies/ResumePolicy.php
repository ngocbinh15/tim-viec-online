<?php

namespace App\Policies;

use App\Models\Resume;
use App\Models\User;

class ResumePolicy
{
    public function view(User $user, Resume $resume): bool
    {
        return $user->isCandidate() && $user->candidateProfile?->id === $resume->candidate_id;
    }

    public function update(User $user, Resume $resume): bool
    {
        return $this->view($user, $resume);
    }

    public function delete(User $user, Resume $resume): bool
    {
        return $this->view($user, $resume);
    }
}
