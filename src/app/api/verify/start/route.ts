import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { currentUser, googleConfigured, studentDomain } from "@/lib/auth";

// Step 2 of sign-in: "Continue with ASU SSO". This is Google sign-in locked to
// the school's Google Workspace domain (hd=asu.edu); ASU sends that through
// its own SSO page (ASURITE + Duo). We only read the verified email.
export async function GET(req: NextRequest) {
  const origin = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const me = await currentUser();
  if (!me) return NextResponse.redirect(new URL("/signin", origin));
  if (!googleConfigured) return NextResponse.redirect(new URL("/verify?error=setup", origin));

  const state = randomBytes(16).toString("hex");
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  u.searchParams.set("redirect_uri", `${origin}/api/verify/callback`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email");
  u.searchParams.set("hd", studentDomain);
  u.searchParams.set("prompt", "select_account");
  u.searchParams.set("state", state);

  const res = NextResponse.redirect(u.toString());
  res.cookies.set("verify_state", state, { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https"), path: "/api/verify", maxAge: 600 });
  return res;
}
