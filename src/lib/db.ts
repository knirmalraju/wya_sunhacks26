import "server-only";
import fs from "node:fs";
import path from "node:path";
import { after } from "next/server";
import { buildSeed, welcomeData, username as usernameFromEmail } from "./seed";
import { DEFAULT_PRIVACY, type DB, type User } from "./types";

// A tiny JSON database. Locally it's a file in data/. On Vercel every request
// can land on a different serverless instance with its own memory, so the data
// lives in Redis (Upstash, via the Vercel Marketplace) when it's configured.
// /tmp is the fallback there, but it isn't shared between instances.
const FILE = process.env.DB_FILE || (process.env.VERCEL ? "/tmp/wya/db.json" : path.join(process.cwd(), "data", "db.json"));
const DAY = 24 * 3600 * 1000;

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = process.env.DB_KEY || "wya:db";
export const sharedStore = Boolean(REDIS_URL && REDIS_TOKEN);

type Stored = { seededAt: number; db: DB };
const g = globalThis as unknown as { __layover?: Stored; __wyaPending?: Promise<void> };

async function redis(cmd: unknown[]) {
  const res = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).result as unknown;
}

// Pull the latest copy from shared storage. Call once at the start of a request
// (currentUser does this), before reading or changing anything.
export async function hydrate() {
  if (!sharedStore) return;
  await flush();
  try {
    const raw = await redis(["GET", REDIS_KEY]);
    if (typeof raw === "string") {
      const stored = JSON.parse(raw) as Stored;
      g.__layover = stored;
      freshen(stored);
    } else if (!g.__layover) {
      load();
    }
  } catch (e) {
    console.error("wya: couldn't load db from Redis", e);
  }
}

// Wait for the last write to reach shared storage.
export async function flush() {
  while (g.__wyaPending) {
    const p = g.__wyaPending;
    await p;
    if (g.__wyaPending === p) g.__wyaPending = undefined;
  }
}

function load(): Stored {
  if (g.__layover) return g.__layover;
  let stored: Stored;
  try {
    stored = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    stored = { seededAt: Date.now(), db: buildSeed() };
  }
  g.__layover = stored;
  freshen(stored);
  save();
  return stored;
}

export function save() {
  if (!g.__layover) return;
  if (sharedStore) {
    const body = JSON.stringify(g.__layover);
    const prev = g.__wyaPending ?? Promise.resolve();
    g.__wyaPending = prev
      .then(() => redis(["SET", REDIS_KEY, body]))
      .then(() => undefined)
      .catch((e) => console.error("wya: couldn't save db to Redis", e));
    // Keep the serverless function alive until the write lands.
    try {
      after(() => flush());
    } catch {
      /* outside a request: nothing to keep alive */
    }
    return;
  }
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(g.__layover));
  } catch (e) {
    // Never let a failed disk write break a request; the in-memory copy still works.
    console.error("wya: couldn't save db", e);
  }
}

// Keeps the demo world feeling live: seeded events move forward by whole days,
// and seeded students' "free for" posts stay current.
function freshen(s: Stored) {
  // Repair: an earlier version added new sign-ups to every chat, including
  // other people's direct messages. A DM only ever has its first two members.
  for (const c of s.db.chats) if (c.name === null && c.members.length > 2) c.members = c.members.slice(0, 2);
  const days = Math.floor((Date.now() - s.seededAt) / DAY);
  if (days > 0) {
    for (const e of s.db.events) e.startsAt += days * DAY;
    for (const c of s.db.chats) for (const k of c.calendar) k.startsAt += days * DAY;
    s.seededAt += days * DAY;
  }
}

export function db(): DB {
  const s = load();
  const now = Date.now();
  let changed = false;
  for (const c of s.db.chats) {
    if (c.name === null && c.members.length > 2) {
      c.members = c.members.slice(0, 2);
      changed = true;
    }
  }
  for (const u of s.db.users) {
    if (u.demo && u.post && u.demo.freeMins > 0 && u.post.freeUntil < now + 5 * 60000) {
      u.post.createdAt = now;
      u.post.freeUntil = now + u.demo.freeMins * 60000;
    } else if (!u.demo && u.post && u.post.freeUntil <= now) {
      // A post is gone once its free time is over.
      u.post = null;
      u.available = false;
      changed = true;
    }
  }
  // Events people create are removed a few hours after they start (seeded demo events roll forward instead).
  const before = s.db.events.length;
  s.db.events = s.db.events.filter((e) => /^e\d+$/.test(e.id) || e.startsAt > now - 3 * 3600000);
  if (changed || s.db.events.length !== before) save();
  return s.db;
}

export function mutate<T>(fn: (d: DB) => T): T {
  const result = fn(db());
  save();
  return result;
}

export function getUser(id: string) {
  return db().users.find((u) => u.id === id) ?? null;
}

export function getUserByUsername(name: string) {
  return db().users.find((u) => u.username === name) ?? null;
}

export function getUserByEmail(email: string) {
  return db().users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function isEdu(email: string) {
  return /^[^@\s]+@([a-z0-9-]+\.)*[a-z0-9-]+\.edu$/i.test(email.trim());
}

export function upsertUserFromSignIn(email: string, name?: string | null): User {
  const existing = getUserByEmail(email);
  if (existing) return existing;
  return mutate((d) => {
    let uname = usernameFromEmail(email) || "student";
    while (d.users.some((u) => u.username === uname)) uname += Math.floor(Math.random() * 10);
    const user: User = {
      id: `p${Date.now().toString(36)}`,
      email: email.toLowerCase(),
      name: name || uname,
      username: uname,
      major: "",
      year: "",
      bio: "",
      commute: "",
      interests: [],
      status: "available",
      active: true,
      available: false,
      onCampus: true,
      zone: "mu",
      post: null,
      slots: [],
      privacy: { ...DEFAULT_PRIVACY },
      canvas: null,
      onboarded: false,
      lastSeen: Date.now(),
    };
    d.users.push(user);
    welcomeData(d, user.id);
    return user;
  });
}

// One-button sign-in: one account per browser device id. The internal email is
// never shown; the person picks their name and username during setup.
export function upsertDeviceUser(device: string): User {
  const key = `${device}@device.wya`;
  const existing = getUserByEmail(key);
  if (existing) return existing;
  const user = upsertUserFromSignIn(key, "New student");
  mutate((d) => {
    let uname = `student${Math.floor(1000 + Math.random() * 9000)}`;
    while (d.users.some((u) => u.username === uname && u.id !== user.id)) uname = `student${Math.floor(1000 + Math.random() * 9000)}`;
    user.username = uname;
  });
  return user;
}

export function isDeviceAccount(email: string) {
  return email.endsWith("@device.wya");
}

export function followers(id: string) {
  return db().follows.filter((f) => f.to === id).map((f) => f.from);
}

export function following(id: string) {
  return db().follows.filter((f) => f.from === id).map((f) => f.to);
}

export function isFollowing(from: string, to: string) {
  return db().follows.some((f) => f.from === from && f.to === to);
}

export function isFriend(a: string, b: string) {
  return isFollowing(a, b) && isFollowing(b, a);
}
