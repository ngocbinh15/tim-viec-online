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

    protected function prepareForValidation(): void
    {
        // FR-04.4: Chuẩn hóa 3 trường hợp nhập lương
        $salaryType = $this->input('salary_type');

        if ($salaryType === 'negotiable') {
            $this->merge([
                'is_negotiable' => true,
                'salary_min' => null,
                'salary_max' => null,
            ]);
        } elseif ($salaryType === 'from' || $salaryType === 'starting') {
            $this->merge([
                'is_negotiable' => false,
                'salary_max' => null,
            ]);
        } elseif ($salaryType === 'specific' || $salaryType === 'range') {
            $this->merge([
                'is_negotiable' => false,
            ]);
        } elseif ($this->has('is_negotiable')) {
            $isNegotiable = filter_var($this->input('is_negotiable'), FILTER_VALIDATE_BOOLEAN);
            if ($isNegotiable) {
                $this->merge([
                    'is_negotiable' => true,
                    'salary_min' => null,
                    'salary_max' => null,
                ]);
            }
        }

        // Tự động kế thừa địa chỉ chi tiết từ hồ sơ công ty nếu để trống
        if (!$this->filled('address') && $this->user()?->company?->address) {
            $this->merge([
                'address' => $this->user()->company->address,
            ]);
        }
    }

    public function rules(): array
    {
        return [
            // FR-04.2: Các mục bắt buộc
            'title' => ['required', 'string', 'min:10', 'max:200'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'job_level' => ['required', 'string', 'max:50'],
            'quantity' => ['required', 'integer', 'min:1'],
            'job_type' => ['required', 'string', 'in:full_time,part_time,remote,internship'],
            'city' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'deadline' => ['required', 'date', 'after:today'], // FR-04.3: Hạn nộp phải sau ngày hôm nay
            'description' => ['required', 'string'],
            'requirements' => ['required', 'string'],
            'benefits' => ['nullable', 'string'],
            'is_negotiable' => ['nullable', 'boolean'],
            'salary_type' => ['nullable', 'string', 'in:specific,range,from,starting,negotiable'],
            'salary_min' => ['nullable', 'integer', 'min:1'],
            'salary_max' => ['nullable', 'integer', 'min:1'],
            'skills' => ['required', 'array', 'min:1'],
            'skills.*' => ['integer', 'distinct', 'exists:skills,id'],
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

            // FR-04.4: Kiểm tra quy tắc mức lương
            if (!$isNegotiable) {
                // TH1: Khoảng lương cụ thể (cả min và max đều có)
                if ($salaryMin !== null && $salaryMax !== null) {
                    if ($salaryMin <= 0 || $salaryMax <= 0) {
                        $validator->errors()->add('salary_min', 'Mức lương tối thiểu và tối đa phải lớn hơn 0');
                    } elseif ($salaryMin > $salaryMax) {
                        $validator->errors()->add('salary_min', 'Mức lương tối thiểu không được lớn hơn mức lương tối đa');
                    }
                } elseif ($salaryMin !== null) {
                    // TH2: Lương khởi điểm (chỉ có min)
                    if ($salaryMin <= 0) {
                        $validator->errors()->add('salary_min', 'Mức lương khởi điểm phải lớn hơn 0');
                    }
                } else {
                    $validator->errors()->add('salary_min', 'Vui lòng nhập mức lương hoặc chọn lương thỏa thuận');
                }

                if ($salaryMax !== null && $salaryMin === null) {
                    $validator->errors()->add('salary_min', 'Lương tối đa cần đi cùng lương tối thiểu');
                }

                if (in_array($this->input('salary_type'), ['specific', 'range'], true) && ($salaryMin === null || $salaryMax === null)) {
                    $validator->errors()->add('salary_max', 'Khoảng lương cần có cả mức tối thiểu và tối đa');
                }
            }
        });
    }

    protected function failedValidation(Validator $validator)
    {
        $company = $this->user()?->company;
        if (!$company || !$company->isComplete()) {
            throw new HttpResponseException(response()->json([
                'success' => false,
                'message' => 'Vui lòng cập nhật đầy đủ thông tin công ty (Tên, Giới thiệu, Trụ sở, Tỉnh/Thành phố) trước khi đăng tin tuyển dụng đầu tiên',
            ], 400));
        }

        $errors = $validator->errors();
        $statusCode = 422;

        // Phụ lục B SRS: Các lỗi liên quan đến deadline và salary trả 400 Bad Request
        if ($errors->has('deadline') || $errors->has('salary_min') || $errors->has('salary_max')) {
            $statusCode = 400;
        }

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $errors->first(),
            'errors' => $errors,
        ], $statusCode));
    }
}
