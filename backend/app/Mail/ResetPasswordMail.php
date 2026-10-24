<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public string $resetUrl;
    public string $token;

    public function __construct(User $user, string $resetUrl, string $token)
    {
        $this->user = $user;
        $this->resetUrl = $resetUrl;
        $this->token = $token;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Yêu cầu đặt lại mật khẩu - Tìm Việc Online',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reset_password',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
