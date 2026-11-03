<?php

namespace Database\Seeders;

use App\Models\Skill;
use Illuminate\Database\Seeder;

class SkillSeeder extends Seeder
{
    public function run(): void
    {
        $skills = [
            // Lập trình & CNTT
            'PHP',
            'Laravel',
            'JavaScript',
            'TypeScript',
            'ReactJS',
            'NextJS',
            'VueJS',
            'Tailwind CSS',
            'NodeJS',
            'Python',
            'Java',
            'Spring Boot',
            'MySQL',
            'PostgreSQL',
            'Redis',
            'Docker',
            'RESTful API',
            'Git & GitHub',

            // Thiết kế đồ họa & UI/UX
            'Figma / UI Design',
            'Adobe Photoshop',
            'Adobe Illustrator',
            'Wireframing & Prototyping',

            // Marketing & Bán hàng
            'SEO & Content',
            'Google Ads',
            'Facebook Ads',
            'TikTok Marketing',
            'Bán hàng B2B / B2C',
            'Telesales & CSKH',

            // Kế toán & Quản trị
            'Kế toán doanh nghiệp',
            'Phần mềm MISA',
            'Microsoft Excel nâng cao',
            'Power BI & Phân tích dữ liệu',
            'Quản trị nhân sự (HRM)',

            // Kỹ năng mềm & Ngôn ngữ
            'Tiếng Anh giao tiếp',
            'Tiếng Anh thương mại',
            'Kỹ năng thuyết trình & Đàm phán',
            'Làm việc nhóm (Teamwork)',
            'Quản lý thời gian',
        ];

        foreach ($skills as $name) {
            Skill::firstOrCreate(['name' => $name]);
        }
    }
}
