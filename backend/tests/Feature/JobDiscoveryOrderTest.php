<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobDiscoveryOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_batch_listings_mix_companies_with_repeatable_non_overlapping_pages(): void
    {
        $this->freezeTime();
        $category = Category::create(['name' => 'Software']);
        foreach (range(1, 6) as $companyNumber) {
            $company = Company::create([
                'user_id' => User::factory()->create(['role' => 'employer'])->id,
                'name' => 'Company '.$companyNumber,
            ]);
            foreach (range(1, 6) as $jobNumber) {
                $this->job($company, $category, [
                    'city' => $jobNumber === 6 ? 'Da Nang' : 'Ha Noi',
                    'updated_at' => now()->subSeconds($companyNumber),
                ]);
            }
        }

        // Matches homepage (12), search (6), and a narrowed search. The old
        // ID-descending tie break groups the newest company's entire batch.
        $home = $this->getJson('/api/jobs?per_page=12')->assertOk()->json('data');
        $this->assertCount(6, array_unique(array_column(array_slice($home, 0, 6), 'company_id')));
        $first = $this->getJson('/api/jobs?city=Ha Noi&per_page=6')->assertOk()->assertJsonPath('meta.total', 30)->json('data');
        $this->assertCount(6, array_unique(array_column($first, 'company_id')));
        $this->assertSame(array_column($home, 'id'), $this->getJson('/api/jobs?per_page=12')->json('data.*.id'));

        $ids = [];
        foreach (range(1, 5) as $page) {
            $data = $this->getJson('/api/jobs?city=Ha Noi&per_page=6&page='.$page)->assertOk()->json('data');
            $this->assertSame(['Ha Noi'], array_values(array_unique(array_column($data, 'city'))));
            array_push($ids, ...array_column($data, 'id'));
        }
        $this->assertCount(30, array_unique($ids));
        $this->assertSame(array_column($first, 'id'), array_slice($ids, 0, 6));
        $this->assertSame(array_column($home, 'id'), array_merge(
            $this->getJson('/api/jobs?per_page=6')->json('data.*.id'),
            $this->getJson('/api/jobs?per_page=6&page=2')->json('data.*.id'),
        ));
    }

    public function test_bumps_and_explicit_sort_options_keep_their_priority(): void
    {
        $this->freezeTime();
        $category = Category::create(['name' => 'Software']);
        $company = Company::create(['user_id' => User::factory()->create(['role' => 'employer'])->id, 'name' => 'Company']);
        $bumped = $this->job($company, $category, ['created_at' => now()->subDays(10), 'updated_at' => now()]);
        $newest = $this->job($company, $category, ['created_at' => now()->subDay(), 'updated_at' => now()->subDay()]);
        $salary = $this->job($company, $category, ['created_at' => now()->subDays(2), 'updated_at' => now()->subDays(2), 'salary_max' => 90000000]);
        $this->getJson('/api/jobs')->assertOk()->assertJsonPath('data.0.id', $bumped->id);
        $this->getJson('/api/jobs?sort=newest')->assertOk()->assertJsonPath('data.0.id', $newest->id);
        $this->getJson('/api/jobs?sort=salary_desc')->assertOk()->assertJsonPath('data.0.id', $salary->id);
    }

    private function job(Company $company, Category $category, array $overrides = []): Job
    {
        return Job::unguarded(fn () => Job::create(array_merge([
            'company_id' => $company->id, 'category_id' => $category->id,
            'title' => 'Software engineer', 'job_level' => 'Senior', 'quantity' => 1,
            'description' => 'Build applications', 'requirements' => 'PHP', 'benefits' => '',
            'salary_min' => 15000000, 'salary_max' => 25000000, 'is_negotiable' => false,
            'job_type' => 'full_time', 'city' => 'Ha Noi', 'address' => 'Office',
            'deadline' => now()->addDays(30), 'status' => 'active',
            'created_at' => now()->subDays(2), 'updated_at' => now()->subDays(2),
        ], $overrides)));
    }
}
