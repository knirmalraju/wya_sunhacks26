"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { disconnectCanvas, oauthConfigured, saveSecret, syncCanvas } from "@/lib/canvas";
import { ALL_NICHES, STATUSES, ZONES, zoneName } from "@/lib/constants";
import { flush, getUser, mutate } from "@/lib/db";
import type { Privacy } from "@/lib/types";
import { DAYS, fmtHour } from "@/lib/view";

const id = () => Math.random().toString(36).slice(2, 10);
const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
// Writes go to shared storage (Redis on Vercel); wait for them before the
// page refreshes or moves on, or the next request could read old data.
const done = async () => {
  await flush();
  revalidatePath("/", "layout");
};
const go = async (url: string): Promise<never> => {
  await flush();
  redirect(url);
};

// ---------- Activity, status, Quick Connect ----------

export async function setActive(f: FormData) {
  const me = await requireUser();
  mutate(() => { me.active = f.get("value") === "on"; });
  await done();
}

export async function setStatus(f: FormData) {
  const me = await requireUser();
  const s = str(f, "status");
  if (!STATUSES.some((x) => x.id === s)) return;
  mutate(() => {
    me.status = s as typeof me.status;
    if (s === "offline") me.active = false;
    else me.active = true;
    if (s !== "available") me.available = false;
  });
  await done();
}

export async function setOnCampus(f: FormData) {
  const me = await requireUser();
  mutate(() => {
    me.onCampus = f.get("value") === "on";
    if (!me.onCampus) me.zone = "off";
    else if (me.zone === "off") me.zone = "mu";
  });
  await done();
}

export async function postQuickConnect(f: FormData) {
  const me = await requireUser();
  const mins = Math.min(180, Math.max(15, Number(f.get("mins")) || 30));
  const onCampus = true;
  const zone = ZONES.some((z) => z.id === f.get("zone") && z.id !== "off") ? str(f, "zone") : "mu";
  // One live post per person: a new post replaces the previous one.
  mutate(() => {
    me.available = true;
    me.status = "available";
    me.active = true;
    me.onCampus = onCampus;
    me.zone = zone;
    me.post = { text: str(f, "text", 200) || "Free and around. Say hi!", zone, onCampus, createdAt: Date.now(), freeUntil: Date.now() + mins * 60000 };
  });
  await done();
}

export async function setAvailable(f: FormData) {
  const me = await requireUser();
  mutate(() => {
    me.available = f.get("value") === "on";
    if (!me.available) me.post = null;
  });
  await done();
}

// ---------- Follows, requests ----------

export async function toggleFollow(f: FormData) {
  const me = await requireUser();
  const to = str(f, "to");
  if (!getUser(to) || to === me.id) return;
  mutate((d) => {
    const i = d.follows.findIndex((x) => x.from === me.id && x.to === to);
    if (i >= 0) d.follows.splice(i, 1);
    else d.follows.push({ from: me.id, to });
  });
  await done();
}

export async function sendRequest(f: FormData) {
  const me = await requireUser();
  const to = getUser(str(f, "to"));
  if (!to || to.id === me.id) return;
  const slot = to.slots.find((s) => s.id === f.get("slotId"));
  mutate((d) => {
    const exists = d.requests.find((r) => r.from === me.id && r.to === to.id && r.status === "pending" && r.slotId === slot?.id);
    if (exists) return;
    d.requests.push({
      id: id(),
      from: me.id,
      to: to.id,
      type: slot ? "scheduled" : "quick",
      slotId: slot?.id,
      when: slot ? `${DAYS[slot.day]} ${fmtHour(slot.start)} – ${fmtHour(slot.end)}` : "Now",
      zone: slot?.zone ?? to.post?.zone ?? to.zone,
      note: str(f, "note", 200),
      status: "pending",
      createdAt: Date.now(),
    });
  });
  await done();
}

export async function respondRequest(f: FormData) {
  const me = await requireUser();
  const rid = str(f, "id");
  const accept = f.get("accept") === "1";
  mutate((d) => {
    const r = d.requests.find((x) => x.id === rid && x.to === me.id);
    if (!r || r.status !== "pending") return;
    r.status = accept ? "accepted" : "declined";
    if (accept) {
      let chat = d.chats.find((c) => c.name === null && c.members.length === 2 && c.members.includes(me.id) && c.members.includes(r.from));
      if (!chat) {
        chat = { id: id(), name: null, members: [me.id, r.from], messages: [], calendar: [] };
        d.chats.push(chat);
      }
      chat.messages.push({ id: id(), from: me.id, text: `Accepted: ${r.when} at ${zoneName(r.zone)}. See you there!`, at: Date.now() });
    }
  });
  await done();
}

// ---------- Events ----------

export async function toggleRsvp(f: FormData) {
  const me = await requireUser();
  const eid = str(f, "id");
  mutate((d) => {
    const e = d.events.find((x) => x.id === eid);
    if (!e) return;
    const i = e.attendees.indexOf(me.id);
    if (i >= 0) e.attendees.splice(i, 1);
    else if (e.attendees.length < e.capacity) e.attendees.push(me.id);
  });
  await done();
}

export async function createEvent(f: FormData) {
  const me = await requireUser();
  const title = str(f, "title", 80);
  const when = Date.parse(str(f, "when"));
  if (!title || Number.isNaN(when)) return;
  mutate((d) => {
    d.events.push({ id: id(), hostId: me.id, title, type: str(f, "type", 20) || "Hangout", zone: str(f, "zone") || "mu", startsAt: when, capacity: Math.max(2, Math.min(200, Number(f.get("capacity")) || 8)), attendees: [me.id] });
  });
  await done();
  await go("/discover?tab=events");
}

// ---------- Messages + shared calendar ----------

export async function sendMessage(f: FormData) {
  const me = await requireUser();
  const cid = str(f, "chat");
  const text = str(f, "text", 1000);
  if (!text) return;
  mutate((d) => {
    const c = d.chats.find((x) => x.id === cid && x.members.includes(me.id));
    c?.messages.push({ id: id(), from: me.id, text, at: Date.now() });
  });
  await done();
}

export async function addCalendarItem(f: FormData) {
  const me = await requireUser();
  const cid = str(f, "chat");
  const title = str(f, "title", 80);
  const when = Date.parse(str(f, "when"));
  if (!title || Number.isNaN(when)) return;
  mutate((d) => {
    const c = d.chats.find((x) => x.id === cid && x.members.includes(me.id));
    if (!c) return;
    c.calendar.push({ id: id(), title, startsAt: when, zone: str(f, "zone") || "mu", going: [me.id], addedBy: me.id });
    c.messages.push({ id: id(), from: me.id, text: `Added “${title}” to the shared calendar`, at: Date.now() });
  });
  await done();
}

export async function toggleGoing(f: FormData) {
  const me = await requireUser();
  const cid = str(f, "chat");
  const kid = str(f, "item");
  mutate((d) => {
    const k = d.chats.find((x) => x.id === cid && x.members.includes(me.id))?.calendar.find((x) => x.id === kid);
    if (!k) return;
    const i = k.going.indexOf(me.id);
    if (i >= 0) k.going.splice(i, 1);
    else k.going.push(me.id);
  });
  await done();
}

export async function openDm(f: FormData) {
  const me = await requireUser();
  const other = getUser(str(f, "to"));
  if (!other) return;
  const chatId = mutate((d) => {
    let c = d.chats.find((x) => x.name === null && x.members.length === 2 && x.members.includes(me.id) && x.members.includes(other.id));
    if (!c) {
      c = { id: id(), name: null, members: [me.id, other.id], messages: [], calendar: [] };
      d.chats.push(c);
    }
    return c.id;
  });
  await go(`/map?chat=${chatId}`);
}

// ---------- Profile, privacy, onboarding ----------

export async function updatePrivacy(f: FormData) {
  const me = await requireUser();
  const key = str(f, "key") as keyof Privacy;
  mutate(() => {
    if (key === "audience") {
      const v = str(f, "value");
      if (v === "everyone" || v === "asu" || v === "followers") me.privacy.audience = v;
    } else if (key in me.privacy) {
      (me.privacy as Record<string, unknown>)[key] = f.get("value") === "on";
    }
  });
  await done();
}

export async function saveAccount(f: FormData) {
  const me = await requireUser({ allowUnfinished: true });
  const uname = str(f, "username", 30).toLowerCase().replace(/[^a-z0-9_.]/g, "");
  let error = "";
  mutate((d) => {
    if (uname && uname !== me.username) {
      if (d.users.some((u) => u.username === uname && u.id !== me.id)) error = "taken";
      else me.username = uname;
    }
    for (const k of ["name", "major", "year", "commute", "bio"] as const) {
      if (f.has(k)) me[k] = str(f, k, k === "bio" ? 160 : 60);
    }
  });
  await done();
  const next = str(f, "next");
  if (error) await go(`${next || "/account/edit"}?error=${error}`);
  if (next) await go(next);
}

// "Log in with Canvas" (SSO) when a Developer Key is configured; otherwise a
// pasted personal access token, or demo data.
export async function linkCanvas(f: FormData) {
  const me = await requireUser({ allowUnfinished: true });
  const back = str(f, "back") || "/welcome";
  const token = str(f, "token", 500);
  if (oauthConfigured && !token) await go(`/api/canvas/connect?back=${encodeURIComponent(back)}`);
  let error = "";
  try {
    if (token) saveSecret(me.id, { access: token });
    await syncCanvas(me.id, token ? "token" : "demo");
  } catch (e) {
    if (token) saveSecret(me.id, null);
    error = e instanceof Error ? e.message : "Could not reach Canvas";
  }
  await done();
  await go(error ? `${back}?canvasError=${encodeURIComponent(error.slice(0, 160))}` : back);
}

export async function resyncCanvas(f: FormData) {
  const me = await requireUser();
  const back = str(f, "back") || "/calendar";
  let error = "";
  try {
    await syncCanvas(me.id, me.canvas?.auth);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not reach Canvas";
  }
  await done();
  if (error) await go(`${back}?canvasError=${encodeURIComponent(error.slice(0, 160))}`);
}

export async function unlinkCanvas() {
  const me = await requireUser();
  disconnectCanvas(me.id);
  await done();
}

export async function saveInterests(f: FormData) {
  const me = await requireUser({ allowUnfinished: true });
  const picked = f.getAll("niche").map(String).filter(Boolean);
  const custom = str(f, "custom", 40);
  const list = Array.from(new Set([...picked, ...(custom ? [custom] : [])])).filter((n) => ALL_NICHES.includes(n) || n === custom);
  mutate(() => {
    me.interests = list.slice(0, 20);
    me.onboarded = true;
  });
  await done();
  await go(str(f, "next") || "/");
}

export async function addSlot(f: FormData) {
  const me = await requireUser();
  const day = Number(f.get("day"));
  const start = Number(f.get("start"));
  const end = Number(f.get("end"));
  if (!(day >= 0 && day <= 6 && end > start)) return;
  mutate(() => { me.slots.push({ id: id(), day, start, end, zone: str(f, "zone") || "mu" }); });
  await done();
}

export async function removeSlot(f: FormData) {
  const me = await requireUser();
  const sid = str(f, "id");
  mutate(() => { me.slots = me.slots.filter((s) => s.id !== sid); });
  await done();
}

