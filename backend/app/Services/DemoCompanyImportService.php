<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class DemoCompanyImportService
{
    public const CATALOG = 'database/seeders/data/real-companies/catalog.json';

    public function import(bool $dryRun = false): array
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Chỉ cập nhật hồ sơ tham khảo ở local/testing.');
        }
        $directory = base_path(dirname(self::CATALOG));
        $catalog = json_decode(file_get_contents(base_path(self::CATALOG)), true, 512, JSON_THROW_ON_ERROR);
        $profiles = [];
        foreach ($catalog['companies'] as $profile) {
            $key = $profile['key'];
            if (isset($profiles[$key]) || ! preg_match('/^[a-z0-9-]+$/', $key)
                || ! str_starts_with($profile['website'], 'https://')
                || ! str_starts_with($profile['sources']['profile_url'], 'https://')) {
                throw new \RuntimeException('Catalog doanh nghiệp không hợp lệ.');
            }
            $asset = $directory.'/logos/'.$key.'.png';
            $image = is_file($asset) ? getimagesize($asset) : false;
            if (! $image || $image[2] !== IMAGETYPE_PNG || filesize($asset) > 2 * 1024 * 1024
                || ! hash_equals($profile['sources']['logo_sha256'], hash_file('sha256', $asset))) {
                throw new \RuntimeException('Ảnh catalog thiếu hoặc không đúng checksum: '.$key);
            }
            $profiles[$key] = $profile + ['asset' => $asset];
        }
        $companies = DB::table('companies as c')->join('users as u', 'u.id', '=', 'c.user_id')
            ->select('c.*', 'u.email')->where('u.role', 'employer')->orderBy('c.id')->get();
        $targets = [];
        foreach ($companies as $company) {
            if (preg_match('/^employer\.(\d{5})@demo\.timviec\.test$/', $company->email, $match)) {
                $index = (int) $match[1] - 1;
                $key = $catalog['seed_mapping'][$index] ?? null;
            } elseif ($company->email === 'employer@timviec.vn' && $company->name === 'FPT Software') {
                $key = $catalog['legacy_profile'];
            } else {
                continue;
            }
            if (! $key || ! isset($profiles[$key])) {
                throw new \RuntimeException('Không có hồ sơ thật cho công ty demo #'.$company->id);
            }
            $targets[] = [$company, $profiles[$key]];
        }
        if ($dryRun) {
            return ['matched' => count($targets), 'updated' => 0, 'skipped' => 0];
        }
        $lock = 'real-companies:'.substr(hash('sha256', DB::connection()->getDatabaseName()), 0, 32);
        if ((int) DB::selectOne('SELECT GET_LOCK(?, 0) AS acquired', [$lock])->acquired !== 1) {
            throw new \RuntimeException('Đang có một lượt cập nhật doanh nghiệp khác.');
        }
        try {
            foreach ($targets as [$company, $profile]) {
                $path = 'company_logos/real/'.$profile['key'].'.png';
                if (! Storage::disk('public')->put($path, file_get_contents($profile['asset']))) {
                    throw new \RuntimeException('Không lưu được ảnh doanh nghiệp.');
                }
            }

            return DB::transaction(function () use ($targets) {
                $updated = 0;
                $skipped = 0;
                foreach ($targets as [$company, $profile]) {
                    $sources = $company->reference_sources ? json_decode($company->reference_sources, true) : [];
                    $path = 'company_logos/real/'.$profile['key'].'.png';
                    if (($sources['catalog_key'] ?? null) === $profile['key']) {
                        if (($sources['logo_sha256'] ?? null) !== $profile['sources']['logo_sha256'] && $company->avatar === $path) {
                            DB::table('companies')->where('id', $company->id)->update([
                                'reference_sources' => json_encode(['catalog_key' => $profile['key'], ...$profile['sources']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                            ]);
                            $updated++;

                            continue;
                        }
                        $skipped++;

                        continue;
                    }
                    DB::table('companies')->where('id', $company->id)->update([
                        'name' => $profile['name'], 'website' => $profile['website'],
                        'logo' => $path, 'avatar' => $path,
                        'description' => $profile['description'], 'company_size' => $profile['company_size'],
                        'city' => $profile['city'], 'address' => $profile['address'], 'is_demo' => true,
                        'reference_sources' => json_encode(['catalog_key' => $profile['key'], ...$profile['sources']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                        'updated_at' => now(),
                    ]);
                    // Only rewrite known synthetic content. Application/CV/chat foreign keys stay intact.
                    $this->replace('jobs', 'description', $company->name, $profile['name'], function ($query) use ($company) {
                        $query->where('company_id', $company->id)->where('benefits', 'like', '%tin thuộc bộ seed demo%');
                    });
                    $this->replace('applications', 'cover_letter', $company->name, $profile['name'], function ($query) use ($company) {
                        $query->whereIn('job_id', DB::table('jobs')->where('company_id', $company->id)->select('id'))
                            ->where('cover_letter', 'like', '%[Hồ sơ demo minh họa]%');
                    });
                    $this->replace('notifications', 'content', $company->name, $profile['name'], function ($query) {
                        $query->whereIn('user_id', DB::table('users')->where('email', 'like', '%@demo.timviec.test')->select('id'));
                    });
                    $updated++;
                }

                return ['matched' => count($targets), 'updated' => $updated, 'skipped' => $skipped];
            });
        } finally {
            DB::selectOne('SELECT RELEASE_LOCK(?)', [$lock]);
        }
    }

    private function replace(string $table, string $column, string $before, string $after, callable $scope): void
    {
        if ($before === $after || $before === '') {
            return;
        }
        $query = DB::table($table)->where($column, 'like', '%'.$before.'%');
        $scope($query);
        // Table/column names are internal constants; names and IDs always use bindings.
        foreach ($query->pluck('id')->chunk(500) as $ids) {
            DB::update(
                'UPDATE '.$table.' SET '.$column.' = REPLACE('.$column.', ?, ?) WHERE id IN ('.implode(',', array_fill(0, $ids->count(), '?')).')',
                [$before, $after, ...$ids->all()],
            );
        }
    }
}
