"use client";

import Image from "next/image";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import idLocale from "@fullcalendar/core/locales/id";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ClipboardList, MoonStar, Pencil, Sun, Sunset, UserRound, X } from "lucide-react";
import { ShiftBadge } from "@/components/shift-badge";
import { Input, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast-provider";
import { SHIFT_LABELS, SHIFT_COLOR_CLASSES, STATUS_LABELS, type SessionPayload, type ShiftType, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type ShiftCalendarEvent = {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
  extendedProps: {
    shift: ShiftType;
    employeeId: string;
    employee: string;
    note: string | null;
    tasks: {
      id: string;
      title: string;
      description: string;
      area: string;
      status: TaskStatus;
      supervisorNote: string | null;
      attachmentCount: number;
      attachments: {
        id: string;
        fileUrl: string;
        fileName: string;
        fileType: string;
      }[];
      reviewer: string | null;
    }[];
  };
};

const MAX_CLIENT_ATTACHMENT_SIZE = 5 * 1024 * 1024;

function getShiftIcon(shift: ShiftType) {
  switch (shift) {
    case "pagi":
      return Sun;
    case "middle":
      return MoonStar;
    case "siang":
      return Sunset;
    case "mingguan":
    case "bulanan":
      return ClipboardList;
  }
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function canEmployeeUpload(status: TaskStatus) {
  return !["selesai_karyawan", "menunggu_review_pengawas", "disetujui_pengawas", "selesai"].includes(
    status,
  );
}

function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function TaskCalendar({
  events,
  session,
}: {
  events: ShiftCalendarEvent[];
  session: SessionPayload;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const calendarRef = useRef<FullCalendar | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [filesByTaskId, setFilesByTaskId] = useState<Record<string, File | null>>({});
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    fileUrl: string;
    fileName: string;
    fileType: string;
  } | null>(null);
  const [editingReviewTaskId, setEditingReviewTaskId] = useState<string | null>(null);
  const [supervisorNotesByTaskId, setSupervisorNotesByTaskId] = useState<Record<string, string>>({});
  const [supervisorStatusesByTaskId, setSupervisorStatusesByTaskId] = useState<
    Record<string, "disetujui_pengawas" | "ditolak_revisi">
  >({});
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);
  const [taskQuery, setTaskQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | TaskStatus>("");
  const deferredTaskQuery = useDeferredValue(taskQuery);

  function selectToday() {
    const today = getTodayDateValue();

    calendarRef.current?.getApi().today();
    setSelectedDate(today);
    setSelectedScheduleId(null);
  }

  async function handleAttachmentUpload(taskId: string) {
    const file = filesByTaskId[taskId];
    if (!file) {
      showToast({
        title: "Upload Belum Bisa Diproses",
        description: "Pilih file PNG, JPG, atau JPEG terlebih dahulu.",
        variant: "error",
      });
      return;
    }

    if (file.size > MAX_CLIENT_ATTACHMENT_SIZE) {
      showToast({
        title: "Ukuran File Terlalu Besar",
        description: `File "${file.name}" melebihi batas 5 MB.`,
        variant: "error",
      });
      return;
    }

    setUploadingTaskId(taskId);
    const formData = new FormData();
    formData.append("attachments", file);
    const response = await fetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      body: formData,
    });

    setUploadingTaskId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      showToast({
        title: "Upload Gagal",
        description: body.error ?? "Gagal mengunggah attachment.",
        variant: "error",
      });
      return;
    }

    setFilesByTaskId((current) => ({ ...current, [taskId]: null }));
    showToast({
      title: "Upload Berhasil",
      description: "Attachment telah diunggah dan checklist tugas diperbarui.",
      variant: "success",
    });
    router.refresh();
  }

  function getSupervisorNoteValue(task: ShiftCalendarEvent["extendedProps"]["tasks"][number]) {
    return supervisorNotesByTaskId[task.id] ?? task.supervisorNote ?? "";
  }

  function getSupervisorStatusValue(task: ShiftCalendarEvent["extendedProps"]["tasks"][number]) {
    if (supervisorStatusesByTaskId[task.id]) {
      return supervisorStatusesByTaskId[task.id];
    }

    return task.status === "ditolak_revisi" ? "ditolak_revisi" : "disetujui_pengawas";
  }

  function beginSupervisorEdit(task: ShiftCalendarEvent["extendedProps"]["tasks"][number]) {
    if (task.status === "selesai") {
      return;
    }

    setEditingReviewTaskId(task.id);
    setSupervisorStatusesByTaskId((current) => ({
      ...current,
      [task.id]: getSupervisorStatusValue(task),
    }));
    setSupervisorNotesByTaskId((current) => ({
      ...current,
      [task.id]: getSupervisorNoteValue(task),
    }));
  }

  function cancelSupervisorEdit() {
    setEditingReviewTaskId(null);
  }

  async function handleSupervisorReview(
    task: ShiftCalendarEvent["extendedProps"]["tasks"][number],
  ) {
    const decision = getSupervisorStatusValue(task) === "ditolak_revisi" ? "revise" : "approve";
    const supervisorNote = getSupervisorNoteValue(task).trim();

    if (decision === "revise" && !supervisorNote) {
      showToast({
        title: "Keterangan Wajib Diisi",
        description: "Pengawas harus memberikan keterangan saat memilih status belum sesuai.",
        variant: "error",
      });
      return;
    }

    setReviewingTaskId(task.id);

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

    setReviewingTaskId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      showToast({
        title: "Review Gagal Diproses",
        description: body.error ?? "Gagal memproses review tugas.",
        variant: "error",
      });
      return;
    }

    showToast({
      title: decision === "approve" ? "Tugas Disetujui" : "Tugas Ditandai Belum Sesuai",
      description:
        decision === "approve"
          ? "Status tugas sudah diperbarui menjadi disetujui."
          : "Keterangan pengawas sudah dikirim ke karyawan.",
      variant: "success",
    });

    startTransition(() => {
      router.refresh();
    });
    cancelSupervisorEdit();
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const selectedItems = useMemo(
    () =>
      selectedDate
        ? events.filter(
            (event) =>
              event.start === selectedDate &&
              (!selectedScheduleId || event.id === selectedScheduleId),
          )
        : [],
    [events, selectedDate, selectedScheduleId],
  );

  function matchesTaskFilter(task: ShiftCalendarEvent["extendedProps"]["tasks"][number]) {
    const keyword = deferredTaskQuery.trim().toLowerCase();
    const matchesQuery = keyword
      ? `${task.title} ${task.description} ${task.area} ${task.reviewer ?? ""}`.toLowerCase().includes(keyword)
      : true;
    const matchesStatus = statusFilter ? task.status === statusFilter : true;

    return matchesQuery && matchesStatus;
  }

  function renderAttachmentContent(task: ShiftCalendarEvent["extendedProps"]["tasks"][number]) {
    if (task.attachmentCount > 0) {
      return (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setPreviewAttachment(task.attachments[0] ?? null)}
            className="font-medium text-blue-700 transition hover:text-blue-900"
          >
            {task.attachmentCount} file
          </button>
          <div className="flex flex-wrap gap-2">
            {task.attachments.map((attachment) => (
              <button
                key={attachment.id}
                type="button"
                onClick={() => setPreviewAttachment(attachment)}
                className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
              >
                {attachment.fileName}
              </button>
            ))}
          </div>
          {session.role === "karyawan" && canEmployeeUpload(task.status) ? (
            <div className="space-y-2 pt-1">
              <input
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;

                  if (nextFile && nextFile.size > MAX_CLIENT_ATTACHMENT_SIZE) {
                    showToast({
                      title: "Ukuran File Terlalu Besar",
                      description: `File "${nextFile.name}" melebihi batas 5 MB.`,
                      variant: "error",
                    });
                    event.target.value = "";
                    setFilesByTaskId((current) => ({
                      ...current,
                      [task.id]: null,
                    }));
                    return;
                  }

                  setFilesByTaskId((current) => ({
                    ...current,
                    [task.id]: nextFile,
                  }));
                }}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:max-w-56"
              />
              {filesByTaskId[task.id] ? (
                <p className="text-xs text-slate-500">{filesByTaskId[task.id]?.name}</p>
              ) : null}
              <button
                type="button"
                onClick={() => handleAttachmentUpload(task.id)}
                disabled={uploadingTaskId === task.id || !filesByTaskId[task.id]}
                className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {uploadingTaskId === task.id ? "Mengunggah..." : "Tambah attachment"}
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    if (session.role === "karyawan" && canEmployeeUpload(task.status)) {
      return (
        <div className="space-y-2">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;

              if (nextFile && nextFile.size > MAX_CLIENT_ATTACHMENT_SIZE) {
                showToast({
                  title: "Ukuran File Terlalu Besar",
                  description: `File "${nextFile.name}" melebihi batas 5 MB.`,
                  variant: "error",
                });
                event.target.value = "";
                setFilesByTaskId((current) => ({
                  ...current,
                  [task.id]: null,
                }));
                return;
              }

              setFilesByTaskId((current) => ({
                ...current,
                [task.id]: nextFile,
              }));
            }}
            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:max-w-56"
          />
          {filesByTaskId[task.id] ? (
            <p className="text-xs text-slate-500">{filesByTaskId[task.id]?.name}</p>
          ) : null}
          <button
            type="button"
            onClick={() => handleAttachmentUpload(task.id)}
            disabled={uploadingTaskId === task.id || !filesByTaskId[task.id]}
            className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {uploadingTaskId === task.id ? "Mengunggah..." : "Upload"}
          </button>
        </div>
      );
    }

    return <span className="text-slate-600">0 file</span>;
  }

  function renderSupervisorStatus(task: ShiftCalendarEvent["extendedProps"]["tasks"][number]) {
    if (session.role === "pengawas" && editingReviewTaskId === task.id) {
      return (
        <Select
          value={getSupervisorStatusValue(task)}
          onChange={(event) =>
            setSupervisorStatusesByTaskId((current) => ({
              ...current,
              [task.id]: event.target.value as "disetujui_pengawas" | "ditolak_revisi",
            }))
          }
          className="min-w-0 bg-white sm:min-w-52"
        >
          <option value="disetujui_pengawas">Disetujui Pengawas</option>
          <option value="ditolak_revisi">Belum Sesuai</option>
        </Select>
      );
    }

    return STATUS_LABELS[task.status];
  }

  function renderTaskDescription(task: ShiftCalendarEvent["extendedProps"]["tasks"][number]) {
    if (session.role === "pengawas" && editingReviewTaskId === task.id) {
      return (
        <textarea
          value={getSupervisorNoteValue(task)}
          onChange={(event) =>
            setSupervisorNotesByTaskId((current) => ({
              ...current,
              [task.id]: event.target.value,
            }))
          }
          rows={3}
          placeholder="Isi keterangan pengawas"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-teal-600 sm:min-w-[16rem]"
        />
      );
    }

    return (
      <div className="space-y-1">
        <p>{task.description || "-"}</p>
        {task.supervisorNote ? (
          <p className="text-xs text-slate-500">Catatan pengawas: {task.supervisorNote}</p>
        ) : null}
      </div>
    );
  }

  function renderSupervisorAction(task: ShiftCalendarEvent["extendedProps"]["tasks"][number]) {
    if (session.role !== "pengawas") {
      return null;
    }

    if (task.status === "selesai") {
      return <span className="text-slate-500">-</span>;
    }

    if (editingReviewTaskId === task.id) {
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSupervisorReview(task)}
            disabled={reviewingTaskId === task.id}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-60"
            aria-label="Simpan review pengawas"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={cancelSupervisorEdit}
            disabled={reviewingTaskId === task.id}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            aria-label="Batal edit review"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => beginSupervisorEdit(task)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
        aria-label="Edit status dan keterangan pengawas"
      >
        <Pencil className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {previewAttachment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="w-full max-w-4xl rounded-[28px] bg-white p-4 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-950">{previewAttachment.fileName}</p>
                <p className="mt-1 text-sm text-slate-500">{previewAttachment.fileType}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Tutup preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
              <Image
                src={previewAttachment.fileUrl}
                alt={previewAttachment.fileName}
                width={1600}
                height={1000}
                className="h-auto max-h-[70vh] w-full object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2.5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locales={[idLocale]}
          locale="id"
          headerToolbar={{
            left: "prev,next todayButton",
            center: "title",
            right: "",
          }}
          customButtons={{
            todayButton: {
              text: "Hari ini",
              click: selectToday,
            },
          }}
          events={events}
          height="auto"
          dayMaxEventRows={isMobile ? 2 : 3}
          dateClick={(info) => {
            setSelectedDate(info.dateStr);
            setSelectedScheduleId(null);
          }}
          eventClick={(info) => {
            setSelectedDate(info.event.startStr.slice(0, 10));
            setSelectedScheduleId(info.event.id);
          }}
        />
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.045)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 sm:text-sm">
              {selectedScheduleId ? "Detail Shift" : "Rangkuman Harian"}
            </p>
            <h3 className="mt-2 text-[1.35rem] font-semibold text-slate-950 sm:text-[1.6rem]">
              {selectedDate ? formatLongDate(selectedDate) : "Pilih Tanggal di Kalender"}
            </h3>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {session.name} • {selectedItems.length} Jadwal Tercatat
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {selectedItems.length > 0 ? (
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(0,1fr)_200px_auto] lg:items-center">
              <Input
                value={taskQuery}
                onChange={(event) => setTaskQuery(event.target.value)}
                placeholder="Cari nama tugas, keterangan, atau reviewer"
                className="bg-white"
                aria-label="Cari tugas kalender"
              />
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "" | TaskStatus)}
                className="bg-white"
                aria-label="Filter status tugas"
              >
                <option value="">Semua Status</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {selectedItems.length > 0 ? (
            selectedItems.map((item) => {
              const Icon = getShiftIcon(item.extendedProps.shift);
              const filteredTasks = item.extendedProps.tasks.filter(matchesTaskFilter);

              return (
                <article
                  key={item.id}
                  className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[15px] font-semibold text-slate-950 sm:text-base">{item.extendedProps.employee}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {filteredTasks.length} dari {item.extendedProps.tasks.length} tugas pada jadwal ini
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                          SHIFT_COLOR_CLASSES[item.extendedProps.shift],
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {SHIFT_LABELS[item.extendedProps.shift]}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <UserRound className="h-4 w-4" />
                      Catatan Pelaksanaan
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.extendedProps.note ?? "Belum ada catatan tambahan untuk jadwal ini."}
                    </p>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <ClipboardList className="h-4 w-4" />
                      Daftar Tugas
                    </div>

                    {filteredTasks.length > 0 ? (
                      isMobile ? (
                        <div className="mt-3 space-y-3">
                          {filteredTasks.map((task, index) => (
                            <article
                              key={task.id}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    Tugas {index + 1}
                                  </p>
                                  <Link
                                    href={`/tasks/${task.id}`}
                                    className="mt-1 block text-sm font-semibold text-slate-900 transition hover:text-blue-700"
                                  >
                                    {task.title}
                                  </Link>
                                  <p className="mt-1 text-xs text-slate-500">{task.area}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <ShiftBadge shift={item.extendedProps.shift} className="text-[11px]" />
                                  {renderSupervisorAction(task)}
                                </div>
                              </div>

                              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                                    Status
                                  </p>
                                  <div className="mt-1 text-sm text-slate-700">{renderSupervisorStatus(task)}</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                                    Checklist
                                  </p>
                                  <div className="mt-1">
                                    {task.attachmentCount > 0 ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                        <Check className="h-3.5 w-3.5" />
                                        Sudah
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                        <X className="h-3.5 w-3.5" />
                                        Belum
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                                    Pengawas
                                  </p>
                                  <p className="mt-1 text-sm text-slate-700">{task.reviewer ?? "-"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                                    Attachment
                                  </p>
                                  <div className="mt-1 text-sm">{renderAttachmentContent(task)}</div>
                                </div>
                              </div>

                              <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                  Keterangan
                                </p>
                                <div className="mt-1 text-sm text-slate-700">{renderTaskDescription(task)}</div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="responsive-table w-full min-w-[1240px] border-separate border-spacing-0 text-sm">
                          <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">No.</th>
                              <th className="px-4 py-3 font-medium">Area</th>
                              <th className="px-4 py-3 font-medium">Nama Tugas</th>
                              <th className="px-4 py-3 font-medium">Shift</th>
                              <th className="px-4 py-3 font-medium">Attachment</th>
                              <th className="px-4 py-3 font-medium">Checklist</th>
                              <th className="px-4 py-3 font-medium">Status</th>
                              <th className="px-4 py-3 font-medium">Nama Pengawas</th>
                              <th className="px-4 py-3 font-medium">Keterangan</th>
                              {session.role === "pengawas" ? (
                                <th className="px-4 py-3 font-medium">Aksi</th>
                              ) : null}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTasks.map((task, index) => (
                              <tr key={task.id} className="bg-white">
                                <td data-label="No." className="border-t border-slate-200 px-4 py-3 text-slate-500">{index + 1}</td>
                                  <td data-label="Area" className="border-t border-slate-200 px-4 py-3 text-slate-600">
                                  {task.area}
                                </td>
                                <td data-label="Nama Tugas" className="border-t border-slate-200 px-4 py-3">
                                  <Link
                                    href={`/tasks/${task.id}`}
                                    className="font-semibold text-slate-900 transition hover:text-blue-700"
                                  >
                                    {task.title}
                                  </Link>
                                </td>
                                <td data-label="Shift" className="border-t border-slate-200 px-4 py-3 text-slate-600">
                                  <ShiftBadge shift={item.extendedProps.shift} className="text-xs" />
                                </td>
                                <td data-label="Attachment" className="border-t border-slate-200 px-4 py-3 text-slate-600">
                                  {renderAttachmentContent(task)}
                                </td>
                                <td data-label="Checklist" className="border-t border-slate-200 px-4 py-3">
                                  {task.attachmentCount > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                      <Check className="h-3.5 w-3.5" />
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                      <X className="h-3.5 w-3.5" />
                                    </span>
                                  )}
                                </td>
                                <td data-label="Status" className="border-t border-slate-200 px-4 py-3 text-slate-600">
                                  {renderSupervisorStatus(task)}
                                </td>
                                <td data-label="Reviewer" className="border-t border-slate-200 px-4 py-3 text-slate-600">
                                  {task.reviewer ?? "-"}
                                </td>
                                <td data-label="Keterangan" className="border-t border-slate-200 px-4 py-3 text-slate-600">
                                  {renderTaskDescription(task)}
                                </td>
                                {session.role === "pengawas" ? (
                                  <td data-label="Aksi" className="border-t border-slate-200 px-4 py-3 text-slate-500">
                                    {renderSupervisorAction(task)}
                                  </td>
                                ) : null}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      )
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {item.extendedProps.tasks.length === 0
                          ? "Belum ada tugas yang terhubung ke jadwal ini."
                          : "Tidak ada tugas yang sesuai dengan filter."}
                      </p>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              {selectedDate
                ? "Belum ada jadwal pada tanggal ini."
                : "Pilih tanggal untuk melihat rincian jadwal tanpa membuka halaman lain."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
