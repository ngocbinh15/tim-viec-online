<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));
$app = require __DIR__.'/frontend-e2e-bootstrap.php';
// Serve uploaded public assets from this fixture's private storage tree only.
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
error_log($_SERVER['REQUEST_METHOD'].' '.$uri);
if (str_starts_with($uri, '/storage/')) {
    $root = realpath($app->storagePath('app/public'));
    $file = realpath($root.'/'.substr($uri, 9));
    if (! $file || ! str_starts_with($file, $root.DIRECTORY_SEPARATOR) || ! is_file($file)) {
        http_response_code(404);
        exit;
    }
    header('Content-Type: '.(mime_content_type($file) ?: 'application/octet-stream'));
    header('X-Content-Type-Options: nosniff');
    readfile($file);
    exit;
}
$app->handleRequest(Request::capture());
