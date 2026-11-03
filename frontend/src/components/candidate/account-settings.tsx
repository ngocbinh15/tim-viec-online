"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Switch } from "@/modules/cores/shadcn/components/ui/switch";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Field, FieldLabel } from "@/modules/cores/shadcn/components/ui/field";
import { useWorkspace } from "./workspace-provider";
import { WorkspaceFrame } from "./workspace-frame";
import { WorkspaceTitle } from "./workspace-ui";

export function AccountSettings() {
  const state = useWorkspace();
  const { loadEmailPrefs } = state;
  useEffect(() => {
    void loadEmailPrefs();
  }, [loadEmailPrefs]);
  const emailBusy =
    state.emailPrefsLoading || Boolean(state.pending["email-preferences"]);
  const needsVerification = state.isApi && !state.emailVerifiedAt;
  const emailDisabled = emailBusy || !state.emailPrefsReady;
  return (
    <WorkspaceFrame section="settings">
      <WorkspaceTitle title="Quản lý tài khoản" />
      <section className="cu-card">
        <h2>Email đăng nhập & mật khẩu</h2>
        <p className="cu-muted">
          Email truy cập hiện tại: <strong>{state.profile.email}</strong>
        </p>
        <div className="cu-actions">
          <Link href="#account-info" className="cu-link">
            Thông tin tài khoản
          </Link>
          <Link href="#account-password" className="cu-link">
            Thay đổi mật khẩu
          </Link>
        </div>
      </section>
      <section className="cu-card" aria-busy={emailBusy}>
        <h2>Cài đặt thông báo qua email</h2>
        <p className="cu-muted">
          {state.isApi
            ? "Bật những email bạn muốn nhận. Thông báo trên web vẫn hoạt động khi tắt email."
            : "Các lựa chọn chỉ lưu trong phiên xem trước; chưa đăng ký gửi email."}
        </p>
        {needsVerification && (
          <p className="cu-muted">
            Xác thực email trước khi bật thông báo.{" "}
            <Link
              href={`/verify-email?${new URLSearchParams({ email: state.profile.email })}`}
              className="cu-link"
            >
              Xác thực email
            </Link>
          </p>
        )}
        {state.emailPrefsLoading && (
          <p role="status">Đang tải cài đặt email…</p>
        )}
        {state.emailPrefsError && (
          <p role="alert">
            {state.emailPrefsError}{" "}
            {!state.emailPrefsReady && (
              <button
                type="button"
                className="cu-link"
                onClick={() => void loadEmailPrefs()}
                disabled={emailBusy}
              >
                Thử lại
              </button>
            )}
          </p>
        )}
        {state.pending["email-preferences"] && (
          <p role="status">Đang lưu cài đặt email…</p>
        )}
        {state.emailPrefsSaved && !emailBusy && (
          <p role="status">Đã lưu cài đặt email.</p>
        )}
        <div className="cu-preference">
          <label htmlFor="email-applications">
            <strong>Trạng thái ứng tuyển</strong>
            <span>Thông tin khi nhà tuyển dụng cập nhật kết quả hồ sơ.</span>
          </label>
          <Switch
            id="email-applications"
            disabled={
              emailDisabled ||
              (needsVerification && !state.emailPrefs.applications)
            }
            checked={state.emailPrefs.applications}
            onCheckedChange={(applications) =>
              void state.updateEmailPreference("applications", applications)
            }
          />
        </div>
        <div className="cu-preference">
          <label htmlFor="email-messages">
            <strong>Tin nhắn mới</strong>
            <span>Thông tin về trao đổi mới từ nhà tuyển dụng.</span>
          </label>
          <Switch
            id="email-messages"
            disabled={
              emailDisabled || (needsVerification && !state.emailPrefs.messages)
            }
            checked={state.emailPrefs.messages}
            onCheckedChange={(messages) =>
              void state.updateEmailPreference("messages", messages)
            }
          />
        </div>
      </section>
      <section className="cu-card" id="account-info">
        <h2>Thông tin tài khoản</h2>
        <div className="cu-form-grid">
          <Field>
            <FieldLabel htmlFor="account-name">Họ và tên</FieldLabel>
            <Input id="account-name" value={state.profile.name} readOnly />
          </Field>
          <Field>
            <FieldLabel htmlFor="account-email">Email đăng nhập</FieldLabel>
            <Input
              id="account-email"
              type="email"
              value={state.profile.email}
              readOnly
            />
          </Field>
        </div>
        <div className="cu-form-footer">
          <span>Chỉnh sửa thông tin cá nhân tại trang hồ sơ.</span>
          <Link className="cu-link" href="/account/profile#profile-info">
            Cập nhật hồ sơ
          </Link>
        </div>
      </section>
      <section className="cu-card" id="account-password">
        <h2>Thay đổi mật khẩu</h2>
        <p className="cu-muted">
          Xác thực mật khẩu hiện tại và chọn mật khẩu mới cho tài khoản.
        </p>
        <Link href="/account/security" className="cu-link">
          Đổi mật khẩu
        </Link>
      </section>
    </WorkspaceFrame>
  );
}
