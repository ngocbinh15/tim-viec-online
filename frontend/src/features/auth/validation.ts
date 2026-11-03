import type { AuthKind, AuthValues, FieldErrors } from "./types";

const fieldsByKind: Record<AuthKind, readonly string[]> = {
  login: ["email", "password"],
  register: [
    "role",
    "name",
    "email",
    "phone",
    "dob",
    "password",
    "password_confirmation",
  ],
  forgot: ["email"],
  reset: ["email", "token", "password", "password_confirmation"],
  change: ["current_password", "password", "password_confirmation"],
};

// Keep invalid overlong values long enough to reject without retaining unbounded input.
const inputLimit = 1000;
// Transport bound for existing credentials; independent of new-password rules.
const existingPasswordLimit = 512;

export function readAuthForm(kind: AuthKind, form: FormData): AuthValues {
  const values: AuthValues = {};
  for (const field of fieldsByKind[kind]) {
    const input = form.get(field);
    const value = typeof input === "string" ? input.slice(0, inputLimit) : "";
    values[field] = field.includes("password") ? value : value.trim();
    if (field === "email") values[field] = values[field].toLowerCase();
  }
  return values;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

/** Latest birthday eligible at age 15; invalid reference dates fail closed. */
export function latestRegistrationDob(today: string): string {
  if (!validDate(today)) return "";
  const year = Number(today.slice(0, 4)) - 15;
  if (year < 1) return "";
  const birthday = `${String(year).padStart(4, "0")}${today.slice(4)}`;
  // A February 29 reference day can fall in a non-leap birth year.
  return validDate(birthday)
    ? birthday
    : `${String(year).padStart(4, "0")}-02-28`;
}

export function validateAuthValues(
  kind: AuthKind,
  values: AuthValues,
  today: string,
): FieldErrors {
  const errors: FieldErrors = {};
  const value = (field: string) => values[field] ?? "";

  if (kind !== "change") {
    const email = value("email").trim();
    if (!email) errors.email = "Vui lòng nhập địa chỉ email.";
    else if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      errors.email = "Vui lòng nhập địa chỉ email hợp lệ, tối đa 100 ký tự.";
    }
  }

  if (kind === "register") {
    if (!["candidate", "employer"].includes(value("role"))) {
      errors.role = "Vui lòng chọn vai trò ứng viên hoặc nhà tuyển dụng.";
    }
    const name = value("name").trim();
    if (
      name.length < 2 ||
      name.length > 100 ||
      !/^[\p{L}\p{M} -]+$/u.test(name)
    ) {
      errors.name =
        "Họ tên từ 2–100 ký tự, chỉ gồm chữ, khoảng trắng và dấu gạch nối.";
    }
    const phone = value("phone").trim();
    if (phone && !/^0[35789]\d{8}$/.test(phone)) {
      errors.phone = "Số điện thoại không hợp lệ";
    }
    const dob = value("dob");
    const latestDob = latestRegistrationDob(today);
    if (!validDate(dob) || !latestDob || dob > latestDob) {
      errors.dob =
        "Vui lòng nhập ngày sinh hợp lệ. Bạn cần từ 15 tuổi trở lên để đăng ký.";
    }
  }

  if (kind === "reset") {
    const token = value("token");
    if (!token.trim() || token.length > 512) {
      errors.token = "Liên kết xác thực đã hết hạn hoặc không hợp lệ";
    }
  }

  if (kind === "change" && !value("current_password")) {
    errors.current_password = "Vui lòng nhập mật khẩu hiện tại.";
  } else if (
    kind === "change" &&
    value("current_password").length > existingPasswordLimit
  ) {
    errors.current_password =
      "Mật khẩu hiện tại không được vượt quá 512 ký tự.";
  }

  if (kind !== "forgot") {
    const password = value("password");
    if (!password) errors.password = "Vui lòng nhập mật khẩu.";
    else if (kind === "login" && password.length > existingPasswordLimit) {
      errors.password = "Mật khẩu không được vượt quá 512 ký tự.";
    } else if (
      kind !== "login" &&
      (password.length < 8 ||
        password.length > 32 ||
        !/\p{Ll}/u.test(password) ||
        !/\p{Lu}/u.test(password) ||
        !/\p{N}/u.test(password) ||
        !/[^\p{L}\p{N}\s]/u.test(password))
    ) {
      errors.password =
        "Mật khẩu từ 8–32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
    } else if (
      kind !== "login" &&
      new TextEncoder().encode(password).length > 72
    ) {
      errors.password =
        "Mật khẩu chứa quá nhiều ký tự có dấu. Vui lòng rút ngắn mật khẩu.";
    } else if (kind === "change" && password === value("current_password")) {
      errors.password = "Mật khẩu mới không được trùng với mật khẩu hiện tại";
    }
    if (
      kind !== "login" &&
      (!value("password_confirmation") ||
        value("password_confirmation") !== password)
    ) {
      errors.password_confirmation = "Mật khẩu xác nhận chưa khớp.";
    }
  }
  return errors;
}
