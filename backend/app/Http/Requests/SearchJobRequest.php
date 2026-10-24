<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class SearchJobRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        foreach (['category_id', 'skill_ids'] as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $this->merge([$field => array_values(array_filter(explode(',', $value), fn ($id) => $id !== ''))]);
            } elseif ($value !== null && !is_array($value)) {
                $this->merge([$field => [$value]]);
            }
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'keyword' => 'nullable|string|max:150',
            'category_id' => 'nullable|array',
            'category_id.*' => 'integer|distinct|exists:categories,id',
            'city' => 'nullable|string|max:100',
            'job_type' => 'nullable|in:full_time,part_time,remote,internship',
            'salary_range' => 'nullable|in:under_10m,10m_20m,above_20m,negotiable,under_10,10_20,above_20',
            'skill_ids' => 'nullable|array',
            'skill_ids.*' => 'integer|distinct|exists:skills,id',
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $validator->errors()->first(),
            'errors' => $validator->errors(),
        ], 422));
    }
}
