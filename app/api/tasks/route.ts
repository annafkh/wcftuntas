import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createTask, listTasks } from "@/lib/data";
import { createTaskSchema, taskFiltersSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawFilters = {
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    assignedTo: url.searchParams.get("assignedTo") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
    shift: url.searchParams.get("shift") ?? undefined,
  };
  const parsedFilters = taskFiltersSchema.safeParse(rawFilters);

  if (!parsedFilters.success) {
    return NextResponse.json({ error: "Filter tidak valid." }, { status: 400 });
  }

  return NextResponse.json({ tasks: await listTasks(session, parsedFilters.data) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = createTaskSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const task = await createTask(session, payload.data);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat tugas." },
      { status: 400 },
    );
  }
}
