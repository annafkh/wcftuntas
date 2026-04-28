import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { takeOverShiftTasks } from "@/lib/data";
import { takeOverShiftSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  context: RouteContext<"/api/shifts/[shiftId]/takeover">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json(
      { error: session ? "Forbidden" : "Unauthorized" },
      { status: session ? 403 : 401 },
    );
  }

  const payload = takeOverShiftSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const { shiftId } = await context.params;

  try {
    const result = await takeOverShiftTasks(shiftId, session, payload.data);

    if (!result) {
      return NextResponse.json({ error: "Jadwal shift tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal melakukan take over task." },
      { status: 400 },
    );
  }
}
