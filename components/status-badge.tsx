import { STATUS_LABELS, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusClasses: Record<TaskStatus, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  ditugaskan: "border-sky-200 bg-sky-50 text-sky-700",
  selesai_karyawan: "border-amber-200 bg-amber-50 text-amber-700",
  menunggu_review_pengawas: "border-violet-200 bg-violet-50 text-violet-700",
  disetujui_pengawas: "border-emerald-200 bg-emerald-50 text-emerald-700",
  selesai: "border-teal-200 bg-teal-50 text-teal-700",
  ditolak_revisi: "border-rose-200 bg-rose-50 text-rose-700",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize",
        statusClasses[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
