<?php

namespace Database\Seeders\Demo;

use Carbon\Carbon;

final class DemoPeople
{
    public function __construct(private DemoWriter $writer, private DemoAssets $assets) {}

    public function create(DemoOptions $options, array $catalog, string $hash, Carbon $now): array
    {
        $cities = DemoCatalog::cities();
        $admins = [];
        $companies = [];
        $candidates = [];
        $users = [];
        for ($i = 0; $i < 3; $i++) {
            $id = $this->user('admin', $i, $hash, $now);
            $admins[] = $id;
            $users[] = $id;
        }
        for ($i = 0; $i < $options->employers; $i++) {
            $user = $this->user('employer', $i, $hash, $now);
            $sector = $i % count($catalog);
            $city = $cities[$i % count($cities)];
            $name = DemoCatalog::company($i);
            $id = $this->writer->one('companies', [
                'user_id' => $user, 'name' => $name, 'logo' => $this->assets->company($i),
                'website' => 'https://company-'.($i + 1).'.example.test',
                'company_size' => ['10-50', '50-100', '100-500', '500-1000', '1000+'][$i % 5],
                'address' => (20 + $i).' đường '.['Nguyễn Văn Linh', 'Trần Phú', 'Lê Lợi', 'Hai Bà Trưng'][$i % 4].', '.$city,
                'city' => $city,
                'description' => $name.' hoạt động trong lĩnh vực '.$catalog[$sector]['name'].".\nĐội ngũ tập trung xây dựng dịch vụ có chất lượng, phát triển con người và cải tiến quy trình. Chúng tôi cung cấp chương trình hội nhập, đào tạo chuyên môn, bảo hiểm và môi trường hợp tác.\nĐây là doanh nghiệp hư cấu trong bộ dữ liệu demo, không phải tin tuyển dụng có thật.",
                'created_at' => $now->copy()->subDays(300 + $i % 50), 'updated_at' => $now->copy()->subDays($i % 20),
            ]);
            $companies[] = ['id' => $id, 'user_id' => $user, 'sector' => $sector, 'city' => $city, 'name' => $name];
            $users[] = $user;
        }
        for ($i = 0; $i < $options->candidates; $i++) {
            $user = $this->user('candidate', $i, $hash, $now);
            // Small presets use only sectors with a company, keeping all applications relevant.
            $sector = $i % min(count($catalog), $options->employers);
            $info = $catalog[$sector];
            $skills = array_keys($info['skills']);
            $skills = array_slice($skills, 0, min(10, 3 + $i % 8));
            $years = $i % 13;
            $title = $info['roles'][intdiv($i, count($catalog)) % count($info['roles'])];
            $name = DemoCatalog::name($i);
            $city = $cities[($i * 7) % count($cities)];
            $id = $this->writer->one('candidate_profiles', [
                'user_id' => $user, 'title' => $title, 'experience_years' => $years,
                'bio' => 'Tôi quan tâm đến '.$info['name'].' và có '.$years.' năm kinh nghiệm. Thế mạnh của tôi là '.implode(', ', array_slice($skills, 0, 3)).'. Tôi mong muốn tham gia đội ngũ có lộ trình phát triển rõ ràng, cùng cải thiện chất lượng sản phẩm và dịch vụ. Hồ sơ minh họa, không phải người thật.',
                'avatar' => $this->assets->portrait($i), 'address' => (10 + $i % 180).' đường Nguyễn Trãi, '.$city,
                'city' => $city, 'cv_file_path' => $this->assets->cv($i, $name, $title, $skills, $years),
                'social_links' => DemoWriter::json(['linkedin' => 'https://www.example.test/profiles/candidate-'.($i + 1)]),
                'created_at' => $now->copy()->subDays(250 + $i % 50), 'updated_at' => $now->copy()->subDays($i % 15),
            ]);
            foreach ($skills as $skill) {
                $this->writer->add('candidate_skills', ['candidate_id' => $id, 'skill_id' => $info['skills'][$skill]]);
            }
            $candidates[] = ['id' => $id, 'user_id' => $user, 'sector' => $sector, 'name' => $name, 'title' => $title, 'skills' => $skills];
            $users[] = $user;
        }

        return compact('admins', 'companies', 'candidates', 'users');
    }

    private function user(string $role, int $index, string $hash, Carbon $now): int
    {
        $email = $role === 'admin' && $index === 0 ? 'admin@demo.timviec.test' : $role.'.'.sprintf('%05d', $index + 1).'@demo.timviec.test';

        return $this->writer->one('users', [
            'name' => $role === 'admin' ? ['Quản Trị Viên', 'Nguyễn Minh Quản', 'Trần Thu Quản'][$index] : DemoCatalog::name($index + ($role === 'employer' ? 1600 : 0)),
            'email' => $email, 'password' => $hash, 'phone' => '09'.sprintf('%08d', 10000000 + $index + ($role === 'employer' ? 20000 : 0)),
            'dob' => $now->copy()->subYears(22 + $index % 24)->subDays($index % 365)->toDateString(),
            'role' => $role, 'status' => $index > 2 && $index % 29 === 0 && $role !== 'admin' ? 'locked' : 'active',
            'failed_attempts' => 0, 'locked_until' => null, 'email_verified_at' => $now->copy()->subDays(340),
            'created_at' => $now->copy()->subDays(350 + $index % 30), 'updated_at' => $now->copy()->subDays($index % 25),
        ]);
    }
}
