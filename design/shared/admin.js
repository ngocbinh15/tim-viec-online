(() => {
  'use strict';
  const { escape: e, icon: i, notify, openDialog, closeDialog } = window.AdminUI;
  const page = document.body.dataset.adminPage;
  const $ = selector => document.querySelector(selector);
  const content = $('#adminContent');
  const errorPanel = $('#adminError');
  const pageSize = 6;
  const roleLabels = { candidate: 'Ứng viên', employer: 'Nhà tuyển dụng', admin: 'Quản trị viên' };
  const jobLabels = { active: 'Đang tuyển', closed: 'Đã đóng', expired: 'Hết hạn' };
  const typeLabels = { full_time: 'Toàn thời gian', part_time: 'Bán thời gian', remote: 'Từ xa', internship: 'Thực tập' };
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();
  const date = value => {
    const parsed = new Date(`${value}T12:00:00+07:00`);
    return Number.isNaN(parsed.getTime()) ? 'Chưa có thông tin' : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(parsed);
  };
  const number = value => new Intl.NumberFormat('vi-VN').format(value);
  const initials = name => name.split(/\s+/).slice(-2).map(part => part[0]).join('').toLocaleUpperCase('vi');
  const badge = (text, color = '') => `<span class="ap-badge${color ? ` ap-badge-${color}` : ''}">${e(text)}</span>`;
  const roleBadge = role => badge(roleLabels[role], role === 'candidate' ? 'blue' : role === 'employer' ? 'green' : 'amber');
  const userBadge = status => badge(status === 'locked' ? 'Bị khóa' : 'Hoạt động', status === 'locked' ? 'red' : 'green');
  const jobBadge = status => badge(jobLabels[status], status === 'active' ? 'green' : '');
  const person = user => `<div class="ap-person"><span class="ap-avatar${user.role === 'employer' ? ' ap-avatar-company' : ''}">${e(initials(user.name))}</span><div><strong class="ap-cell-title">${e(user.name)}</strong><span class="ap-cell-sub">${e(user.email)}</span></div></div>`;
  const viewUserButton = user => `<button type="button" class="ap-icon-button" data-action="view-user" data-id="${user.id}" aria-label="Xem tài khoản ${e(user.name)}">${i('eye')}</button>`;
  const metric = (label, value, note, glyph, alert = false) => `<article class="ap-metric${alert ? ' ap-metric-alert' : ''}"><div class="ap-metric-top">${e(label)}${i(glyph)}</div><strong>${e(number(value))}</strong><small>${e(note)}</small></article>`;
  let db;
  let parameters = new URLSearchParams(location.search);
  const state = {
    query: parameters.get('q') || '',
    role: ['candidate', 'employer', 'admin'].includes(parameters.get('role')) ? parameters.get('role') : 'all',
    status: ['active', 'closed', 'expired', 'locked'].includes(parameters.get('status')) ? parameters.get('status') : 'all',
    report: parameters.get('report') === 'all' ? 'all' : 'reported',
    usage: ['used', 'unused'].includes(parameters.get('usage')) ? parameters.get('usage') : 'all',
    sort: ['name', 'oldest', 'usage', 'newest'].includes(parameters.get('sort')) ? parameters.get('sort') : ['skills', 'categories'].includes(page) ? 'name' : 'newest',
    page: Math.max(1, Math.min(10000, Number.parseInt(parameters.get('page'), 10) || 1)),
  };
  const companyFor = job => db.companies.find(company => company.id === job.company_id);
  const categoryFor = job => db.categories.find(category => category.id === job.category_id);
  const jobsFor = (kind, id) => db.jobs.filter(job => kind === 'categories' ? job.category_id === id : job.skills.includes(id));
  const usageFor = (kind, row) => jobsFor(kind, row.id).length + (kind === 'skills' ? row.candidates_count || 0 : 0);
  const salary = job => {
    const money = value => number(value);
    if (job.is_negotiable) return 'Thỏa thuận';
    if (job.salary_min && job.salary_max) return `${money(job.salary_min)} – ${money(job.salary_max)} VNĐ`;
    if (job.salary_min) return `Từ ${money(job.salary_min)} VNĐ`;
    return 'Chưa có thông tin';
  };

  function syncURL() {
    const params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.role !== 'all' && page === 'users') params.set('role', state.role);
    if (state.status !== 'all' && ['jobs', 'users'].includes(page)) params.set('status', state.status);
    if (page === 'jobs') params.set('report', state.report);
    if (state.usage !== 'all') params.set('usage', state.usage);
    params.set('sort', state.sort);
    if (state.page > 1) params.set('page', state.page);
    try { history.replaceState(null, '', `${location.pathname}?${params}${location.hash}`); }
    catch { /* File previews may disallow history updates; filtering still works. */ }
  }

  function refreshShell() {
    const reports = db.jobs.filter(job => job.is_reported).length;
    document.querySelectorAll('[data-report-count]').forEach(node => { node.textContent = reports; node.hidden = reports === 0; node.setAttribute('aria-label', `${reports} tin bị báo cáo`); });
    if (window.AdminDemo.storageUnavailable) {
      $('[data-admin-preview] span').textContent = 'Dữ liệu minh họa · Trình duyệt không lưu được thay đổi khi chuyển trang.';
    }
  }

  function renderOverview() {
    const candidates = db.users.filter(user => user.role === 'candidate').length;
    const employers = db.users.filter(user => user.role === 'employer').length;
    const reports = db.jobs.filter(job => job.is_reported).sort((a, b) => b.created_at.localeCompare(a.created_at));
    $('#overviewMetrics').innerHTML = metric('Tổng tài khoản', db.users.length, `${candidates} ứng viên · ${employers} nhà tuyển dụng`, 'users') + metric('Tin tuyển dụng', db.jobs.length, `${db.jobs.filter(job => job.status === 'active').length} tin đang tuyển`, 'briefcase-business') + metric('Lượt ứng tuyển', db.jobs.reduce((total, job) => total + job.applications_count, 0), 'Hồ sơ đã nộp cho các tin hiện có', 'files') + metric('Tin bị báo cáo', reports.length, 'Cần quản trị viên kiểm tra nội dung', 'flag', true);
    $('#overviewReportCount').textContent = `${reports.length} tin`;
    $('#reportedSummary').innerHTML = reports.length ? reports.slice(0, 3).map(job => `<article class="ap-summary-item">${i('flag')}<div><a class="ap-cell-title" href="../page_admin_job_detail/index.html?job=${job.id}">${e(job.title)}</a><p>${e(companyFor(job).name)} · ${date(job.created_at)}</p><a class="ap-text-link" href="../page_admin_job_detail/index.html?job=${job.id}">Kiểm tra nội dung ${i('arrow-right')}</a></div></article>`).join('') : `<div class="ap-empty">${i('circle-check')}<h3>Đã xử lý hết hàng chờ</h3><p>Hiện không có tin bị báo cáo trong dữ liệu mẫu.</p></div>`;
    const recent = [...db.users].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id).slice(0, 4);
    $('#recentUsers').innerHTML = recent.map(user => `<tr><td>${person(user)}</td><td data-label="Vai trò">${roleBadge(user.role)}</td><td class="ap-number" data-label="Ngày tham gia">${date(user.created_at)}</td><td><div class="ap-actions">${viewUserButton(user)}</div></td></tr>`).join('');
    const categories = db.categories.map(category => ({ ...category, count: db.jobs.filter(job => job.status === 'active' && job.category_id === category.id).length })).filter(category => category.count).sort((a, b) => b.count - a.count).slice(0, 4);
    $('#categorySummary').innerHTML = categories.length ? categories.map(category => `<div class="ap-summary-item"><div><strong>${e(category.name)}</strong><small>Tin đang tuyển</small></div>${badge(`${category.count} tin`, 'blue')}</div>`).join('') : '<div class="ap-empty"><p>Chưa có tin đang tuyển.</p></div>';
    renderChart();
  }

  function renderChart() {
    const days = Number($('#trendPeriod').value);
    const end = new Date('2026-10-16T12:00:00Z');
    const points = Array.from({ length: days }, (_, index) => {
      const day = new Date(end);
      day.setUTCDate(end.getUTCDate() - days + index + 1);
      const iso = day.toISOString().slice(0, 10);
      const jobs = db.jobs.filter(job => job.created_at === iso);
      return { date: iso, jobs: jobs.length, applications: db.applications.filter(application => application.created_at === iso).length };
    });
    const maximum = Math.max(5, ...points.map(point => Math.max(point.applications, point.jobs)));
    const ceiling = Math.ceil(maximum / 5) * 5;
    const width = 620, height = 238, left = 29, right = 14, top = 12, bottom = 34;
    const plotHeight = height - top - bottom;
    const gap = (width - left - right) / days;
    const x = index => left + (index + .5) * gap;
    const y = value => top + plotHeight - value / ceiling * plotHeight;
    const grid = Array.from({ length: 4 }, (_, index) => {
      const value = ceiling / 3 * index;
      return `<line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}" class="ap-chart-grid"/><text x="${left - 9}" y="${y(value) + 3}" text-anchor="end">${Math.round(value)}</text>`;
    }).join('');
    const bars = points.map((point, index) => `<rect class="ap-chart-bar" x="${x(index) - Math.min(12, gap / 5)}" y="${y(point.jobs)}" width="${Math.min(24, gap / 2.5)}" height="${plotHeight * point.jobs / ceiling}" rx="3"><title>${date(point.date)}: ${point.jobs} tin đăng mới</title></rect>`).join('');
    const line = `<polyline class="ap-chart-line" points="${points.map((point, index) => `${x(index)},${y(point.applications)}`).join(' ')}"/>`;
    const dots = points.map((point, index) => `<circle class="ap-chart-points" cx="${x(index)}" cy="${y(point.applications)}" r="3"><title>${date(point.date)}: ${point.applications} lượt ứng tuyển</title></circle>`).join('');
    const labels = points.filter((_, index) => days === 7 || index % 2 === 0 || index === days - 1).map(point => `<text x="${x(points.indexOf(point))}" y="${height - 8}" text-anchor="middle">${point.date.slice(8)}/${point.date.slice(5, 7)}</text>`).join('');
    $('#trendChart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chartTitle chartDescription"><title id="chartTitle">Hoạt động tuyển dụng trong ${days} ngày</title><desc id="chartDescription">Dữ liệu minh họa. Cột xanh là số tin đăng mới, đường xanh lá là lượt ứng tuyển. Số liệu chi tiết có trong bảng bên dưới.</desc>${grid}${bars}${line}${dots}${labels}</svg>`;
    $('#trendData').innerHTML = `<table class="ap-table"><caption class="ap-sr-only">Số liệu tuyển dụng ${days} ngày</caption><thead><tr><th scope="col">Ngày</th><th scope="col">Tin đăng mới</th><th scope="col">Lượt ứng tuyển</th></tr></thead><tbody>${points.map(point => `<tr><th scope="row">${date(point.date)}</th><td>${point.jobs}</td><td>${point.applications}</td></tr>`).join('')}</tbody></table>`;
  }

  function filterRows() {
    let rows = [...db[page]];
    const query = normalize(state.query);
    if (page === 'jobs') {
      rows = rows.filter(job => (state.report === 'all' || job.is_reported) && (state.status === 'all' || job.status === state.status) && normalize(`${job.title} ${companyFor(job).name}`).includes(query));
    } else if (page === 'users') {
      rows = rows.filter(user => (state.role === 'all' || user.role === state.role) && (state.status === 'all' || user.status === state.status) && normalize(`${user.name} ${user.email}`).includes(query));
    } else {
      rows = rows.filter(row => normalize(row.name).includes(query) && (state.usage === 'all' || (state.usage === 'used' ? usageFor(page, row) > 0 : usageFor(page, row) === 0)));
    }
    rows.sort((a, b) => {
      if (state.sort === 'name') return (a.name || a.title).localeCompare(b.name || b.title, 'vi');
      if (state.sort === 'usage') return usageFor(page, b) - usageFor(page, a) || a.name.localeCompare(b.name, 'vi');
      const compared = (a.created_at || '').localeCompare(b.created_at || '') || a.id - b.id;
      return state.sort === 'oldest' ? compared : -compared;
    });
    return rows;
  }

  function jobRow(job) {
    return `<tr><td><a href="../page_admin_job_detail/index.html?job=${job.id}" class="ap-cell-title">${e(job.title)}</a><span class="ap-cell-sub">${e(companyFor(job).name)}</span></td><td data-label="Địa điểm">${e(job.city)}</td><td data-label="Trạng thái"><div class="ap-status-stack">${jobBadge(job.status)}${job.is_reported ? badge('Bị báo cáo', 'amber') : ''}</div></td><td data-label="Ngày đăng" class="ap-number">${date(job.created_at)}</td><td><div class="ap-actions"><a class="ap-button ap-button-small" href="../page_admin_job_detail/index.html?job=${job.id}" aria-label="Kiểm tra tin ${e(job.title)}">${i('eye')}Xem chi tiết</a></div></td></tr>`;
  }

  function userRow(user) {
    const locked = user.status === 'locked';
    return `<tr><td>${person(user)}</td><td data-label="Vai trò">${roleBadge(user.role)}</td><td data-label="Trạng thái">${userBadge(user.status)}</td><td data-label="Ngày tham gia" class="ap-number">${date(user.created_at)}</td><td><div class="ap-actions">${viewUserButton(user)}${user.role === 'admin' ? `<span class="ap-badge" title="Tài khoản quản trị được bảo vệ">${i('shield-check')}Được bảo vệ</span>` : `<button type="button" class="ap-button ap-button-small" data-action="toggle-user" data-id="${user.id}" aria-label="${locked ? 'Mở khóa' : 'Khóa'} tài khoản ${e(user.name)}">${i(locked ? 'lock-keyhole-open' : 'lock-keyhole')}${locked ? 'Mở khóa' : 'Khóa'}</button>`}</div></td></tr>`;
  }

  function catalogRow(row) {
    const count = jobsFor(page, row.id).length;
    const thirdCell = page === 'categories' ? (count ? badge('Đang sử dụng', 'green') : badge('Chưa sử dụng')) : `<span class="ap-number">${number(row.candidates_count || 0)} hồ sơ</span>`;
    return `<tr><td><strong class="ap-cell-title">${e(row.name)}</strong></td><td data-label="Tin tuyển dụng" class="ap-number">${number(count)} tin</td><td data-label="${page === 'categories' ? 'Tình trạng sử dụng' : 'Hồ sơ ứng viên'}">${thirdCell}</td><td><div class="ap-actions"><button type="button" class="ap-icon-button" data-action="edit" data-id="${row.id}" aria-label="Sửa ${e(row.name)}">${i('pencil')}</button><button type="button" class="ap-icon-button" data-action="delete-catalog" data-id="${row.id}" aria-label="Xóa ${e(row.name)}">${i('trash')}</button></div></td></tr>`;
  }

  function renderList() {
    if (page === 'jobs') {
      $('#jobMetrics').innerHTML = metric('Tổng tin tuyển dụng', db.jobs.length, 'Toàn bộ tin hiện có', 'briefcase-business') + metric('Đang tuyển', db.jobs.filter(job => job.status === 'active').length, 'Đang nhận hồ sơ ứng tuyển', 'circle-check') + metric('Đã đóng / Hết hạn', db.jobs.filter(job => job.status !== 'active').length, 'Dừng nhận hồ sơ mới', 'clock-3') + metric('Bị báo cáo', db.jobs.filter(job => job.is_reported).length, 'Ưu tiên kiểm tra nội dung', 'flag', true);
      $('[data-reported-total]').textContent = db.jobs.filter(job => job.is_reported).length;
      $('[data-jobs-total]').textContent = db.jobs.length;
      document.querySelectorAll('[data-report]').forEach(link => { if (link.dataset.report === state.report) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); });
    }
    if (page === 'users') {
      $('#userMetrics').innerHTML = metric('Tổng tài khoản', db.users.length, 'Bao gồm tài khoản quản trị', 'users') + metric('Ứng viên', db.users.filter(user => user.role === 'candidate').length, 'Tài khoản tìm kiếm việc làm', 'user-round') + metric('Nhà tuyển dụng', db.users.filter(user => user.role === 'employer').length, 'Tài khoản đại diện doanh nghiệp', 'building-complex') + metric('Tài khoản bị khóa', db.users.filter(user => user.status === 'locked').length, 'Đã hạn chế quyền truy cập', 'lock-keyhole', true);
    }
    if (['categories', 'skills'].includes(page)) {
      const used = db[page].filter(row => usageFor(page, row) > 0).length;
      $('#catalogSummary').textContent = `${db[page].length} mục · ${used} đang được sử dụng · ${db[page].length - used} chưa sử dụng`;
    }
    const rows = filterRows();
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * pageSize;
    const current = rows.slice(start, start + pageSize);
    $('#listRows').innerHTML = current.map(page === 'jobs' ? jobRow : page === 'users' ? userRow : catalogRow).join('');
    $('#listTable').hidden = rows.length === 0;
    $('#listEmpty').hidden = rows.length > 0;
    const noun = page === 'jobs' ? 'tin' : page === 'users' ? 'tài khoản' : 'mục';
    $('#listCount').textContent = rows.length ? `Hiển thị ${start + 1}–${Math.min(start + pageSize, rows.length)} trên ${number(rows.length)} ${noun}` : `0 ${noun} phù hợp`;
    $('#listPagination').innerHTML = totalPages > 1 ? `<button type="button" data-page="${state.page - 1}" aria-label="Trang trước"${state.page === 1 ? ' disabled' : ''}>${i('chevron-left')}</button>${Array.from({ length: totalPages }, (_, index) => `<button type="button" data-page="${index + 1}" aria-label="Trang ${index + 1}"${state.page === index + 1 ? ' aria-current="page"' : ''}>${index + 1}</button>`).join('')}<button type="button" data-page="${state.page + 1}" aria-label="Trang sau"${state.page === totalPages ? ' disabled' : ''}>${i('chevron-right')}</button>` : '';
  }

  function renderDetail() {
    const rawId = new URLSearchParams(location.search).get('job');
    const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : NaN;
    const job = db.jobs.find(row => row.id === id);
    if (!job) {
      $('#jobDetail').innerHTML = `<section class="ap-panel ap-empty">${i('inbox')}<h2>Không tìm thấy tin tuyển dụng</h2><p>Tin có thể đã bị xóa hoặc liên kết không còn hợp lệ.</p><a class="ap-button ap-button-primary" href="../page_admin_jobs/index.html">Về danh sách tin</a></section>`;
      return;
    }
    const company = companyFor(job);
    const owner = db.users.find(user => user.id === company.user_id);
    const facts = [['Ngành nghề', categoryFor(job).name], ['Cấp bậc', job.job_level], ['Số lượng tuyển', `${job.quantity} người`], ['Hình thức', typeLabels[job.job_type]], ['Hạn nộp hồ sơ', date(job.deadline)], ['Ngày đăng', date(job.created_at)], ['Hồ sơ đã nhận', `${job.applications_count} hồ sơ`]];
    $('#jobDetail').innerHTML = `${job.is_reported ? `<div class="ap-notice ap-notice-amber">${i('flag')}<div><strong>Tin tuyển dụng này đã bị báo cáo.</strong><p>Đối chiếu nội dung với chính sách tuyển dụng trước khi đưa ra quyết định xử lý.</p></div></div>` : ''}<div class="ap-content-grid"><article class="ap-panel"><div class="ap-detail-header"><div class="ap-tags">${jobBadge(job.status)}${job.is_reported ? badge('Bị báo cáo', 'amber') : ''}</div><h2>${e(job.title)}</h2><p>${e(company.name)}</p><div class="ap-detail-meta"><span>${i('map-pin')}${e(job.city)}</span><span>${i('banknote')}${e(salary(job))}</span></div></div><section class="ap-detail-section"><h3>Mô tả công việc</h3><p>${e(job.description)}</p></section><section class="ap-detail-section"><h3>Yêu cầu chuyên môn</h3><p>${e(job.requirements)}</p></section><section class="ap-detail-section"><h3>Quyền lợi & đãi ngộ</h3><p>${e(job.benefits)}</p></section><section class="ap-detail-section"><h3>Kỹ năng yêu cầu</h3><div class="ap-tags">${job.skills.length ? job.skills.map(id => `<span>${e(db.skills.find(skill => skill.id === id).name)}</span>`).join('') : '<p>Chưa có kỹ năng được gắn.</p>'}</div></section><section class="ap-detail-section"><h3>Địa điểm làm việc</h3><p>${e(job.address)}</p></section></article><aside class="ap-stack" aria-label="Thông tin và quyết định kiểm duyệt"><section class="ap-panel"><div class="ap-panel-heading"><h2>Thông tin tuyển dụng</h2></div><dl class="ap-facts">${facts.map(([name, value]) => `<div><dt>${e(name)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl></section><section class="ap-panel ap-company-card"><div class="ap-person"><span class="ap-avatar ap-avatar-company">${e(initials(company.name))}</span><div><strong class="ap-cell-title">${e(company.name)}</strong><span class="ap-cell-sub">${e(company.company_size)}</span></div></div><p>${e(company.description)}</p><div style="margin-top:16px">${userBadge(owner.status)}</div><button type="button" class="ap-button ap-button-small" style="margin-top:16px" data-action="view-user" data-id="${owner.id}">${i('user-round')}Xem tài khoản chủ tin</button></section><section class="ap-panel ap-danger-section"><h3>Xử lý tin vi phạm</h3><p>Xóa tin sẽ xóa các hồ sơ ứng tuyển, hội thoại và dữ liệu liên quan. Thao tác này không tự động khóa tài khoản nhà tuyển dụng.</p><button type="button" class="ap-button ap-button-danger" data-action="delete-job" data-id="${job.id}">${i('trash')}Xóa tin vi phạm</button></section></aside></div>`;
  }

  function showUser(id) {
    const user = db.users.find(row => row.id === id);
    if (!user) return;
    const company = db.companies.find(row => row.user_id === user.id);
    const body = `<div class="ap-account-heading"><span class="ap-avatar">${e(initials(user.name))}</span><div><h3>${e(user.name)}</h3><p>${e(user.email)}</p></div></div><dl class="ap-account-facts"><div><dt>Vai trò</dt><dd>${roleBadge(user.role)}</dd></div><div><dt>Trạng thái</dt><dd>${userBadge(user.status)}</dd></div><div><dt>Số điện thoại</dt><dd>${e(user.phone || 'Chưa cập nhật')}</dd></div><div><dt>Ngày tham gia</dt><dd>${date(user.created_at)}</dd></div>${company ? `<div><dt>Doanh nghiệp</dt><dd>${e(company.name)}</dd></div><div><dt>Tin đã đăng</dt><dd>${db.jobs.filter(job => job.company_id === company.id).length} tin</dd></div>` : ''}</dl>`;
    openDialog('Chi tiết tài khoản', body);
  }

  function toggleUser(id) {
    const user = db.users.find(row => row.id === id);
    if (!user || user.role === 'admin') return;
    const unlock = user.status === 'locked';
    const form = openDialog(`${unlock ? 'Mở khóa' : 'Khóa'} tài khoản?`, `<p>Bạn đang ${unlock ? 'mở khóa' : 'khóa'} tài khoản <strong>${e(user.name)}</strong> (${e(user.email)}).</p><div class="ap-notice${unlock ? '' : ' ap-notice-amber'}">${i(unlock ? 'lock-keyhole-open' : 'shield-check')}<p>${unlock ? 'Tài khoản được phép đăng nhập trở lại khi hệ thống thực tế áp dụng quyết định này.' : 'Trong hệ thống thực tế, mọi phiên đăng nhập của tài khoản này phải được thu hồi ngay. Tin đăng và hồ sơ được giữ lại.'}</p></div><p>Thao tác hiện tại chỉ cập nhật dữ liệu minh họa.</p>`, `<button type="button" class="ap-button" data-close-dialog data-initial-focus>Hủy</button><button type="submit" class="ap-button ${unlock ? 'ap-button-primary' : 'ap-button-danger'}">${unlock ? 'Mở khóa' : 'Khóa'} tài khoản</button>`);
    form.addEventListener('submit', event => {
      event.preventDefault();
      user.status = unlock ? 'active' : 'locked';
      persist();
      closeDialog();
      notify(`Đã ${unlock ? 'mở khóa' : 'khóa'} tài khoản trong dữ liệu mẫu.`);
    });
  }

  function editCatalog(id) {
    const kind = page;
    const noun = kind === 'categories' ? 'ngành nghề' : 'kỹ năng';
    const row = id ? db[kind].find(item => item.id === id) : null;
    if (id && !row) return;
    const max = kind === 'categories' ? 150 : 100;
    const form = openDialog(`${row ? 'Sửa' : 'Thêm'} ${noun}`, `<p>Tên rõ ràng, nhất quán giúp việc tìm kiếm và phân loại chính xác hơn.</p><label class="ap-field" for="catalogName">Tên ${noun}<input id="catalogName" name="name" value="${e(row?.name || '')}" maxlength="${max}" required aria-describedby="catalogHint catalogError" autocomplete="off"><small id="catalogHint">Bắt buộc · Tối đa ${max} ký tự.</small></label><p id="catalogError" class="ap-field-error" role="alert" hidden></p>`, '<button type="button" class="ap-button" data-close-dialog>Hủy</button><button type="submit" class="ap-button ap-button-primary">Lưu vào bản xem trước</button>');
    const input = form.querySelector('input');
    const error = form.querySelector('#catalogError');
    input.addEventListener('input', () => { error.hidden = true; input.removeAttribute('aria-invalid'); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = input.value.trim().replace(/\s+/g, ' ');
      let message = !name ? `Vui lòng nhập tên ${noun}.` : name.length > max ? `Tên không được vượt quá ${max} ký tự.` : '';
      if (!message && db[kind].some(item => item.id !== row?.id && normalize(item.name) === normalize(name))) message = `Tên ${noun} đã tồn tại. Vui lòng chọn tên khác.`;
      if (message) { error.textContent = message; error.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
      if (row) row.name = name;
      else db[kind].push({ id: Math.max(0, ...db[kind].map(item => item.id)) + 1, name, ...(kind === 'skills' ? { candidates_count: 0 } : {}) });
      // Reveal the saved item even when it no longer matches the old filters.
      state.query = name; state.usage = 'all'; state.page = 1;
      applyControls();
      persist(); syncURL(); closeDialog();
      notify(`Đã ${row ? 'cập nhật' : 'thêm'} ${noun} trong dữ liệu mẫu.`);
    });
  }

  function deleteCatalog(id) {
    const kind = page;
    const noun = kind === 'categories' ? 'ngành nghề' : 'kỹ năng';
    const row = db[kind].find(item => item.id === id);
    if (!row) return;
    const count = jobsFor(kind, id).length;
    if (kind === 'categories' && count > 0) {
      openDialog('Ngành nghề đang được sử dụng', `<div class="ap-notice ap-notice-amber">${i('circle-alert')}<p><strong>${e(row.name)}</strong> đang có ${count} tin tuyển dụng. Hãy chuyển các tin sang ngành nghề phù hợp trước khi xóa.</p></div><p>Bạn vẫn có thể sửa tên ngành nghề trong danh sách.</p>`);
      return;
    }
    const related = kind === 'skills' ? `<div class="ap-notice ap-notice-amber">${i('triangle-alert')}<p>Kỹ năng sẽ được gỡ khỏi <strong>${count} tin tuyển dụng</strong> và <strong>${row.candidates_count || 0} hồ sơ ứng viên</strong>. Tin và hồ sơ vẫn được giữ lại.</p></div>` : '';
    const form = openDialog(`Xóa ${noun}?`, `<p>Bạn muốn xóa <strong>${e(row.name)}</strong> khỏi danh mục?</p>${related}<p>Thao tác này chỉ áp dụng cho dữ liệu minh họa.</p>`, '<button type="button" class="ap-button" data-close-dialog data-initial-focus>Hủy</button><button type="submit" class="ap-button ap-button-danger">Xóa khỏi danh mục</button>');
    form.addEventListener('submit', event => {
      event.preventDefault();
      db[kind] = db[kind].filter(item => item.id !== id);
      if (kind === 'skills') db.jobs.forEach(job => { job.skills = job.skills.filter(skill => skill !== id); });
      persist(); closeDialog(); notify(`Đã xóa ${noun} trong dữ liệu mẫu.`);
    });
  }

  function deleteJob(id) {
    const job = db.jobs.find(row => row.id === id);
    if (!job) return;
    const form = openDialog('Xóa tin tuyển dụng vi phạm?', `<p><strong>${e(job.title)}</strong><br>${e(companyFor(job).name)}</p><div class="ap-notice ap-notice-red">${i('triangle-alert')}<p>Quyết định xóa sẽ ảnh hưởng đến <strong>${job.applications_count} hồ sơ ứng tuyển</strong>, hội thoại, tin nhắn, kết quả phân tích CV và lượt lưu liên quan.</p></div><label class="ap-field" for="deleteReason">Lý do vi phạm<textarea id="deleteReason" name="reason" maxlength="255" required aria-describedby="reasonHint reasonError" placeholder="Nêu rõ nội dung vi phạm chính sách tuyển dụng…"></textarea><small id="reasonHint">Bắt buộc · Tối đa 255 ký tự.</small></label><p class="ap-field-error" id="reasonError" role="alert" hidden></p><label class="ap-confirm-check"><input type="checkbox" id="confirmDelete" required><span>Tôi đã kiểm tra nội dung và hiểu ảnh hưởng của quyết định xóa tin.</span></label><p class="ap-field-error" id="confirmationError" role="alert" hidden></p><p style="font-size:10px;margin-top:16px">Bản xem trước chỉ xóa tin mẫu. Thông báo cho nhà tuyển dụng và xóa dữ liệu thực tế cần được hệ thống xử lý.</p>`, '<button type="button" class="ap-button" data-close-dialog>Hủy</button><button type="submit" class="ap-button ap-button-danger">Xác nhận xóa tin</button>');
    const input = form.querySelector('textarea');
    const error = form.querySelector('#reasonError');
    const check = form.querySelector('#confirmDelete');
    const confirmation = form.querySelector('#confirmationError');
    input.addEventListener('input', () => { error.hidden = true; input.removeAttribute('aria-invalid'); });
    check.addEventListener('change', () => { confirmation.hidden = true; check.removeAttribute('aria-invalid'); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const reason = input.value.trim();
      if (!reason || reason.length > 255) { error.textContent = 'Vui lòng nhập lý do vi phạm từ 1 đến 255 ký tự.'; error.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
      if (!check.checked) { confirmation.textContent = 'Vui lòng xác nhận đã kiểm tra nội dung và hiểu ảnh hưởng của thao tác.'; confirmation.hidden = false; check.setAttribute('aria-invalid', 'true'); check.setAttribute('aria-describedby', 'confirmationError'); check.focus(); return; }
      db.jobs = db.jobs.filter(row => row.id !== id);
      db.applications = db.applications.filter(application => application.job_id !== id);
      persist(); closeDialog();
      $('#jobDetail').innerHTML = `<section class="ap-panel"><div class="ap-empty">${i('circle-check')}<h2>Đã xóa tin trong bản xem trước</h2><p>Tài khoản nhà tuyển dụng được giữ nguyên. Chưa có dữ liệu thực tế bị xóa hoặc thông báo được gửi đi.</p><a class="ap-button ap-button-primary" href="../page_admin_jobs/index.html">Về danh sách kiểm duyệt</a></div><section class="ap-detail-section"><h3>Nội dung thông báo dự kiến</h3><p>Tin tuyển dụng “${e(job.title)}” vi phạm chính sách tuyển dụng. Lý do: ${e(reason)}</p></section></section>`;
      notify('Đã xóa tin trong dữ liệu mẫu. Tài khoản chủ tin được giữ nguyên.');
    });
  }

  function render() {
    refreshShell();
    if (page === 'overview') renderOverview();
    else if (page === 'job-detail') renderDetail();
    else renderList();
  }

  function persist() {
    window.AdminDemo.write(db);
    render();
  }

  function applyControls() {
    const controls = { '#listSearch': state.query, '#listRole': state.role, '#listStatus': state.status, '#listSort': state.sort, '#listUsage': state.usage };
    Object.entries(controls).forEach(([selector, value]) => {
      const control = $(selector);
      if (!control) return;
      control.value = value;
      // Reject state that is valid on another page but not this control.
      if (control.tagName === 'SELECT' && control.selectedIndex === -1) { control.selectedIndex = 0; state[selector === '#listStatus' ? 'status' : selector === '#listRole' ? 'role' : selector === '#listSort' ? 'sort' : 'usage'] = control.value; }
    });
  }

  function initialize() {
    try {
      db = window.AdminDemo.read();
      content.hidden = false;
      errorPanel.hidden = true;
      render();
    } catch {
      content.hidden = true;
      errorPanel.hidden = false;
      errorPanel.innerHTML = `<div class="ap-empty">${i('circle-alert')}<h2>Không thể đọc dữ liệu minh họa</h2><p>Dữ liệu lưu trong bản xem trước có thể không còn hợp lệ. Thử lại hoặc khôi phục mẫu để tiếp tục.</p><div class="ap-actions" style="justify-content:center"><button type="button" class="ap-button" data-action="retry">Thử lại</button><button type="button" class="ap-button ap-button-primary" data-action="recover">Khôi phục mẫu</button></div></div>`;
    } finally {
      content.setAttribute('aria-busy', 'false');
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action], [data-page], [data-clear-filters], [data-report]');
    if (!button || button.disabled) return;
    if (button.hasAttribute('data-page')) {
      state.page = Number(button.dataset.page); renderList(); syncURL();
      const next = Array.from($('#listPagination').querySelectorAll('[data-page]')).find(node => Number(node.dataset.page) === state.page && node.getAttribute('aria-current'));
      next?.focus(); return;
    }
    if (button.hasAttribute('data-clear-filters')) {
      state.query = ''; state.status = 'all'; state.role = 'all'; state.usage = 'all'; state.page = 1;
      if (page === 'jobs') state.report = 'all';
      applyControls(); renderList(); syncURL(); $('#listSearch').focus(); return;
    }
    if (button.hasAttribute('data-report')) { event.preventDefault(); state.report = button.dataset.report; state.page = 1; renderList(); syncURL(); return; }
    const id = Number(button.dataset.id);
    switch (button.dataset.action) {
      case 'view-user': showUser(id); break;
      case 'toggle-user': toggleUser(id); break;
      case 'create': editCatalog(); break;
      case 'edit': editCatalog(id); break;
      case 'delete-catalog': deleteCatalog(id); break;
      case 'delete-job': deleteJob(id); break;
      case 'retry': initialize(); break;
      case 'recover': window.AdminDemo.reset(); initialize(); break;
    }
  });
  $('#listFilters')?.addEventListener('submit', event => event.preventDefault());
  $('#listSearch')?.addEventListener('input', event => { state.query = event.target.value; state.page = 1; renderList(); syncURL(); });
  Object.entries({ '#listRole': 'role', '#listStatus': 'status', '#listSort': 'sort', '#listUsage': 'usage' }).forEach(([selector, key]) => {
    $(selector)?.addEventListener('change', event => { state[key] = event.target.value; state.page = 1; renderList(); syncURL(); });
  });
  $('#trendPeriod')?.addEventListener('change', renderChart);
  window.addEventListener('admin:reset', () => { state.page = 1; initialize(); });
  applyControls();

  // The static preview has no network fetch. Render a skeleton until the first frame,
  // without adding an artificial delay or implying an API request was made.
  if ($('#listRows')) $('#listRows').innerHTML = Array.from({ length: 4 }, () => `<tr aria-hidden="true">${Array.from({ length: page === 'jobs' || page === 'users' ? 5 : 4 }, () => '<td><div class="ap-skeleton ap-skeleton-line"></div><div class="ap-skeleton ap-skeleton-line ap-skeleton-short"></div></td>').join('')}</tr>`).join('');
  requestAnimationFrame(initialize);
})();
