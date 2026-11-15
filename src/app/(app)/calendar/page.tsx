import Link from "next/link";
import { linkCanvas, resyncCanvas } from "@/app/actions";
import { CalendarView } from "@/components/CalendarView";
import { FadeIn } from "@/components/motion";
import { Icon, PageHeader, btn } from "@/components/ui";
import { KIND_META, agenda, startOfDay } from "@/lib/agenda";
import { requireUser } from "@/lib/auth";
import { mcpConfigured, oauthConfigured } from "@/lib/canvas";

function dayLabel(offset: number, start: number) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  return new Date(start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ day?: string; canvasError?: string }> }) {
  const me = await requireUser();
  const { day = "0", canvasError } = await searchParams;
  const offset = Math.max(-30, Math.min(60, Math.round(Number(day)) || 0));
  const start = startOfDay(Date.now()) + offset * 86400000;
  const items = agenda(me, start, 7);
  const c = me.canvas;
  const via = c?.via === "mcp" ? "MCP server" : c?.via === "rest" ? "Canvas API" : "demo data";
  const label = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " – " + new Date(start + 6 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-6 md:px-10 md:py-9">
      <PageHeader eyebrow={label} title="Calendar">
        <div className="flex items-center gap-1 rounded-full border border-line/80 bg-white p-1 shadow-[var(--shadow-card)]">
          <Link href={`/calendar?day=${offset - 1}`} scroll={false} aria-label="Previous day" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ground"><Icon name="back" size={18} /></Link>
          <Link href="/calendar" scroll={false} aria-label={offset === 0 ? "Showing today" : "Back to today"} className="min-w-[104px] rounded-full bg-maroon-tint px-4 py-2 text-center text-sm font-bold text-maroon">{dayLabel(offset, start)}</Link>
          <Link href={`/calendar?day=${offset + 1}`} scroll={false} aria-label="Next day" className="flex h-10 w-10 rotate-180 items-center justify-center rounded-full hover:bg-ground"><Icon name="back" size={18} /></Link>
        </div>
      </PageHeader>

      <FadeIn className="flex flex-wrap items-center gap-4 rounded-[28px] border border-line/80 bg-white p-4 shadow-[var(--shadow-card)] md:p-5">
        <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white"><Icon name="book" size={22} /></span>
        <div className="flex min-w-48 flex-1 flex-col gap-0.5">
          <span className="font-bold">{c?.connected ? `Canvas synced through ${via}` : "Bring in your Canvas deadlines"}</span>
          <span className="text-[13px] text-muted">
            {c?.connected
              ? `${c.items?.length ?? 0} upcoming items · ${c.courses ?? 0} courses${c.auth === "sso" ? " · signed in with ASU SSO" : ""}${c.syncedAt ? ` · updated ${new Date(c.syncedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}. Only you can see these.`
              : `Sign in to Canvas with ${oauthConfigured ? "ASU SSO" : "your account"} and we'll pull deadlines${mcpConfigured ? " through the Canvas MCP server" : ""}. Only you see them.`}
          </span>
          {canvasError && <span role="alert" className="text-xs font-semibold text-maroon">{canvasError}</span>}
        </div>
        {c?.connected ? (
          <form action={resyncCanvas}>
            <input type="hidden" name="back" value="/calendar" />
            <button className={btn.quiet}><Icon name="refresh" size={18} />Sync now</button>
          </form>
        ) : (
          <form action={linkCanvas}>
            <input type="hidden" name="back" value="/calendar" />
            <button className={btn.primary}><Icon name="lock" size={18} />{oauthConfigured ? "Log in with Canvas (ASU SSO)" : "Connect Canvas"}</button>
          </form>
        )}
      </FadeIn>

      <CalendarView items={items} start={start} meta={KIND_META} />
    </div>
  );
}
