<?php

namespace Database\Seeders\Demo;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

final class DemoRecruitment
{
    public function __construct(private DemoWriter $writer, private DemoAssets $assets) {}

    public function create(DemoOptions $options, array $catalog, array $actors, array $jobs, Carbon $now): void
    {
        $attachment = $this->assets->attachment();
        $ordinal = 0;
        foreach ($actors['candidates'] as $i => $candidate) {
            $available = $jobs[$candidate['sector']];
            $offset = intdiv($i, min(count($catalog), $options->employers)) % count($available);
            for ($s = 0; $s < $options->savedPerCandidate; $s++) {
                $this->writer->add('saved_jobs', [
                    'candidate_id' => $candidate['id'], 'job_id' => $available[($offset + $s) % count($available)]['id'],
                    'created_at' => $now->copy()->subHours(1 + ($i + $s) % 24),
                ]);
            }
            $conversations = 0;
            for ($a = 0; $a < $options->applicationsPerCandidate; $a++) {
                $job = $available[($offset + $a) % count($available)];
                $ordinal++;
                $status = ['applied', 'waiting', 'accepted', 'rejected', 'withdrawn'][($i + $a) % 5];
                // Applications occurred while each vacancy was accepting submissions.
                $end = $job['status'] === 'expired' ? $job['deadline']->copy()->startOfDay()->subHours(12) : $now->copy()->subDays(1);
                $start = $job['created_at']->copy()->addHours(1);
                $end = $end->max($start);
                $span = max(0, $end->getTimestamp() - $start->getTimestamp());
                $submitted = $start->copy()->addSeconds((int) floor($span * (($i * 7 + $a * 13) % 97) / 97));
                $reviewed = in_array($status, ['waiting', 'accepted', 'rejected'], true) ? $submitted->copy()->addMinutes(20) : null;
                $ai = $options->aiFixtures && ($ordinal - 1) % 3 === 0;
                $id = $this->writer->one('applications', [
                    'job_id' => $job['id'], 'candidate_id' => $candidate['id'],
                    'cv_path' => $this->assets->snapshot($i, $ordinal),
                    'cover_letter' => 'Kính gửi bộ phận tuyển dụng '.$job['company']['name'].', tôi quan tâm đến vị trí '.$job['title'].'. Tôi có nền tảng về '.implode(', ', array_slice($candidate['skills'], 0, 3)).'. Tôi mong được trao đổi thêm về mục tiêu của đội ngũ và cách đóng góp phù hợp. Xin cảm ơn anh/chị đã xem hồ sơ. [Hồ sơ demo minh họa]',
                    'status' => $status, 'reviewed_at' => $reviewed,
                    'ai_analysis_status' => $ai ? 'completed' : 'deferred', 'ai_analysis_error' => null,
                    'created_at' => $submitted, 'updated_at' => $submitted->copy()->addMinutes($reviewed ? 40 : 0),
                ]);
                if ($ai) {
                    $this->analysis($id, $candidate, $job, $submitted);
                }
                $this->notification($job['company']['user_id'], 'new_application', 'Có hồ sơ ứng tuyển mới', $candidate['name'].' ứng tuyển vị trí '.$job['title'].'.', ['application_id' => $id, 'job_id' => $job['id']], $submitted, $ordinal % 3 === 0);
                $this->notification($candidate['user_id'], 'app_status_changed', 'Cập nhật hồ sơ ứng tuyển', $this->statusText($status).' tại '.$job['company']['name'].'.', ['application_id' => $id, 'job_id' => $job['id']], $submitted->copy()->addMinutes(45), $ordinal % 4 === 0);
                if ($status !== 'withdrawn' && $conversations < $options->conversationsPerCandidate) {
                    $this->conversation($options, $candidate, $job, $id, $submitted->copy()->addHour(), $attachment, $ordinal);
                    $conversations++;
                }
            }
            if ($i % 100 === 0) {
                $this->writer->flush();
            }
        }
        $this->reports($actors, $jobs, $now);
    }

    private function statusText(string $status): string
    {
        return match ($status) {
            'waiting' => 'Hồ sơ đang được xem xét', 'accepted' => 'Hồ sơ đã được chấp nhận',
            'rejected' => 'Hồ sơ chưa phù hợp với vị trí', 'withdrawn' => 'Bạn đã rút hồ sơ',
            default => 'Hệ thống đã nhận hồ sơ',
        };
    }

    private function analysis(int $id, array $candidate, array $job, Carbon $at): void
    {
        $matched = array_values(array_intersect($candidate['skills'], $job['skills']));
        $missing = array_slice(array_values(array_diff($job['skills'], $candidate['skills'])), 0, 4);
        $this->writer->add('ai_cv_analyses', [
            'application_id' => $id, 'match_score' => 35 + $id % 65,
            'summary' => '[MINH HỌA SEED, KHÔNG PHẢI AI THẬT] Hồ sơ có nền tảng liên quan đến vị trí. Nhà tuyển dụng cần xác minh kinh nghiệm và kỹ năng thông qua phỏng vấn trước khi quyết định.',
            'matched_skills' => DemoWriter::json($matched), 'missing_skills' => DemoWriter::json($missing),
            'strengths' => DemoWriter::json(['[Minh họa] Có kỹ năng liên quan đến nhóm ngành ứng tuyển.', '[Minh họa] Mục tiêu phát triển phù hợp với vai trò.']),
            'recommendations' => DemoWriter::json(['Kết quả này chỉ phục vụ demo giao diện, không dùng ra quyết định tuyển dụng.', 'Trao đổi thêm về dự án và kinh nghiệm thực tế.']),
            'created_at' => $at->copy()->addMinutes(3),
        ]);
    }

    private function conversation(DemoOptions $options, array $candidate, array $job, int $application, Carbon $at, string $image, int $ordinal): void
    {
        $last = $at->copy()->addMinutes(($options->messagesPerConversation - 1) * 7);
        $conversation = $this->writer->one('conversations', [
            'candidate_id' => $candidate['user_id'], 'employer_id' => $job['company']['user_id'],
            'job_id' => $job['id'], 'created_at' => $at, 'last_message_at' => $last,
        ]);
        $dialogue = [
            'Chào anh/chị, tôi vừa gửi hồ sơ cho vị trí '.$job['title'].'. Rất mong có cơ hội trao đổi thêm.',
            'Chào bạn, bên mình đã nhận được hồ sơ. Bạn có thể chia sẻ thêm về công việc gần đây nhất không?',
            'Tôi tập trung vào '.implode(', ', array_slice($candidate['skills'], 0, 3)).' và phối hợp cùng nhóm để hoàn thành mục tiêu đúng tiến độ.',
            'Cảm ơn bạn. Bên mình muốn tìm hiểu thêm về cách bạn xử lý một tình huống khó trong dự án.',
            'Tôi thường làm rõ yêu cầu, phân tích nguyên nhân, trao đổi phương án và kiểm tra kết quả trước khi bàn giao.',
            'Mình đã ghi nhận. Buổi trao đổi sẽ gồm giới thiệu đội ngũ, chuyên môn và các câu hỏi của bạn.',
            'Anh/chị có thể cho tôi biết thêm về lịch làm việc và lộ trình hội nhập của vị trí không?',
            'Nhóm có người hướng dẫn trong giai đoạn đầu. Lịch cụ thể và chế độ sẽ được trao đổi trong buổi phỏng vấn.',
            'Tôi đã nhận được thông tin, cảm ơn anh/chị. Tôi sẵn sàng bổ sung hồ sơ nếu cần.',
            'Cảm ơn bạn. Mọi cập nhật tiếp theo mình sẽ trao đổi trong hội thoại này.',
            'Tôi gửi thêm tài liệu minh họa để anh/chị tham khảo trước buổi trao đổi.',
            'Mình đã nhận được tài liệu, hẹn gặp bạn trong buổi trao đổi sắp tới.',
        ];
        for ($m = 0; $m < $options->messagesPerConversation; $m++) {
            $sent = $at->copy()->addMinutes($m * 7);
            $read = $m < $options->messagesPerConversation - 2;
            $this->writer->add('messages', [
                'conversation_id' => $conversation, 'sender_id' => $m % 2 ? $job['company']['user_id'] : $candidate['user_id'],
                'message' => $dialogue[$m % count($dialogue)], 'image_path' => $m === 4 && $ordinal % 7 === 0 ? $image : null,
                'is_read' => $read, 'read_at' => $read ? $sent->copy()->addMinutes(2) : null, 'created_at' => $sent,
            ]);
        }
        foreach ([$candidate['user_id'], $job['company']['user_id']] as $user) {
            $this->notification($user, 'new_message', 'Bạn có tin nhắn mới', 'Hội thoại về vị trí '.$job['title'].' vừa được cập nhật.', ['conversation_id' => $conversation, 'application_id' => $application, 'job_id' => $job['id']], $last, $ordinal % 3 === 0);
        }
    }

    private function notification(int $user, string $type, string $title, string $content, array $data, Carbon $at, bool $read): void
    {
        $this->writer->add('notifications', [
            'user_id' => $user, 'type' => $type, 'title' => $title, 'content' => $content,
            'data' => DemoWriter::json($data), 'read_at' => $read ? $at->copy()->addMinutes(5) : null, 'created_at' => $at,
        ]);
    }

    private function reports(array $actors, array $groups, Carbon $now): void
    {
        $n = 0;
        foreach ($groups as $jobs) {
            foreach ($jobs as $job) {
                if ($n++ % 4 !== 0) {
                    continue;
                }
                $status = ['pending', 'resolved', 'dismissed'][intdiv($n - 1, 4) % 3];
                $at = $now->copy()->subHours(12 + $n % 24);
                $at = $at->max($job['created_at']->copy()->addHour());
                $this->writer->add('job_reports', [
                    'job_id' => $job['id'], 'reporter_id' => $actors['candidates'][$n % count($actors['candidates'])]['user_id'],
                    'reason' => ['Thông tin chưa rõ ràng', 'Nội dung không nhất quán', 'Nghi vấn yêu cầu chi phí'][intdiv($n - 1, 4) % 3],
                    'details' => '[Báo cáo demo] Đề nghị kiểm tra cách mô tả quyền lợi và thông tin liên hệ của vị trí '.$job['title'].'. Đây là tình huống giả lập để kiểm tra luồng quản trị.',
                    'status' => $status, 'reviewed_by' => $status === 'pending' ? null : $actors['admins'][$n % 3],
                    'reviewed_at' => $status === 'pending' ? null : $at->copy()->addHour(), 'created_at' => $at, 'updated_at' => $at->copy()->addHour(),
                ]);
                if ($status === 'pending') {
                    DB::table('jobs')->where('id', $job['id'])->update(['is_reported' => true]);
                }
            }
        }
    }
}
