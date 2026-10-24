<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = mb_strtolower(trim((string) env('ADMIN_EMAIL', '')));
        $password = (string) env('ADMIN_PASSWORD', '');
        if ($email === '' || $password === '') {
            $this->command?->info('Admin seed skipped; set ADMIN_EMAIL and ADMIN_PASSWORD to create a local admin.');
            return;
        }

        if (strlen($password) < 12) {
            $this->command?->error('Admin seed skipped: ADMIN_PASSWORD must contain at least 12 characters.');
            return;
        }

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => trim((string) env('ADMIN_NAME', 'System Administrator')),
                'password' => Hash::make($password),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        if ($user->role !== 'admin') {
            $this->command?->warn('Admin seed did not change the role of an existing non-admin account.');
            return;
        }

        $this->command?->info('Local admin account is ready.');
    }
}
