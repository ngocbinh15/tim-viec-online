import { NotFoundContent } from "@/components/feedback/not-found-content";

export default function AccountNotFound() {
  return (
    <main id="main" className="site-container page-content recovery-page">
      <NotFoundContent
        title="Không tìm thấy trang tài khoản"
        href="/account/profile"
        label="Về hồ sơ của bạn"
      />
    </main>
  );
}
