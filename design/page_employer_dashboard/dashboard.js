(() => {
  // Local prototype records. Status values and salary fields follow the SQL schema.
  const jobs = [
    { id: 1, title: 'Lập trình viên Backend Laravel (Middle)', city: 'Hà Nội', level: 'Middle', salary_min: 18000000, salary_max: 28000000, deadline: '2026-11-14', status: 'active', applications: 18, unread: 3, updated: '2026-10-15' },
    { id: 2, title: 'Frontend Developer (React / Next.js)', city: 'TP. Hồ Chí Minh', level: 'Junior', salary_min: 15000000, salary_max: 25000000, deadline: '2026-11-10', status: 'active', applications: 14, unread: 5, updated: '2026-10-14' },
    { id: 3, title: 'Chuyên viên thiết kế UI/UX', city: 'Hà Nội', level: 'Middle', salary_min: 18000000, salary_max: 24000000, deadline: '2026-11-05', status: 'closed', applications: 10, unread: 0, updated: '2026-10-12' },
    { id: 4, title: 'Thực tập sinh kiểm thử phần mềm', city: 'Hà Nội', level: 'Intern', salary_min: null, salary_max: null, deadline: '2026-10-01', status: 'expired', applications: 6, unread: 0, updated: '2026-10-01' },
  ];
  const statusNames = { active: 'Đang tuyển', closed: 'Đã đóng', expired: 'Hết hạn' };
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const tabs = [...document.querySelectorAll('.ep-tab')];
  const search = document.getElementById('jobSearch');
  const sort = document.getElementById('jobSort');
  const rows = document.getElementById('jobRows');
  const statusDialog = document.getElementById('statusDialog');
  let currentStatus = 'all';
  let pendingJob = null;
  let toastTimeout;
  const icons = () => window.lucide?.createIcons();
  function toast(message) {
    const element = document.getElementById('dashboardToast');
    clearTimeout(toastTimeout);
    element.textContent = message;
    element.hidden = false;
    toastTimeout = setTimeout(() => { element.hidden = true; }, 4500);
  }
  function displayDate(date) { return date.split('-').reverse().join('/'); }
  function icon(name) { return `<i data-lucide="${name}" class="ep-icon" aria-hidden="true"></i>`; }
  function render() {
    tabs.forEach(tab => {
      const status = tab.dataset.status;
      const selected = status === currentStatus;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.querySelector('span').textContent = jobs.filter(job => status === 'all' || status === job.status).length;
    });
    document.getElementById('jobsResults').setAttribute('aria-labelledby', `tab-${currentStatus}`);
    document.getElementById('activeJobsCount').textContent = jobs.filter(job => job.status === 'active').length;
    const filtered = jobs.filter(job => (currentStatus === 'all' || currentStatus === job.status)
      && normalize(`${job.title} TV-${String(job.id).padStart(3, '0')}`).includes(normalize(search.value.trim())));
    filtered.sort((a, b) => sort.value === 'applications' ? b.applications - a.applications
      : sort.value === 'deadline' ? a.deadline.localeCompare(b.deadline) : b.updated.localeCompare(a.updated));
    rows.replaceChildren();
    filtered.forEach(job => {
      const row = document.createElement('tr');
      const salary = job.salary_min === null ? 'Thỏa thuận' : `${job.salary_min / 1000000} – ${job.salary_max / 1000000} triệu`;
      // Only developer-defined demo records are interpolated. User inputs use textContent.
      row.innerHTML = `<td><a class="ep-job-title" href="../page_job_detail/index.html?job=${job.id}">${job.title}</a><div class="ep-job-meta">TV-${String(job.id).padStart(3, '0')} · ${job.city} · ${job.level}</div><div class="ep-job-meta">${salary} VNĐ · Hạn nộp: ${displayDate(job.deadline)}</div></td>
        <td><a class="ep-job-count" href="../page_employer_candidates/index.html?job=${job.id}" aria-label="Xem ${job.applications} hồ sơ cho ${job.title}">${job.applications}</a>${job.unread ? `<span class="ep-job-new">${job.unread} chưa xem</span>` : ''}</td>
        <td><span class="ep-badge ep-badge-${job.status}">${statusNames[job.status]}</span><div class="ep-row-actions"><a href="../page_post_job/index.html?edit=${job.id}" aria-label="Chỉnh sửa ${job.title}" title="Chỉnh sửa tin">${icon('square-pen')}</a><a href="../page_employer_candidates/index.html?job=${job.id}" aria-label="Xem hồ sơ cho ${job.title}" title="Xem hồ sơ ứng viên">${icon('users')}</a>${job.status !== 'expired' ? `<button type="button" data-toggle-job="${job.id}" aria-label="${job.status === 'active' ? 'Đóng' : 'Mở lại'} tin ${job.title}" title="${job.status === 'active' ? 'Đóng tin' : 'Mở lại tin'}">${icon(job.status === 'active' ? 'pause' : 'play')}</button>` : `<a href="../page_post_job/index.html?edit=${job.id}" aria-label="Cập nhật hạn nộp cho ${job.title}" title="Cập nhật hạn nộp để mở lại">${icon('calendar-clock')}</a>`}</div></td>`;
      rows.append(row);
    });
    document.getElementById('jobsEmpty').hidden = filtered.length > 0;
    document.getElementById('jobResultCount').textContent = `Hiển thị ${filtered.length} / ${jobs.length} tin tuyển dụng`;
    icons();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { currentStatus = tab.dataset.status; render(); });
    tab.addEventListener('keydown', event => {
      const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click();
      tabs[next].focus();
    });
  });
  search.addEventListener('input', render);
  sort.addEventListener('change', render);
  document.getElementById('clearJobFilters').addEventListener('click', () => {
    currentStatus = 'all'; search.value = ''; render(); search.focus();
  });
  rows.addEventListener('click', event => {
    const button = event.target.closest('[data-toggle-job]');
    if (!button) return;
    pendingJob = jobs.find(job => job.id === Number(button.dataset.toggleJob));
    const closing = pendingJob.status === 'active';
    document.getElementById('statusDialogTitle').textContent = closing ? 'Đóng tin tuyển dụng?' : 'Mở lại tin tuyển dụng?';
    document.getElementById('statusDialogMessage').textContent = closing
      ? `“${pendingJob.title}” sẽ ngừng nhận hồ sơ mới. Bạn vẫn có thể xem, xét duyệt hồ sơ đã nhận và tiếp tục trò chuyện với ứng viên.`
      : `“${pendingJob.title}” sẽ hiển thị trở lại và tiếp tục nhận hồ sơ ứng tuyển.`;
    document.getElementById('confirmStatus').textContent = closing ? 'Đóng tin' : 'Mở lại tin';
    statusDialog.showModal();
  });
  document.getElementById('confirmStatus').addEventListener('click', () => {
    if (!pendingJob) return;
    const job = pendingJob;
    job.status = job.status === 'active' ? 'closed' : 'active';
    // Local date for this prototype; the backend must enforce deadline and ownership.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (job.status === 'active' && job.deadline <= today) {
      job.status = 'closed';
      statusDialog.close();
      toast('Hãy cập nhật hạn nộp trong trang chỉnh sửa trước khi mở lại tin.');
      return;
    }
    statusDialog.close();
    render();
    (rows.querySelector(`[data-toggle-job="${job.id}"]`) || document.getElementById(`tab-${currentStatus}`)).focus();
    toast(job.status === 'closed' ? 'Đã đóng tin. Các hồ sơ và hội thoại được giữ lại.' : 'Đã mở lại tin tuyển dụng.');
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  const drawer = document.getElementById('routesDrawer');
  const backdrop = document.getElementById('routesDrawerBackdrop');
  drawer.hidden = true;
  function toggleDrawer(open) { drawer.hidden = !open; drawer.classList.toggle('translate-x-full', !open); backdrop.classList.toggle('hidden', !open); }
  document.getElementById('toggleRoutesDrawer').addEventListener('click', () => toggleDrawer(true));
  document.getElementById('closeRoutesDrawer').addEventListener('click', () => toggleDrawer(false));
  backdrop.addEventListener('click', () => toggleDrawer(false));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { toggleDrawer(false); } });
  render();
})();
