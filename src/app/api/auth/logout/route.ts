import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/app-auth";

export async function POST() {
  await destroyCurrentSession();
  return NextResponse.json({ success: true });
}
