import { AutoRefresh, BottomNav, Sidebar } from "@/components/Nav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const pending = db().requests.filter((r) => r.to === me.id && r.status === "pending").length;
  const initials = me.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="canvas-glow flex min-h-screen">
      <Sidebar requests={pending} me={{ name: me.name, username: me.username, initials, status: me.active ? me.status : "offline" }} />
      <main className="min-w-0 flex-1 pb-28 md:pb-0">{children}</main>
      <BottomNav />
      <AutoRefresh />
    </div>
  );
}
