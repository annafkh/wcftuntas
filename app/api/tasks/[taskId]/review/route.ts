import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTaskById, reviewTask } from "@/lib/data";
import { reviewTaskSchema } from "@/lib/validators";

export async function POST(request: Request, context: RouteContext<"/api/tasks/[taskId]/review">) {
  const session = await getSession();
  if (!session || session.role !== "pengawas") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await context.params;
  const existing = await getTaskById(taskId, session);
  if (!existing) {
    return NextResponse.json({ error: "Task tidak ditemukan." }, { status: 404 });
  }

  const payload = reviewTaskSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const task = await reviewTask(taskId, session, payload.data);
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses review." },
      { status: 400 },
    );
  }
}
