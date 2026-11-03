<?php

namespace Database\Seeders\Demo;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class DemoDataset
{
    public function seed(DemoOptions $options, string $password, ?callable $progress = null): array
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Bộ seed demo chỉ được chạy ở local/testing.');
        }
        if (strlen($password) < 12 || strlen($password) > 32 || ! preg_match('/[a-z]/', $password)
            || ! preg_match('/[A-Z]/', $password) || ! preg_match('/[0-9]/', $password) || ! preg_match('/[^a-zA-Z0-9\s]/', $password)) {
            throw new \InvalidArgumentException('DEMO_SEED_PASSWORD phải dài 12–32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
        }
        $lock = 'demo-seed:'.substr(hash('sha256', DB::connection()->getDatabaseName()), 0, 32);
        if ((int) DB::selectOne('SELECT GET_LOCK(?, 0) AS acquired', [$lock])->acquired !== 1) {
            throw new \RuntimeException('Một lượt seed khác đang chạy trên database này.');
        }
        try {
            return DB::transaction(function () use ($options, $password, $progress) {
                $previous = DB::table('demo_seed_runs')->where('run_key', DemoOptions::RUN)->first();
                if ($previous) {
                    if (json_decode($previous->options, true) != $options->toArray()) {
                        throw new \RuntimeException('Bộ demo đã tồn tại với cấu hình khác. Không ghi đè dữ liệu; hãy dùng database demo riêng cho preset mới.');
                    }

                    return ['already_seeded' => true, 'counts' => json_decode($previous->counts, true)];
                }
                if (DB::table('users')->where('email', 'like', '%@demo.timviec.test')->exists()) {
                    throw new \RuntimeException('Có tài khoản trong namespace demo.timviec.test nhưng không có manifest seed. Dừng để tránh ghi đè tài khoản.');
                }
                $writer = new DemoWriter;
                $assets = new DemoAssets;
                $anchor = now()->startOfMinute();
                $progress && $progress('Chuẩn bị danh mục và kỹ năng');
                $catalog = [];
                foreach (DemoCatalog::sectors() as [$name, $roles, $skills, $task]) {
                    $category = DB::table('categories')->where('name', $name)->value('id');
                    $category ??= $writer->one('categories', ['name' => $name]);
                    $skillIds = [];
                    foreach (array_unique([...$skills, 'Làm việc nhóm (Teamwork)', 'Quản lý thời gian', 'Tiếng Anh giao tiếp']) as $skill) {
                        $id = DB::table('skills')->where('name', $skill)->value('id');
                        $id ??= $writer->one('skills', ['name' => $skill]);
                        $skillIds[$skill] = (int) $id;
                    }
                    $catalog[] = ['id' => (int) $category, 'name' => $name, 'roles' => $roles, 'skills' => $skillIds, 'task' => $task];
                }
                $actors = (new DemoPeople($writer, $assets))->create($options, $catalog, Hash::make($password), $anchor);
                $progress && $progress('Tạo tin tuyển dụng theo ngành và địa phương');
                $jobs = (new DemoVacancies($writer))->create($options, $catalog, $actors['companies'], $anchor);
                $writer->flush();
                $progress && $progress('Tạo đơn ứng tuyển, bản CV đã nộp, chat và thông báo');
                (new DemoRecruitment($writer, $assets))->create($options, $catalog, $actors, $jobs, $anchor);
                $writer->flush();
                if ($options->runtimeFixtures) {
                    $progress && $progress('Thêm fixtures vận hành hết hạn và queue no-op riêng');
                    (new DemoRuntime($writer))->create($actors, $anchor);
                    $writer->flush();
                }
                $counts = $writer->counts;
                $counts['demo_seed_runs'] = 1;
                foreach (['ai_cv_analyses', 'queue_jobs', 'sessions', 'personal_access_tokens', 'password_reset_tokens', 'cache', 'cache_locks', 'job_batches', 'failed_jobs'] as $table) {
                    $counts[$table] ??= 0;
                }
                DB::table('demo_seed_runs')->insert(['run_key' => DemoOptions::RUN, 'options' => DemoWriter::json($options->toArray()), 'counts' => DemoWriter::json($counts), 'completed_at' => now()]);

                return ['already_seeded' => false, 'counts' => $counts];
            });
        } finally {
            DB::selectOne('SELECT RELEASE_LOCK(?)', [$lock]);
        }
    }
}
