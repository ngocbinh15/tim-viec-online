<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChatHistoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Conversation membership is checked before messages are accessed.
        return true;
    }

    public function rules(): array
    {
        return [
            'latest' => ['sometimes', 'boolean'],
            'after_id' => ['sometimes', 'integer', 'min:0', 'prohibits:before_id', Rule::prohibitedIf($this->boolean('latest'))],
            'before_id' => ['sometimes', 'integer', 'min:1', 'prohibits:after_id', Rule::prohibitedIf($this->boolean('latest'))],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
