import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteTaskPackage, updateTaskPackage } from "@/lib/data";
import { updateTaskPackageSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskPackageId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  const payload = updateTaskPackageSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const { taskPackageId } = await context.params;

  try {
    const taskPackage = await updateTaskPackage(taskPackageId, payload.data);
    if (!taskPackage) {
      return NextResponse.json({ error: "Paket master task tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ taskPackage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui paket master task." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ taskPackageId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  const { taskPackageId } = await context.params;

  try {
    await deleteTaskPackage(taskPackageId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus paket master task." },
      { status: 400 },
    );
  }
}
