import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { exchangeCode, saveSecret, syncCanvas } from "@/lib/canvas";

export async function GET(req: NextRequest) {
  const origin = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const back = req.cookies.get("canvas_back")?.value || "/calendar";
  const fail = (msg: string) => NextResponse.redirect(new URL(`${back}?canvasError=${encodeURIComponent(msg)}`, origin));

  const me = await currentUser();
  if (!me) return NextResponse.redirect(new URL("/signin", origin));
  const { searchParams } = req.nextUrl;
  if (searchParams.get("error")) return fail("Canvas sign-in was cancelled.");
  const code = searchParams.get("code");
  if (!code || searchParams.get("state") !== req.cookies.get("canvas_state")?.value) return fail("Canvas sign-in expired. Try again.");

  try {
    saveSecret(me.id, await exchangeCode(code, `${origin}/api/canvas/callback`));
    await syncCanvas(me.id, "sso");
  } catch (e) {
    return fail(e instanceof Error ? e.message.slice(0, 160) : "Couldn't reach Canvas.");
  }
  const res = NextResponse.redirect(new URL(back, origin));
  res.cookies.delete({ name: "canvas_state", path: "/api/canvas" });
  res.cookies.delete({ name: "canvas_back", path: "/api/canvas" });
  return res;
}
