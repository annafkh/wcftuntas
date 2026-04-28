import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminTaskMonitoringTable } from "@/components/admin-task-monitoring-table";
import { ShiftBadge } from "@/components/shift-badge";
import { StatusBadge } from "@/components/status-badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { QuerySelect } from "@/components/ui/query-select";
import { Card, Input, PageIntro, Select, buttonStyles } from "@/components/ui/primitives";
import { approvalTabs, filterApprovalTasks, matchesApprovalTab } from "@/lib/approval";
import { getSession } from "@/lib/auth";
import { getUsers, listMasterAreas, listTasks } from "@/lib/data";
import { TASK_TYPE_LABELS } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

function getVisiblePages(currentPage: number, totalPages: number) {
  return Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (pageNumber) =>
      Math.abs(pageNumber - currentPage) <= 1 || pageNumber === 1 || pageNumber === totalPages,
  );
}

export default async function ApprovalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  if (session.role === "karyawan") {
    redirect("/tasks");
  }

  const allTasks = await listTasks(session);
  const tasks = allTasks;
  const params = await searchParams;
  const selectedTabId = typeof params.tab === "string" ? params.tab : approvalTabs[0].id;
  const query = typeof params.q === "string" ? params.q : "";
  const statusFilter = typeof params.status === "string" ? params.status : "";
  const dateFilter = typeof params.date === "string" ? params.date : "";
  const page = typeof params.page === "string" ? Math.max(1, Number.parseInt(params.page, 10) || 1) : 1;
  const perPage = typeof params.perPage === "string" ? Math.max(5, Number.parseInt(params.perPage, 10) || 10) : 10;
  const { activeTab, tasks: filteredTasks } = filterApprovalTasks(tasks, {
    tabId: selectedTabId,
    query,
    status: statusFilter,
    date: dateFilter,
  });
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / perPage));
  const safePage = Math.min(page, totalPages);
  const activeTasks = filteredTasks.slice((safePage - 1) * perPage, safePage * perPage);
  const visiblePages = getVisiblePages(safePage, totalPages);
  const [employees, areas] = await Promise.all([
    session.role === "pt_wcf" ? getUsers("karyawan") : Promise.resolve([]),
    session.role === "pt_wcf" ? listMasterAreas() : Promise.resolve([]),
  ]);

  function buildApprovalUrl(nextPage: number, nextPerPage = perPage) {
    const nextParams = new URLSearchParams();
    nextParams.set("tab", activeTab.id);
    if (query) {
      nextParams.set("q", query);
    }
    if (statusFilter) {
      nextParams.set("status", statusFilter);
    }
    if (dateFilter) {
      nextParams.set("date", dateFilter);
    }
    if (nextPerPage !== 10) {
      nextParams.set("perPage", String(nextPerPage));
    }
    if (nextPage > 1) {
      nextParams.set("page", String(nextPage));
    }
    return `/approval?${nextParams.toString()}`;
  }

  function buildApprovalExportUrl() {
    const nextParams = new URLSearchParams();
    nextParams.set("tab", activeTab.id);
    if (query) {
      nextParams.set("q", query);
    }
    if (statusFilter) {
      nextParams.set("status", statusFilter);
    }
    if (dateFilter) {
      nextParams.set("date", dateFilter);
    }

    return `/api/approval/export?${nextParams.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow={session.role === "pt_wcf" ? "Monitoring Tugas" : "Monitoring Review Pengawas"}
        title={session.role === "pt_wcf" ? "Monitoring Tugas End-to-End" : "Antrean Review Pengawas"}
        description={
          session.role === "pt_wcf"
            ? "Pantau seluruh alur sejak tugas dibuat, dikerjakan karyawan, hingga disetujui atau direvisi oleh pengawas."
            : "Fokus pada tugas yang sudah selesai dikerjakan dan menunggu review pengawas."
        }
      />

      <Card className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {approvalTabs.map((tab) => {
              const total = tasks.filter((task) => matchesApprovalTab(task, tab)).length;
              const active = tab.id === activeTab.id;

              return (
                <Link
                  key={tab.id}
                  href={{ pathname: "/approval", query: { tab: tab.id, q: query || undefined, status: statusFilter || undefined, date: dateFilter || undefined } }}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition",
                    active
                      ? "border-sky-200 bg-sky-50 text-sky-800"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs",
                      active ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {total}
                  </span>
                </Link>
              );
            })}
          </div>

          <form className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <input type="hidden" name="tab" value={activeTab.id} />
            <Input name="q" defaultValue={query} placeholder="Cari tugas, karyawan, reviewer, atau deskripsi" className="bg-white" />
            <Select name="status" defaultValue={statusFilter} className="bg-white">
              <option value="">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="ditugaskan">Ditugaskan</option>
              <option value="selesai_karyawan">Menunggu Persetujuan Pengawas</option>
              <option value="menunggu_review_pengawas">Menunggu Persetujuan Pengawas(Revisi)</option>
              <option value="ditolak_revisi">Belum Sesuai</option>
              <option value="disetujui_pengawas">Disetujui Pengawas</option>
              <option value="selesai">Selesai</option>
            </Select>
            <Input name="date" type="date" defaultValue={dateFilter} className="bg-white" />
            <div className="flex flex-wrap gap-3">
              <button type="submit" className={buttonStyles({ variant: "primary" })}>
                Terapkan
              </button>
              <Link href={buildApprovalExportUrl()} className={buttonStyles({ variant: "primary" })}>
                Export Excel
              </Link>
              <Link
                href={{ pathname: "/approval", query: { tab: activeTab.id } }}
                className={buttonStyles({ variant: "primary" })}
              >
                Reset
              </Link>
            </div>
          </form>
        </div>
      </Card>

      {activeTasks.length === 0 ? (
        <Card className="border-dashed px-4 py-12 text-center text-sm text-slate-500">
                  Belum ada tugas pada kategori {activeTab.label}.
        </Card>
      ) : null}

      <Card className="overflow-x-auto">
        {session.role === "pt_wcf" ? (
          <AdminTaskMonitoringTable tasks={activeTasks} employees={employees} areas={areas} />
        ) : (
          <table className="responsive-table w-full min-w-[1240px] border-separate border-spacing-0">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-600">
              <tr>
                <th className="px-5 py-4 font-medium">Area</th>
                <th className="px-5 py-4 font-semibold first:rounded-tl-lg">Tugas</th>
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
              {activeTasks.map((task) => (
                <tr key={task.id} className="bg-white transition hover:bg-slate-50">
                  <td data-label="Area" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {task.area?.name ?? "-"}
                  </td>
                  <td data-label="Tugas" className="border-b border-slate-100 px-5 py-4 align-top">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950">{task.title}</p>
                      <p className="mt-1 line-clamp-2 max-w-xl text-sm leading-6 text-slate-600">
                        {task.description || "-"}
                      </p>
                    </div>
                  </td>
                  <td data-label="Karyawan" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {task.assignedToUser.name}
                  </td>
                  <td data-label="Jenis" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {TASK_TYPE_LABELS[task.type]}
                  </td>
                  <td data-label="Shift" className="border-b border-slate-100 px-5 py-4 align-top">
                    <ShiftBadge shift={task.shift} className="text-xs" />
                  </td>
                  <td data-label="Status" className="border-b border-slate-100 px-5 py-4 align-top">
                    <StatusBadge status={task.status} />
                  </td>
                  <td data-label="Deadline" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {formatDateTime(task.dueDate)}
                  </td>
                  <td data-label="Attachment" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {task.attachments.length} file
                  </td>
                  <td data-label="Reviewer" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {task.supervisorUser?.name ?? "-"}
                  </td>
                  <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4 align-top text-right">
                    <Link
                      href={`/tasks/${task.id}`}
                      className={buttonStyles({ variant: "secondary", size: "sm" })}
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Tampil</span>
              <QuerySelect
                name="perPage"
                value={String(perPage)}
                className="min-h-9! w-18! shrink-0 bg-white px-3 pr-7 text-sm"
                options={[
                  { label: "5", value: "5" },
                  { label: "10", value: "10" },
                  { label: "25", value: "25" },
                  { label: "50", value: "50" },
                ]}
              />
              <span>entries</span>
            </div>
            <p className="text-sm text-slate-500">
              Menampilkan {filteredTasks.length === 0 ? 0 : (safePage - 1) * perPage + 1}-
              {Math.min(safePage * perPage, filteredTasks.length)} dari {filteredTasks.length} tugas
            </p>
          </div>
          <Pagination className="mx-0 w-auto justify-start sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={buildApprovalUrl(safePage - 1)}
                  className={safePage <= 1 ? "pointer-events-none opacity-40" : ""}
                />
              </PaginationItem>
              {visiblePages.map((pageNumber, index) => {
                const previousPage = visiblePages[index - 1];
                const showDots = index > 0 && previousPage && pageNumber - previousPage > 1;

                return (
                  <PaginationItem key={pageNumber} className="flex items-center">
                    {showDots ? <PaginationEllipsis /> : null}
                    <PaginationLink href={buildApprovalUrl(pageNumber)} isActive={pageNumber === safePage}>
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href={buildApprovalUrl(safePage + 1)}
                  className={safePage >= totalPages ? "pointer-events-none opacity-40" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Card>
    </div>
  );
}
