"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { SHIFT_LABELS, type MasterArea, type ShiftType, type Task, type User } from "@/lib/types";

function toInputDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function TaskManagementForm({
  task,
  employees,
  areas,
}: {
  task: Task & {
    assignedToUser: User;
    supervisorUser: User | null;
  };
  employees: User[];
  areas: MasterArea[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [areaId, setAreaId] = useState(task.areaId ?? "");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [type, setType] = useState(task.type);
  const [shift, setShift] = useState(task.shift);
  const [taskDate, setTaskDate] = useState(toInputDateTime(task.taskDate));
  const [dueDate, setDueDate] = useState(toInputDateTime(task.dueDate));
  const [assignedTo, setAssignedTo] = useState(task.assignedTo);
  const [status, setStatus] = useState(task.status === "draft" ? "draft" : "ditugaskan");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const shiftOptions = Object.entries(SHIFT_LABELS) as [ShiftType, string][];

  async function handleSave() {
    setError("");
    setIsSaving(true);

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        areaId,
        title,
        description,
        type,
        shift,
        taskDate,
        dueDate,
        assignedTo,
        status,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal memperbarui tugas.";
      setError(message);
      showToast({ title: "Tugas Gagal Diperbarui", description: message, variant: "error" });
      return;
    }

    showToast({ title: "Tugas Berhasil Diperbarui", description: "Perubahan tugas telah disimpan.", variant: "success" });

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!window.confirm("Hapus tugas ini secara permanen?")) {
      return;
    }

    setError("");
    setIsDeleting(true);

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });

    setIsDeleting(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal menghapus tugas.";
      setError(message);
      showToast({ title: "Tugas Gagal Dihapus", description: message, variant: "error" });
      return;
    }

    showToast({ title: "Tugas Berhasil Dihapus", description: "Tugas telah dihapus permanen.", variant: "success" });

    startTransition(() => {
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
          Administrasi Tugas
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">Kelola Penugasan</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Perbarui rincian pekerjaan, PIC, dan status awal sebelum tugas diproses lebih lanjut.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Area</span>
          <select
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
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
          <span className="text-sm font-medium text-slate-700">Judul tugas</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Deskripsi</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Deskripsi opsional"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Jenis Tugas</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as Task["type"])}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          >
            <option value="harian">Harian</option>
            <option value="mingguan">Mingguan</option>
            <option value="bulanan">Bulanan</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Status awal</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "draft" | "ditugaskan")}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          >
            <option value="draft">Draft</option>
            <option value="ditugaskan">Ditugaskan</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Shift</span>
          <select
            value={shift}
            onChange={(event) => setShift(event.target.value as ShiftType)}
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
          <span className="text-sm font-medium text-slate-700">Tanggal tugas</span>
          <input
            type="datetime-local"
            value={taskDate}
            onChange={(event) => setTaskDate(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Batas penyelesaian</span>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Pelaksana</span>
          <select
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} - {employee.department}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">Reviewer Terakhir</span>
          <p className="text-sm text-slate-600">
            {task.supervisorUser ? `${task.supervisorUser.name} - ${task.supervisorUser.department}` : "Belum ada pengawas yang melakukan review."}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isDeleting}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSaving || isDeleting}
          className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
        >
          {isDeleting ? "Menghapus..." : "Hapus Tugas"}
        </button>
      </div>
    </section>
  );
}
