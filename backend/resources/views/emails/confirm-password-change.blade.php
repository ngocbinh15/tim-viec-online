@extends('emails.layout')
@section('title', 'Xác nhận đổi mật khẩu')
@section('content')
<p>Xin chào <strong>{{ $recipientName }}</strong>,</p>
<h1 style="font-size:24px;line-height:32px;color:#102846">Xác nhận yêu cầu đổi mật khẩu</h1>
<p>Chúng tôi nhận được yêu cầu đổi mật khẩu tài khoản TimViecOnline của bạn. Mật khẩu hiện tại vẫn có hiệu lực cho đến khi bạn xác nhận.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#345dff"><a href="{{ $confirmationUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:700">Xác nhận đổi mật khẩu</a></td></tr></table>
<p>Liên kết có hiệu lực trong 15 phút và chỉ dùng một lần. Trên trang mở ra, bấm “Xác nhận đổi mật khẩu” để hoàn tất. Sau đó, bạn cần đăng nhập lại trên các thiết bị.</p>
<p style="font-size:13px;word-break:break-all">Nếu nút không hoạt động, mở liên kết: {{ $confirmationUrl }}</p>
<p style="font-size:13px;color:#60728b">Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này. Mật khẩu sẽ giữ nguyên. Không chia sẻ liên kết xác nhận với người khác.</p>
@endsection
