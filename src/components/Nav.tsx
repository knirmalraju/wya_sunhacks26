"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar, Icon, Logo } from "./ui";

const TABS = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/discover", label: "Discover", icon: "search" as const },
  { href: "/calendar", label: "Calendar", icon: "cal" as const },
  { href: "/map", label: "Map", laptop: "Map & messages", icon: "map" as const },
  { href: "/account", label: "Account", icon: "user" as const },
];

function isOn(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

type Me = { name: string; username: string; initials: string; status: string };

export function Sidebar({ requests, me }: { requests: number; me: Me }) {
  const path = usePathname();
  const items = [...TABS, { href: "/requests", label: "Requests", icon: "bell" as const, badge: requests }, { href: "/settings", label: "Settings", icon: "gear" as const }];
  return (
    <aside className="glass sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 border-r border-line/80 px-4 py-7 md:flex">
      <Link href="/" aria-label="wya home" className="px-2"><Logo height={54} /></Link>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {items.map((t) => {
          const on = isOn(path, t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={`relative flex min-h-11 items-center gap-3 rounded-full px-4 text-[15px] transition-colors ${on ? "font-bold text-maroon" : "font-semibold text-muted hover:text-ink"}`}>
              {on && <motion.span layoutId="side-pill" className="absolute inset-0 rounded-full bg-maroon-tint" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <span className="relative"><Icon name={t.icon} size={20} /></span>
              <span className="relative flex-1">{"laptop" in t && t.laptop ? t.laptop : t.label}</span>
              {"badge" in t && t.badge ? <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-maroon px-1.5 text-[11px] font-bold text-white">{t.badge}</span> : null}
            </Link>
          );
        })}
      </nav>
      <Link href="/account" className="mt-auto flex items-center gap-3 rounded-3xl border border-line/80 bg-white p-3 shadow-[var(--shadow-card)] hover:border-line-strong">
        <Avatar initials={me.initials} status={me.status} size={40} dark />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold">{me.name}</span>
          <span className="truncate text-xs text-muted">@{me.username}</span>
        </span>
      </Link>
    </aside>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="glass fixed inset-x-3 bottom-3 z-[1000] flex h-[68px] items-stretch justify-around rounded-[28px] border border-white/60 px-1 shadow-[var(--shadow-float)] md:hidden">
      {TABS.map((t) => {
        const on = isOn(path, t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={`relative flex min-w-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] ${on ? "font-bold text-maroon" : "font-semibold text-muted"}`}>
            {on && <motion.span layoutId="tab-pill" className="absolute inset-x-1 inset-y-1.5 rounded-[20px] bg-maroon-tint" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative"><Icon name={t.icon} size={21} /></span>
            <span className="relative">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Pulls fresh server data every few seconds so friends' status, requests and messages feel live.
export function AutoRefresh({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      const el = document.activeElement as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
      if (!typing && document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
