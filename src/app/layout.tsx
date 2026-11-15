import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { MotionConfig } from "@/components/motion";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "wya · Meet people between classes",
  description: "Meet ASU students who share your niches, are on campus, and are free when you are.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#8c1d40" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans antialiased`}>
        <MotionConfig>{children}</MotionConfig>
      </body>
    </html>
  );
}
