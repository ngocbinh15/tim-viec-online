<?php

namespace App\Services\Resumes;

use Illuminate\Support\Str;

class ResumeStarter
{
    public static function document(): array
    {
        $document = ResumeSchema::empty();
        $document['content'] = json_decode(file_get_contents(resource_path('resumes/starter.json')), true, 512, JSON_THROW_ON_ERROR);
        foreach (ResumeSchema::SECTIONS as $section) {
            foreach ($document['content'][$section] as &$entry) {
                $entry['id'] = (string) Str::uuid();
            }
            unset($entry);
        }
        $document['settings']['hidden_sections'] = ['certifications', 'activities'];
        $document['settings']['starter_version'] = 1;
        ResumeSchema::check($document);

        return $document;
    }
}
