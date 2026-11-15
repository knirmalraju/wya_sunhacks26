import Link from "next/link";
import { saveAccount } from "@/app/actions";
import { btn } from "@/components/ui";
import { UsernameField } from "@/app/welcome/UsernameField";
import { requireUser } from "@/lib/auth";
import { username as fromEmail } from "@/lib/seed";

export default async function EditAccount({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireUser();
  const { error } = await searchParams;
  const school = me.verified?.email.includes("@") ? me.verified.email : me.email;
  const suggestions = [{ value: fromEmail(school), label: `${fromEmail(school)} · from your school email (recommended)` }];
  if (me.canvas?.asuId && me.canvas.asuId !== "unknown") suggestions.push({ value: me.canvas.asuId, label: "ASU ID from Canvas" });
  const field = "min-h-12 rounded-2xl border border-line-strong bg-white px-3.5";
  return (
    <form action={saveAccount} className="mx-auto flex max-w-lg flex-col gap-4 px-5 py-6 md:py-10">
      <input type="hidden" name="next" value="/account" />
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Edit profile</h1>
      <div className="flex flex-col gap-1.5"><label htmlFor="name" className="text-[13px] font-semibold">Name</label><input id="name" name="name" defaultValue={me.name} className={field} /></div>
      <UsernameField initial={me.username} suggestions={suggestions} />
      {error === "taken" && <p role="alert" className="text-sm font-semibold text-maroon">That username is taken.</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5"><label htmlFor="major" className="text-[13px] font-semibold">Major</label><input id="major" name="major" defaultValue={me.major} className={field} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="year" className="text-[13px] font-semibold">Year</label><input id="year" name="year" defaultValue={me.year} className={field} /></div>
      </div>
      <div className="flex flex-col gap-1.5"><label htmlFor="commute" className="text-[13px] font-semibold">Commute from</label><input id="commute" name="commute" defaultValue={me.commute} className={field} /></div>
      <div className="flex flex-col gap-1.5"><label htmlFor="bio" className="text-[13px] font-semibold">Bio</label><textarea id="bio" name="bio" rows={3} maxLength={160} defaultValue={me.bio} className="rounded-2xl border border-line-strong bg-white px-3.5 py-2.5" /></div>
      <div className="flex gap-3">
        <Link href="/account" className={`${btn.quiet} flex-1`}>Cancel</Link>
        <button className={`${btn.primary} flex-1`}>Save</button>
      </div>
    </form>
  );
}
