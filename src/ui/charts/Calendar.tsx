import { useState } from "react";
import { MONTHS, Tip, TipRow, monthStarts } from "./kit";
import { dateLabel, mgd } from "../format";

const CELL = 13, GAP = 3, STEP = CELL + GAP, LEFT = 30, TOP = 20;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Amber by how much of the year's range a day reaches; days with no water stay empty. */
export function heatFill(v: number, lo: number, hi: number): string {
  if (v <= 0) return "var(--heat-0)";
  const t = hi > lo ? (v - lo) / (hi - lo) : 1;
  return `color-mix(in srgb, var(--amber) ${(16 + 84 * t).toFixed(0)}%, transparent)`;
}

/**
 * A year as a 7 × 53 calendar. Each wet day is shaded across the year's own
 * range (lowest wet day to worst day), so a tower's seasonal swing is visible
 * and a hybrid's few summer weeks stand alone. Click a day to open its hours.
 */
export function Calendar({
  year,
  daily,
  maxDay,
  selected,
  onSelect,
  highs,
  label,
}: {
  year: number;
  daily: Float64Array;
  maxDay: number;
  selected: number;
  onSelect: (day: number) => void;
  /** Each day's high temperature, °C. */
  highs: number[];
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const offset = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const weeks = Math.ceil((daily.length + offset) / 7);
  const W = LEFT + weeks * STEP, H = TOP + 7 * STEP;
  const peak = daily[maxDay]!;
  let lo = Infinity;
  for (const v of daily) if (v > 0 && v < lo) lo = v;
  const pos = (d: number) => ({ col: Math.floor((d + offset) / 7), row: (d + offset) % 7 });
  const starts = monthStarts(year);
  const ring = (d: number, color: string, width: number) => {
    const p = pos(d);
    return <rect x={LEFT + p.col * STEP - 2} y={TOP + p.row * STEP - 2} width={CELL + 4} height={CELL + 4} rx={5} fill="none" stroke={color} strokeWidth={width} pointerEvents="none" />;
  };
  const hv = hover === null ? null : pos(hover);

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {starts.map((s, i) => (
          <text key={MONTHS[i]} x={LEFT + pos(s).col * STEP} y={12}>
            {MONTHS[i]}
          </text>
        ))}
        {[1, 3, 5].map((r) => (
          <text key={r} x={0} y={TOP + r * STEP + 10}>
            {DAYS[r]}
          </text>
        ))}
        {Array.from(daily, (v, d) => {
          const { col, row } = pos(d);
          return (
            <rect
              key={d}
              className="cal-cell"
              x={LEFT + col * STEP}
              y={TOP + row * STEP}
              width={CELL}
              height={CELL}
              rx={3}
              style={{ fill: heatFill(v, lo, peak) }}
              onMouseEnter={() => setHover(d)}
              onClick={() => onSelect(d)}
            />
          );
        })}
        {peak > 0 && ring(maxDay, "var(--text-primary)", 1.75)}
        {selected !== maxDay && ring(selected, "var(--text-secondary)", 1.5)}
      </svg>
      {hover !== null && hv && (
        <Tip x={LEFT + hv.col * STEP + CELL / 2} y={TOP + hv.row * STEP} w={W} h={H}>
          <div className="tip__title">
            {dateLabel(year, hover, true)}
            {hover === maxDay ? ", worst day" : ""}
          </div>
          <TipRow label="Cooling water" value={`${mgd(daily[hover]!, 3)} MGD`} tone="amber" />
          <TipRow label="High" value={`${highs[hover]!.toFixed(1)} °C`} />
        </Tip>
      )}
    </div>
  );
}

/** The calendar's legend: the year's lowest wet day to its worst day, in MGD. */
export function CalendarLegend({ daily, maxDay }: { daily: Float64Array; maxDay: number }) {
  let lo = Infinity;
  for (const v of daily) if (v > 0 && v < lo) lo = v;
  const hi = daily[maxDay]!;
  if (hi <= 0) return <span className="legend">No cooling water</span>;
  return (
    <span className="legend cal-legend">
      <span className="tnum">{mgd(lo)}</span>
      <span className="cal-legend__ramp" aria-hidden="true" />
      <span className="tnum">{mgd(hi)} MGD</span>
    </span>
  );
}
