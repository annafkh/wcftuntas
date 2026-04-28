import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ShiftBadge } from "@/components/shift-badge";
import { StatusBadge } from "@/components/status-badge";
import { TaskCompletionForm } from "@/components/task-completion-form";
import { TaskReviewForm } from "@/components/task-review-form";
import { getSession } from "@/lib/auth";
import { getTaskById } from "@/lib/data";
import { STATUS_LABELS, TASK_TYPE_LABELS } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const { taskId } = await params;
  const task = await getTaskById(taskId, session);

  if (!task) {
    notFound();
  }

  const showEmployeeActions = session.role === "karyawan";
  const showSupervisorActions = session.role === "pengawas";
  const backHref = session.role === "pt_wcf" ? "/approval" : session.role === "pengawas" ? "/approval" : "/tasks";
  const backLabel =
    session.role === "pt_wcf" || session.role === "pengawas"
      ? "Kembali ke Monitoring Tugas"
      : "Kembali ke Daftar Tugas";

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl pt-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
              Detail Tugas
            </p>
            <h3 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">
              {task.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{task.description || "-"}</p>
          </div>
          <StatusBadge status={task.status} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Area", task.area?.name ?? "-"],
            ["Jenis", TASK_TYPE_LABELS[task.type]],
            ["Karyawan", task.assignedToUser.name],
            ["Nama Pengawas", task.supervisorUser?.name ?? "-"],
            ["Tanggal Tugas", formatDateTime(task.taskDate)],
            ["Deadline", formatDateTime(task.dueDate)],
            [
              "Checklist karyawan",
              task.employeeChecklistAt ? formatDateTime(task.employeeChecklistAt) : "-",
            ],
            [
              "Approval pengawas",
              task.supervisorApprovedAt ? formatDateTime(task.supervisorApprovedAt) : "-",
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
            </div>
          ))}
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Shift</p>
            <div className="mt-2">
              <ShiftBadge shift={task.shift} />
            </div>
          </div>
        </div>
      </section>

      {showEmployeeActions ? <TaskCompletionForm task={task} /> : null}
      {showSupervisorActions ? <TaskReviewForm task={task} /> : null}

      <div className="space-y-6 min-w-0">
        <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                Attachment
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Preview dan file asli bisa dibuka langsung dari setiap kartu attachment.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {task.attachments.length} File
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {task.attachments.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada attachment.</p>
            ) : (
              task.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50"
                >
                  {attachment.fileType.startsWith("image/") ? (
                    <Link
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block bg-slate-200"
                    >
                      <Image
                        src={attachment.fileUrl}
                        alt={attachment.fileName}
                        width={1200}
                        height={800}
                        className="h-56 w-full object-cover transition hover:opacity-95"
                        unoptimized
                      />
                    </Link>
                  ) : null}
                  <div className="space-y-3 p-4">
                    <div className="min-w-0">
                      <p className="break-all font-medium text-slate-900">{attachment.fileName}</p>
                      <p className="mt-1 break-all text-sm text-slate-600">{attachment.fileType}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                      >
                        {attachment.fileType.startsWith("image/") ? "View" : "Buka File"}
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
            Activity log
          </p>
          <div className="mt-5 space-y-4">
            {task.activityLogs.map((log) => (
              <div key={log.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{log.note}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {formatDateTime(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
            Catatan Workflow
          </p>
          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
            <p>Status Sekarang: {STATUS_LABELS[task.status]}.</p>
            <p>Catatan Pengawas: {task.supervisorNote ?? "-"}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
