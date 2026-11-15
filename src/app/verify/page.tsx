import { redirect } from "next/navigation";
import { verifyDemo } from "@/app/actions";
import { signOutUrl } from "@/app/(app)/settings/signout";
import { FadeIn } from "@/components/motion";
import { Icon, Logo, btn, field } from "@/components/ui";
import { demoLoginEnabled, googleConfigured, requireUser, studentDomain } from "@/lib/auth";
import { oauthConfigured } from "@/lib/canvas";

const ERRORS: Record<string, string> = {
  notstudent: `That account isn't a student account. Use your @${studentDomain} account.`,
  cancelled: "Sign-in was cancelled. Try again when you're ready.",
  expired: "That sign-in link expired. Try again.",
  failed: "We couldn't confirm your account. Try again.",
  setup: "ASU SSO isn't set up yet (needs the Google OAuth keys).",
};

export default async function Verify({ searchParams }: { searchParams: Promise<{ error?: string; canvasError?: string }> }) {
  const me = await requireUser({ allowUnfinished: true, allowUnverified: true });
  if (me.verified) redirect(me.onboarded ? "/" : "/welcome");
  const { error, canvasError } = await searchParams;

  return (
    <div className="canvas-glow flex min-h-screen flex-col items-center px-5 py-8">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Logo />
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-muted">Step 1 of 3</span>
          <div aria-hidden="true" className="h-1.5 rounded-full bg-line"><div className="h-full w-1/3 rounded-full bg-maroon" /></div>
        </div>
        <FadeIn className="flex flex-col gap-5 rounded-[32px] border border-line/80 bg-white p-6 shadow-[var(--shadow-float)]">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-maroon-tint text-maroon"><Icon name="lock" size={24} /></span>
          <div className="flex flex-col gap-2">
            <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.03em]">Confirm you&apos;re a student</h1>
            <p className="text-[15px] leading-relaxed text-muted">
              Layover is only for students. You&apos;re signed in with <strong className="text-ink">{me.email}</strong>. Now sign in with your ASU account so we can confirm it. We only read your school email.
            </p>
          </div>
          {(error || canvasError) && <p role="alert" className="rounded-2xl bg-maroon-tint p-3 text-sm font-semibold text-maroon">{error ? ERRORS[error] ?? ERRORS.failed : canvasError}</p>}

          {googleConfigured ? (
            <a href="/api/verify/start" className={`${btn.primary} min-h-[52px]`}><Icon name="lock" size={19} />Continue with ASU SSO</a>
          ) : (
            <button disabled className={`${btn.primary} min-h-[52px]`}><Icon name="lock" size={19} />Continue with ASU SSO</button>
          )}
          {oauthConfigured && (
            <a href="/api/canvas/connect?back=/welcome" className={`${btn.quiet} min-h-[52px]`}><Icon name="book" size={19} />Log in with Canvas instead</a>
          )}

          {demoLoginEnabled && (
            <details className="rounded-2xl border border-dashed border-line-strong p-4">
              <summary className="cursor-pointer text-[13px] font-semibold text-muted">Developer mode: verify without SSO</summary>
              <form action={verifyDemo} className="mt-3 flex flex-col gap-2.5">
                <label htmlFor="edu" className="text-xs font-semibold">School email (.edu)</label>
                <input id="edu" name="email" type="email" required placeholder={`jdoe@${studentDomain}`} className={field} />
                <button className={btn.dark}>Verify</button>
                <p className="text-[11px] text-muted">Only shown while Google OAuth keys are missing. Turns off automatically once they&apos;re added.</p>
              </form>
            </details>
          )}
        </FadeIn>
        <a href={signOutUrl} className="self-center text-sm font-semibold text-muted hover:text-ink">Use a different Google account</a>
      </div>
    </div>
  );
}
