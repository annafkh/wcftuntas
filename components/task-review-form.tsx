"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import type { Task } from "@/lib/types";

export function TaskReviewForm({ task }: { task: Task }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [supervisorNote, setSupervisorNote] = useState(task.supervisorNote ?? "");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const isLocked = task.status === "selesai";

  async function submit(decision: "approve" | "revise" | "under_review") {
    setError("");

    setIsPending(true);
    const response = await fetch(`/api/tasks/${task.id}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        decision,
        supervisorNote,
      }),
    });

    setIsPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal memproses review.";
      setError(message);
      showToast({ title: "Review Gagal Diproses", description: message, variant: "error" });
      return;
    }

    showToast({
      title:
        decision === "approve"
          ? "Tugas Berhasil Disetujui"
          : decision === "revise"
            ? "Status Belum Sesuai Berhasil Dikirim"
            : "Tugas Ditandai Sedang Direview",
      description: "Status tugas sudah diperbarui.",
      variant: "success",
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
          Approval pengawas
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">Review hasil kerja</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Keterangan pengawas bersifat opsional saat mengubah status tugas.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Keterangan pengawas</span>
        <textarea
          value={supervisorNote}
          onChange={(event) => setSupervisorNote(event.target.value)}
          rows={4}
          disabled={isLocked}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
        />
      </label>

      {isLocked ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Tugas ini sudah difinalkan admin sebagai selesai dan tidak bisa direview ulang.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => submit("under_review")}
          disabled={isPending || isLocked}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
        >
          Tandai sedang direview
        </button>
        <button
          type="button"
          onClick={() => submit("approve")}
          disabled={isPending || isLocked}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
        >
          Setujui Tugas
        </button>
        <button
          type="button"
          onClick={() => submit("revise")}
          disabled={isPending || isLocked}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60 sm:w-auto"
        >
          Belum Sesuai
        </button>
      </div>
    </section>
  );
}
