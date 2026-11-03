"use client";

import { useCallback, useId, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BellOff,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  FileUser,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { AuthUser } from "@/features/auth/types";
import { normalizeSearch } from "@/features/jobs/query";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { useOptionalWorkspace } from "@/components/candidate/workspace-provider";
import { CandidateNotificationList } from "./candidate-notification-list";
import { logoutAction } from "@/app/(auth)/actions";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/cores/shadcn/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/cores/shadcn/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/modules/cores/shadcn/components/ui/sheet";

type Props = {
  user?: AuthUser;
  sessionUnavailable?: boolean;
  pendingSession?: boolean;
  categories?: { id: number; name: string }[];
};

export function HeaderControls({
  user,
  sessionUnavailable = false,
  pendingSession = false,
  categories,
}: Props) {
  const [categoriesOpen, setCategoriesOpenState] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const setCategoriesOpen = useCallback((open: boolean) => {
    setCategoriesOpenState(open);
    setCategorySearch("");
  }, []);
  const categorySearchId = useId();
  const visibleCategories = categories?.filter((category) =>
    normalizeSearch(category.name).includes(normalizeSearch(categorySearch)),
  );
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  // Cached pages are hidden by Activity. Dismiss portals before they outlive
  // their header and keep the new page inert or scroll-locked.
  useLayoutEffect(
    () => () => {
      setCategoriesOpen(false);
      setNotificationsOpen(false);
      setAccountOpen(false);
    },
    [pathname, setCategoriesOpen],
  );
  const workspace = useOptionalWorkspace();
  const candidateNotifications = user?.role === "candidate" && !!workspace;
  const unread = candidateNotifications
    ? workspace.notifications.filter((item) => !item.read_at).length
    : 0;
  const logoutId = useId();
  const employerUrl =
    user?.role === "employer" ? "/employer" : "/login?role=employer";
  const unavailable = () => {
    setCategoriesOpen(false);
    toast.info("Chức năng này hiện chưa khả dụng. Vui lòng thử lại sau.");
  };
  const personalItem = (label: string) =>
    user?.role === "candidate" ? (
      <Link
        href={
          label === "Việc đã lưu"
            ? "/account/jobs?tab=saved"
            : label === "Việc đã ứng tuyển"
              ? "/account/jobs"
              : "/account/notifications"
        }
        onClick={() => setCategoriesOpen(false)}
      >
        {label}
      </Link>
    ) : user?.role === "employer" ? (
      <Link
        href={
          label === "Việc đã lưu"
            ? "/employer/jobs"
            : label === "Việc đã ứng tuyển"
              ? "/employer/candidates"
              : "/employer/notifications"
        }
        onClick={() => setCategoriesOpen(false)}
      >
        {label === "Việc đã lưu"
          ? "Tin tuyển dụng"
          : label === "Việc đã ứng tuyển"
            ? "Hồ sơ ứng viên"
            : label}
      </Link>
    ) : user ? (
      <button type="button" onClick={unavailable}>
        {label}
      </button>
    ) : (
      <Link href="/login" onClick={() => setCategoriesOpen(false)}>
        {label}
      </Link>
    );
  return (
    <nav
      className="header-actions"
      aria-label="Điều hướng chính"
      aria-busy={pendingSession}
    >
      <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="header-pill header-categories"
            aria-label="Tất cả danh mục"
            disabled={pendingSession}
          >
            <Menu size={15} aria-hidden="true" />
            <span>Tất cả danh mục</span>
            <ChevronDown
              className="header-chevron"
              size={13}
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        {/* Mount after the trigger so Popper retains this custom reference. */}
        <PopoverAnchor asChild>
          <span className="header-mega-anchor" aria-hidden="true" />
        </PopoverAnchor>
        <PopoverContent
          className="header-mega"
          align="center"
          sideOffset={8}
          collisionPadding={0}
          aria-label="Tất cả danh mục"
        >
          <div>
            <h2>Việc làm</h2>
            <Link
              href="/jobs?sort=newest"
              onClick={() => setCategoriesOpen(false)}
            >
              Việc làm mới nhất
            </Link>
            <Link href="/jobs" onClick={() => setCategoriesOpen(false)}>
              Tìm việc làm
            </Link>
            <Link
              href="/jobs?level=Manager"
              onClick={() => setCategoriesOpen(false)}
            >
              Việc làm quản lý
            </Link>
          </div>
          <div>
            <h2>
              {user?.role === "employer"
                ? "Tuyển dụng của tôi"
                : "Việc của tôi"}
            </h2>
            {personalItem("Việc đã lưu")}
            {personalItem("Việc đã ứng tuyển")}
            {personalItem("Thông báo")}
          </div>
          <div>
            <h2>Công ty</h2>
            <Link
              href="/companies"
              onClick={() => setCategoriesOpen(false)}
            >
              Khám phá doanh nghiệp
            </Link>
          </div>
          {categories ? (
            <div className="header-mega-categories">
              <h2>Ngành nghề tuyển dụng</h2>
              <div className="header-category-search">
                <Search size={14} aria-hidden="true" />
                <label className="sr-only" htmlFor={categorySearchId}>
                  Tìm ngành nghề
                </label>
                <Input
                  id={categorySearchId}
                  value={categorySearch}
                  placeholder="Tìm ngành nghề…"
                  maxLength={100}
                  autoComplete="off"
                  aria-controls={`${categorySearchId}-results`}
                  onChange={(event) => setCategorySearch(event.target.value)}
                />
              </div>
              <div
                id={`${categorySearchId}-results`}
                className="header-category-results"
              >
                {visibleCategories?.map((category) => (
                  <Link
                    key={category.id}
                    href={`/jobs?category_ids=${category.id}`}
                    onClick={() => setCategoriesOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))}
                {!visibleCategories?.length && (
                  <p className="header-category-empty" role="status">
                    Không tìm thấy ngành nghề phù hợp.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h2>TimViecOnline inTECH</h2>
              <Link
                href="/jobs?category_ids=1"
                onClick={() => setCategoriesOpen(false)}
              >
                IT Jobs
              </Link>
              <Link
                href="/jobs?category_ids=1"
                onClick={() => setCategoriesOpen(false)}
              >
                IT Hub
              </Link>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {!pendingSession && user?.role !== "candidate" && (
        <Link className="header-pill header-employer" href={employerUrl}>
          Dành cho Nhà tuyển dụng
        </Link>
      )}
      <div className="header-account-group">
        <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="header-circle"
              aria-label="Trung tâm thông báo"
              aria-describedby={unread ? `${logoutId}-unread` : undefined}
              disabled={pendingSession}
            >
              <Bell size={15} aria-hidden="true" />
              {!!unread && (
                <span className="header-unread-count" aria-hidden="true">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
              {!!unread && (
                <span id={`${logoutId}-unread`} className="sr-only">
                  {unread} thông báo chưa đọc
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent
            className="header-notifications"
            showCloseButton={false}
          >
            <SheetHeader className="header-notification-heading">
              <span className="notification-heading-icon">
                <Bell size={20} aria-hidden="true" />
              </span>
              <div>
                <SheetTitle>Thông báo</SheetTitle>
                <SheetDescription>
                  Phản hồi ứng tuyển & tin nhắn
                </SheetDescription>
              </div>
              <SheetClose
                className="notification-close"
                aria-label="Đóng thông báo"
              >
                <X size={20} aria-hidden="true" />
              </SheetClose>
            </SheetHeader>
            {candidateNotifications ? (
              <CandidateNotificationList />
            ) : (
              <div className="notification-empty">
                <BellOff size={56} aria-hidden="true" />
                <h2>
                  {user
                    ? "Hiện chưa thể tải thông báo"
                    : "Đăng nhập để xem thông báo"}
                </h2>
                <p>
                  {user
                    ? "Vui lòng thử lại sau."
                    : "Theo dõi phản hồi ứng tuyển và thông báo từ nhà tuyển dụng."}
                </p>
                {!user && (
                  <SheetClose asChild>
                    <Link className="notification-login" href="/login">
                      Đăng nhập
                    </Link>
                  </SheetClose>
                )}
                {user?.role === "candidate" && (
                  <SheetClose asChild>
                    <Link
                      className="notification-login"
                      href="/account/notifications"
                    >
                      Xem thông báo của tôi
                    </Link>
                  </SheetClose>
                )}
                {user?.role === "employer" && (
                  <SheetClose asChild>
                    <Link
                      className="notification-login"
                      href="/employer/notifications"
                    >
                      Xem thông báo tuyển dụng
                    </Link>
                  </SheetClose>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
        <DropdownMenu
          modal={false}
          open={accountOpen}
          onOpenChange={setAccountOpen}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`header-circle${!user && !pendingSession ? " header-login" : ""}`}
              aria-label="Tài khoản cá nhân"
              disabled={pendingSession}
            >
              <UserRound size={15} aria-hidden="true" />
              {!user && !pendingSession && <span>Đăng nhập</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="header-account"
            align="end"
            sideOffset={12}
            collisionPadding={16}
          >
            <div className="header-account-info">
              <strong>{user?.name ?? "Chào mừng đến TimViecOnline"}</strong>
              <span>
                {sessionUnavailable
                  ? "Chưa xác minh được phiên đăng nhập."
                  : (user?.email ?? "Đăng nhập để quản lý tài khoản.")}
              </span>
            </div>
            {user ? (
              <>
                {user.role !== "candidate" && (
                  <DropdownMenuItem asChild>
                    <Link
                      href={user.role === "employer" ? "/employer" : "/admin"}
                    >
                      <BriefcaseBusiness />
                      {user.role === "employer"
                        ? "Quản lý tuyển dụng"
                        : "Quản trị"}
                    </Link>
                  </DropdownMenuItem>
                )}
                {user.role === "candidate" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/account/profile">
                        <FileUser />
                        Hồ Sơ Của Tôi
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/resumes">
                        <FileText />
                        CV của tôi
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/jobs">
                        <BriefcaseBusiness />
                        Việc Làm Của Tôi
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/messages">
                        <MessageSquare />
                        Tin Nhắn
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/notifications">
                        <Bell />
                        Thông Báo
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link
                    href={
                      user.role === "candidate"
                        ? "/account/settings"
                        : "/account/security"
                    }
                  >
                    <Settings />
                    Quản Lý Tài Khoản
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() =>
                    (
                      document.getElementById(
                        logoutId,
                      ) as HTMLFormElement | null
                    )?.requestSubmit()
                  }
                >
                  <LogOut />
                  Đăng xuất
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/login">
                    <LogIn />
                    Đăng nhập
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/register">
                    <UserRound />
                    Đăng ký tài khoản
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login?role=employer">
                    <BriefcaseBusiness />
                    Dành cho nhà tuyển dụng
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {user && <form id={logoutId} action={logoutAction} hidden />}
    </nav>
  );
}
