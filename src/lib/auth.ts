import "server-only";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { getUser, upsertDeviceUser } from "./db";

// Sign-in is one button. The browser keeps a random device id (localStorage)
// and sends it on sign-in; each device id is one account, so the same browser
// always comes back to the same profile. There's no email, password or SSO,
// which means anyone with the link can join (fine for a demo).

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "device",
      name: "Get started",
      credentials: { device: { label: "Device", type: "text" } },
      async authorize(creds) {
        const device = String(creds?.device || "").trim().toLowerCase();
        if (!/^[a-z0-9-]{16,64}$/.test(device)) return null;
        const user = upsertDeviceUser(device);
        return { id: user.id, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 365 },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      (session as { uid?: string }).uid = token.uid as string | undefined;
      return session;
    },
  },
};

export async function currentUser() {
  const session = await getServerSession(authOptions);
  const uid = (session as { uid?: string } | null)?.uid;
  return uid ? getUser(uid) : null;
}

// For pages behind sign-in. New accounts finish setup first.
export async function requireUser(opts: { allowUnfinished?: boolean } = {}) {
  const me = await currentUser();
  if (!me) redirect("/signin");
  if (!me.onboarded && !opts.allowUnfinished) redirect("/welcome");
  me.lastSeen = Date.now();
  return me;
}
