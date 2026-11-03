"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type FocusEvent,
} from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import type {
  AuthActionState,
  AuthKind,
  AuthValues,
  FieldErrors,
} from "@/features/auth/types";
import { INITIAL_AUTH_STATE } from "@/features/auth/types";
import { validateAuthValues } from "@/features/auth/validation";
import { safeJobReturnPath } from "@/lib/return-path";
import { BirthDateField } from "./birth-date-field";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/modules/cores/shadcn/components/ui/field";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Checkbox } from "@/modules/cores/shadcn/components/ui/checkbox";

type Props = {
  kind: AuthKind;
  today: string;
  action: (
    previous: AuthActionState,
    form: FormData,
  ) => Promise<AuthActionState>;
  role?: "candidate" | "employer";
  email?: string;
  token?: string;
  returnTo?: string;
  preview?: boolean;
};
const submitLabels = {
  login: "Đăng nhập",
  register: "Tạo tài khoản",
  forgot: "Gửi liên kết khôi phục",
  reset: "Đặt lại mật khẩu",
  change: "Đổi mật khẩu",
};

function focusFirstError(form: HTMLFormElement | null, errors: FieldErrors) {
  const fields = form?.querySelectorAll<HTMLInputElement>(
    'input[name]:not([type="hidden"]), input[data-auth-field]',
  );
  Array.from(fields ?? [])
    .find(
      (field) =>
        errors[field.dataset.authField ?? field.name] && !field.disabled,
    )
    ?.focus();
}

export function AuthForm({
  kind,
  today,
  action,
  role = "candidate",
  email = "",
  token = "",
  returnTo = "/jobs",
  preview = false,
}: Props) {
  const destination = safeJobReturnPath(returnTo);
  const publicReturnTo = /^\/jobs(?:\/\d+)?(?:\?|$)/.test(destination)
    ? destination
    : "/jobs";
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const submitPointer = useRef(false);
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_AUTH_STATE,
  );
  const [values, setValues] = useState<AuthValues>({
    role,
    email,
    token,
    name: "",
    phone: "",
    dob: "",
    password: "",
    password_confirmation: "",
    current_password: "",
  });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [edited, setEdited] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [remember, setRemember] = useState(false);
  const [submittedValues, setSubmittedValues] = useState<AuthValues>({});
  const serverErrors = Object.fromEntries(
    Object.entries(state.errors ?? {}).filter(
      ([name]) => values[name] === submittedValues[name],
    ),
  );
  const errors = {
    ...serverErrors,
    ...Object.fromEntries(
      Object.entries(clientErrors).filter(([, error]) => !!error),
    ),
  };
  useEffect(() => {
    focusFirstError(formRef.current, state.errors ?? {});
  }, [state]);
  useEffect(() => {
    const release = () => {
      submitPointer.current = false;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, []);
  function change(name: string, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }));
    setClientErrors((previous) => ({ ...previous, [name]: "" }));
    setEdited(true);
    setPreviewMessage("");
  }
  const handleFieldBlur = useCallback(
    (name: string, event: FocusEvent<HTMLInputElement>) => {
      // Submit validates the whole form. Avoid moving the submit button between
      // pointer-down and click by inserting a blur error immediately before it.
      if (
        submitPointer.current ||
        (event.relatedTarget instanceof HTMLButtonElement &&
          event.relatedTarget.type === "submit")
      )
        return;
      setClientErrors((previous) => ({
        ...previous,
        [name]: validateAuthValues(kind, values, today)[name] ?? "",
      }));
    },
    [kind, today, values],
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    const next = validateAuthValues(kind, values, today);
    setClientErrors(next);
    setEdited(false);
    setSubmittedValues({ ...values });
    if (Object.keys(next).length) {
      event.preventDefault();
      focusFirstError(formRef.current, next);
    } else if (preview) {
      event.preventDefault();
      setPreviewMessage(
        "Hiện chưa thể thực hiện yêu cầu. Vui lòng thử lại sau.",
      );
    }
  }
  function input(
    name: string,
    label: string,
    options: {
      type?: string;
      autocomplete?: string;
      optional?: boolean;
      description?: string;
      readOnly?: boolean;
    } = {},
  ) {
    const password = name.includes("password");
    const error = errors[name];
    const descriptionId = options.description
      ? `${id}-${name}-description`
      : undefined;
    return (
      <Field data-invalid={!!error} key={name} className="auth-field">
        <FieldLabel htmlFor={`${id}-${name}`}>
          {label}
          {options.optional && (
            <span className="auth-optional">(tùy chọn)</span>
          )}
        </FieldLabel>
        <div className="auth-input-wrap">
          <Input
            id={`${id}-${name}`}
            name={name}
            type={
              password
                ? visible[name]
                  ? "text"
                  : "password"
                : (options.type ?? "text")
            }
            autoComplete={options.autocomplete}
            value={values[name] ?? ""}
            onChange={(event) => change(name, event.target.value)}
            onBlur={(event) => handleFieldBlur(name, event)}
            readOnly={options.readOnly}
            disabled={pending}
            required={!options.optional}
            aria-invalid={!!error}
            aria-describedby={
              [descriptionId, error ? `${id}-${name}-error` : undefined]
                .filter(Boolean)
                .join(" ") || undefined
            }
            maxLength={
              password
                ? kind === "login" || name === "current_password"
                  ? 512
                  : 32
                : name === "email" || name === "name"
                  ? 100
                  : name === "phone"
                    ? 10
                    : undefined
            }
            className={`h-12 ${password ? "pr-12" : ""}`}
          />
          {password && (
            <Button
              type="button"
              disabled={pending}
              variant="ghost"
              className="auth-password-toggle"
              aria-label={`${visible[name] ? "Ẩn" : "Hiện"} ${label.toLowerCase()}`}
              aria-pressed={!!visible[name]}
              onClick={() =>
                setVisible((previous) => ({
                  ...previous,
                  [name]: !previous[name],
                }))
              }
            >
              {visible[name] ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
            </Button>
          )}
        </div>
        {options.description && (
          <FieldDescription id={descriptionId}>
            {options.description}
          </FieldDescription>
        )}
        {error && <FieldError id={`${id}-${name}-error`}>{error}</FieldError>}
      </Field>
    );
  }
  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={submit}
      onPointerDownCapture={(event) => {
        // Safari may blur the input with a null relatedTarget when a button is
        // tapped. Capture the submit intent before that blur can move the form.
        submitPointer.current =
          event.target instanceof Element &&
          !!event.target.closest('button[type="submit"]');
      }}
      noValidate
      aria-busy={pending}
      className="auth-form"
    >
      {kind === "register" && (
        <>
          <fieldset className="auth-role-picker">
            <legend>Bạn muốn tạo tài khoản</legend>
            {[
              {
                value: "candidate",
                label: "Ứng viên",
                text: "Tìm cơ hội nghề nghiệp",
              },
              {
                value: "employer",
                label: "Nhà tuyển dụng",
                text: "Đăng tin và tìm ứng viên",
              },
            ].map((item) => (
              <label
                key={item.value}
                className={values.role === item.value ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="role"
                  value={item.value}
                  checked={values.role === item.value}
                  disabled={pending}
                  onChange={() => change("role", item.value)}
                />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.text}</small>
                </span>
              </label>
            ))}
          </fieldset>
          {errors.role && <FieldError>{errors.role}</FieldError>}
          {input(
            "name",
            values.role === "employer"
              ? "Họ và tên người liên hệ"
              : "Họ và tên",
            { autocomplete: "name" },
          )}
        </>
      )}
      {kind === "forgot" && (
        <p className="auth-form-note">
          Bạn cần xác thực email trước khi khôi phục mật khẩu.{" "}
          <Link
            href={
              values.email &&
              !validateAuthValues("forgot", { email: values.email }, today)
                .email
                ? `/verify-email?${new URLSearchParams({ email: values.email.trim().toLowerCase() })}`
                : "/verify-email"
            }
          >
            Xác thực email / gửi lại liên kết
          </Link>
        </p>
      )}
      {kind !== "change" &&
        input("email", "Email", {
          type: "email",
          autocomplete: "email",
          readOnly: kind === "reset",
        })}
      {kind === "register" && (
        <div className="auth-paired-fields">
          {input("phone", "Số điện thoại", {
            type: "tel",
            autocomplete: "tel",
            optional: true,
          })}
          <BirthDateField
            id={`${id}-dob`}
            value={values.dob ?? ""}
            today={today}
            disabled={pending}
            error={errors.dob}
            onChange={(value) => change("dob", value)}
            onBlur={(event) => handleFieldBlur("dob", event)}
          />
        </div>
      )}
      {kind === "change" &&
        input("current_password", "Mật khẩu hiện tại", {
          autocomplete: "current-password",
        })}
      {kind !== "forgot" &&
        input(
          "password",
          kind === "change" || kind === "reset" ? "Mật khẩu mới" : "Mật khẩu",
          {
            autocomplete:
              kind === "login" ? "current-password" : "new-password",
            description:
              kind !== "login"
                ? "8–32 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt."
                : undefined,
          },
        )}
      {["register", "reset", "change"].includes(kind) &&
        input("password_confirmation", "Xác nhận mật khẩu", {
          autocomplete: "new-password",
        })}
      {kind === "reset" && <input type="hidden" name="token" value={token} />}
      {kind === "login" && (
        <div className="auth-form-options">
          <label htmlFor={`${id}-remember`}>
            <Checkbox
              id={`${id}-remember`}
              name="remember"
              checked={remember}
              disabled={pending}
              onCheckedChange={(value) => setRemember(value === true)}
            />
            Ghi nhớ đăng nhập
          </label>
          <Link href="/forgot-password">Quên mật khẩu?</Link>
        </div>
      )}
      {(previewMessage ||
        (!edited && state.message) ||
        Object.values(clientErrors).some(Boolean)) &&
        !pending && (
          <div
            role={
              state.status === "error" ||
              Object.values(clientErrors).some(Boolean)
                ? "alert"
                : "status"
            }
            className={`auth-status ${state.status === "success" ? "auth-status-success" : ""}`}
          >
            {Object.values(clientErrors).some(Boolean)
              ? "Vui lòng kiểm tra lại thông tin đã nhập."
              : previewMessage || state.message}
            {kind === "reset" && state.code === "invalid_reset_token" && (
              <>
                {" "}
                <Link href="/forgot-password">Yêu cầu liên kết mới</Link>
              </>
            )}
          </div>
        )}
      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full auth-submit"
      >
        {pending ? (
          <>
            <LoaderCircle aria-hidden="true" className="animate-spin" />
            Đang xử lý…
          </>
        ) : (
          <>
            {submitLabels[kind]}
            <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
      {kind === "register" && (
        <p className="auth-form-note">
          {values.role === "employer"
            ? "Bạn đăng ký tài khoản người liên hệ. Hồ sơ công ty được hoàn thiện sau khi đăng nhập."
            : "Bạn có thể bổ sung hồ sơ và tải CV sau khi đăng nhập."}
        </p>
      )}
      {kind === "login" && (
        <>
          <p className="auth-switch">
            Chưa có tài khoản?{" "}
            <Link href={`/register?role=${role}`}>Đăng ký ngay</Link>
          </p>
          <Link className="auth-return" href={publicReturnTo}>
            Quay lại xem việc làm
          </Link>
        </>
      )}
      {kind !== "login" && (
        <p className="auth-switch">
          {kind === "register" ? "Đã có tài khoản? " : "Nhớ mật khẩu? "}
          <Link href="/login">Đăng nhập</Link>
        </p>
      )}
    </form>
  );
}
