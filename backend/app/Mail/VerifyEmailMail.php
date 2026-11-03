<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class VerifyEmailMail extends Mailable
{
    public function __construct(public User $user, public string $verificationUrl) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Xác nhận email của bạn - TimViecOnline');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.verify-email', text: 'emails.verify_email_text');
    }
}
