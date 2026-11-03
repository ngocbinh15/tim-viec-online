<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResumeAssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'mime_type' => $this->mime_type, 'size' => $this->size, 'url' => '/api/candidate/resumes/'.$this->resume_id.'/assets/'.$this->id];
    }
}
