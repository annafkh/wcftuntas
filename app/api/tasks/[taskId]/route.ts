import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteTask, getTaskById, updateTask } from "@/lib/data";
import { updateTaskSchema } from "@/lib/validators";

export async function GET(_request: Request, context: RouteContext<"/api/tasks/[taskId]">) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  const task = await getTaskById(taskId, session);

  if (!task) {
    return NextResponse.json({ error: "Task tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(request: Request, context: RouteContext<"/api/tasks/[taskId]">) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = updateTaskSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const { taskId } = await context.params;
  try {
    const task = await updateTask(taskId, session, payload.data);

    if (!task) {
      return NextResponse.json({ error: "Task tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui tugas." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/tasks/[taskId]">) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await context.params;
  const deleted = await deleteTask(taskId);

  if (!deleted) {
    return NextResponse.json({ error: "Task tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
