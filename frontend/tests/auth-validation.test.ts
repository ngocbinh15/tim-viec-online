import assert from "node:assert/strict";
import test from "node:test";
import {
  latestRegistrationDob,
  readAuthForm,
  validateAuthValues,
} from "../src/features/auth/validation";

const registration = {
  name: "Nguyễn Thị Hồng-Anh",
  email: "anh@example.com",
  phone: "0912345678",
  dob: "2011-10-17",
  role: "candidate",
  password: "ĐăngNhập1!",
  password_confirmation: "ĐăngNhập1!",
};
const today = "2026-10-17";

test("new passwords cannot exceed the bcrypt UTF-8 byte limit", () => {
  const password = "ệ".repeat(28) + "A1!";
  assert.ok(
    validateAuthValues(
      "reset",
      {
        email: registration.email,
        token: "valid",
        password,
        password_confirmation: password,
      },
      today,
    ).password,
  );
});

test("registration accepts both public roles, optional phone and exact fifteenth birthday", () => {
  for (const role of ["candidate", "employer"]) {
    assert.deepEqual(
      validateAuthValues(
        "register",
        { ...registration, role, phone: "" },
        today,
      ),
      {},
    );
  }
  assert.ok(
    validateAuthValues(
      "register",
      { ...registration, dob: "2011-10-18" },
      today,
    ).dob,
  );
  assert.ok(
    validateAuthValues("register", { ...registration, role: "admin" }, today)
      .role,
  );
});

test("age calculation handles leap years and rejects invalid calendar or future dates", () => {
  assert.equal(latestRegistrationDob("2024-02-29"), "2009-02-28");
  assert.equal(latestRegistrationDob("2023-02-28"), "2008-02-28");
  assert.equal(latestRegistrationDob("2023-02-29"), "");
  const leapBirthday = { ...registration, dob: "2008-02-29" };
  assert.ok(validateAuthValues("register", leapBirthday, "2023-02-28").dob);
  assert.equal(
    validateAuthValues("register", leapBirthday, "2023-03-01").dob,
    undefined,
  );
  for (const dob of [
    "2010-02-30",
    "2010-13-01",
    "0000-01-01",
    "2027-01-01",
    "11-01-01",
    "",
  ]) {
    assert.ok(
      validateAuthValues("register", { ...registration, dob }, today).dob,
    );
  }
});

test("registration validates names and Vietnam phone prefixes", () => {
  for (const name of ["A", "Nguyễn <script>", "Nguyễn\nAn", "A".repeat(101)]) {
    assert.ok(
      validateAuthValues("register", { ...registration, name }, today).name,
    );
  }
  for (const prefix of ["03", "05", "07", "08", "09"]) {
    assert.equal(
      validateAuthValues(
        "register",
        { ...registration, phone: `${prefix}12345678` },
        today,
      ).phone,
      undefined,
    );
  }
  for (const phone of [
    "0212345678",
    "091234567",
    "+84912345678",
    "09123456789",
  ]) {
    assert.ok(
      validateAuthValues("register", { ...registration, phone }, today).phone,
    );
  }
});

test("new passwords enforce complexity, length and exact confirmation", () => {
  for (const password of [
    "Aa1!",
    "abcdefgh1!",
    "ABCDEFGH1!",
    "Abcdefgh!",
    "Abcdefgh1 ",
    `Aa1!${"a".repeat(29)}`,
  ]) {
    assert.ok(
      validateAuthValues(
        "register",
        { ...registration, password, password_confirmation: password },
        today,
      ).password,
    );
  }
  assert.ok(
    validateAuthValues(
      "register",
      { ...registration, password_confirmation: `${registration.password} ` },
      today,
    ).password_confirmation,
  );
  for (const password of [
    "Aa1!aaaa",
    `Aa1!${"a".repeat(28)}`,
    "ĐăngNhập١!",
    " ĐăngNhập1! ",
  ]) {
    assert.equal(
      validateAuthValues(
        "register",
        { ...registration, password, password_confirmation: password },
        today,
      ).password,
      undefined,
    );
  }
});

test("login permits legacy passwords without applying new-password rules", () => {
  assert.deepEqual(
    validateAuthValues(
      "login",
      { email: "anh@example.com", password: "old" },
      today,
    ),
    {},
  );
  assert.ok(
    validateAuthValues(
      "login",
      { email: "anh@example.com", password: "" },
      today,
    ).password,
  );
});

test("email validation and forgot request do not require passwords", () => {
  assert.deepEqual(
    validateAuthValues("forgot", { email: " anh@example.com " }, today),
    {},
  );
  for (const email of [
    "",
    "anh@",
    "a b@example.com",
    "a@@example.com",
    `${"a".repeat(90)}@example.com`,
  ]) {
    assert.ok(validateAuthValues("forgot", { email }, today).email);
  }
});

test("reset requires a bounded token and password confirmation", () => {
  const reset = { ...registration, token: "valid-token" };
  assert.deepEqual(validateAuthValues("reset", reset, today), {});
  for (const token of ["", " ", "a".repeat(513)]) {
    assert.ok(validateAuthValues("reset", { ...reset, token }, today).token);
  }
  assert.ok(
    validateAuthValues("reset", { ...reset, password_confirmation: "" }, today)
      .password_confirmation,
  );
});

test("password changes require current password and a different new password", () => {
  const change = {
    password: "NewPassword1!",
    password_confirmation: "NewPassword1!",
    current_password: "OldPassword1!",
  };
  assert.deepEqual(validateAuthValues("change", change, today), {});
  assert.ok(
    validateAuthValues("change", { ...change, current_password: "" }, today)
      .current_password,
  );
  assert.ok(
    validateAuthValues(
      "change",
      { ...change, current_password: change.password },
      today,
    ).password,
  );
});

test("form reader whitelists fields, normalizes email and preserves passwords exactly", () => {
  const form = new FormData();
  form.set("email", " ANH@EXAMPLE.COM ");
  form.set("password", " Password1! ");
  form.set("role", "admin");
  form.set("remember", "on");
  form.set("__proto__", "unsafe");
  assert.deepEqual(readAuthForm("login", form), {
    email: "anh@example.com",
    password: " Password1! ",
  });
});

test("form reader rejects files and retains overlong validation failures within a bound", () => {
  const form = new FormData();
  for (const [field, value] of Object.entries(registration))
    form.set(field, value);
  form.set("name", "A".repeat(10000));
  form.set("email", new Blob(["file@example.com"]), "email.txt");
  form.set("password", "Aa1!".repeat(10000));
  const values = readAuthForm("register", form);
  assert.equal(values.name.length, 1000);
  assert.equal(values.password.length, 1000);
  assert.equal(values.email, "");
  const errors = validateAuthValues("register", values, today);
  assert.ok(errors.name);
  assert.ok(errors.password);
  assert.ok(errors.email);
});

test("oversized existing credentials fail instead of sending truncated passwords", () => {
  for (const kind of ["login", "change"] as const) {
    const form = new FormData();
    form.set("email", "anh@example.com");
    form.set(
      "password",
      kind === "login" ? "a".repeat(10000) : "NewPassword1!",
    );
    form.set("password_confirmation", "NewPassword1!");
    form.set("current_password", "a".repeat(10000));
    const values = readAuthForm(kind, form);
    const errors = validateAuthValues(kind, values, today);
    assert.ok(errors[kind === "login" ? "password" : "current_password"]);
  }
  assert.deepEqual(
    validateAuthValues(
      "login",
      { email: "anh@example.com", password: "a".repeat(512) },
      today,
    ),
    {},
  );
});
