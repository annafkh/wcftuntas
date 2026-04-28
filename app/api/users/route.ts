import { NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { createUserSchema, userFiltersSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json(
      { error: session ? "Forbidden" : "Unauthorized" },
      { status: session ? 403 : 401 },
    );
  }

  const url = new URL(request.url);
  const parsedFilters = userFiltersSchema.safeParse({
    search: url.searchParams.get("search") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    partnerId: url.searchParams.get("partnerId") ?? undefined,
  });

  if (!parsedFilters.success) {
    return NextResponse.json({ error: "Filter user tidak valid." }, { status: 400 });
  }

  return NextResponse.json({ users: await listUsers(parsedFilters.data) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "pt_wcf") {
    return NextResponse.json(
      { error: session ? "Forbidden" : "Unauthorized" },
      { status: session ? 403 : 401 },
    );
  }

  const payload = createUserSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const user = await createUser(session, payload.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat user." },
      { status: 400 },
    );
  }
}
