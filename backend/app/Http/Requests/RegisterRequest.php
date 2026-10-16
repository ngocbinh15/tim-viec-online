<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $minDob = now()->subYears(15)->toDateString();

        return [
            'name' => [
                'required',
                'string',
                'min:2',
                'max:100',
                'regex:/^[\p{L}\s\-]+$/u',
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:100',
                'unique:users,email',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'max:32',
                'confirmed',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]+$/',
            ],
            'phone' => [
                'nullable',
                'string',
                'regex:/^(03|05|07|08|09)\d{8}$/',
            ],
            'dob' => [
                'nullable',
                'date',
                'before_or_equal:' . $minDob,
            ],
            'role' => [
                'required',
                'string',
                'in:candidate,employer',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Họ tên là thông tin bắt buộc',
            'name.min' => 'Họ tên phải có độ dài từ 2 đến 100 ký tự',
            'name.max' => 'Họ tên phải có độ dài từ 2 đến 100 ký tự',
            'name.regex' => 'Họ tên không chứa ký tự đặc biệt ngoài khoảng trắng và dấu gạch nối',
            'email.required' => 'Email là thông tin bắt buộc',
            'email.email' => 'Email không đúng định dạng',
            'email.unique' => 'Email đã được sử dụng',
            'password.required' => 'Mật khẩu là thông tin bắt buộc',
            'password.min' => 'Mật khẩu có độ dài từ 8 đến 32 ký tự',
            'password.max' => 'Mật khẩu có độ dài từ 8 đến 32 ký tự',
            'password.regex' => 'Mật khẩu bắt buộc chứa ít nhất một chữ cái thường, chữ cái in hoa, ký tự đặc biệt và số',
            'password.confirmed' => 'Xác nhận mật khẩu phải trùng khớp với mật khẩu đã nhập',
            'phone.regex' => 'Số điện thoại không hợp lệ',
            'dob.before_or_equal' => 'Người dùng đăng ký phải từ 15 tuổi trở lên',
            'role.required' => 'Vui lòng chọn vai trò (Ứng viên hoặc Nhà tuyển dụng)',
            'role.in' => 'Vai trò không hợp lệ, chỉ chấp nhận candidate hoặc employer',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        $errors = $validator->errors();
        $firstError = $errors->first();

        // If email is duplicate, SRS explicitly requires 422 Unprocessable and message 'Email đã được sử dụng'
        $statusCode = 422;

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $firstError,
            'errors' => $errors,
        ], $statusCode));
    }
}
