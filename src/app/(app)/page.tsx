import Link from "next/link";
import { sendRequest, setActive } from "@/app/actions";
import { FadeIn, Item, Pulse, Stagger } from "@/components/motion";
import { QuickConnect } from "@/components/QuickConnect";
import { Avatar, Card, Eyebrow, Hidden, Icon, Logo, SectionTitle, Switch } from "@/components/ui";
import { KIND_META, agenda } from "@/lib/agenda";
import { requireUser } from "@/lib/auth";
import { STATUSES, zoneName } from "@/lib/constants";
import { db, isFriend } from "@/lib/db";
import { card, fmtTime } from "@/lib/view";
import { RequestList } from "./requests/RequestList";

function ago(ms: number) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function listify(xs: string[]) {
  return xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;
}

export default async function Home() {
  const me = await requireUser();
  const d = db();
  const others = d.users.filter((u) => u.id !== me.id);
  const friends = others.filter((u) => isFriend(me.id, u.id)).map((u) => card(me, u));
  const order = { available: 0, away: 1, busy: 2, offline: 3 } as Record<string, number>;
  friends.sort((a, b) => order[a.status] - order[b.status]);
  const onCampus = friends.filter((f) => f.status !== "offline" && f.zone && f.zone !== "off").length;
  const feed = others.map((u) => card(me, u)).filter((c) => c.post).sort((a, b) => b.score - a.score).slice(0, 12);
  const pendingOut = new Set(d.requests.filter((r) => r.from === me.id && r.status === "pending" && r.type === "quick").map((r) => r.to));
  const incoming = d.requests.filter((r) => r.to === me.id && r.status === "pending");
  const myPostLive = me.available && me.post && me.post.freeUntil > Date.now();
  const next = agenda(me, Date.now(), 3).filter((i) => i.kind !== "free").slice(0, 4);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const statusText = (s: string) => STATUSES.find((x) => x.id === s)?.label.replace("Appear offline", "Offline");

  const stats = [
    { label: "Friends on campus", value: onCampus, href: "/map", icon: "users" as const },
    { label: "Free near you", value: feed.length, href: "#feed", icon: "clock" as const },
    { label: "Requests", value: incoming.length, href: "/requests", icon: "bell" as const },
  ];

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-4 py-6 md:px-10 md:py-9">
      <div className="-mb-3 md:hidden"><Logo height={38} /></div>
      <FadeIn className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {fmtTime(Date.now())}</Eyebrow>
          <h1 className="text-[30px] leading-9 font-extrabold tracking-[-0.03em] md:text-[40px] md:leading-[48px]">{hello}, {me.name.split(" ")[0]}</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="glass flex items-center gap-3 rounded-full border border-white/70 py-2 pr-2 pl-4 shadow-[var(--shadow-card)]">
            {me.active ? <Pulse /> : <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" aria-hidden="true" />}
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold">{me.active ? "You're active" : "You're hidden"}</span>
              <span className="text-[11px] text-muted">{me.active ? "Friends can see you" : "Activity is private"}</span>
            </span>
            <Switch action={setActive} on={me.active} label="Show me as active" />
          </div>
          <Link href="/requests" aria-label={`Meetup requests, ${incoming.length} new`} className="relative flex h-12 w-12 items-center justify-center rounded-full border border-line/80 bg-white shadow-[var(--shadow-card)] md:hidden">
            <Icon name="bell" size={20} />
            {incoming.length > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-maroon text-[11px] font-bold text-white">{incoming.length}</span>}
          </Link>
        </div>
      </FadeIn>

      <Stagger className="grid grid-cols-3 gap-2.5 md:gap-4">
        {stats.map((s) => (
          <Item key={s.label} lift className="rounded-3xl border border-line/80 bg-white shadow-[var(--shadow-card)]">
            <Link href={s.href} className="flex flex-col gap-2 p-3.5 md:flex-row md:items-center md:gap-4 md:p-5">
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-maroon-tint text-maroon md:flex"><Icon name={s.icon} size={22} /></span>
              <span className="flex flex-col">
                <span className="text-[26px] leading-none font-extrabold tracking-tight md:text-3xl">{s.value}</span>
                <span className="mt-1 text-[11px] font-semibold text-muted md:text-[13px]">{s.label}</span>
              </span>
            </Link>
          </Item>
        ))}
      </Stagger>

      <section aria-label="Friends now" className="flex flex-col gap-3">
        <SectionTitle href="/map" linkText="Map">Friends now</SectionTitle>
        <Stagger className="flex gap-4 overflow-x-auto px-1 pt-1 pb-2" gap={0.04}>
          {friends.map((f) => (
            <Item key={f.id} className="shrink-0">
              <Link href={`/u/${f.username}`} className="flex w-[72px] flex-col items-center gap-1.5 text-center">
                <Avatar initials={f.initials} status={f.status} size={60} />
                <span className="mt-1 text-[13px] font-bold">{f.name.split(" ")[0]}</span>
                <span className="text-[11px] leading-tight text-muted">{f.status === "available" && f.zone ? zoneName(f.zone) : statusText(f.status)}</span>
              </Link>
            </Item>
          ))}
          {friends.length === 0 && <p className="text-sm text-muted">Follow people back to see them here.</p>}
        </Stagger>
      </section>

      <div className="flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[2_1_540px] flex-col gap-6">
          <FadeIn delay={0.1}>
            <QuickConnect available={!!myPostLive} zone={me.zone} text={myPostLive ? me.post!.text : ""} />
          </FadeIn>

          <section id="feed" className="flex scroll-mt-6 flex-col gap-4">
            <SectionTitle sub="People who share your niches, closest first">Free now, near you</SectionTitle>
            <div className="overflow-hidden rounded-3xl border border-line/80 bg-white shadow-[var(--shadow-card)]">
              {myPostLive && (
                <article className="flex gap-3 border-b border-line/70 bg-gold-tint/60 px-4 py-4 md:px-5">
                  <Avatar initials={me.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()} size={44} dark />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-sm"><span className="font-bold">You</span> <span className="text-muted">· {zoneName(me.post!.zone)} · {ago(me.post!.createdAt)}</span></p>
                    <p className="text-[15px] leading-relaxed">{me.post!.text}</p>
                    <p className="text-[13px] text-muted">Your post is live until {fmtTime(me.post!.freeUntil)}.</p>
                  </div>
                </article>
              )}
              {feed.map((p) => {
                const sent = pendingOut.has(p.id);
                return (
                  <article key={p.id} className="flex gap-3 border-b border-line/70 px-4 py-4 last:border-0 md:px-5">
                    <Link href={`/u/${p.username}`} aria-label={p.name} className="shrink-0">
                      <Avatar initials={p.initials} status="available" size={44} />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="truncate text-sm">
                        <Link href={`/u/${p.username}`} className="font-bold hover:underline">{p.name}</Link>{" "}
                        <span className="text-muted">· {zoneName(p.post!.zone)}{p.walk != null ? `, ${p.walk} min walk` : ""} · {ago(p.post!.createdAt)}</span>
                      </p>
                      <p className="text-[15px] leading-relaxed">{p.post!.text}</p>
                      <p className="text-[13px] text-muted">
                        Free until {fmtTime(p.post!.freeUntil)}
                        {p.shared.length > 0 && <> · You both like {listify(p.shared.slice(0, 3))}</>}
                      </p>
                      <form action={sendRequest} className="mt-1.5">
                        <Hidden fields={{ to: p.id }} />
                        <button type="submit" disabled={sent} className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-bold transition ${sent ? "bg-ok-tint text-ok" : "border border-line-strong text-ink hover:border-maroon hover:text-maroon"}`}>
                          {sent ? <><Icon name="check" size={16} />Request sent</> : "Ask to join"}
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
              {feed.length === 0 && !myPostLive && <p className="p-6 text-sm text-muted">Nobody has posted yet. Be the first.</p>}
            </div>
          </section>
        </div>

        <aside aria-label="Up next and requests" className="flex min-w-0 flex-[1_1_320px] flex-col gap-6 md:sticky md:top-6">
          <Card className="flex flex-col gap-3 p-5">
            <SectionTitle href="/calendar" linkText="Calendar">Up next</SectionTitle>
            {next.length === 0 && <p className="text-sm text-muted">Nothing in the next few days.</p>}
            {next.map((i) => {
              const m = KIND_META[i.kind];
              return (
                <Link key={i.id} href={i.href?.startsWith("/") ? i.href : "/calendar"} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-ground">
                  <span className="flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5" style={{ background: m.tint, color: m.text }}>
                    <span className="text-[10px] font-bold uppercase">{new Date(i.startsAt).toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span className="text-base font-extrabold">{new Date(i.startsAt).getDate()}</span>
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-bold">{i.title}</span>
                    <span className="truncate text-xs text-muted">{m.label} · {fmtTime(i.startsAt)}{i.sub ? ` · ${i.sub}` : ""}</span>
                  </span>
                </Link>
              );
            })}
          </Card>
          <div className="flex flex-col gap-3">
            <SectionTitle href="/requests" linkText="All">Requests</SectionTitle>
            <RequestList me={me} compact />
          </div>
        </aside>
      </div>
    </div>
  );
}
