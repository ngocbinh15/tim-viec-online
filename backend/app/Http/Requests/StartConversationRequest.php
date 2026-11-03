<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isCandidate() || $this->user()?->isEmployer();
    }

    public function rules(): array
    {
        return [
            'job_id' => ['required', 'integer', 'exists:jobs,id'],
            'partner_id' => [Rule::requiredIf(fn () => $this->user()?->isEmployer()), 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
