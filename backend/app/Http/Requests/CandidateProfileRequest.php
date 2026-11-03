<?php

namespace App\Http\Requests;

use Carbon\Carbon;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class CandidateProfileRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->filled('email')) {
            $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
        }
    }

    public function authorize(): bool
    {
        return $this->user() && $this->user()->isCandidate();
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'min:2', 'max:100'],
            'phone' => ['nullable', 'regex:/^(03|05|07|08|09)[0-9]{8}$/'],
            'email' => ['nullable', 'string', 'email', 'max:100', Rule::unique('users', 'email')->ignore($this->user()?->id)],
            'dob' => ['sometimes', 'required', 'date', 'before_or_equal:' . now()->subYears(15)->toDateString()],
            'title' => ['nullable', 'string', 'max:100'],
            'experience_years' => [
                'nullable',
                'integer',
                'min:0',
                'max:50',
                function ($attribute, $value, $fail) {
                    $dob = $this->input('dob', $this->user()?->dob);
                    if ($dob && $value) {
                        $age = Carbon::parse($dob)->age;
                        if ($value > $age) {
                            $fail("Số năm kinh nghiệm ({$value} năm) không hợp lý với độ tuổi hiện tại (Ứng viên mới {$age} tuổi).");
                        }
                    }
                },
            ],
            'bio' => ['nullable', 'string', 'max:2000'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'social_links' => ['nullable', 'array'],
            'social_links.*' => ['string', 'url', 'max:500'],
            'skills' => ['nullable', 'array', 'max:10'],
            'skills.*' => ['integer', 'distinct', 'exists:skills,id'],
            'skill_ids' => ['nullable', 'array', 'max:10'],
            'skill_ids.*' => ['integer', 'distinct', 'exists:skills,id'],
            'cv_file' => ['nullable', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:5120'], // 5MB = 5120 KB
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'skills.max' => 'Chỉ được chọn tối đa 10 kỹ năng chuyên môn',
            'skills.*.exists' => 'Kỹ năng đã chọn không hợp lệ',
            'cv_file.mimes' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB',
            'cv_file.mimetypes' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB',
            'cv_file.max' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB',
            'avatar.image' => 'Ảnh đại diện phải là tệp hình ảnh',
            'avatar.mimes' => 'Ảnh đại diện phải có định dạng jpeg, png, jpg hoặc webp',
            'avatar.max' => 'Dung lượng ảnh đại diện tối đa 2MB',
            'experience_years.integer' => 'Số năm kinh nghiệm phải là số nguyên',
            'experience_years.min' => 'Số năm kinh nghiệm không thể âm',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        $errors = $validator->errors();
        $statusCode = 422;

        // Theo Phụ lục B SRS: Lỗi file CV không đúng định dạng hoặc quá dung lượng trả về HTTP 400
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
