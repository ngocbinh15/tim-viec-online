<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExportApplicantsRequest;
use App\Services\ApplicantExportService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class ApplicantExportController extends Controller
{
    public function __invoke(ExportApplicantsRequest $request, ApplicantExportService $service): BinaryFileResponse|JsonResponse
    {
        $data = $request->validated();

        try {
            return $service->download($request->user(), $data['job_ids'], $data['mode']);
        } catch (HttpResponseException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['success' => false, 'message' => 'Không thể xuất danh sách ứng viên. Vui lòng thử lại.', 'errors' => []], 500);
        }
    }
}
