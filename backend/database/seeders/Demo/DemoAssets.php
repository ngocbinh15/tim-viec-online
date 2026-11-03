<?php

namespace Database\Seeders\Demo;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class DemoAssets
{
    private array $pdfs = [];

    public function portrait(int $index): string
    {
        $path = 'demo-seed/'.DemoOptions::RUN.'/portraits/'.$index.'.png';
        $this->put('public', $path, $this->png($index));

        return $path;
    }

    public function company(int $index): string
    {
        $path = 'demo-seed/'.DemoOptions::RUN.'/logos/'.$index.'.png';
        $this->put('public', $path, $this->png($index + 3000));

        return $path;
    }

    public function cv(int $index, string $name, string $role, array $skills, int $years): string
    {
        $lines = [
            'DEMO CV - SYNTHETIC DATA / HO SO MINH HOA', $name, $role,
            'Email: candidate.'.sprintf('%05d', $index + 1).'@demo.timviec.test',
            'KINH NGHIEM / EXPERIENCE: '.$years.' nam',
            'KY NANG / SKILLS: '.implode(', ', $skills),
            'MUC TIEU: Phat trien chuyen mon, hop tac voi doi ngu va tao gia tri cho khach hang.',
            'CONG VIEC: Tham gia du an, quan ly tien do va bao cao ket qua hang tuan.',
            'THANH TUU: Cai tien quy trinh, giam thoi gian xu ly va nang cao chat luong dich vu.',
            'HOC VAN: Tot nghiep nganh lien quan, dao tao noi bo va tu hoc chuyen mon.',
            'NGOAI NGU: Tieng Anh doc hieu tai lieu; can xac minh trong phong van.',
            'This is a generated demo resume, not a real person or verified professional history.',
        ];
        $stream = "BT /F1 11 Tf 48 790 Td 17 TL\n";
        foreach ($lines as $line) {
            foreach (explode("\n", wordwrap(Str::ascii($line), 88)) as $wrapped) {
                $stream .= '('.str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $wrapped).") Tj T*\n";
            }
        }
        $stream .= 'ET';
        $objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length '.strlen($stream).">>\nstream\n".$stream."\nendstream"];
        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $i => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n".$object."\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 6\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n".$xref."\n%%EOF";
        $this->pdfs[$index] = $pdf;
        $path = 'demo-seed/'.DemoOptions::RUN.'/profiles/'.($index + 1).'.pdf';
        $this->put('private', $path, $pdf);

        return $path;
    }

    public function snapshot(int $candidate, int $application): string
    {
        $path = 'demo-seed/'.DemoOptions::RUN.'/applications/'.$application.'.pdf';
        $this->put('private', $path, $this->pdfs[$candidate]);

        return $path;
    }

    public function attachment(): string
    {
        $path = 'demo-seed/'.DemoOptions::RUN.'/chat/meeting.png';
        $this->put('private', $path, $this->png(9876));

        return $path;
    }

    private function put(string $disk, string $path, string $content): void
    {
        if (! Storage::disk($disk)->put($path, $content)) {
            throw new \RuntimeException('Không ghi được tài nguyên seed.');
        }
    }

    private function png(int $seed): string
    {
        $hash = hash('sha256', (string) $seed, true);
        $raw = '';
        for ($y = 0; $y < 64; $y++) {
            $raw .= "\0";
            for ($x = 0; $x < 64; $x++) {
                $cell = intdiv($x, 10);
                $cell = min($cell, 5 - $cell);
                $on = $x > 7 && $x < 56 && $y > 7 && $y < 56 && ord($hash[(intdiv($y, 10) * 3 + max(0, $cell)) % 32]) % 2;
                $raw .= $on ? chr(30 + ord($hash[0]) % 110).chr(60 + ord($hash[1]) % 100).chr(100 + ord($hash[2]) % 140) : "\xf0\xf4\xfc";
            }
        }
        $chunk = fn (string $type, string $data) => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));

        return "\x89PNG\r\n\x1a\n".$chunk('IHDR', pack('NNCCCCC', 64, 64, 8, 2, 0, 0, 0)).$chunk('IDAT', gzcompress($raw)).$chunk('IEND', '');
    }
}
