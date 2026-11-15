import "server-only";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { getUser, upsertUserFromSignIn } from "./db";
import { checkCode } from "./emailCode";
import { markVerified } from "./verify";

// Sign-in: school email + one-time code. The person enters their .edu email,
// we email a 6-digit code to that inbox (src/lib/emailCode.ts), and they type
// it back. Getting the code proves they own a school account, so only
// students get in. No passwords, no Google, no SSO.

export const studentDomain = process.env.ASU_DOMAIN || "asu.edu";

export function isStudentEmail(email: string) {
  const e = email.trim().toLowerCase();
  return process.env.REQUIRE_ASU === "true" ? e.endsWith("@" + studentDomain) : /^[^@\s]+@([a-z0-9-]+\.)*[a-z0-9-]+\.edu$/.test(e);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "email-code",
      name: "School email",
      credentials: { email: { label: "Email", type: "email" }, code: { label: "Code", type: "text" } },
      async authorize(creds) {
        const email = String(creds?.email || "").trim().toLowerCase();
        const code = String(creds?.code || "").trim();
        if (!isStudentEmail(email) || !checkCode(email, code)) return null;
        const user = upsertUserFromSignIn(email, null);
        if (!user.verified) markVerified(user.id, email, "email");
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
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

// For pages behind sign-in. Anyone without a verified school email signs in again.
export async function requireUser(opts: { allowUnfinished?: boolean } = {}) {
  const me = await currentUser();
  if (!me || !me.verified) redirect("/signin");
  if (!me.onboarded && !opts.allowUnfinished) redirect("/welcome");
  me.lastSeen = Date.now();
  return me;
}
