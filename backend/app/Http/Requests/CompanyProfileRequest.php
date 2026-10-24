<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class CompanyProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isEmployer();
    }

    protected function prepareForValidation(): void
    {
        // Hỗ trợ alias size -> company_size
        if ($this->has('size') && !$this->has('company_size')) {
            $this->merge(['company_size' => $this->input('size')]);
        }

        // Tự động chuẩn hóa protocol website nếu người dùng chỉ nhập domain
        if ($this->filled('website') && !preg_match('~^(?:f|ht)tps?://~i', (string) $this->input('website'))) {
            $this->merge(['website' => 'https://' . $this->input('website')]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:200'],
            'company_size' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'url', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string'],
            'logo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Tên công ty là thông tin bắt buộc',
            'address.required' => 'Địa chỉ trụ sở là thông tin bắt buộc',
            'city.required' => 'Tỉnh/Thành phố là thông tin bắt buộc',
            'description.required' => 'Giới thiệu công ty là thông tin bắt buộc',
            'website.url' => 'Địa chỉ website không hợp lệ',
            'logo.image' => 'Logo phải là tệp hình ảnh',
            'logo.mimes' => 'Logo phải có định dạng jpeg, png, jpg hoặc webp',
            'logo.max' => 'Dung lượng logo tối đa 2MB',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        $errors = $validator->errors();

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $errors->first(),
            'errors' => $errors,
        ], 422));
    }
}
