import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { RequestList } from "./RequestList";

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireUser();
  const { tab } = await searchParams;
  const sent = tab === "sent";
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Requests</h1>
      <div role="tablist" aria-label="Request type" className="flex gap-1 rounded-full bg-line/70 p-1">
        {[["", "Incoming"], ["sent", "Sent"]].map(([v, l]) => {
          const on = (v === "sent") === sent;
          return (
            <Link key={l} role="tab" aria-selected={on} href={v ? `/requests?tab=${v}` : "/requests"} className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-sm ${on ? "bg-white font-bold" : "font-semibold text-muted"}`}>{l}</Link>
          );
        })}
      </div>
      <RequestList me={me} outgoing={sent} />
    </div>
  );
}
