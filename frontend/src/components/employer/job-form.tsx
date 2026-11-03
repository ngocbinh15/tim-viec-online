"use client";

import "./employer-forms.css";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  FilePenLine,
  Lightbulb,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEmployer } from "./employer-provider";
import { DeadlineField } from "./deadline-field";
import { companyReady, effectiveJobStatus } from "@/features/employer/rules";
import { JOB_STATUS_LABELS } from "@/features/employer/types";
import { formatSalary } from "@/features/jobs/formatters";
import { normalizeSearch } from "@/features/jobs/query";
import type {
  JobValues,
  EmployerJob,
  SalaryMode,
} from "@/features/employer/types";
import {
  JOB_LEVELS,
  JOB_TYPE_LABELS,
  type JobType,
} from "@/features/jobs/types";
import {
  SelectionField,
  SearchableSelectionField,
} from "@/components/forms/selection-field";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import { Checkbox } from "@/modules/cores/shadcn/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/modules/cores/shadcn/components/ui/field";

const SECTIONS = [
  ["job-information", "Thông tin công việc"],
  ["workplace", "Địa điểm làm việc"],
  ["salary-deadline", "Mức lương & hạn nhận hồ sơ"],
  ["job-content", "Nội dung tuyển dụng"],
];
const JobFormIdContext = createContext("");

function initialValues(job?: EmployerJob): JobValues {
  return {
    title: job?.title ?? "",
    category_id: job?.category_id ?? 0,
    job_level: job?.job_level ?? "",
    quantity: job?.quantity ?? 1,
    job_type: job?.job_type ?? "full_time",
    city: job?.city ?? "",
    address: job?.address ?? "",
    deadline: job?.deadline ?? "",
    description: job?.description ?? "",
    requirements: job?.requirements ?? "",
    benefits: job?.benefits ?? "",
    salary_mode: job?.is_negotiable
      ? "negotiable"
      : job?.salary_min && !job.salary_max
        ? "starting"
        : "range",
    salary_min: job?.salary_min ? String(job.salary_min) : "",
    salary_max: job?.salary_max ? String(job.salary_max) : "",
    skill_ids: job?.skills.map((skill) => skill.id) ?? [],
  };
}
function JobSection({
  index,
  intro,
  children,
}: {
  index: number;
  intro: string;
  children: ReactNode;
}) {
  const prefix = useContext(JobFormIdContext);
  return (
    <section
      className="ep-panel ep-job-section"
      id={`${prefix}-${SECTIONS[index][0]}`}
      aria-labelledby={`${prefix}-${SECTIONS[index][0]}-title`}
    >
      <div className="ep-job-section-heading">
        <span className="ep-job-section-number" aria-hidden="true">
          0{index + 1}
        </span>
        <div>
          <h2 id={`${prefix}-${SECTIONS[index][0]}-title`}>
            {SECTIONS[index][1]}
          </h2>
          <p>{intro}</p>
        </div>
      </div>
      <div className="ep-form-grid ep-job-fields">{children}</div>
    </section>
  );
}
function JobField({
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
  const prefix = useContext(JobFormIdContext);
  return (
    <Field
      className={`ep-field${full ? " ep-field-full" : ""}`}
      data-invalid={!!error}
      aria-labelledby={
        [
          "category_id",
          "job_level",
          "job_type",
          "city",
          "salary_mode",
        ].includes(name)
          ? `${prefix}-${name}-label`
          : undefined
      }
      aria-describedby={error ? `${prefix}-${name}-error` : undefined}
    >
      <FieldLabel
        id={`${prefix}-${name}-label`}
        htmlFor={`${prefix}-${name}`}
        onClick={(event) => {
          if (
            [
              "category_id",
              "job_level",
              "job_type",
              "city",
              "salary_mode",
            ].includes(name)
          ) {
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

export function JobForm({ id }: { id?: number }) {
  const employer = useEmployer();
  const existing =
    id === undefined
      ? undefined
      : employer.jobs.find(
          (job) => job.id === id && job.company_id === employer.company.id,
        );
  if (id !== undefined && !existing)
    return (
      <section className="ep-panel ep-form-unavailable" role="alert">
        <FilePenLine aria-hidden="true" />
        <h1>Không tìm thấy tin tuyển dụng</h1>
        <p>Tin này không tồn tại hoặc không thuộc doanh nghiệp của bạn.</p>
        <Link className="ep-button" href="/employer/jobs">
          Quay lại danh sách tin
        </Link>
      </section>
    );
  if (!companyReady(employer.company))
    return (
      <section className="ep-panel ep-form-unavailable">
        <Building2 aria-hidden="true" />
        <h1>Hoàn tất hồ sơ công ty trước khi đăng tin</h1>
        <p>
          Bổ sung tên công ty, giới thiệu, địa chỉ trụ sở và tỉnh / thành phố để
          ứng viên hiểu doanh nghiệp của bạn.
        </p>
        <Link className="ep-button ep-button-primary" href="/employer/company">
          Cập nhật hồ sơ công ty <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  return <JobEditor key={existing?.id ?? "new"} existing={existing} />;
}

function JobEditor({ existing }: { existing?: EmployerJob }) {
  const prefix = useId();
  const {
    company,
    categories,
    skills,
    cities,
    today,
    saveJob,
    apiMode,
    pending,
  } = useEmployer();
  const router = useRouter();
  const [values, setValues] = useState<JobValues>(() =>
    initialValues(existing),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skillSearch, setSkillSearch] = useState("");
  const skillSearchInput = useRef<HTMLInputElement>(null);
  const skillKeyword = normalizeSearch(skillSearch);
  const visibleSkills = skills.filter((skill) =>
    normalizeSearch(skill.name).includes(skillKeyword),
  );
  const salaryMinimum = Number(values.salary_min);
  const salaryMaximum = Number(values.salary_max);
  const validSalary =
    values.salary_mode === "negotiable" ||
    (/^\d+$/.test(values.salary_min) &&
      Number.isSafeInteger(salaryMinimum) &&
      salaryMinimum > 0 &&
      (values.salary_mode === "starting" ||
        (/^\d+$/.test(values.salary_max) &&
          Number.isSafeInteger(salaryMaximum) &&
          salaryMaximum >= salaryMinimum)));
  const salaryPreview = validSalary
    ? formatSalary({
        is_negotiable: values.salary_mode === "negotiable",
        salary_min: values.salary_mode === "negotiable" ? null : salaryMinimum,
        salary_max: values.salary_mode === "range" ? salaryMaximum : null,
      })
    : "Hoàn tất mức lương hợp lệ để xem trước";
  const existingStatus = existing
    ? effectiveJobStatus(existing, today)
    : undefined;
  const change = <K extends keyof JobValues>(key: K, value: JobValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const attributes = (name: keyof JobValues) => ({
    id: `${prefix}-${name}`,
    name,
    "aria-required":
      name === "salary_min"
        ? values.salary_mode !== "negotiable"
        : name === "salary_max"
          ? values.salary_mode === "range"
          : true,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${prefix}-${name}-error` : undefined,
  });
  return (
    <JobFormIdContext.Provider value={prefix}>
      <div className="ep-page-heading">
        <div>
          <h1>
            {existing ? "Chỉnh sửa tin tuyển dụng" : "Đăng tin tuyển dụng"}
          </h1>
          <p>Một tin rõ ràng là khởi đầu cho những hồ sơ phù hợp.</p>
          {existing && existingStatus && (
            <div className="ep-edit-job-context">
              <span>Mã tin #{existing.id}</span>
              <strong>{existing.title}</strong>
              <span className={`ep-badge ep-badge-${existingStatus}`}>
                {JOB_STATUS_LABELS[existingStatus]}
              </span>
            </div>
          )}
        </div>
        <Link className="ep-button" href="/employer/jobs">
          Quay lại danh sách tin
        </Link>
      </div>
      <div className="ep-job-layout">
        <form
          className="ep-job-form"
          noValidate
          aria-label="Soạn tin tuyển dụng"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const result = await saveJob(values, existing?.id);
            setErrors(result.errors);
            if (Object.keys(result.errors).length) {
              toast.error("Vui lòng kiểm tra thông tin tuyển dụng.");
              requestAnimationFrame(() => {
                const group = form.querySelector('[data-invalid="true"]');
                const field = group?.querySelector<HTMLElement>(
                  'input:not([type="hidden"]), textarea, [role="combobox"]',
                );
                field?.focus();
                field?.scrollIntoView({ block: "center", behavior: "smooth" });
              });
              return;
            }
            toast.success(
              apiMode
                ? "Đã lưu tin tuyển dụng."
                : existing
                  ? "Đã cập nhật tin trong phiên xem trước."
                  : "Đã đăng tin trong phiên xem trước.",
            );
            if (!existing) setValues(initialValues());
            router.push("/employer/jobs");
          }}
        >
          {errors.form && (
            <p role="alert" className="ep-field-error">
              {errors.form}
            </p>
          )}
          <p className="ep-job-required-note">
            Các trường có dấu{" "}
            <span className="ep-required" aria-hidden="true">
              *
            </span>{" "}
            là bắt buộc.
          </p>
          {errors.company && (
            <p className="ep-field-error" role="alert">
              {errors.company}{" "}
              <Link href="/employer/company">Cập nhật công ty</Link>
            </p>
          )}
          <JobSection
            index={0}
            intro="Giúp ứng viên nhận diện đúng vị trí bạn đang tìm kiếm."
          >
            <JobField
              name="title"
              label="Tiêu đề việc làm"
              error={errors.title}
              required
              full
            >
              <Input
                {...attributes("title")}
                value={values.title}
                minLength={10}
                maxLength={200}
                placeholder="VD: Lập trình viên Backend Laravel (Middle)"
                onChange={(event) => change("title", event.target.value)}
              />
              <div className="ep-field-meta">
                <small>
                  Từ 10 đến 200 ký tự. Nên nêu rõ vị trí và chuyên môn chính.
                </small>
                <span className="ep-field-counter">
                  {values.title.length} / 200
                </span>
              </div>
            </JobField>
            <JobField
              name="category_id"
              label="Ngành nghề"
              error={errors.category_id}
              required
            >
              <SearchableSelectionField
                clearable={false}
                id={`${prefix}-category_id`}
                name="category_id"
                label="Ngành nghề"
                placeholder="Chọn ngành nghề"
                searchLabel="Tìm ngành nghề"
                emptyMessage="Không tìm thấy ngành nghề phù hợp."
                options={categories.map((category) => ({
                  value: String(category.id),
                  label: category.name,
                }))}
                value={values.category_id ? String(values.category_id) : ""}
                onValueChange={(value) => change("category_id", Number(value))}
              />
            </JobField>
            <JobField
              name="job_level"
              label="Cấp bậc"
              error={errors.job_level}
              required
            >
              <SelectionField
                clearable={false}
                name="job_level"
                label="Cấp bậc"
                placeholder="Chọn cấp bậc"
                options={JOB_LEVELS.map((value) => ({ value, label: value }))}
                value={values.job_level}
                onValueChange={(value) => change("job_level", value)}
              />
            </JobField>
            <JobField
              name="quantity"
              label="Số lượng tuyển"
              error={errors.quantity}
              required
            >
              <div className="ep-input-suffix">
                <Input
                  {...attributes("quantity")}
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  value={values.quantity || ""}
                  onChange={(event) =>
                    change("quantity", Number(event.target.value))
                  }
                />
                <span>người</span>
              </div>
            </JobField>
            <JobField
              name="job_type"
              label="Hình thức làm việc"
              error={errors.job_type}
              required
            >
              <SelectionField
                clearable={false}
                name="job_type"
                label="Hình thức làm việc"
                placeholder="Chọn hình thức làm việc"
                options={Object.entries(JOB_TYPE_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
                value={values.job_type}
                onValueChange={(value) => change("job_type", value as JobType)}
              />
            </JobField>
            <fieldset className="ep-field-full ep-job-skills">
              <legend>Kỹ năng yêu cầu</legend>
              <p>Chọn các kỹ năng chuyên môn phù hợp với công việc.</p>
              <div className="ep-skill-search">
                <FieldLabel htmlFor={`${prefix}-skill-search`}>
                  Tìm kỹ năng
                </FieldLabel>
                <div className="ep-search ep-skill-search-control">
                  <Search className="ep-icon" aria-hidden="true" />
                  <Input
                    ref={skillSearchInput}
                    id={`${prefix}-skill-search`}
                    type="search"
                    placeholder="Nhập tên kỹ năng…"
                    value={skillSearch}
                    maxLength={100}
                    autoComplete="off"
                    aria-controls={`${prefix}-skill-options`}
                    onChange={(event) => setSkillSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault();
                    }}
                  />
                  {skillSearch && (
                    <button
                      type="button"
                      className="ep-skill-search-clear"
                      aria-label="Xóa tìm kỹ năng"
                      onClick={() => {
                        setSkillSearch("");
                        skillSearchInput.current?.focus();
                      }}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="ep-skill-count" role="status">
                  Đã chọn {values.skill_ids.length} kỹ năng
                </p>
              </div>
              <div className="ep-skill-options" id={`${prefix}-skill-options`}>
                {visibleSkills.map((skill) => (
                  <label
                    key={skill.id}
                    data-selected={values.skill_ids.includes(skill.id)}
                  >
                    <Checkbox
                      checked={values.skill_ids.includes(skill.id)}
                      onCheckedChange={(checked) =>
                        change(
                          "skill_ids",
                          checked === true
                            ? [...values.skill_ids, skill.id]
                            : values.skill_ids.filter(
                                (value) => value !== skill.id,
                              ),
                        )
                      }
                    />
                    <span>{skill.name}</span>
                  </label>
                ))}
                {visibleSkills.length === 0 && (
                  <p className="ep-skill-empty" role="status">
                    {skills.length === 0
                      ? "Chưa có kỹ năng để lựa chọn."
                      : "Không tìm thấy kỹ năng phù hợp. Thử từ khóa khác."}
                  </p>
                )}
              </div>
              {errors.skill_ids && (
                <p className="ep-field-error" role="alert">
                  {errors.skill_ids}
                </p>
              )}
            </fieldset>
          </JobSection>
          <JobSection
            index={1}
            intro="Cung cấp địa chỉ cụ thể để ứng viên chủ động cân nhắc."
          >
            <JobField
              name="city"
              label="Tỉnh / Thành phố"
              error={errors.city}
              required
              full
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
            </JobField>
            <JobField
              name="address"
              label="Địa chỉ làm việc chi tiết"
              error={errors.address}
              required
              full
            >
              <Input
                {...attributes("address")}
                value={values.address}
                maxLength={255}
                placeholder="VD: Khu Công nghệ cao Hòa Lạc, Hà Nội"
                onChange={(event) => change("address", event.target.value)}
              />
            </JobField>
          </JobSection>
          <JobSection
            index={2}
            intro="Thông tin minh bạch giúp hai bên có cùng kỳ vọng."
          >
            <JobField
              name="salary_mode"
              label="Hình thức hiển thị lương"
              error={errors.salary_mode}
              required
            >
              <SelectionField
                clearable={false}
                name="salary_mode"
                label="Hình thức hiển thị lương"
                placeholder="Chọn cách hiển thị lương"
                options={[
                  { value: "range", label: "Khoảng lương cụ thể" },
                  { value: "starting", label: "Lương khởi điểm" },
                  { value: "negotiable", label: "Thỏa thuận" },
                ]}
                value={values.salary_mode}
                onValueChange={(value) =>
                  change("salary_mode", value as SalaryMode)
                }
              />
            </JobField>
            <DeadlineField
              today={today}
              value={values.deadline}
              error={errors.deadline}
              onChange={(value) => change("deadline", value)}
            />
            <JobField
              name="salary_min"
              label="Lương tối thiểu"
              error={errors.salary_min}
              required={values.salary_mode !== "negotiable"}
            >
              <div className="ep-input-suffix">
                <Input
                  {...attributes("salary_min")}
                  inputMode="numeric"
                  value={values.salary_min}
                  disabled={values.salary_mode === "negotiable"}
                  maxLength={15}
                  placeholder="VD: 18000000"
                  onChange={(event) => change("salary_min", event.target.value)}
                />
                <span>VNĐ / tháng</span>
              </div>
            </JobField>
            <JobField
              name="salary_max"
              label="Lương tối đa"
              error={errors.salary_max}
              required={values.salary_mode === "range"}
            >
              <div className="ep-input-suffix">
                <Input
                  {...attributes("salary_max")}
                  inputMode="numeric"
                  value={values.salary_max}
                  disabled={values.salary_mode !== "range"}
                  maxLength={15}
                  placeholder="VD: 28000000"
                  onChange={(event) => change("salary_max", event.target.value)}
                />
                <span>VNĐ / tháng</span>
              </div>
            </JobField>
            <div className="ep-field-full ep-salary-preview">
              <span>Mức lương ứng viên nhìn thấy</span>
              <strong>{salaryPreview}</strong>
              <p className="ep-salary-hint">
                {values.salary_mode === "negotiable"
                  ? "Mức lương hiển thị: Thỏa thuận."
                  : values.salary_mode === "starting"
                    ? "Chỉ nhập lương tối thiểu. Tin sẽ hiển thị lương khởi điểm."
                    : "Nhập lương theo VNĐ. Lương tối thiểu không được lớn hơn lương tối đa."}
              </p>
            </div>
          </JobSection>
          <JobSection
            index={3}
            intro="Mô tả công việc thực tế, yêu cầu cần thiết và những gì bạn mang lại."
          >
            {(
              [
                [
                  "description",
                  "Mô tả công việc",
                  "Nhiệm vụ, trách nhiệm chính, sản phẩm và đội ngũ làm việc…",
                ],
                [
                  "requirements",
                  "Yêu cầu chuyên môn",
                  "Kinh nghiệm, kỹ năng, học vấn và công cụ cần sử dụng…",
                ],
                [
                  "benefits",
                  "Quyền lợi & đãi ngộ",
                  "Chế độ thưởng, bảo hiểm, ngày nghỉ và cơ hội phát triển…",
                ],
              ] as const
            ).map(([key, label, placeholder]) => (
              <JobField
                key={key}
                name={key}
                label={label}
                error={errors[key]}
                required
                full
              >
                <Textarea
                  {...attributes(key)}
                  rows={6}
                  maxLength={15000}
                  value={values[key]}
                  placeholder={placeholder}
                  onChange={(event) => change(key, event.target.value)}
                />
                <span className="ep-field-counter">
                  {values[key].length.toLocaleString("vi-VN")} / 15.000 ký tự
                </span>
              </JobField>
            ))}
          </JobSection>
          <div className="ep-panel ep-job-form-footer">
            <div>
              <strong>Sẵn sàng tìm đồng đội mới?</strong>
              <p>
                {apiMode
                  ? "Tin tuyển dụng được lưu vào hệ thống."
                  : "Thay đổi chỉ được lưu trong phiên xem trước hiện tại."}
              </p>
            </div>
            <div className="ep-form-actions">
              <button
                type="button"
                className="ep-button"
                onClick={() => {
                  setValues(initialValues(existing));
                  setErrors({});
                  router.push("/employer/jobs");
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={pending}
                className="ep-button ep-button-primary"
              >
                {existing ? "Lưu thay đổi" : "Đăng tin tuyển dụng"}
              </button>
            </div>
          </div>
        </form>
        <aside className="ep-job-aside" aria-label="Hướng dẫn đăng tin">
          <nav
            className="ep-panel ep-form-outline"
            aria-label="Các phần trong tin"
          >
            <h2>Nội dung tin tuyển dụng</h2>
            {SECTIONS.map(([anchor, label], index) => (
              <a key={anchor} href={`#${prefix}-${anchor}`}>
                <span>0{index + 1}</span>
                {label}
              </a>
            ))}
          </nav>
          <section className="ep-panel ep-form-company-card">
            <Building2 size={26} aria-hidden="true" />
            <h2>{company.name}</h2>
            <p>
              {company.city} · {company.company_size}
            </p>
            <p>
              <CheckCircle2 size={15} aria-hidden="true" /> Thông tin bắt buộc
              đã hoàn tất.
            </p>
            <Link href="/employer/company" className="ep-text-link">
              Cập nhật hồ sơ công ty{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </section>
          <section className="ep-panel ep-writing-guide">
            <Lightbulb aria-hidden="true" />
            <h2>Một tin tốt bắt đầu từ sự rõ ràng.</h2>
            <ul>
              <li>
                <strong>Đặt tiêu đề cụ thể</strong>
                <p>
                  Nêu vị trí và chuyên môn chính, giúp ứng viên nhận diện đúng
                  cơ hội.
                </p>
              </li>
              <li>
                <strong>Minh bạch về kỳ vọng</strong>
                <p>Mô tả công việc thực tế và kỹ năng cần thiết cho vị trí.</p>
              </li>
              <li>
                <strong>Chia sẻ điều bạn mang lại</strong>
                <p>
                  Nêu rõ mức lương, chế độ và cơ hội phát triển trong đội ngũ.
                </p>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </JobFormIdContext.Provider>
  );
}
