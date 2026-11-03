<?php

namespace Tests\Unit;

use Fruitcake\Cors\CorsService;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;

class CorsConfigurationTest extends TestCase
{
    #[DataProvider('originCases')]
    #[RunInSeparateProcess]
    #[PreserveGlobalState(false)]
    public function test_cors_allows_only_environment_appropriate_origins(
        ?string $environment,
        string $frontend,
        array $allowed,
        array $denied,
    ): void {
        // Laravel's environment repository is immutable; each case runs in its
        // own process with real environment values, without leaking to the suite.
        foreach (['APP_ENV' => $environment, 'FRONTEND_URL' => $frontend] as $key => $value) {
            if ($value === null) {
                unset($_ENV[$key], $_SERVER[$key]);
                putenv($key);
            } else {
                $_ENV[$key] = $_SERVER[$key] = $value;
                putenv($key.'='.$value);
            }
        }
        $config = require __DIR__.'/../../config/cors.php';
        $cors = new CorsService($config);

        $this->assertSame($allowed, $config['allowed_origins']);
        foreach ($allowed as $origin) {
            $this->assertTrue($cors->isOriginAllowed($this->requestFrom($origin)), $origin);
        }
        foreach ($denied as $origin) {
            $this->assertFalse($cors->isOriginAllowed($this->requestFrom($origin)), $origin);
        }
    }

    public static function originCases(): array
    {
        $canonical = 'https://jobs.example.test';
        $local = ['http://localhost:3000', 'http://127.0.0.1:3000'];
        $untrusted = ['https://evil.test', 'http://localhost:4000', 'https://random.ngrok-free.dev'];

        return [
            'production' => ['production', $canonical, [$canonical], [...$local, ...$untrusted]],
            'staging' => ['staging', $canonical, [$canonical], [...$local, ...$untrusted]],
            'testing' => ['testing', $canonical, [$canonical], [...$local, ...$untrusted]],
            'unspecified environment' => [null, $canonical, [$canonical], [...$local, ...$untrusted]],
            'local development' => ['local', $canonical, [$canonical, ...$local], $untrusted],
            'local origins deduplicated' => ['local', $local[0], $local, $untrusted],
            'explicit loopback production frontend' => ['production', $local[0], [$local[0]], [$local[1], ...$untrusted]],
        ];
    }

    private function requestFrom(string $origin): Request
    {
        return Request::create('https://api.example.test/api/categories', 'OPTIONS', server: [
            'HTTP_ORIGIN' => $origin,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);
    }
}
