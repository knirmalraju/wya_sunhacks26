"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { postQuickConnect, setAvailable } from "@/app/actions";
import { CAMPUS_LIST, campusOf, zonesIn } from "@/lib/constants";
import { Switch } from "./Switch";
import { Select } from "./ui";

const MIN = 15;
const MAX = 180;
const STEP = 15;
// Thumb is 20px wide (see .time-range in globals.css); ticks are inset by half of it
// so every tick sits exactly under the thumb's center at that value.
const INSET = 10;

const pct = (m: number) => ((m - MIN) / (MAX - MIN)) * 100;

function fmt(m: number) {
  if (m < 60) return `${m} min`;
  return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`;
}

export function QuickConnect({ available, zone, text }: { available: boolean; zone: string; text: string }) {
  const [mins, setMins] = useState(60);
  const [campus, setCampus] = useState(() => (zone === "off" ? "tempe" : campusOf(zone)));
  const places = zonesIn(campus);
  const [place, setPlace] = useState(() => (zone !== "off" && campusOf(zone) === campus ? zone : places[0]?.id ?? "mu"));
  // Read the clock only in the browser so server and client render the same HTML.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const until = now ? new Date(now + mins * 60000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
  const ticks = Array.from({ length: (MAX - MIN) / STEP + 1 }, (_, i) => MIN + i * STEP);
  const labels = [
    { m: 15, t: "15m" },
    { m: 60, t: "1h" },
    { m: 120, t: "2h" },
    { m: 180, t: "3h" },
  ];

  return (
    <section aria-label="Quick Connect" className="relative overflow-hidden rounded-[32px] bg-maroon p-5 text-white shadow-[0_16px_40px_rgba(140,29,64,0.28)] md:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.1em] text-gold uppercase">Quick Connect</span>
          <span className="flex items-center gap-2.5 text-sm font-semibold">
            Available
            <Switch action={setAvailable} on={available} label="Available to meet" tone="gold" />
          </span>
        </div>

        <form action={postQuickConnect} className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[24px] leading-tight font-extrabold tracking-[-0.03em] md:text-[28px]">
              Free for <span className="text-gold">{fmt(mins)}</span>
            </p>
            <span className="shrink-0 text-sm text-white/75">{until && `until ${until}`}</span>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMins((m) => Math.max(MIN, m - STEP))} aria-label="Less time" className="h-10 w-10 shrink-0 cursor-pointer rounded-full bg-white/12 text-lg font-bold hover:bg-white/20">−</button>
            <div className="flex flex-1 flex-col">
              <div aria-hidden="true" className="relative h-3.5" style={{ marginInline: INSET }}>
                {ticks.map((t) => (
                  <motion.span
                    key={t}
                    className="absolute bottom-0 w-[2px] -translate-x-1/2 rounded-full"
                    style={{ left: `${pct(t)}%`, height: t % 60 === 0 ? 14 : t % 30 === 0 ? 9 : 6 }}
                    animate={{ backgroundColor: t <= mins ? "#FFC627" : "rgba(255,255,255,0.3)" }}
                    transition={{ duration: 0.2 }}
                  />
                ))}
              </div>
              <input type="range" name="mins" min={MIN} max={MAX} step={STEP} value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label="Minutes free" aria-valuetext={fmt(mins)} className="time-range my-1.5" style={{ ["--fill" as string]: `${pct(mins)}%` }} />
              <div aria-hidden="true" className="relative h-4 text-[10.5px] font-semibold text-white/70" style={{ marginInline: INSET }}>
                {labels.map((l) => (
                  <span key={l.t} className="absolute -translate-x-1/2" style={{ left: `${pct(l.m)}%` }}>{l.t}</span>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setMins((m) => Math.min(MAX, m + STEP))} aria-label="More time" className="h-10 w-10 shrink-0 cursor-pointer rounded-full bg-white/12 text-lg font-bold hover:bg-white/20">+</button>
          </div>

          <label htmlFor="qc-text" className="sr-only">Mini post</label>
          <textarea id="qc-text" name="text" rows={2} defaultValue="" maxLength={200} placeholder="What are you up to? “Free before my 3:15, anyone want to talk robotics?”" className="resize-none rounded-3xl bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none" />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-white/80">On campus</span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label htmlFor="qc-campus" className="sr-only">Campus</label>
              <Select id="qc-campus" tone="onDark" value={campus} onChange={(e) => { setCampus(e.target.value); setPlace(zonesIn(e.target.value)[0]?.id ?? "mu"); }}>
                {CAMPUS_LIST.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {places.length > 1 ? (
                <>
                  <label htmlFor="qc-zone" className="sr-only">Where on campus</label>
                  <Select id="qc-zone" name="zone" tone="onDark" value={place} onChange={(e) => setPlace(e.target.value)}>
                    {places.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </Select>
                </>
              ) : (
                <input type="hidden" name="zone" value={place} />
              )}
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.98 }} type="submit" className="min-h-[52px] cursor-pointer rounded-full bg-gold text-[15px] font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-95">
            Post
          </motion.button>
          {available && text && <p className="-mt-1 text-center text-xs text-white/70">Posting again replaces your current post. Posts disappear when your free time ends.</p>}
        </form>
      </div>
    </section>
  );
}
