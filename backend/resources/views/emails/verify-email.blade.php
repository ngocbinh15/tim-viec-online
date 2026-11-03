@extends('emails.layout')
@section('title', 'Xác nhận email')
@section('content')
<p style="margin:0 0 16px">Xin chào <strong>{{ $user->name }}</strong>,</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;color:#102846">Xác nhận email của bạn</h1>
<p style="margin:0 0 24px">Cảm ơn bạn đã tham gia TimViecOnline. Hãy xác nhận địa chỉ email để ứng tuyển, đăng tin tuyển dụng và trao đổi qua tin nhắn.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#345dff"><a href="{{ $verificationUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:700">Xác nhận email</a></td></tr></table>
<p style="margin:24px 0 0">Liên kết có hiệu lực trong 60 phút và chỉ dùng một lần. Trên trang mở ra, chọn “Xác nhận email” để hoàn tất.</p>
<p style="font-size:13px;word-break:break-all">Nếu nút không hoạt động, mở liên kết: {{ $verificationUrl }}</p>
<p style="color:#60728b;font-size:13px">Nếu bạn không tạo tài khoản hoặc yêu cầu xác nhận, hãy bỏ qua email này. Không chia sẻ liên kết với người khác.</p>
@endsection
