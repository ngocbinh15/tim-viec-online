<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Công nghệ thông tin / Phần mềm',
            'Marketing & Truyền thông số',
            'Kế toán & Tài chính doanh nghiệp',
            'Thiết kế đồ họa & UI/UX',
            'Quản trị nhân sự & Hành chính',
            'Kinh doanh & Bán hàng (Sales)',
            'Chăm sóc khách hàng (CSKH)',
            'Logistics & Xuất nhập khẩu',
            'Ngân hàng & Bảo hiểm',
            'Giáo dục & Đào tạo',
        ];

        foreach ($categories as $name) {
            Category::firstOrCreate(['name' => $name]);
        }
    }
}
