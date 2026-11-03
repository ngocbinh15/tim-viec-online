<?php

namespace App\Services;

use App\Http\Responses\ApplicantExportDownload;
use App\Models\Application;
use App\Models\Job;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use OpenSpout\Common\Entity\Cell\NumericCell;
use OpenSpout\Common\Entity\Cell\StringCell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Border;
use OpenSpout\Common\Entity\Style\BorderPart;
use OpenSpout\Common\Entity\Style\CellAlignment;
use OpenSpout\Common\Entity\Style\CellVerticalAlignment;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\AutoFilter;
use OpenSpout\Writer\XLSX\Entity\SheetView;
use OpenSpout\Writer\XLSX\Options;
use OpenSpout\Writer\XLSX\Writer;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class ApplicantExportService
{
    public const MAX_ROWS = 50000;

    private const HEADERS = ['STT', 'Mã hồ sơ', 'Họ và tên', 'Email', 'Số điện thoại', 'Vị trí ứng tuyển', 'Chức danh', 'Tỉnh / Thành phố', 'Kinh nghiệm (năm)', 'Kỹ năng', 'Trạng thái', 'Ngày ứng tuyển', 'Điểm phù hợp AI'];

    public function download(User $user, array $jobIds, string $mode): BinaryFileResponse
    {
        $jobs = Job::whereHas('company', fn ($query) => $query->where('user_id', $user->id))->whereIn('id', $jobIds)->get()->keyBy('id');
        if ($jobs->count() !== count($jobIds)) {
            $this->fail('Không tìm thấy tin tuyển dụng hoặc bạn không có quyền xuất danh sách này.', 404);
        }
        $jobs = collect($jobIds)->map(fn ($id) => $jobs->get($id));
        if (Application::whereIn('job_id', $jobIds)->count() > self::MAX_ROWS) {
            $this->fail('Danh sách vượt quá 50.000 hồ sơ. Hãy chọn ít tin tuyển dụng hơn.', 422);
        }

        // Files are never placed on the public disk. Every request owns a random directory.
        $directory = storage_path('app/private/applicant_exports/'.Str::uuid());
        if (! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('Could not create applicant export directory.');
        }
        $output = null;
        $keepOutput = false;
        $total = 0;
        try {
            $stamp = now('Asia/Ho_Chi_Minh')->format('Y-m-d_His');
            if ($mode === 'separate' && $jobs->count() > 1) {
                $output = $directory.'/applicants.zip';
                $archive = new ZipArchive;
                if ($archive->open($output, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                    throw new RuntimeException('Could not create applicant export archive.');
                }
                try {
                    foreach ($jobs as $job) {
                        $filename = $job->id.'-'.(Str::slug(mb_substr($job->title, 0, 100)) ?: 'ung-vien').'.xlsx';
                        $path = $directory.'/'.$filename;
                        $this->writeWorkbook(collect([$job]), $path, $total);
                        if (! $archive->addFile($path, $filename)) {
                            throw new RuntimeException('Could not add applicant workbook.');
                        }
                    }
                } finally {
                    $archive->close();
                }
                $filename = 'Danh-sach-ung-vien_'.$stamp.'.zip';
                $mime = 'application/zip';
            } else {
                $output = $directory.'/applicants.xlsx';
                $this->writeWorkbook($jobs, $output, $total);
                $filename = 'Danh-sach-ung-vien_'.$stamp.'.xlsx';
                $mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }

            $response = new ApplicantExportDownload($output, 200, ['Content-Type' => $mime, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
            $response->setContentDisposition('attachment', $filename);
            $response->deleteFileAfterSend(true);
            $keepOutput = true;

            return $response;
        } finally {
            $this->cleanup($directory, $keepOutput ? $output : null);
        }
    }

    private function writeWorkbook(Collection $jobs, string $path, int &$total): void
    {
        $options = new Options;
        // Widths use Excel character units; contact details must not wrap at every word.
        foreach ([6, 12, 28, 38, 19, 38, 30, 22, 18, 52, 24, 23, 20] as $index => $width) {
            $options->setColumnWidth($width, $index + 1);
        }
        $options->DEFAULT_ROW_STYLE = (new Style)->setFontName('Calibri')->setFontSize(11)
            ->setFontColor('243247')->setCellVerticalAlignment(CellVerticalAlignment::CENTER)->setShouldWrapText(false);
        $headerStyle = (new Style)->setFontBold()->setFontColor('FFFFFF')->setBackgroundColor('172D59')
            ->setShouldWrapText()->setCellVerticalAlignment(CellVerticalAlignment::CENTER);
        $divider = new Border(new BorderPart(Border::BOTTOM, 'E5EAF1', Border::WIDTH_THIN));
        $writer = new Writer($options);
        $writer->openToFile($path);
        try {
            foreach ($jobs as $index => $job) {
                $sheet = $index === 0 ? $writer->getCurrentSheet() : $writer->addNewSheetAndMakeItCurrent();
                $title = preg_replace('/[\\\\\[\]:*?\/\x00-\x1F]/u', ' ', $job->title);
                $sheet->setName(rtrim(mb_substr($job->id.' - '.trim($title, " '\t\r\n"), 0, 31), " '"));
                $sheet->setSheetView((new SheetView)->setFreezeRow(2)->setFreezeColumn('D')->setShowGridLines(false)->setZoomScale(85));
                $writer->addRow($this->textRow(self::HEADERS, $headerStyle)->setHeight(36));
                $ordinal = 0;
                foreach (Application::where('job_id', $job->id)->with(['candidateProfile.user', 'candidateProfile.skills', 'aiAnalysis'])->lazyById(500) as $application) {
                    if (++$total > self::MAX_ROWS) {
                        $this->fail('Danh sách vượt quá 50.000 hồ sơ. Hãy chọn ít tin tuyển dụng hơn.', 422);
                    }
                    $profile = $application->candidateProfile;
                    $candidate = $profile?->user;
                    $status = match ($application->status) {
                        'applied' => 'Đã ứng tuyển', 'waiting' => 'Đang xem xét', 'accepted' => 'Trúng tuyển', 'rejected' => 'Từ chối', 'withdrawn' => 'Đã rút hồ sơ', default => $application->status,
                    };
                    $background = $ordinal % 2 === 0 ? 'FFFFFF' : 'F3F6FA';
                    $rowStyle = (new Style)->setBackgroundColor($background)->setBorder($divider);
                    $centered = (clone $rowStyle)->setCellAlignment(CellAlignment::CENTER);
                    [$statusBackground, $statusColor] = match ($application->status) {
                        'applied' => ['EEF2FF', '304DB7'],
                        'waiting' => ['FFF5DF', '895E12'],
                        'accepted' => ['E7F5EC', '237044'],
                        'rejected' => ['FCEDED', 'A53C3C'],
                        default => ['ECEFF3', '596579'],
                    };
                    $columnStyles = [
                        0 => $centered, 1 => $centered,
                        2 => (clone $rowStyle)->setFontBold(),
                        5 => (clone $rowStyle)->setShouldWrapText(),
                        8 => $centered,
                        9 => (clone $rowStyle)->setShouldWrapText()->setFontSize(10)->setFontColor('526176'),
                        10 => (clone $centered)->setBackgroundColor($statusBackground)->setFontColor($statusColor)->setFontBold(),
                        11 => $centered, 12 => (clone $centered)->setFontBold()->setFontColor('304DB7'),
                    ];
                    $writer->addRow($this->textRow([
                        ++$ordinal, $application->id, $candidate?->name, $candidate?->email, $candidate?->phone, $job->title, $profile?->title, $profile?->city, $profile?->experience_years,
                        $profile?->skills->pluck('name')->implode(', '), $status, $application->created_at?->timezone('Asia/Ho_Chi_Minh')->format('d/m/Y H:i'),
                        $application->ai_analysis_status === 'completed' ? $application->aiAnalysis?->match_score : null,
                    ], $rowStyle, $columnStyles)->setHeight(56));
                }
                $sheet->setAutoFilter(new AutoFilter(0, 1, count(self::HEADERS) - 1, $ordinal + 1));
            }
        } finally {
            $writer->close();
        }
    }

    private function textRow(array $values, ?Style $style = null, array $columnStyles = []): Row
    {
        // Explicit strings preserve phone numbers and prevent Excel formula execution.
        return new Row(array_map(fn ($value, $index) => is_int($value) || is_float($value)
            ? new NumericCell($value, $columnStyles[$index] ?? null)
            : new StringCell(mb_substr((string) ($value ?? ''), 0, 32767), $columnStyles[$index] ?? null), $values, array_keys($values)), $style);
    }

    private function cleanup(string $directory, ?string $keep = null): void
    {
        foreach (glob($directory.'/*') ?: [] as $path) {
            if ($path !== $keep && is_file($path)) {
                unlink($path);
            }
        }
        if ($keep === null && is_dir($directory)) {
            rmdir($directory);
        }
    }

    private function fail(string $message, int $status): never
    {
        throw new HttpResponseException(response()->json(['success' => false, 'message' => $message, 'errors' => []], $status));
    }
}
