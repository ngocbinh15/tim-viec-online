<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ConfirmPasswordChangeMail extends Mailable
{
    public function __construct(public string $recipientName, public string $confirmationUrl) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Xác nhận yêu cầu đổi mật khẩu - TimViecOnline');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.confirm-password-change', text: 'emails.confirm_password_change_text');
    }
}
