import { MONTHS, Tip, TipRow, monthStarts, ticks, usePointer } from "./kit";
import { dateLabel, mgd } from "../format";

const W = 960, H = 300, L = 44, R = 16, T = 18, B = 24;

/**
 * Every day of the year before and after the plan: the hybrid's daily water as a
 * ghost, the plan's in amber in front, and the cap as a rule. The spikes the
 * hybrid concentrates into July are flattened at the cap and spread across the
 * days where water saves the most power.
 */
export function YearBars({
  year,
  before,
  after,
  capGal,
  beforeLabel,
  label,
}: {
  year: number;
  before: Float64Array;
  after: Float64Array;
  capGal: number;
  beforeLabel: string;
  label: string;
}) {
  const { x, onMove, onLeave } = usePointer(W);
  const n = before.length;
  let max = capGal, bMax = 0, bDay = 0;
  for (let d = 0; d < n; d++) {
    max = Math.max(max, before[d]!, after[d]!);
    if (before[d]! > bMax) {
      bMax = before[d]!;
      bDay = d;
    }
  }
  const yt = ticks(max / 1e6, 4);
  const top = yt[yt.length - 1]! * 1e6;
  const bw = (W - L - R) / n;
  const dx = (d: number) => L + d * bw;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const day = x === null ? null : Math.min(n - 1, Math.max(0, Math.floor((x - L) / bw)));
  const starts = monthStarts(year);

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseMove={onMove} onMouseLeave={onLeave}>
        {yt.map((t) => (
          <g key={t}>
            <line className="gridline" x1={L} x2={W - R} y1={y(t * 1e6)} y2={y(t * 1e6)} />
            <text x={L - 8} y={y(t * 1e6) + 4} textAnchor="end">
              {t.toFixed(t < 1 && t > 0 ? 2 : 1).replace(/\.?0+$/, "") || "0"}
            </text>
          </g>
        ))}
        <text x={L - 8} y={T - 8} textAnchor="end">
          MGD
        </text>
        {Array.from(before, (v, d) =>
          v > 0 ? <rect key={`b${d}`} x={dx(d)} y={y(v)} width={Math.max(1, bw - 0.6)} height={y(0) - y(v)} fill="var(--ghost)" /> : null,
        )}
        {Array.from(after, (v, d) =>
          v > 0 ? <rect key={`a${d}`} x={dx(d)} y={y(v)} width={Math.max(1, bw - 0.6)} height={y(0) - y(v)} fill="var(--amber)" /> : null,
        )}
        <line className="axis" x1={L} x2={W - R} y1={y(0)} y2={y(0)} />
        <line x1={L} x2={W - R} y1={y(capGal)} y2={y(capGal)} stroke="var(--text-primary)" strokeWidth={1} strokeDasharray="5 4" shapeRendering="crispEdges" />
        <text x={W - R} y={y(capGal) - 6} textAnchor="end" className="lbl-strong">
          Cap {mgd(capGal)} MGD
        </text>
        {bMax > capGal && (
          <g>
            <line x1={dx(bDay) + bw / 2} x2={dx(bDay) + bw / 2} y1={y(bMax)} y2={y(bMax) - 6} stroke="var(--text-tertiary)" />
            <text x={dx(bDay) + bw / 2 + 6} y={y(bMax) - 2}>
              {beforeLabel} worst day, {dateLabel(year, bDay)}, {mgd(bMax)} MGD
            </text>
          </g>
        )}
        {starts.map((s, i) => (
          <text key={MONTHS[i]} x={dx(s)} y={H - 6}>
            {MONTHS[i]}
          </text>
        ))}
        {day !== null && <line className="crosshair" x1={dx(day) + bw / 2} x2={dx(day) + bw / 2} y1={T} y2={y(0)} />}
      </svg>
      {day !== null && (
        <Tip x={dx(day)} y={y(Math.max(before[day]!, after[day]!, capGal * 0.3))} w={W} h={H}>
          <div className="tip__title">{dateLabel(year, day, true)}</div>
          <TipRow label={beforeLabel} value={`${mgd(before[day]!, 3)} MGD`} />
          <TipRow label="Max Day plan" value={`${mgd(after[day]!, 3)} MGD`} tone="amber" />
          {before[day]! > capGal && <TipRow label="Above cap before" value={`${mgd(before[day]! - capGal, 3)} MGD`} tone="alarm" />}
        </Tip>
      )}
    </div>
  );
}
