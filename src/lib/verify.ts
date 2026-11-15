import "server-only";
import { db, getUser, mutate } from "./db";
import { username as fromEmail } from "./seed";

// Marks someone as a verified student and, if their username still came from a
// personal Google email, switches it to the one from their school email
// (jdoe@asu.edu → jdoe) when that's free. They can still edit it later.
export function markVerified(userId: string, email: string, via: "sso" | "canvas" | "demo") {
  mutate(() => {
    const u = getUser(userId);
    if (!u) return;
    const fromGoogle = fromEmail(u.email);
    u.verified = { email: email.toLowerCase(), via, at: Date.now() };
    if (email.includes("@") && u.username.startsWith(fromGoogle)) {
      const wanted = fromEmail(email);
      if (wanted && !db().users.some((x) => x.username === wanted && x.id !== u.id)) u.username = wanted;
    }
  });
}
