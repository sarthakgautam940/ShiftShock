import { useState, type ReactNode, type MouseEvent } from "react";

/** Round axis steps (1, 2, 2.5, 5 × 10^n) so gridlines land on numbers people read. */
export function ticks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((s) => s * mag >= raw) ?? 10) * mag;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(Number(v.toPrecision(10)));
  if (out[out.length - 1]! < max) out.push(Number((out[out.length - 1]! + step).toPrecision(10)));
  return out;
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Day of year on which each month starts. */
export function monthStarts(year: number): number[] {
  return MONTHS.map((_, i) => Math.round((Date.UTC(year, i, 1) - Date.UTC(year, 0, 1)) / 864e5));
}

/** Maps the pointer onto the SVG's own coordinates, whatever size the SVG is drawn at. */
export function usePointer(width: number) {
  const [x, setX] = useState<number | null>(null);
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setX(((e.clientX - r.left) / r.width) * width);
  };
  return { x, onMove, onLeave: () => setX(null) };
}

/** Tooltip placed in the chart's own coordinates (as percentages, so it tracks any width). */
export function Tip({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children: ReactNode }) {
  const left = Math.min(88, Math.max(12, (x / w) * 100));
  return (
    <div className="tip" style={{ left: `${left}%`, top: `${(y / h) * 100}%` }} role="status">
      {children}
    </div>
  );
}

export function TipRow({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: "amber" | "alarm" }) {
  return (
    <div className={`tip__row${tone ? ` is-${tone}` : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
