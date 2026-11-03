<?php

return [
    'enabled' => (bool) env('AI_ANALYSIS_ENABLED', false),
    'provider' => env('AI_PROVIDER', 'groq'),
    'groq' => [
        'key' => env('GROQ_API_KEY'),
        'model' => env('GROQ_MODEL', 'openai/gpt-oss-20b'),
    ],
];
