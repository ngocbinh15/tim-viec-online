(() => {
  const current = document.body.dataset.candidatePage;
  const sidebar = document.querySelector('[data-candidate-sidebar]');
  if (!sidebar) return;
  const icon = name => `<i data-lucide="${name}" class="cu-icon" aria-hidden="true"></i>`;
  const nav = [
    ['profile', '../page_candidate_dashboard/index.html', 'file-user', 'Hồ Sơ Của Tôi'],
    ['jobs', '../page_candidate_jobs/index.html', 'briefcase-business', 'Việc Làm Của Tôi'],
    ['chat', '../page_chat/index.html', 'messages-square', 'Tin Nhắn'],
    ['alerts', '../page_candidate_alerts/index.html', 'bell', 'Thông Báo Việc Làm'],
    ['settings', '../page_settings/index.html', 'settings', 'Quản Lý Tài Khoản'],
  ];
  sidebar.className = 'cu-sidebar';
  sidebar.setAttribute('aria-label', 'Điều hướng tài khoản ứng viên');
  sidebar.innerHTML = `<div class="cu-user-card"><div class="cu-user-heading"><span class="cu-avatar">${icon('user-round')}</span><strong>Bình N</strong><a href="../page_login/index.html" aria-label="Đăng xuất">${icon('log-out')}</a></div><div class="cu-user-note"><strong>Hồ sơ của bạn</strong><p>Hoàn thiện thông tin và CV để sẵn sàng ứng tuyển.</p><a href="../page_candidate_dashboard/index.html#profile-info">Thiết lập hồ sơ</a></div></div><nav class="cu-nav">${nav.map(([key, href, glyph, text]) => `<a href="${href}"${current === key ? ' aria-current="page"' : ''}>${icon(glyph)}${text}</a>`).join('')}</nav>`;
  document.querySelectorAll('form[data-design-only]').forEach(form => form.addEventListener('submit', event => event.preventDefault()));
  function revealSection() {
    const section = document.getElementById(location.hash.slice(1));
    if (section?.tagName === 'DETAILS') section.open = true;
  }
  window.addEventListener('hashchange', revealSection);
  revealSection();
  window.lucide?.createIcons();
})();
