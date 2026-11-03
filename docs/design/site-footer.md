# Footer dùng chung

Footer trên các trang nội dung trong `design/` dùng thiết kế trang chủ: nền navy, logo và thông tin liên hệ, ba nhóm liên kết và hàng bản quyền/chính sách. Bản gốc `design/index.html` chỉ chuyển hướng sang trang chủ nên không cần footer riêng.

- Mẫu nội dung: `design/shared/site-footer.html`.
- Kiểu dáng độc lập Tailwind: `design/shared/site-footer.css`.
- Sau khi sửa mẫu, chạy `python design/shared/sync-footer.py` để cập nhật các trang. Script không cần thư viện ngoài, chạy lại khi nội dung không đổi không ghi lại file.
- Footer đặt ở cấp body sau nội dung chính, ngoài sidebar/layout doanh nghiệp; các trang đã có footer rút gọn được thay thế, các trang chưa có được bổ sung.
- Bộ trang admin mới dùng cùng footer; script nhận diện `ap-layout` bên cạnh `ep-layout` để đặt footer ngoài khung điều hướng quản trị.
- Giữ nội dung và liên kết từ homepage. Các liên kết chính sách `#` vẫn là placeholder như bản gốc.
- Kiểm tra Chromium trên 21 trang: mỗi trang có đúng một footer, HTML đồng nhất, liên kết file nội bộ tồn tại, font/màu nền đồng nhất, grid 1/2/4 cột ở 360/768/1440px, không tràn ngang trong footer.
- Đã xem ảnh footer trên homepage, đăng nhập và dashboard doanh nghiệp; focus dùng outline xanh và chuyển màu hover nhẹ, reduced motion được hỗ trợ.
