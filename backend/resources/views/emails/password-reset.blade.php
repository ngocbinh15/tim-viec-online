@extends('emails.layout')
@section('title', 'Đặt lại mật khẩu')
@section('content')
<p style="margin:0 0 16px">Xin chào <strong>{{ $user->name }}</strong>,</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;color:#102846">Đặt lại mật khẩu của bạn</h1>
<p style="margin:0 0 24px">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản TimViecOnline. Nhấn nút bên dưới để chọn mật khẩu mới.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#345dff"><a href="{{ $resetUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:700">Đặt lại mật khẩu</a></td></tr></table>
<p style="margin:24px 0 16px">Liên kết có hiệu lực <strong>15 phút</strong> và chỉ sử dụng một lần. Nếu bạn yêu cầu liên kết mới, liên kết cũ sẽ hết hiệu lực.</p>
<p style="margin:0 0 24px">Nếu bạn không gửi yêu cầu này, hãy bỏ qua email. Mật khẩu của bạn sẽ không thay đổi.</p>
<p style="margin:0 0 8px;font-size:13px;color:#60728b">Nếu nút không hoạt động, sao chép liên kết sau vào trình duyệt:</p>
<p style="margin:0;word-break:break-all;font-size:13px"><a href="{{ $resetUrl }}" style="color:#345dff">{{ $resetUrl }}</a></p>
@endsection
