import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createPartner, listPartners } from "@/lib/data";
import { createPartnerSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  return NextResponse.json({ partners: await listPartners() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
  }

  const payload = createPartnerSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const partner = await createPartner(payload.data);
    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat mitra." },
      { status: 400 },
    );
  }
}
