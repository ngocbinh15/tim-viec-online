<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class WelcomeMail extends Mailable
{
    public function __construct(public User $user, public string $loginUrl) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Chào mừng bạn đến với TimViecOnline');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.welcome', text: 'emails.welcome_text');
    }
}
