<?php

/** Local-only PHP server with bytecode caching and immediate source revalidation. */
$options = getopt('', ['port:']);
$port = filter_var($options['port'] ?? 8000, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1024, 'max_range' => 65535]]);
if ($port === false) {
    fwrite(STDERR, "Use --port=1024..65535.\n");
    exit(1);
}

$root = dirname(__DIR__);
$public = $root.'/public';
$router = $root.'/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php';
if (! is_file($router)) {
    fwrite(STDERR, "Run composer install before starting the local server.\n");
    exit(1);
}

$command = [PHP_BINARY];
$opcache = rtrim((string) ini_get('extension_dir'), '/\\').DIRECTORY_SEPARATOR.(PHP_OS_FAMILY === 'Windows' ? 'php_opcache.dll' : 'opcache.so');
if (! extension_loaded('Zend OPcache') && is_file($opcache)) {
    array_push($command, '-d', 'zend_extension='.$opcache);
}
array_push($command,
    '-d', 'opcache.enable_cli=1',
    '-d', 'opcache.validate_timestamps=1',
    '-d', 'opcache.revalidate_freq=0',
    '-S', '127.0.0.1:'.$port,
    $router,
);
fwrite(STDOUT, 'Local API: http://127.0.0.1:'.$port." (source changes are checked on every request)\n");
$process = proc_open($command, [0 => STDIN, 1 => STDOUT, 2 => STDERR], $pipes, $public, null, ['bypass_shell' => true]);
exit(is_resource($process) ? proc_close($process) : 1);
