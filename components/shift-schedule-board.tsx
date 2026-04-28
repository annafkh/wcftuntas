"use client";

import { ArrowRightLeft, Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, startTransition, useDeferredValue, useMemo, useState } from "react";
import { ShiftBadge } from "@/components/shift-badge";
import { ClientTablePagination } from "@/components/ui/client-table-pagination";
import { Alert, Button, Input, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  SHIFT_LABELS,
  TASK_TYPE_LABELS,
  type SessionPayload,
  type ShiftSchedule,
  type ShiftType,
  type TaskPackage,
  type TaskTemplate,
  type User,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ShiftScheduleRecord = ShiftSchedule & {
  employee: User;
};

type ShiftDraft = {
  date: string;
  shift: ShiftType;
  employeeId: string;
  taskPackageId: string;
  taskTemplateIds: string[];
  note: string;
};

type ShiftCreateDraft = {
  date: string;
  shift: ShiftType;
  employeeId: string;
  employeeIds: string[];
  taskPackageId: string;
  taskTemplateIds: string[];
  note: string;
};

const shiftOptions = Object.entries(SHIFT_LABELS) as [ShiftType, string][];

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
}

function findMatchingPackageId(taskTemplateIds: string[], taskPackages: TaskPackage[]) {
  const matchedPackage = taskPackages.find((taskPackage) =>
    sameIds(taskTemplateIds, taskPackage.taskTemplates.map((taskTemplate) => taskTemplate.id)),
  );

  return matchedPackage?.id ?? "";
}

function getPackageTaskTemplateIds(taskPackages: TaskPackage[], taskPackageId: string) {
  return taskPackages
    .find((taskPackage) => taskPackage.id === taskPackageId)
    ?.taskTemplates.map((taskTemplate) => taskTemplate.id) ?? [];
}

function createDraft(schedule: ShiftScheduleRecord, taskPackages: TaskPackage[]): ShiftDraft {
  const taskTemplateIds = schedule.taskTemplates.map((taskTemplate) => taskTemplate.id);

  return {
    date: schedule.date,
    shift: schedule.shift,
    employeeId: schedule.employeeId,
    taskPackageId: findMatchingPackageId(taskTemplateIds, taskPackages),
    taskTemplateIds,
    note: schedule.note ?? "",
  };
}

function createEmptyCreateDraft(): ShiftCreateDraft {
  return {
    date: new Date().toISOString().slice(0, 10),
    shift: "pagi",
    employeeId: "",
    employeeIds: [],
    taskPackageId: "",
    taskTemplateIds: [],
    note: "",
  };
}

function toggleId(values: string[], id: string, checked: boolean) {
  if (checked) {
    return values.includes(id) ? values : [...values, id];
  }

  return values.filter((value) => value !== id);
}

function isMultiEmployeeShift(shift: ShiftType) {
  return shift === "mingguan" || shift === "bulanan";
}

function getEmployeeSummary(employeeIds: string[], employees: User[]) {
  if (employeeIds.length === 0) {
    return "Pilih karyawan";
  }

  const names = employees
    .filter((employee) => employeeIds.includes(employee.id))
    .map((employee) => employee.name);

  if (names.length === 0) {
    return "Pilih karyawan";
  }

  if (names.length === 1) {
    return names[0];
  }

  return `${names[0]} +${names.length - 1} karyawan`;
}

function formatBoardDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getTaskTemplateSummary(taskTemplateIds: string[], taskTemplates: TaskTemplate[]) {
  if (taskTemplateIds.length === 0) {
    return "Pilih master task";
  }

  const titles = taskTemplates
    .filter((taskTemplate) => taskTemplateIds.includes(taskTemplate.id))
    .map((taskTemplate) => taskTemplate.title);

  if (titles.length === 0) {
    return "Pilih master task";
  }

  if (titles.length === 1) {
    return titles[0];
  }

  return `${titles[0]} +${titles.length - 1} task`;
}

function getTaskTemplateHint(taskTemplates: TaskTemplate[]) {
  if (taskTemplates.length === 0) {
    return "Belum ada master task";
  }

  const firstTitle = taskTemplates[0]?.title ?? "Belum ada master task";

  if (taskTemplates.length === 1) {
    return firstTitle;
  }

  return `${firstTitle} +${taskTemplates.length - 1}`;
}

function TaskTemplateMultiSelect({
  value,
  taskTemplates,
  disabled,
  onChange,
}: {
  value: string[];
  taskTemplates: TaskTemplate[];
  disabled?: boolean;
  onChange: (nextValue: string[]) => void;
}) {
  return (
    <details
      className="group relative"
      {...(disabled ? { open: false } : {})}
    >
      <summary
        className={cn(
          "flex w-full min-w-0 cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none sm:min-w-[260px]",
          "focus:border-blue-500 group-open:border-blue-500",
          disabled && "pointer-events-none bg-slate-50 text-slate-400",
        )}
      >
        <span className="truncate">{getTaskTemplateSummary(value, taskTemplates)}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>

      <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:min-w-[260px]">
        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
          {taskTemplates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
              Belum ada master task.
            </p>
          ) : (
            taskTemplates.map((taskTemplate) => {
              const checked = value.includes(taskTemplate.id);

              return (
                <label
                  key={taskTemplate.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      onChange(toggleId(value, taskTemplate.id, event.target.checked))
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">{taskTemplate.title}</span>
                    <span className="block text-xs uppercase tracking-[0.16em] text-blue-600">
                      {TASK_TYPE_LABELS[taskTemplate.type]}
                    </span>
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </details>
  );
}

export function ShiftScheduleBoard({
  initialSchedules,
  employees,
  taskTemplates,
  taskPackages,
  session,
}: {
  initialSchedules: ShiftScheduleRecord[];
  employees: User[];
  taskTemplates: TaskTemplate[];
  taskPackages: TaskPackage[];
  session: SessionPayload;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ShiftDraft | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createDraftState, setCreateDraftState] = useState<ShiftCreateDraft>(() => createEmptyCreateDraft());
  const [takeoverId, setTakeoverId] = useState<string | null>(null);
  const [takeoverEmployeeIds, setTakeoverEmployeeIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreatingPending, setIsCreatingPending] = useState(false);
  const [takeoverSavingId, setTakeoverSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const deferredQuery = useDeferredValue(query);

  const filteredSchedules = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();
    if (!keyword) {
      return schedules;
    }

    return schedules.filter((schedule) =>
      [
        schedule.employee.name,
        schedule.note ?? "",
        SHIFT_LABELS[schedule.shift],
        ...schedule.taskTemplates.map((taskTemplate) => taskTemplate.title),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [deferredQuery, schedules]);
  const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedSchedules = useMemo(
    () => filteredSchedules.slice((safePage - 1) * perPage, safePage * perPage),
    [filteredSchedules, perPage, safePage],
  );

  function beginCreate() {
    setError("");
    setEditingId(null);
    setDraft(null);
    setTakeoverId(null);
    setTakeoverEmployeeIds([]);
    setIsCreating(true);
    setCreateDraftState((current) => ({
      ...createEmptyCreateDraft(),
      date: current.date,
    }));
  }

  function cancelCreate() {
    setError("");
    setIsCreating(false);
    setCreateDraftState((current) => ({
      ...createEmptyCreateDraft(),
      date: current.date,
    }));
  }

  function beginEdit(schedule: ShiftScheduleRecord) {
    setError("");
    setIsCreating(false);
    setTakeoverId(null);
    setTakeoverEmployeeIds([]);
    setEditingId(schedule.id);
    setDraft(createDraft(schedule, taskPackages));
  }

  function cancelEdit() {
    setError("");
    setEditingId(null);
    setDraft(null);
  }

  function getTakeoverCandidates(schedule: ShiftScheduleRecord) {
    const sameDayEmployeeIds = new Set(
      schedules
        .filter(
          (item) =>
            item.id !== schedule.id &&
            item.date === schedule.date,
        )
        .map((item) => item.employeeId),
    );
    const scheduledEmployees = employees.filter(
      (employee) => employee.id !== schedule.employeeId && sameDayEmployeeIds.has(employee.id),
    );

    return scheduledEmployees.length > 0
      ? scheduledEmployees
      : employees.filter((employee) => employee.id !== schedule.employeeId);
  }

  function beginTakeover(schedule: ShiftScheduleRecord) {
    setError("");
    setIsCreating(false);
    setEditingId(null);
    setDraft(null);
    setTakeoverId(schedule.id);
    setTakeoverEmployeeIds([]);
  }

  function cancelTakeover() {
    setError("");
    setTakeoverId(null);
    setTakeoverEmployeeIds([]);
  }

  function toggleTakeoverEmployee(employeeId: string, checked: boolean) {
    setError("");
    setTakeoverEmployeeIds((current) => {
      if (!checked) {
        return current.filter((id) => id !== employeeId);
      }

      if (current.includes(employeeId)) {
        return current;
      }

      if (current.length >= 2) {
        setError("Take over hanya bisa dibagi ke maksimal dua karyawan.");
        return current;
      }

      return [...current, employeeId];
    });
  }

  function updateDraft<K extends keyof ShiftDraft>(key: K, value: ShiftDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateCreateDraft<K extends keyof ShiftCreateDraft>(key: K, value: ShiftCreateDraft[K]) {
    setCreateDraftState((current) => ({ ...current, [key]: value }));
  }

  function updateCreateShift(shift: ShiftType) {
    setCreateDraftState((current) => {
      if (isMultiEmployeeShift(shift)) {
        return {
          ...current,
          shift,
          employeeIds:
            current.employeeIds.length > 0
              ? current.employeeIds
              : current.employeeId
                ? [current.employeeId]
                : [],
        };
      }

      return {
        ...current,
        shift,
        employeeId: current.employeeId || current.employeeIds[0] || "",
      };
    });
  }

  function applyCreatePackage(taskPackageId: string) {
    setCreateDraftState((current) => ({
      ...current,
      taskPackageId,
      taskTemplateIds: taskPackageId ? getPackageTaskTemplateIds(taskPackages, taskPackageId) : current.taskTemplateIds,
    }));
  }

  function applyDraftPackage(taskPackageId: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            taskPackageId,
            taskTemplateIds: taskPackageId ? getPackageTaskTemplateIds(taskPackages, taskPackageId) : current.taskTemplateIds,
          }
        : current,
    );
  }

  function buildCreatePayload() {
    return {
      date: createDraftState.date,
      shift: createDraftState.shift,
      employeeId: isMultiEmployeeShift(createDraftState.shift) ? undefined : createDraftState.employeeId,
      employeeIds: isMultiEmployeeShift(createDraftState.shift) ? createDraftState.employeeIds : undefined,
      taskTemplateIds: createDraftState.taskTemplateIds,
      note: createDraftState.note,
    };
  }

  function buildUpdatePayload() {
    if (!draft) {
      return null;
    }

    return {
      date: draft.date,
      shift: draft.shift,
      employeeId: draft.employeeId,
      taskTemplateIds: draft.taskTemplateIds,
      note: draft.note,
    };
  }

  async function handleCreate() {
    const hasEmployees = isMultiEmployeeShift(createDraftState.shift)
      ? createDraftState.employeeIds.length > 0
      : Boolean(createDraftState.employeeId);

    if (!hasEmployees) {
      const message = isMultiEmployeeShift(createDraftState.shift)
        ? "Pilih minimal satu karyawan terlebih dahulu."
        : "Pilih karyawan terlebih dahulu.";
      setError(message);
      showToast({ title: "Jadwal belum bisa dibuat", description: message, variant: "error" });
      return;
    }

    setError("");
    setIsCreatingPending(true);

    const response = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildCreatePayload()),
    });

    setIsCreatingPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal menambah jadwal.";
      setError(message);
      showToast({ title: "Jadwal gagal dibuat", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as {
      schedule?: ShiftScheduleRecord;
      schedules?: ShiftScheduleRecord[];
    };
    const createdSchedules = body.schedules ?? (body.schedule ? [body.schedule] : []);
    setSchedules((current) => [...createdSchedules, ...current]);
    showToast({
      title: "Jadwal berhasil dibuat",
      description: `${createdSchedules.length} jadwal kerja berhasil ditambahkan.`,
      variant: "success",
    });
    setIsCreating(false);
    setCreateDraftState((current) => ({
      ...createEmptyCreateDraft(),
      date: current.date,
    }));
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSave(schedule: ShiftScheduleRecord) {
    const payload = buildUpdatePayload();
    if (!payload) {
      return;
    }

    setError("");
    setSavingId(schedule.id);

    const response = await fetch(`/api/shifts/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSavingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal menyimpan jadwal.";
      setError(message);
      showToast({ title: "Jadwal gagal diperbarui", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { schedule: ShiftScheduleRecord };
    setSchedules((current) =>
      current.map((item) => (item.id === schedule.id ? body.schedule : item)),
    );
    showToast({
      title: "Jadwal berhasil diperbarui",
      description: "Perubahan jadwal telah disimpan.",
      variant: "success",
    });
    cancelEdit();
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete(schedule: ShiftScheduleRecord) {
    if (!window.confirm(`Hapus jadwal ${schedule.employee.name} pada ${formatBoardDate(schedule.date)}?`)) {
      return;
    }

    setError("");
    setDeletingId(schedule.id);

    const response = await fetch(`/api/shifts/${schedule.id}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal menghapus jadwal.";
      setError(message);
      showToast({ title: "Jadwal gagal dihapus", description: message, variant: "error" });
      return;
    }

    setSchedules((current) => current.filter((item) => item.id !== schedule.id));
    showToast({
      title: "Jadwal berhasil dihapus",
      description: "Jadwal kerja telah dihapus.",
      variant: "success",
    });
    if (editingId === schedule.id) {
      cancelEdit();
    }
    if (takeoverId === schedule.id) {
      cancelTakeover();
    }
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleTakeover(schedule: ShiftScheduleRecord) {
    if (takeoverEmployeeIds.length === 0) {
      const message = "Pilih minimal satu karyawan pengganti.";
      setError(message);
      showToast({ title: "Take over belum bisa diproses", description: message, variant: "error" });
      return;
    }

    setError("");
    setTakeoverSavingId(schedule.id);

    const response = await fetch(`/api/shifts/${schedule.id}/takeover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeIds: takeoverEmployeeIds }),
    });

    setTakeoverSavingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal melakukan take over task.";
      setError(message);
      showToast({ title: "Take over gagal", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as {
      schedules: ShiftScheduleRecord[];
      movedTasks: number;
      assignees: string[];
    };
    const changedSchedulesById = new Map(body.schedules.map((item) => [item.id, item]));

    setSchedules((current) =>
      current.map((item) => changedSchedulesById.get(item.id) ?? item),
    );
    showToast({
      title: "Take over berhasil",
      description: `${body.movedTasks} task dipindahkan ke ${body.assignees.join(", ")}.`,
      variant: "success",
    });
    cancelTakeover();
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">
            Tabel Master Shift
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Daftar Jadwal Shift
          </h3>
        </div>

        {session.role === "pt_wcf" ? (
          <Button type="button" onClick={beginCreate} disabled={isCreating || Boolean(editingId) || Boolean(takeoverId)}>
            <Plus className="h-4 w-4" />
            Tambah Jadwal
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Cari karyawan, task, atau catatan jadwal"
          className="sm:max-w-md bg-white"
          aria-label="Cari jadwal shift"
        />
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="responsive-table w-full min-w-[1280px] border-separate border-spacing-0">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-600">
            <tr>
              <th className="px-5 py-4 font-semibold first:rounded-tl-lg">Tanggal</th>
              <th className="px-5 py-4 font-medium">Shift</th>
              <th className="px-5 py-4 font-medium">Karyawan</th>
              <th className="px-5 py-4 font-medium">Paket task</th>
              <th className="px-5 py-4 font-medium">Master task</th>
              <th className="px-5 py-4 font-medium">Catatan</th>
              <th className="px-5 py-4 font-medium text-right last:rounded-tr-lg">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isCreating ? (
              <tr className="bg-sky-50/70">
                <td data-label="Tanggal" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    type="date"
                    value={createDraftState.date}
                    onChange={(event) => updateCreateDraft("date", event.target.value)}
                  />
                </td>
                <td data-label="Shift" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Select
                    value={createDraftState.shift}
                    onChange={(event) => updateCreateShift(event.target.value as ShiftType)}
                  >
                    {shiftOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td data-label="Karyawan" className="border-b border-slate-100 px-5 py-4 align-top">
                  {isMultiEmployeeShift(createDraftState.shift) ? (
                    <details className="group relative">
                      <summary
                        className={cn(
                          "flex w-full min-w-0 cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none sm:min-w-[220px]",
                          "focus:border-blue-500 group-open:border-blue-500",
                        )}
                      >
                        <span className="truncate">
                          {getEmployeeSummary(createDraftState.employeeIds, employees)}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                      </summary>
                      <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:min-w-[260px]">
                        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                          {employees.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
                              Belum ada karyawan.
                            </p>
                          ) : (
                            employees.map((employee) => {
                              const checked = createDraftState.employeeIds.includes(employee.id);

                              return (
                                <label
                                  key={employee.id}
                                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) =>
                                      updateCreateDraft(
                                        "employeeIds",
                                        toggleId(createDraftState.employeeIds, employee.id, event.target.checked),
                                      )
                                    }
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="block font-semibold text-slate-900">{employee.name}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </details>
                  ) : (
                    <Select
                      value={createDraftState.employeeId}
                      onChange={(event) => updateCreateDraft("employeeId", event.target.value)}
                      className="w-full sm:min-w-[220px]"
                    >
                      <option value="">Pilih karyawan</option>
                      {employees.length === 0 ? (
                        <option value="" disabled>
                          Belum ada karyawan.
                        </option>
                      ) : (
                        employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))
                      )}
                    </Select>
                  )}
                </td>
                <td data-label="Paket Task" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Select
                    value={createDraftState.taskPackageId}
                    onChange={(event) => applyCreatePackage(event.target.value)}
                    className="w-full sm:min-w-[220px]"
                  >
                    <option value="">Pilih manual</option>
                    {taskPackages.map((taskPackage) => (
                      <option key={taskPackage.id} value={taskPackage.id}>
                        {taskPackage.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td data-label="Master Task" className="border-b border-slate-100 px-5 py-4 align-top">
                  <TaskTemplateMultiSelect
                    value={createDraftState.taskTemplateIds}
                    taskTemplates={taskTemplates}
                    disabled={Boolean(createDraftState.taskPackageId)}
                    onChange={(nextValue) => {
                      updateCreateDraft("taskPackageId", "");
                      updateCreateDraft("taskTemplateIds", nextValue);
                    }}
                  />
                </td>
                <td data-label="Catatan" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    value={createDraftState.note}
                    onChange={(event) => updateCreateDraft("note", event.target.value)}
                    placeholder="Catatan opsional"
                  />
                </td>
                <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button type="button" onClick={handleCreate} disabled={isCreatingPending} variant="secondary" size="icon" aria-label="Simpan jadwal baru">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button type="button" onClick={cancelCreate} disabled={isCreatingPending} variant="ghost" size="icon" aria-label="Batal tambah jadwal">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ) : null}

            {paginatedSchedules.map((schedule) => {
              const isEditing = editingId === schedule.id;
              const isTakingOver = takeoverId === schedule.id;
              const scheduleTaskTemplateIds = schedule.taskTemplates.map((taskTemplate) => taskTemplate.id);
              const matchedPackageId = findMatchingPackageId(scheduleTaskTemplateIds, taskPackages);
              const matchedPackage = taskPackages.find((taskPackage) => taskPackage.id === matchedPackageId);
              const takeoverCandidates = getTakeoverCandidates(schedule);

              return (
                <Fragment key={schedule.id}>
                <tr
                  className={cn(
                    "transition",
                    isEditing
                      ? "bg-sky-50/70"
                      : isTakingOver
                        ? "bg-cyan-50/70"
                        : "bg-white hover:bg-slate-50",
                  )}
                >
                  <td data-label="Tanggal" className="border-b border-slate-100 px-5 py-4 align-top">
                    {isEditing && draft ? (
                      <Input
                        type="date"
                        value={draft.date}
                        onChange={(event) => updateDraft("date", event.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-900">{formatBoardDate(schedule.date)}</p>
                    )}
                  </td>
                  <td data-label="Shift" className="border-b border-slate-100 px-5 py-4 align-top">
                    {isEditing && draft ? (
                      <Select
                        value={draft.shift}
                        onChange={(event) => updateDraft("shift", event.target.value as ShiftType)}
                      >
                        {shiftOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <ShiftBadge shift={schedule.shift} className="border-0" />
                    )}
                  </td>
                  <td data-label="Karyawan" className="border-b border-slate-100 px-5 py-4 align-top text-sm font-semibold text-slate-900">
                    {isEditing && draft ? (
                      <Select
                        value={draft.employeeId}
                        onChange={(event) => updateDraft("employeeId", event.target.value)}
                      >
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      schedule.employee.name
                    )}
                  </td>
                  <td data-label="Paket Task" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Select
                        value={draft.taskPackageId}
                        onChange={(event) => applyDraftPackage(event.target.value)}
                        className="w-full sm:min-w-[220px]"
                      >
                        <option value="">Pilih manual</option>
                        {taskPackages.map((taskPackage) => (
                          <option key={taskPackage.id} value={taskPackage.id}>
                            {taskPackage.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      matchedPackage?.name ?? "Manual"
                    )}
                  </td>
                  <td data-label="Master Task" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <TaskTemplateMultiSelect
                        value={draft.taskTemplateIds}
                        taskTemplates={taskTemplates}
                        disabled={Boolean(draft.taskPackageId)}
                        onChange={(nextValue) => {
                          updateDraft("taskPackageId", "");
                          updateDraft("taskTemplateIds", nextValue);
                        }}
                      />
                    ) : schedule.taskTemplates.length > 0 ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="max-w-[240px] text-left text-sm text-slate-700 transition hover:text-slate-950"
                          >
                            <span className="block truncate font-medium">{getTaskTemplateHint(schedule.taskTemplates)}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-80 p-3">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">Task Shift</p>
                            </div>
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                              {schedule.taskTemplates.map((taskTemplate) => (
                                <div key={taskTemplate.id} className="rounded-xl bg-slate-50 px-3 py-2">
                                  <p className="text-sm font-semibold text-slate-900">{taskTemplate.title}</p>
                                  <p className="text-xs uppercase tracking-[0.16em] text-blue-600">
                                    {TASK_TYPE_LABELS[taskTemplate.type]}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="text-sm text-slate-500">Belum ada master task</p>
                    )}
                  </td>
                  <td data-label="Catatan" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Input
                        value={draft.note}
                        onChange={(event) => updateDraft("note", event.target.value)}
                        placeholder="Kosongkan jika tidak perlu catatan"
                      />
                    ) : (
                      <p className="max-w-md leading-6">{schedule.note ?? "Tanpa catatan"}</p>
                    )}
                  </td>
                  <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button type="button" onClick={() => handleSave(schedule)} disabled={savingId === schedule.id} variant="secondary" size="icon" aria-label="Simpan perubahan jadwal">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={cancelEdit} disabled={savingId === schedule.id} variant="ghost" size="icon" aria-label="Batal edit jadwal">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : session.role === "pt_wcf" ? (
                        <>
                          <Button type="button" onClick={() => beginTakeover(schedule)} disabled={Boolean(editingId) || isCreating || Boolean(takeoverId)} variant="secondary" size="icon" aria-label={`Take over task ${schedule.employee.name}`}>
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={() => beginEdit(schedule)} disabled={Boolean(editingId) || isCreating || Boolean(takeoverId)} variant="secondary" size="icon" aria-label={`Edit jadwal ${schedule.employee.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={() => handleDelete(schedule)} disabled={deletingId === schedule.id || Boolean(editingId) || isCreating || Boolean(takeoverId)} variant="danger" size="icon" aria-label={`Hapus jadwal ${schedule.employee.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {isTakingOver ? (
                  <tr className="bg-cyan-50/70">
                    <td colSpan={7} className="border-b border-cyan-100 px-5 py-4">
                      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            Take over task dari {schedule.employee.name}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Pilih karyawan yang masuk di tanggal yang sama. Sistem akan membuat atau
                            memakai jadwal {SHIFT_LABELS[schedule.shift]} untuk penerima take over.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {takeoverCandidates.length === 0 ? (
                              <p className="rounded-xl border border-dashed border-cyan-200 bg-white px-3 py-2 text-sm text-slate-500">
                                Belum ada karyawan pengganti untuk jadwal ini.
                              </p>
                            ) : (
                              takeoverCandidates.map((employee) => {
                                const checked = takeoverEmployeeIds.includes(employee.id);

                                return (
                                  <label
                                    key={employee.id}
                                    className={cn(
                                      "flex items-center gap-3 rounded-xl border bg-white px-3 py-2 text-sm text-slate-700",
                                      checked ? "border-cyan-400" : "border-slate-200",
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) =>
                                        toggleTakeoverEmployee(employee.id, event.target.checked)
                                      }
                                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span>{employee.name}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                          <Button type="button" onClick={() => handleTakeover(schedule)} disabled={takeoverSavingId === schedule.id || takeoverEmployeeIds.length === 0}>
                            {takeoverSavingId === schedule.id ? "Memproses..." : "Proses take over"}
                          </Button>
                          <Button type="button" onClick={cancelTakeover} disabled={takeoverSavingId === schedule.id} variant="secondary">
                            Batal
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              );
            })}

            {filteredSchedules.length === 0 && !isCreating ? (
              <tr className="bg-white">
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                  {schedules.length === 0
                    ? "Tidak ada master shift yang sesuai dengan filter."
                    : "Tidak ada jadwal shift yang sesuai dengan pencarian."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ClientTablePagination
        page={safePage}
        totalItems={filteredSchedules.length}
        perPage={perPage}
        itemLabel="jadwal"
        onPageChange={setPage}
        onPerPageChange={(nextPerPage) => {
          setPerPage(nextPerPage);
          setPage(1);
        }}
      />
    </section>
  );
}
