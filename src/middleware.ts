import { NextResponse, type NextRequest } from "next/server";

// No sign-in: every browser gets a random device id the first time it visits,
// and that id is its account. Set here so even the very first page can use it.
const DEVICE_COOKIE = "wya-device";

export function middleware(req: NextRequest) {
  if (req.cookies.get(DEVICE_COOKIE)?.value) return NextResponse.next();
  const id = crypto.randomUUID();
  req.cookies.set(DEVICE_COOKIE, id);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next/|favicon|icon|apple-icon|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
