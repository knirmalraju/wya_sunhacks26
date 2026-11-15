import type { StatusId } from "./constants";

export type Privacy = {
  audience: "everyone" | "asu" | "followers";
  privateAccount: boolean;
  shareLocation: boolean;
  preciseLocation: boolean;
  showActivity: boolean;
  showOnMap: boolean;
  showFreeTimes: boolean;
  showFollowLists: boolean;
  showInterests: boolean;
  showMajor: boolean;
  dmsFromAnyone: boolean;
  appearInSuggestions: boolean;
};

export const DEFAULT_PRIVACY: Privacy = {
  audience: "asu",
  privateAccount: false,
  shareLocation: true,
  preciseLocation: false,
  showActivity: true,
  showOnMap: true,
  showFreeTimes: true,
  showFollowLists: true,
  showInterests: true,
  showMajor: true,
  dmsFromAnyone: false,
  appearInSuggestions: true,
};

export type Slot = { id: string; day: number; start: number; end: number; zone: string }; // day 0=Mon, start/end in hours (13.5 = 1:30 PM)

export type QuickPost = {
  text: string;
  zone: string;
  onCampus: boolean;
  createdAt: number;
  freeUntil: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
  username: string;
  major: string;
  year: string;
  bio: string;
  commute: string;
  interests: string[];
  status: StatusId;
  active: boolean; // activity status toggle on Home
  available: boolean; // Quick Connect availability
  onCampus: boolean;
  zone: string;
  post: QuickPost | null;
  slots: Slot[];
  privacy: Privacy;
  canvas: CanvasInfo | null;
  onboarded: boolean;
  // Proof the person is a student: a .edu account they signed into with SSO.
  verified?: { email: string; via: "email" | "sso" | "canvas" | "demo"; at: number } | null;
  lastSeen: number;
  demo?: { freeMins: number }; // seeded users: post time is kept fresh relative to "now"
};

// Canvas items are private to the student: only they ever see them.
export type CanvasItem = { id: string; title: string; kind: "assignment" | "event"; startsAt: number; endsAt?: number; course?: string; url?: string };

export type CanvasInfo = {
  connected: boolean;
  via?: "mcp" | "rest" | "demo";
  auth?: "sso" | "token" | "demo";
  asuId?: string;
  email?: string;
  courses?: number;
  syncedAt?: number;
  items?: CanvasItem[];
  error?: string;
};

export type CanvasSecret = { access: string; refresh?: string; expiresAt?: number };

export type Follow = { from: string; to: string };

export type MeetRequest = {
  id: string;
  from: string;
  to: string;
  type: "quick" | "scheduled";
  slotId?: string;
  when: string;
  zone: string;
  note: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
};

export type CampusEvent = {
  id: string;
  hostId: string;
  title: string;
  type: string;
  zone: string;
  startsAt: number;
  capacity: number;
  attendees: string[];
  niche?: string;
};

export type Message = { id: string; from: string; text: string; at: number };

export type CalendarItem = { id: string; title: string; startsAt: number; zone: string; going: string[]; addedBy: string };

export type Chat = {
  id: string;
  name: string | null; // null = direct message
  members: string[];
  messages: Message[];
  calendar: CalendarItem[];
};

export type DB = {
  users: User[];
  follows: Follow[];
  requests: MeetRequest[];
  events: CampusEvent[];
  chats: Chat[];
  // Canvas OAuth tokens, by user id. Server-only; never sent to the browser.
  canvasSecrets?: Record<string, CanvasSecret>;
  // Pending email sign-in codes, by email. Hashed; never sent to the browser.
  signInCodes?: Record<string, { hash: string; expiresAt: number; tries: number; sentAt: number }>;
};
