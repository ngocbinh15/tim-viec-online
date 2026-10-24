<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ApplyJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isCandidate();
    }

    protected function failedAuthorization()
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Chỉ tài khoản Ứng viên mới có quyền nộp đơn ứng tuyển',
        ], 403));
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('cv_source')) {
            $source = strtolower(trim($this->input('cv_source')));
            if ($source === 'default') {
                $this->merge(['cv_source' => 'profile']);
            }
        }
    }

    public function rules(): array
    {
        return [
            // FR-06.2: Chọn 1 trong 2: CV sẵn có (profile) hoặc Tải file mới (new)
            'cv_source' => ['nullable', 'string', 'in:profile,default,new'],
            'cv_file' => ['nullable', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:5120'], // Định dạng PDF tối đa 5MB
            'cover_letter' => ['nullable', 'string', 'max:3000'],
        ];
    }

    public function messages(): array
    {
        return [
            'cv_file.mimes' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB',
            'cv_file.mimetypes' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB',
            'cv_file.max' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB',
            'cv_source.in' => 'Hình thức nộp CV không hợp lệ (chọn profile hoặc new)',
            'cover_letter.max' => 'Thư giới thiệu không được vượt quá 3000 ký tự',
        ];
    }

    public function withValidator(Validator $validator)
    {
        $validator->after(function ($validator) {
            $cvSource = $this->input('cv_source');
            if ($cvSource === 'new' && !$this->hasFile('cv_file')) {
                $validator->errors()->add('cv_file', 'Vui lòng tải lên file CV PDF cho vị trí này');
            }
        });
    }

    protected function failedValidation(Validator $validator)
    {
        $errors = $validator->errors();
        $statusCode = 422;

        if ($errors->has('cv_file')) {
            $statusCode = 400;
        }

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $errors->first(),
            'errors' => $errors,
        ], $statusCode));
    }
}
