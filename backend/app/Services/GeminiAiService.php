<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser;

class GeminiAiService
{
    /**
     * Phân tích CV so với JD bằng Google Gemini AI theo chuẩn FR-07
     */
    public function analyzeCvWithJob($cvFilePath, $jobDescription, $jobRequirements)
    {
        // 1. Trích xuất text từ file PDF CV của ứng viên
        $fullPath = storage_path('app/public/' . $cvFilePath);
        $cvText = $this->extractTextFromPdf($fullPath);

        // 2. Xây dựng Prompt chuẩn yêu cầu FR-07 của SRS
        $prompt = "
            Bạn là hệ thống AI phân tích và chấm điểm tuyển dụng chuyên nghiệp.
            Hãy phân tích CV của ứng viên dựa trên Bản mô tả công việc (JD) và Yêu cầu chuyên môn sau đây:

            --- MÔ TẢ CÔNG VIỆC (JD) ---
            {$jobDescription}

            --- YÊU CẦU CHUYÊN MÔN ---
            {$jobRequirements}

            --- NỘI DUNG CV ỨNG VIÊN ---
            {$cvText}

            --- YÊU CẦU ĐẦU RA (JSON FORMAT) ---
            Hãy đánh giá dựa trên 4 tiêu chí: Kỹ năng chuyên môn (40%), Kinh nghiệm (30%), Học vấn/Chứng chỉ (15%), Ngoại ngữ/Định hướng (15%).
            Trả về kết quả ĐÚNG định dạng JSON thuần túy theo cấu trúc mẫu sau (không kèm text ngoài):
            {
              \"match_score\": 85,
              \"summary\": \"Đoạn đánh giá tổng quan ngắn gọn dưới 80 từ về CV so với vị trí tuyển dụng\",
              \"strengths\": [\"Điểm mạnh 1\", \"Điểm mạnh 2\"],
              \"matched_skills\": [\"Kỹ năng khớp 1\", \"Kỹ năng khớp 2\"],
              \"missing_skills\": [\"Kỹ năng còn thiếu 1\"],
              \"recommendations\": [\"Lời khuyên cải thiện hồ sơ 1\"]
            }
        ";

        try {
            $apiKey = config('services.gemini.key');

            if (empty($apiKey)) {
                Log::error("Gemini AI Error: Chưa cấu hình GEMINI_API_KEY trong file .env");
                return null;
            }

            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={$apiKey}";

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->timeout(60)->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'response_mime_type' => 'application/json',
                ],
            ]);

            if ($response->successful()) {
                $aiResponseText = $response->json('candidates.0.content.parts.0.text');

                // Làm sạch và giải mã JSON
                $cleanJson = trim(str_replace(['```json', '```'], '', $aiResponseText));
                $decoded = json_decode($cleanJson, true);

                if (is_array($decoded)) {
                    return $decoded;
                }
            } else {
                Log::error("Gemini API HTTP Error: " . $response->body());
            }

        } catch (\Exception $e) {
            Log::error("Gemini AI Exception: " . $e->getMessage());
        }

        return null; // Trả về null để biết là lỗi gọi AI
    }

    private function extractTextFromPdf($filePath)
    {
        if (!file_exists($filePath)) {
            return "Không tìm thấy nội dung file CV tại đường dẫn: " . $filePath;
        }

        try {
            $parser = new Parser();
            $pdf = $parser->parseFile($filePath);
            return $pdf->getText();
        } catch (\Exception $e) {
            Log::error("PDF Parse Error: " . $e->getMessage());
            return "Không thể trích xuất văn bản từ tệp PDF.";
        }
    }
}
