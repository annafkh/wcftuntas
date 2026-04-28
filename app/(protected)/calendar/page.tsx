import { TaskCalendar } from "@/components/task-calendar";
import { getSession } from "@/lib/auth";
import { getShiftCalendarEvents } from "@/lib/data";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const events = await getShiftCalendarEvents(session);

  return (
    <div className="space-y-4">
      <section className="max-w-full rounded-[22px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.045)] sm:px-6 sm:py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 sm:text-sm">
          Kalender Harian
        </p>
        <h3 className="mt-1.5 text-[1.45rem] font-semibold tracking-tight text-slate-950 sm:text-[1.65rem]">
          Jadwal Tugas Karyawan
        </h3>
        <p className="mt-1.5 max-w-full text-sm leading-5 text-slate-600">
          Pantau distribusi shift, penugasan, dan catatan pelaksanaan harian dalam satu tampilan.
        </p>
      </section>

      <TaskCalendar events={events} session={session} />
    </div>
  );
}
