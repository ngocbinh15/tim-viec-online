<?php

namespace App\Http\Requests\Resumes;

class CreateResumeExportRequest extends ResumeRequest
{
    public function rules(): array
    {
        return ['revision' => 'required|integer|min:1'];
    }

    protected function prepareForValidation(): void
    {
        $this->rejectUnknown(['revision']);
    }
}
