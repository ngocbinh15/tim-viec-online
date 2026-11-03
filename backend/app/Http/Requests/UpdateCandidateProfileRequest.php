<?php

namespace App\Http\Requests;

use Carbon\Carbon;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class UpdateCandidateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isCandidate();
    }

    public function rules(): array
    {
        $user = $this->user();

        return [
            'name' => 'sometimes|required|string|min:2|max:100',
            'phone' => [
                'nullable',
                'regex:/^(03|05|07|08|09)[0-9]{8}$/',
            ],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:100',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'dob' => [
                'sometimes',
                'required',
                'date',
                function ($attribute, $value, $fail) {
                    if ($value) {
                        $age = Carbon::parse($value)->age;
                        if ($age < 15) {
                            $fail('Ứng viên bắt buộc phải từ 15 tuổi trở lên theo quy định.');
                        }
                    }
                },
            ],
            'title' => 'nullable|string|max:100',
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
            'bio' => 'nullable|string|max:2000',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'social_links' => 'nullable|array',
            'skills' => 'nullable|array|max:10',
            'skills.*' => 'exists:skills,id',
            'skill_ids' => 'nullable|array|max:10',
            'skill_ids.*' => 'exists:skills,id',
            'cv_file' => ['nullable', 'file', 'mimes:pdf', 'max:5120'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Họ tên không được để trống.',
            'name.min' => 'Họ tên phải có ít nhất 2 ký tự.',
            'email.required' => 'Email không được để trống.',
            'email.email' => 'Địa chỉ email không đúng định dạng chuẩn.',
            'email.unique' => 'Email này đã được sử dụng bởi tài khoản khác.',
            'phone.regex' => 'Số điện thoại không hợp lệ (phải gồm 10 số và đúng đầu số Việt Nam).',
            'skills.max' => 'Bạn chỉ được chọn tối đa 10 kỹ năng chuyên môn.',
            'skill_ids.max' => 'Bạn chỉ được chọn tối đa 10 kỹ năng chuyên môn.',
            'skills.*.exists' => 'Kỹ năng được chọn không tồn tại trong hệ thống.',
            'skill_ids.*.exists' => 'Kỹ năng được chọn không tồn tại trong hệ thống.',
            'cv_file.mimes' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB',
            'cv_file.max' => 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB',
            'dob.date' => 'Ngày sinh không đúng định dạng ngày tháng.',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        $errors = $validator->errors();
        $statusCode = $errors->has('cv_file') ? 400 : 422;

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $errors->first(),
            'errors' => $errors,
        ], $statusCode));
    }
}
