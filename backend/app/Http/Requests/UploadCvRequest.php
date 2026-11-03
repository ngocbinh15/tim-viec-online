<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UploadCvRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cv_file' => [
                'required',
                'file',
                'mimes:pdf',
                'mimetypes:application/pdf',
                'max:5120', // Tối đa 5MB (5120 KB)
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'cv_file.required' => 'Vui lòng chọn file CV cần tải lên.',
            'cv_file.mimes' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB.',
            'cv_file.mimetypes' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB.',
            'cv_file.max' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB.',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $validator->errors()->first(),
            'errors' => $validator->errors(),
        ], $validator->errors()->has('cv_file') ? 400 : 422));
    }
}
