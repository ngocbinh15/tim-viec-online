<?php

namespace App\Services;

use App\Models\AiCvAnalysis;
use App\Models\Application;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser;

class GeminiService
{
    /**
     * Analyze a CV against its job description using the configured Gemini model.
     */
    public function analyze(Application $application): AiCvAnalysis
    {
        // Nếu đã có kết quả phân tích trước đó, trả về ngay (FR-07.5: lưu vĩnh viễn)
        if ($application->aiAnalysis) {
            return $application->aiAnalysis;
        }

        $job = $application->job->load(['skills', 'company']);
        $candidateProfile = $application->candidateProfile->load(['skills', 'user']);
        $cvText = $this->extractTextFromPdf($application->cv_path);

        $apiKey = config('services.gemini.key') ?: env('GEMINI_API_KEY');
        $result = null;

        // Use Gemini only when text extraction produced enough content. Scanned,
        // malformed, or placeholder PDFs still get a useful deterministic score
        // from the candidate's structured profile and the job requirements.
        if (mb_strlen(trim($cvText)) >= 20 && !empty($apiKey) && $apiKey !== 'dien_api_key_cua_ban_vao_day') {
            try {
                $result = $this->callGeminiApi($application, $apiKey, $cvText);
            } catch (\Throwable $e) {
                Log::warning('Lỗi khi gọi Gemini API: ' . $e->getMessage() . '. Chuyển sang thuật toán phân tích dự phòng.');
            }
        }

        // Nếu API key chưa cấu hình hoặc gọi API thất bại, sử dụng fallback matching theo SRS FR-07.2
        if (!$result) {
            $result = $this->generateFallbackAnalysis($application, $cvText);
        }

        $asStringList = static function ($value, int $limit): array {
            return array_slice(array_values(array_filter(
                array_map(static fn ($item) => is_string($item) ? trim($item) : '', (array) $value),
                static fn ($item) => $item !== ''
            )), 0, $limit);
        };

        $result['match_score'] = max(0, min(100, (int) ($result['match_score'] ?? 0)));
        $summary = trim((string) ($result['summary'] ?? ''));
        $result['summary'] = $this->limitWords(
            $summary !== '' ? $summary : 'Kết quả được ước tính từ nội dung CV và các yêu cầu của vị trí.',
            75
        );
        $result['strengths'] = $asStringList($result['strengths'] ?? [], 4);
        while (count($result['strengths']) < 2) {
            $result['strengths'][] = count($result['strengths']) === 0
                ? 'CV có nội dung văn bản để đối chiếu với vị trí tuyển dụng'
                : 'Kết quả đã được so sánh với mô tả và kỹ năng yêu cầu';
        }
        $result['matched_skills'] = $asStringList($result['matched_skills'] ?? [], 20);
        $result['missing_skills'] = $asStringList($result['missing_skills'] ?? [], 4);
        $result['recommendations'] = $asStringList($result['recommendations'] ?? [], 4);

        // The unique application_id constraint makes retries idempotent if workers race.
        return AiCvAnalysis::firstOrCreate(
            ['application_id' => $application->id],
            [
                'match_score' => $result['match_score'],
                'summary' => $result['summary'],
                'matched_skills' => $result['matched_skills'],
                'missing_skills' => $result['missing_skills'],
                'strengths' => $result['strengths'],
                'recommendations' => $result['recommendations'],
                'created_at' => now(),
            ]
        );
    }

    /**
     * Trích xuất văn bản từ tệp PDF (hỗ trợ cả đường dẫn tương đối trong storage và tuyệt đối)
     */
    public function extractTextFromPdf(string $filePath): string
    {
        $fullPath = file_exists($filePath) ? $filePath : null;
        if (!$fullPath) {
            foreach (['private', 'public'] as $disk) {
                if (Storage::disk($disk)->exists($filePath)) {
                    $fullPath = Storage::disk($disk)->path($filePath);
                    break;
                }
            }
        }
        if (!$fullPath || !file_exists($fullPath)) {
            return '';
        }

        try {
            $parser = new Parser();
            $pdf = $parser->parseFile($fullPath);
            return trim((string) $pdf->getText());
        } catch (\Throwable $e) {
            Log::error("PDF Parse Error: " . $e->getMessage());
            return '';
        }
    }

    /**
     * Send the inline PDF and job requirements to the configured Gemini model.
     */
    protected function callGeminiApi(Application $application, string $apiKey, string $pdfText): ?array
    {
        $job = $application->job;
        $candidate = $application->candidateProfile;

        $pdfRelativePath = $application->cv_path;
        $disk = Storage::disk('private')->exists($pdfRelativePath) ? 'private' : 'public';
        if (!Storage::disk($disk)->exists($pdfRelativePath)) {
            return null;
        }

        $pdfBytes = Storage::disk($disk)->get($pdfRelativePath);
        $base64Pdf = base64_encode($pdfBytes);

        $jobSkillsStr = $job->skills->pluck('name')->implode(', ');

        $prompt = <<<EOT
Bạn là chuyên gia nhân sự và tuyển dụng cấp cao. Hãy phân tích CV của ứng viên và đối chiếu với bản mô tả công việc (JD) sau đây:

--- THÔNG TIN VỊ TRÍ TUYỂN DỤNG ---
- Tiêu đề công việc: {$job->title}
- Cấp bậc: {$job->job_level}
- Kỹ năng yêu cầu: {$jobSkillsStr}
- Mô tả công việc (JD): {$job->description}
- Yêu cầu chuyên môn: {$job->requirements}

--- NỘI DUNG VĂN BẢN TRÍCH XUẤT TỪ CV ---
{$pdfText}

--- TIÊU CHÍ ĐÁNH GIÁ (SRS FR-07.2) ---
1. Kỹ năng chuyên môn (Trọng số 40%): Độ khớp giữa kỹ năng CV có và JD đòi hỏi.
2. Kinh nghiệm làm việc (Trọng số 30%): Số năm kinh nghiệm và vị trí tương đương.
3. Học vấn & Chứng chỉ (Trọng số 15%).
4. Định hướng & Trình độ ngoại ngữ (Trọng số 15%).

HÃY PHẢN HỒI DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ THEO ĐÚNG CẤU TRÚC SAU (không kèm markdown ngoài):
{
  "match_score": 85,
  "summary": "Đoạn văn ngắn gọn dưới 80 từ nhận xét mức độ phù hợp tổng quan",
  "matched_skills": ["Kỹ năng 1", "Kỹ năng 2"],
  "missing_skills": ["Kỹ năng còn thiếu 1", "Kỹ năng còn thiếu 2"],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "recommendations": ["Lời khuyên cải thiện 1", "Lời khuyên cải thiện 2"]
}
EOT;

        $model = config('services.gemini.model', 'gemini-3.8-flash');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        $response = Http::withHeaders(['x-goog-api-key' => $apiKey])
            ->connectTimeout(5)
            ->timeout(25)
            ->post($url, [
            'contents' => [
                [
                    'parts' => [
                        [
                            'inlineData' => [
                                'mimeType' => 'application/pdf',
                                'data' => $base64Pdf,
                            ],
                        ],
                        [
                            'text' => $prompt,
                        ],
                    ],
                ],
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature' => 0.2,
            ],
        ]);

        if ($response->successful()) {
            $json = $response->json();
            $rawText = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
            if ($rawText) {
                $cleanJson = trim(str_replace(['```json', '```'], '', $rawText));
                $parsed = json_decode($cleanJson, true);
                if (isset($parsed['match_score'])) {
                    return [
                        'match_score' => max(0, min(100, (int) $parsed['match_score'])),
                        'summary' => (string) ($parsed['summary'] ?? 'Đã hoàn tất phân tích tương thích CV.'),
                        'matched_skills' => is_array($parsed['matched_skills'] ?? null) ? $parsed['matched_skills'] : [],
                        'missing_skills' => is_array($parsed['missing_skills'] ?? null) ? $parsed['missing_skills'] : [],
                        'strengths' => is_array($parsed['strengths'] ?? null) ? $parsed['strengths'] : [],
                        'recommendations' => is_array($parsed['recommendations'] ?? null) ? $parsed['recommendations'] : [],
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Thuật toán phân tích dự phòng dựa trên dữ liệu hệ thống (SRS FR-07.2)
     */
    protected function generateFallbackAnalysis(Application $application, string $cvText): array
    {
        $job = $application->job;
        $profile = $application->candidateProfile;

        $jobSkills = $job->skills->pluck('name')->toArray();
        $candidateSkills = $profile ? $profile->skills->pluck('name')->toArray() : [];

        // 1. Kỹ năng chuyên môn (40%)
        $cvNeedles = array_map(fn ($skill) => mb_strtolower($skill), $candidateSkills);
        $matched = [];
        $missing = [];
        foreach ($jobSkills as $skill) {
            $needle = mb_strtolower($skill);
            if (in_array($needle, $cvNeedles, true) || mb_stripos($cvText, $needle) !== false) {
                $matched[] = $skill;
            } else {
                $missing[] = $skill;
            }
        }
        $skillScore = count($jobSkills) > 0 ? (count($matched) / count($jobSkills)) * 40 : 20;

        // 2. Kinh nghiệm (30%)
        $expYears = max((int) ($profile?->experience_years ?? 0), $this->estimateExperienceYears($cvText));
        $expScore = min(30, max(0, $expYears * 6));

        // 3. Học vấn & Kỹ năng phụ trợ (15%)
        $eduScore = preg_match('/\b(đại học|cao đẳng|cử nhân|thạc sĩ|bachelor|master|university|college)\b/iu', $cvText) ? 12 : 4;

        // 4. Ngôn ngữ & Mục tiêu (15%)
        $langScore = preg_match('/\b(ielts|toeic|toefl|english|tiếng anh|ngoại ngữ)\b/iu', $cvText) ? 12 : 4;

        $totalScore = (int) round($skillScore + $expScore + $eduScore + $langScore);
        $totalScore = max(0, min(100, $totalScore));

        $strengths = [
            count($matched) > 0 ? 'Kỹ năng phù hợp: ' . implode(', ', array_slice($matched, 0, 3)) : 'CV có nội dung văn bản để đối chiếu với yêu cầu công việc',
            $expYears > 0 ? "Thể hiện khoảng {$expYears} năm kinh nghiệm" : 'Có thông tin hồ sơ để nhà tuyển dụng xem xét',
        ];

        $recommendations = [];
        if (!empty($missing)) {
            $recommendations[] = 'Bổ sung thêm kiến thức và chứng chỉ về ' . implode(', ', array_slice($missing, 0, 2));
        }
        $recommendations[] = 'Mô tả rõ hơn các dự án thực tế đã hoàn thành trong CV';

        $summary = "Ước tính hồ sơ đáp ứng {$totalScore}% yêu cầu vị trí {$job->title}. " .
                   (count($matched) > 0 ? "Phù hợp tốt với các kỹ năng " . implode(', ', array_slice($matched, 0, 2)) . ". " : "") .
                   "Hồ sơ tiềm năng để sắp xếp phỏng vấn.";

        return [
            'match_score' => $totalScore,
            'summary' => $this->limitWords($summary, 75),
            'matched_skills' => $matched,
            'missing_skills' => array_slice($missing, 0, 4),
            'strengths' => $strengths,
            'recommendations' => $recommendations,
        ];
    }

    private function estimateExperienceYears(string $cvText): int
    {
        if (preg_match('/(\d{1,2})\s*\+?\s*(?:năm|years?)/iu', $cvText, $matches)) {
            return min(30, (int) $matches[1]);
        }
        return 0;
    }

    private function limitWords(string $text, int $limit): string
    {
        preg_match_all('/[\p{L}\p{N}]+(?:[-+][\p{L}\p{N}]+)*/u', trim($text), $matches);
        $words = $matches[0] ?? [];
        return implode(' ', array_slice($words, 0, $limit));
    }
}
