<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('new_password') && ! $this->has('password')) {
            $this->merge([
                'password' => $this->input('new_password'),
            ]);
        }
        if ($this->has('new_password_confirmation') && ! $this->has('password_confirmation')) {
            $this->merge([
                'password_confirmation' => $this->input('new_password_confirmation'),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'max:512'],
            'email' => ['required', 'string', 'email', 'max:254'],
            'password' => [
                'required',
                'string',
                'min:8',
                'max:32',
                'confirmed',
                'regex:/\p{Ll}/u',
                'regex:/\p{Lu}/u',
                'regex:/\p{N}/u',
                'regex:/[^\p{L}\p{N}\s]/u',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (is_string($value) && strlen($value) > 72) {
                        $fail('Mật khẩu chứa quá nhiều ký tự có dấu. Vui lòng rút ngắn mật khẩu.');
                    }
                },
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'Mã xác thực token là bắt buộc',
            'email.required' => 'Email là thông tin bắt buộc',
            'email.email' => 'Email không đúng định dạng',
            'password.required' => 'Mật khẩu là thông tin bắt buộc',
            'password.min' => 'Mật khẩu có độ dài từ 8 đến 32 ký tự',
            'password.max' => 'Mật khẩu có độ dài từ 8 đến 32 ký tự',
            'password.regex' => 'Mật khẩu bắt buộc chứa ít nhất một chữ cái thường, chữ cái in hoa, ký tự đặc biệt và số',
            'password.confirmed' => 'Xác nhận mật khẩu phải trùng khớp với mật khẩu đã nhập',
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
