<?php

namespace App\Http\Requests\Resumes;

class UploadResumeAssetRequest extends ResumeRequest
{
    public function rules(): array
    {
        return ['image' => 'required|file|image|mimes:jpeg,jpg,png,webp|max:2048|dimensions:max_width=4096,max_height=4096'];
    }

    protected function prepareForValidation(): void
    {
        $this->rejectUnknown(['image']);
    }
}
