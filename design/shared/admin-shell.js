(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const icon = name => {
    const nodes = window.AdminIcons?.[name];
    if (!nodes) return '';
    return `<svg class="ap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${nodes.map(([tag, attributes]) => `<${tag} ${Object.entries(attributes).filter(([attribute]) => attribute !== 'key').map(([attribute, value]) => `${attribute}="${escape(value)}"`).join(' ')}></${tag}>`).join('')}</svg>`;
  };
  const page = document.body.dataset.adminPage;
  const active = page === 'job-detail' ? 'jobs' : page;
  const pages = [
    ['overview', 'page_admin_portal', 'layout-dashboard', 'Tổng quan'],
    ['jobs', 'page_admin_jobs', 'flag', 'Kiểm duyệt tin'],
    ['users', 'page_admin_users', 'users', 'Tài khoản người dùng'],
    ['categories', 'page_admin_categories', 'shapes', 'Ngành nghề'],
    ['skills', 'page_admin_skills', 'code-xml', 'Kỹ năng'],
  ];
  const navigation = items => items.map(([key, directory, glyph, label]) => `<a href="../${directory}/index.html"${key === active ? ' aria-current="page"' : ''}>${icon(glyph)}${label}${key === 'jobs' ? '<span class="ap-nav-count" data-report-count aria-label="Tin bị báo cáo">3</span>' : ''}</a>`).join('');
  const sidebarContent = `<p class="ap-nav-label">Quản trị hệ thống</p><nav class="ap-nav" aria-label="Vận hành">${navigation(pages.slice(0, 3))}</nav><div class="ap-nav-divider"></div><p class="ap-nav-label">Danh mục hệ thống</p><nav class="ap-nav" aria-label="Danh mục">${navigation(pages.slice(3))}</nav><div class="ap-sidebar-bottom">${icon('shield-check')}<strong>Quản trị có trách nhiệm</strong><p>Mỗi quyết định góp phần xây dựng một môi trường tuyển dụng an toàn.</p><a href="../page_login/index.html">${icon('log-out')}Về trang đăng nhập</a></div>`;
  const header = document.querySelector('[data-admin-header]');
  header.className = 'ap-header';
  header.innerHTML = `<div class="ap-header-left"><button type="button" class="ap-icon-button ap-mobile-menu" id="adminMenu" aria-label="Mở điều hướng quản trị" aria-haspopup="dialog" aria-controls="adminMobileNav" aria-expanded="false">${icon('menu')}</button><a class="ap-brand" href="../page_home/index.html" aria-label="TimViecOnline — Trang chủ"><svg class="ap-brand-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect width="36" height="36" rx="10" fill="var(--ap-blue)"/><path d="M10 18L16 24L26 12" stroke="var(--ap-white)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="26" cy="12" r="3" fill="var(--ap-orange)"/></svg><span><strong>TimViec<span>Online</span></strong><small>Kết nối đúng nhân tài</small></span></a><span class="ap-header-label">Không gian quản trị</span></div><div class="ap-header-right"><a href="../page_jobs/index.html" class="ap-public-link">Trang việc làm ${icon('arrow-up-right')}</a><a href="../page_admin_users/index.html?role=admin" class="ap-profile" aria-label="Xem tài khoản quản trị viên"><span class="ap-avatar">QT</span><span><strong>Quản Trị Viên</strong><small>Quản trị hệ thống</small></span></a></div>`;
  const sidebar = document.querySelector('[data-admin-sidebar]');
  sidebar.className = 'ap-sidebar';
  sidebar.setAttribute('aria-label', 'Điều hướng quản trị');
  sidebar.innerHTML = sidebarContent;

  document.querySelectorAll('[data-icon]').forEach(node => { node.outerHTML = icon(node.dataset.icon); });
  document.querySelectorAll('[data-today]').forEach(node => { node.textContent = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()); });
  const preview = document.querySelector('[data-admin-preview]');
  preview.className = 'ap-preview';
  preview.innerHTML = `${icon('info')}<span>Dữ liệu minh họa · Thao tác chỉ áp dụng cho bản xem trước.</span><button type="button" data-reset-preview>Khôi phục mẫu</button>`;

  const mobile = document.createElement('dialog');
  mobile.id = 'adminMobileNav';
  mobile.className = 'ap-mobile-dialog';
  mobile.setAttribute('aria-labelledby', 'adminMobileTitle');
  mobile.innerHTML = `<div class="ap-mobile-heading"><h2 id="adminMobileTitle">Không gian quản trị</h2><button type="button" class="ap-icon-button" aria-label="Đóng điều hướng" data-close-mobile>${icon('x')}</button></div><div class="ap-sidebar">${sidebarContent}</div>`;
  document.body.append(mobile);
  const menu = document.getElementById('adminMenu');
  menu.addEventListener('click', () => { mobile.showModal(); menu.setAttribute('aria-expanded', 'true'); });
  mobile.querySelector('[data-close-mobile]').addEventListener('click', () => mobile.close());
  mobile.addEventListener('close', () => { menu.setAttribute('aria-expanded', 'false'); menu.focus(); });
  mobile.addEventListener('click', event => {
    if (event.target === mobile && event.clientX > mobile.getBoundingClientRect().right) mobile.close();
  });
  window.matchMedia('(min-width: 1001px)').addEventListener('change', event => { if (event.matches && mobile.open) mobile.close(); });

  function containTabFocus(modal) {
    modal.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(modal.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')).filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
  containTabFocus(mobile);

  const dialog = document.createElement('dialog');
  dialog.className = 'ap-dialog';
  dialog.id = 'adminDialog';
  dialog.setAttribute('aria-labelledby', 'adminDialogTitle');
  document.body.append(dialog);
  containTabFocus(dialog);
  let opener = null;
  function openDialog(title, body, actions) {
    opener = document.activeElement;
    dialog.innerHTML = `<form id="adminDialogForm" novalidate><div class="ap-dialog-heading"><h2 id="adminDialogTitle">${escape(title)}</h2><button type="button" class="ap-icon-button" data-close-dialog aria-label="Đóng hộp thoại">${icon('x')}</button></div><div class="ap-dialog-body">${body}</div><div class="ap-dialog-actions">${actions || '<button type="button" class="ap-button" data-close-dialog>Đóng</button>'}</div></form>`;
    dialog.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.showModal();
    const focusTarget = dialog.querySelector('[data-initial-focus]') || dialog.querySelector('input, textarea') || dialog.querySelector('[data-close-dialog]');
    focusTarget?.focus();
    return dialog.querySelector('form');
  }
  dialog.addEventListener('close', () => {
    // Mutations may have replaced the trigger row. Restore to its stable action key.
    if (opener?.isConnected) opener.focus();
    else {
      const action = opener?.dataset.action;
      const id = opener?.dataset.id;
      const replacement = action && id ? Array.from(document.querySelectorAll('[data-action][data-id]')).find(node => node.dataset.action === action && node.dataset.id === id) : null;
      (replacement || document.querySelector('[data-list-search]') || document.getElementById('main')).focus();
    }
  });

  const toast = document.createElement('div');
  toast.className = 'ap-toast';
  toast.id = 'adminToast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');
  toast.hidden = true;
  document.body.append(toast);
  let toastTimer;
  function notify(message) {
    clearTimeout(toastTimer);
    toast.hidden = false;
    toast.innerHTML = `${icon('circle-check')}<span>${escape(message)}</span><button type="button" aria-label="Đóng thông báo">${icon('x')}</button>`;
    toast.querySelector('button').addEventListener('click', () => { toast.hidden = true; });
    toastTimer = setTimeout(() => { toast.hidden = true; }, 7000);
  }

  document.querySelector('[data-reset-preview]').addEventListener('click', () => {
    const form = openDialog('Khôi phục dữ liệu minh họa?', '<p>Các thay đổi trong bản xem trước sẽ được đặt lại về dữ liệu mẫu ban đầu.</p>', '<button type="button" class="ap-button" data-close-dialog data-initial-focus>Hủy</button><button type="submit" class="ap-button ap-button-primary">Khôi phục mẫu</button>');
    form.addEventListener('submit', event => { event.preventDefault(); window.AdminDemo.reset(); window.dispatchEvent(new Event('admin:reset')); dialog.close(); notify('Đã khôi phục dữ liệu minh họa.'); });
  });

  window.AdminUI = { escape, icon, notify, openDialog, closeDialog: () => dialog.close() };
})();
