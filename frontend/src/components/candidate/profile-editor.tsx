"use client";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import {
  Download,
  Eye,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/features/api/client";
import { WorkspaceFrame } from "./workspace-frame";
import { useWorkspace } from "./workspace-provider";
import { useFileUrl } from "./use-file-url";
import { BirthDateField } from "@/components/auth/birth-date-field";
import { SearchableSelectionField } from "@/components/forms/selection-field";
import {
  MAX_PROFILE_SKILLS,
  PROFILE_SKILLS,
  type CandidateProfile,
} from "@/features/candidate-profile/types";
import {
  profileCompletion,
  validateAvatar,
  validateCv,
  validateProfile,
} from "@/features/candidate-profile/validation";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Checkbox } from "@/modules/cores/shadcn/components/ui/checkbox";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/modules/cores/shadcn/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/modules/cores/shadcn/components/ui/dialog";

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export function ProfileEditor({
  initial,
  cities,
  today,
}: {
  initial: CandidateProfile;
  cities: string[];
  today: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientHydrated,
    serverHydrated,
  );
  const workspace = useWorkspace();
  const [profile, setProfile] = useState(workspace.profile ?? initial);
  const [saved, setSaved] = useState(workspace.profile ?? initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { cv, avatar } = workspace;
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [reading, setReading] = useState<Record<string, boolean>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const cvInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const reads = useRef({ cv: 0, avatar: 0 });
  const localCvUrl = useFileUrl(cv);
  const localAvatarUrl = useFileUrl(avatar);
  const cvUrl = localCvUrl ?? workspace.cvUrl;
  const avatarUrl = localAvatarUrl ?? workspace.avatarUrl;
  const completion = profileCompletion(saved, !!cvUrl, !!avatarUrl);
  const form = useRef<HTMLFormElement>(null);
  const closePreview = useRef<HTMLButtonElement>(null);
  useLayoutEffect(
    () => () => {
      setPreviewOpen(false);
    },
    [],
  );
  useEffect(
    () => () => {
      reads.current.cv++;
      reads.current.avatar++;
      setReading({});
    },
    [],
  );

  function update<K extends keyof CandidateProfile>(
    field: K,
    value: CandidateProfile[K],
  ) {
    setProfile((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function selectFile(
    kind: "cv" | "avatar",
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const generation = ++reads.current[kind];
    setReading((state) => ({ ...state, [kind]: true }));
    try {
      const error = await (kind === "cv"
        ? validateCv(file)
        : validateAvatar(file));
      if (generation !== reads.current[kind]) return;
      setFileErrors((state) => ({ ...state, [kind]: error ?? "" }));
      if (!error) {
        await workspace.uploadFile(kind, file);
        if (workspace.isApi)
          toast.success(
            kind === "cv"
              ? "Đã tải CV lên tài khoản."
              : "Đã cập nhật ảnh đại diện.",
          );
      }
    } catch (error) {
      if (generation === reads.current[kind])
        setFileErrors((state) => ({
          ...state,
          [kind]:
            error instanceof Error
              ? error.message
              : "Không đọc được tệp. Vui lòng chọn lại.",
        }));
    } finally {
      if (generation === reads.current[kind])
        setReading((state) => ({ ...state, [kind]: false }));
    }
  }

  const avatarDisplay = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt="Ảnh đại diện đã chọn"
      width={80}
      height={80}
      unoptimized
    />
  ) : (
    <UserRound aria-hidden="true" />
  );
  const field = (
    key:
      | "name"
      | "phone"
      | "title"
      | "address"
      | "linkedin"
      | "github"
      | "portfolio",
    label: string,
    type = "text",
    maxLength = 100,
  ) => (
    <Field data-invalid={!!errors[key]}>
      <FieldLabel htmlFor={`profile-${key}`}>{label}</FieldLabel>
      <Input
        id={`profile-${key}`}
        name={key}
        type={type}
        value={profile[key]}
        maxLength={maxLength}
        onChange={(event) => update(key, event.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `profile-${key}-error` : undefined}
      />
      {errors[key] && (
        <FieldError id={`profile-${key}-error`}>{errors[key]}</FieldError>
      )}
    </Field>
  );

  return (
    <WorkspaceFrame section="profile" name={saved.name}>
      <form
        ref={form}
        className="cu-content"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          const nextErrors = workspace.isApi
            ? validateProfile(profile, today, workspace.skills ?? [], 50, 2000)
            : validateProfile(profile, today);
          setErrors(nextErrors);
          if (Object.keys(nextErrors).length) {
            requestAnimationFrame(() =>
              form.current
                ?.querySelector<HTMLElement>('[aria-invalid="true"]')
                ?.focus(),
            );
            return;
          }
          const next = { ...profile, name: profile.name.trim() };
          try {
            const result = await workspace.saveProfile(next);
            setSaved(result);
            setProfile(result);
            toast.success(
              workspace.isApi
                ? "Đã lưu hồ sơ vào tài khoản."
                : "Đã áp dụng cho bản xem trước. Thông tin chưa được lưu vào tài khoản.",
            );
          } catch (error) {
            if (error instanceof ApiError) {
              const fields = Object.fromEntries(
                Object.entries(error.errors).map(([key, values]) => [
                  key === "skills"
                    ? "skill_ids"
                    : key.replace("social_links.", ""),
                  values[0] ?? "",
                ]),
              );
              setErrors(fields);
              requestAnimationFrame(() =>
                form.current
                  ?.querySelector<HTMLElement>('[aria-invalid="true"]')
                  ?.focus(),
              );
            }
            toast.error(
              error instanceof Error ? error.message : "Không thể lưu hồ sơ.",
            );
          }
        }}
      >
        <fieldset className="contents" disabled={workspace.pending.profile}>
          <legend className="sr-only">Hồ sơ ứng viên</legend>
          <section
            className="cu-card cu-profile-header"
            aria-labelledby="profile-heading"
          >
            <span className="cu-avatar">{avatarDisplay}</span>
            <div>
              <h1 id="profile-heading">{saved.name}</h1>
              <p>
                {saved.title || "Chưa có chức danh"} · {saved.experience_years}{" "}
                năm kinh nghiệm
              </p>
              <div className="cu-profile-info">
                <span>
                  <Mail aria-hidden="true" />
                  {saved.email}
                </span>
                <span>
                  <MapPin aria-hidden="true" />
                  {saved.city || "Chưa chọn địa điểm"}
                </span>
              </div>
            </div>
            <a className="cu-link" href="#profile-info">
              <Pencil aria-hidden="true" />
              Cập nhật hồ sơ
            </a>
          </section>
          <section className="cu-card">
            <h2>Công việc mong muốn</h2>
            <dl className="cu-data">
              <dt>Nghề nghiệp</dt>
              <dd>{saved.title || "Chưa cập nhật"}</dd>
              <dt>Nơi làm việc</dt>
              <dd>{saved.city || "Chưa cập nhật"}</dd>
            </dl>
          </section>
          <section
            className="cu-card"
            id="attached-cv"
            aria-labelledby="cv-title"
          >
            <nav className="cu-tabs" aria-label="Các phần hồ sơ">
              <a href="#profile-info">Hồ sơ cá nhân</a>
              <a href="#attached-cv" aria-current="location">
                CV đính kèm
              </a>
            </nav>
            <div className="cu-cv">
              <FileText className="cu-cv-document" aria-hidden="true" />
              <div className="cu-cv-actions">
                <h2 id="cv-title">CV ứng tuyển của bạn</h2>
                <p className="cu-muted">CV định dạng PDF, tối đa 5 MB.</p>
                <Field>
                  <FieldLabel htmlFor="profile-cv">Chọn CV PDF</FieldLabel>
                  {hydrated && (
                    <Input
                      ref={cvInput}
                      id="profile-cv"
                      className="hidden"
                      tabIndex={-1}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(event) => void selectFile("cv", event)}
                      aria-invalid={!!fileErrors.cv}
                      aria-describedby={
                        workspace.isApi ? "cv-error" : "cv-description cv-error"
                      }
                    />
                  )}
                  <div className="cu-file-picker">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        !hydrated || !!reading.cv || workspace.pending.cv
                      }
                      onClick={() => cvInput.current?.click()}
                    >
                      <Upload aria-hidden="true" />
                      Chọn tệp PDF
                    </Button>
                    <span>
                      {cv
                        ? cv.name
                        : workspace.cvUrl
                          ? "CV đã tải lên.pdf"
                          : "Chưa chọn CV"}
                    </span>
                  </div>
                  {!workspace.isApi && (
                    <FieldDescription id="cv-description">
                      Tệp chỉ được xem trên thiết bị, chưa được tải lên.
                    </FieldDescription>
                  )}
                  <FieldError id="cv-error">{fileErrors.cv}</FieldError>
                </Field>
                {reading.cv && <p role="status">Đang đọc tệp…</p>}
                {cv && (
                  <strong className="cu-file-name">
                    {cv.name} ·{" "}
                    {(cv.size / 1024).toLocaleString("vi-VN", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    KB
                  </strong>
                )}
                <div className="cu-actions">
                  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" disabled={!cvUrl}>
                        <Eye />
                        Xem trước CV
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="cv-preview-dialog"
                      showCloseButton={false}
                      onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        closePreview.current?.focus({ preventScroll: true });
                      }}
                    >
                      <DialogClose asChild>
                        <Button
                          ref={closePreview}
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2"
                          aria-label="Đóng xem trước CV"
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </DialogClose>
                      <DialogHeader>
                        <DialogTitle>Xem trước CV</DialogTitle>
                        <DialogDescription>{cv?.name}</DialogDescription>
                      </DialogHeader>
                      {cvUrl && (
                        <iframe
                          src={cvUrl}
                          title="Nội dung CV PDF"
                          referrerPolicy="no-referrer"
                          tabIndex={-1}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  {cvUrl ? (
                    <Button asChild variant="outline">
                      <a href={cvUrl} download={cv?.name}>
                        <Download />
                        Tải CV xuống
                      </a>
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" disabled>
                      <Download />
                      Tải CV xuống
                    </Button>
                  )}
                  {(cv || workspace.cvUrl) && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={workspace.pending.cv}
                      onClick={async () => {
                        reads.current.cv++;
                        setReading((state) => ({ ...state, cv: false }));
                        setPreviewOpen(false);
                        try {
                          await workspace.deleteFile("cv");
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Không thể xóa CV.",
                          );
                        }
                        setFileErrors((state) => ({ ...state, cv: "" }));
                      }}
                    >
                      <Trash2 />
                      Xóa CV
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
          <section className="cu-card">
            <h2>Hoàn chỉnh hồ sơ</h2>
            <div className="cu-progress-heading">
              <span>Thông tin đã bổ sung</span>
              <strong>{completion}%</strong>
            </div>
            <div
              className="cu-progress"
              role="progressbar"
              aria-label="Độ hoàn thiện hồ sơ"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
            >
              <span style={{ width: `${completion}%` }} />
            </div>
            <div className="cu-chips">
              <a href="#profile-info">Thông tin cơ bản</a>
              <a href="#career-goal">Mục tiêu nghề nghiệp</a>
              <a href="#experience">Kinh nghiệm</a>
              <a href="#attached-cv">CV đính kèm</a>
            </div>
          </section>
          <section className="cu-card" id="career-goal">
            <h2>Mục tiêu nghề nghiệp</h2>
            <Field>
              <FieldLabel htmlFor="profile-bio">
                Giới thiệu & định hướng công việc
              </FieldLabel>
              <Textarea
                id="profile-bio"
                name="bio"
                value={profile.bio}
                maxLength={workspace.isApi ? 2000 : 5000}
                rows={4}
                placeholder="Kinh nghiệm, thế mạnh và công việc bạn đang tìm kiếm"
                onChange={(event) => update("bio", event.target.value)}
              />
              <FieldDescription>
                {profile.bio.length}/{workspace.isApi ? "2.000" : "5.000"} ký tự
              </FieldDescription>
            </Field>
          </section>
          <section className="cu-card" id="experience">
            <h2>Kinh nghiệm làm việc</h2>
            <p className="cu-muted">
              Quá trình làm việc chi tiết được trình bày trong CV đính kèm.
            </p>
            <Field
              className="cu-short-field"
              data-invalid={!!errors.experience_years}
            >
              <FieldLabel htmlFor="profile-experience">
                Số năm kinh nghiệm
              </FieldLabel>
              <Input
                id="profile-experience"
                name="experience_years"
                type="number"
                min={0}
                max={workspace.isApi ? 50 : 80}
                step={1}
                value={
                  Number.isNaN(profile.experience_years)
                    ? ""
                    : profile.experience_years
                }
                onChange={(event) =>
                  update(
                    "experience_years",
                    event.target.value === ""
                      ? NaN
                      : Number(event.target.value),
                  )
                }
                aria-invalid={!!errors.experience_years}
                aria-describedby={
                  errors.experience_years
                    ? "profile-experience-error"
                    : undefined
                }
              />
              <FieldError id="profile-experience-error">
                {errors.experience_years}
              </FieldError>
            </Field>
          </section>
          <section className="cu-card" id="education">
            <h2>Học vấn</h2>
            <p className="cu-muted">
              Bổ sung chuyên ngành, bằng cấp và chứng chỉ trong CV PDF.
            </p>
            <a className="cu-link" href="#attached-cv">
              <Upload aria-hidden="true" />
              Cập nhật CV đính kèm
            </a>
          </section>
          <section className="cu-card" id="skills">
            <h2>Kỹ năng chuyên môn</h2>
            <p className="cu-muted">
              Chọn tối đa 10 kỹ năng phù hợp với chuyên môn của bạn.{" "}
              <strong aria-live="polite">{profile.skill_ids.length}/10</strong>
            </p>
            <fieldset className="cu-skills">
              <legend className="sr-only">Kỹ năng chuyên môn</legend>
              {(workspace.isApi
                ? (workspace.skills ?? [])
                : PROFILE_SKILLS
              ).map((skill) => {
                const checked = profile.skill_ids.includes(skill.id);
                return (
                  <label key={skill.id} data-selected={checked}>
                    <Checkbox
                      checked={checked}
                      disabled={
                        !checked &&
                        profile.skill_ids.length >= MAX_PROFILE_SKILLS
                      }
                      onCheckedChange={(next) =>
                        update(
                          "skill_ids",
                          next === true
                            ? [...profile.skill_ids, skill.id]
                            : profile.skill_ids.filter((id) => id !== skill.id),
                        )
                      }
                    />
                    <span>{skill.name}</span>
                  </label>
                );
              })}
            </fieldset>
            <FieldError>{errors.skill_ids}</FieldError>
          </section>
          <section className="cu-card" id="profile-info">
            <h2>Thông tin cơ bản</h2>
            <div className="cu-form-grid">
              {field("name", "Họ và tên")}
              <Field>
                <FieldLabel htmlFor="profile-email">Email đăng nhập</FieldLabel>
                <Input
                  id="profile-email"
                  type="email"
                  value={profile.email}
                  readOnly
                />
              </Field>
              {field("phone", "Số điện thoại", "tel", 20)}
              <BirthDateField
                id="profile-dob"
                value={profile.dob}
                today={today}
                disabled={false}
                error={errors.dob}
                onChange={(value) => update("dob", value)}
                onBlur={() => undefined}
              />
              {field("title", "Chức danh mong muốn")}
              <Field>
                <FieldLabel>Tỉnh / Thành phố</FieldLabel>
                <SearchableSelectionField
                  label="Tỉnh / Thành phố"
                  searchLabel="Tìm tỉnh/thành phố"
                  placeholder="Chọn tỉnh/thành phố"
                  name="city"
                  value={profile.city}
                  options={cities.map((city) => ({ value: city, label: city }))}
                  onValueChange={(value) => update("city", value)}
                />
              </Field>
              {field("address", "Địa chỉ", "text", 255)}
              {field("linkedin", "LinkedIn", "url", 500)}
              {field("github", "GitHub", "url", 500)}
              {field("portfolio", "Portfolio", "url", 500)}
              <Field className="cu-field-full">
                <FieldLabel htmlFor="profile-avatar">Ảnh đại diện</FieldLabel>
                {hydrated && (
                  <Input
                    ref={avatarInput}
                    id="profile-avatar"
                    className="hidden"
                    tabIndex={-1}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => void selectFile("avatar", event)}
                    aria-invalid={!!fileErrors.avatar}
                    aria-describedby="avatar-description avatar-error"
                  />
                )}
                <div className="cu-file-picker cu-avatar-picker">
                  <div className="cu-file-actions">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        !hydrated ||
                        !!reading.avatar ||
                        workspace.pending.avatar
                      }
                      onClick={() => avatarInput.current?.click()}
                    >
                      <Upload aria-hidden="true" />
                      Chọn ảnh đại diện
                    </Button>
                    {(avatar || workspace.avatarUrl) && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-fit"
                        disabled={workspace.pending.avatar}
                        onClick={async () => {
                          reads.current.avatar++;
                          setReading((state) => ({ ...state, avatar: false }));
                          try {
                            await workspace.deleteFile("avatar");
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Không thể xóa ảnh.",
                            );
                          }
                          setFileErrors((state) => ({ ...state, avatar: "" }));
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                        Xóa ảnh
                      </Button>
                    )}
                  </div>
                  <span>
                    {avatar
                      ? avatar.name
                      : workspace.avatarUrl
                        ? "Ảnh đại diện đã lưu"
                        : "Chưa chọn ảnh"}
                  </span>
                </div>
                <FieldDescription id="avatar-description">
                  JPEG, PNG hoặc WebP, tối đa 2 MB.
                </FieldDescription>
                <FieldError id="avatar-error">{fileErrors.avatar}</FieldError>
              </Field>
            </div>
            <div className="cu-form-footer">
              <span>
                {workspace.isApi
                  ? "Lưu thay đổi để cập nhật hồ sơ của bạn."
                  : "Bản xem trước · chưa lưu vào tài khoản."}
              </span>
              <Button
                type="submit"
                disabled={
                  !!reading.cv || !!reading.avatar || workspace.pending.profile
                }
              >
                {workspace.pending.profile
                  ? "Đang lưu…"
                  : workspace.isApi
                    ? "Lưu hồ sơ"
                    : "Áp dụng bản xem trước"}
              </Button>
            </div>
          </section>
        </fieldset>
      </form>
    </WorkspaceFrame>
  );
}
