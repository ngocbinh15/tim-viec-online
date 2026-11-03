import { latestRegistrationDob } from "../auth/validation";
import { parseBirthDate } from "../auth/birth-date";
import {
  MAX_AVATAR_BYTES,
  MAX_CV_BYTES,
  MAX_PROFILE_SKILLS,
  PROFILE_SKILLS,
  type CandidateProfile,
} from "./types";

export function validateProfile(
  profile: CandidateProfile,
  today: string,
  catalog: readonly { id: number }[] = PROFILE_SKILLS,
  maxExperience = 80,
  maxBio = 5000,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (profile.name.trim().length < 2 || profile.name.trim().length > 100)
    errors.name = "Họ tên cần từ 2 đến 100 ký tự.";
  if (
    profile.phone &&
    !/^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(profile.phone.trim())
  )
    errors.phone = "Số điện thoại Việt Nam chưa hợp lệ.";
  if (
    profile.dob &&
    (!parseBirthDate(profile.dob) || profile.dob > latestRegistrationDob(today))
  )
    errors.dob = "Ngày sinh chưa hợp lệ hoặc chưa đủ 15 tuổi.";
  if (profile.title.length > 100)
    errors.title = "Chức danh không quá 100 ký tự.";
  if (
    !Number.isInteger(profile.experience_years) ||
    profile.experience_years < 0 ||
    profile.experience_years > maxExperience
  )
    errors.experience_years = `Số năm kinh nghiệm từ 0 đến ${maxExperience}.`;
  if (profile.bio.length > maxBio)
    errors.bio = `Giới thiệu không quá ${maxBio.toLocaleString("vi-VN")} ký tự.`;
  if (profile.address.length > 255)
    errors.address = "Địa chỉ không quá 255 ký tự.";
  if (profile.city.length > 100)
    errors.city = "Tên tỉnh/thành phố không quá 100 ký tự.";
  for (const field of ["linkedin", "github", "portfolio"] as const) {
    if (!profile[field]) continue;
    try {
      const url = new URL(profile[field]);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        profile[field].length > 500
      )
        throw new Error();
    } catch {
      errors[field] =
        "Nhập liên kết HTTP(S) hợp lệ, không chứa thông tin đăng nhập.";
    }
  }
  if (profile.skill_ids.length > MAX_PROFILE_SKILLS)
    errors.skill_ids = "Chỉ được chọn tối đa 10 kỹ năng.";
  else if (
    new Set(profile.skill_ids).size !== profile.skill_ids.length ||
    profile.skill_ids.some((id) => !catalog.some((skill) => skill.id === id))
  )
    errors.skill_ids = "Danh sách kỹ năng chưa hợp lệ.";
  return errors;
}

export async function validateCv(file: File): Promise<string | null> {
  if (
    !file.size ||
    file.size > MAX_CV_BYTES ||
    !/\.pdf$/i.test(file.name) ||
    (file.type && file.type !== "application/pdf")
  )
    return "Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB";
  // Some PDF exports include a BOM or blank lines before the header. Only
  // tolerate whitespace there; backend MIME validation still checks the file.
  const header = new TextDecoder().decode(
    await file.slice(0, 1024).arrayBuffer(),
  );
  return /^[\uFEFF\t\n\f\r ]*%PDF-/.test(header)
    ? null
    : "Tệp không có định dạng PDF hợp lệ.";
}

export async function validateAvatar(file: File): Promise<string | null> {
  const error = "Chọn ảnh JPEG, PNG hoặc WebP không quá 2 MB.";
  if (
    !file.size ||
    file.size > MAX_AVATAR_BYTES ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    return error;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = String.fromCharCode(...bytes);
  const valid =
    file.type === "image/png"
      ? bytes[0] === 137 && text.slice(1, 4) === "PNG"
      : file.type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : text.startsWith("RIFF") && text.slice(8) === "WEBP";
  return valid ? null : error;
}

export function profileCompletion(
  profile: CandidateProfile,
  hasCv: boolean,
  hasAvatar: boolean,
): number {
  const filled = [
    !!profile.name.trim(),
    !!profile.phone,
    !!profile.dob,
    !!profile.title.trim(),
    !!profile.city,
    !!profile.bio.trim(),
    profile.skill_ids.length > 0,
    hasCv,
    hasAvatar,
    !!(profile.linkedin || profile.github || profile.portfolio),
  ];
  return filled.filter(Boolean).length * 10;
}
