<?php

/** Dedicated local browser-test runtime. Never inherits the developer database or storage. */
$backendRoot = dirname(__DIR__);
$storageRoot = $backendRoot.'/storage/framework/testing/frontend-e2e';
foreach (['app/private', 'app/public', 'framework/cache/data', 'framework/sessions', 'framework/views', 'logs'] as $directory) {
    if (! is_dir($storageRoot.'/'.$directory)) {
        mkdir($storageRoot.'/'.$directory, 0777, true);
    }
}
$environment = [
    'APP_ENV' => 'testing',
    'APP_DEBUG' => 'false',
    'APP_URL' => 'http://127.0.0.1:8127',
    'FRONTEND_URL' => 'http://localhost:3127',
    'APP_KEY' => 'base64:'.base64_encode(hash('sha256', 'local-browser-e2e-only', true)),
    'DB_CONNECTION' => 'mysql',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '33063',
    'DB_DATABASE' => 'frontend_api_e2e_test',
    'DB_USERNAME' => getenv('FRONTEND_E2E_DB_USER') ?: 'root',
    'DB_PASSWORD' => getenv('FRONTEND_E2E_DB_PASSWORD') ?: '',
    'DB_COLLATION' => 'utf8mb4_unicode_ci',
    'DB_URL' => '',
    'DB_SOCKET' => '',
    'CACHE_STORE' => 'array',
    'MAIL_MAILER' => 'smtp',
    'MAIL_URL' => '',
    'MAIL_SCHEME' => 'smtp',
    'MAIL_HOST' => '127.0.0.1',
    'MAIL_PORT' => '8129',
    'MAIL_USERNAME' => '',
    'MAIL_PASSWORD' => '',
    'MAIL_REQUIRE_TLS' => 'false',
    'MAIL_TIMEOUT' => '5',
    'MAIL_FROM_ADDRESS' => 'noreply@frontend-e2e.test',
    'MAIL_FROM_NAME' => 'TimViecOnline',
    'QUEUE_CONNECTION' => 'database',
    'SESSION_DRIVER' => 'array',
    'BROADCAST_CONNECTION' => 'reverb',
    'AI_ANALYSIS_ENABLED' => 'false',
    'RESUME_BUILDER_ENABLED' => 'true',
    'REVERB_APP_ID' => 'frontend-e2e',
    'REVERB_APP_KEY' => 'frontend-e2e-public-key',
    'REVERB_APP_SECRET' => 'frontend-e2e-local-secret',
    'REVERB_HOST' => '127.0.0.1',
    'REVERB_PORT' => '8128',
    'REVERB_SCHEME' => 'http',
    'REVERB_SERVER_HOST' => '127.0.0.1',
    'REVERB_SERVER_PORT' => '8128',
    'REVERB_ALLOWED_ORIGINS' => 'localhost,127.0.0.1',
    'LARAVEL_STORAGE_PATH' => $storageRoot,
    // Do not consume shared, potentially cached configuration from another runtime.
    'APP_CONFIG_CACHE' => $storageRoot.'/framework/config.php',
];
foreach ($environment as $key => $value) {
    putenv($key.'='.$value);
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
}
require_once $backendRoot.'/vendor/autoload.php';
$app = require $backendRoot.'/bootstrap/app.php';
$app->useStoragePath($storageRoot);

return $app;
