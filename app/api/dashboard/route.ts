import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardData, getTaskStats } from "@/lib/data";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    dashboard: await getDashboardData(session),
    stats: await getTaskStats(),
  });
}
