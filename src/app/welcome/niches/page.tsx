import { saveInterests } from "@/app/actions";
import { NichePicker } from "@/components/NichePicker";
import { requireUser } from "@/lib/auth";

export default async function Niches() {
  const me = await requireUser({ allowUnfinished: true });
  return (
    <form action={saveInterests} className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 px-5 py-8">
      <input type="hidden" name="next" value="/" />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-muted">Step 3 of 3</span>
        <div aria-hidden="true" className="h-1.5 rounded-full bg-maroon" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em]">What are you into?</h1>
        <p className="text-[15px] text-muted">Niches are grouped so you can go broad or specific. Niche is good: that&apos;s how you find your people.</p>
      </div>
      <div className="flex max-w-md flex-col gap-1.5">
        <label htmlFor="custom" className="text-[13px] font-semibold">Add your own</label>
        <input id="custom" name="custom" maxLength={40} placeholder="e.g. F1, pottery" className="min-h-12 rounded-2xl border border-line-strong bg-white px-3.5" />
      </div>
      <NichePicker initial={me.interests} />
      <button type="submit" className="min-h-[52px] cursor-pointer rounded-full bg-maroon shadow-[0_6px_16px_rgba(140,29,64,0.25)] text-base font-bold text-white">Finish</button>
    </form>
  );
}
