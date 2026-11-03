<?php

namespace App\Http\Requests\Resumes;

use App\Services\Resumes\ResumeSchema;

class StoreResumeRequest extends ResumeRequest
{
    public function rules(): array
    {
        return ['name' => 'required|string|max:120', 'template_key' => 'required|in:'.implode(',', ResumeSchema::TEMPLATES), 'prefill_from_profile' => 'sometimes|boolean', 'use_sample_data' => 'sometimes|boolean'];
    }

    protected function prepareForValidation(): void
    {
        $this->rejectUnknown(['name', 'template_key', 'prefill_from_profile', 'use_sample_data']);
    }
}
