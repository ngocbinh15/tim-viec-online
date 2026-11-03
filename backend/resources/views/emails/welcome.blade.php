@extends('emails.layout')
@section('title', 'Chào mừng bạn')
@section('content')
<p style="margin:0 0 16px">Xin chào <strong>{{ $user->name }}</strong>,</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;color:#102846">Chào mừng đến với TimViecOnline</h1>
<p style="margin:0 0 24px">Tài khoản của bạn đã được tạo thành công. Bạn có thể đăng nhập để hoàn thiện hồ sơ và bắt đầu sử dụng các tính năng dành cho {{ $user->role === 'employer' ? 'nhà tuyển dụng' : 'ứng viên' }}.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#345dff"><a href="{{ $loginUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:700">Đăng nhập vào tài khoản</a></td></tr></table>
<p style="margin:24px 0 0;color:#60728b;font-size:13px">TimViecOnline không bao giờ yêu cầu bạn gửi mật khẩu qua email.</p>
@endsection
