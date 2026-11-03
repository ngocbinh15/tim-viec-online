"use client";

import "./employer-forms.css";

import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Globe,
  Lightbulb,
  LockKeyhole,
  MapPin,
  Save,
  UserRound,
  UsersRound,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEmployer } from "./employer-provider";
import type { CompanyValues } from "@/features/employer/types";
import { validateAvatar } from "@/features/candidate-profile/validation";
import { useFileUrl } from "@/components/candidate/use-file-url";
import {
  SelectionField,
  SearchableSelectionField,
} from "@/components/forms/selection-field";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/modules/cores/shadcn/components/ui/field";

const SIZES = [
  "1-10 nhân viên",
  "11-50 nhân viên",
  "51-100 nhân viên",
  "101-500 nhân viên",
  "501-1000 nhân viên",
  "1000+ nhân viên",
];
const CompanyFormIdContext = createContext("");

function CompanyField({
  name,
  label,
  error,
  children,
  full = false,
  required = false,
}: {
  name: string;
  label: string;
  error?: string;
  children: ReactNode;
  full?: boolean;
  required?: boolean;
}) {
  const prefix = useContext(CompanyFormIdContext);
  return (
    <Field
      className={`ep-field${full ? " ep-field-full" : ""}`}
      data-invalid={!!error}
      aria-labelledby={
        name === "city" || name === "company_size"
          ? `${prefix}-${name}-label`
          : undefined
      }
      aria-describedby={error ? `${prefix}-${name}-error` : undefined}
    >
      <FieldLabel
        id={`${prefix}-${name}-label`}
        htmlFor={`${prefix}-${name}`}
        onClick={(event) => {
          if (name === "city" || name === "company_size") {
            event.currentTarget
              .closest('[role="group"]')
              ?.querySelector<HTMLButtonElement>('[role="combobox"]')
              ?.focus();
          }
        }}
      >
        {label}
        {required && <span className="ep-required" aria-hidden="true" />}
      </FieldLabel>
      {children}
      {error && <FieldError id={`${prefix}-${name}-error`}>{error}</FieldError>}
    </Field>
  );
}

export function CompanyForm() {
  const prefix = useId();
  const {
    company,
    cities,
    user,
    logo,
    setLogo,
    saveCompany,
    apiMode,
    pending,
  } = useEmployer();
  const [values, setValues] = useState<CompanyValues>(() => ({
    name: company.name,
    website: company.website ?? "",
    company_size: company.company_size,
    city: company.city,
    address: company.address,
    description: company.description,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoError, setLogoError] = useState("");
  const [saved, setSaved] = useState(false);
  const dirty = (Object.keys(values) as (keyof CompanyValues)[]).some(
    (key) => (values[key] ?? "") !== (company[key] ?? ""),
  );
  const completed = [
    values.name,
    values.description,
    values.address,
    values.city,
  ].filter((value) => value.trim()).length;
  const logoRequest = useRef(0);
  // Activity preserves this form when hidden. Invalidate file reads before
  // they can update the shared company logo after the user leaves the page.
  useLayoutEffect(
    () => () => {
      logoRequest.current += 1;
    },
    [],
  );
  const logoInput = useRef<HTMLInputElement>(null);
  const logoUrl = useFileUrl(logo);
  const preview = logoUrl || company.logo;
  const mark = company.name
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word[0])
    .join("");
  const change = (key: keyof CompanyValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const attributes = (name: keyof CompanyValues) => ({
    id: `${prefix}-${name}`,
    name,
    "aria-required": ["name", "city", "address", "description"].includes(name),
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${prefix}-${name}-error` : undefined,
  });
  return (
    <CompanyFormIdContext.Provider value={prefix}>
      <div className="ep-page-heading">
        <div>
          <h1>Hồ sơ công ty &amp; tài khoản</h1>
          <p>
            Giới thiệu doanh nghiệp và cập nhật thông tin người quản lý tuyển
            dụng.
          </p>
        </div>
        <Link className="ep-button" href={`/companies/${company.id}`}>
          Xem trang công ty <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="ep-profile-workspace">
        <div className="ep-profile-editor">
          <section
            className="ep-panel ep-profile-section"
            id={`${prefix}-company`}
            aria-labelledby={`${prefix}-company-title`}
          >
            <div className="ep-panel-heading">
              <div>
                <span className="ep-section-label">01 / DOANH NGHIỆP</span>
                <h2 id={`${prefix}-company-title`}>Thông tin công ty</h2>
                <p>
                  Thông tin hiển thị trên trang công ty và tin tuyển dụng của
                  bạn.
                </p>
              </div>
              <Building2 aria-hidden="true" />
            </div>
            <form
              noValidate
              onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const next = await saveCompany(values);
                setErrors(next);
                setLogoError(next.logo ?? "");
                if (Object.keys(next).length) {
                  toast.error("Vui lòng kiểm tra thông tin công ty.");
                  requestAnimationFrame(() => {
                    const group = form.querySelector('[data-invalid="true"]');
                    const control = group?.querySelector<HTMLElement>(
                      'input:not([type="hidden"]), textarea, [role="combobox"]',
                    );
                    control?.focus();
                    control?.scrollIntoView({
                      block: "center",
                      behavior: "smooth",
                    });
                  });
                } else {
                  setSaved(true);
                  toast.success(
                    apiMode
                      ? "Đã lưu thông tin công ty."
                      : "Đã lưu thông tin công ty trong phiên xem trước.",
                  );
                }
              }}
            >
              {errors.form && (
                <p role="alert" className="ep-field-error">
                  {errors.form}
                </p>
              )}
              <div className="ep-form-body">
                <div className="ep-logo-row">
                  <span className="ep-form-logo">
                    {preview ? (
                      <Image
                        src={preview}
                        alt="Logo công ty"
                        width={74}
                        height={74}
                        unoptimized
                      />
                    ) : (
                      mark
                    )}
                  </span>
                  <div className="ep-logo-control">
                    <label htmlFor={`${prefix}-logo`}>Logo công ty</label>
                    <input
                      id={`${prefix}-logo`}
                      ref={logoInput}
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-invalid={!!logoError}
                      aria-describedby={`${prefix}-logo-hint${logoError ? ` ${prefix}-logo-error` : ""}`}
                      onChange={async (event) => {
                        const input = event.target;
                        const file = input.files?.[0];
                        if (!file) return;
                        const request = ++logoRequest.current;
                        const error = await validateAvatar(file).catch(
                          () => "Không thể đọc ảnh. Vui lòng chọn ảnh khác.",
                        );
                        if (request !== logoRequest.current) return;
                        setLogoError(error ?? "");
                        if (!error) setLogo(file);
                        else input.value = "";
                      }}
                    />
                    <div className="ep-logo-picker-row">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => logoInput.current?.click()}
                        aria-label="Chọn ảnh logo công ty"
                        aria-describedby={`${prefix}-logo-hint${logoError ? ` ${prefix}-logo-error` : ""}`}
                      >
                        <Upload size={14} aria-hidden="true" />
                        Chọn ảnh logo
                      </Button>
                      <span className="ep-logo-filename" title={logo?.name}>
                        {logo?.name ?? "Chưa chọn ảnh"}
                      </span>
                      {logo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Xóa ảnh logo đã chọn"
                          onClick={() => {
                            logoRequest.current += 1;
                            setLogo(null);
                            setLogoError("");
                            if (logoInput.current) logoInput.current.value = "";
                          }}
                        >
                          <X size={14} aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    <small id={`${prefix}-logo-hint`}>
                      Ảnh PNG, JPG hoặc WebP, tối đa 2 MB. Nên dùng ảnh vuông.
                    </small>
                    {logoError && (
                      <p
                        id={`${prefix}-logo-error`}
                        className="ep-field-error"
                        role="alert"
                      >
                        {logoError}
                      </p>
                    )}
                  </div>
                </div>
                <div className="ep-required-note ep-company-completion">
                  <strong>Đã điền {completed}/4 thông tin bắt buộc</strong>
                  <span>
                    Tên, giới thiệu, địa chỉ và tỉnh / thành phố cần đầy đủ
                    trước khi đăng tin đầu tiên.
                  </span>
                  <progress
                    aria-label="Thông tin công ty bắt buộc đã điền"
                    value={completed}
                    max={4}
                  />
                </div>
                <div className="ep-form-grid">
                  <CompanyField
                    name="name"
                    label="Tên công ty"
                    error={errors.name}
                    required
                    full
                  >
                    <Input
                      {...attributes("name")}
                      value={values.name}
                      maxLength={200}
                      autoComplete="organization"
                      onChange={(event) => change("name", event.target.value)}
                    />
                  </CompanyField>
                  <CompanyField
                    name="website"
                    label="Website"
                    error={errors.website}
                  >
                    <Input
                      {...attributes("website")}
                      type="url"
                      value={values.website ?? ""}
                      maxLength={255}
                      placeholder="https://congty.vn"
                      autoComplete="url"
                      onChange={(event) =>
                        change("website", event.target.value)
                      }
                    />
                  </CompanyField>
                  <CompanyField
                    name="company_size"
                    label="Quy mô nhân sự"
                    error={errors.company_size}
                  >
                    <SelectionField
                      name="company_size"
                      label="Quy mô nhân sự"
                      placeholder="Chọn quy mô"
                      options={SIZES.map((value) => ({ value, label: value }))}
                      value={values.company_size}
                      onValueChange={(value) => change("company_size", value)}
                    />
                  </CompanyField>
                  <CompanyField
                    name="city"
                    label="Tỉnh / Thành phố"
                    error={errors.city}
                    required
                  >
                    <SearchableSelectionField
                      name="city"
                      label="Tỉnh / Thành phố"
                      placeholder="Chọn tỉnh / thành phố"
                      searchLabel="Tìm tỉnh / thành phố"
                      options={cities.map((value) => ({ value, label: value }))}
                      value={values.city}
                      onValueChange={(value) => change("city", value)}
                    />
                  </CompanyField>
                  <CompanyField
                    name="address"
                    label="Địa chỉ trụ sở"
                    error={errors.address}
                    required
                  >
                    <Input
                      {...attributes("address")}
                      value={values.address}
                      maxLength={255}
                      autoComplete="street-address"
                      onChange={(event) =>
                        change("address", event.target.value)
                      }
                    />
                  </CompanyField>
                  <CompanyField
                    name="description"
                    label="Giới thiệu công ty"
                    error={errors.description}
                    required
                    full
                  >
                    <Textarea
                      {...attributes("description")}
                      value={values.description}
                      rows={6}
                      maxLength={15000}
                      onChange={(event) =>
                        change("description", event.target.value)
                      }
                    />
                    <small>
                      Giới thiệu hoạt động, môi trường làm việc và những giá trị
                      mà doanh nghiệp hướng đến.
                    </small>
                    <span className="ep-field-counter">
                      {values.description.length.toLocaleString("vi-VN")} /
                      15.000 ký tự
                    </span>
                  </CompanyField>
                </div>
              </div>
              <div className="ep-form-footer">
                <span
                  className="ep-save-state"
                  data-dirty={dirty}
                  role="status"
                >
                  {dirty
                    ? "Có thay đổi chưa lưu"
                    : saved
                      ? apiMode
                        ? "Đã lưu thông tin"
                        : "Đã lưu thông tin trong phiên xem trước"
                      : "Thông tin công ty hiện tại"}
                </span>
                <button
                  className="ep-button ep-button-primary"
                  type="submit"
                  disabled={pending}
                >
                  <Save size={16} aria-hidden="true" />
                  Lưu thông tin công ty
                </button>
              </div>
            </form>
          </section>
          <section
            className="ep-panel ep-profile-section"
            id={`${prefix}-contact`}
            aria-labelledby={`${prefix}-contact-title`}
          >
            <div className="ep-panel-heading">
              <div>
                <span className="ep-section-label">02 / TÀI KHOẢN</span>
                <h2 id={`${prefix}-contact-title`}>Thông tin người liên hệ</h2>
                <p>Thông tin được xác minh từ tài khoản đăng nhập hiện tại.</p>
              </div>
              <UserRound aria-hidden="true" />
            </div>
            <div className="ep-form-body">
              <div className="ep-form-grid">
                <CompanyField name="contact-name" label="Họ và tên">
                  <Input
                    id={`${prefix}-contact-name`}
                    value={user.name}
                    readOnly
                  />
                </CompanyField>
                <CompanyField name="contact-email" label="Email đăng nhập">
                  <Input
                    id={`${prefix}-contact-email`}
                    value={user.email}
                    readOnly
                  />
                </CompanyField>
              </div>
              <p className="ep-account-meta">
                Vai trò: <strong>Nhà tuyển dụng</strong>
                <span className="ep-badge ep-badge-active">
                  Tài khoản đang hoạt động
                </span>
              </p>
            </div>
          </section>
          <section
            className="ep-panel ep-profile-section"
            id={`${prefix}-password`}
            aria-labelledby={`${prefix}-password-title`}
          >
            <div className="ep-panel-heading">
              <div>
                <span className="ep-section-label">03 / BẢO MẬT</span>
                <h2 id={`${prefix}-password-title`}>Đổi mật khẩu</h2>
                <p>Cập nhật mật khẩu để bảo vệ tài khoản doanh nghiệp.</p>
              </div>
              <LockKeyhole aria-hidden="true" />
            </div>
            <div className="ep-form-body">
              <p className="ep-muted">
                Xác thực mật khẩu hiện tại và chọn mật khẩu mới cho tài khoản.
              </p>
              <Link
                className="ep-button ep-button-blue"
                href="/account/security"
              >
                Thay đổi mật khẩu <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
        <aside
          className="ep-profile-aside"
          aria-label="Tóm tắt hồ sơ và điều hướng trang"
        >
          <section className="ep-panel ep-company-preview">
            <span className="ep-section-label">DOANH NGHIỆP CỦA BẠN</span>
            <span className="ep-form-logo">
              {preview ? (
                <Image
                  src={preview}
                  alt=""
                  width={74}
                  height={74}
                  unoptimized
                />
              ) : (
                mark
              )}
            </span>
            <h2>{company.name || "Tên công ty của bạn"}</h2>
            <ul>
              <li>
                <MapPin size={16} aria-hidden="true" />
                <span>
                  {[company.address, company.city].filter(Boolean).join(", ") ||
                    "Chưa cập nhật địa chỉ"}
                </span>
              </li>
              <li>
                <UsersRound size={16} aria-hidden="true" />
                <span>{company.company_size || "Chưa cập nhật quy mô"}</span>
              </li>
              <li>
                <Globe size={16} aria-hidden="true" />
                <span>{company.website || "Chưa cập nhật website"}</span>
              </li>
            </ul>
            <Link className="ep-button" href={`/companies/${company.id}`}>
              Xem trang công ty <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </section>
          <nav
            className="ep-panel ep-form-outline"
            aria-label="Các phần trong hồ sơ"
          >
            <h2>Nội dung hồ sơ</h2>
            {[
              ["company", "Thông tin công ty"],
              ["contact", "Thông tin người liên hệ"],
              ["password", "Đổi mật khẩu"],
            ].map(([anchor, label], index) => (
              <a key={anchor} href={`#${prefix}-${anchor}`}>
                <span>0{index + 1}</span>
                {label}
                <ArrowDownRight size={14} aria-hidden="true" />
              </a>
            ))}
          </nav>
          <div className="ep-form-tip">
            <Lightbulb size={20} aria-hidden="true" />
            <p>
              Hồ sơ rõ ràng giúp ứng viên hiểu doanh nghiệp trước khi gửi CV.
              Hãy bắt đầu với phần giới thiệu và địa chỉ trụ sở chính xác.
            </p>
          </div>
        </aside>
      </div>
    </CompanyFormIdContext.Provider>
  );
}
