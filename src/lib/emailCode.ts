import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { mutate, db } from "./db";

// Sign-in by school email: we send a 6-digit code to the .edu inbox and the
// person types it back. Only the code's hash is stored; codes last 10 minutes,
// allow 5 tries, and can be re-sent every 30 seconds.

const TTL = 10 * 60 * 1000;
const RESEND_WAIT = 30 * 1000;
const MAX_TRIES = 5;

const hash = (email: string, code: string) => createHash("sha256").update(`${email}:${code}:${process.env.NEXTAUTH_SECRET ?? ""}`).digest();

export const emailConfigured = !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

async function deliver(email: string, code: string) {
  if (!emailConfigured) {
    // No email service yet: print the code for local testing.
    console.log(`\n[wya] Sign-in code for ${email}: ${code}  (set RESEND_API_KEY + EMAIL_FROM to email it instead)\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `${code} is your wya code`,
      text: `Your wya sign-in code is ${code}. It expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
    }),
  });
  if (!res.ok) throw new Error("Couldn't send the email. Try again in a minute.");
}

export async function sendCode(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const prev = db().signInCodes?.[email];
  if (prev && Date.now() - prev.sentAt < RESEND_WAIT) return { ok: false, error: "We just sent a code. Wait a few seconds before asking for another." };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  mutate((d) => {
    d.signInCodes ??= {};
    d.signInCodes[email] = { hash: hash(email, code).toString("hex"), expiresAt: Date.now() + TTL, tries: 0, sentAt: Date.now() };
  });
  try {
    await deliver(email, code);
  } catch (e) {
    mutate((d) => { delete d.signInCodes?.[email]; });
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't send the code." };
  }
  return { ok: true };
}

export function checkCode(email: string, code: string): boolean {
  const entry = db().signInCodes?.[email];
  if (!entry || entry.expiresAt < Date.now() || entry.tries >= MAX_TRIES || !/^\d{6}$/.test(code)) return false;
  const ok = timingSafeEqual(Buffer.from(entry.hash, "hex"), hash(email, code));
  mutate((d) => {
    if (!d.signInCodes?.[email]) return;
    if (ok) delete d.signInCodes[email];
    else d.signInCodes[email].tries += 1;
  });
  return ok;
}
