<?php

namespace Database\Seeders\Demo;

use Carbon\Carbon;

final class DemoVacancies
{
    public function __construct(private DemoWriter $writer) {}

    public function create(DemoOptions $options, array $catalog, array $companies, Carbon $now): array
    {
        $jobs = [];
        foreach ($companies as $c => $company) {
            $sector = $catalog[$company['sector']];
            for ($n = 0; $n < $options->jobsPerEmployer; $n++) {
                $i = $c * $options->jobsPerEmployer + $n;
                $status = $n % 8 === 6 ? 'closed' : ($n % 8 === 7 || ($options->jobsPerEmployer < 8 && $n === 5) ? 'expired' : ($n === 4 ? 'closed' : 'active'));
                $type = ['full_time', 'full_time', 'remote', 'part_time', 'internship'][$i % 5];
                $level = $type === 'internship' ? 'Intern' : ['Junior', 'Middle', 'Senior', 'Lead'][$i % 4];
                $title = $sector['roles'][$n % count($sector['roles'])].' — '.$level;
                $min = $type === 'internship' ? 3000000 + $i % 3 * 1000000 : 8000000 + ($i % 13) * 2000000;
                $salary = $i % 3;
                $age = 2 + ($i * 17) % 175;
                $created = $now->copy()->subDays($age)->subHours($i % 12);
                $deadline = $status === 'expired' ? $now->copy()->subDays(1 + $i % min(30, $age - 1)) : $now->copy()->addDays(7 + $i % 55);
                $skills = array_keys($sector['skills']);
                $skills = array_slice($skills, 0, min(8, 4 + $i % 5));
                $description = "Về vị trí\nBạn sẽ đồng hành cùng ".$company['name'].' trong lĩnh vực '.$sector['name'].".\n\nTrách nhiệm chính\n- ".ucfirst($sector['task']).".\n- Phối hợp với các bộ phận để xác định yêu cầu, thống nhất kế hoạch và theo dõi tiến độ.\n- Kiểm tra chất lượng, ghi nhận kết quả và đề xuất cải tiến dựa trên số liệu.\n- Tham gia họp nhóm hàng tuần, chia sẻ chuyên môn và hỗ trợ đồng nghiệp.\n\nSản phẩm bàn giao\nBáo cáo tiến độ rõ ràng, hồ sơ công việc đầy đủ và kết quả đáp ứng tiêu chuẩn của nhóm.";
                $id = $this->writer->one('jobs', [
                    'company_id' => $company['id'], 'category_id' => $sector['id'], 'title' => $title,
                    'job_level' => $level, 'quantity' => 1 + $i % 8, 'description' => $description,
                    'requirements' => '- Có kiến thức hoặc kinh nghiệm phù hợp với vị trí '.$sector['roles'][$n % 3].".\n- Sử dụng được ".implode(', ', $skills).".\n- Có khả năng phối hợp, quản lý thời gian và trình bày kết quả công việc.\n- ".($type === 'internship' ? 'Chấp nhận sinh viên năm cuối, có người hướng dẫn trong quá trình thực tập.' : 'Ưu tiên '.(1 + $i % 5).' năm kinh nghiệm hoặc có dự án thể hiện năng lực tương đương.')."\n- Sẵn sàng học hỏi và chủ động báo cáo khi phát sinh vấn đề.",
                    'benefits' => "- Thu nhập tương xứng năng lực, đánh giá định kỳ theo kết quả công việc.\n- Bảo hiểm và chế độ nghỉ phép theo quy định áp dụng cho hợp đồng.\n- Được đào tạo nội bộ, hướng dẫn hội nhập và hỗ trợ phát triển chuyên môn.\n- Môi trường trao đổi cởi mở, thiết bị làm việc phù hợp.\nLưu ý: đây là tin thuộc bộ seed demo, không phải lời mời tuyển dụng thật.",
                    'salary_min' => $salary === 2 ? null : $min, 'salary_max' => $salary === 0 ? $min + 5000000 + $i % 4 * 1000000 : null,
                    'is_negotiable' => $salary === 2, 'job_type' => $type, 'city' => $company['city'],
                    'address' => (20 + $c).' đường Trần Phú, '.$company['city'], 'deadline' => $deadline->toDateString(),
                    'status' => $status, 'is_reported' => false, 'rejection_reason' => null, 'views_count' => 30 + ($i * 37) % 9000,
                    'created_at' => $created, 'updated_at' => $now->copy()->subHours(1 + $i % 300)->max($created),
                ]);
                foreach ($skills as $skill) {
                    $this->writer->add('job_skills', ['job_id' => $id, 'skill_id' => $sector['skills'][$skill]]);
                }
                $jobs[$company['sector']][] = ['id' => $id, 'company' => $company, 'title' => $title, 'status' => $status, 'created_at' => $created, 'deadline' => $deadline, 'skills' => $skills];
            }
        }

        return $jobs;
    }
}
