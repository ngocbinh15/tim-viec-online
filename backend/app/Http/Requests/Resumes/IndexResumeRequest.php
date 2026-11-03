<?php

namespace App\Http\Requests\Resumes;

class IndexResumeRequest extends ResumeRequest
{
    public function rules(): array
    {
        return ['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:12'];
    }
}
