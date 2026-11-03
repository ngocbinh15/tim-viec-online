<?php

use Symfony\Component\Console\Input\ArrayInput;

if (($argv[1] ?? '') === 'reverb') {
    $app = require __DIR__.'/frontend-e2e-bootstrap.php';
    exit($app->handleCommand(new ArrayInput(['command' => 'reverb:start', '--host' => '127.0.0.1', '--port' => '8128'])));
}
require __DIR__.'/frontend-e2e-seed.php';
$command = escapeshellarg(PHP_BINARY).' -S 127.0.0.1:8127 '.escapeshellarg(__DIR__.'/frontend-e2e-router.php');
passthru($command, $exitCode);
exit($exitCode);
