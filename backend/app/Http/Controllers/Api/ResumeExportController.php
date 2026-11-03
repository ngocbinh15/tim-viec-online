<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Resumes\CreateResumeExportRequest;
use App\Http\Resources\ResumeExportResource;
use App\Models\ResumeExport;
use App\Services\Resumes\ResumeExportService;
use App\Services\Resumes\ResumeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ResumeExportController extends Controller
{
    public function store(CreateResumeExportRequest $request, int $id, ResumeService $resumes, ResumeExportService $exports)
    {
        $export = $exports->request($resumes->owned($request->user(), $id), $request->integer('revision'));

        return response()->json(['success' => true, 'data' => new ResumeExportResource($export)], $export->status === 'ready' ? 200 : 202);
    }

    private function owned(Request $request, int $id): ResumeExport
    {
        return ResumeExport::whereHas('resume', fn ($q) => $q->where('candidate_id', $request->user()->candidateProfile?->id))->findOrFail($id);
    }

    public function show(Request $request, int $id)
    {
        return response()->json(['success' => true, 'data' => new ResumeExportResource($this->owned($request, $id))]);
    }

    public function file(Request $request, int $id)
    {
        $export = $this->owned($request, $id);
        if ($export->status !== 'ready') {
            return response()->json(['success' => false, 'message' => 'Bản PDF chưa sẵn sàng.'], 409);
        }
        if (! $export->path || ! Storage::disk('private')->exists($export->path)) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy bản PDF. Vui lòng xuất lại CV.'], 404);
        }

        return Storage::disk('private')->response($export->path, $export->downloadName(), ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
