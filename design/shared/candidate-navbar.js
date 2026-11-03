(() => {

    window.lucide?.createIcons();
    const btn = document.getElementById('toggleRoutesDrawer');
    const closeBtn = document.getElementById('closeRoutesDrawer');
    const drawer = document.getElementById('routesDrawer');
    const backdrop = document.getElementById('routesDrawerBackdrop');
    drawer.hidden = true;
    function toggleDrawer(open) {
      drawer.hidden = !open;
      if (open) {
        drawer.classList.remove('translate-x-full');
        backdrop.classList.remove('hidden');
      } else {
        drawer.classList.add('translate-x-full');
        backdrop.classList.add('hidden');
      }
    }
    btn?.addEventListener('click', () => toggleDrawer(true));
    closeBtn?.addEventListener('click', () => toggleDrawer(false));
    backdrop?.addEventListener('click', () => toggleDrawer(false));

    // NAVBAR & DROPDOWNS SCRIPT
    const btnAllCategories = document.getElementById('btnAllCategories');
    const allCategoriesDropdown = document.getElementById('allCategoriesDropdown');
    const iconCatArrow = document.getElementById('iconCatArrow');

    function toggleCategories(open) {
      if (!allCategoriesDropdown) return;
      const isCurrentlyOpen = !allCategoriesDropdown.classList.contains('hidden');
      const shouldOpen = open !== undefined ? open : !isCurrentlyOpen;
      if (shouldOpen) {
        allCategoriesDropdown.classList.remove('hidden');
        iconCatArrow?.classList.add('rotate-180');
        toggleAccountMenu(false);
      } else {
        allCategoriesDropdown.classList.add('hidden');
        iconCatArrow?.classList.remove('rotate-180');
      }
    }
    btnAllCategories?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCategories();
    });

    const btnAccountMenu = document.getElementById('btnAccountMenu');
    const accountMenuDropdown = document.getElementById('accountMenuDropdown');

    function toggleAccountMenu(open) {
      if (!accountMenuDropdown) return;
      const isCurrentlyOpen = !accountMenuDropdown.classList.contains('hidden');
      const shouldOpen = open !== undefined ? open : !isCurrentlyOpen;
      if (shouldOpen) {
        accountMenuDropdown.classList.remove('hidden');
        toggleCategories(false);
      } else {
        accountMenuDropdown.classList.add('hidden');
      }
    }
    btnAccountMenu?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAccountMenu();
    });

    const btnOpenNotifications = document.getElementById('btnOpenNotifications');
    const closeNotificationDrawer = document.getElementById('closeNotificationDrawer');
    const notificationDrawer = document.getElementById('notificationDrawer');
    const notificationDrawerBackdrop = document.getElementById('notificationDrawerBackdrop');
    notificationDrawer.hidden = true;
    const bellBadge = document.getElementById('bellBadge');
    const notifBadgeCount = document.getElementById('notifBadgeCount');
    const notifListContainer = document.getElementById('notifListContainer');
    const notifEmptyContainer = document.getElementById('notifEmptyContainer');

    const tabNotifAll = document.getElementById('tabNotifAll');
    const tabNotifUnread = document.getElementById('tabNotifUnread');
    const tabNotifRead = document.getElementById('tabNotifRead');
    const btnClearAllNotif = document.getElementById('btnClearAllNotif');
    const btnRestoreNotif = document.getElementById('btnRestoreNotif');

    let currentNotifFilter = 'all';

    function setDrawerNotifState(hasItems) {
      if (!hasItems) {
        notifListContainer?.classList.add('hidden');
        notifEmptyContainer?.classList.remove('hidden');
        if (notifBadgeCount) notifBadgeCount.textContent = '0';
        if (bellBadge) bellBadge.style.display = 'none';
      } else {
        notifListContainer?.classList.remove('hidden');
        notifEmptyContainer?.classList.add('hidden');
        if (notifBadgeCount) notifBadgeCount.textContent = '2 mới';
        if (bellBadge) bellBadge.style.display = 'flex';
      }
    }

    function filterNotifItems(filter) {
      currentNotifFilter = filter;
      const tabs = [
        { el: tabNotifAll, name: 'all' },
        { el: tabNotifUnread, name: 'unread' },
        { el: tabNotifRead, name: 'read' }
      ];
      tabs.forEach(t => {
        if (!t.el) return;
        if (t.name === filter) {
          t.el.className = 'px-3 py-1 rounded-lg bg-blue-50 text-[#005AFF] font-bold text-xs transition';
        } else {
          t.el.className = 'px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium text-xs transition';
        }
      });

      const items = notifListContainer?.querySelectorAll('.notif-item');
      let visibleCount = 0;
      items?.forEach(item => {
        if (filter === 'all') {
          item.style.display = 'block';
          visibleCount++;
        } else if (filter === 'unread') {
          const isUnread = item.classList.contains('unread');
          item.style.display = isUnread ? 'block' : 'none';
          if (isUnread) visibleCount++;
        } else if (filter === 'read') {
          const isRead = item.classList.contains('read');
          item.style.display = isRead ? 'block' : 'none';
          if (isRead) visibleCount++;
        }
      });

      if (visibleCount === 0) {
        setDrawerNotifState(false);
      } else {
        setDrawerNotifState(true);
      }
    }

    tabNotifAll?.addEventListener('click', () => filterNotifItems('all'));
    tabNotifUnread?.addEventListener('click', () => filterNotifItems('unread'));
    tabNotifRead?.addEventListener('click', () => filterNotifItems('read'));

    btnClearAllNotif?.addEventListener('click', () => setDrawerNotifState(false));
    btnRestoreNotif?.addEventListener('click', () => {
      filterNotifItems('all');
      setDrawerNotifState(true);
    });

    function toggleNotificationDrawer(open) {
      notificationDrawer.hidden = !open;
      if (!notificationDrawer) return;
      if (open) {
        notificationDrawer.classList.remove('translate-x-full');
        notificationDrawerBackdrop?.classList.remove('hidden');
        toggleCategories(false);
        toggleAccountMenu(false);
      } else {
        notificationDrawer.classList.add('translate-x-full');
        notificationDrawerBackdrop?.classList.add('hidden');
      }
    }
    btnOpenNotifications?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNotificationDrawer(true);
    });
    closeNotificationDrawer?.addEventListener('click', () => toggleNotificationDrawer(false));
    notificationDrawerBackdrop?.addEventListener('click', () => toggleNotificationDrawer(false));

    // Outside click & Escape
    document.addEventListener('click', (e) => {
      if (allCategoriesDropdown && !allCategoriesDropdown.contains(e.target) && !btnAllCategories?.contains(e.target)) {
        toggleCategories(false);
      }
      if (accountMenuDropdown && !accountMenuDropdown.contains(e.target) && !btnAccountMenu?.contains(e.target)) {
        toggleAccountMenu(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        toggleCategories(false);
        toggleAccountMenu(false);
        toggleNotificationDrawer(false);
        toggleDrawer(false);
      }
    });

})();
