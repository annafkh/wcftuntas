"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/primitives";
import type { Notification } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function NotificationMenu({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [locallyReadIds, setLocallyReadIds] = useState<string[]>([]);
  const [markAllRead, setMarkAllRead] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const items = notifications.map((item) => ({
    ...item,
    readAt:
      markAllRead || item.readAt || locallyReadIds.includes(item.id)
        ? item.readAt ?? new Date().toISOString()
        : null,
  }));
  const unreadCount = items.filter((item) => !item.readAt).length;

  function getNotificationHref(notification: Notification) {
    switch (notification.title) {
      case "Hasil pekerjaan menunggu peninjauan":
        return "/approval";
      case "Akun telah dibuat":
        return "/dashboard";
      case "Tugas baru diterima":
      case "Tugas shift baru diterima":
      case "Task take over diterima":
      case "Status tugas diperbarui":
        return "/tasks";
      default:
        return "/dashboard";
    }
  }

  async function handleMarkAll() {
    if (unreadCount === 0 || isMarkingAll) {
      return;
    }

    setIsMarkingAll(true);
    const response = await fetch("/api/notifications", {
      method: "POST",
    });
    setIsMarkingAll(false);

    if (!response.ok) {
      return;
    }

    setMarkAllRead(true);
    router.refresh();
  }

  async function handleOpenNotification(notification: Notification) {
    if (openingId) {
      return;
    }

    setOpeningId(notification.id);

    if (!notification.readAt) {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
      });

      if (response.ok) {
        setLocallyReadIds((current) =>
          current.includes(notification.id) ? current : [...current, notification.id],
        );
      }
    }

    router.push(getNotificationHref(notification));
    router.refresh();
    setOpeningId(null);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
          aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-md bg-sky-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">
                Notifications
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-950">Status Task Terbaru</h3>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="text-xs"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || isMarkingAll}
            >
              <CheckCheck className="h-4 w-4" />
              {isMarkingAll ? "Memproses..." : "Mark All"}
            </Button>
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="rounded-lg px-4 py-8 text-center text-sm text-slate-600">
              Belum ada notifikasi.
            </div>
          ) : (
            items.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleOpenNotification(notification)}
                disabled={openingId === notification.id}
                className="block w-full rounded-lg border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50 disabled:opacity-70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                    <p className="mt-1 text-[15px] leading-6 text-slate-700">
                      {notification.description}
                    </p>
                  </div>
                  {!notification.readAt ? (
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-sky-700" />
                  ) : null}
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                  {formatDateTime(notification.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
