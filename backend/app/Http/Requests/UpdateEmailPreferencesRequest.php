<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateEmailPreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $boolean = function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_bool($value)) {
                $fail('Lựa chọn nhận email phải là true hoặc false.');
            }
        };
        return ['applications' => ['required', $boolean], 'messages' => ['required', $boolean]];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            foreach (array_diff(array_keys($this->all()), ['applications', 'messages']) as $key) {
                $validator->errors()->add($key, 'Trường dữ liệu không được hỗ trợ.');
            }
        });
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'success' => false, 'message' => 'Lựa chọn nhận email không hợp lệ.', 'errors' => $validator->errors(),
        ], 422));
    }
}
