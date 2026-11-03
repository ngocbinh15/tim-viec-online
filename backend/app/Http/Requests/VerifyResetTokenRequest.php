<?php

namespace App\Http\Requests;

class VerifyResetTokenRequest extends ForgotPasswordRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:254'],
            'token' => ['required', 'string', 'max:512'],
        ];
    }
}
