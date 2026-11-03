(() => {
  const form = document.getElementById('authForm');
  const registration = document.body.dataset.authPage === 'register';
  const status = document.getElementById('authStatus');
  const fields = [...form.querySelectorAll('input:not([type="radio"]):not([type="checkbox"])')];
  const icons = () => window.lucide?.createIcons();
  document.querySelectorAll('[data-password-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      const showing = input.type === 'password';
      input.type = showing ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(showing));
      button.setAttribute('aria-label', `${showing ? 'Ẩn' : 'Hiện'} ${input.id === 'confirmPassword' ? 'mật khẩu xác nhận' : 'mật khẩu'}`);
      button.innerHTML = `<i data-lucide="${showing ? 'eye-off' : 'eye'}" class="auth-icon" aria-hidden="true"></i>`;
      icons();
    });
  });

  function validate(input) {
    const value = input.value;
    let error = '';
    if (input.required && !value.trim()) error = 'Vui lòng nhập thông tin này.';
    else if (input.type === 'email' && value && input.validity.typeMismatch) error = 'Vui lòng nhập địa chỉ email hợp lệ.';
    else if (input.name === 'name' && value && (value.trim().length < 2 || value.length > 100 || !/^[\p{L}\p{M}\s-]+$/u.test(value))) error = 'Họ tên từ 2–100 ký tự, chỉ gồm chữ, khoảng trắng và dấu gạch nối.';
    else if (input.name === 'phone' && value && !/^0[35789]\d{8}$/.test(value)) error = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.';
    else if (registration && input.name === 'password' && value && (value.length < 8 || value.length > 32 || !/\p{Ll}/u.test(value) || !/\p{Lu}/u.test(value) || !/\d/.test(value) || !/[^\p{L}\p{N}\s]/u.test(value))) error = 'Mật khẩu từ 8–32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';
    else if (input.name === 'password_confirmation' && value && value !== form.elements.password.value) error = 'Mật khẩu xác nhận chưa khớp.';
    else if (input.name === 'dob' && value) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const [year, month, day] = today.split('-').map(Number);
      const [birthYear, birthMonth, birthDay] = value.split('-').map(Number);
      const age = year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
      if (!Number.isFinite(age) || age < 15) error = 'Bạn cần từ 15 tuổi trở lên để đăng ký.';
    }
    const errorElement = document.getElementById(`${input.id}Error`);
    if (errorElement) { errorElement.textContent = error; errorElement.hidden = !error; }
    input.setAttribute('aria-invalid', String(!!error));
    return !error;
  }
  fields.forEach(input => {
    input.addEventListener('blur', () => { if (input.value || input.getAttribute('aria-invalid') === 'true') validate(input); });
    input.addEventListener('input', () => {
      status.hidden = true;
      if (input.getAttribute('aria-invalid') === 'true') validate(input);
      if (registration && input.name === 'password' && form.elements.password_confirmation.value) validate(form.elements.password_confirmation);
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    status.hidden = true;
    const valid = fields.map(validate).every(Boolean);
    if (!valid) { fields.find(input => input.getAttribute('aria-invalid') === 'true')?.focus(); return; }
    status.textContent = registration
      ? 'Thông tin hợp lệ trong bản thiết kế. Tài khoản chưa được tạo vì trang chưa kết nối API.'
      : 'Đây là bản thiết kế giao diện. Thông tin chưa được gửi và tài khoản chưa được xác thực.';
    status.hidden = false;
  });

  if (registration) {
    const roles = [...form.querySelectorAll('input[name="role"]')];
    const employer = new URLSearchParams(location.search).get('role') === 'employer';
    roles.find(input => input.value === (employer ? 'employer' : 'candidate')).checked = true;
    function updateRole() {
      const hiring = form.elements.role.value === 'employer';
      document.getElementById('roleNote').textContent = hiring
        ? 'Tạo tài khoản người quản lý tuyển dụng. Bạn có thể hoàn thiện hồ sơ công ty sau khi đăng ký.'
        : 'Tạo hồ sơ cá nhân, lưu việc quan tâm và kết nối với nhà tuyển dụng khi ứng tuyển.';
      document.getElementById('nameLabel').textContent = hiring ? 'Họ và tên người liên hệ' : 'Họ và tên';
      status.hidden = true;
    }
    roles.forEach(input => input.addEventListener('change', updateRole));
    updateRole();
  }
  const drawer = document.getElementById('routesDrawer');
  const backdrop = document.getElementById('routesDrawerBackdrop');
  if (drawer && backdrop) {
    drawer.hidden = true;
    const toggleDrawer = open => { drawer.hidden = !open; drawer.classList.toggle('translate-x-full', !open); backdrop.classList.toggle('hidden', !open); };
    document.getElementById('toggleRoutesDrawer')?.addEventListener('click', () => toggleDrawer(true));
    document.getElementById('closeRoutesDrawer')?.addEventListener('click', () => toggleDrawer(false));
    backdrop.addEventListener('click', () => toggleDrawer(false));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') toggleDrawer(false); });
  }
  icons();
})();
