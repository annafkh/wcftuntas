import { NextResponse } from "next/server";
import { deleteUser, updateUser } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validators";

export async function PATCH(request: Request, context: RouteContext<"/api/users/[userId]">) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json(
      { error: session ? "Forbidden" : "Unauthorized" },
      { status: session ? 403 : 401 },
    );
  }

  const payload = updateUserSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const { userId } = await context.params;

  try {
    const user = await updateUser(session, userId, payload.data);

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui user." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/users/[userId]">) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json(
      { error: session ? "Forbidden" : "Unauthorized" },
      { status: session ? 403 : 401 },
    );
  }

  const { userId } = await context.params;

  try {
    const deleted = await deleteUser(session, userId);

    if (!deleted) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus user." },
      { status: 400 },
    );
  }
}
