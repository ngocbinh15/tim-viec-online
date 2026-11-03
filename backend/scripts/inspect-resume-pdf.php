<?php

// CLI-only test utility. Never expose this script through a web route.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../vendor/autoload.php';
$pdf = (new \Smalot\PdfParser\Parser)->parseFile($argv[1]);
echo json_encode(['pages' => count($pdf->getPages()), 'text' => $pdf->getText()], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
