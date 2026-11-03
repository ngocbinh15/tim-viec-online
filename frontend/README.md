# TimViecOnline frontend

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui và Radix UI. Frontend phục vụ trang công khai, ứng viên, nhà tuyển dụng và quản trị viên.

Hướng dẫn cài đặt, cấu hình và triển khai nằm trong [README của repository](../README.md). Luồng xác thực, proxy API và Reverb được mô tả trong [hướng dẫn tích hợp frontend–backend](../docs/backend-frontend-integration.md).

## Chạy local

Sau khi cài dependency và cấu hình `frontend/.env.local` theo README gốc, chạy trong thư mục `frontend/`:

```bash
npm run dev
```

Mở `http://localhost:3000`. `AUTH_MODE=api` dùng Laravel thật; `AUTH_MODE=mock` dành cho demo frontend riêng. Token Sanctum được giữ trong cookie HttpOnly, không đưa vào JavaScript phía trình duyệt. Lỗi API không tự chuyển sang dữ liệu mẫu.

## Các lệnh thường dùng

| Lệnh                        | Chức năng                              |
| --------------------------- | -------------------------------------- |
| `npm run lint`              | Kiểm tra ESLint                        |
| `npm run typecheck`         | Tạo route types và kiểm tra TypeScript |
| `npm test`                  | Kiểm thử unit                          |
| `npm run test:mock-auth`    | Kiểm thử xác thực phía server với mock |
| `npm run build:cv-renderer` | Build renderer dùng cho worker xuất CV |
| `npm run build`             | Build frontend production              |
| `npm run start`             | Chạy bản frontend đã build             |

Kiểm thử trình duyệt, CV và database dùng một lần có hướng dẫn tại [phần kiểm thử của repository](../README.md#kiểm-thử). Cấu hình AI và worker nằm ở backend; không đặt provider key hoặc mật khẩu trong biến `NEXT_PUBLIC_*`.

## Tài liệu liên quan

- [Tạo CV, preview và xuất PDF](../docs/cv-builder-setup.md).
- [Hiệu suất, cách chạy local và xử lý lỗi cache](../docs/performance.md).
- [SMTP và email thông báo](../docs/mail-setup.md).
- [Yêu cầu nghiệp vụ](../docs/SRS.md).
