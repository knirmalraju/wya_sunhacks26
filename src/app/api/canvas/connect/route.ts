import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { authorizeUrl, oauthConfigured } from "@/lib/canvas";

// Starts "Log in with Canvas" (ASU SSO happens on Canvas's side).
export async function GET(req: NextRequest) {
  const me = await currentUser();
  const origin = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  if (!me) return NextResponse.redirect(new URL("/signin", origin));
  const back = req.nextUrl.searchParams.get("back") || "/calendar";
  if (!oauthConfigured) {
    return NextResponse.redirect(new URL(`${back}?canvasError=${encodeURIComponent("Canvas login isn't set up yet (needs a Canvas Developer Key).")}`, origin));
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(state, `${origin}/api/canvas/callback`));
  const cookie = { httpOnly: true, sameSite: "lax" as const, secure: origin.startsWith("https"), path: "/api/canvas", maxAge: 600 };
  res.cookies.set("canvas_state", state, cookie);
  res.cookies.set("canvas_back", back.startsWith("/") ? back : "/calendar", cookie);
  return res;
}
