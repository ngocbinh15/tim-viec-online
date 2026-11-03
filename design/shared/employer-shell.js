(() => {
  const current = document.body.dataset.employerPage;
  const header = document.querySelector('[data-employer-header]');
  const sidebar = document.querySelector('[data-employer-sidebar]');
  if (!header || !sidebar) return;
  const icon = name => `<i data-lucide="${name}" class="ep-icon" aria-hidden="true"></i>`;
  const pages = [
    ['dashboard', '../page_employer_dashboard/index.html', 'layout-dashboard', 'Tổng quan'],
    ['jobs', '../page_employer_dashboard/index.html#jobs', 'briefcase-business', 'Tin tuyển dụng'],
    ['candidates', '../page_employer_candidates/index.html', 'users', 'Hồ sơ ứng viên'],
    ['chat', '../page_employer_chat/index.html', 'messages-square', 'Tin nhắn'],
    ['notifications', '../page_employer_notifications/index.html', 'bell', 'Thông báo'],
    ['profile', '../page_employer_profile/index.html', 'building-2', 'Hồ sơ công ty'],
    ['post', '../page_post_job/index.html', 'square-pen', 'Đăng tin tuyển dụng'],
  ];
  const navigation = items => items.map(([key, href, glyph, text]) => `<a href="${href}"${key === current ? ' aria-current="page"' : ''}>${icon(glyph)}${text}</a>`).join('');
  header.className = 'ep-header';
  header.innerHTML = `<div class="ep-header-left">
    <button type="button" id="mobileMenu" class="ep-icon-button ep-mobile-menu" aria-label="Mở điều hướng" aria-expanded="false" aria-controls="employerSidebar">${icon('menu')}</button>
    <a href="../page_home/index.html" class="ep-brand" aria-label="TimViecOnline - Trang chủ"><span class="ep-brand-mark">${icon('check')}</span><span><strong>TimViec<span>Online</span></strong><small>Kết nối đúng nhân tài</small></span></a>
    <span class="ep-header-divider"></span><span class="ep-header-label">Dành cho nhà tuyển dụng</span></div>
    <div class="ep-header-right"><a href="../page_jobs/index.html" class="ep-public-link">Trang việc làm ${icon('arrow-up-right')}</a>
    <a href="../page_employer_chat/index.html" class="ep-icon-button" aria-label="Tin nhắn ứng viên">${icon('message-square')}</a>
    <a href="../page_employer_notifications/index.html" class="ep-icon-button" aria-label="Thông báo tuyển dụng">${icon('bell')}<span class="ep-dot"></span></a>
    <a href="../page_employer_profile/index.html#account" class="ep-user" aria-label="Thông tin tài khoản nhà tuyển dụng"><span class="ep-avatar">FPT</span><span><strong data-company-name>FPT Software</strong><small>Tài khoản nhà tuyển dụng</small></span></a></div>`;
  sidebar.id = 'employerSidebar';
  sidebar.className = 'ep-sidebar';
  sidebar.setAttribute('aria-label', 'Điều hướng nhà tuyển dụng');
  sidebar.innerHTML = `<p class="ep-nav-label">Không gian tuyển dụng</p><nav class="ep-nav">${navigation(pages.slice(0, 5))}</nav>
    <div class="ep-nav-separator"></div><p class="ep-nav-label">Doanh nghiệp</p><nav class="ep-nav">${navigation(pages.slice(5))}</nav>
    <div class="ep-sidebar-bottom"><span class="ep-company-logo">FPT</span><p><strong data-company-name>FPT Software</strong><br>Cùng xây dựng đội ngũ của bạn.</p><a href="../page_login/index.html">${icon('log-out')}Đăng xuất</a></div>`;
  const menuButton = document.getElementById('mobileMenu');
  const setOpen = open => {
    sidebar.dataset.open = String(open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Đóng điều hướng' : 'Mở điều hướng');
  };
  menuButton.addEventListener('click', () => setOpen(sidebar.dataset.open !== 'true'));
  sidebar.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', event => {
    if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.dataset.open === 'true') { setOpen(false); menuButton.focus(); }
  });
  window.addEventListener('resize', () => setOpen(false));
  // Prevent design-only forms from navigating or implying that data was saved.
  document.querySelectorAll('form[data-design-only]').forEach(form => form.addEventListener('submit', event => event.preventDefault()));
  window.lucide?.createIcons();
})();
