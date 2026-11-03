<?php

namespace Database\Seeders\Demo;

final class DemoCatalog
{
    /** Each sector owns its roles, tasks and skills; candidates do not get random unrelated skills. */
    public static function sectors(): array
    {
        return [
            ['Công nghệ thông tin / Phần mềm', ['Lập trình viên Backend Laravel', 'Lập trình viên Frontend React', 'Kỹ sư kiểm thử phần mềm'], ['PHP', 'Laravel', 'ReactJS', 'TypeScript', 'MySQL', 'Docker', 'RESTful API', 'Git & GitHub'], 'phát triển sản phẩm web, xây dựng API, viết kiểm thử và tối ưu hiệu năng'],
            ['Marketing & Truyền thông số', ['Chuyên viên Content Marketing', 'Chuyên viên Digital Marketing', 'Chuyên viên SEO website'], ['SEO & Content', 'Google Ads', 'Facebook Ads', 'TikTok Marketing', 'Google Analytics', 'Viết nội dung', 'Lập kế hoạch truyền thông'], 'lập kế hoạch chiến dịch, sản xuất nội dung và đo lường hiệu quả truyền thông'],
            ['Kế toán & Tài chính doanh nghiệp', ['Kế toán tổng hợp', 'Chuyên viên phân tích tài chính', 'Kế toán công nợ'], ['Kế toán doanh nghiệp', 'Phần mềm MISA', 'Microsoft Excel nâng cao', 'Báo cáo tài chính', 'Thuế doanh nghiệp', 'Đối soát công nợ'], 'kiểm tra chứng từ, đối soát số liệu, lập báo cáo và kiểm soát chi phí'],
            ['Thiết kế đồ họa & UI/UX', ['Chuyên viên thiết kế UI UX', 'Thiết kế đồ họa thương hiệu', 'Product Designer'], ['Figma / UI Design', 'Adobe Photoshop', 'Adobe Illustrator', 'Wireframing & Prototyping', 'Design System', 'Nghiên cứu người dùng'], 'nghiên cứu nhu cầu, thiết kế giao diện, xây dựng prototype và phối hợp phát triển sản phẩm'],
            ['Quản trị nhân sự & Hành chính', ['Chuyên viên tuyển dụng', 'Chuyên viên nhân sự tổng hợp', 'Chuyên viên tiền lương phúc lợi'], ['Quản trị nhân sự (HRM)', 'Luật lao động', 'Tuyển dụng', 'C&B', 'Bảo hiểm xã hội', 'Quản lý hồ sơ'], 'tổ chức tuyển dụng, quản lý hồ sơ nhân sự và hỗ trợ chế độ phúc lợi'],
            ['Kinh doanh & Bán hàng (Sales)', ['Chuyên viên kinh doanh B2B', 'Chuyên viên phát triển thị trường', 'Nhân viên tư vấn giải pháp'], ['Bán hàng B2B / B2C', 'CRM', 'Đàm phán', 'Phát triển khách hàng', 'Lập kế hoạch kinh doanh', 'Chăm sóc khách hàng'], 'tìm hiểu nhu cầu khách hàng, tư vấn giải pháp và theo dõi hợp đồng'],
            ['Chăm sóc khách hàng (CSKH)', ['Chuyên viên chăm sóc khách hàng', 'Nhân viên hỗ trợ khách hàng', 'Chuyên viên trải nghiệm khách hàng'], ['Telesales & CSKH', 'Xử lý khiếu nại', 'Giao tiếp khách hàng', 'Zendesk', 'Quản lý ticket', 'Dịch vụ khách hàng'], 'tiếp nhận yêu cầu, giải quyết phản hồi và cải thiện trải nghiệm khách hàng'],
            ['Logistics & Xuất nhập khẩu', ['Chuyên viên xuất nhập khẩu', 'Điều phối vận tải', 'Chuyên viên chứng từ logistics'], ['Incoterms', 'Khai báo hải quan', 'Quản lý vận tải', 'Chứng từ xuất nhập khẩu', 'Quản lý kho', 'Tiếng Anh thương mại'], 'điều phối đơn hàng, kiểm tra chứng từ và theo dõi tiến độ vận chuyển'],
            ['Ngân hàng & Bảo hiểm', ['Chuyên viên quan hệ khách hàng', 'Chuyên viên thẩm định tín dụng', 'Chuyên viên nghiệp vụ bảo hiểm'], ['Phân tích tín dụng', 'Quản trị rủi ro', 'Nghiệp vụ ngân hàng', 'Tư vấn bảo hiểm', 'KYC', 'Phân tích tài chính'], 'phân tích hồ sơ khách hàng, tư vấn dịch vụ và kiểm soát rủi ro nghiệp vụ'],
            ['Giáo dục & Đào tạo', ['Chuyên viên đào tạo nội bộ', 'Giáo viên tiếng Anh', 'Chuyên viên phát triển học liệu'], ['Thiết kế bài giảng', 'Sư phạm', 'Quản lý lớp học', 'Đánh giá học tập', 'LMS', 'IELTS'], 'xây dựng học liệu, tổ chức đào tạo và đánh giá tiến bộ của học viên'],
            ['Y tế & Chăm sóc sức khỏe', ['Điều phối dịch vụ y tế', 'Chuyên viên vận hành phòng khám', 'Nhân viên chăm sóc sức khỏe'], ['Quản lý lịch khám', 'Chăm sóc người bệnh', 'Hồ sơ y tế', 'An toàn vệ sinh', 'Dịch vụ y tế', 'Bảo mật thông tin'], 'điều phối lịch hẹn, hỗ trợ người bệnh và quản lý hồ sơ dịch vụ'],
            ['Dược phẩm & Công nghệ sinh học', ['Chuyên viên đảm bảo chất lượng dược', 'Nhân viên kiểm nghiệm', 'Chuyên viên kinh doanh dược'], ['GMP', 'GLP', 'Kiểm nghiệm', 'Đảm bảo chất lượng', 'Hồ sơ đăng ký thuốc', 'An toàn phòng thí nghiệm'], 'kiểm tra chất lượng, hoàn thiện hồ sơ và tuân thủ quy trình chuyên môn'],
            ['Cơ khí & Chế tạo', ['Kỹ sư thiết kế cơ khí', 'Kỹ sư bảo trì thiết bị', 'Kỹ sư sản xuất cơ khí'], ['AutoCAD', 'SolidWorks', 'Đọc bản vẽ kỹ thuật', 'Gia công CNC', 'Bảo trì thiết bị', 'An toàn lao động'], 'thiết kế chi tiết, cải tiến dây chuyền và kiểm soát chất lượng sản xuất'],
            ['Điện & Điện tử & Tự động hóa', ['Kỹ sư tự động hóa', 'Kỹ sư điện công nghiệp', 'Kỹ thuật viên điện tử'], ['PLC', 'SCADA', 'Điện công nghiệp', 'Thiết kế mạch', 'Cảm biến', 'Đọc sơ đồ điện'], 'lập trình điều khiển, vận hành hệ thống và bảo trì thiết bị tự động'],
            ['Xây dựng & Kiến trúc', ['Kỹ sư giám sát xây dựng', 'Kiến trúc sư công trình', 'Kỹ sư dự toán'], ['Revit', 'BIM', 'Dự toán công trình', 'Giám sát thi công', 'Quản lý tiến độ', 'AutoCAD'], 'đọc bản vẽ, theo dõi tiến độ, phối hợp nhà thầu và kiểm soát chất lượng công trình'],
            ['Bất động sản', ['Chuyên viên tư vấn bất động sản', 'Chuyên viên vận hành tòa nhà', 'Chuyên viên nghiên cứu thị trường'], ['Pháp lý bất động sản', 'Tư vấn đầu tư', 'Quản lý tòa nhà', 'Phân tích thị trường', 'Định giá', 'CRM'], 'nghiên cứu thị trường, tư vấn khách hàng và quản lý thông tin sản phẩm'],
            ['Du lịch & Khách sạn', ['Nhân viên lễ tân khách sạn', 'Chuyên viên điều hành tour', 'Chuyên viên đặt phòng'], ['Nghiệp vụ lễ tân', 'Điều hành tour', 'Quản lý đặt phòng', 'Tiếng Anh giao tiếp', 'Dịch vụ lưu trú', 'Xử lý tình huống'], 'tiếp đón khách, điều phối dịch vụ và xử lý yêu cầu đặt chỗ'],
            ['Nhà hàng & Thực phẩm', ['Giám sát nhà hàng', 'Chuyên viên kiểm soát chất lượng thực phẩm', 'Nhân viên vận hành cửa hàng'], ['An toàn thực phẩm', 'HACCP', 'Quản lý ca', 'Kiểm kê nguyên liệu', 'Dịch vụ nhà hàng', 'Quản lý chất lượng'], 'tổ chức ca làm việc, kiểm soát chất lượng và đảm bảo trải nghiệm dịch vụ'],
            ['Thương mại điện tử & Bán lẻ', ['Chuyên viên vận hành sàn thương mại điện tử', 'Quản lý ngành hàng', 'Chuyên viên phát triển gian hàng'], ['Shopee Seller', 'Lazada Seller', 'TikTok Shop', 'Quản lý đơn hàng', 'Quản lý ngành hàng', 'Phân tích doanh thu'], 'quản lý danh mục sản phẩm, tối ưu gian hàng và theo dõi hiệu quả bán hàng'],
            ['Dữ liệu & Phân tích kinh doanh', ['Chuyên viên phân tích dữ liệu', 'Business Analyst', 'Chuyên viên báo cáo quản trị'], ['Python', 'SQL', 'Power BI & Phân tích dữ liệu', 'Tableau', 'Phân tích yêu cầu', 'Trực quan hóa dữ liệu', 'Thống kê'], 'thu thập yêu cầu, xây dựng dashboard và phân tích dữ liệu hỗ trợ ra quyết định'],
            ['Luật & Pháp chế', ['Chuyên viên pháp chế doanh nghiệp', 'Chuyên viên hợp đồng', 'Chuyên viên tuân thủ'], ['Luật doanh nghiệp', 'Soạn thảo hợp đồng', 'Tuân thủ pháp luật', 'Sở hữu trí tuệ', 'Nghiên cứu pháp lý', 'Quản lý rủi ro pháp lý'], 'rà soát hợp đồng, tư vấn tuân thủ và quản lý hồ sơ pháp lý'],
            ['Nông nghiệp & Môi trường', ['Kỹ sư môi trường', 'Kỹ sư nông nghiệp', 'Chuyên viên phát triển bền vững'], ['Đánh giá tác động môi trường', 'ISO 14001', 'Quản lý chất thải', 'Nông nghiệp công nghệ cao', 'ESG', 'Quan trắc môi trường'], 'theo dõi chỉ tiêu môi trường, xây dựng quy trình và triển khai giải pháp bền vững'],
            ['Truyền thông & Sự kiện', ['Chuyên viên tổ chức sự kiện', 'Chuyên viên quan hệ công chúng', 'Biên tập viên nội dung'], ['Tổ chức sự kiện', 'Quan hệ báo chí', 'Biên tập nội dung', 'Quản lý ngân sách', 'Kịch bản chương trình', 'Truyền thông thương hiệu'], 'xây dựng kế hoạch, điều phối đối tác và tổ chức hoạt động truyền thông'],
            ['Sản xuất & Quản lý chất lượng', ['Kỹ sư quản lý chất lượng', 'Chuyên viên kế hoạch sản xuất', 'Giám sát dây chuyền sản xuất'], ['ISO 9001', 'Lean Manufacturing', 'Six Sigma', '5S', 'Quản lý sản xuất', 'Kiểm soát chất lượng'], 'lập kế hoạch sản xuất, kiểm tra chất lượng và cải tiến quy trình vận hành'],
        ];
    }

    public static function cities(): array
    {
        return ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Huế', 'Bắc Ninh', 'Quảng Ninh', 'Nghệ An', 'Thanh Hóa', 'Khánh Hòa', 'Lâm Đồng', 'Đồng Nai', 'Tây Ninh', 'An Giang', 'Gia Lai', 'Đắk Lắk', 'Quảng Ngãi'];
    }

    public static function name(int $index): string
    {
        $last = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Đinh', 'Mai', 'Lý'];
        $middle = ['Minh', 'Thanh', 'Ngọc', 'Thu', 'Quang', 'Hoài', 'Gia', 'Hải', 'Bảo', 'Khánh'];
        $first = ['Anh', 'Linh', 'Huy', 'Trang', 'Nam', 'Thảo', 'Khang', 'Hà', 'Phúc', 'Vy', 'Sơn', 'Mai', 'Đạt', 'Hương', 'Tuấn', 'Nhi', 'Long', 'Yến', 'Dũng', 'Quỳnh'];

        return $last[$index % count($last)].' '.$middle[intdiv($index, count($last)) % count($middle)].' '.$first[intdiv($index, count($last) * count($middle)) % count($first)];
    }

    public static function company(int $index): string
    {
        $brands = ['An Việt', 'Sao Mai', 'Đông Phương', 'Thiên Minh', 'Hưng Thịnh', 'Bình An', 'Tân Phát', 'Đại Dương', 'Việt Tâm', 'Nam Sơn', 'Ánh Dương', 'Bắc Hà', 'Hải Đăng', 'Phương Nam', 'Minh Châu', 'Kim Long', 'Trường Sơn', 'Hoa Sen', 'Bảo Tín', 'Tâm Đức'];
        $areas = ['Giải pháp', 'Dịch vụ', 'Phát triển', 'Đầu tư', 'Thương mại', 'Hợp tác'];

        return 'Công ty '.($index % 2 ? 'TNHH ' : 'Cổ phần ').$areas[intdiv($index, count($brands)) % count($areas)].' '.$brands[$index % count($brands)].' Demo';
    }
}
