import { NextResponse } from "next/server";
import { attachSessionCookie, createSessionToken, getSession } from "@/lib/auth";
import { findUserById } from "@/lib/data";
import { getDefaultRoute } from "@/lib/rbac";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/users/[userId]/login-as">,
) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json(
      { error: session ? "Forbidden" : "Unauthorized" },
      { status: session ? 403 : 401 },
    );
  }

  const { userId } = await context.params;
  const targetUser = await findUserById(userId);

  if (!targetUser) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  if (!targetUser.isActive) {
    return NextResponse.json({ error: "User nonaktif tidak bisa digunakan untuk Login As." }, { status: 400 });
  }

  if (targetUser.role === "pt_wcf") {
    return NextResponse.json({ error: "Login As hanya tersedia untuk karyawan dan pengawas." }, { status: 400 });
  }

  if (targetUser.id === session.userId) {
    return NextResponse.json({ error: "Tidak dapat Login As ke akun yang sedang digunakan." }, { status: 400 });
  }

  const impersonatedSession = {
    userId: targetUser.id,
    name: targetUser.name,
    username: targetUser.username,
    email: targetUser.email,
    role: targetUser.role,
    partnerId: targetUser.partnerId,
    department: targetUser.department,
    mustChangePassword: false,
    impersonatorId: session.userId,
    impersonatorName: session.name,
    impersonatorRole: session.role,
    impersonatorDepartment: session.department,
  } as const;

  const token = await createSessionToken(impersonatedSession);
  const response = NextResponse.json({
    ok: true,
    session: impersonatedSession,
    redirectTo: getDefaultRoute(targetUser.role),
  });
  attachSessionCookie(response, token);
  return response;
}
