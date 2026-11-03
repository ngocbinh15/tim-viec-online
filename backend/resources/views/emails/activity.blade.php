@extends('emails.layout')
@section('title', $category === 'messages' ? 'Bạn có tin nhắn mới' : 'Trạng thái ứng tuyển đã thay đổi')
@section('content')
<p>Xin chào <strong>{{ $recipientName }}</strong>,</p>
@if ($category === 'messages')
<h1 style="font-size:24px;color:#102846">Bạn có tin nhắn mới</h1>
<p>Mở cuộc trò chuyện trên TimViecOnline để xem và trả lời tin nhắn.</p>
@else
<h1 style="font-size:24px;color:#102846">Trạng thái ứng tuyển đã thay đổi</h1>
<p>Trạng thái hồ sơ của bạn: <strong>{{ $statusLabel }}</strong>.</p>
@endif
<p><a href="{{ $actionUrl }}">{{ $category === 'messages' ? 'Mở cuộc trò chuyện' : 'Xem hồ sơ ứng tuyển' }}</a></p>
<p style="font-size:13px;color:#60728b">Bạn nhận email này theo lựa chọn của mình. <a href="{{ $preferencesUrl }}">Quản lý thông báo qua email</a>.</p>
@endsection
