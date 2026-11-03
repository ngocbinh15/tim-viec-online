<?php

namespace App\Http\Requests\Resumes;

class DuplicateResumeRequest extends ResumeRequest
{
    public function rules(): array
    {
        return ['base_revision' => 'required|integer|min:1', 'name' => 'required|string|max:120'];
    }

    protected function prepareForValidation(): void
    {
        $this->rejectUnknown(['base_revision', 'name']);
    }
}
