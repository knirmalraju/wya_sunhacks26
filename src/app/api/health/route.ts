import { NextResponse } from "next/server";
import { storeStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

// Shows which storage the server is using. Lists env variable names only, never values.
export async function GET() {
  return NextResponse.json(await storeStatus());
}
