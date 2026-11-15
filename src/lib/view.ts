import "server-only";
import { isFollowing, isFriend } from "./db";
import { matchScore } from "./match";
import type { User } from "./types";

// What `viewer` is allowed to see about `target`, following target's privacy settings.
export function visibility(viewer: User, target: User) {
  const self = viewer.id === target.id;
  const p = target.privacy;
  const follows = isFollowing(viewer.id, target.id);
  const friend = isFriend(viewer.id, target.id);
  const audienceOk = p.audience !== "followers" || follows;
  const profile = self || (audienceOk && (!p.privateAccount || follows));
  const appearsOffline = target.status === "offline" || !target.active;
  return {
    self,
    follows,
    friend,
    profile,
    activity: self || (profile && friend && p.showActivity && !appearsOffline),
    location: self || (profile && p.shareLocation && friend && !appearsOffline),
    onMap: self || (profile && p.shareLocation && p.showOnMap && friend && !appearsOffline),
    freeTimes: self || (profile && p.showFreeTimes),
    followLists: self || (profile && p.showFollowLists),
    interests: self || (profile && p.showInterests),
    major: self || (profile && p.showMajor),
    canMessage: self || follows || p.dmsFromAnyone,
    // Quick Connect posts are opt-in broadcasts, but still respect audience and private accounts.
    post: !!target.post && target.available && target.post.freeUntil > Date.now() && (self || profile),
  };
}

export type Card = ReturnType<typeof card>;

export function card(viewer: User, target: User) {
  const v = visibility(viewer, target);
  const m = matchScore(viewer, target);
  return {
    id: target.id,
    name: target.name,
    username: target.username,
    initials: target.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase(),
    major: v.major ? [target.major, target.year].filter(Boolean).join(" · ") : "",
    interests: v.interests ? target.interests : [],
    shared: v.interests ? m.shared : [],
    score: m.score,
    walk: v.location ? m.walk : null,
    zone: v.location ? target.zone : null,
    status: v.activity ? target.status : "offline",
    post: v.post ? target.post : null,
    v,
  };
}

export function minsLeft(until: number) {
  return Math.max(0, Math.round((until - Date.now()) / 60000));
}

export function fmtDur(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

export function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: process.env.TZ_DISPLAY || "America/Phoenix" });
}

export function fmtDay(ms: number) {
  const tz = process.env.TZ_DISPLAY || "America/Phoenix";
  const d = new Date(ms);
  const key = (x: Date) => x.toLocaleDateString("en-US", { timeZone: tz });
  const now = new Date();
  if (key(d) === key(now)) return "Today";
  if (key(d) === key(new Date(now.getTime() + 86400000))) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: tz });
}

export function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const ap = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${ap}`;
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
