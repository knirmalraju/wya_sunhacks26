"use client";

import { AnimatePresence, motion } from "motion/react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestSignInCode } from "@/app/actions";
import { Icon, btn, field } from "@/components/ui";

export function SignInButtons({ domain, devCodes }: { domain: string; devCodes: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const validEmail = /^[^@\s]+@[^@\s]+\.edu$/i.test(email.trim());

  const send = () =>
    start(async () => {
      setError("");
      const r = await requestSignInCode(email);
      if (!r.ok) return setError(r.error ?? "Couldn't send the code.");
      setStep("code");
      setCode("");
      setNote(devCodes ? "Developer mode: the code is printed in the terminal running the dev server." : `We sent a 6-digit code to ${email.trim()}.`);
    });

  const verify = () =>
    start(async () => {
      setError("");
      const r = await signIn("email-code", { email: email.trim(), code, redirect: false });
      if (r?.ok && !r.error) {
        router.push("/welcome");
        router.refresh();
      } else setError("That code didn't work. Check it, or send a new one.");
    });

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === "email" ? (
        <motion.form
          key="email"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (validEmail && !pending) send();
          }}
        >
          <label htmlFor="email" className="text-xs font-semibold">School email</label>
          <input id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`jdoe@${domain}`} autoComplete="email" inputMode="email" className={field} />
          {email && !validEmail && <span className="text-xs font-semibold text-maroon">Use your school email (it ends in .edu)</span>}
          {error && <p role="alert" className="text-sm font-semibold text-maroon">{error}</p>}
          <button type="submit" disabled={!validEmail || pending} className={`${btn.primary} min-h-[54px] text-[15px]`}>
            {pending ? "Sending…" : <>Email me a code<Icon name="send" size={18} /></>}
          </button>
          <p className="text-[13px] leading-relaxed text-muted">New here? This creates your account. Only students with a .edu email can join.</p>
        </motion.form>
      ) : (
        <motion.form
          key="code"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6 && !pending) verify();
          }}
        >
          <p className="text-sm text-muted">{note}</p>
          <label htmlFor="code" className="text-xs font-semibold">6-digit code</label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            className={`${field} text-center text-2xl font-bold tracking-[0.5em]`}
          />
          {error && <p role="alert" className="text-sm font-semibold text-maroon">{error}</p>}
          <button type="submit" disabled={code.length !== 6 || pending} className={`${btn.primary} min-h-[54px] text-[15px]`}>
            {pending ? "Checking…" : "Sign in"}
          </button>
          <div className="flex justify-between text-[13px] font-semibold">
            <button type="button" onClick={() => { setStep("email"); setError(""); }} className="cursor-pointer text-muted hover:text-ink">Use a different email</button>
            <button type="button" disabled={pending} onClick={send} className="cursor-pointer text-maroon hover:underline disabled:opacity-50">Send a new code</button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
