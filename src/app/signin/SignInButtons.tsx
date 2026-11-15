"use client";

import { AnimatePresence, motion } from "motion/react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { btn, field } from "@/components/ui";

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function SignInButtons({ google, demo }: { google: boolean; demo: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const valid = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim());

  return (
    <div className="flex flex-col gap-3">
      <button type="button" disabled={!google} onClick={() => signIn("google", { callbackUrl: "/verify" })} className={`${btn.quiet} min-h-[54px] w-full text-[15px]`}>
        <GoogleMark />
        Continue with Google
      </button>
      <p className="text-[13px] leading-relaxed text-muted">Next, you&apos;ll confirm you&apos;re a student with ASU SSO. Only verified students get in.</p>

      {demo && (
        <>
          <button type="button" aria-expanded={showDev} onClick={() => setShowDev((s) => !s)} className="mt-1 self-start text-xs font-semibold text-muted underline-offset-2 hover:underline">
            Google keys not set up yet? Developer login
          </button>
          <AnimatePresence initial={false}>
            {showDev && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-dashed border-line-strong p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!valid) return;
                  setBusy(true);
                  signIn("dev", { email: email.trim(), name: name.trim(), callbackUrl: "/verify" });
                }}
              >
                <label htmlFor="name" className="sr-only">Full name</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name (Jon Doe)" autoComplete="name" className={field} />
                <label htmlFor="email" className="sr-only">Google email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" autoComplete="email" className={field} />
                <button type="submit" disabled={!valid || busy} className={btn.dark}>{busy ? "Signing in…" : "Continue"}</button>
              </motion.form>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
