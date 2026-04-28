import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markAllNotificationsAsRead } from "@/lib/data";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await markAllNotificationsAsRead(session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menandai semua notifikasi." },
      { status: 400 },
    );
  }
}
