<?php

return [
    'enabled' => (bool) env('RESUME_BUILDER_ENABLED', false),
    'renderer_version' => '5',
    'node_binary' => env('RESUME_NODE_BINARY', 'node'),
    'renderer_path' => env('RESUME_RENDERER_PATH', base_path('../frontend/dist/cv-renderer/render-cv.mjs')),
];
