<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class CheckMail extends Command
{
    protected $signature = 'mail:check {--to= : Gửi một email thử đến địa chỉ này}';

    protected $description = 'Kiểm tra cấu hình SMTP; không gửi email nếu chưa truyền --to';

    public function handle(): int
    {
        if (config('mail.default') !== 'smtp') {
            $this->error('MAIL_MAILER chưa phải smtp. log/array chỉ lưu thư thử, không giao đến hộp thư.');

            return self::FAILURE;
        }
        $settings = config('mail.mailers.smtp');
        $scheme = $settings['scheme'] ?: ((int) $settings['port'] === 465 ? 'smtps' : 'smtp');
        $loopback = in_array($settings['host'], ['localhost', '127.0.0.1', '::1'], true);
        if (! empty($settings['url'])) {
            $this->error('Hãy bỏ MAIL_URL và cấu hình riêng MAIL_HOST/PORT/USERNAME/PASSWORD để kiểm tra.');

            return self::FAILURE;
        }
        if (! $settings['host'] || ! in_array($scheme, ['smtp', 'smtps'], true)
            || (int) $settings['port'] < 1 || (int) $settings['port'] > 65535
            || ! filter_var(config('mail.from.address'), FILTER_VALIDATE_EMAIL)
            || ! filter_var(config('app.frontend_url'), FILTER_VALIDATE_URL)) {
            $this->error('Kiểm tra MAIL_HOST, MAIL_PORT, MAIL_SCHEME, MAIL_FROM_ADDRESS và FRONTEND_URL.');

            return self::FAILURE;
        }
        if (! $loopback && (empty($settings['username']) || empty($settings['password']))) {
            $this->error('Thiếu MAIL_USERNAME hoặc MAIL_PASSWORD. Nhập trực tiếp trong backend/.env.');

            return self::FAILURE;
        }
        if ($scheme !== 'smtps' && ! $settings['require_tls'] && ! ($loopback && app()->environment(['local', 'testing']))) {
            $this->error('SMTP ngoài máy phải bật MAIL_REQUIRE_TLS=true hoặc dùng MAIL_SCHEME=smtps.');

            return self::FAILURE;
        }
        $recipient = $this->option('to');
        if ($recipient === null) {
            $this->info('Cấu hình SMTP đủ trường. Chưa kiểm tra đăng nhập SMTP hoặc gửi thư. Dùng --to=email để gửi thử.');

            return self::SUCCESS;
        }
        if (! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            $this->error('Địa chỉ nhận --to không hợp lệ.');

            return self::FAILURE;
        }
        try {
            Mail::raw('Email kiểm tra kết nối SMTP của TimViecOnline. Email này không chứa mật khẩu hoặc token.',
                fn ($message) => $message->to($recipient)->subject('TimViecOnline · Kiểm tra gửi email'));
        } catch (\Throwable $exception) {
            $this->error('Gửi thất bại. Kiểm tra host/cổng/TLS, tài khoản và mật khẩu ứng dụng; không chia sẻ SMTP debug chứa bí mật.');

            return self::FAILURE;
        }
        $this->info('SMTP đã nhận thư. Kiểm tra hộp thư đến và thư rác để xác nhận nhận được.');

        return self::SUCCESS;
    }
}
