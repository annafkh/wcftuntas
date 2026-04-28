import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markNotificationAsRead } from "@/lib/data";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/notifications/[notificationId]">,
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await context.params;

  try {
    await markNotificationAsRead(notificationId, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menandai notifikasi." },
      { status: 400 },
    );
  }
}
