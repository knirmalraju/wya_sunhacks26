import { ALL_NICHES, NICHE_GROUPS, ZONES } from "./constants";
import { DEFAULT_PRIVACY, type DB, type User } from "./types";

// Small deterministic random so the seed is the same every time.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const KEY_PEOPLE = [
  { name: "Maya Chen", major: "Robotics Engineering", year: "Junior", commute: "Mesa", interests: ["Robotics", "AI", "Assassin's Creed", "Climbing", "Coffee runs", "3D printing"], zone: "mu", status: "available", freeMins: 40, post: "Anyone want to look at the robotics club arm build? I have coffee." },
  { name: "Jordan Ruiz", major: "Computer Science", year: "Sophomore", commute: "Gilbert", interests: ["Basketball", "AI", "Web dev", "Study buddies"], zone: "hayden", status: "available", freeMins: 60, post: "Need a study buddy for CSE 230, happy to explain recursion." },
  { name: "Priya Shah", major: "Informatics", year: "Junior", commute: "Chandler", interests: ["Study buddies", "Music production", "Basketball", "Coffee runs"], zone: "noble", status: "busy", freeMins: 0, post: null },
  { name: "Dev Kapoor", major: "Mechanical Engineering", year: "Senior", commute: "Phoenix", interests: ["Robotics", "Basketball", "Drones", "Arduino"], zone: "istb4", status: "away", freeMins: 120, post: "Soldering drone parts, come hang if you like building stuff." },
  { name: "Sam Lee", major: "Graphic Design", year: "Freshman", commute: "Scottsdale", interests: ["Assassin's Creed", "Photography", "Anime"], zone: "off", status: "offline", freeMins: 0, post: null },
  { name: "Nia Okafor", major: "Biology", year: "Sophomore", commute: "Tempe", interests: ["Music production", "Coffee runs", "Pickleball"], zone: "fulton", status: "available", freeMins: 30, post: "Grabbing boba between labs, join me?" },
] as const;

const FIRST = ["Alex", "Taylor", "Chris", "Jamie", "Riley", "Morgan", "Avery", "Quinn", "Diego", "Sofia", "Ethan", "Lena", "Omar", "Grace", "Mateo", "Hana", "Isaac", "Zara", "Leo", "Ivy", "Noah", "Aria", "Kai", "Elena"];
const LAST = ["Nguyen", "Garcia", "Patel", "Kim", "Johnson", "Martinez", "Ali", "Brown", "Lopez", "Singh", "Wilson", "Torres"];
const MAJORS = ["Computer Science", "Business", "Nursing", "Psychology", "Electrical Engineering", "Film", "Finance", "Data Science", "Architecture", "Journalism"];
const YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];
const CITIES = ["Mesa", "Chandler", "Gilbert", "Phoenix", "Scottsdale", "Glendale", "Tempe"];
const POSTS = ["Free for a bit, down for lunch at the MU?", "Anyone up for a quick game of chess?", "Shooting around at SDFC, need one more.", "Studying at Noble, come cowork.", "Want to grab coffee and talk about anything but midterms?"];

export function username(email: string) {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "");
}

function makeUser(id: string, name: string, extra: Partial<User>): User {
  const [first, ...rest] = name.split(" ");
  const email = `${(first[0] + rest.join("")).toLowerCase()}@asu.edu`;
  return {
    id,
    email,
    name,
    username: username(email),
    major: "",
    year: "",
    bio: "",
    commute: "",
    interests: [],
    status: "available",
    active: true,
    available: true,
    onCampus: true,
    zone: "mu",
    post: null,
    slots: [],
    privacy: { ...DEFAULT_PRIVACY },
    canvas: { connected: true, via: "demo", courses: 5 },
    onboarded: true,
    verified: { email, via: "email", at: Date.now() },
    lastSeen: Date.now(),
    ...extra,
  };
}

const DAY = 24 * 3600 * 1000;

// Monday 00:00 of the current week, local time.
export function weekStart(now = Date.now()) {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  return d.getTime() - day * DAY;
}

export function todayAt(hours: number, dayOffset = 0, now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime() + dayOffset * DAY + hours * 3600 * 1000;
}

export function buildSeed(): DB {
  const r = rng(42);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const now = Date.now();
  const users: User[] = [];

  KEY_PEOPLE.forEach((p, i) => {
    users.push(
      makeUser(`u${i + 1}`, p.name, {
        major: p.major,
        year: p.year,
        commute: p.commute,
        bio: `Into ${p.interests.slice(0, 2).join(" and ").toLowerCase()}. Commute from ${p.commute}.`,
        interests: [...p.interests],
        zone: p.zone,
        onCampus: p.zone !== "off",
        status: p.status as User["status"],
        active: p.status !== "offline",
        available: p.freeMins > 0,
        post: p.post ? { text: p.post, zone: p.zone, onCampus: true, createdAt: now, freeUntil: now + p.freeMins * 60000 } : null,
        demo: { freeMins: p.freeMins },
        slots: [
          { id: `s${i}a`, day: 1, start: 13, end: 14, zone: "hayden" },
          { id: `s${i}b`, day: 3, start: 16, end: 18, zone: "sdfc" },
          { id: `s${i}c`, day: 4, start: 11, end: 12, zone: "mu" },
        ],
      }),
    );
  });

  for (let i = 0; i < 30; i++) {
    const name = `${FIRST[i % FIRST.length]} ${pick(LAST)}`;
    const group = pick(NICHE_GROUPS);
    const interests = Array.from(new Set([pick(group.niches), pick(group.niches), pick(ALL_NICHES), pick(ALL_NICHES)]));
    const zone = pick(ZONES).id;
    const status = pick(["available", "available", "busy", "away", "offline"] as const);
    const freeMins = status === "available" ? pick([15, 30, 45, 60, 90]) : 0;
    users.push(
      makeUser(`g${i}`, name, {
        major: pick(MAJORS),
        year: pick(YEARS),
        commute: pick(CITIES),
        interests,
        zone,
        onCampus: zone !== "off",
        status,
        active: status !== "offline",
        available: freeMins > 0,
        post: freeMins > 0 && r() > 0.4 ? { text: pick(POSTS), zone, onCampus: zone !== "off", createdAt: now, freeUntil: now + freeMins * 60000 } : null,
        demo: { freeMins },
        slots: [{ id: `gs${i}`, day: Math.floor(r() * 5), start: 10 + Math.floor(r() * 6), end: 12 + Math.floor(r() * 6), zone: pick(ZONES).id }].filter((s) => s.end > s.start),
      }),
    );
  }

  const follows = [
    { from: "u1", to: "u2" }, { from: "u2", to: "u1" }, { from: "u3", to: "u1" }, { from: "u4", to: "u1" },
    ...users.slice(6).map((u, i) => ({ from: u.id, to: KEY_PEOPLE[i % KEY_PEOPLE.length] ? `u${(i % 6) + 1}` : "u1" })),
  ];

  const events = [
    { id: "e1", hostId: "u3", title: "Pickup basketball", type: "Sports", zone: "sdfc", startsAt: todayAt(16), capacity: 10, attendees: ["u2", "u3", "u4", "g1", "g2", "g3"], niche: "Basketball" },
    { id: "e2", hostId: "u2", title: "CSE 230 study group", type: "Study", zone: "hayden", startsAt: todayAt(17.5), capacity: 8, attendees: ["u2", "g4", "g5", "g6"], niche: "Study buddies" },
    { id: "e3", hostId: "g7", title: "Smash Bros lunch bracket", type: "Gaming", zone: "mu", startsAt: todayAt(12, 2), capacity: 16, attendees: ["g7", "g8", "g9", "u5"], niche: "Smash Bros" },
    { id: "e4", hostId: "u4", title: "Robotics build night", type: "Club", zone: "istb4", startsAt: todayAt(18, 3), capacity: 20, attendees: ["u1", "u4", "g10"], niche: "Robotics" },
    { id: "e5", hostId: "u6", title: "Pickleball between classes", type: "Sports", zone: "sdfc", startsAt: todayAt(13, 1), capacity: 4, attendees: ["u6", "g11", "g12"], niche: "Pickleball" },
    { id: "e6", hostId: "u1", title: "AI Builders hack night", type: "Club", zone: "noble", startsAt: todayAt(19, 4), capacity: 30, attendees: ["u1", "u2", "g13", "g14"], niche: "AI" },
  ];

  const chats = [
    {
      id: "c1",
      name: "Hoops crew",
      members: ["u2", "u3", "u4", "g1"],
      messages: [
        { id: "m1", from: "u4", text: "Who's around Thursday after 4?", at: now - 3600000 },
        { id: "m2", from: "u3", text: "Me! Adding it to our calendar", at: now - 3000000 },
      ],
      calendar: [
        { id: "k1", title: "Pickup basketball", startsAt: todayAt(16, 3), zone: "sdfc", going: ["u3", "u4", "u2"], addedBy: "u3" },
        { id: "k2", title: "Suns watch party", startsAt: todayAt(19, 5), zone: "off", going: ["u2"], addedBy: "u2" },
      ],
    },
    {
      id: "c2",
      name: "Robotics squad",
      members: ["u1", "u4", "g10"],
      messages: [{ id: "m3", from: "u4", text: "Arm build moved to Wed 6 PM", at: now - 5400000 }],
      calendar: [{ id: "k3", title: "Robotics build night", startsAt: todayAt(18, 2), zone: "istb4", going: ["u1", "u4"], addedBy: "u4" }],
    },
  ];

  return { users, follows, requests: [], events, chats };
}

// Called once when a real person signs up: drops them into the demo world.
export function welcomeData(db: DB, userId: string) {
  const now = Date.now();
  // Join the demo group chats only. Never add anyone to other people's direct messages.
  for (const c of db.chats) if ((c.id === "c1" || c.id === "c2") && !c.members.includes(userId)) c.members.push(userId);
  db.chats.find((c) => c.id === "c1")?.calendar[0]?.going.push(userId);
  db.events.find((e) => e.id === "e4")?.attendees.push(userId);
  db.follows.push({ from: userId, to: "u1" }, { from: "u1", to: userId }, { from: userId, to: "u2" }, { from: "u2", to: userId }, { from: "u3", to: userId }, { from: userId, to: "u4" }, { from: userId, to: "u6" });
  db.chats.push({ id: `dm-${userId}-u1`, name: null, members: [userId, "u1"], messages: [{ id: `w${now}`, from: "u1", text: "Hey! Saw we both like robotics. Free later?", at: now - 600000 }], calendar: [] });
  db.requests.push(
    { id: `r${now}a`, from: "u2", to: userId, type: "quick", when: "Now · 20 min", zone: "hayden", note: "Coffee before my 3:00? Want to talk AI projects.", status: "pending", createdAt: now },
    { id: `r${now}b`, from: "u3", to: userId, type: "scheduled", slotId: "s2b", when: "Thu 4:00 – 6:00 PM", zone: "sdfc", note: "Pickup basketball, we need a fifth!", status: "pending", createdAt: now },
  );
}
