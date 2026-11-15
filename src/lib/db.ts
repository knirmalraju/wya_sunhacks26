import "server-only";
// Same as instrumentation.ts, in case this module loads first.
if (typeof process !== "undefined") process.env.TZ = process.env.APP_TIMEZONE || "America/Phoenix";
import { createHash } from "node:crypto";
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

// Find Redis settings however the Vercel integration named them:
// Upstash REST (KV_REST_API_URL + KV_REST_API_TOKEN, UPSTASH_REDIS_REST_URL + _TOKEN,
// possibly with a custom prefix) or a plain connection string (REDIS_URL, KV_URL).
const env = process.env;
const envKeys = Object.keys(env);
function findRest() {
  for (const k of envKeys) {
    const m = k.match(/^(.*?)(KV_REST_API|REDIS_REST)_URL$/);
    if (!m || !env[k]?.startsWith("http")) continue;
    const token = env[`${m[1]}${m[2]}_TOKEN`];
    if (token) return { url: env[k]!, token };
  }
  return null;
}
function findTcp() {
  const k = envKeys.find((k) => /(^|_)(REDIS_URL|KV_URL)$/.test(k) && /^rediss?:\/\//.test(env[k] || ""));
  return k ? env[k]! : null;
}
const REST = findRest();
const TCP = REST ? null : findTcp();
const REDIS_KEY = env.DB_KEY || "wya:db";
export const sharedStore = Boolean(REST || TCP);
export const storeKind = REST ? "redis-rest" : TCP ? "redis-url" : env.VERCEL ? "tmp (not shared)" : "file";

type Stored = { seededAt: number; db: DB };
type TcpClient = { isOpen: boolean; connect(): Promise<unknown>; get(k: string): Promise<string | null>; set(k: string, v: string): Promise<unknown> };
const g = globalThis as unknown as { __layover?: Stored; __wyaPending?: Promise<void>; __wyaRedis?: Promise<TcpClient> };

async function tcp(): Promise<TcpClient> {
  if (!g.__wyaRedis) {
    g.__wyaRedis = (async () => {
      const { createClient } = await import("redis");
      const client = createClient({ url: TCP!, socket: { connectTimeout: 5000 } }) as unknown as TcpClient & { on(e: string, f: (e: unknown) => void): void };
      client.on("error", (e) => console.error("wya: redis error", e));
      await client.connect();
      return client;
    })().catch((e) => {
      g.__wyaRedis = undefined;
      throw e;
    });
  }
  const c = await g.__wyaRedis;
  if (!c.isOpen) await c.connect();
  return c;
}

async function redisGet(key: string): Promise<string | null> {
  if (TCP) return (await tcp()).get(key);
  const r = await redisRest(["GET", key]);
  return typeof r === "string" ? r : null;
}

async function redisSet(key: string, value: string) {
  if (TCP) await (await tcp()).set(key, value);
  else await redisRest(["SET", key, value]);
}

async function redisRest(cmd: unknown[]) {
  const res = await fetch(REST!.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST!.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).result as unknown;
}

// For /api/health: which storage is active and whether it answers.
export async function storeStatus() {
  const names = envKeys.filter((k) => /KV|REDIS|UPSTASH/.test(k)).sort();
  let reachable: boolean | string = "n/a";
  if (sharedStore) {
    try {
      await redisSet("wya:ping", String(Date.now()));
      reachable = (await redisGet("wya:ping")) !== null;
    } catch (e) {
      reachable = e instanceof Error ? e.message.slice(0, 200) : "error";
    }
  }
  return { store: storeKind, reachable, redisEnvNames: names, vercel: Boolean(env.VERCEL) };
}

// Pull the latest copy from shared storage. Call once at the start of a request
// (currentUser does this), before reading or changing anything.
export async function hydrate() {
  if (!sharedStore) return;
  await flush();
  try {
    const raw = await redisGet(REDIS_KEY);
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
      .then(() => redisSet(REDIS_KEY, body))
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

// The parts of your own profile your browser remembers (see auth.ts).
export type SavedProfile = Pick<User, "name" | "username" | "major" | "year" | "commute" | "bio" | "interests">;

// One account per browser device id, with no sign-in. The id, username and
// starting name are derived from the device id, so every server builds the
// same account for the same browser even without shared storage.
export function ensureDeviceUser(device: string, saved: SavedProfile | null): User {
  const key = `${device}@device.wya`;
  const hash = createHash("sha256").update(device).digest("hex");
  const id = `d${hash.slice(0, 12)}`;
  const existing = getUserByEmail(key) ?? getUser(id);
  if (existing) return syncSaved(existing, saved);
  return mutate((d) => {
    let uname = saved?.username?.replace(/[^a-z0-9_.]/g, "").slice(0, 30) || `student${(parseInt(hash.slice(0, 8), 16) % 9000) + 1000}`;
    if (d.users.some((u) => u.username === uname)) uname = `${uname}${hash.slice(12, 15)}`;
    const user: User = {
      id,
      email: key,
      name: saved?.name?.slice(0, 60) || "Sparky",
      username: uname,
      major: saved?.major?.slice(0, 60) || "",
      year: saved?.year?.slice(0, 60) || "",
      bio: saved?.bio?.slice(0, 160) || "",
      commute: saved?.commute?.slice(0, 60) || "",
      interests: Array.isArray(saved?.interests) ? saved.interests.map(String).slice(0, 20) : [],
      status: "available",
      active: true,
      available: false,
      onCampus: true,
      zone: "mu",
      post: null,
      slots: [],
      privacy: { ...DEFAULT_PRIVACY },
      canvas: null,
      onboarded: true,
      lastSeen: Date.now(),
    };
    d.users.push(user);
    welcomeData(d, user.id);
    return user;
  });
}

// Without shared storage a server can hold an older copy of someone's account.
// Their browser's saved profile is always the newest, so it wins.
function syncSaved(user: User, saved: SavedProfile | null): User {
  if (!saved) return user;
  const want = {
    name: saved.name?.slice(0, 60) || user.name,
    major: saved.major?.slice(0, 60) ?? user.major,
    year: saved.year?.slice(0, 60) ?? user.year,
    commute: saved.commute?.slice(0, 60) ?? user.commute,
    bio: saved.bio?.slice(0, 160) ?? user.bio,
  };
  const uname = saved.username?.replace(/[^a-z0-9_.]/g, "").slice(0, 30);
  const interests = Array.isArray(saved.interests) ? saved.interests.map(String).slice(0, 20) : user.interests;
  const changed =
    (Object.keys(want) as (keyof typeof want)[]).some((k) => user[k] !== want[k]) ||
    (uname && uname !== user.username) ||
    interests.join("|") !== user.interests.join("|");
  if (!changed) return user;
  mutate((d) => {
    Object.assign(user, want);
    user.interests = interests;
    if (uname && uname !== user.username && !d.users.some((u) => u.username === uname && u.id !== user.id)) user.username = uname;
  });
  return user;
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
