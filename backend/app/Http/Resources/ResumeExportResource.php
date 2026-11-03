<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResumeExportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'resume_id' => $this->resume_id, 'revision' => $this->revision, 'status' => $this->status, 'error_code' => $this->error_code, 'retryable' => $this->status === 'failed', 'page_count' => $this->page_count, 'file_name' => $this->downloadName(), 'file_url' => $this->status === 'ready' ? '/api/candidate/resume-exports/'.$this->id.'/file' : null];
    }
}
