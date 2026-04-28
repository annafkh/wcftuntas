"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";

export function ChangePasswordForm() {
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError("");
    setIsPending(true);

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
      }),
    });

    setIsPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal memperbarui password.";
      setError(message);
      showToast({ title: "Password gagal diperbarui", description: message, variant: "error" });
      return;
    }

    showToast({
      title: "Password berhasil diperbarui",
      description: "Silakan lanjut ke dashboard.",
      variant: "success",
    });

    window.location.assign("/dashboard");
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Masukkan Password Baru</span>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-600"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-slate-500 transition hover:text-slate-900"
            aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Konfirmasi Password Baru</span>
        <div className="relative">
          <input
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            minLength={8}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-600"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((current) => !current)}
            className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-slate-500 transition hover:text-slate-900"
            aria-label={showConfirmPassword ? "Sembunyikan password" : "Lihat password"}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Menyimpan..." : "Simpan Password Baru"}
      </button>
    </form>
  );
}
