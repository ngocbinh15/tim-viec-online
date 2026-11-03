"use client";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  SquarePen,
  UserRound,
  Users,
} from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { CompanyLogo } from "./company-logo";
import { EMPLOYER_PAGES } from "@/features/employer/types";
import { useEmployer } from "./employer-provider";
import { logoutAction } from "@/app/(auth)/actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/modules/cores/shadcn/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/cores/shadcn/components/ui/dropdown-menu";
const icons = [
  LayoutDashboard,
  BriefcaseBusiness,
  Users,
  MessageSquare,
  Bell,
  Building2,
  SquarePen,
];

const EmployerShellContext = createContext(false);
export const useInEmployerShell = () => useContext(EmployerShellContext);

export function EmployerShell({ children }: { children: ReactNode }) {
  const { company, user, notifications, apiMode, loadError, refresh } =
    useEmployer();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  // Browser history can change a route without selecting a navigation item.
  // Also dismiss portals when App Router hides the workspace with Activity.
  useLayoutEffect(
    () => () => {
      setMobileOpen(false);
      setAccountOpen(false);
    },
    [pathname],
  );
  const logoutId = useId();
  const unreadId = useId();
  const unread = notifications.filter((item) => !item.read_at).length;
  const current =
    EMPLOYER_PAGES.find(
      (page) =>
        page.href === pathname ||
        (page.key === "candidates" && pathname.startsWith(`${page.href}/`)),
    ) ?? EMPLOYER_PAGES[1];
  const candidateDetail = pathname.startsWith("/employer/candidates/");
  const nav = (
    <>
      <p className="ep-nav-label">Không gian tuyển dụng</p>
      <nav className="ep-nav" aria-label="Điều hướng nhà tuyển dụng">
        {EMPLOYER_PAGES.map((item, index) => {
          const Icon = icons[index];
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={current.key === item.key ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="ep-icon" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
  return (
    <div className="employer-page">
      <header className="ep-header">
        <div className="ep-header-left">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="ep-icon-button ep-mobile-menu"
                aria-label="Mở điều hướng nhà tuyển dụng"
              >
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="ep-mobile-sheet">
              <SheetHeader>
                <SheetTitle>Không gian tuyển dụng</SheetTitle>
                <SheetDescription>{company.name}</SheetDescription>
              </SheetHeader>
              {nav}
            </SheetContent>
          </Sheet>
          <Brand />
          <span className="ep-header-divider" />
          <span className="ep-header-label">Dành cho nhà tuyển dụng</span>
        </div>
        <div className="ep-header-right">
          <Link href="/" className="ep-public-link">
            Trang chủ
            <ArrowUpRight size={15} />
          </Link>
          <Link
            className="ep-icon-button"
            href="/employer/messages"
            aria-label="Tin nhắn ứng viên"
          >
            <MessageSquare size={18} />
          </Link>
          <Link
            className="ep-icon-button"
            href="/employer/notifications"
            aria-label="Thông báo tuyển dụng"
            aria-describedby={unread ? unreadId : undefined}
          >
            <Bell size={18} />
            {unread > 0 && (
              <>
                <span className="ep-unread-count" aria-hidden="true">
                  {unread > 99 ? "99+" : unread}
                </span>
                <span id={unreadId} className="sr-only">
                  {unread} thông báo chưa đọc
                </span>
              </>
            )}
          </Link>
          <DropdownMenu
            modal={false}
            open={accountOpen}
            onOpenChange={setAccountOpen}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ep-header-account"
                aria-label="Tài khoản cá nhân"
              >
                <span className="ep-avatar">
                  <UserRound size={18} />
                </span>
                <span>
                  <strong>{company.name}</strong>
                  <small>Tài khoản nhà tuyển dụng</small>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="header-account"
              align="end"
              sideOffset={12}
              collisionPadding={16}
            >
              <div className="header-account-info">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/employer/company">
                  <Building2 />
                  Hồ sơ công ty
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/security">
                  <Settings />
                  Bảo mật tài khoản
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() =>
                  (
                    document.getElementById(logoutId) as HTMLFormElement | null
                  )?.requestSubmit()
                }
              >
                <LogOut />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="ep-layout">
        <aside className="ep-sidebar">
          {nav}
          <div className="ep-sidebar-bottom">
            <CompanyLogo company={company} />
            <p>
              <strong>{company.name}</strong>
              <br />
              Cùng xây dựng đội ngũ của bạn.
            </p>
            <button type="submit" form={logoutId}>
              <LogOut size={15} />
              Đăng xuất
            </button>
          </div>
        </aside>
        <main id="main" className="ep-main">
          <div className="ep-breadcrumb">
            <House className="ep-icon" aria-hidden="true" />
            Nhà tuyển dụng<span>/</span>
            {candidateDetail ? (
              <>
                <Link href="/employer/candidates">Hồ sơ ứng viên</Link>
                <span>/</span>
                <span>Chi tiết hồ sơ ứng tuyển</span>
              </>
            ) : (
              <span>
                {pathname.endsWith("/edit")
                  ? "Chỉnh sửa tin tuyển dụng"
                  : current.label}
              </span>
            )}
          </div>
          <div className="ep-content-slot">
            <EmployerShellContext.Provider value>
              {loadError && (
                <div role="alert" className="ep-panel">
                  <p>{loadError}</p>
                  <button
                    type="button"
                    className="ep-button"
                    onClick={() => void refresh()}
                  >
                    Thử lại
                  </button>
                </div>
              )}
              {children}
            </EmployerShellContext.Provider>
          </div>
          <p className="ep-preview-note">
            {apiMode
              ? "Dữ liệu được đồng bộ với hệ thống tuyển dụng."
              : "Dữ liệu mẫu · Thay đổi chỉ giữ trong phiên xem trước. Tin nhắn chưa gửi đến ứng viên."}
          </p>
        </main>
      </div>
      <form id={logoutId} action={logoutAction} hidden />
    </div>
  );
}
