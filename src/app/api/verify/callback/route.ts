import { NextResponse, type NextRequest } from "next/server";
import { currentUser, isStudentEmail } from "@/lib/auth";
import { markVerified } from "@/lib/verify";

export async function GET(req: NextRequest) {
  const origin = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const fail = (code: string) => NextResponse.redirect(new URL(`/verify?error=${code}`, origin));
  const me = await currentUser();
  if (!me) return NextResponse.redirect(new URL("/signin", origin));

  const { searchParams } = req.nextUrl;
  if (searchParams.get("error")) return fail("cancelled");
  const code = searchParams.get("code");
  if (!code || searchParams.get("state") !== req.cookies.get("verify_state")?.value) return fail("expired");

  try {
    const tok = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${origin}/api/verify/callback`,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!tok.ok) return fail("failed");
    const { access_token } = await tok.json();
    const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` }, cache: "no-store" });
    if (!info.ok) return fail("failed");
    const { email, email_verified } = (await info.json()) as { email?: string; email_verified?: boolean };
    if (!email || !email_verified || !isStudentEmail(email)) return fail("notstudent");
    markVerified(me.id, email, "sso");
  } catch {
    return fail("failed");
  }
  const res = NextResponse.redirect(new URL(me.onboarded ? "/" : "/welcome", origin));
  res.cookies.delete({ name: "verify_state", path: "/api/verify" });
  return res;
}
