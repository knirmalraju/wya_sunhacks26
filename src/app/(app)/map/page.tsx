import Link from "next/link";
import { addCalendarItem, sendMessage, toggleGoing } from "@/app/actions";
import { MapLoader } from "@/components/MapLoader";
import type { Pin } from "@/components/CampusMap";
import { Avatar, Hidden, Icon, btn, Select } from "@/components/ui";
import { ZoneOptions } from "@/components/ZoneOptions";
import { requireUser } from "@/lib/auth";
import { ZONES, campusOf, zoneName } from "@/lib/constants";
import { db, getUser } from "@/lib/db";
import type { Chat, User } from "@/lib/types";
import { DAYS, card, fmtDay, fmtHour, fmtTime } from "@/lib/view";

const SPOTS = [
  { id: "spot1", zone: "noble", label: "Quiet study: Noble 2nd floor", sub: "Usually has open tables" },
  { id: "spot2", zone: "hayden", label: "Hayden Library reading room", sub: "Silent floor, outlets everywhere" },
  { id: "spot3", zone: "mu", label: "MU lounge", sub: "Good for meeting up, food nearby" },
];

function jitter(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return [((h % 100) / 100) * 0.0007, (((h >> 8) % 100) / 100) * 0.0009];
}

function chatTitle(c: Chat, me: User) {
  if (c.name) return c.name;
  const other = getUser(c.members.find((m) => m !== me.id) ?? "");
  return other?.name ?? "Chat";
}

const DAY_MS = 86400000;

function dayStartOf(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Next time in the coming week when every member who shares free times is free (from their profile slots).
function commonFree(c: Chat) {
  const members = c.members.map(getUser).filter((u): u is User => !!u && u.privacy.showFreeTimes && u.slots.length > 0);
  if (members.length < 2) return null;
  const today = dayStartOf(Date.now());
  for (let i = 0; i < 7; i++) {
    const date = today + i * DAY_MS;
    const day = (new Date(date).getDay() + 6) % 7;
    for (let h = 9; h < 18; h += 0.5) {
      if (date + h * 3600000 < Date.now()) continue;
      const all = members.every((u) => u.slots.some((s) => s.day === day && s.start <= h && s.end >= h + 1));
      if (all) return { day, date, start: h, end: h + 1, count: members.length, total: c.members.length };
    }
  }
  return null;
}

export default async function MapPage({ searchParams }: { searchParams: Promise<{ chat?: string; view?: string }> }) {
  const me = await requireUser();
  const { chat: chatId, view = "chat" } = await searchParams;
  const d = db();
  const zone = (id: string) => ZONES.find((z) => z.id === id);

  const pins: Pin[] = [];
  const myZone = zone(me.zone);
  if (myZone && myZone.id !== "off") pins.push({ id: "me", kind: "me", lat: myZone.lat, lng: myZone.lng, mark: "You", label: "You", sub: zoneName(me.zone) });
  for (const u of d.users) {
    if (u.id === me.id) continue;
    const c = card(me, u);
    const z = zone(u.zone);
    if (!c.v.onMap || !z || z.id === "off") continue;
    const [a, b] = jitter(u.id);
    pins.push({ id: u.id, kind: "friend", lat: z.lat + a, lng: z.lng + b, mark: c.initials, label: `${u.name}${c.post ? " · free now" : ""}`, sub: `${zoneName(u.zone)}${c.walk != null ? ` · ${c.walk} min walk` : ""}`, href: `/u/${u.username}`, cta: "View profile" });
  }
  for (const e of d.events.filter((e) => e.startsAt > Date.now() - 3600000 && e.startsAt < Date.now() + 7 * 86400000)) {
    const z = zone(e.zone);
    if (!z || z.id === "off") continue;
    const [a, b] = jitter(e.id);
    pins.push({ id: e.id, kind: "event", lat: z.lat - a, lng: z.lng - b, mark: fmtTime(e.startsAt).replace(/:00| /g, "").replace("M", ""), label: e.title, sub: `${fmtDay(e.startsAt)} ${fmtTime(e.startsAt)} · ${e.attendees.length} of ${e.capacity} going`, href: "/discover?tab=events", cta: "RSVP" });
  }
  for (const s of SPOTS) {
    const z = zone(s.zone)!;
    pins.push({ id: s.id, kind: "spot", lat: z.lat + 0.0003, lng: z.lng - 0.0004, mark: "S", label: s.label, sub: s.sub });
  }

  const chats = d.chats
    .filter((c) => c.members.includes(me.id))
    .sort((a, b) => (b.messages.at(-1)?.at ?? 0) - (a.messages.at(-1)?.at ?? 0));
  const open = chats.find((c) => c.id === chatId) ?? null;

  const list = (
    <div className="flex flex-col">
      {chats.map((c) => {
        const last = c.messages.at(-1);
        const sender = last ? (last.from === me.id ? "You" : getUser(last.from)?.name.split(" ")[0]) : "";
        const title = chatTitle(c, me);
        return (
          <Link key={c.id} href={`/map?chat=${c.id}`} aria-current={open?.id === c.id ? "true" : undefined} className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 ${open?.id === c.id ? "bg-maroon-tint" : "hover:bg-ground"}`}>
            {c.name ? (
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink font-display font-bold text-white">{c.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</span>
            ) : (
              <Avatar initials={title.split(" ").map((x) => x[0]).join("").slice(0, 2)} size={44} />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex justify-between gap-2"><span className="text-[15px] font-bold">{title}{c.name ? ` · ${c.members.length}` : ""}</span><span className="shrink-0 text-xs text-muted">{last ? fmtTime(last.at) : ""}</span></span>
              <span className="truncate text-[13px] text-muted">{last ? `${sender}: ${last.text}` : "Say hi"}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );

  let chatView: React.ReactNode = null;
  if (open) {
    const free = commonFree(open);
    const today = dayStartOf(Date.now());
    const freeAt = free ? free.date + free.start * 3600000 : 0;
    const freeIso = free ? new Date(freeAt - new Date(freeAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
    const items = [...open.calendar].sort((a, b) => a.startsAt - b.startsAt);
    chatView = (
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
          <Link href="/map" aria-label="Back to messages" className="flex h-11 w-11 items-center justify-center md:hidden"><Icon name="back" size={20} /></Link>
          <div className="flex flex-1 flex-col">
            <h2 className="text-base font-bold">{chatTitle(open, me)}</h2>
            <span className="text-xs text-muted">{open.members.length} members</span>
          </div>
        </header>
        <div role="tablist" aria-label="Chat view" className="flex border-b border-line">
          {[["chat", "Chat"], ["cal", "Shared calendar"]].map(([v, l]) => (
            <Link key={v} role="tab" aria-selected={view === v} href={`/map?chat=${open.id}&view=${v}`} className={`flex min-h-12 flex-1 items-center justify-center border-b-[3px] text-sm font-bold ${view === v ? "border-maroon text-maroon" : "border-transparent text-muted"}`}>{l}</Link>
          ))}
        </div>
        {view === "cal" ? (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }, (_, i) => {
                const dayStart = today + i * DAY_MS;
                const has = items.some((k) => k.startsAt >= dayStart && k.startsAt < dayStart + DAY_MS);
                const isToday = i === 0;
                return (
                  <div key={i} className={`flex flex-col items-center gap-0.5 rounded-xl border border-line py-2 ${isToday ? "bg-maroon text-white" : "bg-white"}`}>
                    <span className="text-[11px] font-semibold">{DAYS[(new Date(dayStart).getDay() + 6) % 7]}</span>
                    <span className="text-base font-bold">{new Date(dayStart).getDate()}</span>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: has ? (isToday ? "#FFC627" : "#1D4E89") : "transparent" }} />
                  </div>
                );
              })}
            </div>
            {free && (
              <form action={addCalendarItem} className="flex items-center gap-2.5 rounded-2xl bg-ok-tint p-3.5">
                <Hidden fields={{ chat: open.id, title: "Group hangout", when: freeIso, zone: "mu" }} />
                <div className="flex flex-1 flex-col">
                  <span className="text-xs font-bold text-[#1F5E3C]">Everyone who shares free times is free</span>
                  <span className="text-[15px] font-bold">{DAYS[free.day]} {fmtHour(free.start)} – {fmtHour(free.end)}</span>
                  <span className="text-xs text-[#1F5E3C]">{free.count} of {free.total} members share their free times</span>
                </div>
                <button className="min-h-11 cursor-pointer rounded-full bg-ok px-3.5 text-sm font-bold text-white">Propose</button>
              </form>
            )}
            <h3 className="text-[15px] font-bold">Collective events</h3>
            {items.length === 0 && <p className="text-sm text-muted">Nothing planned yet.</p>}
            {items.map((k) => {
              const going = k.going.includes(me.id);
              return (
                <div key={k.id} className="flex items-center gap-3 rounded-3xl border border-line/80 bg-white shadow-[var(--shadow-card)] p-3.5">
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{k.title}</span>
                    <span className="text-[13px] text-muted">{fmtDay(k.startsAt)} {fmtTime(k.startsAt)} · {zoneName(k.zone)}</span>
                    <span className="text-xs font-semibold text-ok">{k.going.length} of {open.members.length} going</span>
                  </div>
                  <form action={toggleGoing}>
                    <Hidden fields={{ chat: open.id, item: k.id }} />
                    <button className={going ? btn.ok : btn.primary}>{going ? "Going" : "Join"}</button>
                  </form>
                </div>
              );
            })}
            <details className="rounded-3xl border border-line/80 bg-white shadow-[var(--shadow-card)] p-3.5">
              <summary className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold text-blue"><Icon name="cal" size={18} />Add to shared calendar</summary>
              <form action={addCalendarItem} className="mt-2 flex flex-col gap-2.5">
                <input type="hidden" name="chat" value={open.id} />
                <label htmlFor="k-title" className="text-xs font-semibold">What</label>
                <input id="k-title" name="title" required maxLength={80} placeholder="Free throw contest + tacos" className="min-h-11 rounded-2xl border border-line-strong px-3" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1"><label htmlFor="k-when" className="text-xs font-semibold">When</label><input id="k-when" name="when" type="datetime-local" required className="min-h-11 rounded-2xl border border-line-strong px-2" /></div>
                  <div className="flex flex-col gap-1"><label htmlFor="k-zone" className="text-xs font-semibold">Where</label><Select id="k-zone" name="zone"><ZoneOptions /></Select></div>
                </div>
                <button className={btn.primary}>Add for everyone</button>
              </form>
            </details>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-end gap-2.5 overflow-y-auto bg-ground p-4">
            {open.messages.slice(-40).map((m) => {
              const mine = m.from === me.id;
              const who = getUser(m.from);
              return (
                <div key={m.id} className={`flex max-w-[80%] flex-col gap-0.5 ${mine ? "self-end" : "self-start"}`}>
                  {!mine && open.name && <span className="text-[11px] text-muted">{who?.name.split(" ")[0]}</span>}
                  <span className={`px-3 py-2.5 text-sm ${mine ? "rounded-2xl rounded-br-sm bg-maroon text-white" : "rounded-2xl rounded-bl-sm border border-line bg-white"}`}>{m.text}</span>
                </div>
              );
            })}
            {open.messages.length === 0 && <p className="text-center text-sm text-muted">No messages yet.</p>}
          </div>
        )}
        <form action={sendMessage} className="flex items-center gap-2 border-t border-line bg-white p-3">
          <input type="hidden" name="chat" value={open.id} />
          <Link href={`/map?chat=${open.id}&view=cal`} aria-label="Shared calendar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-blue"><Icon name="cal" size={20} /></Link>
          <label htmlFor="msg" className="sr-only">Message</label>
          <input id="msg" name="text" autoComplete="off" required placeholder={`Message ${chatTitle(open, me)}`} className="min-h-11 min-w-0 flex-1 rounded-full border border-line-strong px-4 text-[15px]" />
          <button aria-label="Send" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-maroon text-white"><Icon name="send" size={18} /></button>
        </form>
      </div>
    );
  }

  return (
    <div className="md:flex md:h-screen md:gap-5 md:p-6">
      <section aria-label="Campus map" className={`${open ? "hidden md:block" : ""} md:min-w-0 md:flex-[3_1_520px]`}>
        <MapLoader pins={pins} startCampus={me.zone === "off" ? "tempe" : campusOf(me.zone)} className="h-[440px] md:h-[calc(100vh-48px)]" />
      </section>
      <section aria-label="Messages" className={`relative z-[600] -mt-3 flex flex-col rounded-t-[20px] bg-white md:mt-0 md:h-full md:flex-[2_1_380px] md:overflow-hidden md:rounded-[20px] md:border md:border-line ${open ? "h-[calc(100vh-76px)] md:h-full" : ""}`}>
        <div className={`${open ? "hidden md:flex" : "flex"} flex-col gap-1 px-4 pt-3 pb-2`}>
          <span aria-hidden="true" className="mb-1.5 h-[5px] w-10 self-center rounded-full bg-line-strong md:hidden" />
          <h1 className="font-display text-xl font-bold">Messages</h1>
          {list}
        </div>
        {open ? chatView : <p className="hidden p-6 text-sm text-muted md:block">Pick a chat to see messages and its shared calendar.</p>}
      </section>
    </div>
  );
}
