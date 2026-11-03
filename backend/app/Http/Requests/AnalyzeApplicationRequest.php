<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AnalyzeApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['employer', 'admin'], true);
    }

    public function rules(): array
    {
        return [
            'cv_path' => ['prohibited'], 'model' => ['prohibited'],
            'match_score' => ['prohibited'], 'job_id' => ['prohibited'],
        ];
    }
}
