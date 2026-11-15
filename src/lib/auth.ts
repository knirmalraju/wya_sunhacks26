import "server-only";
import { cookies } from "next/headers";
import { ensureDeviceUser, hydrate, type SavedProfile } from "./db";

// There is no sign-in. middleware.ts gives each browser a device id cookie, and
// that id is the account. Any server can rebuild the same account from the id
// (plus the profile cookie below), so hosts like Vercel, where each request may
// land on a different server, never bounce people to a login page.
export const DEVICE_COOKIE = "wya-device";
export const PROFILE_COOKIE = "wya-profile";

function readProfile(raw: string | undefined): SavedProfile | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedProfile;
  } catch {
    return null;
  }
}

export async function currentUser() {
  const jar = await cookies();
  const device = jar.get(DEVICE_COOKIE)?.value;
  if (!device || !/^[a-z0-9-]{16,64}$/i.test(device)) return null;
  await hydrate();
  return ensureDeviceUser(device.toLowerCase(), readProfile(jar.get(PROFILE_COOKIE)?.value));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireUser(_opts: { allowUnfinished?: boolean } = {}) {
  const me = await currentUser();
  // Only possible if the browser blocks cookies.
  if (!me) throw new Error("wya needs cookies turned on to keep your account.");
  me.lastSeen = Date.now();
  return me;
}

// Remember the person's own profile in their browser, so it survives on servers
// that don't share storage. Call from server actions after profile changes.
export async function rememberProfile(me: SavedProfile) {
  const profile: SavedProfile = {
    name: me.name,
    username: me.username,
    major: me.major,
    year: me.year,
    commute: me.commute,
    bio: me.bio,
    interests: me.interests,
  };
  (await cookies()).set(PROFILE_COOKIE, JSON.stringify(profile), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
}
