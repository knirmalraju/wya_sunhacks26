import Link from "next/link";
import { createEvent, toggleFollow, toggleRsvp } from "@/app/actions";
import { Avatar, Card, Chip, Hidden, Icon, btn, Select } from "@/components/ui";
import { ZoneOptions } from "@/components/ZoneOptions";
import { requireUser } from "@/lib/auth";
import { EVENT_TYPES, NICHE_GROUPS, RELATED, zoneName } from "@/lib/constants";
import { db, isFollowing } from "@/lib/db";
import { card, fmtDay, fmtTime } from "@/lib/view";

export default async function Discover({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const me = await requireUser();
  const { tab = "people", q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const d = db();
  const hit = (...xs: string[]) => !query || xs.some((x) => x.toLowerCase().includes(query));

  const people = d.users
    .filter((u) => u.id !== me.id && u.privacy.appearInSuggestions)
    .map((u) => card(me, u))
    .filter((c) => c.v.profile && hit(c.name, c.username, c.major, ...c.interests))
    .sort((a, b) => b.score - a.score)
    .slice(0, query ? 30 : 9);

  const myGroups = NICHE_GROUPS.map((g) => {
    const mine = g.niches.filter((n) => me.interests.includes(n));
    const students = d.users.filter((u) => u.interests.some((i) => g.niches.includes(i))).length;
    const suggest = Array.from(new Set(mine.flatMap((n) => RELATED[n] ?? []))).filter((n) => !me.interests.includes(n)).slice(0, 3);
    return { name: g.name, mine, students, suggest };
  }).filter((g) => g.mine.length && hit(g.name, ...g.mine));

  const events = d.events
    .filter((e) => e.startsAt > Date.now() - 2 * 3600000 && hit(e.title, e.type, zoneName(e.zone)))
    .sort((a, b) => {
      const ra = a.niche && me.interests.includes(a.niche) ? 0 : 1;
      const rb = b.niche && me.interests.includes(b.niche) ? 0 : 1;
      return ra - rb || a.startsAt - b.startsAt;
    });

  const tabLink = (t: string) => `/discover?tab=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const defaultWhen = new Date(Date.now() + 3600000);
  defaultWhen.setMinutes(0, 0, 0);
  const localIso = new Date(defaultWhen.getTime() - defaultWhen.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 py-5 md:px-10 md:py-8">
      <form action="/discover" className="flex flex-col gap-1.5">
        <input type="hidden" name="tab" value={tab} />
        <label htmlFor="q" className="text-[13px] font-semibold">Search people and events</label>
        <div className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-line-strong bg-white px-4 md:min-h-14">
          <span className="text-muted"><Icon name="search" size={20} /></span>
          <input id="q" name="q" type="search" defaultValue={q} placeholder={`Try "pickup hoops", "Maya" or "Assassin's Creed"`} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none md:text-base" />
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="hidden text-3xl font-extrabold tracking-[-0.03em] md:block">Discover</h1>
        <div role="tablist" aria-label="Show" className="flex flex-1 gap-1 rounded-full bg-line/70 p-1 md:flex-none">
          {[["people", "People"], ["events", "Events"]].map(([t, l]) => (
            <Link key={t} role="tab" aria-selected={tab === t} href={tabLink(t)} className={`flex min-h-11 flex-1 items-center justify-center rounded-full px-6 text-sm ${tab === t ? "bg-white font-bold" : "font-semibold text-muted"}`}>{l}</Link>
          ))}
        </div>
      </div>

      {tab === "people" ? (
        <>
          {myGroups.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-bold">Your niche groups</h2>
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                {myGroups.map((g) => (
                  <Card key={g.name} className="flex flex-col gap-2 p-4">
                    <div className="flex items-baseline justify-between"><span className="text-base font-bold">{g.name}</span><span className="text-xs text-muted">{g.students} students</span></div>
                    <div className="flex flex-wrap gap-1.5">{g.mine.map((n) => <Link key={n} href={`/discover?q=${encodeURIComponent(n)}`}><Chip>{n}</Chip></Link>)}</div>
                    {g.suggest.length > 0 && <span className="text-[13px] text-muted">Suggested: {g.suggest.join(" · ")} · <Link href="/account/niches" className="font-semibold text-maroon">Add</Link></span>}
                  </Card>
                ))}
              </div>
            </section>
          )}
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-bold">{query ? `People matching “${q}”` : "Suggested people"}</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
              {people.map((p) => {
                const following = isFollowing(me.id, p.id);
                return (
                  <Card key={p.id} className="flex items-center gap-3 p-3.5">
                    <Avatar initials={p.initials} size={46} />
                    <Link href={`/u/${p.username}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{p.name}</span>
                      {p.major && <span className="truncate text-xs text-muted">{p.major}</span>}
                      <span className="truncate text-xs font-semibold text-maroon">{p.shared.length ? p.shared.join(" · ") : p.interests.slice(0, 2).join(" · ")}</span>
                    </Link>
                    <form action={toggleFollow}>
                      <Hidden fields={{ to: p.id }} />
                      <button className={`${following ? btn.outline : btn.primary} min-h-10 px-3.5 text-[13px]`}>{following ? "Following" : "Follow"}</button>
                    </form>
                  </Card>
                );
              })}
              {people.length === 0 && <p className="text-sm text-muted">No one matches that yet.</p>}
            </div>
          </section>
        </>
      ) : (
        <>
          <details className="rounded-3xl border border-line/80 bg-white shadow-[var(--shadow-card)] p-4 open:pb-5">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold text-maroon"><Icon name="plus" size={18} />Create an event</summary>
            <form action={createEvent} className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <label htmlFor="ev-title" className="text-[13px] font-semibold">Title</label>
                <input id="ev-title" name="title" required maxLength={80} placeholder="Assassin's Creed co-op night" className="min-h-11 rounded-2xl border border-line-strong px-3" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ev-type" className="text-[13px] font-semibold">Type</label>
                <Select id="ev-type" name="type">{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ev-zone" className="text-[13px] font-semibold">Where</label>
                <Select id="ev-zone" name="zone"><ZoneOptions /></Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ev-when" className="text-[13px] font-semibold">When</label>
                <input id="ev-when" name="when" type="datetime-local" required defaultValue={localIso} className="min-h-11 rounded-2xl border border-line-strong px-3" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ev-cap" className="text-[13px] font-semibold">Spots</label>
                <input id="ev-cap" name="capacity" type="number" min={2} max={200} defaultValue={8} className="min-h-11 rounded-2xl border border-line-strong px-3" />
              </div>
              <button type="submit" className={`${btn.primary} self-end md:col-span-2`}>Post event</button>
            </form>
          </details>
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {events.map((e) => {
              const going = e.attendees.includes(me.id);
              const full = !going && e.attendees.length >= e.capacity;
              return (
                <Card key={e.id} className="flex items-center gap-3 p-3.5 md:flex-col md:items-stretch">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-maroon-tint py-2 text-maroon">
                      <span className="text-[11px] font-bold uppercase">{fmtDay(e.startsAt)}</span>
                      <span className="font-display text-[15px] font-bold">{fmtTime(e.startsAt).replace(/ (AM|PM)/, "")}</span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-xs font-bold text-muted">{e.type}{e.niche && me.interests.includes(e.niche) ? " · for you" : ""}</span>
                      <span className="text-[15px] font-bold">{e.title}</span>
                      <span className="text-xs text-muted">{zoneName(e.zone)} · {e.attendees.length} of {e.capacity} going</span>
                    </div>
                  </div>
                  <form action={toggleRsvp}>
                    <Hidden fields={{ id: e.id }} />
                    <button disabled={full} className={`${going ? btn.ok : btn.primary} w-full min-w-[72px]`}>{going ? "Going" : full ? "Full" : "RSVP"}</button>
                  </form>
                </Card>
              );
            })}
          </div>
          <Link href="/map" className="flex min-h-11 items-center justify-center text-sm font-bold text-maroon">See events on the map</Link>
        </>
      )}
    </div>
  );
}
