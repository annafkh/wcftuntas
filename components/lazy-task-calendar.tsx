"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const DynamicTaskCalendar = dynamic(
  () => import("@/components/task-calendar").then((module) => module.TaskCalendar),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-[22px] border border-slate-200/80 bg-white px-5 py-10 shadow-[0_14px_32px_rgba(15,23,42,0.045)] sm:px-6">
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
          <div className="h-[420px] animate-pulse rounded-[20px] bg-slate-100" />
        </div>
      </section>
    ),
  },
);

type TaskCalendarProps = ComponentProps<typeof DynamicTaskCalendar>;

export function LazyTaskCalendar(props: TaskCalendarProps) {
  return <DynamicTaskCalendar {...props} />;
}
