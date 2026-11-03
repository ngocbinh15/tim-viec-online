<?php

namespace App\Http\Responses;

use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ApplicantExportDownload extends BinaryFileResponse
{
    public function sendContent(): static
    {
        $directory = $this->getFile()->getPath();
        try {
            return parent::sendContent();
        } finally {
            if (is_dir($directory) && count(scandir($directory)) === 2) {
                rmdir($directory);
            }
        }
    }
}
