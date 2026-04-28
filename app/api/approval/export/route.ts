import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import {
  filterApprovalTasks,
  getApprovalStatusLabel,
  getEmployeeChecklistLabel,
  getSupervisorChecklistLabel,
} from "@/lib/approval";
import { listTasks } from "@/lib/data";

function createExportFilename(date: Date) {
  const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return `approval-export-${stamp}.xlsx`;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (session.role === "karyawan") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const allTasks = await listTasks(session);
  const scopedTasks =
    session.role === "pt_wcf"
      ? allTasks
      : allTasks.filter((task) =>
          ["selesai_karyawan", "menunggu_review_pengawas", "ditolak_revisi"].includes(task.status),
        );
  const { tasks } = filterApprovalTasks(scopedTasks, {
    tabId: url.searchParams.get("tab") ?? undefined,
    query: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
  });

  const header = [
    "Area",
    "Tugas",
    "Checklist Pegawai",
    "Checklist Pengawas",
    "Status",
    "Keterangan",
    "Tanggal",
  ];
  const sheetData = [
    header,
    ...tasks.map((task) => [
      task.area?.name ?? "-",
      task.title,
      getEmployeeChecklistLabel(task),
      getSupervisorChecklistLabel(task),
      getApprovalStatusLabel(task.status),
      task.supervisorNote?.trim() || task.description || "-",
      task.taskDate.slice(0, 10),
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 36 },
    { wch: 20 },
    { wch: 20 },
    { wch: 28 },
    { wch: 40 },
    { wch: 16 },
  ];
  worksheet["!autofilter"] = {
    ref: "A1:G1",
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Approval");

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${createExportFilename(new Date())}"`,
      "Cache-Control": "no-store",
    },
  });
}
