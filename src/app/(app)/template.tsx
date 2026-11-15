"use client";

import { motion } from "motion/react";

// Tab switch: a short crossfade. No sliding, so the page doesn't jump while
// the sidebar/tab bar stay put.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
