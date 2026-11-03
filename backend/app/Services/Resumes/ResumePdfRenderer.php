<?php

namespace App\Services\Resumes;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Smalot\PdfParser\Parser;
use Symfony\Component\Process\Process;

class ResumePdfRenderer
{
    public function render(RenderInput $input): RenderedPdf
    {
        ResumeSchema::requireExportable($input->document);
        $disk = Storage::disk('private');
        $disk->makeDirectory('resume_exports/tmp');
        $temporary = 'resume_exports/tmp/'.Str::uuid().'.pdf';
        try {
            $process = new Process([(string) config('resumes.node_binary'), (string) config('resumes.renderer_path'), $disk->path($temporary)]);
            $process->setTimeout(30)->setInput(json_encode(['document' => $input->document, 'photo' => $input->photo], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            $process->run();
            if (! $process->isSuccessful() || ! $disk->exists($temporary)) {
                $failure = json_decode(substr($process->getErrorOutput(), 0, 4096), true);
                $code = $failure['error_code'] ?? 'RENDER_FAILED';
                throw new \RuntimeException(in_array($code, ['PDF_TOO_LARGE', 'INVALID_PHOTO', 'INPUT_TOO_LARGE']) ? $code : 'RENDER_FAILED');
            }
            $size = $disk->size($temporary);
            if ($size > 5242880) {
                throw new \RuntimeException('PDF_TOO_LARGE');
            }
            $bytes = $disk->get($temporary);
            if (! str_starts_with($bytes, '%PDF-')) {
                throw new \RuntimeException('INVALID_PDF');
            }
            $pdf = (new Parser)->parseContent($bytes);
            $pages = count($pdf->getPages());
            if ($pages > 5 || $pages < 1) {
                throw new \RuntimeException('PDF_PAGE_LIMIT');
            }
            // PDF extraction inserts whitespace at visual line breaks.
            $extractedText = preg_replace('/\s+/u', '', $pdf->getText());
            $expectedName = preg_replace('/\s+/u', '', $input->document['content']['basics']['full_name']);
            if (! str_contains($extractedText, $expectedName)) {
                throw new \RuntimeException('PDF_TEXT_MISSING');
            }

            return new RenderedPdf($temporary, $size, $pages, hash('sha256', $bytes));
        } catch (\Throwable $exception) {
            $disk->delete($temporary);
            throw $exception;
        }
    }
}
