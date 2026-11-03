<?php

namespace App\Http\Requests;

class VerifyEmailRequest extends ResendVerificationEmailRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), ['token' => ['required', 'string', 'regex:/^[A-Za-z0-9]{64}$/D']]);
    }
}
