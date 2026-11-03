<?php

namespace Database\Seeders;

use Database\Seeders\Demo\DemoDataset;
use Database\Seeders\Demo\DemoOptions;
use Illuminate\Database\Seeder;

class LargeDemoSeeder extends Seeder
{
    public function run(): void
    {
        app(DemoDataset::class)->seed(DemoOptions::preset('large'), (string) config('demo.seed_password', ''));
    }
}
