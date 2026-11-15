import Link from "next/link";
import { respondRequest } from "@/app/actions";
import { Avatar, Card, Hidden } from "@/components/ui";
import { zoneName } from "@/lib/constants";
import { db, getUser } from "@/lib/db";
import type { User } from "@/lib/types";

export function RequestList({ me, compact = false, outgoing = false }: { me: User; compact?: boolean; outgoing?: boolean }) {
  const all = db().requests.filter((r) => (outgoing ? r.from === me.id : r.to === me.id)).sort((a, b) => b.createdAt - a.createdAt);
  const list = compact ? all.filter((r) => r.status === "pending").slice(0, 3) : all;
  if (list.length === 0) return <p className="text-sm text-muted">{outgoing ? "You haven't sent any requests yet." : "No requests right now."}</p>;
  return (
    <div className="flex flex-col gap-3">
      {list.map((r) => {
        const other = getUser(outgoing ? r.to : r.from);
        if (!other) return null;
        const quick = r.type === "quick";
        return (
          <Card key={r.id} className="flex flex-col gap-2.5 p-4">
            <div className="flex items-center gap-3">
              {!compact && <Avatar initials={other.name.split(" ").map((x) => x[0]).join("").slice(0, 2)} size={44} />}
              <div className="flex flex-1 flex-col">
                <Link href={`/u/${other.username}`} className="text-[15px] font-bold hover:underline">{other.name}</Link>
                {!compact && <span className="text-[13px] text-muted">{other.major}</span>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${quick ? "bg-[#FFF1C7] text-[#6B4E00]" : "bg-blue-tint text-blue"}`}>{quick ? "Quick" : "Scheduled"}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl bg-ground p-3">
              <span className="text-[15px] font-semibold">{r.when} · {zoneName(r.zone)}</span>
              {r.note && <span className="text-sm text-muted">“{r.note}”</span>}
            </div>
            {r.status === "pending" && !outgoing ? (
              <div className="flex gap-2.5">
                <form action={respondRequest} className="flex-1">
                  <Hidden fields={{ id: r.id, accept: "0" }} />
                  <button className="min-h-11 w-full cursor-pointer rounded-2xl border border-line-strong bg-white text-sm font-semibold">Decline</button>
                </form>
                <form action={respondRequest} className="flex-1">
                  <Hidden fields={{ id: r.id, accept: "1" }} />
                  <button className="min-h-11 w-full cursor-pointer rounded-full bg-maroon text-sm font-semibold text-white">Accept</button>
                </form>
              </div>
            ) : (
              <span role="status" className={`text-sm font-semibold ${r.status === "accepted" ? "text-ok" : "text-muted"}`}>
                {r.status === "pending" ? "Waiting for a reply" : r.status === "accepted" ? (outgoing ? "Accepted! Check your messages." : "Accepted · they've been notified") : "Declined"}
              </span>
            )}
          </Card>
        );
      })}
    </div>
  );
}
