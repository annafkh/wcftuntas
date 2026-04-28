"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import type { Task } from "@/lib/types";

const MAX_CLIENT_ATTACHMENT_SIZE = 5 * 1024 * 1024;

export function TaskCompletionForm({ task }: { task: Task }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  async function handleSubmit() {
    setError("");

    if (files.length === 0) {
      const message = "Karyawan tidak bisa submit selesai tanpa attachment.";
      setError(message);
      showToast({ title: "Tugas Belum Bisa Dikirim", description: message, variant: "error" });
      return;
    }

    const oversizedFile = files.find((file) => file.size > MAX_CLIENT_ATTACHMENT_SIZE);
    if (oversizedFile) {
      const message = `File "${oversizedFile.name}" melebihi batas 5 MB.`;
      setError(message);
      showToast({ title: "Ukuran File Terlalu Besar", description: message, variant: "error" });
      return;
    }

    setIsPending(true);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("attachments", file);
    });

    const response = await fetch(`/api/tasks/${task.id}/complete`, {
      method: "POST",
      body: formData,
    });

    setIsPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal submit tugas.";
      setError(message);
      showToast({ title: "Tugas Gagal Dikirim", description: message, variant: "error" });
      return;
    }

    showToast({
      title: "Tugas Berhasil Dikirim",
      description: "Hasil pekerjaan telah dikirim untuk direview.",
      variant: "success",
    });

    startTransition(() => {
      router.refresh();
    });
  }

  const isLocked = ["selesai_karyawan", "menunggu_review_pengawas", "disetujui_pengawas", "selesai"].includes(
    task.status,
  );

  return (
    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
          Penyelesaian Tugas
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">Checklist oleh karyawan</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Attachment bukti wajib ada sebelum tugas bisa disubmit. Tugas yang sedang menunggu
          persetujuan atau sudah disetujui pengawas tidak dapat diubah lagi oleh karyawan.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Upload foto / attachment</span>
        <input
          type="file"
          multiple
          disabled={isLocked}
          accept="image/*,.pdf,.doc,.docx"
          onChange={(event) => {
            const nextFiles = Array.from(event.target.files ?? []);
            const oversizedFile = nextFiles.find((file) => file.size > MAX_CLIENT_ATTACHMENT_SIZE);

            if (oversizedFile) {
              const message = `File "${oversizedFile.name}" melebihi batas 5 MB.`;
              setFiles([]);
              setError(message);
              showToast({ title: "Ukuran File Terlalu Besar", description: message, variant: "error" });
              event.target.value = "";
              return;
            }

            setError("");
            setFiles(nextFiles);
          }}
          className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        />
        <span className="text-xs text-slate-500">Maksimal 5 MB per file.</span>
      </label>

      {previews.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {previews.map((preview, index) => (
            <div key={preview} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {files[index]?.type.startsWith("image/") ? (
                <Image
                  src={preview}
                  alt={files[index]?.name ?? "preview"}
                  width={600}
                  height={400}
                  className="h-40 w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-slate-500">
                  Dokumen siap diunggah
                </div>
              )}
              <p className="px-3 py-2 text-xs text-slate-600">{files[index]?.name}</p>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || isLocked}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isPending ? "Mengirim..." : "Checklist selesai dan kirim"}
      </button>
    </section>
  );
}
