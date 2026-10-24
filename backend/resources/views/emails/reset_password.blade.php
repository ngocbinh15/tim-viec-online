<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đặt lại mật khẩu</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f6f8;
            margin: 0;
            padding: 20px;
            color: #333333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e2e8f0;
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        .header h1 {
            color: #2563eb;
            font-size: 24px;
            margin: 0;
        }
        .content {
            padding: 20px 0;
            line-height: 1.6;
        }
        .btn {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            color: #64748b;
            text-align: center;
        }
        .alert-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 15px 0;
            font-size: 14px;
            color: #92400e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Tìm Việc Online</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>{{ $user->name }}</strong>,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email <strong>{{ $user->email }}</strong> trên hệ thống Tìm Việc Online.</p>
            <p>Vui lòng nhấn vào nút bên dưới để tiến hành tạo mật khẩu mới:</p>
            <p style="text-align: center;">
                <a href="{{ $resetUrl }}" class="btn">Đặt lại mật khẩu</a>
            </p>
            <div class="alert-box">
                <strong>Lưu ý quan trọng:</strong> Liên kết này chỉ có hiệu lực trong vòng <strong>15 phút</strong> kể từ khi yêu cầu được gửi. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email và tài khoản của bạn vẫn an toàn.
            </div>
            <p>Hoặc bạn có thể sao chép liên kết dưới đây và dán vào trình duyệt:</p>
            <p style="word-break: break-all; color: #2563eb; font-size: 14px;">{{ $resetUrl }}</p>
        </div>
        <div class="footer">
            <p>© {{ date('Y') }} Tìm Việc Online. Mọi quyền được bảo lưu.</p>
        </div>
    </div>
</body>
</html>
