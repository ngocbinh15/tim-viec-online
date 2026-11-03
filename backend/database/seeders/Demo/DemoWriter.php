<?php

namespace Database\Seeders\Demo;

use Illuminate\Support\Facades\DB;

final class DemoWriter
{
    public array $counts = [];

    private array $buffers = [];

    public function one(string $table, array $row): int
    {
        $id = DB::table($table)->insertGetId($row);
        $this->counts[$table] = ($this->counts[$table] ?? 0) + 1;

        return $id;
    }

    public function add(string $table, array $row): void
    {
        $this->buffers[$table][] = $row;
        if (count($this->buffers[$table]) >= 400) {
            $this->flush($table);
        }
    }

    public function flush(?string $table = null): void
    {
        foreach ($table ? [$table] : array_keys($this->buffers) as $name) {
            $rows = $this->buffers[$name] ?? [];
            if ($rows) {
                DB::table($name)->insert($rows);
                $this->counts[$name] = ($this->counts[$name] ?? 0) + count($rows);
                $this->buffers[$name] = [];
            }
        }
    }

    public static function json(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }
}
