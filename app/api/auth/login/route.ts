import { NextResponse } from "next/server";
import { attachSessionCookie, authenticateUser, createSessionToken } from "@/lib/auth";
import { getDefaultRoute } from "@/lib/rbac";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = loginSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const session = await authenticateUser(payload.data.identifier, payload.data.password);
  if (!session) {
    return NextResponse.json({ error: "Username/email atau password tidak sesuai." }, { status: 401 });
  }

  const token = await createSessionToken(session);
  const response = NextResponse.json({
    ok: true,
    session,
    redirectTo: session.mustChangePassword ? "/change-password" : getDefaultRoute(session.role),
  });
  attachSessionCookie(response, token);
  return response;
}
