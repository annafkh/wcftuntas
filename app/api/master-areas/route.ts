import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createMasterArea, listMasterAreas } from "@/lib/data";
import { createMasterAreaSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ areas: await listMasterAreas() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  const payload = createMasterAreaSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const area = await createMasterArea(payload.data);
    return NextResponse.json({ area }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat master area." },
      { status: 400 },
    );
  }
}
