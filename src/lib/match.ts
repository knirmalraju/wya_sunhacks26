import { walkMinutes } from "./constants";
import type { User } from "./types";

// score = 0.6 * shared interests (Jaccard) + 0.25 * availability + 0.15 * proximity
export function matchScore(me: User, other: User, now = Date.now()) {
  const a = new Set(me.interests);
  const b = new Set(other.interests);
  const shared = [...a].filter((x) => b.has(x));
  const union = new Set([...a, ...b]).size || 1;
  const jaccard = shared.length / union;
  const free = other.available && other.post && other.post.freeUntil > now ? 1 : 0;
  const mins = walkMinutes(me.zone, other.zone);
  const proximity = mins == null ? 0 : mins <= 3 ? 1 : mins <= 8 ? 0.5 : 0.2;
  // Interest overlap matters most; scale so 2-3 shared niches reads as a strong match.
  const interestPart = Math.min(1, jaccard * 2.2);
  const score = Math.round((0.6 * interestPart + 0.25 * free + 0.15 * proximity) * 100);
  return { score, shared, walk: mins };
}
