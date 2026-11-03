<?php

namespace App\Services\Resumes;

use Illuminate\Validation\ValidationException;

class ResumeSchema
{
    public const SECTIONS = ['experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'activities'];

    public const TEMPLATES = ['classic', 'modern', 'minimal', 'executive', 'elegant', 'technical'];

    public const FIELDS = [
        'experience' => ['company' => 150, 'position' => 150, 'description' => 2000],
        'education' => ['school' => 150, 'qualification' => 150, 'description' => 2000],
        'projects' => ['name' => 150, 'role' => 150, 'url' => 1000, 'description' => 2000],
        'skills' => ['name' => 100, 'detail' => 500],
        'certifications' => ['name' => 150, 'issuer' => 150, 'url' => 1000],
        'languages' => ['name' => 100, 'proficiency' => 100],
        'activities' => ['name' => 150, 'role' => 150, 'description' => 2000],
    ];

    public static function empty(): array
    {
        return ['name' => 'CV chưa đặt tên', 'template_key' => 'classic', 'template_version' => 1, 'schema_version' => 1,
            'content' => ['basics' => ['full_name' => '', 'headline' => '', 'email' => '', 'phone' => '', 'city' => '', 'summary' => '', 'links' => [], 'photo_asset_id' => null], ...array_fill_keys(self::SECTIONS, [])],
            'settings' => ['accent' => 'blue', 'font_size' => 'normal', 'line_spacing' => 'normal', 'section_order' => self::SECTIONS, 'hidden_sections' => []]];
    }

    public static function rules(): array
    {
        $rules = ['name' => 'required|string|max:120', 'template_key' => 'required|in:'.implode(',', self::TEMPLATES), 'template_version' => 'required|integer|in:1', 'schema_version' => 'required|integer|in:1',
            'content' => 'required|array:basics,'.implode(',', self::SECTIONS), 'content.basics' => 'required|array:full_name,headline,email,phone,city,summary,links,photo_asset_id',
            'content.basics.links' => 'present|array|list|max:10', 'content.basics.links.*' => 'array:id,label,url',
            'content.basics.links.*.id' => 'required|uuid', 'content.basics.links.*.label' => 'present|string|max:100', 'content.basics.links.*.url' => 'present|string|max:1000',
            'content.basics.photo_asset_id' => 'present|nullable|integer|min:1',
            'settings' => 'required|array:accent,font_size,line_spacing,section_order,hidden_sections,starter_version',
            'settings.starter_version' => 'sometimes|integer|in:1',
            'settings.accent' => 'required|in:blue,teal,slate', 'settings.font_size' => 'required|in:small,normal,large', 'settings.line_spacing' => 'required|in:compact,normal',
            'settings.section_order' => 'required|array|list|size:7', 'settings.section_order.*' => 'required|distinct|in:'.implode(',', self::SECTIONS),
            'settings.hidden_sections' => 'present|array|list|max:7', 'settings.hidden_sections.*' => 'required|distinct|in:'.implode(',', self::SECTIONS)];
        foreach (['full_name' => 120, 'headline' => 150, 'email' => 254, 'phone' => 30, 'city' => 150, 'summary' => 2000] as $key => $max) {
            $rules["content.basics.$key"] = "present|string|max:$max";
        }
        foreach (self::FIELDS as $section => $fields) {
            $keys = ['id', ...array_keys($fields)];
            $rules["content.$section"] = 'present|array|list|max:20';
            $rules["content.$section.*.id"] = 'required|uuid';
            foreach ($fields as $key => $max) {
                $rules["content.$section.*.$key"] = "present|string|max:$max";
            }
            if (in_array($section, ['experience', 'education'])) {
                $keys = [...$keys, 'start_month', 'end_month', 'current'];
                foreach (['start_month', 'end_month'] as $key) {
                    $rules["content.$section.*.$key"] = ['present', 'nullable', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'];
                }
                $rules["content.$section.*.current"] = ['present', function ($attribute, $value, $fail) {
                    if (! is_bool($value)) {
                        $fail('Giá trị phải là boolean.');
                    }
                }];
            }
            if ($section === 'certifications') {
                $keys[] = 'issued_month';
                $rules["content.$section.*.issued_month"] = ['present', 'nullable', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'];
            }
            $rules["content.$section.*"] = 'array:'.implode(',', $keys);
        }

        return $rules;
    }

    public static function normalize(array $value): array
    {
        $walk = function (&$node, $key = '') use (&$walk) {
            if (is_array($node)) {
                foreach ($node as $k => &$child) {
                    $walk($child, (string) $k);
                }
            } elseif ($node === null && ! in_array($key, ['photo_asset_id', 'start_month', 'end_month', 'issued_month'])) {
                $node = '';
            }
        };
        $walk($value);

        return $value;
    }

    public static function check(array $value): void
    {
        if (strlen(json_encode($value, JSON_UNESCAPED_UNICODE)) > 131072) {
            throw ValidationException::withMessages(['content' => 'CV không được vượt quá 128 KiB.']);
        }
        $walk = function ($node, $key = '') use (&$walk) {
            if (is_array($node)) {
                foreach ($node as $k => $child) {
                    $walk($child, (string) $k);
                }
            } elseif (is_string($node)) {
                if (preg_match('/<\/?[a-z][^>]*>/i', $node)) {
                    throw ValidationException::withMessages(['content' => 'Chỉ nhập văn bản, không nhập HTML.']);
                }
                if ($key === 'url' && $node !== '') {
                    $url = parse_url($node);
                    if (! $url || ! in_array($url['scheme'] ?? '', ['http', 'https']) || empty($url['host']) || isset($url['user']) || isset($url['pass'])) {
                        throw ValidationException::withMessages(['content' => 'Liên kết phải bắt đầu bằng https:// hoặc http://.']);
                    }
                }
            }
        };
        $walk($value);
        $email = $value['content']['basics']['email'];
        if ($email !== '' && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages(['content.basics.email' => 'Email không hợp lệ.']);
        }
        $ids = [];
        foreach ([...self::SECTIONS, 'links'] as $section) {
            foreach (($section === 'links' ? $value['content']['basics']['links'] : $value['content'][$section]) as $item) {
                if (isset($ids[$item['id']])) {
                    throw ValidationException::withMessages(['content' => 'Các mục phải có ID riêng biệt.']);
                }
                $ids[$item['id']] = true;
                if (isset($item['current']) && (($item['current'] && $item['end_month']) || ($item['start_month'] && $item['end_month'] && $item['start_month'] > $item['end_month']))) {
                    throw ValidationException::withMessages(['content' => 'Khoảng thời gian không hợp lệ.']);
                }
            }
        }
    }

    public static function requireExportable(array $document): void
    {
        self::check($document);
        $basics = $document['content']['basics'];
        $hasContent = false;
        foreach (self::SECTIONS as $section) {
            if (! in_array($section, $document['settings']['hidden_sections'])) {
                foreach ($document['content'][$section] as $item) {
                    foreach ($item as $key => $value) {
                        if ($key !== 'id' && is_string($value) && trim($value) !== '') {
                            $hasContent = true;
                        }
                    }
                }
            }
        }
        if (! trim($basics['full_name']) || ! trim($basics['headline']) || ! $basics['email'] || ! $hasContent) {
            throw ValidationException::withMessages(['content' => 'Bổ sung họ tên, chức danh, email và ít nhất một mục nội dung trước khi xuất PDF.']);
        }
    }
}
