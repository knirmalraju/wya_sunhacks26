import { linkCanvas, saveAccount } from "@/app/actions";
import { Icon, btn, field, Select } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { mcpConfigured, oauthConfigured } from "@/lib/canvas";
import { username as fromEmail } from "@/lib/seed";
import { UsernameField } from "./UsernameField";

export default async function Welcome({ searchParams }: { searchParams: Promise<{ error?: string; canvasError?: string }> }) {
  const me = await requireUser({ allowUnfinished: true });
  const { error, canvasError } = await searchParams;
  const school = me.verified?.email.includes("@") ? me.verified.email : me.email;
  const suggestions = [{ value: fromEmail(school), label: `${fromEmail(school)} · from your school email (recommended)` }];
  if (me.canvas?.asuId && me.canvas.asuId !== "unknown") suggestions.push({ value: me.canvas.asuId, label: "ASU ID from Canvas" });

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-muted">Step 2 of 3</span>
        <div aria-hidden="true" className="h-1.5 rounded-full bg-line"><div className="h-full w-2/3 rounded-full bg-maroon" /></div>
      </div>
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Set up your account</h1>
      <p className="text-sm text-muted">Verified as <strong className="text-ink">{me.verified?.email ?? me.email}</strong></p>

      <section aria-label="Connect Canvas" className="flex flex-col gap-3 rounded-[28px] border border-line/80 bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white"><Icon name="book" size={20} /></span>
          <div className="flex flex-1 flex-col">
            <span className="text-[15px] font-bold">Connect Canvas</span>
            <span className="text-xs text-muted">{oauthConfigured ? "Sign in with ASU SSO" : "Personal token or demo"}{mcpConfigured ? " · data through the Canvas MCP server" : ""}</span>
          </div>
          {me.canvas?.connected && <span className="rounded-full bg-ok-tint px-2.5 py-1 text-xs font-bold text-ok">Connected</span>}
        </div>
        {me.canvas?.connected ? (
          <p className="text-[13px] text-muted">
            {me.canvas.courses} courses · {me.canvas.items?.length ?? 0} upcoming deadlines · ASU ID {me.canvas.asuId}{me.canvas.via === "demo" ? " (demo data)" : ""}. Only you see your classes.
          </p>
        ) : (
          <form action={linkCanvas} className="flex flex-col gap-3">
            <input type="hidden" name="back" value="/welcome" />
            <p className="text-[13px] leading-relaxed text-muted">Verifies your ASU ID and adds your Canvas deadlines to your Calendar. Read-only. Class names are never shown to anyone.</p>
            {!oauthConfigured && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="token" className="text-xs font-semibold">Canvas access token (optional)</label>
                <input id="token" name="token" type="password" autoComplete="off" placeholder="Leave empty to use demo data" className={field} />
                <span className="text-[11px] text-muted">Canvas → Account → Settings → New access token. Kept on the server, never shown.</span>
              </div>
            )}
            {canvasError && <p role="alert" className="text-xs font-semibold text-maroon">{canvasError}</p>}
            <button className={btn.dark}><Icon name="lock" size={18} />{oauthConfigured ? "Log in with Canvas (ASU SSO)" : "Connect Canvas"}</button>
          </form>
        )}
      </section>

      <form action={saveAccount} className="flex flex-col gap-4">
        <input type="hidden" name="next" value="/welcome/niches" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-[13px] font-semibold">Full name</label>
          <input id="name" name="name" defaultValue={me.name} className="min-h-12 rounded-2xl border border-line-strong bg-white px-3.5" />
        </div>
        <UsernameField initial={me.username} suggestions={suggestions} />
        {error === "taken" && <p role="alert" className="text-sm font-semibold text-maroon">That username is taken. Try another.</p>}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="major" className="text-[13px] font-semibold">Major</label>
            <input id="major" name="major" defaultValue={me.major} placeholder="Computer Science" className="min-h-12 rounded-2xl border border-line-strong bg-white px-3.5" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="year" className="text-[13px] font-semibold">Year</label>
            <Select id="year" name="year" defaultValue={me.year || "Freshman"}>
              {["Freshman", "Sophomore", "Junior", "Senior", "Grad"].map((y) => <option key={y}>{y}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="commute" className="text-[13px] font-semibold">Commute from</label>
          <input id="commute" name="commute" defaultValue={me.commute} placeholder="Chandler" className="min-h-12 rounded-2xl border border-line-strong bg-white px-3.5" />
        </div>
        <button type="submit" className="min-h-[52px] cursor-pointer rounded-full bg-maroon shadow-[0_6px_16px_rgba(140,29,64,0.25)] text-base font-bold text-white">Continue</button>
      </form>
    </div>
  );
}
