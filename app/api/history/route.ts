import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getActivities } from "@/lib/data";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role === "karyawan") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ activities: await getActivities(session) });
}
