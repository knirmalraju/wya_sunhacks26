"use client";

import dynamic from "next/dynamic";
import type { Pin } from "./CampusMap";

// Leaflet touches `window`, so it only loads in the browser.
const CampusMap = dynamic(() => import("./CampusMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-[#E8E6E1] text-sm text-muted md:rounded-[28px]">Loading map…</div>,
});

// One map; its height comes from CSS so it fits phone and laptop layouts.
export function MapLoader({ pins, className, startCampus }: { pins: Pin[]; className: string; startCampus?: string }) {
  return (
    <div className={className}>
      <CampusMap pins={pins} height="100%" startCampus={startCampus} />
    </div>
  );
}
