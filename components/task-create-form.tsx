"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { SHIFT_LABELS, type MasterArea, type ShiftType, type User } from "@/lib/types";

export function TaskCreateForm({
  employees,
  areas,
}: {
  employees: User[];
  areas: MasterArea[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const shiftOptions = Object.entries(SHIFT_LABELS) as [ShiftType, string][];

  async function handleSubmit(formData: FormData) {
    setError("");
    setIsPending(true);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        areaId: formData.get("areaId"),
        title: formData.get("title"),
        description: formData.get("description"),
        type: formData.get("type"),
        assignedTo: formData.get("assignedTo"),
        shift: formData.get("shift"),
        dueDate: formData.get("dueDate"),
        taskDate: formData.get("taskDate"),
        status: formData.get("status"),
      }),
    });

    setIsPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal membuat tugas.";
      setError(message);
      showToast({ title: "Tugas Gagal Dibuat", description: message, variant: "error" });
      return;
    }

    showToast({
      title: "Tugas Berhasil Dibuat",
      description: "Penugasan baru sudah tersimpan.",
      variant: "success",
    });

    startTransition(() => {
      router.refresh();
      router.push("/tasks");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Area</span>
          <select
            name="areaId"
            required
            defaultValue={areas[0]?.id ?? ""}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          >
            <option value="" disabled>
              Pilih area
            </option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Judul Tugas</span>
          <input
            name="title"
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Deskripsi</span>
          <textarea
            name="description"
            rows={4}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
            placeholder="Deskripsi opsional"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Jenis Tugas</span>
          <select
            name="type"
            defaultValue="harian"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          >
            <option value="harian">Harian</option>
            <option value="mingguan">Mingguan</option>
            <option value="bulanan">Bulanan</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Tanggal Tugas</span>
          <input
            name="taskDate"
            type="datetime-local"
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Deadline</span>
          <input
            name="dueDate"
            type="datetime-local"
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Shift</span>
          <select
            name="shift"
            defaultValue="pagi"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          >
            {shiftOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Karyawan</span>
          <select
            name="assignedTo"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          >
            {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                {employee.name} - {employee.department}
                </option>
              ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Status awal</span>
          <select
            name="status"
            defaultValue="ditugaskan"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          >
            <option value="draft">Draft</option>
            <option value="ditugaskan">Ditugaskan</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Menyimpan..." : "Simpan Tugas"}
      </button>
    </form>
  );
}
