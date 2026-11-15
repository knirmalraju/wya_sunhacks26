import "server-only";
import type { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { db, getUser, mutate } from "./db";
import type { CanvasInfo, CanvasItem, CanvasSecret } from "./types";

// ---------------------------------------------------------------------------
// Canvas connection
//
// Sign-in: Canvas OAuth2 ("Log in with Canvas"). At ASU, Canvas login goes
// through ASU SSO, so the student signs in with their ASURITE + Duo, never
// pastes a token. Needs a Canvas Developer Key (CANVAS_CLIENT_ID/SECRET).
//
// Data: the student's token is handed to a Canvas MCP server, and we call its
// tools. Two ways to reach the server:
//   CANVAS_MCP_COMMAND  e.g. "npx -y canvas-mcp-server" (stdio, one process
//                       per sync, token passed as CANVAS_API_TOKEN)
//   CANVAS_MCP_URL      a Streamable HTTP server (token sent as a Bearer header)
// Without an MCP server we fall back to Canvas's REST API, then to demo data.
// ---------------------------------------------------------------------------

export const canvasBase = (process.env.CANVAS_BASE_URL || "https://canvas.asu.edu").replace(/\/$/, "");
export const oauthConfigured = !!(process.env.CANVAS_CLIENT_ID && process.env.CANVAS_CLIENT_SECRET);
export const mcpConfigured = !!(process.env.CANVAS_MCP_COMMAND || process.env.CANVAS_MCP_URL);
export const canvasMode = mcpConfigured ? "mcp" : oauthConfigured ? "rest" : "demo";

// ---------- OAuth (SSO) ----------

export function authorizeUrl(state: string, redirectUri: string) {
  const u = new URL(`${canvasBase}/login/oauth2/auth`);
  u.searchParams.set("client_id", process.env.CANVAS_CLIENT_ID!);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  if (process.env.CANVAS_OAUTH_SCOPES) u.searchParams.set("scope", process.env.CANVAS_OAUTH_SCOPES);
  return u.toString();
}

async function tokenRequest(body: Record<string, string>): Promise<CanvasSecret> {
  const res = await fetch(`${canvasBase}/login/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.CANVAS_CLIENT_ID!, client_secret: process.env.CANVAS_CLIENT_SECRET!, ...body }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Canvas login failed (${res.status})`);
  const j = await res.json();
  return { access: j.access_token, refresh: j.refresh_token ?? body.refresh_token, expiresAt: j.expires_in ? Date.now() + (j.expires_in - 60) * 1000 : undefined };
}

export async function exchangeCode(code: string, redirectUri: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

export function saveSecret(userId: string, s: CanvasSecret | null) {
  mutate((d) => {
    d.canvasSecrets ??= {};
    if (s) d.canvasSecrets[userId] = s;
    else delete d.canvasSecrets[userId];
  });
}

async function accessToken(userId: string): Promise<string | null> {
  const s = db().canvasSecrets?.[userId];
  if (!s) return process.env.CANVAS_API_TOKEN || null;
  if (s.expiresAt && s.expiresAt < Date.now() && s.refresh && oauthConfigured) {
    const fresh = await tokenRequest({ grant_type: "refresh_token", refresh_token: s.refresh });
    saveSecret(userId, fresh);
    return fresh.access;
  }
  return s.access;
}

// ---------- Parsing helpers (MCP servers return JSON as text) ----------

function parseToolResult(result: unknown): unknown {
  const r = result as { structuredContent?: unknown; content?: { type: string; text?: string }[]; isError?: boolean };
  if (r?.isError) throw new Error(r.content?.find((c) => c.type === "text")?.text?.slice(0, 160) || "MCP tool error");
  if (r?.structuredContent) return r.structuredContent;
  const text = r?.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n") ?? "";
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/[[{][\s\S]*[\]}]/);
    if (m) try { return JSON.parse(m[0]); } catch { /* fall through */ }
    return text;
  }
}

function asArray(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === "object") {
    for (const k of ["items", "data", "results", "courses", "assignments", "events", "upcoming"]) {
      const x = (v as Record<string, unknown>)[k];
      if (Array.isArray(x)) return x as Record<string, unknown>[];
    }
  }
  return [];
}

function pickEmail(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  if (typeof o.primary_email === "string" && o.primary_email.includes("@")) return o.primary_email;
  if (typeof o.login_id === "string" && o.login_id) return o.login_id.includes("@") ? o.login_id : `${o.login_id}@${process.env.ASU_DOMAIN || "asu.edu"}`;
  return undefined;
}

function pickId(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  for (const k of ["sis_user_id", "integration_id", "login_id", "primary_email", "id"]) {
    const v = o[k];
    if (typeof v === "string" && v) return v.split("@")[0];
    if (typeof v === "number") return String(v);
  }
  return null;
}

function toItems(rows: Record<string, unknown>[], courseNames: Map<string, string>): CanvasItem[] {
  const out: CanvasItem[] = [];
  for (const r of rows) {
    const a = (r.assignment as Record<string, unknown>) ?? r;
    const when = (a.due_at ?? r.start_at ?? r.all_day_date ?? a.lock_at) as string | undefined;
    const t = when ? Date.parse(when) : NaN;
    if (Number.isNaN(t)) continue;
    const end = r.end_at ? Date.parse(String(r.end_at)) : undefined;
    const isAssignment = !!(r.assignment || a.due_at || r.type === "assignment" || a.submission_types);
    const courseId = String(a.course_id ?? r.course_id ?? String(r.context_code ?? "").replace("course_", ""));
    out.push({
      id: String(r.id ?? a.id ?? `${t}-${out.length}`),
      title: String(a.name ?? r.title ?? a.title ?? "Canvas item"),
      kind: isAssignment ? "assignment" : "event",
      startsAt: t,
      endsAt: end && !Number.isNaN(end) ? end : undefined,
      course: (r.context_name as string) || courseNames.get(courseId) || undefined,
      url: (a.html_url ?? r.html_url) as string | undefined,
    });
  }
  const seen = new Set<string>();
  return out
    .filter((i) => i.startsAt > Date.now() - 86400000 && i.startsAt < Date.now() + 21 * 86400000)
    .filter((i) => (seen.has(i.title + i.startsAt) ? false : (seen.add(i.title + i.startsAt), true)))
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, 60);
}

type SyncResult = Omit<CanvasInfo, "connected" | "auth">;

// ---------- MCP ----------

async function mcpClient(token: string): Promise<McpClient> {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const client = new Client({ name: "layover", version: "0.2.0" });
  if (process.env.CANVAS_MCP_URL) {
    const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    const headers: Record<string, string> = { Authorization: process.env.CANVAS_MCP_AUTH || `Bearer ${token}`, "X-Canvas-Token": token };
    await client.connect(new StreamableHTTPClientTransport(new URL(process.env.CANVAS_MCP_URL), { requestInit: { headers } }));
  } else {
    const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
    const [command, ...args] = process.env.CANVAS_MCP_COMMAND!.split(" ").filter(Boolean);
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) if (typeof v === "string") env[k] = v;
    Object.assign(env, { CANVAS_API_TOKEN: token, CANVAS_DOMAIN: new URL(canvasBase).host, MCP_TRANSPORT: "stdio" });
    await client.connect(new StdioClientTransport({ command, args, env, stderr: "ignore" }));
  }
  return client;
}

async function viaMcp(token: string): Promise<SyncResult> {
  const client = await mcpClient(token);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    const find = (envKey: string, preferred: string, re: RegExp) => process.env[envKey] || (names.includes(preferred) ? preferred : names.find((n) => re.test(n)));
    const call = async (name: string | undefined, args: Record<string, unknown> = {}) => {
      if (!name) return null;
      try {
        return parseToolResult(await client.callTool({ name, arguments: args }));
      } catch {
        return null;
      }
    };
    const profile = await call(find("CANVAS_MCP_PROFILE_TOOL", "canvas_get_user_profile", /user_profile|profile|self/i));
    const coursesRaw = asArray(await call(find("CANVAS_MCP_COURSES_TOOL", "canvas_list_courses", /list_courses|courses/i)));
    const courseNames = new Map(coursesRaw.map((c) => [String(c.id), String(c.name ?? c.course_code ?? "")]));
    const upcoming = asArray(await call(find("CANVAS_MCP_UPCOMING_TOOL", "canvas_get_upcoming_assignments", /upcoming/i)));
    const start = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
    const calTool = find("CANVAS_MCP_CALENDAR_TOOL", "canvas_list_calendar_events", /calendar/i);
    const events = asArray((await call(calTool, { start_date: start, end_date: end })) ?? (await call(calTool)));
    if (!profile && coursesRaw.length === 0) throw new Error(`The Canvas MCP server didn't return data (tools: ${names.slice(0, 8).join(", ")}…)`);
    return { via: "mcp", asuId: pickId(profile) ?? "unknown", email: pickEmail(profile), courses: coursesRaw.length, items: toItems([...upcoming, ...events], courseNames), syncedAt: Date.now() };
  } finally {
    await client.close().catch(() => {});
  }
}

// ---------- REST fallback ----------

async function viaRest(token: string): Promise<SyncResult> {
  const get = async (path: string) => {
    const r = await fetch(`${canvasBase}/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Canvas said ${r.status}${r.status === 401 ? ": sign in again" : ""}`);
    return r.json();
  };
  const profile = await get("/users/self/profile");
  const courses = asArray(await get("/courses?enrollment_state=active&per_page=50"));
  const upcoming = asArray(await get("/users/self/upcoming_events").catch(() => []));
  const courseNames = new Map(courses.map((c) => [String(c.id), String(c.name ?? "")]));
  return { via: "rest", asuId: pickId(profile) ?? "unknown", email: pickEmail(profile), courses: courses.length, items: toItems(upcoming, courseNames), syncedAt: Date.now() };
}

// ---------- Demo ----------

function demo(existing?: CanvasInfo | null): SyncResult {
  const day = (n: number, h: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime() + n * 86400000 + h * 3600000;
  };
  return {
    via: "demo",
    asuId: existing?.asuId ?? "12" + String(Math.floor(10_000_000 + Math.random() * 89_999_999)),
    courses: 5,
    syncedAt: Date.now(),
    items: [
      { id: "d1", title: "Project 3: Recursion", kind: "assignment", startsAt: day(1, 23.98), course: "CSE 230" },
      { id: "d2", title: "Reading quiz 7", kind: "assignment", startsAt: day(2, 11), course: "PSY 101" },
      { id: "d3", title: "Lab report: Circuits", kind: "assignment", startsAt: day(3, 17), course: "EEE 202" },
      { id: "d4", title: "Midterm review session", kind: "event", startsAt: day(4, 15), endsAt: day(4, 16.5), course: "MAT 267" },
      { id: "d5", title: "Discussion post", kind: "assignment", startsAt: day(6, 23.98), course: "ENG 102" },
    ],
  };
}

// ---------- Public API ----------

export async function syncCanvas(userId: string, auth: CanvasInfo["auth"]): Promise<CanvasInfo> {
  const user = getUser(userId);
  const token = await accessToken(userId);
  let result: SyncResult;
  if (token && mcpConfigured) result = await viaMcp(token);
  else if (token) result = await viaRest(token);
  else result = demo(user?.canvas);
  const info: CanvasInfo = { connected: true, auth: token ? auth ?? user?.canvas?.auth ?? "token" : "demo", ...result };
  mutate(() => {
    if (user) user.canvas = info;
  });
  return info;
}

export function disconnectCanvas(userId: string) {
  saveSecret(userId, null);
  mutate(() => {
    const u = getUser(userId);
    if (u) u.canvas = null;
  });
}
