import { CAMPUSES } from "./campuses";

const center = (id: string) => {
  const c = CAMPUSES.find((x) => x.id === id)!;
  return { lat: c.lat, lng: c.lng };
};

// Places people can be. Tempe has building-level spots; other campuses are
// campus-level. Coordinates from OpenStreetMap.
export const ZONES = [
  { id: "mu", campus: "tempe", name: "Memorial Union", lat: 33.41773, lng: -111.9344 },
  { id: "hayden", campus: "tempe", name: "Hayden Library", lat: 33.41905, lng: -111.93458 },
  { id: "noble", campus: "tempe", name: "Noble Library", lat: 33.41997, lng: -111.93066 },
  { id: "sdfc", campus: "tempe", name: "SDFC", lat: 33.41546, lng: -111.93273 },
  { id: "istb4", campus: "tempe", name: "ISTB 4", lat: 33.41807, lng: -111.92838 },
  { id: "fulton", campus: "tempe", name: "Fulton Center", lat: 33.42227, lng: -111.93447 },
  { id: "downtown", campus: "downtown", name: "Downtown Phoenix campus", ...center("downtown") },
  { id: "west", campus: "west", name: "West Valley campus", ...center("west") },
  { id: "poly", campus: "poly", name: "Polytechnic campus", ...center("poly") },
  { id: "havasu", campus: "havasu", name: "Lake Havasu campus", ...center("havasu") },
  { id: "la", campus: "la", name: "ASU California Center (LA)", ...center("la") },
  { id: "dc", campus: "dc", name: "Barrett & O'Connor Center (DC)", ...center("dc") },
  { id: "off", campus: "off", name: "Off campus", lat: 0, lng: 0 },
];

export const CAMPUS_LIST = CAMPUSES.map((c) => ({ id: c.id, name: c.name }));

export function campusOf(zoneId: string) {
  return ZONES.find((z) => z.id === zoneId)?.campus ?? "tempe";
}

export function zonesIn(campus: string) {
  return ZONES.filter((z) => z.campus === campus);
}

export function campusName(id: string) {
  return CAMPUSES.find((c) => c.id === id)?.name ?? "Tempe";
}

export function zoneName(id: string) {
  return ZONES.find((z) => z.id === id)?.name ?? "Somewhere";
}

// Rough walking minutes between zones (straight-line distance at ~80 m/min).
export function walkMinutes(a: string, b: string) {
  const za = ZONES.find((z) => z.id === a);
  const zb = ZONES.find((z) => z.id === b);
  if (!za || !zb || za.id === "off" || zb.id === "off" || za.campus !== zb.campus) return null;
  const dLat = (za.lat - zb.lat) * 111_000;
  const dLng = (za.lng - zb.lng) * 111_000 * Math.cos((za.lat * Math.PI) / 180);
  return Math.max(1, Math.round(Math.hypot(dLat, dLng) / 80));
}

export const NICHE_GROUPS: { name: string; niches: string[] }[] = [
  { name: "Tech & building", niches: ["Robotics", "AI", "Web dev", "Cybersecurity", "3D printing", "Arduino", "Drones", "CAD"] },
  { name: "Gaming", niches: ["Assassin's Creed", "Valorant", "Smash Bros", "Chess", "Board games", "Ghost of Tsushima", "Minecraft"] },
  { name: "Sports & moving", niches: ["Basketball", "Pickleball", "Soccer", "Climbing", "Gym", "Intramurals", "Parkour"] },
  { name: "Chill", niches: ["Coffee runs", "Music production", "Anime", "Photography", "Study buddies", "History buffs", "Suns fans"] },
];

export const ALL_NICHES = NICHE_GROUPS.flatMap((g) => g.niches);

export function groupOf(niche: string) {
  return NICHE_GROUPS.find((g) => g.niches.includes(niche))?.name ?? "Other";
}

// "Because you picked X" suggestions.
export const RELATED: Record<string, string[]> = {
  Robotics: ["Arduino", "Drones", "CAD", "3D printing"],
  AI: ["Web dev", "Robotics", "Cybersecurity"],
  "Assassin's Creed": ["History buffs", "Ghost of Tsushima", "Parkour"],
  Valorant: ["Smash Bros", "Minecraft"],
  Basketball: ["Intramurals", "Suns fans", "Pickleball"],
  Climbing: ["Parkour", "Gym"],
  "Study buddies": ["Coffee runs"],
  "Music production": ["Photography", "Anime"],
};

export const EVENT_TYPES = ["Sports", "Study", "Gaming", "Club", "Hangout"] as const;

export const STATUSES = [
  { id: "available", label: "Available", color: "#10B981" },
  { id: "busy", label: "Busy", color: "#EF4444" },
  { id: "away", label: "Away", color: "#F59E0B" },
  { id: "offline", label: "Appear offline", color: "#94A3B8" },
] as const;

export type StatusId = (typeof STATUSES)[number]["id"];

export function statusColor(id: string) {
  return STATUSES.find((s) => s.id === id)?.color ?? "#94A3B8";
}
