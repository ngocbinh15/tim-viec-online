Xin chào {{ $recipientName }},

@if ($category === 'messages')
Bạn có tin nhắn mới trên TimViecOnline. Mở cuộc trò chuyện để xem và trả lời.
@else
Trạng thái hồ sơ ứng tuyển của bạn đã thay đổi: {{ $statusLabel }}.
@endif

Xem trên TimViecOnline: {!! $actionUrl !!}

Quản lý thông báo qua email: {!! $preferencesUrl !!}
Email tự động, vui lòng không trả lời.
