import "server-only";
import { zoneName } from "./constants";
import { db, getUser } from "./db";
import type { User } from "./types";

export type AgendaKind = "assignment" | "canvas" | "event" | "group" | "meetup" | "free";

export type AgendaItem = {
  id: string;
  kind: AgendaKind;
  title: string;
  startsAt: number;
  endsAt?: number;
  sub?: string;
  href?: string;
};

export const KIND_META: Record<AgendaKind, { label: string; color: string; tint: string; text: string }> = {
  assignment: { label: "Due", color: "#EF4444", tint: "#FEE2E2", text: "#B91C1C" },
  canvas: { label: "Class", color: "#1D4E89", tint: "#E0ECFB", text: "#1D4E89" },
  event: { label: "Event", color: "#8C1D40", tint: "#FCE8EF", text: "#8C1D40" },
  group: { label: "Group", color: "#7C3AED", tint: "#EDE9FE", text: "#5B21B6" },
  meetup: { label: "Meetup", color: "#F59E0B", tint: "#FFF1C2", text: "#7A5200" },
  free: { label: "Open time", color: "#10B981", tint: "#D1FAE5", text: "#065F46" },
};

const DAY = 86400000;

export function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Next date (from `from`) that falls on weekday `day` (0 = Mon), at `hour`.
function nextOn(day: number, hour: number, from: number) {
  const base = startOfDay(from);
  for (let i = 0; i < 8; i++) {
    const t = base + i * DAY;
    if ((new Date(t).getDay() + 6) % 7 === day && t + hour * 3600000 >= from - 3600000) return t + hour * 3600000;
  }
  return base + hour * 3600000;
}

function parseWhen(label: string): { day: number; start: number; end: number } | null {
  const m = label.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\s+(\d{1,2})(?::(\d\d))?\s*(AM|PM)?\s*[–-]\s*(\d{1,2})(?::(\d\d))?\s*(AM|PM)/i);
  if (!m) return null;
  const to24 = (h: string, mm: string | undefined, ap: string) => (Number(h) % 12) + (ap.toUpperCase() === "PM" ? 12 : 0) + (mm ? Number(mm) / 60 : 0);
  const day = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].indexOf(m[1].toLowerCase());
  const end = to24(m[5], m[6], m[7]);
  const start = to24(m[2], m[3], m[4] ?? m[7]);
  return day >= 0 && end > start ? { day, start, end } : null;
}

// Everything on the student's plate: Canvas (private), events they RSVP'd,
// group-chat calendar items they're going to, accepted meetups, and open time.
export function agenda(me: User, from: number, days: number): AgendaItem[] {
  const to = from + days * DAY;
  const d = db();
  const out: AgendaItem[] = [];

  for (const c of me.canvas?.items ?? []) {
    out.push({ id: `cv-${c.id}`, kind: c.kind === "assignment" ? "assignment" : "canvas", title: c.title, startsAt: c.startsAt, endsAt: c.endsAt, sub: c.course, href: c.url });
  }
  for (const e of d.events) {
    if (e.attendees.includes(me.id)) out.push({ id: `ev-${e.id}`, kind: "event", title: e.title, startsAt: e.startsAt, endsAt: e.startsAt + 90 * 60000, sub: `${zoneName(e.zone)} · ${e.attendees.length} going`, href: "/discover?tab=events" });
  }
  for (const c of d.chats.filter((c) => c.members.includes(me.id))) {
    for (const k of c.calendar) {
      if (k.going.includes(me.id)) out.push({ id: `gc-${k.id}`, kind: "group", title: k.title, startsAt: k.startsAt, endsAt: k.startsAt + 90 * 60000, sub: `${c.name ?? "Chat"} · ${zoneName(k.zone)}`, href: `/map?chat=${c.id}&view=cal` });
    }
  }
  for (const r of d.requests.filter((r) => r.status === "accepted" && (r.from === me.id || r.to === me.id))) {
    const other = getUser(r.from === me.id ? r.to : r.from);
    const slot = r.slotId ? (getUser(r.to)?.slots.find((s) => s.id === r.slotId) ?? getUser(r.from)?.slots.find((s) => s.id === r.slotId)) : undefined;
    // Older scheduled requests without a slot id: read the weekday and time from their label ("Thu 4:00 – 6:00 PM").
    const parsed = !slot && r.type === "scheduled" ? parseWhen(r.when) : null;
    const s = slot ?? parsed;
    const start = s ? nextOn(s.day, s.start, r.createdAt) : r.createdAt;
    const end = s ? start + (s.end - s.start) * 3600000 : start + 30 * 60000;
    out.push({ id: `mt-${r.id}`, kind: "meetup", title: `Meet ${other?.name.split(" ")[0] ?? "someone"}`, startsAt: start, endsAt: end, sub: zoneName(r.zone), href: other ? `/u/${other.username}` : undefined });
  }
  for (const s of me.slots) {
    for (let t = nextOn(s.day, s.start, from); t < to; t += 7 * DAY) {
      out.push({ id: `fr-${s.id}-${t}`, kind: "free", title: "Open for meetups", startsAt: t, endsAt: t + (s.end - s.start) * 3600000, sub: zoneName(s.zone), href: "/account" });
    }
  }
  return out.filter((i) => (i.endsAt ?? i.startsAt) >= from && i.startsAt < to).sort((a, b) => a.startsAt - b.startsAt);
}
