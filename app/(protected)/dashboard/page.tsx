import Link from "next/link";
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
import { Input, Select, buttonStyles } from "@/components/ui/primitives";
import { getDashboardData, listPartners } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS, STATUS_LABELS, TASK_TYPE_LABELS, type TaskStatus, type TaskType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  function summarizeTasksByType<T extends { type: TaskType }>(tasks: T[]) {
    return (Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([type, label]) => ({
      type,
      label,
      total: tasks.filter((task) => task.type === type).length,
    }));
  }

  function summarizeTasksByStatus<T extends { status: TaskStatus }>(tasks: T[]) {
    return (Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([status, label]) => ({
      status,
      label,
      total: tasks.filter((task) => task.status === status).length,
    }));
  }

  function getVisiblePages(currentPage: number, totalPages: number) {
    return Array.from({ length: totalPages }, (_, index) => index + 1).filter(
      (pageNumber) =>
        Math.abs(pageNumber - currentPage) <= 1 || pageNumber === 1 || pageNumber === totalPages,
    );
  }

  const session = await getSession();
  if (!session) {
    return null;
  }

  const params = await searchParams;
  const dashboardDate = typeof params.dashboardDate === "string" ? params.dashboardDate : "";
  const partnerId = session.role === "pt_wcf" && typeof params.partner === "string" ? params.partner : "";
  const [dashboard, partners] = await Promise.all([
    getDashboardData(session, {
      date: dashboardDate || undefined,
      partnerId: partnerId || undefined,
    }),
    session.role === "pt_wcf" ? listPartners() : Promise.resolve([]),
  ]);
  const stats = {
    byStatus: summarizeTasksByStatus(dashboard.tasks),
    byType: summarizeTasksByType(dashboard.tasks),
    totalTasks: dashboard.tasks.length,
  };
  const completionRate = dashboard.summary.totalTasks
    ? Math.round((dashboard.summary.completedCount / dashboard.summary.totalTasks) * 100)
    : 0;
  const employeeQuery = typeof params.employeeQ === "string" ? params.employeeQ : "";
  const latestQuery = typeof params.latestQ === "string" ? params.latestQ : "";
  const latestStatus = typeof params.latestStatus === "string" ? params.latestStatus : "";
  const latestDate = typeof params.latestDate === "string" ? params.latestDate : "";
  const employeePage = typeof params.employeePage === "string" ? Math.max(1, Number.parseInt(params.employeePage, 10) || 1) : 1;
  const employeePerPage = typeof params.employeePerPage === "string" ? Math.max(5, Number.parseInt(params.employeePerPage, 10) || 10) : 10;
  const latestPage = typeof params.latestPage === "string" ? Math.max(1, Number.parseInt(params.latestPage, 10) || 1) : 1;
  const latestPerPage = typeof params.latestPerPage === "string" ? Math.max(5, Number.parseInt(params.latestPerPage, 10) || 10) : 10;
  const filteredEmployeeActivity = dashboard.employeeActivity.filter((item) =>
    (partnerId ? item.employee.partnerId === partnerId : true) &&
    (employeeQuery
      ? `${item.employee.name} ${item.employee.department}`.toLowerCase().includes(employeeQuery.toLowerCase())
      : true),
  );
  const filteredLatestTasks = dashboard.latestTasks.filter((task) => {
    const matchesPartner = partnerId ? task.assignedToUser.partnerId === partnerId : true;
    const matchesQuery = latestQuery
      ? `${task.title} ${task.description} ${task.assignedToUser.name} ${task.supervisorUser?.name ?? ""}`
          .toLowerCase()
          .includes(latestQuery.toLowerCase())
      : true;
    const matchesStatus = latestStatus ? task.status === latestStatus : true;
    const matchesDate = latestDate ? task.taskDate.slice(0, 10) === latestDate : true;
    return matchesPartner && matchesQuery && matchesStatus && matchesDate;
  });
  const employeeTotalPages = Math.max(1, Math.ceil(filteredEmployeeActivity.length / employeePerPage));
  const safeEmployeePage = Math.min(employeePage, employeeTotalPages);
  const employeeVisiblePages = getVisiblePages(safeEmployeePage, employeeTotalPages);
  const paginatedEmployeeActivity = filteredEmployeeActivity.slice(
    (safeEmployeePage - 1) * employeePerPage,
    safeEmployeePage * employeePerPage,
  );
  const latestTotalPages = Math.max(1, Math.ceil(filteredLatestTasks.length / latestPerPage));
  const safeLatestPage = Math.min(latestPage, latestTotalPages);
  const latestVisiblePages = getVisiblePages(safeLatestPage, latestTotalPages);
  const paginatedLatestTasks = filteredLatestTasks.slice(
    (safeLatestPage - 1) * latestPerPage,
    safeLatestPage * latestPerPage,
  );

  function buildDashboardUrl(overrides: Record<string, string | undefined>) {
    const nextParams = new URLSearchParams();
    if (employeeQuery) nextParams.set("employeeQ", employeeQuery);
    if (partnerId) nextParams.set("partner", partnerId);
    if (dashboardDate) nextParams.set("dashboardDate", dashboardDate);
    if (latestQuery) nextParams.set("latestQ", latestQuery);
    if (latestStatus) nextParams.set("latestStatus", latestStatus);
    if (latestDate) nextParams.set("latestDate", latestDate);
    if (employeePerPage !== 10) nextParams.set("employeePerPage", String(employeePerPage));
    if (employeePage > 1) nextParams.set("employeePage", String(employeePage));
    if (latestPerPage !== 10) nextParams.set("latestPerPage", String(latestPerPage));
    if (latestPage > 1) nextParams.set("latestPage", String(latestPage));
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    }
    const query = nextParams.toString();
    return `/dashboard${query ? `?${query}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-[2rem] font-semibold tracking-tight text-slate-950">
              Dashboard {ROLE_LABELS[session.role]}
            </h3>
          </div>
          {session.role === "pt_wcf" ? (
            <Link
              href="/tasks"
              className="inline-flex items-center justify-center rounded-2xl border border-blue-950 bg-blue-950 px-5 py-3 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:bg-blue-900 hover:!text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Buka Manajemen Shift
            </Link>
          ) : null}
        </div>

        <form className={`mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 ${session.role === "pt_wcf" ? "xl:grid-cols-[220px_220px_auto]" : "sm:grid-cols-[220px_auto]"}`}>
          <Input name="dashboardDate" type="date" defaultValue={dashboardDate} className="bg-white" />
          {session.role === "pt_wcf" ? (
            <Select name="partner" defaultValue={partnerId} className="bg-white">
              <option value="">Semua Mitra</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </Select>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={buttonStyles({ variant: "primary" })}>
              Terapkan
            </button>
            <Link href="/dashboard" className={buttonStyles({ variant: "primary" })}>
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Total Tugas", dashboard.summary.totalTasks],
          ["Tugas Sudah Selesai", dashboard.summary.finishedTasks],
          ["Menunggu Persetujuan Pengawas", dashboard.summary.reviewCount],
          ["Disetujui", dashboard.summary.completedCount],
          ["Belum Sesuai", dashboard.summary.revisionCount],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-5"
          >
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
            Kinerja penyelesaian
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Tingkat penyelesaian</p>
              <p className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
                {completionRate}%
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {dashboard.summary.completedCount} dari {dashboard.summary.totalTasks} tugas sudah
                selesai dan disetujui.
              </p>
            </div>

            <div className="space-y-3">
              {stats.byStatus.map((item) => (
                <div key={item.status} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-700">{item.label}</p>
                    <span className="text-sm font-semibold text-slate-950">{item.total}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                      style={{
                        width: `${stats.totalTasks ? Math.max((item.total / stats.totalTasks) * 100, item.total > 0 ? 8 : 0) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
            Komposisi Tugas
          </p>
          <div className="mt-5 space-y-3">
            {stats.byType.map((item) => (
              <div key={item.type} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-700">{item.label}</p>
                  <span className="text-sm font-semibold text-slate-950">{item.total}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{
                      width: `${stats.totalTasks ? Math.max((item.total / stats.totalTasks) * 100, item.total > 0 ? 8 : 0) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {session.role === "pt_wcf" ? (
        <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                Aktivitas Karyawan
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">Rekap Tugas per Personil</h3>
            </div>
            <span className="text-sm text-slate-400">
              {dashboard.employeeActivity.length} personil
            </span>
          </div>

          {dashboard.employeeActivity.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Belum ada data karyawan.
            </div>
          ) : (
            <>
              <form className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
                <Input
                  name="employeeQ"
                  defaultValue={employeeQuery}
                  placeholder="Cari nama personil atau mitra"
                  className="bg-white"
                />
                <Select name="partner" defaultValue={partnerId} className="bg-white">
                  <option value="">Semua Mitra</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </Select>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className={buttonStyles({ variant: "primary" })}>
                    Terapkan
                  </button>
                  <Link href="/dashboard" className={buttonStyles({ variant: "primary" })}>
                    Reset
                  </Link>
                </div>
              </form>

              <div className="mt-4 overflow-x-auto rounded-[24px] border border-slate-200">
              <table className="responsive-table min-w-[860px] table-fixed border-collapse">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <th className="px-5 py-4">Nama personil</th>
                    <th className="px-5 py-4">Total tugas</th>
                    <th className="px-5 py-4">Tugas Sudah Selesai</th>
                    <th className="px-5 py-4">Menunggu Persetujuan Pengawas</th>
                    <th className="px-5 py-4">Disetujui</th>
                    <th className="px-5 py-4">Belum Sesuai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployeeActivity.length > 0 ? (
                    paginatedEmployeeActivity.map((item) => (
                      <tr key={item.employee.id} className="transition hover:bg-blue-50/40">
                        <td data-label="Nama Personil" className="px-5 py-4 align-top">
                          <p className="font-semibold text-slate-900">{item.employee.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.employee.department}</p>
                        </td>
                        <td data-label="Total Tugas" className="px-5 py-4 align-top text-sm font-semibold text-slate-950">
                          {item.summary.totalTasks}
                        </td>
                        <td data-label="Tugas Sudah Selesai" className="px-5 py-4 align-top text-sm font-semibold text-slate-950">
                          {item.summary.finishedTasks}
                        </td>
                        <td data-label="Menunggu Persetujuan Pengawas" className="px-5 py-4 align-top text-sm font-semibold text-slate-950">
                          {item.summary.reviewCount}
                        </td>
                        <td data-label="Disetujui" className="px-5 py-4 align-top text-sm font-semibold text-slate-950">
                          {item.summary.completedCount}
                        </td>
                        <td data-label="Belum Sesuai" className="px-5 py-4 align-top text-sm font-semibold text-slate-950">
                          {item.summary.revisionCount}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                        Tidak ada personil yang sesuai dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
              <div className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>Tampil</span>
                    <QuerySelect
                      name="employeePerPage"
                      value={String(employeePerPage)}
                      className="!min-h-9 !w-[72px] shrink-0 bg-white px-3 pr-7 text-sm"
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
                    Menampilkan {filteredEmployeeActivity.length === 0 ? 0 : (safeEmployeePage - 1) * employeePerPage + 1}-
                    {Math.min(safeEmployeePage * employeePerPage, filteredEmployeeActivity.length)} dari {filteredEmployeeActivity.length} personil
                  </p>
                </div>
                <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={buildDashboardUrl({ employeePage: safeEmployeePage > 1 ? String(safeEmployeePage - 1) : undefined })}
                        className={safeEmployeePage <= 1 ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>
                    {employeeVisiblePages.map((pageNumber, index) => {
                      const previousPage = employeeVisiblePages[index - 1];
                      const showDots = index > 0 && previousPage && pageNumber - previousPage > 1;

                      return (
                        <PaginationItem key={pageNumber} className="flex items-center">
                          {showDots ? <PaginationEllipsis /> : null}
                          <PaginationLink
                            href={buildDashboardUrl({ employeePage: pageNumber > 1 ? String(pageNumber) : undefined })}
                            isActive={pageNumber === safeEmployeePage}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href={buildDashboardUrl({ employeePage: safeEmployeePage < employeeTotalPages ? String(safeEmployeePage + 1) : String(safeEmployeePage) })}
                        className={safeEmployeePage >= employeeTotalPages ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                Tugas Terbaru
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                {session.role === "pengawas" ? "Aktivitas Review Terkini" : "Aktivitas Tugas Terkini"}
              </h3>
            </div>
            <span className="text-sm text-slate-400">{dashboard.latestTasks.length} data tampil</span>
          </div>

          {dashboard.latestTasks.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Belum ada tugas yang tercatat.
            </div>
          ) : (
            <>
              <form className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
                <Input
                  name="latestQ"
                  defaultValue={latestQuery}
                  placeholder="Cari tugas, pelaksana, reviewer, atau deskripsi"
                  className="bg-white"
                />
                <Select name="latestStatus" defaultValue={latestStatus} className="bg-white">
                  <option value="">Semua Status</option>
                  <option value="draft">Draft</option>
                  <option value="ditugaskan">Ditugaskan</option>
                  <option value="selesai_karyawan">Menunggu Persetujuan Pengawas</option>
                  <option value="menunggu_review_pengawas">Menunggu Persetujuan Pengawas(Revisi)</option>
                  <option value="ditolak_revisi">Belum Sesuai</option>
                  <option value="disetujui_pengawas">Disetujui Pengawas</option>
                </Select>
                <Input name="latestDate" type="date" defaultValue={latestDate} className="bg-white" />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className={buttonStyles({ variant: "primary" })}>
                    Terapkan
                  </button>
                  <Link href="/dashboard" className={buttonStyles({ variant: "primary" })}>
                    Reset
                  </Link>
                </div>
              </form>

              <div className="mt-4 overflow-x-auto rounded-[24px] border border-slate-200">
              <table className="responsive-table min-w-[1020px] table-fixed border-collapse">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[28%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <th className="px-5 py-4">Area</th>
                    <th className="px-5 py-4">Tugas</th>
                    <th className="px-5 py-4">Pelaksana</th>
                    <th className="px-5 py-4">Nama Pengawas</th>
                    <th className="px-5 py-4">Shift</th>
                    <th className="px-5 py-4">Jadwal</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLatestTasks.length > 0 ? (
                    paginatedLatestTasks.map((task) => (
                      <tr key={task.id} className="transition hover:bg-blue-50/40">
                          <td data-label="Area" className="px-5 py-4 align-top text-sm text-slate-600">
                          {task.area?.name ?? "-"}
                        </td>
                        <td data-label="Tugas" className="px-5 py-4 align-top">
                          <Link href={`/tasks/${task.id}`} className="block">
                            <p className="font-semibold text-slate-900">{task.title}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                              {task.description.length > 88
                                ? `${task.description.slice(0, 88)}...`
                                : task.description || "-"}
                            </p>
                          </Link>
                        </td>
                        <td data-label="Pelaksana" className="px-5 py-4 align-top text-sm text-slate-600">
                          {task.assignedToUser.name}
                        </td>
                        <td data-label="Reviewer" className="px-5 py-4 align-top text-sm text-slate-600">
                          {task.supervisorUser?.name ?? "-"}
                        </td>
                        <td data-label="Shift" className="px-5 py-4 align-top">
                          <ShiftBadge shift={task.shift} className="text-xs" />
                        </td>
                        <td data-label="Jadwal" className="px-5 py-4 align-top text-sm text-slate-600">
                          {formatDate(task.taskDate)}
                        </td>
                        <td data-label="Status" className="px-5 py-4 align-top">
                          <StatusBadge status={task.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                        Tidak ada tugas yang sesuai dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
              <div className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>Tampil</span>
                    <QuerySelect
                      name="latestPerPage"
                      value={String(latestPerPage)}
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
                    Menampilkan {filteredLatestTasks.length === 0 ? 0 : (safeLatestPage - 1) * latestPerPage + 1}-
                    {Math.min(safeLatestPage * latestPerPage, filteredLatestTasks.length)} dari {filteredLatestTasks.length} tugas
                  </p>
                </div>
                <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={buildDashboardUrl({ latestPage: safeLatestPage > 1 ? String(safeLatestPage - 1) : undefined })}
                        className={safeLatestPage <= 1 ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>
                    {latestVisiblePages.map((pageNumber, index) => {
                      const previousPage = latestVisiblePages[index - 1];
                      const showDots = index > 0 && previousPage && pageNumber - previousPage > 1;

                      return (
                        <PaginationItem key={pageNumber} className="flex items-center">
                          {showDots ? <PaginationEllipsis /> : null}
                          <PaginationLink
                            href={buildDashboardUrl({ latestPage: pageNumber > 1 ? String(pageNumber) : undefined })}
                            isActive={pageNumber === safeLatestPage}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href={buildDashboardUrl({ latestPage: safeLatestPage < latestTotalPages ? String(safeLatestPage + 1) : String(safeLatestPage) })}
                        className={safeLatestPage >= latestTotalPages ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
