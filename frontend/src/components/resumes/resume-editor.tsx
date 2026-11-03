"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Save,
  Upload,
  Copy,
  Trash2,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/features/api/client";
import { documentFromDetail, resumeFileUrl } from "@/features/resumes/client";
import {
  resumeDocumentSchema,
  validateForExport,
  type ResumeDocument,
} from "@/features/resumes/schema";
import type { ResumeDetail, ResumeExport } from "@/features/resumes/types";
import { ResumeAutosave, type SaveStatus } from "@/features/resumes/autosave";
import { RESUME_TEMPLATES } from "@/features/resumes/templates";
import { ResumeSections } from "./resume-sections";
import { RESUME_STEPS, ResumeStepper, type ResumeStep } from "./resume-stepper";
import { initializeStarterContent } from "@/features/resumes/starter";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import { SelectionField } from "@/components/forms/selection-field";

const Preview = dynamic(
  () => import("./resume-preview").then((module) => module.ResumePreview),
  {
    ssr: false,
    loading: () => (
      <div className="resume-preview-placeholder">Đang tải bản xem trước…</div>
    ),
  },
);
const statusLabels: Record<SaveStatus, string> = {
  saved: "Đã lưu",
  dirty: "Có thay đổi chưa lưu",
  saving: "Đang lưu…",
  error: "Lưu thất bại",
  conflict: "Có xung đột phiên bản",
};
export function ResumeEditor({
  id,
  connected,
}: {
  id: number;
  connected: boolean;
}) {
  const [initial, setInitial] = useState<{
    detail: ResumeDetail;
    document: ResumeDocument;
  } | null>(null);
  const [error, setError] = useState("");
  const loadedId = useRef<number | null>(null);
  useEffect(() => {
    if (!connected || loadedId.current === id) return;
    let active = true;
    apiRequest<ResumeDetail>(`/candidate/resumes/${id}`)
      .then(async (result) => {
        let document = documentFromDetail(result.data);
        if (
          result.data.capabilities.edit &&
          !document.settings.starter_version
        ) {
          try {
            const templates = await apiRequest<unknown>(
              "/candidate/resume-templates",
            );
            document = initializeStarterContent(
              document,
              resumeDocumentSchema.parse(templates.sample_document),
            );
          } catch {
            // An unavailable starter must not prevent opening an existing CV.
          }
        }
        if (active) {
          loadedId.current = id;
          setInitial({ detail: result.data, document });
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, connected]);
  if (!connected)
    return <p className="resume-notice">Trình tạo CV cần kết nối API.</p>;
  if (error)
    return (
      <p role="alert" className="resume-error">
        {error}
      </p>
    );
  if (!initial)
    return (
      <div className="resume-skeleton" aria-label="Đang mở CV" aria-busy="true">
        <div />
        <div />
        <div />
      </div>
    );
  return (
    <Editor
      key={initial.detail.id}
      initial={initial.detail}
      initialDocument={initial.document}
    />
  );
}
function Editor({
  initial,
  initialDocument,
}: {
  initial: ResumeDetail;
  initialDocument: ResumeDocument;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState(initialDocument);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(initial.revision);
  const [tab, setTab] = useState("content");
  const [step, setStep] = useState<ResumeStep>("theme");
  const stepIndex = RESUME_STEPS.findIndex((item) => item.key === step);
  const activeStep = RESUME_STEPS[stepIndex];
  const [exported, setExported] = useState<ResumeExport | null>(
    initial.latest_export,
  );
  const [pollExpired, setPollExpired] = useState(false);
  const engine = useRef<ResumeAutosave<ResumeDocument> | null>(null);
  const baseline = useRef({ initial, initialDocument });
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    const { initial, initialDocument } = baseline.current;
    if (!engine.current) {
      engine.current = new ResumeAutosave<ResumeDocument>(
        initial.revision,
        async (value, base_revision, signal) => {
          const parsed = resumeDocumentSchema.safeParse(value);
          if (!parsed.success)
            throw new Error(
              parsed.error.issues[0]?.message || "Kiểm tra nội dung CV.",
            );
          const result = await apiRequest<ResumeDetail>(
            `/candidate/resumes/${initial.id}`,
            {
              method: "PUT",
              body: JSON.stringify({ ...parsed.data, base_revision }),
              signal,
            },
          );
          if (signal.aborted) throw new Error("Phiên chỉnh sửa đã đóng.");
          return result.data.revision;
        },
        (state, failure) => {
          if (!active.current) return;
          setRevision(engine.current!.revision);
          setStatus(state);
          if (failure) setError((failure as Error).message);
          else setError("");
        },
      );
      if (
        JSON.stringify(initialDocument) !==
        JSON.stringify(documentFromDetail(initial))
      )
        engine.current.change(initialDocument);
    }
    const saver = engine.current;
    setRevision(saver.revision);
    setStatus(saver.status);
    setError(saver.error instanceof Error ? saver.error.message : "");
    const warn = (event: BeforeUnloadEvent) => {
      if (saver.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      // Next keeps editor state in Activity while hiding its effects. Keep the
      // draft and revision together, and finish pending saves when leaving.
      active.current = false;
      if (saver.dirty && saver.status !== "conflict")
        void saver.flush().catch(() => {});
      window.removeEventListener("beforeunload", warn);
    };
  }, []);
  function change(value: ResumeDocument) {
    setDoc(value);
    engine.current?.change(value);
  }
  async function save() {
    try {
      await engine.current?.flush();
      toast.success("Đã lưu CV.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function copyDirty() {
    setBusy(true);
    try {
      const created = await apiRequest<ResumeDetail>("/candidate/resumes", {
        method: "POST",
        body: JSON.stringify({
          name: `${doc.name.slice(0, 105)} (bản sao)`,
          template_key: doc.template_key,
          prefill_from_profile: false,
        }),
      });
      const copy = structuredClone(doc);
      copy.name = created.data.name;
      copy.content.basics.photo_asset_id = null;
      if (doc.content.basics.photo_asset_id) {
        const image = await fetch(
          resumeFileUrl(
            `/api/candidate/resumes/${initial.id}/assets/${doc.content.basics.photo_asset_id}`,
          ),
          { cache: "no-store" },
        );
        if (!image.ok)
          throw new Error(
            "Không thể sao chép ảnh CV. Bản nháp mới đã được giữ để bạn tiếp tục.",
          );
        const body = new FormData();
        body.set("image", await image.blob(), "photo.png");
        const asset = await apiRequest<{ id: number }>(
          `/candidate/resumes/${created.data.id}/assets`,
          { method: "POST", body },
        );
        copy.content.basics.photo_asset_id = asset.data.id;
      }
      await apiRequest(`/candidate/resumes/${created.data.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...copy, base_revision: 1 }),
      });
      router.push(`/account/resumes/${created.data.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function exportPdf() {
    setBusy(true);
    setError("");
    try {
      validateForExport(doc);
      const current = await engine.current!.flush();
      const result = await apiRequest<ResumeExport>(
        `/candidate/resumes/${initial.id}/exports`,
        { method: "POST", body: JSON.stringify({ revision: current }) },
      );
      setExported(result.data);
      setPollExpired(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function checkExport() {
    if (!exported) return;
    try {
      const result = await apiRequest<ResumeExport>(
        `/candidate/resume-exports/${exported.id}`,
      );
      setExported(result.data);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const exportId = exported?.id;
  const exportStatus = exported?.status;
  useEffect(() => {
    if (
      !exportId ||
      !exportStatus ||
      !["pending", "processing"].includes(exportStatus)
    )
      return;
    const controller = new AbortController();
    const started = Date.now();
    const id = exportId;
    const timer = setInterval(() => {
      if (Date.now() - started > 60000) {
        setPollExpired(true);
        clearInterval(timer);
        return;
      }
      if (document.visibilityState !== "visible") return;
      apiRequest<ResumeExport>(`/candidate/resume-exports/${id}`, {
        signal: controller.signal,
      })
        .then((result) => setExported(result.data))
        .catch(() => {});
    }, 2000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [exportId, exportStatus]);
  async function upload(file: File | undefined) {
    if (!file) return;
    if (
      file.size > 2097152 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Chọn ảnh JPEG, PNG hoặc WebP tối đa 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set("image", file);
      const result = await apiRequest<{ id: number }>(
        `/candidate/resumes/${initial.id}/assets`,
        { method: "POST", body },
      );
      change({
        ...doc,
        content: {
          ...doc.content,
          basics: { ...doc.content.basics, photo_asset_id: result.data.id },
        },
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const basics = doc.content.basics;
  function navigateStep(next: ResumeStep) {
    setStep(next);
    setTab("content");
  }
  function basic(key: string, value: string) {
    change({
      ...doc,
      content: { ...doc.content, basics: { ...basics, [key]: value } },
    });
  }
  return (
    <section className="resume-editor" data-tab={tab}>
      <header className="resume-editor-toolbar">
        <Link
          href="/account/resumes"
          onClick={(event) => {
            if (
              engine.current?.dirty &&
              !window.confirm("CV còn thay đổi chưa lưu. Bạn muốn rời trang?")
            )
              event.preventDefault();
          }}
          aria-label="Về CV của tôi"
        >
          <ArrowLeft size={20} />
        </Link>
        <label className="resume-name">
          <span className="sr-only">Tên CV</span>
          <Input
            value={doc.name}
            maxLength={120}
            disabled={busy || !initial.capabilities.edit}
            onChange={(e) => change({ ...doc, name: e.target.value })}
          />
        </label>
        <span role="status" className="resume-save-status" data-status={status}>
          {statusLabels[status]}
        </span>
        <Button
          variant="outline"
          disabled={busy || !initial.capabilities.edit || status === "conflict"}
          onClick={save}
        >
          <Save size={16} />
          Lưu ngay
        </Button>
        <Button
          disabled={busy || !initial.capabilities.edit || status === "conflict"}
          onClick={() => navigateStep("export")}
        >
          <Download size={16} />
          {busy ? "Đang xử lý…" : "Xuất PDF"}
        </Button>
      </header>
      <div className="resume-builder-intro">
        <h1>Chỉnh sửa CV</h1>
        <p>Chỉnh sửa từng mục và xem trước CV.</p>
      </div>
      {error && (
        <p role="alert" className="resume-error">
          {error}
        </p>
      )}
      {status === "conflict" && (
        <div className="resume-notice">
          <p>
            Nội dung đang sửa được giữ ở đây. Tải phiên bản mới sẽ bỏ thay đổi
            chưa lưu.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tải phiên bản mới
          </Button>
          <Button onClick={copyDirty} disabled={busy}>
            <Copy size={16} />
            Lưu thành CV mới
          </Button>
        </div>
      )}
      {exported && (
        <div className="resume-export-status" role="status">
          <span>
            PDF phiên bản {exported.revision}
            {exported.revision !== revision
              ? " · Có nội dung mới hơn"
              : ""}:{" "}
            {exported.status === "ready"
              ? `${exported.page_count} trang, sẵn sàng`
              : exported.status === "failed"
                ? "Xuất thất bại. Kiểm tra nội dung và thử xuất lại."
                : "Đang tạo PDF…"}
          </span>
          {exported.file_url && (
            <div className="resume-export-actions">
              <Button asChild variant="outline" size="sm">
                <a
                  href={resumeFileUrl(exported.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} /> Xem PDF
                </a>
              </Button>
              <Button asChild size="sm">
                <a
                  href={resumeFileUrl(exported.file_url)}
                  download={exported.file_name || "CV.pdf"}
                >
                  <Download size={16} /> Tải PDF
                </a>
              </Button>
            </div>
          )}
          {pollExpired && (
            <Button variant="outline" onClick={checkExport}>
              Kiểm tra lại
            </Button>
          )}
        </div>
      )}
      <div
        className="resume-mobile-tabs"
        role="tablist"
        aria-label="Chế độ chỉnh sửa"
      >
        <button
          role="tab"
          aria-selected={tab === "content"}
          onClick={() => setTab("content")}
        >
          Nội dung
        </button>
        <button
          role="tab"
          aria-selected={tab === "preview"}
          onClick={() => setTab("preview")}
        >
          Xem trước
        </button>
      </div>
      <div className="resume-editor-grid">
        <div className="resume-wizard">
          <ResumeStepper active={step} onChange={navigateStep} />
          <fieldset
            className="resume-editor-fields resume-wizard-fields"
            disabled={!initial.capabilities.edit || busy}
          >
            <legend className="sr-only">Nội dung CV</legend>
            <section
              className="resume-section-editor resume-theme-step"
              hidden={step !== "theme"}
            >
              <h2>Giao diện CV</h2>
              <p className="resume-step-description">
                Chọn mẫu, màu sắc và cỡ chữ.
              </p>
              <div className="resume-form-row">
                <div className="resume-setting">
                  <span>Mẫu CV</span>
                  <SelectionField
                    label="Mẫu CV"
                    placeholder="Chọn mẫu CV"
                    name="template_key"
                    clearable={false}
                    disabled={busy || !initial.capabilities.edit}
                    value={doc.template_key}
                    options={RESUME_TEMPLATES.map((template) => ({
                      value: template.key,
                      label: template.label,
                    }))}
                    onValueChange={(value) =>
                      change({
                        ...doc,
                        template_key: value as ResumeDocument["template_key"],
                      })
                    }
                  />
                </div>
                <fieldset className="resume-accent-field">
                  <legend>Màu nhấn</legend>
                  <div>
                    {(
                      [
                        ["blue", "Xanh biển"],
                        ["teal", "Xanh ngọc"],
                        ["slate", "Xám xanh"],
                      ] as const
                    ).map(([color, label]) => (
                      <label
                        key={color}
                        className="resume-color-option"
                        title={label}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="accent"
                          value={color}
                          aria-label={label}
                          checked={doc.settings.accent === color}
                          onChange={() =>
                            change({
                              ...doc,
                              settings: { ...doc.settings, accent: color },
                            })
                          }
                        />
                        <span data-color={color}>
                          {doc.settings.accent === color && (
                            <Check size={18} aria-hidden="true" />
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="resume-setting">
                  <span>Cỡ chữ</span>
                  <SelectionField
                    label="Cỡ chữ"
                    placeholder="Chọn cỡ chữ"
                    name="font_size"
                    clearable={false}
                    disabled={busy || !initial.capabilities.edit}
                    value={doc.settings.font_size}
                    options={[
                      { value: "small", label: "Nhỏ" },
                      { value: "normal", label: "Vừa" },
                      { value: "large", label: "Lớn" },
                    ]}
                    onValueChange={(value) =>
                      change({
                        ...doc,
                        settings: {
                          ...doc.settings,
                          font_size:
                            value as ResumeDocument["settings"]["font_size"],
                        },
                      })
                    }
                  />
                </div>
                <div className="resume-setting">
                  <span>Giãn dòng</span>
                  <SelectionField
                    label="Giãn dòng"
                    placeholder="Chọn giãn dòng"
                    name="line_spacing"
                    clearable={false}
                    disabled={busy || !initial.capabilities.edit}
                    value={doc.settings.line_spacing}
                    options={[
                      { value: "normal", label: "Thoáng" },
                      { value: "compact", label: "Gọn" },
                    ]}
                    onValueChange={(value) =>
                      change({
                        ...doc,
                        settings: {
                          ...doc.settings,
                          line_spacing:
                            value as ResumeDocument["settings"]["line_spacing"],
                        },
                      })
                    }
                  />
                </div>
              </div>
            </section>
            <section
              className="resume-section-editor resume-personal-step"
              hidden={step !== "personal"}
            >
              <h2>Thông tin cá nhân</h2>
              {Object.entries({
                full_name: "Họ và tên",
                headline: "Chức danh / vị trí mong muốn",
                email: "Email",
                phone: "Số điện thoại",
                city: "Địa điểm",
              }).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <Input
                    type={key === "email" ? "email" : "text"}
                    value={basics[key as keyof typeof basics] as string}
                    maxLength={
                      key === "full_name"
                        ? 120
                        : key === "email"
                          ? 254
                          : key === "phone"
                            ? 30
                            : 150
                    }
                    onChange={(e) => basic(key, e.target.value)}
                  />
                </label>
              ))}
              <label>
                Giới thiệu / mục tiêu nghề nghiệp
                <Textarea
                  rows={4}
                  maxLength={2000}
                  value={basics.summary}
                  onChange={(e) => basic("summary", e.target.value)}
                />
              </label>
              <div className="resume-photo-tools">
                <label className="resume-upload">
                  <Upload size={16} />
                  Ảnh CV
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      void upload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {basics.photo_asset_id && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      change({
                        ...doc,
                        content: {
                          ...doc.content,
                          basics: { ...basics, photo_asset_id: null },
                        },
                      })
                    }
                  >
                    <Trash2 size={16} />
                    Bỏ ảnh khỏi CV
                  </Button>
                )}
                <small>JPEG, PNG, WebP · tối đa 2 MB</small>
              </div>
              {basics.links.map((link, index) => (
                <div key={link.id} className="resume-link-entry">
                  <label>
                    Nhãn liên kết
                    <Input
                      value={link.label}
                      maxLength={100}
                      onChange={(e) => {
                        const next = structuredClone(doc);
                        next.content.basics.links[index].label = e.target.value;
                        change(next);
                      }}
                    />
                  </label>
                  <label>
                    URL
                    <Input
                      type="url"
                      value={link.url}
                      maxLength={1000}
                      onChange={(e) => {
                        const next = structuredClone(doc);
                        next.content.basics.links[index].url = e.target.value;
                        change(next);
                      }}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    aria-label="Xóa liên kết"
                    onClick={() =>
                      change({
                        ...doc,
                        content: {
                          ...doc.content,
                          basics: {
                            ...basics,
                            links: basics.links.filter(
                              (item) => item.id !== link.id,
                            ),
                          },
                        },
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                disabled={basics.links.length >= 10}
                onClick={() =>
                  change({
                    ...doc,
                    content: {
                      ...doc.content,
                      basics: {
                        ...basics,
                        links: [
                          ...basics.links,
                          { id: crypto.randomUUID(), label: "", url: "" },
                        ],
                      },
                    },
                  })
                }
              >
                Thêm liên kết
              </Button>
            </section>
            <ResumeSections
              document={doc}
              onChange={change}
              sections={activeStep.sections}
              wizard
            />
            <section
              className="resume-section-editor resume-export-step"
              hidden={step !== "export"}
            >
              <CheckCircle2 size={42} aria-hidden="true" />
              <h2>Xuất CV</h2>
              <p>Kiểm tra bản xem trước rồi tạo PDF để tải xuống.</p>
              <div className="resume-export-summary">
                <span>
                  Mẫu CV
                  <strong>
                    {
                      RESUME_TEMPLATES.find(
                        (item) => item.key === doc.template_key,
                      )?.label
                    }
                  </strong>
                </span>
                <span>
                  Nội dung
                  <strong>
                    {
                      doc.settings.section_order.filter(
                        (key) =>
                          !doc.settings.hidden_sections.includes(key) &&
                          doc.content[key].length,
                      ).length
                    }{" "}
                    mục đang hiển thị
                  </strong>
                </span>
              </div>
              <Button
                type="button"
                disabled={
                  busy || status === "conflict" || !initial.capabilities.edit
                }
                onClick={exportPdf}
              >
                <Download size={18} aria-hidden="true" />
                {busy ? "Đang xử lý…" : "Tạo bản PDF"}
              </Button>
              {exported?.file_url && (
                <Button asChild variant="outline">
                  <a
                    href={resumeFileUrl(exported.file_url)}
                    download={exported.file_name || "CV.pdf"}
                  >
                    <Download aria-hidden="true" />
                    Tải PDF đã xuất
                  </a>
                </Button>
              )}
            </section>
          </fieldset>
          <footer className="resume-step-actions">
            <Button
              type="button"
              variant="outline"
              disabled={stepIndex === 0}
              onClick={() => navigateStep(RESUME_STEPS[stepIndex - 1].key)}
            >
              <ArrowLeft aria-hidden="true" /> Quay lại
            </Button>
            <span>
              Bước {stepIndex + 1} / {RESUME_STEPS.length}
            </span>
            {stepIndex < RESUME_STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => navigateStep(RESUME_STEPS[stepIndex + 1].key)}
              >
                Tiếp theo <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigateStep("theme")}
              >
                Về giao diện <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </footer>
        </div>
        <Preview document={doc} resumeId={initial.id} />
      </div>
    </section>
  );
}
