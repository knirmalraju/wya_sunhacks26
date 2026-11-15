// Servers (Vercel runs on UTC) should show and calculate times in Arizona time,
// where ASU is. Arizona has no daylight saving, so this is right year-round.
export function register() {
  process.env.TZ = process.env.APP_TIMEZONE || "America/Phoenix";
}
