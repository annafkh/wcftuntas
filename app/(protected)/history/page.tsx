import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getActivities } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  if (session.role === "karyawan") {
    redirect("/tasks");
  }

  const activities = await getActivities(session);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
          History
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">Riwayat Aktivitas Task</h3>
      </section>

      <section className="space-y-4">
        {activities.map((activity) => (
          <article
            key={activity.id}
            className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6"
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{activity.task?.title}</p>
                <p className="mt-1 text-sm text-slate-600">{activity.note}</p>
              </div>
              <div className="text-sm text-slate-500">
                <p>{activity.actor?.name ?? "Unknown actor"}</p>
                <p>{formatDateTime(activity.createdAt)}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
