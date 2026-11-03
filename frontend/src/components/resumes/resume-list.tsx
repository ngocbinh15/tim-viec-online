"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FilePlus2,
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  FileText,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/features/api/client";
import { fetchResumes, resumeFileUrl } from "@/features/resumes/client";
import { RESUME_TEMPLATES } from "@/features/resumes/templates";
import type { ResumeDetail, ResumeList } from "@/features/resumes/types";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Pagination } from "@/components/layout/pagination";
import { ResumeThumbnail } from "./resume-thumbnail";
import type { ResumeThumbnailRenderer } from "@/features/resumes/thumbnail-renderer";
import classicCover from "../../../public/resume-templates/classic.png";
import modernCover from "../../../public/resume-templates/modern.png";
import minimalCover from "../../../public/resume-templates/minimal.png";
import executiveCover from "../../../public/resume-templates/executive.png";
import elegantCover from "../../../public/resume-templates/elegant.png";
import technicalCover from "../../../public/resume-templates/technical.png";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/modules/cores/shadcn/components/ui/alert-dialog";

const templateCovers = {
  classic: classicCover,
  modern: modernCover,
  minimal: minimalCover,
  executive: executiveCover,
  elegant: elegantCover,
  technical: technicalCover,
};

export function ResumeLibrary({
  connected,
  create = false,
}: {
  connected: boolean;
  create?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<ResumeList | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("CV của tôi");
  const [selected, setSelected] = useState("classic");
  const [prefill, setPrefill] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const deletePending = useRef(false);
  const deleted = useRef(false);
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);
  const libraryHeading = useRef<HTMLHeadingElement>(null);
  // Close the portal when App Router hides this page during navigation.
  useLayoutEffect(() => () => setDeleteTarget(null), []);
  const thumbnailRenderer = useRef<Promise<ResumeThumbnailRenderer> | null>(
    null,
  );
  const renderThumbnail = useCallback(
    async (id: number, signal: AbortSignal) => {
      signal.throwIfAborted();
      thumbnailRenderer.current ??=
        import("@/features/resumes/thumbnail-renderer").then(
          ({ ResumeThumbnailRenderer }) => new ResumeThumbnailRenderer(),
        );
      const renderer = await thumbnailRenderer.current;
      signal.throwIfAborted();
      return renderer.render(id, signal);
    },
    [],
  );
  useEffect(
    () => () => {
      const renderer = thumbnailRenderer.current;
      thumbnailRenderer.current = null;
      void renderer?.then((instance) => instance.dispose()).catch(() => {});
    },
    [],
  );
  useEffect(() => {
    if (!connected) return;
    let active = true;
    fetchResumes(page)
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [connected, page]);
  async function make() {
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<ResumeDetail>("/candidate/resumes", {
        method: "POST",
        body: JSON.stringify({
          name,
          template_key: selected,
          prefill_from_profile: prefill,
          use_sample_data: true,
        }),
      });
      router.push(`/account/resumes/${response.data.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function remove(id: number) {
    if (deletePending.current) return;
    deletePending.current = true;
    setDeleteError("");
    setError("");
    setBusy(true);
    try {
      await apiRequest(`/candidate/resumes/${id}`, { method: "DELETE" });
      deleted.current = true;
      setDeleteTarget(null);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.filter((item) => item.id !== id),
            }
          : null,
      );
      toast.success("Đã xóa CV.");
      const updated = await fetchResumes(page);
      setData(updated);
      setPage(updated.meta.current_page);
    } catch (e) {
      if (deleted.current) setError((e as Error).message);
      else setDeleteError((e as Error).message);
    } finally {
      deletePending.current = false;
      setBusy(false);
    }
  }
  async function duplicate(id: number, revision: number, title: string) {
    setBusy(true);
    try {
      const response = await apiRequest<ResumeDetail>(
        `/candidate/resumes/${id}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify({
            name: `${title.slice(0, 105)} (bản sao)`,
            base_revision: revision,
          }),
        },
      );
      router.push(`/account/resumes/${response.data.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="resume-library">
      <header className="resume-page-heading">
        <div>
          <h1 ref={libraryHeading} tabIndex={-1}>
            {create ? "Tạo CV" : "CV của tôi"}
          </h1>
          <p>
            {create
              ? "Chọn mẫu CV để chỉnh sửa."
              : "Quản lý, chỉnh sửa và tải CV."}
          </p>
        </div>
        {!create && connected && (
          <Button
            asChild
            className="resume-action-button"
            disabled={!data?.meta.enabled}
          >
            <Link href="/account/resumes/new">
              <FilePlus2 aria-hidden="true" /> Tạo CV mới
            </Link>
          </Button>
        )}
        {create && (
          <Button asChild variant="outline" className="resume-action-button">
            <Link href="/account/resumes">
              <ArrowLeft aria-hidden="true" /> CV của tôi
            </Link>
          </Button>
        )}
      </header>
      {!connected && (
        <p role="status" className="resume-notice">
          Trình tạo CV cần kết nối backend. Vui lòng bật chế độ API để lưu CV
          vào tài khoản.
        </p>
      )}
      {error && (
        <p className="resume-error" role="alert">
          {error}
        </p>
      )}
      {connected && !data && !error && (
        <div
          className="resume-skeleton"
          aria-label="Đang tải CV"
          aria-busy="true"
        >
          <div />
          <div />
          <div />
        </div>
      )}
      {data && !data.meta.enabled && (
        <p className="resume-notice">
          Trình tạo CV đang được bảo trì. Bạn vẫn có thể mở và tải những CV đã
          lưu.
        </p>
      )}
      {create ? (
        <>
          <div className="resume-create-fields">
            <label>
              Tên CV
              <Input
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="resume-check">
              <input
                type="checkbox"
                checked={prefill}
                onChange={(e) => setPrefill(e.target.checked)}
              />
              Điền thông tin từ hồ sơ cá nhân
            </label>
          </div>
          <div
            className="resume-template-grid"
            role="radiogroup"
            aria-label="Mẫu CV"
          >
            {RESUME_TEMPLATES.map((template) => (
              <label
                key={template.key}
                className="resume-template"
                data-selected={selected === template.key}
              >
                <input
                  type="radio"
                  name="template"
                  value={template.key}
                  checked={selected === template.key}
                  onChange={() => setSelected(template.key)}
                />
                <div className="resume-template-art">
                  <Image
                    src={templateCovers[template.key]}
                    alt={`Bố cục mẫu ${template.label}`}
                    sizes="(max-width: 600px) 90vw, (max-width: 900px) 50vw, 33vw"
                  />
                </div>
                <strong>{template.label}</strong>
                <span>{template.description}</span>
              </label>
            ))}
          </div>
          <div className="resume-create-action">
            <Button
              className="resume-action-button"
              aria-busy={busy}
              disabled={
                busy || !connected || !data?.meta.enabled || !name.trim()
              }
              onClick={make}
            >
              {busy ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <FilePlus2 aria-hidden="true" />
              )}
              {busy ? "Đang tạo CV…" : "Sử dụng mẫu này"}
              {!busy && <ArrowRight aria-hidden="true" />}
            </Button>
          </div>
        </>
      ) : (
        <>
          {data?.items.length === 0 && (
            <div className="resume-empty">
              <FileText size={42} />
              <h2>Bạn chưa có CV</h2>
              <p>Chọn mẫu để tạo CV.</p>
              <Button asChild className="resume-action-button">
                <Link href="/account/resumes/new">
                  <FilePlus2 aria-hidden="true" /> Tạo CV đầu tiên
                </Link>
              </Button>
            </div>
          )}
          <div className="resume-document-grid">
            {data?.items.map((item) => (
              <article className="resume-document-card" key={item.id}>
                <Link
                  className="resume-document-cover"
                  href={`/account/resumes/${item.id}/edit`}
                  aria-label={`Chỉnh sửa ${item.name}`}
                >
                  <ResumeThumbnail
                    key={`${item.id}:${item.revision}`}
                    id={item.id}
                    render={renderThumbnail}
                  />
                </Link>
                <div className="resume-document-info">
                  <h2>
                    <Link href={`/account/resumes/${item.id}/edit`}>
                      {item.name}
                    </Link>
                  </h2>
                  <p>
                    Phiên bản {item.revision} ·{" "}
                    {new Date(item.updated_at).toLocaleDateString("vi-VN")}
                  </p>
                  <div className="resume-card-actions">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/account/resumes/${item.id}/edit`}>
                        Chỉnh sửa
                      </Link>
                    </Button>
                    {item.latest_export?.file_url && (
                      <a
                        href={resumeFileUrl(item.latest_export.file_url)}
                        download={item.latest_export.file_name || "CV.pdf"}
                      >
                        Tải PDF v{item.latest_export.revision}
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy || !data.meta.enabled}
                      onClick={() =>
                        duplicate(item.id, item.revision, item.name)
                      }
                      aria-label={`Sao chép ${item.name}`}
                    >
                      <Copy size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy}
                      onClick={(event) => {
                        deleteTrigger.current = event.currentTarget;
                        deleted.current = false;
                        setDeleteError("");
                        setDeleteTarget({ id: item.id, name: item.name });
                      }}
                      aria-label={`Xóa ${item.name}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {data && (
            <Pagination
              page={data.meta.current_page}
              lastPage={data.meta.last_page}
              onPageChange={(next) => {
                setPage(next);
                setData(null);
              }}
            />
          )}
        </>
      )}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deletePending.current) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent
          className="resume-delete-dialog"
          onEscapeKeyDown={(event) => {
            if (deletePending.current) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = deleted.current
              ? libraryHeading.current
              : deleteTrigger.current;
            if (target?.isConnected && target.getClientRects().length)
              target.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Xóa CV này?</AlertDialogTitle>
            <AlertDialogDescription>
              CV <strong>“{deleteTarget?.name}”</strong> sẽ bị xóa khỏi thư
              viện. Hồ sơ đã ứng tuyển vẫn được giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="resume-error" role="alert">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              aria-busy={busy}
              onClick={(event) => {
                event.preventDefault();
                if (deleteTarget) void remove(deleteTarget.id);
              }}
            >
              {busy ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {busy ? "Đang xóa…" : "Xóa CV"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
