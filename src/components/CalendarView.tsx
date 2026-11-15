"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Kind = "assignment" | "canvas" | "event" | "group" | "meetup" | "free";
export type CalItem = { id: string; kind: Kind; title: string; startsAt: number; endsAt?: number; sub?: string; href?: string };
type Meta = Record<Kind, { label: string; color: string; tint: string; text: string }>;

const HOUR_PX = 52;
const START_H = 8;
const END_H = 22;
const DAY = 86400000;

const time = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? "PM" : "AM"}`;

function sameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function CalendarView({ items, start, meta }: { items: CalItem[]; start: number; meta: Meta }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => start + i * DAY), [start]);
  const [hidden, setHidden] = useState<Set<Kind>>(new Set());
  const [sel, setSel] = useState(() => days.find((d) => sameDay(d, Date.now())) ?? days[0]);
  // Clock is read only in the browser (keeps server and client HTML identical).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const shown = items.filter((i) => !hidden.has(i.kind));
  const isDeadline = (i: CalItem) => i.kind === "assignment";
  const kinds = (Object.keys(meta) as Kind[]).filter((k) => items.some((i) => i.kind === k));

  const block = (i: CalItem) => {
    const s = new Date(i.startsAt);
    const startH = Math.max(START_H, s.getHours() + s.getMinutes() / 60);
    const endH = Math.min(END_H, i.endsAt ? startH + (i.endsAt - i.startsAt) / 3600000 : startH + 0.75);
    return { top: (startH - START_H) * HOUR_PX, height: Math.max(26, (endH - startH) * HOUR_PX - 4) };
  };

  const Pill = ({ i, compact = false }: { i: CalItem; compact?: boolean }) => {
    const m = meta[i.kind];
    const body = (
      <>
        <span className="truncate font-bold">{i.title}</span>
        {!compact && <span className="truncate opacity-80">{time(i.startsAt)}{i.sub ? ` · ${i.sub}` : ""}</span>}
      </>
    );
    const cls = "flex h-full w-full flex-col overflow-hidden rounded-2xl border-l-[3px] px-2.5 py-1.5 text-left text-xs leading-snug transition hover:brightness-[0.97]";
    const style = { background: m.tint, color: m.text, borderColor: m.color };
    const title = `${m.label}: ${i.title} · ${time(i.startsAt)}${i.sub ? ` · ${i.sub}` : ""}`;
    return i.href ? (i.href.startsWith("http") ? <a href={i.href} target="_blank" rel="noreferrer" title={title} className={cls} style={style}>{body}</a> : <Link href={i.href} title={title} className={cls} style={style}>{body}</Link>) : <div title={title} className={cls} style={style}>{body}</div>;
  };

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Show on calendar" className="flex flex-wrap gap-2">
        {kinds.map((k) => {
          const on = !hidden.has(k);
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; })} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-bold transition" style={on ? { background: meta[k].tint, borderColor: "transparent", color: meta[k].text } : { background: "#fff", borderColor: "#E2E8F0", color: "#55657A" }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: on ? meta[k].color : "#CBD5E1" }} />
              {meta[k].label}
            </button>
          );
        })}
      </div>

      {/* Mobile: day strip + agenda */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const on = sameDay(d, sel);
            const has = shown.some((i) => sameDay(i.startsAt, d));
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => setSel(d)} className={`relative flex min-h-[68px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl ${on ? "text-white" : "bg-white text-ink shadow-[var(--shadow-card)]"}`}>
                {on && <motion.span layoutId="day-pill" className="absolute inset-0 rounded-2xl bg-maroon" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <span className="relative text-[11px] font-semibold opacity-80">{new Date(d).toLocaleDateString("en-US", { weekday: "short" })}</span>
                <span className="relative text-lg font-extrabold">{new Date(d).getDate()}</span>
                <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: has ? (on ? "#FFC627" : "#8C1D40") : "transparent" }} />
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.ol key={sel} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }} className="flex flex-col gap-2.5">
            {shown.filter((i) => sameDay(i.startsAt, sel)).map((i) => (
              <li key={i.id} className="flex gap-3">
                <span className="w-16 shrink-0 pt-3 text-right text-xs font-bold text-muted">{time(i.startsAt)}</span>
                <div className="min-h-14 flex-1"><Pill i={i} /></div>
              </li>
            ))}
            {!shown.some((i) => sameDay(i.startsAt, sel)) && <li className="rounded-3xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">Nothing planned. A good day for Quick Connect.</li>}
          </motion.ol>
        </AnimatePresence>
      </div>

      {/* Laptop: week grid */}
      <div className="hidden overflow-hidden rounded-[28px] border border-line/80 bg-white shadow-[var(--shadow-card)] md:block">
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-line">
          <span />
          {days.map((d) => {
            const today = now != null && sameDay(d, now);
            return (
              <div key={d} className="flex flex-col items-center gap-0.5 py-3">
                <span className={`text-xs font-semibold ${today ? "text-maroon" : "text-muted"}`}>{new Date(d).toLocaleDateString("en-US", { weekday: "short" })}</span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-extrabold ${today ? "bg-maroon text-white" : ""}`}>{new Date(d).getDate()}</span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-line bg-ground/60">
          <span className="self-center pr-2 text-right text-[11px] font-bold text-muted uppercase">Due</span>
          {days.map((d) => (
            <div key={d} className="flex min-h-11 flex-col gap-1 border-l border-line p-1.5">
              {shown.filter((i) => isDeadline(i) && sameDay(i.startsAt, d)).map((i) => <div key={i.id} className="h-9"><Pill i={i} compact /></div>)}
            </div>
          ))}
        </div>
        <div className="relative grid max-h-[620px] grid-cols-[64px_repeat(7,minmax(0,1fr))] overflow-y-auto">
          <div className="relative" style={{ height: (END_H - START_H) * HOUR_PX }}>
            {Array.from({ length: END_H - START_H }, (_, h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] font-semibold text-muted" style={{ top: h * HOUR_PX }}>{h ? hourLabel(START_H + h) : ""}</span>
            ))}
          </div>
          {days.map((d, di) => (
            <div key={d} className="relative border-l border-line" style={{ height: (END_H - START_H) * HOUR_PX }}>
              {Array.from({ length: END_H - START_H }, (_, h) => <span key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: h * HOUR_PX }} />)}
              {shown.filter((i) => !isDeadline(i) && sameDay(i.startsAt, d)).map((i, k) => {
                const b = block(i);
                return (
                  <motion.div key={i.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.02 * (di * 3 + k) }} className="absolute right-1 left-1" style={{ top: b.top + 2, height: b.height }}>
                    <Pill i={i} compact={b.height < 44} />
                  </motion.div>
                );
              })}
              {now != null && sameDay(d, now) && new Date(now).getHours() >= START_H && new Date(now).getHours() < END_H && (
                <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (new Date(now).getHours() + new Date(now).getMinutes() / 60 - START_H) * HOUR_PX }}>
                  <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                  <span className="h-0.5 flex-1 bg-[#EF4444]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
