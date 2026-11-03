# Hồ sơ doanh nghiệp thật dùng trong dữ liệu minh họa

Catalog gồm 121 doanh nghiệp có hoạt động tại Việt Nam, thu thập ngày 26/10/2026 từ website chính thức. Bộ này thay phần nhận diện doanh nghiệp của database demo, không tạo quan hệ hợp tác hoặc tài khoản chính thức thay mặt doanh nghiệp.

## Dữ liệu và hình ảnh

- Catalog: `backend/database/seeders/data/real-companies/catalog.json`.
- Ảnh gốc để cài đặt lại: `backend/database/seeders/data/real-companies/logos/*.png` (121 file, tổng khoảng 2,6 MB).
- Khi áp dụng, ảnh được chép vào `backend/storage/app/public/company_logos/real/` và phục vụ qua `/storage/company_logos/real/...png`.
- `companies.avatar` và `companies.logo` lưu cùng đường dẫn tương đối. API trả cả `avatar` và `logo` dưới dạng URL; frontend ưu tiên avatar, vẫn hỗ trợ dữ liệu logo cũ. Upload logo/avatar mới đồng bộ hai trường.
- `companies.reference_sources` lưu URL hồ sơ chính thức, URL ảnh nhận diện gốc, tiêu đề trang, ngày thu thập và SHA-256 của PNG. Mỗi ảnh có nguồn riêng trong catalog; không dùng dịch vụ favicon tổng hợp hoặc hotlink ảnh ngoài khi duyệt web.
- `companies.is_demo=true` nhận diện các hồ sơ tham khảo. Thông tin xuất xứ được giữ trong catalog và API; trang công ty và chi tiết việc làm không hiển thị khung thông báo tham khảo theo yêu cầu giao diện.

Tên thương hiệu không luôn là tên pháp nhân đăng ký đầy đủ. Mô tả là tóm tắt ngắn về lĩnh vực hoạt động, không sao chép toàn bộ nội dung website và không thêm phúc lợi hay lời cam kết tuyển dụng. Địa chỉ chỉ được điền khi tìm thấy địa điểm công khai rõ ràng trên nguồn; hiện có 65 hồ sơ có địa chỉ được đối chiếu. Đó có thể là văn phòng/cơ sở hoạt động, không khẳng định luôn là trụ sở pháp lý. Giữ nguyên cách ghi địa chỉ của nguồn, kể cả khi nguồn dùng tên đơn vị hành chính cũ. Trường chưa xác minh được để `null`, không dùng địa chỉ hoặc quy mô giả của seed.

Hình ảnh nhận diện và tên thương hiệu thuộc chủ sở hữu tương ứng. Việc có URL nguồn không đồng nghĩa tài sản được cấp giấy phép nguồn mở. Bộ hình phục vụ nhận diện trong đồ án; khi phân phối hoặc triển khai công khai, cần tuân thủ quyền sử dụng của từng chủ sở hữu. Không gán giấy phép mã nguồn của repository cho các logo này.

Ví dụ nguồn: [FPT Software](https://fptsoftware.com/about-us), [Bellsystem24 Việt Nam](https://bell24vietnam.vn/en/company/), [Bratus](https://bratus.co/), [Axon Active](https://axonactive.com/). Danh sách đầy đủ nằm trong catalog, không dựa vào một nguồn tổng hợp duy nhất.

## Áp dụng lại trên máy khác

1. Sao lưu database và storage đang dùng. Kiểm tra đúng tên database local.
2. Nếu schema đã được tạo bằng migrations mới nhất, chạy `php artisan migrate`. Với database import SQL cũ, áp dụng riêng migration bổ sung theo [hướng dẫn dữ liệu demo](demo-data.md), rồi:

   ```bash
   php artisan migrate --path=database/migrations/2026_10_26_000003_add_company_avatar_and_reference_sources.php
   ```

3. Chạy trong `backend/`:

   ```bash
   php artisan demo:companies --dry-run
   php artisan demo:companies
   php artisan storage:link
   ```

Lệnh chỉ hoạt động ở `local/testing`, kiểm tra toàn bộ file và checksum trước khi ghi. Không gọi website, SMTP, AI hoặc Reverb khi import; catalog và ảnh đã được đóng gói. Nó cập nhật các công ty thuộc tài khoản `employer.NNNNN@demo.timviec.test` theo mapping ngành của seed, cùng hồ sơ FPT Software ban đầu gắn với `employer@timviec.vn`. Không sửa công ty của tài khoản khác. Nếu mở rộng seed quá 120 nhà tuyển dụng, phải bổ sung mapping trước; lệnh dừng nếu thiếu hồ sơ phù hợp.

Chạy lại bỏ qua hồ sơ đã có cùng `catalog_key`, giữ nội dung đã sửa. Thay đổi tên công ty chỉ cập nhật nội dung seed đã biết trong mô tả tin, thư ứng tuyển và thông báo; không đổi ID, chủ tài khoản, mật khẩu, khóa ngoại, nội dung chat hay file CV. Tài khoản nhà tuyển dụng vẫn là tài khoản thử nghiệm; mọi tin/đơn/chat giữ nguyên tính chất minh họa.

Ảnh được ghi trước transaction database. Nếu transaction lỗi, có thể còn file ảnh tham khảo trong namespace riêng; chạy lại sử dụng cùng đường dẫn. Rollback migration xóa các cột mới nên chỉ dùng khi đã sao lưu và chủ động ngừng dùng chức năng; khôi phục nội dung doanh nghiệp bằng bản sao lưu database tương ứng.
