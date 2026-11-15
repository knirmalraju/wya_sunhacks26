"use client";

import { useState } from "react";

export function UsernameField({ initial, suggestions }: { initial: string; suggestions: { value: string; label: string }[] }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="username" className="text-[13px] font-semibold">Username</label>
      <div className="flex min-h-12 items-center rounded-xl border-2 border-maroon bg-white px-3.5">
        <span aria-hidden="true" className="text-muted">@</span>
        <input id="username" name="username" value={value} onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} maxLength={30} className="min-w-0 flex-1 bg-transparent pl-0.5 text-[15px] font-semibold outline-none" />
      </div>
      <span className="text-xs text-muted">You can change it anytime. We recommend the part of your email before the @.</span>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button key={s.value} type="button" aria-pressed={value === s.value} onClick={() => setValue(s.value)} className={`min-h-10 cursor-pointer rounded-full border px-3 text-[13px] font-semibold ${value === s.value ? "border-maroon bg-maroon-tint text-maroon" : "border-line-strong bg-white"}`}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
