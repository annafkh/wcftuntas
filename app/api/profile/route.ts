import { NextResponse } from "next/server";
import { attachSessionCookie, createSessionToken, getSession } from "@/lib/auth";
import { updateUserProfile } from "@/lib/data";
import { updateProfileSchema } from "@/lib/validators";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = updateProfileSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  const user = await updateUserProfile(session.userId, payload.data);

  const updatedSession = {
    ...session,
    name: user.name,
  };

  const token = await createSessionToken(updatedSession);
  const response = NextResponse.json({ ok: true, session: updatedSession });
  attachSessionCookie(response, token);
  return response;
}
