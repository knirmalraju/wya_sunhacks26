import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build go to a separate folder (NEXT_DIST_DIR=.next-build)
  // without overwriting a running dev server's files.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
