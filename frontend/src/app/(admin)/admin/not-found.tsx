import Link from "next/link";

export default function AdminNotFound() {
  return (
    <section className="surface empty-state">
      <h1>Không tìm thấy nội dung quản trị</h1>
      <p>Nội dung không tồn tại hoặc đã được xóa.</p>
      <Link href="/admin/jobs">Về danh sách tin tuyển dụng</Link>
    </section>
  );
}
