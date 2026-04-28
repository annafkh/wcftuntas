import { ShiftScheduleBoard } from "@/components/shift-schedule-board";
import { getSession } from "@/lib/auth";
import { getUsers, listShiftSchedules, listTaskPackages, listTaskTemplates } from "@/lib/data";
import { SHIFT_LABELS } from "@/lib/types";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const params = await searchParams;
  const filters = {
    date: typeof params.date === "string" ? params.date : undefined,
    employeeId: typeof params.employeeId === "string" ? params.employeeId : undefined,
    shift: typeof params.shift === "string" ? params.shift : undefined,
  };

  const [schedules, employees, taskTemplates, taskPackages] = await Promise.all([
    listShiftSchedules(session, filters),
    getUsers("karyawan", session),
    listTaskTemplates(),
    listTaskPackages(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
          Master Jadwal Shift
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Kelola jadwal shift dengan mudah. Terapkan filter untuk melihat jadwal berdasarkan
        </p>
        <form className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            name="date"
            type="date"
            defaultValue={filters.date}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="shift"
            defaultValue={filters.shift ?? ""}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Semua Jadwal</option>
            {Object.entries(SHIFT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            name="employeeId"
            defaultValue={filters.employeeId ?? ""}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Semua Karyawan</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Terapkan
          </button>
        </form>
      </section>

      <ShiftScheduleBoard
        initialSchedules={schedules}
        employees={employees}
        taskTemplates={taskTemplates}
        taskPackages={taskPackages}
        session={session}
      />
    </div>
  );
}
