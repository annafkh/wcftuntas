"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Check, Eye, Pencil, X } from "lucide-react";
import { ShiftBadge } from "@/components/shift-badge";
import { StatusBadge } from "@/components/status-badge";
import { buttonStyles, Input, Select, TextArea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast-provider";
import {
  SHIFT_LABELS,
  STATUS_LABELS,
  TASK_TYPE_LABELS,
  type MasterArea,
  type ShiftType,
  type Task,
  type TaskStatus,
  type TaskType,
  type User,
} from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type MonitoringTask = Task & {
  assignedToUser: User;
  supervisorUser: User | null;
  attachments: Array<{ id: string }>;
};

type EditState = {
  areaId: string;
  title: string;
  description: string;
  assignedTo: string;
  type: TaskType;
  shift: ShiftType;
  dueDate: string;
  status: TaskStatus;
};

const editableStatuses: TaskStatus[] = [
  "draft",
  "ditugaskan",
  "selesai_karyawan",
  "menunggu_review_pengawas",
  "ditolak_revisi",
  "disetujui_pengawas",
  "selesai",
];

const shiftOptions: ShiftType[] = ["pagi", "middle", "siang", "mingguan", "bulanan"];
const typeOptions: TaskType[] = ["harian", "mingguan", "bulanan"];

function toInputDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function createEditState(task: MonitoringTask): EditState {
  return {
    areaId: task.areaId ?? "",
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo,
    type: task.type,
    shift: task.shift,
    dueDate: toInputDateTime(task.dueDate),
    status: task.status,
  };
}

export function AdminTaskMonitoringTable({
  tasks,
  employees,
  areas,
}: {
  tasks: MonitoringTask[];
  employees: User[];
  areas: MasterArea[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function beginEdit(task: MonitoringTask) {
    if (task.status === "selesai") {
      showToast({
        title: "Tugas Sudah Final",
        description: "Tugas dengan status selesai tidak dapat diubah lagi.",
        variant: "error",
      });
      return;
    }

    setEditingTaskId(task.id);
    setEditState(createEditState(task));
  }

  function cancelEdit() {
    setEditingTaskId(null);
    setEditState(null);
  }

  async function saveEdit(taskId: string) {
    if (!editState) {
      return;
    }

    setIsSaving(true);
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editState),
    });
    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      showToast({
        title: "Tugas Gagal Diperbarui",
        description: body.error ?? "Gagal memperbarui tugas.",
        variant: "error",
      });
      return;
    }

    showToast({
      title: "Tugas Berhasil Diperbarui",
      description: "Perubahan pada monitoring tugas telah disimpan.",
      variant: "success",
    });

    cancelEdit();
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <table className="responsive-table w-full min-w-[1480px] border-separate border-spacing-0">
      <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-600">
        <tr>
          <th className="px-5 py-4 font-semibold first:rounded-tl-lg">Tugas</th>
          <th className="px-5 py-4 font-medium">Area</th>
          <th className="px-5 py-4 font-medium">Karyawan</th>
          <th className="px-5 py-4 font-medium">Jenis</th>
          <th className="px-5 py-4 font-medium">Shift</th>
          <th className="px-5 py-4 font-medium">Status</th>
          <th className="px-5 py-4 font-medium">Deadline</th>
          <th className="px-5 py-4 font-medium">Attachment</th>
          <th className="px-5 py-4 font-medium">Reviewer</th>
          <th className="px-5 py-4 font-medium text-right last:rounded-tr-lg">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => {
          const isEditing = editingTaskId === task.id && editState;

          return (
            <tr key={task.id} className="bg-white transition hover:bg-slate-50">
              <td data-label="Tugas" className="border-b border-slate-100 px-5 py-4 align-top">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={editState.title}
                      onChange={(event) =>
                        setEditState((current) => (current ? { ...current, title: event.target.value } : current))
                      }
                      placeholder="Nama Tugas"
                    />
                    <TextArea
                      value={editState.description}
                      onChange={(event) =>
                        setEditState((current) =>
                          current ? { ...current, description: event.target.value } : current,
                        )
                      }
                      rows={3}
                      placeholder="Deskripsi Opsional"
                      className="min-h-[88px]"
                    />
                  </div>
                ) : (
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{task.title}</p>
                    <p className="mt-1 line-clamp-2 max-w-xl text-sm leading-6 text-slate-600">
                      {task.description || "-"}
                    </p>
                  </div>
                )}
              </td>
              <td data-label="Area" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                {isEditing ? (
                  <Select
                    value={editState.areaId}
                    onChange={(event) =>
                      setEditState((current) => (current ? { ...current, areaId: event.target.value } : current))
                    }
                    className="min-w-44"
                  >
                    <option value="" disabled>
                      Pilih Area
                    </option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  task.area?.name ?? "-"
                )}
              </td>
              <td data-label="Karyawan" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                {isEditing ? (
                  <Select
                    value={editState.assignedTo}
                    onChange={(event) =>
                      setEditState((current) =>
                        current ? { ...current, assignedTo: event.target.value } : current,
                      )
                    }
                    className="min-w-52"
                  >
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  task.assignedToUser.name
                )}
              </td>
              <td data-label="Jenis" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                {isEditing ? (
                  <Select
                    value={editState.type}
                    onChange={(event) =>
                      setEditState((current) =>
                        current ? { ...current, type: event.target.value as TaskType } : current,
                      )
                    }
                    className="min-w-40"
                  >
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>
                        {TASK_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  TASK_TYPE_LABELS[task.type]
                )}
              </td>
              <td data-label="Shift" className="border-b border-slate-100 px-5 py-4 align-top">
                {isEditing ? (
                  <Select
                    value={editState.shift}
                    onChange={(event) =>
                      setEditState((current) =>
                        current ? { ...current, shift: event.target.value as ShiftType } : current,
                      )
                    }
                    className="min-w-36"
                  >
                    {shiftOptions.map((shift) => (
                      <option key={shift} value={shift}>
                        {SHIFT_LABELS[shift]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <ShiftBadge shift={task.shift} className="text-xs" />
                )}
              </td>
              <td data-label="Status" className="border-b border-slate-100 px-5 py-4 align-top">
                {isEditing ? (
                  <Select
                    value={editState.status}
                    onChange={(event) =>
                      setEditState((current) =>
                        current ? { ...current, status: event.target.value as TaskStatus } : current,
                      )
                    }
                    className="min-w-56"
                  >
                    {editableStatuses.map((status) => (
                      <option
                        key={status}
                        value={status}
                        disabled={status === "selesai" && task.status !== "disetujui_pengawas"}
                      >
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <StatusBadge status={task.status} />
                )}
              </td>
              <td data-label="Deadline" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                {isEditing ? (
                  <Input
                    type="datetime-local"
                    value={editState.dueDate}
                    onChange={(event) =>
                      setEditState((current) => (current ? { ...current, dueDate: event.target.value } : current))
                    }
                    className="min-w-52"
                  />
                ) : (
                  formatDateTime(task.dueDate)
                )}
              </td>
              <td data-label="Attachment" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                {task.attachments.length} file
              </td>
              <td data-label="Reviewer" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                {task.supervisorUser?.name ?? "-"}
              </td>
              <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4 align-top">
                <div className="flex items-center justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveEdit(task.id)}
                        disabled={isSaving}
                        className={buttonStyles({
                          variant: "secondary",
                          size: "icon",
                          className: cn(isSaving && "opacity-60"),
                        })}
                        aria-label="Simpan perubahan tugas"
                        title="Simpan"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className={buttonStyles({ variant: "ghost", size: "icon" })}
                        aria-label="Batalkan edit tugas"
                        title="Batal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => beginEdit(task)}
                        disabled={task.status === "selesai"}
                        className={buttonStyles({
                          variant: "secondary",
                          size: "icon",
                          className: cn(task.status === "selesai" && "cursor-not-allowed opacity-50"),
                        })}
                        aria-label="Edit tugas"
                        title={task.status === "selesai" ? "Tugas selesai tidak dapat diubah" : "Edit"}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/tasks/${task.id}`}
                        className={buttonStyles({ variant: "ghost", size: "icon" })}
                        aria-label="Lihat detail tugas"
                        title="Detail"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
