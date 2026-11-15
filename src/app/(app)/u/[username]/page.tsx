import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { openDm, sendRequest, toggleFollow } from "@/app/actions";
import { Avatar, Card, Chip, Hidden, Icon, btn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { STATUSES, zoneName } from "@/lib/constants";
import { db, followers, following, getUserByUsername } from "@/lib/db";
import { DAYS, card, fmtDur, fmtHour, minsLeft } from "@/lib/view";

export default async function Profile({ params }: { params: Promise<{ username: string }> }) {
  const me = await requireUser();
  const { username } = await params;
  const u = getUserByUsername(username);
  if (!u) notFound();
  if (u.id === me.id) redirect("/account");
  const c = card(me, u);
  const v = c.v;
  const requested = new Set(db().requests.filter((r) => r.from === me.id && r.to === u.id && r.status === "pending").map((r) => r.slotId ?? "quick"));
  const statusLabel = STATUSES.find((s) => s.id === c.status)?.label.replace("Appear offline", "Offline");

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-5 py-5 md:px-10 md:py-8">
      <Link href="/discover" className="flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-maroon"><Icon name="back" size={18} />Back</Link>
      <div className="flex flex-wrap items-start gap-6">
        <Card className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-5 md:p-6">
          <div className="flex items-center gap-4">
            <Avatar initials={c.initials} size={76} status={v.activity ? c.status : null} />
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-[26px] font-bold">{u.name}</h1>
              <span className="text-sm text-muted">@{u.username}{c.major ? ` · ${c.major}` : ""}</span>
            </div>
          </div>
          {v.activity && (
            <span className="self-start rounded-full bg-ok-tint px-3 py-1.5 text-[13px] font-bold text-ok">
              {statusLabel}{c.zone && c.zone !== "off" ? ` · ${zoneName(c.zone)}` : ""}{c.post ? ` · free ${fmtDur(minsLeft(c.post.freeUntil))}` : ""}
            </span>
          )}
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-3 rounded-xl border border-line py-2 text-center">
              <span className="flex flex-col"><strong className="font-display text-lg">{db().events.filter((e) => e.hostId === u.id).length + (u.post ? 1 : 0)}</strong><span className="text-xs text-muted">Posts</span></span>
              <span className="flex flex-col"><strong className="font-display text-lg">{followers(u.id).length}</strong><span className="text-xs text-muted">Followers</span></span>
              <span className="flex flex-col"><strong className="font-display text-lg">{following(u.id).length}</strong><span className="text-xs text-muted">Following</span></span>
            </div>
            <form action={toggleFollow}>
              <Hidden fields={{ to: u.id }} />
              <button className={`${v.follows ? btn.outline : btn.primary} min-h-12 px-5`}>{v.follows ? "Following" : "Follow"}</button>
            </form>
          </div>

          {!v.profile ? (
            <p className="rounded-2xl bg-ground p-4 text-sm text-muted"><Icon name="lock" size={16} /> This account is private. Follow to request access.</p>
          ) : (
            <>
              {u.bio && <p className="text-[15px]">{u.bio}</p>}
              {c.shared.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h2 className="text-[13px] font-bold tracking-[0.06em] text-muted uppercase">You both like</h2>
                  <div className="flex flex-wrap gap-2">{c.shared.map((n) => <Chip key={n} tone="solid">{n}</Chip>)}</div>
                </div>
              )}
              {v.interests && (
                <div className="flex flex-col gap-2">
                  <h2 className="text-[13px] font-bold tracking-[0.06em] text-muted uppercase">Also into</h2>
                  <div className="flex flex-wrap gap-2">{u.interests.filter((n) => !c.shared.includes(n)).map((n) => <Chip key={n} tone="outline">{n}</Chip>)}</div>
                </div>
              )}
              {c.post && <div className="rounded-xl bg-maroon-tint p-3 text-sm"><strong>Mini post:</strong> {c.post.text}</div>}
            </>
          )}

          <div className="flex gap-2.5">
            {v.canMessage && (
              <form action={openDm} className="flex-1">
                <Hidden fields={{ to: u.id }} />
                <button className={`${btn.quiet} w-full`}>Message</button>
              </form>
            )}
            {v.profile && (
              <form action={sendRequest} className="flex-1">
                <Hidden fields={{ to: u.id }} />
                <button disabled={requested.has("quick")} className={`${btn.outline} w-full`}>{requested.has("quick") ? "Request sent" : "Meet now"}</button>
              </form>
            )}
          </div>
        </Card>

        {v.profile && v.freeTimes && (
          <Card className="flex min-w-0 flex-[2_1_480px] flex-col gap-3 p-5 md:p-6">
            <h2 className="font-display text-xl font-bold">Book a time this week</h2>
            <p className="flex items-center gap-2 text-[13px] text-muted"><Icon name="lock" size={16} />{u.name.split(" ")[0]} shares free blocks only. Classes stay private.</p>
            {u.slots.length === 0 && <p className="text-sm text-muted">No open times shared yet.</p>}
            {u.slots.sort((a, b) => a.day - b.day || a.start - b.start).map((s) => {
              const sent = requested.has(s.id);
              return (
                <form key={s.id} action={sendRequest} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3.5">
                  <Hidden fields={{ to: u.id, slotId: s.id }} />
                  <div className="flex min-w-40 flex-1 flex-col">
                    <span className="text-[15px] font-bold">{DAYS[s.day]} · {fmtHour(s.start)} – {fmtHour(s.end)}</span>
                    <span className="text-[13px] text-muted">{zoneName(s.zone)}</span>
                  </div>
                  {!sent && (
                    <>
                      <label htmlFor={`note-${s.id}`} className="sr-only">Note</label>
                      <input id={`note-${s.id}`} name="note" placeholder="Add a note (optional)" maxLength={200} className="min-h-11 min-w-0 flex-[2_1_200px] rounded-2xl border border-line-strong px-3 text-sm" />
                    </>
                  )}
                  <button disabled={sent} className={sent ? btn.ok : btn.primary}>{sent ? "Requested" : "Request"}</button>
                </form>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
