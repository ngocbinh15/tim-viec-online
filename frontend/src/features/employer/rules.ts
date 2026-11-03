import type {
  CompanyValues,
  JobValues,
  EmployerJob,
  EmployerCompany,
} from "./types";
export function companyReady(company: CompanyValues) {
  return [
    company.name,
    company.description,
    company.address,
    company.city,
  ].every((value) => value.trim().length > 0);
}
export function validateCompany(values: CompanyValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of ["name", "description", "address", "city"] as const)
    if (!values[key].trim()) errors[key] = "Vui lòng bổ sung thông tin này.";
  for (const [key, max] of [
    ["name", 200],
    ["address", 255],
    ["city", 100],
    ["company_size", 50],
    ["description", 15000],
  ] as const)
    if (values[key].length > max) errors[key] = `Tối đa ${max} ký tự.`;
  if (values.website) {
    try {
      const url = new URL(values.website);
      if (
        !/^https?:$/.test(url.protocol) ||
        url.username ||
        url.password ||
        values.website.length > 255
      )
        throw new Error();
    } catch {
      errors.website = "Nhập website http hoặc https hợp lệ.";
    }
  }
  return errors;
}
export function validateJob(
  values: JobValues,
  today: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.title.trim().length < 10 || values.title.trim().length > 200)
    errors.title = "Tiêu đề từ 10 đến 200 ký tự.";
  if (!Number.isSafeInteger(values.category_id) || values.category_id < 1)
    errors.category_id = "Vui lòng chọn ngành nghề.";
  if (!values.job_level || values.job_level.length > 50)
    errors.job_level = "Vui lòng chọn cấp bậc.";
  if (
    !Number.isSafeInteger(values.quantity) ||
    values.quantity < 1 ||
    values.quantity > 100000
  )
    errors.quantity = "Số lượng tuyển phải là số nguyên từ 1 đến 100.000.";
  if (!values.city || values.city.length > 100)
    errors.city = "Vui lòng chọn tỉnh / thành phố.";
  if (!values.address.trim() || values.address.length > 255)
    errors.address = "Nhập địa điểm làm việc, tối đa 255 ký tự.";
  if (
    !["full_time", "part_time", "remote", "internship"].includes(
      values.job_type,
    )
  )
    errors.job_type = "Vui lòng chọn hình thức làm việc.";
  const date = new Date(`${values.deadline}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(values.deadline) ||
    !Number.isFinite(+date) ||
    date.toISOString().slice(0, 10) !== values.deadline ||
    values.deadline <= today
  )
    errors.deadline = "Hạn nộp hồ sơ phải sau ngày hôm nay";
  for (const key of ["description", "requirements", "benefits"] as const) {
    if (!values[key].trim()) errors[key] = "Vui lòng bổ sung nội dung này.";
    else if (values[key].length > 15000) errors[key] = "Tối đa 15.000 ký tự.";
  }
  const salaryValid = (value: string) =>
    /^\d+$/.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0;
  if (!["range", "starting", "negotiable"].includes(values.salary_mode))
    errors.salary_mode = "Chọn cách hiển thị lương.";
  if (values.salary_mode !== "negotiable") {
    if (!salaryValid(values.salary_min))
      errors.salary_min = "Nhập mức lương nguyên lớn hơn 0 VNĐ.";
    if (
      values.salary_mode === "range" &&
      (!salaryValid(values.salary_max) ||
        Number(values.salary_max) < Number(values.salary_min))
    )
      errors.salary_max =
        "Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.";
  }
  return errors;
}
export function effectiveJobStatus(
  job: Pick<EmployerJob, "status" | "deadline">,
  today: string,
) {
  return job.status === "closed"
    ? "closed"
    : job.deadline < today
      ? "expired"
      : job.status;
}
export function jobFromValues(
  values: JobValues,
  company: EmployerCompany,
  id: number,
  skills: { id: number; name: string }[],
  previous?: EmployerJob,
): EmployerJob {
  const now = new Date().toISOString();
  const { salary_mode, salary_min, salary_max, skill_ids, ...content } = values;
  return {
    ...content,
    id,
    company_id: company.id,
    company,
    title: values.title.trim(),
    salary_min: salary_mode === "negotiable" ? null : Number(salary_min),
    salary_max: salary_mode === "range" ? Number(salary_max) : null,
    is_negotiable: salary_mode === "negotiable",
    skills: skills.filter((skill) => skill_ids.includes(skill.id)),
    status: previous?.status === "closed" ? "closed" : "active",
    created_at: previous?.created_at ?? now,
    updated_at: now,
    views_count: previous?.views_count ?? 0,
  };
}
