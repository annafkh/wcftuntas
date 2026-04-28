import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteShiftSchedule, updateShiftSchedule } from "@/lib/data";
import { updateShiftSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/shifts/[shiftId]">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json(
      { error: session ? "Forbidden" : "Unauthorized" },
      { status: session ? 403 : 401 },
    );
  }

  const payload = updateShiftSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const { shiftId } = await context.params;

  try {
    const schedule = await updateShiftSchedule(shiftId, session, payload.data);

    if (!schedule) {
      return NextResponse.json({ error: "Jadwal shift tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui jadwal." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/shifts/[shiftId]">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { shiftId } = await context.params;
  const deleted = await deleteShiftSchedule(shiftId);

  if (!deleted) {
    return NextResponse.json({ error: "Jadwal shift tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
