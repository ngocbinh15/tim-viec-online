<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Resumes\UploadResumeAssetRequest;
use App\Http\Resources\ResumeAssetResource;
use App\Services\Resumes\ResumeAssetStorage;
use App\Services\Resumes\ResumeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ResumeAssetController extends Controller
{
    public function store(UploadResumeAssetRequest $request, int $id, ResumeService $resumes, ResumeAssetStorage $assets)
    {
        ResumeService::enabled();
        $resume = $resumes->owned($request->user(), $id);
        $asset = $assets->store($resume, $request->file('image')->get());

        return response()->json(['success' => true, 'data' => new ResumeAssetResource($asset)], 201);
    }

    public function show(Request $request, int $id, int $assetId, ResumeService $resumes)
    {
        $asset = $resumes->owned($request->user(), $id)->assets()->findOrFail($assetId);
        abort_unless(Storage::disk('private')->exists($asset->path), 404);

        return Storage::disk('private')->response($asset->path, null, ['Content-Type' => $asset->mime_type, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
