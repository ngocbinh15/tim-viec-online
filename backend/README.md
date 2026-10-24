# TimViecOnline Backend API

Laravel 11 API for the job-search coursework project. This repository contains backend routes and business logic; see the root [SRS](../docs/SRS.md), [Backend Guide](../BACKEND_GUIDE.md), [Testing Guide](../BACKEND_TESTING_GUIDE.md), and [API Checklist](../API_CHECKLIST.md).

## Current implementation status

Backend has auth, profiles/files, company/job CRUD/search, applications, queued AI analysis, chat, notifications, admin moderation, job reports, migrations, and API validation. The frontend in this checkout is still the default Next.js starter page, so the complete user-facing product is not implemented. External mail, Gemini, Reverb, production CV migration, performance, and uptime have not been verified here.

## Local setup

Requires PHP 8.2+, Composer, MySQL/MariaDB with PDO MySQL, and fileinfo.

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Set local `DB_*` values and create a fresh development database. Then:

```powershell
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000
```

`migrate:fresh` drops all tables; only use it on a disposable dev/test database. `DatabaseSeeder` seeds categories and skills. To create a local admin, set `ADMIN_EMAIL` and a password of at least 12 characters in `.env` before seeding; the seeder will not promote an existing non-admin account. Do not depend on SQL dump demo credentials in production.

For background AI and realtime features, run separate processes:

```powershell
php artisan queue:work --tries=2 --timeout=60
php artisan reverb:start
php artisan schedule:work
```

Configure `GEMINI_API_KEY`, `GEMINI_MODEL`, SMTP/mail and Reverb in `.env` only when those integrations are required. Queue worker is required for database queue processing; scheduler marks expired job listings.

## Safe verification

```powershell
php artisan route:list --path=api
php artisan migrate:status
php artisan test
composer validate --no-check-publish
```

The current PHPUnit suite is only Laravel example tests, not FR acceptance coverage. Do not run `test_all_backend.php`: it can mutate/delete accounts, jobs, and tokens and is not isolated. Do not run migrations against a database with data that must be preserved.

The SQL file `../db/tim_viec_online.sql` is a standalone demo import and includes demo accounts; rotate/remove them before any shared deployment. New CVs and chat images are private. Before retiring legacy public uploads, back up the database/storage and run `php artisan storage:secure-legacy-cvs` to copy and verify; use `--delete-source` only after reviewing results.
