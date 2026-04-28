"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LogOut,
  PencilLine,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { Alert, Button, Field, Input, buttonStyles } from "@/components/ui/primitives";
import { ROLE_LABELS, type SessionPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Profil", icon: UserRound },
  { label: "Ubah Profil", icon: PencilLine },
];

function getRoleDescription(session: SessionPayload) {
  const roleLabel = ROLE_LABELS[session.role];
  const partnerLabel = session.department?.trim();

  if (!partnerLabel || session.role === "pt_wcf") {
    return roleLabel;
  }

  return `${roleLabel} - ${partnerLabel}`;
}

export function ProfileMenu({
  session,
  fullWidth = false,
  menuClassName,
}: {
  session: SessionPayload;
  fullWidth?: boolean;
  menuClassName?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(session.name);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditingProfile(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    showToast({ title: "Berhasil logout", description: "Sesi Anda telah diakhiri.", variant: "success" });

    startTransition(() => {
      router.refresh();
      router.push("/login");
    });
  }

  async function handleProfileSave() {
    setError("");
    setIsSaving(true);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal memperbarui profil.";
      setError(message);
      showToast({ title: "Profil gagal diperbarui", description: message, variant: "error" });
      return;
    }

    setIsEditingProfile(false);
    setIsOpen(false);
    showToast({
      title: "Profil berhasil diperbarui",
      description: "Nama tampilan Anda sudah diperbarui.",
      variant: "success",
    });
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleReturnToAdmin() {
    const response = await fetch("/api/auth/return-to-admin", {
      method: "POST",
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal kembali ke akun admin.";
      showToast({ title: "Kembali ke Admin Gagal", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { redirectTo?: string };
    setIsOpen(false);
    showToast({
      title: "Kembali ke Admin Berhasil",
      description: "Sesi admin telah dipulihkan.",
      variant: "success",
    });
    startTransition(() => {
      router.push(body.redirectTo ?? "/dashboard");
      router.refresh();
    });
  }

  const initials = session.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const roleDescription = getRoleDescription(session);

  return (
    <div ref={containerRef} className={cn("relative", fullWidth && "w-full")}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 transition hover:bg-slate-50",
          fullWidth ? "w-full" : "min-w-[208px]",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
          {initials}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[15px] font-semibold text-slate-950">{session.name}</p>
          <p className="truncate text-sm text-slate-600">{roleDescription}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <div
          className={cn(
            "absolute right-0 top-[calc(100%+12px)] z-50 w-[290px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg",
            fullWidth && "left-0 right-auto w-full",
            menuClassName,
          )}
        >
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200 text-sm font-semibold text-slate-700">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-950">{session.name}</p>
              <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-slate-600">
                {roleDescription}
              </p>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (item.label === "Edit Profile") {
                      setError("");
                      setName(session.name);
                      setIsOpen(false);
                      setIsEditingProfile(true);
                    }
                  }}
                  className="flex w-full items-center gap-3 border-b border-slate-200 bg-white px-4 py-3.5 text-left text-[15px] text-slate-800 transition hover:bg-slate-50 last:border-b-0"
                >
                  <Icon className="h-5 w-5 text-slate-700" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <Button type="button" onClick={handleLogout} className="mt-3 w-full">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>

          {session.impersonatorId ? (
            <Button type="button" variant="secondary" onClick={handleReturnToAdmin} className="mt-2 w-full">
              <ShieldCheck className="h-4 w-4" />
              Kembali ke Admin
            </Button>
          ) : null}
        </div>
      ) : null}

      {isEditingProfile ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-[60] w-[320px] rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-950">Edit Profile</p>
              <p className="mt-1 text-sm text-slate-600">Ubah nama yang tampil di aplikasi.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEditingProfile(false);
                setError("");
                setName(session.name);
              }}
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              Tutup
            </button>
          </div>

          <Field label="Nama lengkap" className="mt-4">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Masukkan nama baru"
            />
          </Field>

          {error ? <Alert className="mt-3">{error}</Alert> : null}

          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditingProfile(false);
                setError("");
                setName(session.name);
              }}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleProfileSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
