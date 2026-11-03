<?php

namespace App\Console\Commands;

use Database\Seeders\Demo\DemoDataset;
use Database\Seeders\Demo\DemoOptions;
use Illuminate\Console\Command;

class SeedDemo extends Command
{
    protected $signature = 'demo:seed {--preset=large : tiny, medium, large, huge} {--with-ai-fixtures : Thêm điểm AI minh họa, không gọi AI} {--with-runtime : Thêm fixtures vận hành hết hạn/no-op} {--dry-run : Chỉ in quy mô, không ghi dữ liệu}';

    protected $description = 'Tạo bộ dữ liệu tuyển dụng tiếng Việt có quan hệ nhất quán, chỉ local/testing';

    public function handle(DemoDataset $dataset): int
    {
        try {
            if (! app()->environment(['local', 'testing'])) {
                throw new \RuntimeException('Chỉ cho phép tạo seed demo ở local/testing.');
            }
            $options = DemoOptions::preset($this->option('preset'), (bool) $this->option('with-ai-fixtures'), (bool) $this->option('with-runtime'));
            $this->table(['Bảng', 'Số lượng dự kiến'], array_map(fn ($name, $count) => [$name, $count], array_keys($options->estimate()), array_values($options->estimate())));
            if ($this->option('dry-run')) {
                $this->info('Dry-run: không thay đổi database hoặc file. Không gửi email, Reverb hay gọi AI.');

                return self::SUCCESS;
            }
            $password = (string) config('demo.seed_password', '');
            if ($password === '') {
                throw new \RuntimeException('Đặt DEMO_SEED_PASSWORD trong backend/.env trước khi seed. Không truyền mật khẩu qua command line.');
            }
            $report = $dataset->seed($options, $password, fn ($message) => $this->line($message));
            $this->table(['Bảng', 'Số bản ghi seed'], array_map(fn ($name, $count) => [$name, $count], array_keys($report['counts']), array_values($report['counts'])));
            $this->info($report['already_seeded'] ? 'Bộ dữ liệu đã tồn tại: không ghi đè hoặc tạo trùng.' : 'Đã tạo bộ seed. Mật khẩu là DEMO_SEED_PASSWORD bạn đã cấu hình.');
            $this->line('Ứng viên: candidate.00001@demo.timviec.test | Nhà tuyển dụng: employer.00001@demo.timviec.test | Admin: admin@demo.timviec.test');

            return self::SUCCESS;
        } catch (\InvalidArgumentException|\RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
