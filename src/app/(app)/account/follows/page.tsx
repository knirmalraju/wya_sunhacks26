import Link from "next/link";
import { Avatar, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { followers, following, getUser } from "@/lib/db";

export default async function Follows({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const me = await requireUser();
  const { list = "followers" } = await searchParams;
  const ids = list === "following" ? following(me.id) : followers(me.id);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-6 md:py-10">
      <div className="flex gap-4">
        {["followers", "following"].map((l) => (
          <Link key={l} href={`/account/follows?list=${l}`} aria-current={list === l ? "page" : undefined} className={`font-display text-2xl capitalize ${list === l ? "font-bold" : "text-muted"}`}>{l}</Link>
        ))}
      </div>
      <Card className="flex flex-col">
        {ids.map(getUser).map((u) => u && (
          <Link key={u.id} href={`/u/${u.username}`} className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-2.5 last:border-0">
            <Avatar initials={u.name.split(" ").map((x) => x[0]).join("").slice(0, 2)} size={40} />
            <span className="flex flex-col"><span className="font-semibold">{u.name}</span><span className="text-xs text-muted">@{u.username}</span></span>
          </Link>
        ))}
        {ids.length === 0 && <p className="p-4 text-sm text-muted">Nobody yet.</p>}
      </Card>
    </div>
  );
}
