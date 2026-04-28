import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteTaskTemplate, updateTaskTemplate } from "@/lib/data";
import { updateTaskTemplateSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/master-tasks/[taskTemplateId]">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  const payload = updateTaskTemplateSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const { taskTemplateId } = await context.params;

  try {
    const taskTemplate = await updateTaskTemplate(taskTemplateId, payload.data);
    if (!taskTemplate) {
      return NextResponse.json({ error: "Master task tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ taskTemplate });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui master task." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/master-tasks/[taskTemplateId]">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  const { taskTemplateId } = await context.params;

  try {
    await deleteTaskTemplate(taskTemplateId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus master task." },
      { status: 400 },
    );
  }
}
