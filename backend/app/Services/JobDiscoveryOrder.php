<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;

final class JobDiscoveryOrder
{
    public function apply(Builder $query): void
    {
        // Rank the complete filtered result before pagination. Each company gets
        // one listing per round, with its most recently bumped listing first.
        $ranked = (clone $query)->reorder()->setEagerLoads([])
            ->select('jobs.id as discovery_job_id')
            ->selectRaw('ROW_NUMBER() OVER (PARTITION BY jobs.company_id ORDER BY jobs.updated_at DESC, MD5(jobs.id), jobs.id DESC) AS company_position');

        $query->joinSub($ranked, 'discovery_order', 'jobs.id', '=', 'discovery_order.discovery_job_id')
            ->select('jobs.*')
            ->orderBy('discovery_order.company_position')
            ->orderByDesc('jobs.updated_at')
            // Shuffle equal-time companies deterministically. Unlike RAND(),
            // every page/request uses the same sequence for the same dataset.
            ->orderByRaw('MD5(jobs.company_id)')
            ->orderByDesc('jobs.id');
    }
}
