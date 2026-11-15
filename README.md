# wya

Campus connection app for commuting ASU students: **interests + location + availability = connection**.

Built with Next.js 15 (App Router, server actions), Tailwind, NextAuth, Leaflet + OpenStreetMap, and the MCP TypeScript SDK.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign in with any `.edu` email. Until an email service is set up, the 6-digit code shows up in the terminal running the dev server. A seeded campus of ~36 students, events and group chats loads on first run, and new accounts get two incoming meetup requests and the demo group chats so every screen has something in it.

To reset the demo world, delete `data/db.json` and restart.

## Sign-in (only students get in)
1. **`/signin`: school email + code.** Enter your `.edu` email and wya emails a 6-digit code to that inbox. Type it in and you're signed in. A new email creates an account. Receiving the code proves you own a school account, so there are no passwords, no Google and no SSO. Codes expire after 10 minutes, allow 5 tries, and can be re-sent every 30 seconds. Only a hash is stored (`src/lib/emailCode.ts`). Set `REQUIRE_ASU=true` to allow `@asu.edu` only.
2. **`/welcome`: Profile.** The username is prefilled from the email (`jdoe@asu.edu` → `jdoe`) and stays editable. After connecting Canvas there's also an "ASU ID from Canvas" option.
3. **`/welcome/niches`: Niches.**

**Sending the emails:** add `RESEND_API_KEY` and `EMAIL_FROM` (a sender on a domain you've verified in [Resend](https://resend.com)) to `.env.local`. Until then, codes are printed in the terminal running `npm run dev`, and the sign-in page says so.

## What's in it

| Screen | Path | Notes |
|---|---|---|
| Home | `/` | Activity toggle, friends' live status, Quick Connect post (free-for slider, campus + building dropdowns, Available switch), feed of nearby posts, Up next, requests |
| Discover | `/discover` | Search on top; People (niche groups, suggestions, follow) and Events (RSVP, create) |
| Calendar | `/calendar` | Canvas deadlines + events, RSVPs, group plans, meetups, open times. Arrows move a day (Today / Tomorrow / …) |
| Map & messages | `/map` | Real map with outlines of every ASU campus (Tempe, Downtown Phoenix, Polytechnic, West Valley, Lake Havasu, California Center, DC), a campus switcher, pins, messages, and per-chat shared calendars |
| Account | `/account` | Posts/followers/following, status (Available/Busy/Away/Offline), on campus, Canvas, interests, open times |
| Settings | `/settings` | Account, **Privacy** (profile audience + toggles for location, activity, map, open times, lists, interests, major, DMs, suggestions), Connections, Sign out |
| Profile | `/u/[username]` | Follow, message, meet now, request one of their open times |
| Requests | `/requests` | Incoming/sent, accept/decline (accepting opens a DM) |

**Posts:** one live Quick Connect post per person. Posting again replaces it, and it's deleted automatically when the free time ends. Events people create are removed a few hours after they start.

Privacy rules live in `src/lib/view.ts`: friends = mutual follows; activity and location are shown only to friends and only when the person shares them. Campus outlines come from OpenStreetMap (`src/lib/campuses.ts`, © OpenStreetMap contributors).

## Turning on the real integrations

Copy these into `.env.local` (one is already created with `NEXTAUTH_SECRET`).

### Canvas: login + MCP (optional, separate from wya sign-in) (`src/lib/canvas.ts`)

**1. "Log in with Canvas" (Canvas OAuth2).** "Log in with Canvas" sends the student to `canvas.asu.edu`, which signs them in through ASU SSO (ASURITE + Duo). Canvas sends back an access token and a refresh token, kept server-side.
- Needs a **Canvas Developer Key** (API key) from ASU's Canvas admins. Ask ASU UTO / Canvas support for one with this redirect URI: `http://localhost:3000/api/canvas/callback` (plus your deployed URL).
- Set `CANVAS_CLIENT_ID`, `CANVAS_CLIENT_SECRET`, and optionally `CANVAS_BASE_URL` (default `https://canvas.asu.edu`) and `CANVAS_OAUTH_SCOPES`.
- Without a key, students can paste a personal access token instead (Canvas → Account → Settings → New access token), or skip for demo data.

**2. Data through a Canvas MCP server.** With the student's token, the app opens an MCP client session and calls `canvas_get_user_profile`, `canvas_list_courses`, `canvas_get_upcoming_assignments` and `canvas_list_calendar_events`. These are the tool names of [DMontgomery40/mcp-canvas-lms](https://github.com/DMontgomery40/mcp-canvas-lms). Other servers work too: tools are matched by name, or set `CANVAS_MCP_*_TOOL`.
- **stdio (recommended, per-student):** install the server yourself (`npm i -g canvas-mcp-server`) and set `CANVAS_MCP_COMMAND="canvas-mcp-server"`. Each sync starts it with that student's `CANVAS_API_TOKEN` and `CANVAS_DOMAIN`.
- **HTTP:** `CANVAS_MCP_URL=http://127.0.0.1:3100/mcp`. The token goes in an `Authorization: Bearer` header (override with `CANVAS_MCP_AUTH`). Note that mcp-canvas-lms's HTTP mode uses one token for everyone, so prefer stdio.
- With no MCP server configured, the same data comes from Canvas's REST API. With no token at all, demo data is used.

Canvas deadlines and events show on the **Calendar** tab and are private to the student. Class meeting times aren't reliably in Canvas, so open meetup times are still set on the Account page.

**Security note:** tokens are stored in `data/db.json` (gitignored) for the demo. Encrypt them or move them to a real database before launch.

### Calendar tab
`/calendar` merges Canvas deadlines and class events, events you RSVP'd, group-chat calendar items you're going to, accepted meetups, and your open times. Laptop: week time-grid with a "Due" row and a now-line. Phone: day strip plus agenda.

### Design + motion
- **Design system:** your "Sun Devil Pulse" notes, set as tokens in `globals.css`. Plus Jakarta Sans, porcelain surfaces, maroon/gold, emerald presence, pill buttons, glass panels and halo presence rings.
- **Animation:** [Motion](https://motion.dev) (Framer Motion). Page transitions, staggered cards, a sliding nav indicator, a spring switch, and an animated free-time ruler. It respects the OS "reduce motion" setting.

## Before a real launch
- Swap the JSON file store (`src/lib/db.ts`) for Postgres/Supabase; it only works on a single server.
- Replace the 6-second refresh polling with realtime (Supabase Realtime, Pusher, or websockets).
- Use the browser's location (opt-in) instead of picking a building.
- Add reporting/blocking and rate limits.
