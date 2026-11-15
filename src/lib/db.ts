import "server-only";
import fs from "node:fs";
import path from "node:path";
import { buildSeed, welcomeData, username as usernameFromEmail } from "./seed";
import { DEFAULT_PRIVACY, type DB, type User } from "./types";

// A tiny JSON-file database. Good for a hackathon demo on one server;
// swap for Postgres/Supabase before real launch (see README).
const FILE = path.join(process.cwd(), "data", "db.json");
const DAY = 24 * 3600 * 1000;

type Stored = { seededAt: number; db: DB };
const g = globalThis as unknown as { __layover?: Stored };

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
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(g.__layover));
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
