"use client";

import { useState } from "react";
import { NICHE_GROUPS, RELATED } from "@/lib/constants";

export function NichePicker({ initial }: { initial: string[] }) {
  const [picked, setPicked] = useState<Set<string>>(new Set(initial));
  const toggle = (n: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const suggestions = [...picked]
    .filter((n) => RELATED[n])
    .slice(0, 3)
    .map((n) => ({ why: n, items: RELATED[n].filter((x) => !picked.has(x)).slice(0, 3) }))
    .filter((s) => s.items.length);

  const chip = (n: string, plus = false) => {
    const on = picked.has(n);
    return (
      <button key={n} type="button" aria-pressed={on} onClick={() => toggle(n)} className={`min-h-10 cursor-pointer rounded-full border px-3 text-[13px] font-semibold md:min-h-11 md:text-sm ${on ? "border-maroon bg-maroon text-white" : "border-line-strong bg-white"}`}>
        {plus && !on ? "+ " : ""}{n}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {[...picked].map((n) => <input key={n} type="hidden" name="niche" value={n} />)}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {NICHE_GROUPS.map((g) => (
          <div key={g.name} className="flex flex-col gap-2.5 rounded-3xl border border-line/80 bg-white shadow-[var(--shadow-card)] p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-bold">{g.name}</h2>
              <span className="text-xs text-muted">{g.niches.filter((n) => picked.has(n)).length} picked</span>
            </div>
            <div className="flex flex-wrap gap-2">{g.niches.map((n) => chip(n))}</div>
          </div>
        ))}
      </div>
      {suggestions.length > 0 && (
        <section aria-label="Suggested for you" className="flex flex-col gap-3 rounded-2xl border border-[#F3DC8B] bg-gold-tint p-4">
          <h2 className="text-[15px] font-bold">Suggested for you</h2>
          {suggestions.map((s) => (
            <div key={s.why} className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Because you picked {s.why}</span>
              <div className="flex flex-wrap gap-2">{s.items.map((n) => chip(n, true))}</div>
            </div>
          ))}
        </section>
      )}
      <p className="text-center text-sm text-muted">{picked.size} niches selected{picked.size < 3 ? ` · pick ${3 - picked.size} more` : ""}</p>
    </div>
  );
}
