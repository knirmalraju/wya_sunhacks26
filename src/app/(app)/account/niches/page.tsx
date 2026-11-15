import { saveInterests } from "@/app/actions";
import { NichePicker } from "@/components/NichePicker";
import { requireUser } from "@/lib/auth";

export default async function EditNiches() {
  const me = await requireUser();
  return (
    <form action={saveInterests} className="mx-auto flex max-w-3xl flex-col gap-5 px-5 py-6 md:py-10">
      <input type="hidden" name="next" value="/account" />
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Your niches</h1>
      <div className="flex max-w-md flex-col gap-1.5">
        <label htmlFor="custom" className="text-[13px] font-semibold">Add your own</label>
        <input id="custom" name="custom" maxLength={40} placeholder="e.g. F1, pottery" className="min-h-12 rounded-2xl border border-line-strong bg-white px-3.5" />
      </div>
      <NichePicker initial={me.interests} />
      <button type="submit" className="min-h-[52px] cursor-pointer rounded-full bg-maroon shadow-[0_6px_16px_rgba(140,29,64,0.25)] text-base font-bold text-white">Save</button>
    </form>
  );
}
