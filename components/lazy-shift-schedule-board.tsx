"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const DynamicShiftScheduleBoard = dynamic(
  () => import("@/components/shift-schedule-board").then((module) => module.ShiftScheduleBoard),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="space-y-3">
          <div className="h-6 w-56 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
          <div className="h-[520px] animate-pulse rounded-[22px] bg-slate-100" />
        </div>
      </section>
    ),
  },
);

type ShiftScheduleBoardProps = ComponentProps<typeof DynamicShiftScheduleBoard>;

export function LazyShiftScheduleBoard(props: ShiftScheduleBoardProps) {
  return <DynamicShiftScheduleBoard {...props} />;
}
