import { NextResponse } from "next/server";
import { attachSessionCookie, createSessionToken, getSession } from "@/lib/auth";
import { findUserById } from "@/lib/data";
import { getDefaultRoute } from "@/lib/rbac";

export async function POST() {
  const session = await getSession();
  if (!session?.impersonatorId) {
    return NextResponse.json({ error: "Tidak ada sesi Login As yang aktif." }, { status: 400 });
  }

  const adminUser = await findUserById(session.impersonatorId);
  if (!adminUser || !adminUser.isActive || adminUser.role !== "pt_wcf") {
    return NextResponse.json({ error: "Akun admin asal tidak valid atau sudah tidak aktif." }, { status: 400 });
  }

  const adminSession = {
    userId: adminUser.id,
    name: adminUser.name,
    username: adminUser.username,
    email: adminUser.email,
    role: adminUser.role,
    partnerId: adminUser.partnerId,
    department: adminUser.department,
    mustChangePassword: adminUser.mustChangePassword,
  } as const;

  const token = await createSessionToken(adminSession);
  const response = NextResponse.json({
    ok: true,
    session: adminSession,
    redirectTo: getDefaultRoute(adminUser.role),
  });
  attachSessionCookie(response, token);
  return response;
}
