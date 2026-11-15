import Link from "next/link";
import { addSlot, linkCanvas, removeSlot, setOnCampus, setStatus, unlinkCanvas } from "@/app/actions";
import { Avatar, Card, Chip, Hidden, Icon, Switch, btn, Select } from "@/components/ui";
import { ZoneOptions } from "@/components/ZoneOptions";
import { requireUser } from "@/lib/auth";
import { STATUSES, statusColor, zoneName } from "@/lib/constants";
import { db, followers, following } from "@/lib/db";
import { DAYS, fmtDur, fmtHour, minsLeft } from "@/lib/view";

const NOTES: Record<string, string> = {
  available: "Friends see you as available and you show up in Quick Connect.",
  busy: "You stay visible but won't show up in Quick Connect.",
  away: "Shown as away. Requests wait until you're back.",
  offline: "You appear offline to everyone.",
};

export default async function Account({ searchParams }: { searchParams: Promise<{ canvasError?: string }> }) {
  const me = await requireUser();
  const { canvasError } = await searchParams;
  const initials = me.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  const posts = db().events.filter((e) => e.hostId === me.id).length + (me.post ? 1 : 0);
  const hours = Array.from({ length: 23 }, (_, i) => 8 + i * 0.5);

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-5 py-5 md:px-10 md:py-10">
      <header className="flex items-center justify-between md:hidden">
        <h1 className="font-display text-[22px] font-bold">@{me.username}</h1>
        <Link href="/settings" aria-label="Settings" className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white"><Icon name="gear" size={20} /></Link>
      </header>

      <section aria-label="Profile" className="flex flex-wrap items-center gap-5 md:gap-10">
        <div className="relative">
          <span className="md:hidden"><Avatar initials={initials} size={84} dark /></span>
          <span className="hidden md:block"><Avatar initials={initials} size={140} dark /></span>
          <span aria-hidden="true" className="absolute right-1 bottom-1 h-5 w-5 rounded-full border-[3px] border-ground md:h-7 md:w-7" style={{ background: statusColor(me.active ? me.status : "offline") }} />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <div className="hidden flex-wrap items-center gap-3 md:flex">
            <h1 className="font-display text-[28px] font-bold">@{me.username}</h1>
            <Link href="/account/edit" className={btn.quiet}>Edit profile</Link>
            <Link href="/settings" className="text-sm font-bold text-maroon">Settings</Link>
          </div>
          <div className="grid grid-cols-3 text-center md:flex md:gap-8 md:text-left">
            <span className="flex flex-col md:flex-row md:items-baseline md:gap-1.5"><strong className="font-display text-xl">{posts}</strong><span className="text-xs text-muted md:text-base md:text-ink">posts</span></span>
            <Link href="/account/follows?list=followers" className="flex flex-col md:flex-row md:items-baseline md:gap-1.5"><strong className="font-display text-xl">{followers(me.id).length}</strong><span className="text-xs text-muted md:text-base md:text-ink">followers</span></Link>
            <Link href="/account/follows?list=following" className="flex flex-col md:flex-row md:items-baseline md:gap-1.5"><strong className="font-display text-xl">{following(me.id).length}</strong><span className="text-xs text-muted md:text-base md:text-ink">following</span></Link>
          </div>
          <div className="hidden flex-col gap-1 md:flex">
            <span className="text-base font-bold">{me.name}</span>
            <span className="text-sm text-muted">{[me.major, me.year, me.commute && `commutes from ${me.commute}`].filter(Boolean).join(" · ")}</span>
            {me.bio && <span className="text-[15px]">{me.bio}</span>}
          </div>
        </div>
      </section>
      <div className="flex flex-col gap-1 md:hidden">
        <span className="text-base font-bold">{me.name}</span>
        <span className="text-sm text-muted">{[me.major, me.year, me.commute && `commutes from ${me.commute}`].filter(Boolean).join(" · ")}</span>
        {me.bio && <span className="text-sm">{me.bio}</span>}
        <Link href="/account/edit" className={`${btn.quiet} mt-2`}>Edit profile</Link>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-[15px] font-bold">Availability status</h2>
            <div role="radiogroup" aria-label="Status" className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => {
                const on = me.status === s.id;
                return (
                  <form key={s.id} action={setStatus}>
                    <Hidden fields={{ status: s.id }} />
                    <button role="radio" aria-checked={on} className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold ${on ? "border-2 border-ink bg-ground" : "border border-line bg-white"}`}>
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </button>
                  </form>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">On campus</span>
              <Switch action={setOnCampus} on={me.onCampus} label="On campus" />
            </div>
            <p className="text-xs text-muted">{NOTES[me.status]}{me.post && me.available ? ` Quick Connect post live for ${fmtDur(minsLeft(me.post.freeUntil))}.` : ""}</p>
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink text-white"><Icon name="link" size={18} /></span>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-bold">{me.canvas?.connected ? `Canvas connected via ${me.canvas.via === "mcp" ? "MCP" : me.canvas.via === "rest" ? "API" : "demo"}` : "Canvas not connected"}</span>
                <span className="text-xs text-muted">{me.canvas?.connected ? `ASU ID ${me.canvas.asuId} · ${me.canvas.courses} courses` : "Verify your ASU ID and pull your courses"}</span>
              </div>
              {me.canvas?.connected ? (
                <form action={unlinkCanvas}><button className="min-h-10 cursor-pointer rounded-2xl border border-line-strong px-3 text-[13px] font-bold text-maroon">Disconnect</button></form>
              ) : (
                <form action={linkCanvas}><input type="hidden" name="back" value="/account" /><button className={`${btn.primary} min-h-10 text-[13px]`}>Connect</button></form>
              )}
            </div>
            {canvasError && <p role="alert" className="text-xs font-semibold text-maroon">{canvasError}</p>}
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-bold">Interests</h2>
              <Link href="/account/niches" className="text-[13px] font-semibold text-maroon">Edit</Link>
            </div>
            <div className="flex flex-wrap gap-1.5">{me.interests.map((n) => <Chip key={n}>{n}</Chip>)}</div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-[2_1_420px] flex-col gap-4">
          <Card className="flex scroll-mt-6 flex-col gap-3 p-4">
            <h2 id="open-times" className="scroll-mt-6 text-[15px] font-bold">Your open times</h2>
            <p className="text-xs text-muted">People can request these blocks for a meetup. Only the times show, never your classes.</p>
            {me.slots.length === 0 && <p className="text-sm text-muted">No open times yet.</p>}
            {me.slots.sort((a, b) => a.day - b.day || a.start - b.start).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-2xl bg-ground px-3 py-2">
                <span className="text-sm font-semibold">{DAYS[s.day]} {fmtHour(s.start)} – {fmtHour(s.end)} · {zoneName(s.zone)}</span>
                <form action={removeSlot}><Hidden fields={{ id: s.id }} /><button className="min-h-10 cursor-pointer px-2 text-[13px] font-bold text-maroon">Remove</button></form>
              </div>
            ))}
            <form action={addSlot} className="grid grid-cols-3 gap-2">
              <label className="sr-only" htmlFor="slot-day">Day</label>
              <Select id="slot-day" name="day">{DAYS.slice(0, 5).map((d, i) => <option key={d} value={i}>{d}</option>)}</Select>
              <label className="sr-only" htmlFor="slot-start">From</label>
              <Select id="slot-start" name="start" defaultValue={13}>{hours.map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}</Select>
              <label className="sr-only" htmlFor="slot-end">To</label>
              <Select id="slot-end" name="end" defaultValue={14}>{hours.map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}</Select>
              <label className="sr-only" htmlFor="slot-zone">Where</label>
              <Select id="slot-zone" name="zone" className="col-span-3 sm:col-span-2"><ZoneOptions /></Select>
              <button className={`${btn.outline} col-span-3 sm:col-span-1`}>Add time</button>
            </form>
          </Card>

          {me.post && me.available && (
            <section className="flex flex-col gap-2">
              <h2 className="text-[15px] font-bold">Your live mini post</h2>
              <div className="flex flex-col justify-between gap-6 rounded-xl bg-maroon p-4 text-white">
                <span>{me.post.text}</span>
                <span className="text-xs font-bold">{fmtDur(minsLeft(me.post.freeUntil))} left · {zoneName(me.post.zone)}</span>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
