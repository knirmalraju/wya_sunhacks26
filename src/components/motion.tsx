"use client";

import { MotionConfig as MC, motion, type HTMLMotionProps } from "motion/react";

export const ease = [0.22, 1, 0.36, 1] as const;

// Respects the OS "reduce motion" setting everywhere.
export function MotionConfig({ children }: { children: React.ReactNode }) {
  return <MC reducedMotion="user" transition={{ ease, duration: 0.45 }}>{children}</MC>;
}

export function FadeIn({ delay = 0, y = 6, className, children, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease, delay: Math.min(delay, 0.08) }} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

export function Stagger({ className, children, gap = 0.03, ...rest }: HTMLMotionProps<"div"> & { gap?: number }) {
  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

export function Item({ className, children, lift = false, ...rest }: HTMLMotionProps<"div"> & { lift?: boolean }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease } } }}
      whileHover={lift ? { y: -2, boxShadow: "0 8px 30px rgba(15,23,42,0.10)" } : undefined}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Float({ className, children, delay = 0, distance = 8 }: { className?: string; children: React.ReactNode; delay?: number; distance?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: [0, -distance, 0] }}
      transition={{ opacity: { duration: 0.6, delay }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay } }}
    >
      {children}
    </motion.div>
  );
}

export function Pulse({ color = "#10B981", size = 10 }: { color?: string; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }} aria-hidden="true">
      <motion.span className="absolute inset-0 rounded-full" style={{ background: color }} animate={{ scale: [1, 2.2], opacity: [0.5, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
      <span className="relative rounded-full" style={{ background: color, width: size, height: size }} />
    </span>
  );
}

export { motion };
