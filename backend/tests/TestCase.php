<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function refreshApplication(): void
    {
        parent::refreshApplication();
        // Existing analysis contract tests opt in; runtime defaults to deferred.
        config(['ai.enabled' => true, 'ai.provider' => 'gemini', 'services.gemini.enabled' => true]);

        // This runs before RefreshDatabase and its migrate:fresh operation.
        $expected = (string) env('TEST_DB_NAME', 'tim_viec_online_test');
        $connection = $this->app['config']->get('database.connections.mysql', []);

        if (! $this->app->environment('testing')
            || $this->app['config']->get('database.default') !== 'mysql'
            || ! preg_match('/^[a-zA-Z0-9_]+_test$/', $expected)
            || ($connection['database'] ?? null) !== $expected
            || ! empty($connection['url'])) {
            throw new \RuntimeException(
                'Backend tests require an isolated MySQL database ending in _test. '
                .'Set DB_DATABASE and TEST_DB_NAME to the same disposable database, '
                .'remove DB_URL, and clear cached application configuration before testing.'
            );
        }
    }
}
