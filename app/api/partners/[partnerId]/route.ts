import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deletePartner, updatePartner } from "@/lib/data";
import { updatePartnerSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/partners/[partnerId]">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  const payload = updatePartnerSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const { partnerId } = await context.params;

  try {
    const partner = await updatePartner(partnerId, payload.data);
    if (!partner) {
      return NextResponse.json({ error: "Mitra tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ partner });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui mitra." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/partners/[partnerId]">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  const { partnerId } = await context.params;

  try {
    const deleted = await deletePartner(partnerId);
    if (!deleted) {
      return NextResponse.json({ error: "Mitra tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus mitra." },
      { status: 400 },
    );
  }
}
