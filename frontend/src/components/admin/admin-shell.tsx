"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  CodeXml,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shapes,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { logoutAction } from "@/app/(auth)/actions";
import { useAdminData } from "./admin-provider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/modules/cores/shadcn/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/cores/shadcn/components/ui/dropdown-menu";
import "./admin.css";

interface AdminShellProps {
  children: ReactNode;
  user: { name: string; email: string };
}

export function AdminShell({ children, user }: AdminShellProps) {
  const { db } = useAdminData();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  // Keep cached pages from retaining a portal or document scroll lock.
  useLayoutEffect(
    () => () => {
      setMobileOpen(false);
      setAccountOpen(false);
    },
    [pathname],
  );
  const logoutForm = useRef<HTMLFormElement>(null);
  const mainId = useId();
  const reportedCount = db.jobs.filter((job) => job.is_reported).length;
  const systemNav = [
    {
      href: "/admin",
      label: "Tổng quan",
      icon: LayoutDashboard,
      active: pathname === "/admin" || pathname === "/admin/preview",
      badge: undefined,
    },
    {
      href: "/admin/jobs",
      label: "Kiểm duyệt tin",
      icon: Flag,
      active: pathname.startsWith("/admin/jobs"),
      badge: reportedCount || undefined,
    },
    {
      href: "/admin/users",
      label: "Tài khoản người dùng",
      icon: Users,
      active: pathname.startsWith("/admin/users"),
      badge: undefined,
    },
  ];
  const catalogNav = [
    { href: "/admin/categories", label: "Ngành nghề", icon: Shapes },
    { href: "/admin/skills", label: "Kỹ năng", icon: CodeXml },
  ];

  const sidebarContent = (
    <>
      <p className="ap-nav-label">Không gian quản trị</p>
      <nav className="ap-nav" aria-label="Vận hành">
        {systemNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="ap-icon" aria-hidden="true" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className="ap-nav-count"
                  aria-label={`${item.badge} tin bị báo cáo`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="ap-nav-divider" />
      <p className="ap-nav-label">Danh mục hệ thống</p>
      <nav className="ap-nav" aria-label="Danh mục">
        {catalogNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="ap-icon" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="ap-sidebar-bottom">
        <span className="ap-sidebar-identity">
          <ShieldCheck className="ap-icon" aria-hidden="true" />
          <strong>Quản trị hệ thống</strong>
        </span>
        <p>Kiểm duyệt minh bạch, giữ môi trường tuyển dụng an toàn.</p>
        <button
          type="button"
          onClick={() => logoutForm.current?.requestSubmit()}
        >
          <LogOut className="ap-icon" aria-hidden="true" />
          Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-page">
      <a href={`#${mainId}`} className="ap-skip">
        Đến nội dung chính
      </a>
      <header className="ap-header">
        <div className="ap-header-left">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="ap-icon-button ap-mobile-menu"
                aria-label="Mở điều hướng quản trị"
              >
                <Menu className="ap-icon" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="ap-mobile-sheet">
              <SheetHeader>
                <SheetTitle>Không gian quản trị</SheetTitle>
                <SheetDescription>{user.name}</SheetDescription>
              </SheetHeader>
              <div className="ap-mobile-navigation">{sidebarContent}</div>
            </SheetContent>
          </Sheet>
          <Brand />
          <span className="ap-header-divider" aria-hidden="true" />
          <span className="ap-header-label">Dành cho quản trị viên</span>
        </div>
        <div className="ap-header-right">
          <Link href="/" className="ap-public-link">
            Trang chủ
            <ArrowUpRight className="ap-icon" aria-hidden="true" />
          </Link>
          <DropdownMenu
            modal={false}
            open={accountOpen}
            onOpenChange={setAccountOpen}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ap-profile"
                aria-label="Xem tài khoản quản trị viên"
              >
                <span className="ap-avatar">
                  <UserRound size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>{user.name}</strong>
                  <small>Tài khoản quản trị viên</small>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={12}
              collisionPadding={16}
              className="header-account"
            >
              <div className="header-account-info">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/account/security">
                  <Settings aria-hidden="true" />
                  Bảo mật tài khoản
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => logoutForm.current?.requestSubmit()}
              >
                <LogOut aria-hidden="true" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="ap-layout">
        <aside className="ap-sidebar" aria-label="Điều hướng quản trị">
          {sidebarContent}
        </aside>
        <main className="ap-main" id={mainId} tabIndex={-1}>
          {children}
        </main>
      </div>
      <form ref={logoutForm} action={logoutAction} hidden />
    </div>
  );
}
