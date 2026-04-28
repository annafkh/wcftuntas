import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  createSessionToken,
  getSession,
} from "@/lib/auth";
import { changeUserPassword } from "@/lib/data";
import { changePasswordSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = changePasswordSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const user = await changeUserPassword(session.userId, payload.data.password);
  const updatedSession = {
    ...session,
    name: user.name,
    mustChangePassword: false,
  };

  const token = await createSessionToken(updatedSession);
  const response = NextResponse.json({ ok: true, session: updatedSession });
  attachSessionCookie(response, token);
  return response;
}
