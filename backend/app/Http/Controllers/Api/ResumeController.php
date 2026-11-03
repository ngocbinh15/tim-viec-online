<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Resumes\DuplicateResumeRequest;
use App\Http\Requests\Resumes\IndexResumeRequest;
use App\Http\Requests\Resumes\StoreResumeRequest;
use App\Http\Requests\Resumes\UpdateResumeRequest;
use App\Http\Resources\ResumeDetailResource;
use App\Http\Resources\ResumeSummaryResource;
use App\Services\Resumes\ResumeSchema;
use App\Services\Resumes\ResumeService;
use App\Services\Resumes\ResumeStarter;
use Illuminate\Http\Request;

class ResumeController extends Controller
{
    public function __construct(private ResumeService $service) {}

    public function templates()
    {
        return response()->json(['success' => true, 'data' => array_map(fn ($key) => ['key' => $key, 'version' => 1], ResumeSchema::TEMPLATES), 'sample_document' => ResumeStarter::document(), 'meta' => ['enabled' => (bool) config('resumes.enabled')]]);
    }

    public function index(IndexResumeRequest $request)
    {
        $result = $this->service->owner($request->user())->resumes()->with(['exports' => fn ($q) => $q->latest('id')->limit(1)])->orderByDesc('updated_at')->orderByDesc('id')->paginate($request->integer('per_page', 12));

        return response()->json(['success' => true, 'data' => ResumeSummaryResource::collection($result), 'meta' => ['total' => $result->total(), 'current_page' => $result->currentPage(), 'last_page' => $result->lastPage(), 'enabled' => (bool) config('resumes.enabled')]]);
    }

    public function store(StoreResumeRequest $request)
    {
        return $this->detail($this->service->create($this->service->owner($request->user()), $request->validated()), 201);
    }

    public function show(Request $request, int $id)
    {
        return $this->detail($this->service->owned($request->user(), $id));
    }

    public function update(UpdateResumeRequest $request, int $id)
    {
        return $this->detail($this->service->update($this->service->owned($request->user(), $id), $request->integer('base_revision'), $request->validated()));
    }

    public function duplicate(DuplicateResumeRequest $request, int $id)
    {
        return $this->detail($this->service->duplicate($this->service->owned($request->user(), $id), $request->integer('base_revision'), $request->string('name')->toString()), 201);
    }

    public function destroy(Request $request, int $id)
    {
        $this->service->delete($this->service->owned($request->user(), $id));

        return response()->json(['success' => true, 'message' => 'Đã xóa CV.']);
    }

    private function detail($resume, int $status = 200)
    {
        return response()->json(['success' => true, 'data' => new ResumeDetailResource($resume->load(['assets', 'exports' => fn ($q) => $q->latest('id')->limit(1)]))], $status);
    }
}
