import Image from "next/image";
import Link from "next/link";
import { statusColor } from "@/lib/constants";
export { Switch } from "./Switch";

const TINTS = [
  ["#FCE8EF", "#8C1D40"],
  ["#FFF1C2", "#7A5200"],
  ["#E0ECFB", "#1D4E89"],
  ["#D1FAE5", "#065F46"],
  ["#EDE9FE", "#5B21B6"],
];

function tint(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return TINTS[Math.abs(h) % TINTS.length];
}

// Avatar with the design system's double-halo presence ring.
export function Avatar({ initials, status, size = 44, dark = false }: { initials: string; status?: string | null; size?: number; dark?: boolean }) {
  const [bg, fg] = dark ? ["#0F172A", "#FFFFFF"] : tint(initials);
  const ring = status ? `0 0 0 2px #fff, 0 0 0 ${size > 60 ? 5 : 4}px ${statusColor(status)}` : undefined;
  return (
    <span aria-hidden="true" className="relative flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight" style={{ width: size, height: size, fontSize: size * 0.36, background: bg, color: fg, boxShadow: ring }}>
      {initials}
    </span>
  );
}

export function Hidden({ fields }: { fields: Record<string, string> }) {
  return (
    <>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

export function Chip({ children, tone = "tint" }: { children: React.ReactNode; tone?: "tint" | "solid" | "outline" | "gold" }) {
  const cls = {
    solid: "bg-maroon text-white",
    outline: "border border-line-strong bg-white text-ink",
    tint: "bg-maroon-tint text-maroon",
    gold: "bg-gold-tint text-[#7A5200]",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-semibold ${cls}`}>{children}</span>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line/80 bg-white shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-[11px] font-bold tracking-[0.08em] text-muted uppercase ${className}`}>{children}</span>;
}

export function SectionTitle({ children, href, linkText, sub }: { children: React.ReactNode; href?: string; linkText?: string; sub?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[22px] leading-7 font-bold tracking-[-0.015em]">{children}</h2>
        {sub && <p className="text-[13px] text-muted">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-maroon hover:bg-maroon-tint">
          {linkText} →
        </Link>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-[28px] leading-9 font-extrabold tracking-[-0.03em] md:text-4xl md:leading-[44px]">{title}</h1>
      </div>
      {children}
    </header>
  );
}

const pill = "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-bold tracking-[0.01em] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const btn = {
  primary: `${pill} bg-maroon text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_rgba(140,29,64,0.25)] hover:bg-maroon-dark`,
  gold: `${pill} bg-gold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-95`,
  outline: `${pill} border border-maroon/25 bg-white text-maroon hover:bg-maroon-tint`,
  quiet: `${pill} border border-line-strong bg-white text-ink hover:bg-ground`,
  ok: `${pill} bg-ok-tint text-ok`,
  dark: `${pill} bg-ink text-white hover:bg-[#1E293B]`,
};

export const field = "min-h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[15px] text-ink placeholder:text-muted/70 focus:border-maroon focus:outline-none";
export const input = field;

// A styled dropdown: native <select> (accessible, works on every phone) with a
// proper chevron and pill shape.
export function Select({ tone = "light", className = "", children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { tone?: "light" | "onDark" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        {...rest}
        className={`peer min-h-12 w-full cursor-pointer appearance-none rounded-full border pr-12 pl-4 text-[15px] font-semibold text-ink transition focus:outline-none ${tone === "onDark" ? "border-transparent bg-white hover:bg-white/95" : "border-line-strong bg-white hover:border-muted/50 focus:border-maroon"}`}
      >
        {children}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ground text-ink transition peer-hover:bg-line">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </span>
    </div>
  );
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold tracking-[0.02em] text-ink">{label}</label>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

// The hand-lettered "wya" wordmark. `light` is the white version for dark backgrounds.
export function Logo({ height = 44, light = false }: { height?: number; light?: boolean }) {
  return (
    <Image
      src={light ? "/wya-logo-light.png" : "/wya-logo.png"}
      alt="wya"
      width={Math.round(height * (695 / 336))}
      height={height}
      priority
      className="select-none"
      draggable={false}
    />
  );
}

type IconName = "home" | "search" | "map" | "user" | "lock" | "bell" | "back" | "send" | "cal" | "pin" | "clock" | "plus" | "gear" | "link" | "sparkle" | "book" | "check" | "refresh" | "users" | "chat";

export function Icon({ name, size = 22, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
    search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
    map: (<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>),
    user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
    lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
    bell: (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
    back: <path d="M15 18l-6-6 6-6" />,
    send: <path d="M5 12h14M13 6l6 6-6 6" />,
    cal: (<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
    pin: (<><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
    clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
    plus: <path d="M12 5v14M5 12h14" />,
    gear: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
    link: <path d="M9 7H6a3 3 0 0 0 0 6h3M15 7h3a3 3 0 0 1 0 6h-3M8 10h8" />,
    sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
    book: (<><path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z" /><path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" /></>),
    check: <path d="m5 12 5 5 9-10" />,
    refresh: (<><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>),
    users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.5c2.6 0 4.5 1.4 5.5 4.5" /></>),
    chat: <path d="M4 5h16v11H9l-5 4z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
