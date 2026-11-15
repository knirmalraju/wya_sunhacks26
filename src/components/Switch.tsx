"use client";

import { motion } from "motion/react";
import { useOptimistic, useTransition } from "react";

// Animated switch backed by a server action. Flips instantly (optimistic),
// then the server confirms.
export function Switch({ action, on, label, fields = {}, tone = "green" }: { action: (f: FormData) => Promise<void>; on: boolean; label: string; fields?: Record<string, string>; tone?: "green" | "gold" }) {
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [, start] = useTransition();
  const track = optimistic ? (tone === "gold" ? "#FFC627" : "#10B981") : tone === "gold" ? "rgba(255,255,255,0.3)" : "#CBD5E1";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label={label}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          const f = new FormData();
          for (const [k, v] of Object.entries(fields)) f.set(k, v);
          f.set("value", optimistic ? "off" : "on");
          await action(f);
        })
      }
      className={`flex h-8 w-[52px] shrink-0 cursor-pointer rounded-full p-[3px] transition-colors duration-300 ${optimistic ? "justify-end" : "justify-start"}`}
      style={{ background: track }}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 34 }} className="block h-[26px] w-[26px] rounded-full shadow-[0_2px_4px_rgba(15,23,42,0.2)]" style={{ background: optimistic && tone === "gold" ? "#0F172A" : "#FFFFFF" }} />
    </button>
  );
}
