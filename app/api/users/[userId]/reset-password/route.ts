import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { adminResetUserPassword } from "@/lib/data";
import { adminResetPasswordSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  context: RouteContext<"/api/users/[userId]/reset-password">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json(
      { error: session ? "Forbidden" : "Unauthorized" },
      { status: session ? 403 : 401 },
    );
  }

  const payload = adminResetPasswordSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const { userId } = await context.params;

  try {
    const user = await adminResetUserPassword(session, userId, payload.data.password);

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal reset password user." },
      { status: 400 },
    );
  }
}
