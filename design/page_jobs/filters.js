// Prototype-only data: categories 1–5 follow the SQL seed; extra categories
// describe the existing design cards, and are not database IDs.
(() => {
  const categories = [
    ['it', 'Công nghệ thông tin / Phần mềm'],
    ['marketing', 'Marketing & Truyền thông số'],
    ['finance', 'Kế toán & Tài chính doanh nghiệp'],
    ['design', 'Thiết kế đồ họa & UI/UX'],
    ['hr', 'Quản trị nhân sự & Hành chính'],
    ['construction', 'Xây dựng / Kiến trúc'],
    ['logistics', 'Kho vận / Logistics'],
  ];
  const levels = ['Intern', 'Fresher', 'Junior', 'Middle', 'Senior', 'Lead', 'Manager', 'Director'];
  const salaries = [['', 'Tất cả mức lương'], ['under10', 'Dưới 10 triệu'], ['10to20', 'Từ 10 - 20 triệu'], ['over20', 'Trên 20 triệu'], ['negotiable', 'Thỏa thuận']];
  const types = [['', 'Tất cả hình thức'], ['full_time', 'Toàn thời gian'], ['part_time', 'Bán thời gian'], ['remote', 'Từ xa'], ['internship', 'Thực tập']];
  const cards = [...document.querySelectorAll('.job-card')];
  // Explicit metadata for the four existing demo cards.
  const metadata = [
    { category: 'hr', level: 'Middle', min: null, max: null, negotiable: true, cities: ['Bình Dương'] },
    { category: 'construction', level: 'Senior', min: 25000000, max: 35000000, cities: ['Bắc Giang'] },
    { category: 'logistics', level: 'Manager', min: null, max: null, negotiable: true, cities: ['Quảng Ninh', 'Hải Phòng'] },
    { category: 'it', level: 'Senior', min: 30000000, max: 45000000, cities: ['TP. Hồ Chí Minh'] },
  ];
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const params = new URLSearchParams(location.search);
  const legacyCities = { hcm: 'TP. Hồ Chí Minh', hn: 'Hà Nội', dn: 'Đà Nẵng' };
  const state = { categories: new Set(), level: '', salary: '', city: legacyCities[params.get('location')] || '', type: '', keyword: params.get('keyword') || '' };
  const host = document.getElementById('jobFilters');
  let openTrigger = null;
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;

  function closePanel(restoreFocus = false) {
    if (!openTrigger) return;
    document.getElementById(openTrigger.getAttribute('aria-controls')).hidden = true;
    openTrigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) openTrigger.focus();
    openTrigger = null;
  }

  function dropdown(key, title, multiple, options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'filter-popover';
    wrapper.innerHTML = `<button type="button" class="filter-trigger" id="filter-${key}" aria-expanded="false" aria-controls="panel-${key}"><span>${title}</span><i data-lucide="chevron-down" class="filter-chevron" aria-hidden="true"></i></button>
      <div class="filter-panel" id="panel-${key}" hidden><label class="filter-search">${icon('search')}<input type="search" placeholder="Tìm kiếm" aria-label="Tìm ${title.toLowerCase()}"></label><div class="filter-options" role="group" aria-label="${title}"></div><p class="filter-no-options" hidden>Không tìm thấy lựa chọn phù hợp.</p></div>`;
    const list = wrapper.querySelector('.filter-options');
    const allOptions = [['', multiple ? 'Tất cả ngành nghề' : title], ...options];
    allOptions.forEach(([value, label]) => {
      const row = document.createElement('label');
      row.className = 'filter-option';
      const input = document.createElement('input');
      input.type = multiple ? 'checkbox' : 'radio';
      input.name = key;
      input.value = value;
      input.checked = !value;
      row.append(input, document.createTextNode(label));
      list.append(row);
      input.addEventListener('change', () => {
        if (multiple) {
          if (!value) state.categories.clear();
          else if (input.checked) state.categories.add(value);
          else state.categories.delete(value);
        } else state[key] = value;
        refresh();
        if (!multiple) closePanel(true);
      });
    });
    wrapper.querySelector('input[type="search"]').addEventListener('input', event => {
      let visible = 0;
      list.querySelectorAll('.filter-option').forEach(row => {
        row.hidden = !normalize(row.textContent).includes(normalize(event.target.value.trim()));
        if (!row.hidden) visible++;
      });
      wrapper.querySelector('.filter-no-options').hidden = visible > 0;
    });
    host.append(wrapper);
  }

  dropdown('categories', 'Ngành nghề', true, categories);
  dropdown('level', 'Tất cả cấp bậc', false, levels.map(level => [level, level]));
  dropdown('salary', 'Tất cả mức lương', false, salaries.slice(1));

  const advanced = document.createElement('div');
  advanced.className = 'filter-popover';
  advanced.innerHTML = `<button type="button" class="filter-trigger" id="filter-advanced" aria-expanded="false" aria-controls="panel-advanced">${icon('sliders-horizontal')}<span>Tất cả bộ lọc</span></button><div class="filter-panel filter-advanced" id="panel-advanced" hidden>
    <fieldset><legend>Từ khóa</legend><input class="filter-keyword" type="search" aria-label="Từ khóa việc làm" placeholder="Việc làm, công ty, kỹ năng..."></fieldset>
    <fieldset><legend>Tỉnh / Thành phố</legend><select id="filter-city" aria-label="Tỉnh / Thành phố"></select></fieldset>
    <fieldset><legend>Hình thức làm việc</legend><select id="filter-type" aria-label="Hình thức làm việc"></select></fieldset>
    <fieldset><legend>Mức lương</legend><select id="filter-salary-select" aria-label="Mức lương"></select></fieldset>
    <button type="button" class="filter-reset" data-reset>Xóa bộ lọc</button>
    <p class="filter-note">Lọc trực tiếp trên dữ liệu mẫu của bản thiết kế.</p></div>`;
  host.append(advanced);
  const cities = [...new Set(['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', ...metadata.flatMap(job => job.cities)])];
  function setupSelect(id, key, options) {
    const select = document.getElementById(id);
    options.forEach(([value, label]) => select.add(new Option(label, value)));
    select.addEventListener('change', () => { state[key] = select.value; refresh(); });
  }
  setupSelect('filter-city', 'city', [['', 'Tất cả địa điểm'], ...cities.map(city => [city, city])]);
  setupSelect('filter-type', 'type', types);
  setupSelect('filter-salary-select', 'salary', salaries);
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'filter-reset';
  reset.dataset.reset = '';
  reset.textContent = 'Xóa bộ lọc';
  host.append(reset);

  const searchForm = document.querySelector('form[method="GET"]');
  const keywordInput = searchForm.elements.keyword;
  const locationInput = searchForm.elements.location;
  locationInput.replaceChildren(...[['', 'Tất cả địa điểm'], ...cities.map(city => [city, city])].map(([value, label]) => new Option(label, value)));
  const advancedKeyword = advanced.querySelector('.filter-keyword');
  advancedKeyword.addEventListener('input', () => { state.keyword = advancedKeyword.value; refresh(); });
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    state.keyword = keywordInput.value;
    state.city = locationInput.value;
    refresh();
  });
  document.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', () => {
    Object.assign(state, { categories: new Set(), level: '', salary: '', city: '', type: '', keyword: '' });
    refresh();
  }));
  host.querySelectorAll('[aria-controls]').forEach(trigger => trigger.addEventListener('click', () => {
    const wasOpen = trigger === openTrigger;
    closePanel();
    if (wasOpen) return;
    openTrigger = trigger;
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    panel.style.setProperty('--filter-panel-top', `${Math.min(trigger.getBoundingClientRect().bottom + 10, window.innerHeight - 240)}px`);
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    panel.querySelector('input, select, button')?.focus();
  }));
  document.addEventListener('click', event => { if (!host.contains(event.target)) closePanel(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(true); });
  window.addEventListener('resize', () => closePanel());

  function matchesSalary(job) {
    if (!state.salary) return true;
    if (state.salary === 'negotiable') return !!job.negotiable;
    if (job.negotiable) return false;
    if (state.salary === 'under10') return job.max !== null && job.max < 10000000;
    if (state.salary === '10to20') return job.max !== null && job.min !== null && job.max >= 10000000 && job.min <= 20000000;
    return job.min !== null && job.min > 20000000;
  }

  function refresh() {
    let count = 0;
    cards.forEach((card, index) => {
      const job = metadata[index];
      const visible = (!state.categories.size || state.categories.has(job.category))
        && (!state.level || state.level === job.level)
        && (!state.city || job.cities.includes(state.city))
        && (!state.type || state.type === 'full_time')
        && matchesSalary(job)
        && normalize(card.textContent).includes(normalize(state.keyword.trim()));
      card.hidden = !visible;
      if (visible) count++;
    });
    document.getElementById('jobResultCount').textContent = count;
    document.getElementById('jobEmptyState').hidden = count !== 0;
    host.querySelectorAll('.filter-options input').forEach(input => {
      input.checked = input.name === 'categories'
        ? (input.value ? state.categories.has(input.value) : state.categories.size === 0)
        : state[input.name] === input.value;
    });
    const selectedCategory = categories.find(([value]) => state.categories.has(value));
    const labels = {
      categories: state.categories.size === 1 ? selectedCategory[1] : state.categories.size ? `${state.categories.size} ngành nghề` : 'Ngành nghề',
      level: state.level || 'Tất cả cấp bậc',
      salary: salaries.find(([value]) => value === state.salary)[1],
    };
    Object.entries(labels).forEach(([key, label]) => {
      const trigger = document.getElementById(`filter-${key}`);
      trigger.querySelector('span').textContent = label;
      trigger.dataset.active = String(key === 'categories' ? state.categories.size > 0 : !!state[key]);
    });
    reset.hidden = !(state.categories.size || state.level || state.salary || state.city || state.type || state.keyword);
    document.getElementById('filter-advanced').dataset.active = String(!!(state.city || state.type || state.keyword || state.salary));
    document.getElementById('filter-city').value = state.city;
    document.getElementById('filter-type').value = state.type;
    document.getElementById('filter-salary-select').value = state.salary;
    keywordInput.value = state.keyword;
    locationInput.value = state.city;
    advancedKeyword.value = state.keyword;
  }
  refresh();
  window.lucide?.createIcons();
})();
