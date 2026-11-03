<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ActivityNotificationMail extends Mailable
{
    public function __construct(public string $recipientName, public string $category, public string $statusLabel, public string $actionUrl, public string $preferencesUrl) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->category === 'messages' ? 'Bạn có tin nhắn mới trên TimViecOnline' : 'Cập nhật trạng thái ứng tuyển trên TimViecOnline');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.activity', text: 'emails.activity_text');
    }
}
