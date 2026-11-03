<?php

namespace App\Http\Requests\Resumes;

use App\Services\Resumes\ResumeSchema;
use Illuminate\Validation\ValidationException;

class UpdateResumeRequest extends ResumeRequest
{
    public function rules(): array
    {
        return ['base_revision' => 'required|integer|min:1', ...ResumeSchema::rules()];
    }

    protected function prepareForValidation(): void
    {
        if (strlen($this->getContent()) > 131072) {
            throw ValidationException::withMessages(['content' => 'CV không được vượt quá 128 KiB.']);
        } $this->rejectUnknown(['base_revision', 'name', 'template_key', 'template_version', 'schema_version', 'content', 'settings']);
        $this->replace(ResumeSchema::normalize($this->all()));
    }

    protected function passedValidation(): void
    {
        ResumeSchema::check($this->validated());
    }
}
