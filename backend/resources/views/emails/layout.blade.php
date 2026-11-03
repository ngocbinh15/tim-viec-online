<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>@yield('title') · TimViecOnline</title></head>
<body style="margin:0;padding:32px 16px;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#34465e;line-height:1.6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e6ed;border-radius:16px">
<tr><td style="padding:24px 32px;border-bottom:1px solid #e2e6ed;font-size:22px;font-weight:700;color:#102846">TimViec<span style="color:#345dff">Online</span><div style="font-size:11px;letter-spacing:1px;color:#60728b;font-weight:400">CÔNG VIỆC LÀM & TUYỂN DỤNG</div></td></tr>
<tr><td style="padding:32px">@yield('content')</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #e2e6ed;color:#60728b;font-size:12px">Email tự động từ TimViecOnline. Vui lòng không trả lời email này.<br>© {{ date('Y') }} TimViecOnline.</td></tr>
</table>
</td></tr></table>
</body>
</html>
