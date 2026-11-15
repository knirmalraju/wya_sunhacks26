import Link from "next/link";
import { signOutUrl } from "./signout";
import { linkCanvas, resyncCanvas, unlinkCanvas, updatePrivacy } from "@/app/actions";
import { Avatar, Card, Hidden, Icon, PageHeader, Switch, btn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { oauthConfigured } from "@/lib/canvas";
import type { Privacy } from "@/lib/types";

type Row = { key: keyof Privacy; label: string; desc?: string };

const PRIVACY_GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "Profile visibility",
    rows: [{ key: "privateAccount", label: "Private account", desc: "Only approved followers see your posts and details" }],
  },
  {
    title: "Location and activity",
    rows: [
      { key: "shareLocation", label: "Share my location", desc: "Building-level, with friends, only while you're active" },
      { key: "preciseLocation", label: "Precise location", desc: "Off: friends only see which building" },
      { key: "showActivity", label: "Show activity status", desc: "Let friends see when you're active" },
      { key: "showOnMap", label: "Show me on the map", desc: "Appear as a pin to friends" },
    ],
  },
  {
    title: "What others can see",
    rows: [
      { key: "showFreeTimes", label: "Open times", desc: "Only free blocks, never class names" },
      { key: "showFollowLists", label: "Followers and following lists" },
      { key: "showInterests", label: "Interests and niches" },
      { key: "showMajor", label: "Major and year" },
      { key: "dmsFromAnyone", label: "Messages from non-followers", desc: "Off: only people you follow can message you" },
      { key: "appearInSuggestions", label: "Appear in suggestions", desc: "Show up in Discover for people with shared niches" },
    ],
  },
];

const SECTIONS = [
  { id: "account", label: "Account", icon: "user" as const },
  { id: "privacy", label: "Privacy", icon: "lock" as const },
  { id: "connections", label: "Connections", icon: "link" as const },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="px-1 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">{title}</h3>
      <Card className="divide-y divide-line/70">{children}</Card>
    </div>
  );
}

export default async function Settings({ searchParams }: { searchParams: Promise<{ canvasError?: string }> }) {
  const me = await requireUser();
  const { canvasError } = await searchParams;
  const p = me.privacy;
  const initials = me.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-6 md:px-10 md:py-9">
      <PageHeader eyebrow="Your account" title="Settings" />

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <nav aria-label="Settings sections" className="-mx-4 flex gap-2 overflow-x-auto px-4 md:sticky md:top-8 md:mx-0 md:w-52 md:shrink-0 md:flex-col md:gap-1 md:px-0">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-full border border-line/80 bg-white px-4 text-sm font-semibold text-ink shadow-[var(--shadow-card)] hover:text-maroon md:border-0 md:bg-transparent md:shadow-none md:hover:bg-white">
              <Icon name={s.icon} size={18} />
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-10">
          <section id="account" className="flex scroll-mt-6 flex-col gap-3">
            <h2 className="text-[22px] font-bold tracking-[-0.015em]">Account</h2>
            <Card className="flex flex-wrap items-center gap-4 p-5">
              <Avatar initials={initials} size={56} dark />
              <div className="flex min-w-40 flex-1 flex-col">
                <span className="text-base font-bold">{me.name}</span>
                <span className="text-sm text-muted">@{me.username}</span>
              </div>
              <Link href="/account/edit" className={btn.quiet}>Edit profile</Link>
            </Card>
            <Card className="divide-y divide-line/70">
              <Link href="/account/niches" className="flex min-h-14 items-center justify-between px-5 py-3 hover:bg-ground">
                <span className="flex flex-col"><span className="text-[15px] font-semibold">Interests and niches</span><span className="text-xs text-muted">{me.interests.length} picked</span></span>
                <span aria-hidden="true" className="rotate-180 text-muted"><Icon name="back" size={18} /></span>
              </Link>
              <Link href="/account#open-times" className="flex min-h-14 items-center justify-between px-5 py-3 hover:bg-ground">
                <span className="flex flex-col"><span className="text-[15px] font-semibold">Open times</span><span className="text-xs text-muted">{me.slots.length} {me.slots.length === 1 ? "block" : "blocks"} people can request</span></span>
                <span aria-hidden="true" className="rotate-180 text-muted"><Icon name="back" size={18} /></span>
              </Link>
            </Card>
          </section>

          <section id="privacy" className="flex scroll-mt-6 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[22px] font-bold tracking-[-0.015em]">Privacy</h2>
              <p className="text-sm text-muted">You decide what people see. Changes apply right away.</p>
            </div>
            <Card className="flex flex-wrap items-center gap-4 p-4 md:p-5">
              <h3 className="flex-[1_1_200px] text-[15px] font-semibold">Who can see your profile</h3>
              <div role="radiogroup" aria-label="Profile audience" className="flex w-full gap-1 rounded-full bg-line/70 p-1 sm:w-auto">
                {([["everyone", "Everyone"], ["asu", "ASU students"], ["followers", "Followers"]] as const).map(([v, l]) => (
                  <form key={v} action={updatePrivacy} className="flex-1">
                    <Hidden fields={{ key: "audience", value: v }} />
                    <button role="radio" aria-checked={p.audience === v} className={`min-h-10 w-full cursor-pointer rounded-full px-3 text-[13px] whitespace-nowrap md:px-5 md:text-sm ${p.audience === v ? "bg-white font-bold shadow-[var(--shadow-card)]" : "font-semibold text-muted"}`}>{l}</button>
                  </form>
                ))}
              </div>
            </Card>
            {PRIVACY_GROUPS.map((g) => (
              <Group key={g.title} title={g.title}>
                {g.rows.map((r) => (
                  <div key={r.key} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">{r.label}</span>
                      {r.desc && <span className="text-xs text-muted">{r.desc}</span>}
                    </div>
                    <Switch action={updatePrivacy} on={!!p[r.key]} label={r.label} fields={{ key: r.key }} />
                  </div>
                ))}
              </Group>
            ))}
          </section>

          <section id="connections" className="flex scroll-mt-6 flex-col gap-3">
            <h2 className="text-[22px] font-bold tracking-[-0.015em]">Connections</h2>
            <Card className="divide-y divide-line/70">
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="flex flex-1 flex-col"><span className="text-[15px] font-semibold">Google account</span><span className="text-xs text-muted">{me.email}</span></span>
              </div>
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="flex flex-1 flex-col">
                  <span className="text-[15px] font-semibold">Student verification</span>
                  <span className="text-xs text-muted">{me.verified ? `${me.verified.email} · verified with ${me.verified.via === "canvas" ? "Canvas (ASU SSO)" : me.verified.via === "sso" ? "ASU SSO" : "demo check"}` : "Not verified"}</span>
                </span>
                {me.verified && <span className="flex items-center gap-1 rounded-full bg-ok-tint px-2.5 py-1 text-xs font-bold text-ok"><Icon name="check" size={14} />Verified</span>}
              </div>
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="flex min-w-40 flex-1 flex-col">
                  <span className="text-[15px] font-semibold">Canvas</span>
                  <span className="text-xs text-muted">{me.canvas?.connected ? `Connected through ${me.canvas.via === "mcp" ? "the MCP server" : me.canvas.via === "rest" ? "the Canvas API" : "demo data"} · read-only` : "Not connected"}</span>
                  {canvasError && <span role="alert" className="text-xs font-semibold text-maroon">{canvasError}</span>}
                </span>
                {me.canvas?.connected ? (
                  <div className="flex gap-2">
                    <form action={resyncCanvas}><input type="hidden" name="back" value="/settings" /><button className={`${btn.quiet} min-h-10 px-4 text-[13px]`}>Sync</button></form>
                    <form action={unlinkCanvas}><button className={`${btn.quiet} min-h-10 px-4 text-[13px] text-maroon`}>Disconnect</button></form>
                  </div>
                ) : (
                  <form action={linkCanvas}><input type="hidden" name="back" value="/settings" /><button className={`${btn.primary} min-h-10 px-4 text-[13px]`}>{oauthConfigured ? "Log in with Canvas" : "Connect"}</button></form>
                )}
              </div>
            </Card>
            <a href={signOutUrl} className={`${btn.quiet} mt-2 self-start`}>Sign out</a>
          </section>
        </div>
      </div>
    </div>
  );
}
