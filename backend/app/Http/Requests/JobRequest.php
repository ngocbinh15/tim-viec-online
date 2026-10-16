<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class JobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isEmployer();
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:10', 'max:200'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'job_level' => ['required', 'string', 'max:50'],
            'quantity' => ['required', 'integer', 'min:1'],
            'job_type' => ['required', 'string', 'in:full_time,part_time,remote,internship'],
            'city' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'deadline' => ['required', 'date', 'after:today'], // FR-04.3: Lớn hơn ngày hiện tại ít nhất 1 ngày
            'description' => ['required', 'string'],
            'requirements' => ['required', 'string'],
            'benefits' => ['nullable', 'string'],
            'is_negotiable' => ['nullable', 'boolean'],
            'salary_min' => ['nullable', 'integer', 'min:0'],
            'salary_max' => ['nullable', 'integer', 'min:0'],
            'skills' => ['required', 'array', 'min:1'],
            'skills.*' => ['integer', 'exists:skills,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Tiêu đề việc làm là bắt buộc',
            'title.min' => 'Tiêu đề việc làm phải có từ 10 đến 200 ký tự',
            'title.max' => 'Tiêu đề việc làm phải có từ 10 đến 200 ký tự',
            'category_id.required' => 'Vui lòng chọn ngành nghề',
            'category_id.exists' => 'Ngành nghề đã chọn không tồn tại',
            'job_level.required' => 'Vui lòng chọn cấp bậc công việc',
            'quantity.required' => 'Vui lòng nhập số lượng cần tuyển',
            'quantity.min' => 'Số lượng cần tuyển phải lớn hơn hoặc bằng 1',
            'job_type.required' => 'Vui lòng chọn hình thức làm việc',
            'job_type.in' => 'Hình thức làm việc không hợp lệ',
            'city.required' => 'Tỉnh/Thành phố làm việc là bắt buộc',
            'deadline.required' => 'Hạn nộp hồ sơ là bắt buộc',
            'deadline.after' => 'Hạn nộp hồ sơ phải sau ngày hôm nay',
            'description.required' => 'Mô tả công việc (JD) là bắt buộc',
            'requirements.required' => 'Yêu cầu chuyên môn là bắt buộc',
            'skills.required' => 'Vui lòng chọn ít nhất một kỹ năng yêu cầu',
            'skills.min' => 'Vui lòng chọn ít nhất một kỹ năng yêu cầu',
            'skills.*.exists' => 'Kỹ năng đã chọn không hợp lệ',
        ];
    }

    public function withValidator(Validator $validator)
    {
        $validator->after(function ($validator) {
            $isNegotiable = filter_var($this->input('is_negotiable'), FILTER_VALIDATE_BOOLEAN);
            $salaryMin = $this->filled('salary_min') ? (int) $this->input('salary_min') : null;
            $salaryMax = $this->filled('salary_max') ? (int) $this->input('salary_max') : null;

            if (!$isNegotiable) {
                // Nếu không phải lương thỏa thuận và nhập cả 2 mức lương, min không được lớn hơn max
                if ($salaryMin !== null && $salaryMax !== null && $salaryMin > $salaryMax) {
                    $validator->errors()->add('salary_min', 'Mức lương tối thiểu không được lớn hơn mức lương tối đa');
                }
            }
        });
    }

    protected function failedValidation(Validator $validator)
    {
        $errors = $validator->errors();
        $statusCode = 422;

        // Phụ lục B SRS: Các lỗi 400 Bad Request
        if ($errors->has('deadline') || $errors->has('salary_min')) {
            $statusCode = 400;
        }

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $errors->first(),
            'errors' => $errors,
        ], $statusCode));
    }
}
