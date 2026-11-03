import type { Metadata } from "next";
import { AdminContent } from "../_components/admin-content";

export const metadata: Metadata = {
  title: "Tài khoản người dùng | Quản trị TimViecOnline",
  robots: { index: false },
};

export default function Page() {
  return <AdminContent section="users" />;
}
