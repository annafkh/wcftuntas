import { NextResponse } from "next/server";
import { createShiftSchedule, createShiftSchedules, listShiftSchedules } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { createShiftSchema, shiftFiltersSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedFilters = shiftFiltersSchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
    employeeId: url.searchParams.get("employeeId") ?? undefined,
    shift: url.searchParams.get("shift") ?? undefined,
  });

  if (!parsedFilters.success) {
    return NextResponse.json({ error: "Filter shift tidak valid." }, { status: 400 });
  }

  return NextResponse.json({ schedules: await listShiftSchedules(session, parsedFilters.data) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = createShiftSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  try {
    if (payload.data.employeeIds?.length) {
      const schedules = await createShiftSchedules(session, {
        date: payload.data.date,
        shift: payload.data.shift,
        employeeIds: payload.data.employeeIds,
        taskTemplateIds: payload.data.taskTemplateIds,
        note: payload.data.note,
      });

      return NextResponse.json({ schedules }, { status: 201 });
    }

    const schedule = await createShiftSchedule(session, {
      date: payload.data.date,
      shift: payload.data.shift,
      employeeId: payload.data.employeeId ?? "",
      taskTemplateIds: payload.data.taskTemplateIds,
      note: payload.data.note,
    });
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat jadwal." },
      { status: 400 },
    );
  }
}
