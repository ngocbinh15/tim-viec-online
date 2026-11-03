<?php

namespace App\Console\Commands;

use App\Services\DemoCompanyImportService;
use Illuminate\Console\Command;

class ImportRealDemoCompanies extends Command
{
    protected $signature = 'demo:companies {--dry-run : Chỉ kiểm tra catalog và số công ty được cập nhật}';

    protected $description = 'Thay hồ sơ công ty seed bằng thông tin công khai có nguồn, giữ nguyên liên kết nghiệp vụ';

    public function handle(DemoCompanyImportService $service): int
    {
        $result = $service->import((bool) $this->option('dry-run'));
        $this->table(['Khớp công ty demo', 'Đã cập nhật', 'Đã có hồ sơ này'], [array_values($result)]);
        $this->info($this->option('dry-run') ? 'Không thay đổi database hoặc storage.' : 'Đã cập nhật hồ sơ tham khảo. Các tài khoản và tin tuyển dụng vẫn là dữ liệu demo.');

        return self::SUCCESS;
    }
}
