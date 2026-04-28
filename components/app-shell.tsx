"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  History,
  LayoutDashboard,
  Menu,
  MapPinned,
  PlusSquare,
  Users,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { NotificationMenu } from "@/components/notification-menu";
import { ProfileMenu } from "@/components/profile-menu";
import { Button } from "@/components/ui/primitives";
import type { Notification, SessionPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["pt_wcf", "karyawan", "pengawas"],
  },
  {
    href: "/calendar",
    label: "Kalender dan Aktivitas Harian",
    icon: CalendarDays,
    roles: ["pt_wcf", "karyawan", "pengawas"],
  },
  {
    href: "/approval",
    label: "Monitoring Tugas",
    icon: ClipboardCheck,
    roles: ["pt_wcf", "pengawas"],
  },
  {
    href: "/master",
    label: "Master Manajemen",
    icon: PlusSquare,
    roles: ["pt_wcf", "karyawan", "pengawas"],
    children: [
      {
        href: "/master-areas",
        label: "Master Area",
        icon: MapPinned,
        roles: ["pt_wcf"],
      },
      {
        href: "/tasks/new",
        label: "Master Tugas",
        icon: PlusSquare,
        roles: ["pt_wcf"],
      },
      {
        href: "/tasks",
        label: "Master Shift",
        icon: ClipboardList,
        roles: ["pt_wcf", "karyawan", "pengawas"],
      },
    ],
  },
  { href: "/users", label: "Pengguna", icon: Users, roles: ["pt_wcf"] },
  { href: "/partners", label: "Master Mitra", icon: Building2, roles: ["pt_wcf"] },
  { href: "/history", label: "Log", icon: History, roles: ["pt_wcf"] },
] satisfies {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: SessionPayload["role"][];
  children?: {
    href: string;
    label: string;
    icon: LucideIcon;
    roles: SessionPayload["role"][];
  }[];
}[];

export function AppShell({
  session,
  notifications,
  approvalPendingCount,
  children,
}: {
  session: SessionPayload;
  notifications: Notification[];
  approvalPendingCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMasterMenuOpen, setIsMasterMenuOpen] = useState(
    pathname.startsWith("/tasks") || pathname.startsWith("/master-areas"),
  );
  const items = navigation
    .filter((item) => item.roles.includes(session.role))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => child.roles.includes(session.role)),
    }));

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-900">
      <div className="grid min-h-screen grid-cols-1 overflow-x-hidden lg:grid-cols-[240px_minmax(0,1fr)]">
        {isSidebarOpen ? (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[82vw] max-w-[272px] -translate-x-full flex-col border-r border-slate-200 bg-white px-4 pb-5 pt-4 transition-transform duration-200 lg:static lg:min-h-screen lg:w-auto lg:max-w-none lg:translate-x-0 lg:pt-0",
            isSidebarOpen && "translate-x-0",
          )}
        >
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4 lg:min-h-[88px] lg:pb-0">
            <div className="overflow-hidden rounded-lg bg-white">
              <Image
                src="/PT WCF.png"
                alt="Logo PT WCF"
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
                priority
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                PT WCF
              </p>
              <h1 className="text-base font-semibold text-slate-950">WCF Tuntas</h1>
            </div>
          </div>

          <div className="mt-6 space-y-3 lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Account
            </p>
            <ProfileMenu session={session} fullWidth menuClassName="w-full" />
          </div>

          <nav className="mt-5 space-y-1" aria-label="Navigasi utama">
            {items.map((item) => {
              const hasChildren = Boolean(item.children?.length);
              const isActive = hasChildren
                ? item.children?.some((child) => pathname === child.href)
                : pathname === item.href;

              if (hasChildren) {
                return (
                  <div key={item.href} className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setIsMasterMenuOpen((current) => !current)}
                      className={cn(
                        "group flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-[14px] font-medium transition",
                        isActive
                          ? "bg-sky-50 text-sky-800"
                          : "text-slate-800 hover:bg-slate-100 hover:text-slate-950",
                      )}
                      aria-expanded={isMasterMenuOpen}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon
                          className={cn(
                            "h-4 w-4 transition",
                            isActive ? "text-sky-700" : "text-slate-500 group-hover:text-slate-700",
                          )}
                          strokeWidth={2}
                        />
                        {item.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition",
                          isMasterMenuOpen ? "rotate-180" : "",
                        )}
                      />
                    </button>

                    {isMasterMenuOpen ? (
                      <div className="space-y-1 pl-3">
                        {item.children?.map((child) => {
                          const childActive = pathname === child.href;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setIsSidebarOpen(false)}
                              className={cn(
                                "group flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition",
                                childActive
                                  ? "bg-sky-50 text-sky-800"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                              )}
                            >
                              <child.icon
                                className={cn(
                                  "h-[0.95rem] w-[0.95rem] transition",
                                  childActive ? "text-sky-700" : "text-slate-500 group-hover:text-slate-700",
                                )}
                                strokeWidth={2}
                              />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "group flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-[14px] font-medium transition",
                    isActive
                      ? "bg-sky-50 text-sky-800"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        "h-4 w-4 transition",
                        isActive ? "text-sky-700" : "text-slate-500 group-hover:text-slate-700",
                      )}
                      strokeWidth={2}
                    />
                    {item.label}
                  </span>
                  {item.href === "/approval" ? (
                    <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">
                      {approvalPendingCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 overflow-x-hidden bg-slate-100">
          <header className="border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 lg:min-h-[88px] lg:py-0">
            <div className="lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="secondary" size="icon" onClick={() => setIsSidebarOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>

                <div className="min-w-0 flex-1 px-1">
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                    PT WCF
                  </p>
                  <p className="truncate text-base font-semibold text-slate-950">Wish Care Fast</p>
                </div>
                <NotificationMenu notifications={notifications} />
              </div>
            </div>

            <div className="hidden items-center justify-between gap-4 lg:flex lg:min-h-[88px]">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  PT WCF
                </p>
                <h2 className="mt-1 text-[1.55rem] font-semibold tracking-tight text-slate-950">
                  Wish Care Fast
                </h2>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <NotificationMenu notifications={notifications} />
                <ProfileMenu session={session} />
              </div>
            </div>
          </header>
          <main className="min-w-0 overflow-x-hidden space-y-4 px-4 py-4 sm:px-6 sm:py-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
