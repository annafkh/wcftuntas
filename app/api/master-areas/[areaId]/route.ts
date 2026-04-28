import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteMasterArea, updateMasterArea } from "@/lib/data";
import { updateMasterAreaSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/master-areas/[areaId]">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  const payload = updateMasterAreaSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const { areaId } = await context.params;

  try {
    const area = await updateMasterArea(areaId, payload.data);
    if (!area) {
      return NextResponse.json({ error: "Master area tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ area });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui master area." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/master-areas/[areaId]">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  const { areaId } = await context.params;

  try {
    await deleteMasterArea(areaId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus master area." },
      { status: 400 },
    );
  }
}
