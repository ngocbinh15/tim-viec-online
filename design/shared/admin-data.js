/* Preview fixtures only. No credentials, API requests or database writes. */
(() => {
  'use strict';
  const key = 'timviec-admin-preview-v1';
  const seed = {
    categories: [
      { id: 1, name: 'Công nghệ thông tin / Phần mềm' },
      { id: 2, name: 'Marketing & Truyền thông số' },
      { id: 3, name: 'Kế toán & Tài chính doanh nghiệp' },
      { id: 4, name: 'Thiết kế đồ họa & UI/UX' },
      { id: 5, name: 'Quản trị nhân sự & Hành chính' },
      { id: 6, name: 'Kinh doanh & Chăm sóc khách hàng' },
      { id: 7, name: 'Logistics & Chuỗi cung ứng' },
      { id: 8, name: 'Giáo dục & Đào tạo' },
    ],
    skills: [
      { id: 1, name: 'PHP', candidates_count: 4 },
      { id: 2, name: 'Laravel', candidates_count: 3 },
      { id: 3, name: 'ReactJS', candidates_count: 5 },
      { id: 4, name: 'NextJS', candidates_count: 2 },
      { id: 5, name: 'TypeScript', candidates_count: 3 },
      { id: 6, name: 'MySQL', candidates_count: 4 },
      { id: 7, name: 'RESTful API', candidates_count: 3 },
      { id: 8, name: 'Docker', candidates_count: 2 },
      { id: 9, name: 'Figma / UI Design', candidates_count: 2 },
      { id: 10, name: 'SEO & Content', candidates_count: 1 },
      { id: 11, name: 'Google Ads', candidates_count: 1 },
      { id: 12, name: 'Microsoft Excel', candidates_count: 4 },
      { id: 13, name: 'Tiếng Anh giao tiếp', candidates_count: 5 },
      { id: 14, name: 'Quản lý dự án', candidates_count: 0 },
    ],
    users: [
      { id: 1, name: 'Quản Trị Viên', email: 'admin@timviec.vn', phone: '0901234567', role: 'admin', status: 'active', created_at: '2026-10-01' },
      { id: 2, name: 'Công Ty Công Nghệ FPT', email: 'employer@timviec.vn', phone: '0912345678', role: 'employer', status: 'active', created_at: '2026-10-02' },
      { id: 3, name: 'Nguyễn Văn Ứng Viên', email: 'candidate@timviec.vn', phone: '0987654321', role: 'candidate', status: 'active', created_at: '2026-10-03' },
      { id: 4, name: 'Trần Thị Linh', email: 'tranlinh@example.com', phone: '0902456789', role: 'candidate', status: 'active', created_at: '2026-10-14' },
      { id: 5, name: 'Lê Minh Hoàng', email: 'minhhoang@example.com', phone: '0934567890', role: 'candidate', status: 'active', created_at: '2026-10-15' },
      { id: 6, name: 'Công ty TNHH An Việt', email: 'tuyendung@anviet.example', phone: '0903456789', role: 'employer', status: 'active', created_at: '2026-10-10' },
      { id: 7, name: 'Phạm Ngọc Mai', email: 'ngocmai@example.com', phone: '0974567890', role: 'candidate', status: 'active', created_at: '2026-10-16' },
      { id: 8, name: 'Công ty Cổ phần Sao Mai', email: 'hr@saomai.example', phone: '0982345678', role: 'employer', status: 'active', created_at: '2026-10-13' },
      { id: 9, name: 'Vũ Đức Anh', email: 'ducanh@example.com', phone: '0913456789', role: 'candidate', status: 'locked', created_at: '2026-10-09' },
      { id: 10, name: 'Công ty TNHH Minh Tâm', email: 'hr@minhtam.example', phone: '0963456789', role: 'employer', status: 'locked', created_at: '2026-10-08' },
      { id: 11, name: 'Đỗ Thu Hà', email: 'thuha@example.com', phone: '', role: 'candidate', status: 'active', created_at: '2026-10-12' },
      { id: 12, name: 'Công ty Cổ phần Bình Minh', email: 'hr@binhminh.example', phone: '0943456789', role: 'employer', status: 'active', created_at: '2026-10-16' },
    ],
    companies: [
      { id: 1, user_id: 2, name: 'FPT Software', city: 'Hà Nội', company_size: '1000+ nhân viên', address: 'Khu Công nghệ cao Hòa Lạc, Hà Nội', description: 'Doanh nghiệp công nghệ và chuyển đổi số, phát triển phần mềm cho khách hàng trong nước và quốc tế.' },
      { id: 2, user_id: 6, name: 'Công ty TNHH An Việt', city: 'TP. Hồ Chí Minh', company_size: '50–100 nhân viên', address: 'Quận Bình Thạnh, TP. Hồ Chí Minh', description: 'Doanh nghiệp cung cấp giải pháp thương mại và dịch vụ khách hàng.' },
      { id: 3, user_id: 8, name: 'Công ty Cổ phần Sao Mai', city: 'Đà Nẵng', company_size: '100–200 nhân viên', address: 'Quận Hải Châu, Đà Nẵng', description: 'Đội ngũ thiết kế sản phẩm và truyền thông cho các doanh nghiệp tại Việt Nam.' },
      { id: 4, user_id: 10, name: 'Công ty TNHH Minh Tâm', city: 'Hà Nội', company_size: '10–50 nhân viên', address: 'Quận Cầu Giấy, Hà Nội', description: 'Doanh nghiệp cung cấp dịch vụ vận hành và hỗ trợ kinh doanh.' },
      { id: 5, user_id: 12, name: 'Công ty Cổ phần Bình Minh', city: 'TP. Hồ Chí Minh', company_size: '50–100 nhân viên', address: 'TP. Thủ Đức, TP. Hồ Chí Minh', description: 'Doanh nghiệp hoạt động trong lĩnh vực giáo dục và đào tạo kỹ năng.' },
    ],
    jobs: [
      { id: 1, company_id: 1, category_id: 1, title: 'Lập Trình Viên Backend Laravel (Middle)', job_level: 'Middle', quantity: 2, salary_min: 18000000, salary_max: 28000000, is_negotiable: false, job_type: 'full_time', city: 'Hà Nội', deadline: '2026-11-15', status: 'active', is_reported: false, created_at: '2026-10-10', skills: [1, 2, 6, 7, 8], description: 'Phát triển và bảo trì hệ thống RESTful API cho sản phẩm quản lý tuyển dụng. Phối hợp với đội Frontend Next.js và tích hợp AI.', requirements: 'Tối thiểu 2 năm kinh nghiệm làm việc với Laravel.\nThành thạo MySQL và thiết kế cơ sở dữ liệu.\nCó hiểu biết về WebSocket và Docker là lợi thế.', benefits: 'Lương tháng 13, thưởng hiệu quả dự án.\nBảo hiểm sức khỏe và cơ hội đào tạo chuyên môn.' },
      { id: 2, company_id: 2, category_id: 6, title: 'Cộng tác viên nhập liệu tại nhà', job_level: 'Nhân viên', quantity: 10, salary_min: 8000000, salary_max: 12000000, is_negotiable: false, job_type: 'remote', city: 'TP. Hồ Chí Minh', deadline: '2026-11-10', status: 'active', is_reported: true, created_at: '2026-10-16', skills: [12], description: 'Nhập và kiểm tra dữ liệu sản phẩm trên hệ thống. Làm việc từ xa theo khung thời gian thỏa thuận.', requirements: 'Có máy tính cá nhân và kết nối internet ổn định.\nCẩn thận, có kỹ năng sử dụng bảng tính.', benefits: 'Thời gian linh hoạt.\nĐược hướng dẫn quy trình trước khi nhận công việc.' },
      { id: 3, company_id: 3, category_id: 2, title: 'Chuyên viên Digital Marketing', job_level: 'Nhân viên', quantity: 2, salary_min: 12000000, salary_max: 18000000, is_negotiable: false, job_type: 'full_time', city: 'Đà Nẵng', deadline: '2026-11-05', status: 'active', is_reported: true, created_at: '2026-10-15', skills: [10, 11], description: 'Xây dựng kế hoạch truyền thông, quản lý chiến dịch quảng cáo và theo dõi hiệu quả tiếp cận khách hàng.', requirements: 'Có ít nhất 1 năm kinh nghiệm marketing.\nBiết SEO, nội dung và Google Ads.', benefits: 'Thưởng hiệu quả chiến dịch.\nĐào tạo định kỳ và hỗ trợ công cụ làm việc.' },
      { id: 4, company_id: 4, category_id: 6, title: 'Nhân viên kinh doanh trực tuyến', job_level: 'Nhân viên', quantity: 5, salary_min: 7000000, salary_max: null, is_negotiable: false, job_type: 'full_time', city: 'Hà Nội', deadline: '2026-10-30', status: 'closed', is_reported: true, created_at: '2026-10-14', skills: [12, 13], description: 'Tư vấn sản phẩm và chăm sóc khách hàng qua các kênh trực tuyến của công ty.', requirements: 'Giao tiếp rõ ràng.\nCó khả năng làm việc theo mục tiêu và sử dụng bảng tính.', benefits: 'Lương cơ bản và thưởng doanh số.\nĐược hướng dẫn nghiệp vụ bán hàng.' },
      { id: 5, company_id: 1, category_id: 1, title: 'Frontend Developer React / Next.js', job_level: 'Middle', quantity: 3, salary_min: 20000000, salary_max: 32000000, is_negotiable: false, job_type: 'full_time', city: 'Hà Nội', deadline: '2026-11-20', status: 'active', is_reported: false, created_at: '2026-10-12', skills: [3, 4, 5, 7], description: 'Phát triển giao diện web, phối hợp với thiết kế và backend để xây dựng trải nghiệm người dùng nhất quán.', requirements: 'Có kinh nghiệm React, Next.js và TypeScript.\nHiểu responsive, accessibility và tối ưu hiệu năng.', benefits: 'Thiết bị làm việc đầy đủ.\nĐào tạo, bảo hiểm sức khỏe và thưởng dự án.' },
      { id: 6, company_id: 3, category_id: 4, title: 'Product Designer UI/UX', job_level: 'Senior', quantity: 1, salary_min: null, salary_max: null, is_negotiable: true, job_type: 'full_time', city: 'Đà Nẵng', deadline: '2026-11-01', status: 'active', is_reported: false, created_at: '2026-10-13', skills: [9, 13], description: 'Nghiên cứu nhu cầu người dùng, thiết kế luồng tương tác và hệ thống giao diện cho sản phẩm số.', requirements: 'Sử dụng thành thạo Figma.\nCó portfolio và kinh nghiệm nghiên cứu người dùng.', benefits: 'Lương thỏa thuận theo năng lực.\nMôi trường sáng tạo và cơ hội phát triển nghề nghiệp.' },
      { id: 7, company_id: 2, category_id: 3, title: 'Kế toán tổng hợp', job_level: 'Nhân viên', quantity: 1, salary_min: 12000000, salary_max: 16000000, is_negotiable: false, job_type: 'full_time', city: 'TP. Hồ Chí Minh', deadline: '2026-10-12', status: 'expired', is_reported: false, created_at: '2026-10-07', skills: [12], description: 'Theo dõi chứng từ và lập báo cáo tài chính định kỳ. Đối chiếu công nợ và hỗ trợ kê khai thuế.', requirements: 'Tốt nghiệp chuyên ngành kế toán.\nÍt nhất 2 năm kinh nghiệm và sử dụng tốt Excel.', benefits: 'Thưởng cuối năm và đầy đủ chế độ bảo hiểm.' },
      { id: 8, company_id: 5, category_id: 8, title: 'Trợ giảng tiếng Anh bán thời gian', job_level: 'Nhân viên', quantity: 3, salary_min: 5000000, salary_max: 8000000, is_negotiable: false, job_type: 'part_time', city: 'TP. Hồ Chí Minh', deadline: '2026-11-25', status: 'active', is_reported: false, created_at: '2026-10-16', skills: [13], description: 'Hỗ trợ giảng viên tổ chức lớp học, theo dõi tiến độ học viên và chuẩn bị tài liệu.', requirements: 'Tiếng Anh giao tiếp tốt.\nCó trách nhiệm và yêu thích công việc giảng dạy.', benefits: 'Lịch làm việc linh hoạt.\nĐào tạo kỹ năng sư phạm.' },
      { id: 9, company_id: 1, category_id: 1, title: 'Thực tập sinh phát triển phần mềm', job_level: 'Intern', quantity: 3, salary_min: 4000000, salary_max: 6000000, is_negotiable: false, job_type: 'internship', city: 'Hà Nội', deadline: '2026-11-10', status: 'closed', is_reported: false, created_at: '2026-10-09', skills: [1, 3, 6], description: 'Tham gia phát triển các tính năng nhỏ và học quy trình làm việc cùng đội kỹ thuật.', requirements: 'Sinh viên năm cuối ngành CNTT.\nCó kiến thức PHP hoặc React cơ bản.', benefits: 'Trợ cấp thực tập và người hướng dẫn trực tiếp.' },
      { id: 10, company_id: 5, category_id: 5, title: 'Chuyên viên nhân sự tổng hợp', job_level: 'Nhân viên', quantity: 1, salary_min: 10000000, salary_max: 14000000, is_negotiable: false, job_type: 'full_time', city: 'TP. Hồ Chí Minh', deadline: '2026-11-18', status: 'active', is_reported: false, created_at: '2026-10-11', skills: [12, 13], description: 'Quản lý hồ sơ nhân sự, phối hợp tuyển dụng và hỗ trợ hoạt động đào tạo nội bộ.', requirements: 'Có 1 năm kinh nghiệm nhân sự.\nSử dụng tốt công cụ văn phòng.', benefits: 'Chế độ bảo hiểm đầy đủ.\nĐào tạo chuyên môn và thưởng hiệu quả công việc.' },
    ],
  };
  // Joined application projections: candidate_user_id comes from candidate_profiles.user_id.
  // Dates and unique job/candidate pairs keep chart totals consistent with the lists.
  const applicationPairs = [
    [1, 3, '10'], [1, 9, '11'], [1, 11, '12'], [1, 4, '14'], [1, 5, '15'], [1, 7, '16'],
    [2, 3, '16'], [2, 7, '16'], [2, 11, '16'],
    [3, 3, '15'], [3, 4, '15'], [3, 5, '15'], [3, 7, '16'],
    [4, 3, '14'], [4, 4, '14'],
    [5, 3, '12'], [5, 9, '13'], [5, 11, '13'], [5, 4, '14'], [5, 5, '15'],
    [6, 3, '13'], [6, 11, '13'], [6, 4, '14'],
    [7, 3, '07'], [7, 9, '10'], [7, 11, '12'],
    [8, 7, '16'], [8, 4, '16'],
    [9, 3, '09'], [9, 9, '09'], [9, 11, '12'],
    [10, 3, '11'], [10, 11, '12'], [10, 4, '14'],
  ];
  seed.applications = applicationPairs.map(([job_id, candidate_user_id, day], index) => ({ id: index + 1, job_id, candidate_user_id, created_at: `2026-10-${day}` }));
  seed.jobs.forEach(job => {
    job.applications_count = seed.applications.filter(application => application.job_id === job.id).length;
    job.address = seed.companies.find(company => company.id === job.company_id).address;
  });
  let volatile = null;
  let storageUnavailable = false;
  const clone = value => JSON.parse(JSON.stringify(value));

  function validate(value) {
    for (const table of ['categories', 'skills', 'users', 'companies', 'jobs']) {
      if (!Array.isArray(value?.[table])) throw new Error('Dữ liệu mẫu không hợp lệ.');
      if (new Set(value[table].map(row => row.id)).size !== value[table].length) throw new Error('Dữ liệu mẫu bị trùng.');
      for (const row of value[table]) {
        if (!Number.isSafeInteger(row.id) || row.id < 1) throw new Error('Dữ liệu mẫu không hợp lệ.');
        const text = table === 'jobs' ? row.title : row.name;
        if (typeof text !== 'string') throw new Error('Dữ liệu mẫu không hợp lệ.');
      }
    }
    for (const user of value.users) {
      if (!['candidate', 'employer', 'admin'].includes(user.role) || !['active', 'locked'].includes(user.status) || typeof user.email !== 'string') throw new Error('Tài khoản mẫu không hợp lệ.');
    }
    for (const company of value.companies) {
      if (!value.users.some(user => user.id === company.user_id && user.role === 'employer')) throw new Error('Chủ doanh nghiệp mẫu không hợp lệ.');
    }
    for (const skill of value.skills) {
      if (!Number.isSafeInteger(skill.candidates_count) || skill.candidates_count < 0 || skill.candidates_count > value.users.filter(user => user.role === 'candidate').length) throw new Error('Thống kê kỹ năng mẫu không hợp lệ.');
    }
    for (const job of value.jobs) {
      if (!['active', 'closed', 'expired'].includes(job.status) || typeof job.is_reported !== 'boolean' || !Array.isArray(job.skills) || !Number.isSafeInteger(job.applications_count) || job.applications_count < 0 || !Number.isSafeInteger(job.quantity) || job.quantity < 1) throw new Error('Tin tuyển dụng mẫu không hợp lệ.');
      if (!value.companies.some(company => company.id === job.company_id) || !value.categories.some(category => category.id === job.category_id) || !job.skills.every(id => value.skills.some(skill => skill.id === id))) throw new Error('Liên kết dữ liệu mẫu không hợp lệ.');
    }
    if (!Array.isArray(value.applications) || new Set(value.applications.map(row => row.id)).size !== value.applications.length) throw new Error('Hồ sơ ứng tuyển mẫu không hợp lệ.');
    const pairs = new Set();
    for (const application of value.applications) {
      const job = value.jobs.find(row => row.id === application.job_id);
      const candidate = value.users.find(row => row.id === application.candidate_user_id && row.role === 'candidate');
      const pair = `${application.job_id}:${application.candidate_user_id}`;
      if (!Number.isSafeInteger(application.id) || application.id < 1 || !job || !candidate || pairs.has(pair) || typeof application.created_at !== 'string' || application.created_at < job.created_at || application.created_at < candidate.created_at || application.created_at > job.deadline) throw new Error('Liên kết hồ sơ ứng tuyển không hợp lệ.');
      pairs.add(pair);
    }
    if (value.jobs.some(job => job.applications_count !== value.applications.filter(application => application.job_id === job.id).length)) throw new Error('Thống kê hồ sơ mẫu không nhất quán.');
    return value;
  }

  function read() {
    if (volatile) return validate(clone(volatile));
    let raw;
    try { raw = sessionStorage.getItem(key); }
    catch { storageUnavailable = true; }
    return validate(raw ? JSON.parse(raw) : clone(seed));
  }

  function write(value) {
    validate(value);
    try { sessionStorage.setItem(key, JSON.stringify(value)); }
    catch { storageUnavailable = true; }
    volatile = clone(value);
  }

  function reset() {
    try { sessionStorage.removeItem(key); }
    catch { storageUnavailable = true; }
    volatile = clone(seed);
  }

  window.AdminDemo = { read, write, reset, get storageUnavailable() { return storageUnavailable; } };
})();
