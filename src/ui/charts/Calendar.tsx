import { useState } from "react";
import { MONTHS, Tip, TipRow, monthStarts } from "./kit";
import { dateLabel, mgd } from "../format";

const CELL = 13, GAP = 3, STEP = CELL + GAP, LEFT = 30, TOP = 20;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * A year as a 7 × 53 calendar: one cell per day, shaded by that day's cooling
 * water on the design's own scale, the worst day in amber. Concentration reads
 * at a glance: a tower fills the year, a hybrid lights up a few summer weeks.
 */
export function Calendar({
  year,
  daily,
  maxDay,
  highs,
  label,
}: {
  year: number;
  daily: Float64Array;
  maxDay: number;
  /** Each day's high temperature, °C. */
  highs: number[];
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const offset = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const weeks = Math.ceil((daily.length + offset) / 7);
  const W = LEFT + weeks * STEP, H = TOP + 7 * STEP;
  const peak = daily[maxDay]!;
  const pos = (d: number) => ({ col: Math.floor((d + offset) / 7), row: (d + offset) % 7 });
  const starts = monthStarts(year);

  const fill = (d: number) => {
    const v = daily[d]!;
    if (d === maxDay && v > 0) return "var(--amber)";
    if (v <= 0 || peak <= 0) return "var(--heat-0)";
    const share = 18 + 70 * Math.sqrt(v / peak);
    return `color-mix(in srgb, var(--text-primary) ${share.toFixed(0)}%, transparent)`;
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
        {Array.from(daily, (_, d) => {
          const { col, row } = pos(d);
          return (
            <rect
              key={d}
              x={LEFT + col * STEP}
              y={TOP + row * STEP}
              width={CELL}
              height={CELL}
              rx={3}
              style={{ fill: fill(d) }}
              onMouseEnter={() => setHover(d)}
            />
          );
        })}
        {peak > 0 && (
          <rect
            x={LEFT + pos(maxDay).col * STEP - 2.5}
            y={TOP + pos(maxDay).row * STEP - 2.5}
            width={CELL + 5}
            height={CELL + 5}
            rx={5}
            fill="none"
            stroke="var(--amber)"
            strokeWidth={1.5}
          />
        )}
        {hv && <rect x={LEFT + hv.col * STEP - 1} y={TOP + hv.row * STEP - 1} width={CELL + 2} height={CELL + 2} rx={4} fill="none" stroke="var(--text-primary)" strokeWidth={1.25} pointerEvents="none" />}
      </svg>
      {hover !== null && hv && (
        <Tip x={LEFT + hv.col * STEP + CELL / 2} y={TOP + hv.row * STEP} w={W} h={H}>
          <div className="tip__title">{dateLabel(year, hover, true)}</div>
          <TipRow label="Cooling water" value={`${mgd(daily[hover]!, 3)} MGD`} tone={hover === maxDay ? "amber" : undefined} />
          <TipRow label="Of the worst day" value={peak > 0 ? `${Math.round((daily[hover]! / peak) * 100)}%` : "n/a"} />
          <TipRow label="High" value={`${highs[hover]!.toFixed(1)} °C`} />
        </Tip>
      )}
    </div>
  );
}
