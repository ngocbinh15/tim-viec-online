<?php

namespace Tests\Unit;

use App\Support\PublicImageUrl;
use PHPUnit\Framework\TestCase;

class PublicImageUrlTest extends TestCase
{
    public function test_local_and_remote_images_are_normalized_consistently(): void
    {
        $this->assertSame('/storage/avatars/user.png', PublicImageUrl::from('avatars/user.png'));
        $this->assertSame('/storage/company_logos/logo.jpg', PublicImageUrl::from('/company_logos/logo.jpg'));
        $this->assertSame('https://images.example/logo.png', PublicImageUrl::from('https://images.example/logo.png'));
        $this->assertNull(PublicImageUrl::from(null));
        $this->assertNull(PublicImageUrl::from('javascript:alert(1)'));
        $this->assertNull(PublicImageUrl::from('ftp://images.example/logo.png'));
        $this->assertNull(PublicImageUrl::from('../private/secret.png'));
    }
}
