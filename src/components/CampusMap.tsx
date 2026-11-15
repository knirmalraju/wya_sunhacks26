"use client";

import L from "leaflet";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { CAMPUSES } from "@/lib/campuses";
import { zonesIn } from "@/lib/constants";
import { Select } from "./ui";

export type Pin = { id: string; kind: "me" | "friend" | "event" | "spot"; lat: number; lng: number; mark: string; label: string; sub: string; href?: string; cta?: string };

const COLORS = { me: "#0F172A", friend: "#8C1D40", event: "#1D4E89", spot: "#047857" };
const FILTERS = [["friend", "Friends"], ["event", "Events"], ["spot", "Study spots"]] as const;

function icon(p: Pin) {
  return L.divIcon({
    className: "",
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    html: `<div style="width:42px;height:42px;border-radius:50%;border:3px solid ${p.kind === "me" ? "#FFC627" : "#fff"};background:${COLORS[p.kind]};color:#fff;font:700 12px var(--font-jakarta),sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(15,23,42,.28)">${p.mark}</div>`,
  });
}

// Fits the map to the chosen campus outline.
function FlyTo({ campus }: { campus: string }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    const c = CAMPUSES.find((x) => x.id === campus);
    if (!c) return;
    map.invalidateSize();
    const size = map.getSize();
    if (!size.x || !size.y) return; // not laid out yet
    // Where people actually are: the campus's known buildings if it has several,
    // otherwise its largest outline (skipping outlying parcels).
    const spots = zonesIn(campus).map((z) => [z.lat, z.lng] as [number, number]);
    const main = c.rings.map((r) => L.latLngBounds(r as [number, number][])).sort((a, b) => {
      const area = (x: L.LatLngBounds) => (x.getNorth() - x.getSouth()) * (x.getEast() - x.getWest());
      return area(b) - area(a);
    })[0];
    const bounds = spots.length > 2 ? L.latLngBounds(spots).pad(0.25) : main.pad(0.08);
    // First paint: jump straight there. Later campus changes: animated pan/zoom.
    // (fitBounds rather than flyToBounds: Leaflet's fly animation can produce NaN coordinates.)
    try {
      map.fitBounds(bounds, first.current ? { maxZoom: 17, animate: false } : { maxZoom: 17, animate: true, duration: 0.6 });
    } catch {
      map.setView([c.lat, c.lng], 16, { animate: false });
    }
    first.current = false;
  }, [campus, map]);
  return null;
}

export default function CampusMap({ pins, height, startCampus = "tempe" }: { pins: Pin[]; height: string; startCampus?: string }) {
  const [show, setShow] = useState<Record<string, boolean>>({ friend: true, event: true, spot: true });
  const [campus, setCampus] = useState(startCampus);
  const visible = pins.filter((p) => p.kind === "me" || show[p.kind]);
  const start = CAMPUSES.find((c) => c.id === startCampus) ?? CAMPUSES[0];

  return (
    <div className="relative overflow-hidden md:rounded-[28px]" style={{ height }}>
      <MapContainer center={[start.lat, start.lng]} zoom={15} minZoom={4} maxZoom={19} scrollWheelZoom zoomControl={false} className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {CAMPUSES.map((c) =>
          c.rings.map((ring, i) => (
            <Polygon key={`${c.id}-${i}`} positions={ring} pathOptions={{ color: "#8C1D40", weight: 2.5, opacity: 0.9, fillColor: "#FFC627", fillOpacity: 0.12 }}>
              {i === 0 && <Tooltip sticky>{c.name} campus</Tooltip>}
            </Polygon>
          )),
        )}
        {visible.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icon(p)} title={p.label} alt={p.label}>
            <Popup>
              <div className="flex min-w-48 flex-col gap-1">
                <strong className="text-[15px]">{p.label}</strong>
                <span className="text-[13px] text-muted">{p.sub}</span>
                {p.href && <Link href={p.href} className="mt-1 font-bold text-maroon">{p.cta ?? "Open"}</Link>}
              </div>
            </Popup>
          </Marker>
        ))}
        <FlyTo campus={campus} />
        <ZoomButtons />
      </MapContainer>

      <div className="absolute inset-x-3 top-3 z-[500] flex flex-col gap-2 md:inset-x-5 md:top-5">
        <div className="w-full max-w-[280px]">
          <label htmlFor="map-campus" className="sr-only">Campus</label>
          <Select id="map-campus" value={campus} onChange={(e) => setCampus(e.target.value)} className="shadow-[var(--shadow-float)]">
            {CAMPUSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div role="group" aria-label="Show on map" className="flex flex-wrap gap-2">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={show[k]} onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))} className="min-h-10 cursor-pointer rounded-full border px-3.5 text-[13px] font-bold shadow-[var(--shadow-card)] transition" style={show[k] ? { background: COLORS[k], borderColor: COLORS[k], color: "#fff" } : { background: "#fff", borderColor: "#CBD5E1", color: "#0F172A" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ZoomButtons() {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current);
  }, []);
  return (
    <div ref={ref} className="absolute right-3 bottom-6 z-[500] flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-float)] md:right-5">
      <button type="button" onClick={() => map.zoomIn()} aria-label="Zoom in" className="flex h-11 w-11 cursor-pointer items-center justify-center border-b border-line text-xl font-bold hover:bg-ground">+</button>
      <button type="button" onClick={() => map.zoomOut()} aria-label="Zoom out" className="flex h-11 w-11 cursor-pointer items-center justify-center text-xl font-bold hover:bg-ground">−</button>
    </div>
  );
}
