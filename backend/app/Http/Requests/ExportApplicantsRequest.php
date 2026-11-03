<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ExportApplicantsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isEmployer() ?? false;
    }

    public function rules(): array
    {
        return [
            'job_ids' => ['required', 'array', 'list', 'min:1', 'max:50'],
            'job_ids.*' => ['required', 'integer', 'min:1', 'distinct'],
            'mode' => ['required', 'in:workbook,separate'],
        ];
    }

    public function messages(): array
    {
        return [
            'job_ids.required' => 'Chọn ít nhất một tin tuyển dụng.',
            'job_ids.max' => 'Mỗi lần xuất tối đa 50 tin tuyển dụng.',
            'job_ids.*.distinct' => 'Tin tuyển dụng bị trùng trong danh sách.',
            'mode.in' => 'Chọn xuất một file Excel hoặc các file riêng.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json(['success' => false, 'message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422));
    }
}
