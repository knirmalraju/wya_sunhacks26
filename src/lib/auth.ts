import "server-only";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { getUser, upsertUserFromSignIn } from "./db";

// Sign-in is a two-step check:
//   1. Google account (any account) via NextAuth.
//   2. Student verification: ASU SSO (Google sign-in locked to the school's
//      domain, which ASU routes through its own SSO) or "Log in with Canvas".
// Nobody gets into the app until step 2 proves a .edu identity.

export const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
// The developer login exists so the app runs before Google keys are added. It
// never shows once Google is configured, and can be turned off entirely.
export const demoLoginEnabled = !googleConfigured && process.env.DISABLE_DEMO_LOGIN !== "true";
export const providersAvailable = { google: googleConfigured, demo: demoLoginEnabled };
export const studentDomain = process.env.ASU_DOMAIN || "asu.edu";

const providers: NextAuthOptions["providers"] = [];
if (googleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "select_account" } },
    }),
  );
}
if (demoLoginEnabled) {
  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Developer login",
      credentials: { email: { label: "Email", type: "email" }, name: { label: "Name", type: "text" } },
      async authorize(creds) {
        const email = String(creds?.email || "").trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return null;
        const user = upsertUserFromSignIn(email, creds?.name ? String(creds.name) : null);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async signIn({ user }) {
      return !!user.email;
    },
    async jwt({ token, user }) {
      if (user?.email) token.uid = upsertUserFromSignIn(user.email, user.name).id;
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

// For pages behind sign-in: unverified people go to verification, then setup.
export async function requireUser(opts: { allowUnfinished?: boolean; allowUnverified?: boolean } = {}) {
  const me = await currentUser();
  if (!me) redirect("/signin");
  if (!me.verified && !opts.allowUnverified) redirect("/verify");
  if (!me.onboarded && !opts.allowUnfinished) redirect("/welcome");
  me.lastSeen = Date.now();
  return me;
}

export function isStudentEmail(email: string) {
  const e = email.trim().toLowerCase();
  return process.env.REQUIRE_ASU === "true" ? e.endsWith("@" + studentDomain) : /\.edu$/.test(e.split("@")[1] ?? "");
}
