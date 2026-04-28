import { NextResponse } from "next/server";
import { getBlueprint } from "@/lib/data";

export async function GET() {
  return NextResponse.json(getBlueprint());
}
